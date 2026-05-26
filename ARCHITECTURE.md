# VaRyGasy — Architecture du projet

## Vue d'ensemble

```
Navigateur (client)          Navigateur (admin)
       │                            │
       │  HTTP  localhost:3000      │  HTTP  localhost:3000/admin
       └──────────────┬─────────────┘
                      ▼
┌─────────────────────────────────────────────────────┐
│                  Docker Compose                     │
│                                                     │
│  ┌──────────────┐        ┌──────────────────────┐  │
│  │  app         │        │  api                 │  │
│  │  nginx:alpine│──/api/─▶  node:22-alpine      │  │
│  │  port 3000   │        │  Express.js port 4000│  │
│  │  (React SPA) │        │  (backend REST)      │  │
│  └──────────────┘        └──────────┬───────────┘  │
│                                     │ SQL           │
│                           ┌─────────▼───────────┐  │
│                           │  db                 │  │
│                           │  MariaDB 11         │  │
│                           │  port 3306          │  │
│                           └─────────────────────┘  │
│                                                     │
│  ┌──────────────┐                                   │
│  │  adminer     │  ← interface web BDD              │
│  │  port 8080   │      localhost:8080               │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

---

## Principe fondamental : tout vient de l'API

Le site client ne contient **aucune donnée en dur**.  
Chaque modification faite dans le panneau admin est reflétée automatiquement côté client au prochain chargement, sans rebuild Docker.

```
Admin modifie un produit
        │
        ▼
  PUT /api/admin/products/:id  →  MariaDB
        │
        ▼
  GET /api/products  ←  client React (au chargement)
        │
        ▼
  Affichage mis à jour automatiquement
