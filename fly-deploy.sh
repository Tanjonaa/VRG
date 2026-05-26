#!/bin/bash
# ============================================================
# VaRyGasy — Déploiement complet sur Fly.io
# Usage : bash fly-deploy.sh
#
# Pré-requis :
#   1. flyctl installé  →  https://fly.io/docs/hands-on/install-flyctl/
#   2. Connecté         →  fly auth login
#   3. Exécuter depuis la RACINE du repo
#
# Si les app names "vrg-api / vrg-app / vrg-db" sont déjà pris,
# change-les dans ce script ET dans les fly.toml correspondants.
# ============================================================
set -euo pipefail

REGION="jnb"          # Johannesburg — le plus proche de Madagascar
APP_DB="vrg-db"
APP_API="vrg-api"
APP_FRONT="vrg-app"

# ── Couleurs terminal ─────────────────────────────────────────
GREEN="\033[0;32m"; YELLOW="\033[1;33m"; CYAN="\033[0;36m"; NC="\033[0m"
step() { echo -e "\n${CYAN}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; }

echo -e "\n${CYAN}╔══════════════════════════════════════════════╗"
echo -e "║     VaRyGasy — Fly.io Deploy              ║"
echo -e "╚══════════════════════════════════════════════╝${NC}"

# ── 1. Vérifier flyctl ────────────────────────────────────────
if ! command -v fly &>/dev/null; then
  echo "flyctl non trouvé. Installe-le : curl -L https://fly.io/install.sh | sh"
  exit 1
fi
ok "flyctl détecté"

# ── 2. Générer les secrets ────────────────────────────────────
step "Génération des secrets..."
DB_PASS=$(openssl rand -base64 20 | tr -dc 'A-Za-z0-9' | head -c 24)
DB_ROOT=$(openssl rand -base64 20 | tr -dc 'A-Za-z0-9' | head -c 24)
JWT_SEC=$(openssl rand -base64 32)
ok "Secrets générés"

# ── 3. Créer les apps ─────────────────────────────────────────
step "Création des apps Fly.io..."
fly apps create "$APP_DB"    --org personal 2>/dev/null && ok "$APP_DB créé"    || warn "$APP_DB existe déjà"
fly apps create "$APP_API"   --org personal 2>/dev/null && ok "$APP_API créé"   || warn "$APP_API existe déjà"
fly apps create "$APP_FRONT" --org personal 2>/dev/null && ok "$APP_FRONT créé" || warn "$APP_FRONT existe déjà"

# ── 4. Créer les volumes persistants ─────────────────────────
step "Création des volumes..."
fly volumes create vrg_mariadb --app "$APP_DB"  --region "$REGION" --size 3 --yes \
  2>/dev/null && ok "vrg_mariadb (3 Go)" || warn "vrg_mariadb existe déjà"
fly volumes create vrg_uploads  --app "$APP_API" --region "$REGION" --size 1 --yes \
  2>/dev/null && ok "vrg_uploads (1 Go)" || warn "vrg_uploads existe déjà"

# ── 5. Définir les secrets ────────────────────────────────────
step "Définition des secrets..."
fly secrets set -a "$APP_DB" \
  MYSQL_ROOT_PASSWORD="$DB_ROOT" \
  MYSQL_PASSWORD="$DB_PASS"

fly secrets set -a "$APP_API" \
  DB_PASSWORD="$DB_PASS" \
  JWT_SECRET="$JWT_SEC"

ok "Secrets enregistrés"

# ── 6. Déployer dans l'ordre (db → api → frontend) ───────────
step "Déploiement base de données ($APP_DB)..."
fly deploy --app "$APP_DB" --config db/fly.toml --remote-only
ok "$APP_DB déployé"

step "Déploiement API ($APP_API)..."
fly deploy --app "$APP_API" --config backend/fly.toml --remote-only
ok "$APP_API déployé"

step "Déploiement frontend ($APP_FRONT)..."
fly deploy --app "$APP_FRONT" --config frontend/fly.toml --remote-only
ok "$APP_FRONT déployé"

# ── 7. Résumé ─────────────────────────────────────────────────
echo -e "\n${GREEN}╔══════════════════════════════════════════════╗"
echo -e "║         Déploiement terminé !              ║"
echo -e "╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  🌐 Site     →  https://${APP_FRONT}.fly.dev"
echo -e "  🔧 API      →  https://${APP_API}.fly.dev"
echo -e "  🗄  DB       →  ${APP_DB}.internal:3306 (privé)"
echo ""
warn "Sauvegarde ces valeurs — elles ne s'affichent qu'une fois :"
echo "  DB_PASS  = $DB_PASS"
echo "  DB_ROOT  = $DB_ROOT"
echo "  JWT_SEC  = $JWT_SEC"
echo ""
echo "Commandes utiles :"
echo "  fly logs -a $APP_API          # logs API en direct"
echo "  fly logs -a $APP_DB           # logs MariaDB"
echo "  fly ssh console -a $APP_API   # shell dans le conteneur API"
echo "  fly deploy --config backend/fly.toml --remote-only   # redéployer l'API seule"
