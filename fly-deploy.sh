#!/bin/bash
# ============================================================
# VaRyGasy — Déploiement complet sur Fly.io
#
# Usage (depuis la RACINE du repo) :
#   bash fly-deploy.sh
#
# Pré-requis :
#   1. flyctl installé  →  curl -L https://fly.io/install.sh | sh
#   2. Connecté         →  fly auth login
#
# ⚠  Si les noms "vrg-api / vrg-app / vrg-db" sont déjà pris sur Fly.io,
#    change APP_DB / APP_API / APP_FRONT ci-dessous ET dans les fly.toml.
# ============================================================
set -euo pipefail

REGION="jnb"
APP_DB="vrg-db"
APP_API="vrg-api"
APP_FRONT="vrg-app"

GREEN="\033[0;32m"; YELLOW="\033[1;33m"; CYAN="\033[0;36m"; RED="\033[0;31m"; NC="\033[0m"
step() { echo -e "\n${CYAN}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
die()  { echo -e "${RED}✘ $1${NC}"; exit 1; }

echo -e "\n${CYAN}╔══════════════════════════════════════════════╗"
echo -e "║       VaRyGasy — Fly.io Deployment         ║"
echo -e "╚══════════════════════════════════════════════╝${NC}"

# ── Vérifications préalables ──────────────────────────────────
command -v fly &>/dev/null || die "flyctl non trouvé. Installe : curl -L https://fly.io/install.sh | sh"
fly auth whoami &>/dev/null  || die "Non connecté. Lance : fly auth login"
ok "flyctl prêt ($(fly version --json 2>/dev/null | grep -o '"Version":"[^"]*"' | head -1 || echo 'ok'))"

# ── Génération des secrets ────────────────────────────────────
step "Génération des secrets..."
DB_PASS=$(openssl rand -base64 20 | tr -dc 'A-Za-z0-9' | head -c 24)
DB_ROOT=$(openssl rand -base64 20 | tr -dc 'A-Za-z0-9' | head -c 24)
JWT_SEC=$(openssl rand -base64 32)
ok "Secrets générés"

# ── Création des apps ─────────────────────────────────────────
step "Création des apps..."
fly apps create "$APP_DB"    2>/dev/null && ok "$APP_DB"    || warn "$APP_DB existe déjà"
fly apps create "$APP_API"   2>/dev/null && ok "$APP_API"   || warn "$APP_API existe déjà"
fly apps create "$APP_FRONT" 2>/dev/null && ok "$APP_FRONT" || warn "$APP_FRONT existe déjà"

# ── Volumes persistants ───────────────────────────────────────
step "Création des volumes..."
fly volumes create vrg_mariadb --app "$APP_DB"  --region "$REGION" --size 3 --yes \
  2>/dev/null && ok "vrg_mariadb 3Go" || warn "vrg_mariadb existe déjà"
fly volumes create vrg_uploads --app "$APP_API" --region "$REGION" --size 1 --yes \
  2>/dev/null && ok "vrg_uploads 1Go" || warn "vrg_uploads existe déjà"

# ── Secrets ───────────────────────────────────────────────────
step "Enregistrement des secrets..."
fly secrets set -a "$APP_DB"  MYSQL_ROOT_PASSWORD="$DB_ROOT" MYSQL_PASSWORD="$DB_PASS"
fly secrets set -a "$APP_API" DB_PASSWORD="$DB_PASS" JWT_SECRET="$JWT_SEC"
ok "Secrets enregistrés"

# ── Déploiement ───────────────────────────────────────────────
# 1. Base de données (image directe, pas de build)
step "Déploiement DB ($APP_DB)..."
fly deploy --app "$APP_DB" --config db/fly.toml
ok "$APP_DB déployé"

# 2. API — build remote (Dockerfile dans backend/)
step "Déploiement API ($APP_API)..."
fly deploy --app "$APP_API" --config backend/fly.toml --remote-only
ok "$APP_API déployé"

# 3. Frontend — build remote (Dockerfile dans frontend/)
step "Déploiement frontend ($APP_FRONT)..."
fly deploy --app "$APP_FRONT" --config frontend/fly.toml --remote-only
ok "$APP_FRONT déployé"

# ── Résumé ────────────────────────────────────────────────────
echo -e "\n${GREEN}╔══════════════════════════════════════════════╗"
echo -e "║           Déploiement terminé !            ║"
echo -e "╚══════════════════════════════════════════════╝${NC}\n"
echo -e "  🌐  Site   →  https://${APP_FRONT}.fly.dev"
echo -e "  🔧  API    →  https://${APP_API}.fly.dev"
echo -e "  🗄   DB     →  ${APP_DB}.internal:3306 (privé)\n"
warn "Sauvegarde ces valeurs maintenant (affichées une seule fois) :"
echo "  DB_PASS  = $DB_PASS"
echo "  DB_ROOT  = $DB_ROOT"
echo "  JWT_SEC  = $JWT_SEC"
echo ""
echo "Commandes utiles :"
echo "  fly logs  -a $APP_API               # logs API"
echo "  fly logs  -a $APP_DB                # logs MariaDB"
echo "  fly ssh console -a $APP_API         # shell API"
echo "  fly deploy --config backend/fly.toml --remote-only  # redéployer API seule"
echo "  fly deploy --config frontend/fly.toml --remote-only # redéployer frontend seul"