```

**Règle d'or** : toute nouvelle donnée affichée côté client doit être exposée via une route `GET /api/<ressource>` et chargée avec `fetch` dans le composant React. Ne jamais hardcoder de données affichées à l'utilisateur.

---

## Structure des dossiers

```
VRG/
│
├── frontend/                        ← ÉQUIPE FRONTEND
│   ├── src/
│   │   ├── main.jsx                 point d'entrée — détecte /admin et charge AdminApp
│   │   ├── App.jsx                  composant racine site client
│   │   ├── index.css                styles globaux + @keyframes
│   │   │
│   │   ├── components/              composants UI site client
│   │   │   ├── Navbar.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── Products.jsx         ← charge /api/products dynamiquement
│   │   │   ├── CartPanel.jsx        panier + checkout
│   │   │   ├── AccountPanel.jsx     profil + fidélité + parrainage + commandes
│   │   │   ├── AuthModal.jsx        connexion / inscription (capture ?ref=CODE)
│   │   │   ├── Features.jsx
│   │   │   ├── Gallery.jsx
│   │   │   ├── Pricing.jsx
│   │   │   ├── Team.jsx             ← section équipe (charge /api/team, auto-cachée si vide)
│   │   │   ├── CTA.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Marquee.jsx
│   │   │   ├── Particles.jsx
│   │   │   └── ScrollProgress.jsx
│   │   │
│   │   ├── admin/                   ← PANNEAU ADMIN (/admin)
│   │   │   ├── AdminApp.jsx         layout admin (sidebar + routing interne)
│   │   │   ├── AdminLogin.jsx       page de connexion admin
│   │   │   ├── components/
│   │   │   │   └── AdminDropdown.jsx  dropdown sombre réutilisable (React portal)
│   │   │   └── pages/
│   │   │       ├── Dashboard.jsx    KPI ventes/commandes/clients/visites + graphiques
│   │   │       ├── Products.jsx     CRUD articles (filtre catégorie, recherche, scroll)
│   │   │       ├── Orders.jsx       gestion commandes (filtre statut, accordion détail)
│   │   │       ├── Users.jsx        liste clients/staff, changement de rôle
│   │   │       ├── Stocks.jsx       alertes rupture, édition stock inline
│   │   │       ├── Team.jsx         CRUD membres de l'équipe (photo, nom, rôle, ordre)
│   │   │       ├── Settings.jsx     paramètres site (bandeau, frais livraison, contacts)
│   │   │       └── Logs.jsx         historique des actions admin (rôles, équipe) — pagination + filtres
│   │   │
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      utilisateur connecté, commandes, updateProfile
│   │   │   └── CartContext.jsx      articles dans le panier (localStorage)
│   │   │
│   │   ├── hooks/
│   │   │   └── useAnimatedCounter.js
│   │   │
│   │   └── lib/
│   │       ├── api.js               client HTTP — sauvegarde auto du token JWT
│   │       └── catColors.js         couleurs déterministes par catégorie (hash djb2)
│   │
│   ├── public/images/               images statiques (servies par nginx)
│   │   ├── fan/                     photos ventilateurs
│   │   ├── finger-sleeve/           photos finger sleeves
│   │   ├── logo/
│   │   ├── gallery/
│   │   └── uploads/                 ← volume Docker partagé api↔app (images uploadées)
│   │
│   ├── vite.config.js               proxy /api → :4000 (dev)
│   ├── nginx.conf                   reverse proxy + SPA fallback (prod)
│   └── Dockerfile                   build Vite → image nginx:alpine
│
├── backend/                         ← ÉQUIPE BACKEND
│   ├── index.js                     serveur Express — toutes les routes API
│   ├── db/
│   │   └── init.sql                 schéma BDD — exécuté au 1er démarrage
│   ├── package.json
│   └── Dockerfile                   image node:22-alpine
│
├── bdd/
│   └── schema.sql                   schéma complet annoté (référence équipe)
│
├── ARCHITECTURE.md                  ce fichier
├── docker-compose.yml               orchestration 4 services
├── .env                             secrets (ne pas committer)
└── .gitignore
```

---

## Stack technique

### Frontend

| Outil | Version | Rôle |
|-------|---------|------|
| **React** | 19 | UI déclarative, composants |
| **Vite** | 8 | Bundler + dev server (HMR) |
| **Framer Motion** | — | Animations (spring, accordéon, 3D hover) |
| **Lucide React** | — | Icônes SVG |
| **React Context** | — | État global (auth, panier) |
| **fetch API** | native | Appels HTTP vers `/api` |
| **nginx** | alpine | Serveur statique + proxy en prod |

### Backend

| Outil | Version | Rôle |
|-------|---------|------|
| **Node.js** | 22 | Runtime |
| **Express.js** | — | Framework HTTP |
| **mysql2/promise** | — | Connexion MariaDB (async/await) |
| **bcryptjs** | — | Hash mots de passe (pur JS, pas de binaire natif) |
| **jsonwebtoken** | — | Auth JWT (tokens 30 jours) |
| **multer** | — | Upload de fichiers images (5 Mo max, jpg/png/webp/avif/gif) |
| **cors** | — | Requêtes cross-origin |

### Infrastructure

| Outil | Rôle |
|-------|------|
| **Docker Compose** | Orchestration 4 services |
| **MariaDB 11** | Base de données relationnelle |
| **Adminer** | Interface web BDD (dev) — localhost:8080 |

---

## Routes API

### Publiques (sans authentification)

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/auth/register` | Inscription (nom, téléphone, mot de passe, referralCode?) |
| `POST` | `/auth/login` | Connexion → retourne JWT |
| `GET` | `/products` | Liste des produits actifs (catalogue client) |
| `POST` | `/visits` | Incrémente le compteur de visites du jour |
| `GET` | `/team` | Membres de l'équipe actifs (triés par `order_index`) |

### Protégées client (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/auth/me` | Profil utilisateur connecté |
| `PUT` | `/auth/profile` | Modifier nom / téléphone / mot de passe |
| `GET` | `/referral` | Code + stats parrainage + points |
| `GET` | `/orders` | Commandes de l'utilisateur |
| `POST` | `/orders` | Créer une commande |

### Admin (JWT + role admin ou moderator)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/stats` | KPI dashboard (ventes, commandes, visites, graphiques) |
| `GET` | `/admin/products` | Tous les produits (actifs + archivés) |
| `POST` | `/admin/products` | Créer un produit |
| `PUT` | `/admin/products/:id` | Modifier un produit |
| `DELETE` | `/admin/products/:id` | Archiver un produit (soft delete) |
| `GET` | `/admin/categories` | Liste distincte des catégories existantes (`SELECT DISTINCT category`) |
| `POST` | `/admin/upload` | Upload image produit → retourne `{ src: "/images/uploads/<fichier>" }` |
| `GET` | `/admin/orders` | Toutes les commandes |
| `PUT` | `/admin/orders/:id` | Changer le statut d'une commande |
| `GET` | `/admin/users` | Tous les utilisateurs |
| `PUT` | `/admin/users/:id` | Changer le rôle d'un utilisateur (admin only) |
| `GET` | `/admin/stocks` | Produits actifs avec niveau de stock |
| `PUT` | `/admin/stocks/:id` | Mettre à jour le stock d'un produit |
| `GET` | `/admin/team` | Tous les membres équipe (actifs + archivés) |
| `POST` | `/admin/team` | Ajouter un membre |
| `PUT` | `/admin/team/:id` | Modifier un membre (nom, rôle, description, photo, ordre) |
| `DELETE` | `/admin/team/:id` | Archiver un membre (soft delete `active=0`) |
| `GET` | `/admin/settings` | Lire tous les paramètres site |
| `PUT` | `/admin/settings` | Modifier un ou plusieurs paramètres (body `{ settings: [{key,value}] }`) |
| `GET` | `/admin/logs` | Historique des actions admin (`?limit=&offset=&action=`) |

Header requis pour routes protégées :
```
Authorization: Bearer <token>
```

---

## Volume uploads (images produits)

```
docker-compose.yml
  api:   volumes: uploads → /app/uploads          ← multer écrit ici
  app:   volumes: uploads → /usr/share/nginx/html/images/uploads  ← nginx sert ici
  volumes: uploads (named volume Docker)
```

Flux upload :
```
Admin choisit un fichier
        │
        ▼
POST /api/admin/upload  (multipart/form-data, champ "image")
        │  multer génère un nom unique : <timestamp>-<8hex>.<ext>
        │  fichier écrit dans /app/uploads/<nom>
        ▼
retourne { src: "/images/uploads/<nom>" }
        │
        ▼
client React stocke src dans products.images = [{ src }]
        │
        ▼
nginx sert /images/uploads/<nom> depuis le volume partagé
```

---

## Système de couleurs catégories (`src/lib/catColors.js`)

Toute catégorie produit reçoit automatiquement une couleur déterministe :
- **Palette** : 10 couleurs (ambre, orange foncé, bleu, violet, vert menthe, rose, orange, vert, cyan, fuchsia)
- **Algorithme** : hash djb2 → `h = (h * 33 ^ charCode) >>> 0` → `PALETTE[h % 10]`
- **Résultat** : même catégorie = même couleur, toujours, sans configuration manuelle
- **Utilisé dans** : `Products.jsx` (client), `admin/pages/Products.jsx` (filtres + badges), `AdminDropdown.jsx` (options colorées)

---

## Composant AdminDropdown (`src/admin/components/AdminDropdown.jsx`)

Dropdown sombre réutilisable pour tous les selects du panneau admin.

**Principe** : le panel est rendu via `ReactDOM.createPortal` dans `document.body` avec `position: fixed` calculé depuis `getBoundingClientRect()`. Cela permet d'échapper à tout `overflow: hidden/auto` parent (layout admin) sans conflit de z-index.

**Props principales** :

| Prop | Type | Description |
|------|------|-------------|
| `value` | string | Valeur sélectionnée |
| `options` | `{value, label, color?, bg?, border?, dim?, separator?}[]` | Options |
| `onChange` | fn | Callback au changement |
| `compact` | bool | Trigger compact coloré (statuts, rôles). Défaut : false |
| `stopProp` | bool | Stoppe la propagation (dropdown dans un accordéon) |
| `footer` | JSX \| `(close) => JSX` | Contenu bas du panel (ex: "Nouvelle catégorie") |
| `label` | string | Libellé au-dessus du trigger |
| `onOpen` | fn | Callback à l'ouverture |

**Utilisé dans** :
- `admin/pages/Products.jsx` → `CategoryPicker` (mode normal + footer "Nouvelle catégorie")
- `admin/pages/Orders.jsx` → `StatusSelect` (mode compact + stopProp)
- `admin/pages/Users.jsx` → sélecteur de rôle (mode compact)

**Règle** : tout nouveau select/dropdown dans l'admin doit utiliser `AdminDropdown`. Ne plus jamais utiliser `<select>` natif.

---

## Section Équipe

La section équipe est entièrement dynamique : aucune donnée hardcodée.

**Côté client (`components/Team.jsx`)** :
- Appelle `GET /api/team` au montage
- Si la réponse est vide, le composant retourne `null` — la section est absente du DOM
- Si des membres existent, affiche des cards glassmorphism avec hover 3D (Framer Motion : `rotateX/Y` spring, mouse-follow glow)
- Chaque card : photo 4/3 avec scale hover, badge rôle orange, nom, description, fallback initiales si pas de photo
- Animations en stagger (délai `index × 0.08s`)

**Côté admin (`admin/pages/Team.jsx`)** :
- Table : photo circulaire, nom, rôle, ordre, badge actif/archivé, actions edit/archive
- Modal : upload drag-and-drop photo (même pipeline multer que produits), champs nom/rôle/description/ordre
- Soft delete : `DELETE /api/admin/team/:id` → `UPDATE team_members SET active=0`

**Règle** : ajouter un membre dans l'admin → visible immédiatement côté client sans rebuild.

---

## Historique des actions admin (`admin_logs`)

Toute action sensible effectuée par un admin ou modérateur est automatiquement enregistrée dans `admin_logs`.

**Actions tracées** :

| Action | Déclencheur | old_value | new_value |
|--------|-------------|-----------|-----------|
| `role_change` | `PUT /admin/users/:id` | ancien rôle (`client`) | nouveau rôle (`admin`) |
| `team_add` | `POST /admin/team` | `null` | rôle/poste du nouveau membre |
| `team_edit` | `PUT /admin/team/:id` | ancien rôle/poste | nouveau rôle/poste |
| `team_archive` | `DELETE /admin/team/:id` | `actif` | `archivé` |

**Implémentation** : helper `writeLog()` dans `backend/index.js` appelé après chaque opération réussie. Un échec du log ne bloque jamais l'opération principale.

**Page admin (`admin/pages/Logs.jsx`)** :
- Tableau paginé (25 lignes/page) avec filtres par type d'action
- Icône + couleur par type d'action, chips colorées avant/après, avatar de l'admin
- Bouton "Actualiser" avec spinner animé

---

## Schéma base de données

```
users
├── id            INT  PK AUTO_INCREMENT
├── name          VARCHAR(100)
├── phone         VARCHAR(20) UNIQUE
├── password      VARCHAR(255)        ← bcryptjs hash
├── referral_code VARCHAR(12) UNIQUE  ← généré à l'inscription
├── referred_by   INT FK→users.id     ← parrain
├── role          VARCHAR(20)         ← client | moderator | admin
└── created_at    TIMESTAMP

products
├── id          INT  PK AUTO_INCREMENT
├── name        VARCHAR(255)
├── description TEXT
├── price       INT                   ← en Ar
├── category    VARCHAR(100)          ← Ventilateur | Finger Sleeve | Câble | …
├── stock       INT
├── images      LONGTEXT              ← JSON [{"src":"/images/..."}]
├── active      TINYINT(1)            ← 0 = archivé (invisible côté client)
├── created_at  TIMESTAMP
└── updated_at  TIMESTAMP

orders
├── id             INT  PK AUTO_INCREMENT
├── user_id        INT  FK→users.id
├── payment        VARCHAR(50)         ← mvola | airtel | orange | livraison
├── address        TEXT
├── zone           VARCHAR(50)         ← tana | peripherique
├── delivery_fee   INT
├── hours          VARCHAR(100)
├── note           TEXT
├── total          INT                 ← total TTC en Ar
├── transfer_phone VARCHAR(30)
├── transfer_name  VARCHAR(100)
├── transfer_id    VARCHAR(100)
├── status             VARCHAR(50)     ← En attente | Confirmé | En livraison | Livré | Annulé
├── payment_confirmed  TINYINT(1)      ← 0 = non confirmé | 1 = paiement vérifié
└── created_at         TIMESTAMP

order_items
├── id       INT  PK AUTO_INCREMENT
├── order_id INT  FK→orders.id
├── name     VARCHAR(255)
├── qty      INT
└── price    INT                       ← prix unitaire en Ar

referrals
├── id          INT  PK AUTO_INCREMENT
├── referrer_id INT  FK→users.id       ← celui qui a invité
├── referred_id INT  FK→users.id UNIQUE ← celui qui a été invité
└── created_at  TIMESTAMP

visits
├── id    INT  PK AUTO_INCREMENT
├── date  DATE UNIQUE                  ← 1 ligne par jour
└── count INT                          ← incrémenté à chaque visite

settings
├── key        VARCHAR(100) PK         ← clé de configuration
├── value      TEXT                    ← valeur (string)
└── updated_at TIMESTAMP               ← mise à jour automatique

Clés pré-insérées :
  announcement_active / announcement_text / announcement_color
  delivery_fee_tana / delivery_fee_peripherique
  whatsapp / facebook / instagram / business_hours
  reassurance_text / marquee_items
  team_badge / team_title / team_subtitle

team_members
├── id          INT  PK AUTO_INCREMENT
├── name        VARCHAR(100)            ← nom complet
├── role        VARCHAR(100)            ← ex : Fondateur & CEO
├── description TEXT                    ← biographie courte
├── photo       VARCHAR(255)            ← /images/uploads/<fichier> (même pipeline produits)
├── order_index INT                     ← tri croissant (0 = premier affiché)
├── active      TINYINT(1)              ← 0 = archivé (invisible côté client)
└── created_at  TIMESTAMP

admin_logs
├── id          INT  PK AUTO_INCREMENT
├── admin_id    INT                     ← id de l'admin qui a effectué l'action
├── admin_name  VARCHAR(100)            ← nom snapshot au moment de l'action
├── action      VARCHAR(50)             ← role_change | team_add | team_edit | team_archive
├── target_type VARCHAR(30)             ← user | team_member
├── target_id   INT                     ← id de la cible
├── target_name VARCHAR(100)            ← nom snapshot de la cible
├── old_value   TEXT                    ← ancienne valeur (rôle, statut…)
├── new_value   TEXT                    ← nouvelle valeur
└── created_at  TIMESTAMP
```

---

## Comment lancer le projet

```bash
# Première fois — construit et démarre tout
docker compose up --build

# Après modification backend (index.js, db/)
docker compose up --build api -d

# Après modification frontend (src/)
docker compose up --build app -d

# Les deux en même temps
docker compose up --build api app -d

# Logs en direct
docker compose logs -f api
docker compose logs -f app
```

Accès :
- **Site client** → http://localhost:3000
- **Panneau admin** → http://localhost:3000/admin
- **Adminer (BDD)** → http://localhost:8080  
  `serveur: db` · `user: vrg_user` · `mdp: vrg_pass` · `base: vrg`

---

## Flux d'une commande

```
1. Client charge /products        → GET /api/products → MariaDB
2. Client ajoute au panier        → CartContext (état local React)
3. Client passe commande          → POST /api/orders (JWT requis)
4. API vérifie JWT                → middleware auth
5. API insère orders + items      → transaction MariaDB
6. AuthContext recharge commandes → GET /api/orders
7. Admin voit la commande         → GET /api/admin/orders
8. Admin change le statut         → PUT /api/admin/orders/:id
```

## Flux de synchronisation admin → client

```
Admin (panneau /admin)          Client (site /)
        │                              │
        │  PUT /api/admin/products/:id │
        │─────────────────▶ MariaDB   │
        │                             │
        │                     prochain chargement
        │                             │
        │              GET /api/products
        │                   ◀─────────┤
        │                             │
        │               données à jour affichées
```

## Règles métier

**Fidélité**
- 1 point par tranche de 1 000 Ar dépensé (commandes non annulées)
- 10 points par filleul parrainé
- Niveaux : Bronze 0–199 · Argent 200–499 · Or 500–999 · Platine 1000+

**Parrainage**
- Code unique généré à l'inscription (8 chars alphanumériques)
- Lien de partage : `https://varygasy.com?ref=<code>`
- À l'inscription avec `?ref=CODE` → ligne dans `referrals` + +10 pts pour le parrain

**Rôles**
- `client` — accès site, commandes, profil
- `moderator` — accès admin (sauf gestion des rôles utilisateurs)
- `admin` — accès complet + changement de rôles
