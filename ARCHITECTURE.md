# VaRyGasy — Architecture du projet

## Vue d'ensemble

```
Navigateur (client/admin/livreur)
       │  HTTP  localhost:3000 | /admin | /livreur
       ▼
┌─────────────────────────────────────────────────────┐
│                  Docker Compose (3 services)        │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  app  (node:22-alpine + nginx:alpine)        │  │
│  │                                              │  │
│  │  nginx :80 ──/api/──▶ Node.js :4000         │  │
│  │      │                (Express REST)         │  │
│  │      │ /images/uploads/                      │  │
│  │      └──▶ /app/uploads  (symlink)            │  │
│  │                │ SQL                         │  │
│  └────────────────┼─────────────────────────────┘  │
│                   ▼                                 │
│          ┌────────────────┐                         │
│          │  db MariaDB 11 │  port 3306              │
│          └────────────────┘                         │
│                                                     │
│  ┌──────────────┐                                   │
│  │  adminer     │  localhost:8080                   │
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
│   │   ├── main.jsx                 point d'entrée — détecte /admin, /livreur et charge le bon app
│   │   ├── App.jsx                  composant racine site client
│   │   ├── index.css                styles globaux + @keyframes
│   │   │
│   │   ├── components/              composants UI site client
│   │   │   ├── Navbar.jsx
│   │   │   ├── Hero.jsx
│   │   │   ├── Products.jsx         ← charge /api/products (stock > 0 uniquement)
│   │   │   ├── CartPanel.jsx        panier + checkout (envoie item.id pour décrémentation stock)
│   │   │   ├── AccountPanel.jsx     profil + fidélité + parrainage + commandes
│   │   │   ├── AuthModal.jsx        connexion / inscription (capture ?ref=CODE)
│   │   │   ├── SupportChat.jsx      bulle chat flottante style Messenger (polling 4s)
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
│   │   │       ├── Products.jsx     CRUD articles actifs (filtre catégorie, recherche, scroll)
│   │   │       ├── Orders.jsx       gestion commandes (filtre statut, accordion détail)
│   │   │       ├── Users.jsx        liste clients/staff, création admin/livreur, dropdown rôle
│   │   │       ├── Stocks.jsx       alertes rupture, édition inline, ajout/suppression article
│   │   │       ├── Team.jsx         CRUD membres de l'équipe (photo, nom, rôle, ordre)
│   │   │       ├── Settings.jsx     paramètres site (bandeau, frais livraison, contacts)
│   │   │       ├── Logs.jsx         historique des actions admin — pagination + filtres
│   │   │       └── Msgs.jsx         messagerie interne (5 onglets : Admins/Équipe/Livreurs/Direct/Clients)
│   │   │
│   │   └── livreur/                 ← ESPACE LIVREUR (/livreur)
│   │       └── LivreurApp.jsx       app mobile-first livreur (login, livraisons, messages)
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
│   └── nginx.conf                   reverse proxy + SPA fallback (référence — non utilisé en prod)
│
├── backend/                         ← ÉQUIPE BACKEND
│   ├── index.js                     serveur Express — toutes les routes API
│   ├── db/
│   │   └── init.sql                 schéma BDD — exécuté au 1er démarrage MariaDB
│   ├── package.json
│   └── Dockerfile                   image node:22-alpine (API seule — utilisé en dev séparé)
│
├── bdd/
│   └── schema.sql                   schéma complet annoté (référence équipe)
│
├── Dockerfile                       conteneur unique prod : nginx + Node.js (build frontend inclus)
├── ARCHITECTURE.md                  ce fichier
├── docker-compose.yml               orchestration 3 services (app, db, adminer)
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
| **express-rate-limit** | — | Protection brute-force : 20 tentatives/15 min sur login, 120 req/min global |
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
| `GET` | `/products` | Liste des produits actifs avec `stock > 0` (catalogue client) |
| `POST` | `/visits` | Incrémente le compteur de visites du jour |
| `GET` | `/team` | Membres de l'équipe actifs (triés par `order_index`) |

### Protégées client (JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/auth/me` | Profil utilisateur connecté |
| `PUT` | `/auth/profile` | Modifier nom / téléphone / mot de passe |
| `GET` | `/referral` | Code + stats parrainage + points |
| `GET` | `/orders` | Commandes de l'utilisateur |
| `POST` | `/orders` | Créer une commande (décrémente le stock automatiquement) |
| `GET` | `/chat/support` | Récupère ou crée le salon support du client connecté + messages |
| `POST` | `/chat/support/messages` | Envoyer un message au support |
| `GET` | `/chat/support/poll` | Nouveaux messages depuis `?since=` (polling) |

### Admin (JWT + role admin ou moderator)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/admin/stats` | KPI dashboard (ventes, commandes, visites, graphiques) |
| `GET` | `/admin/products` | Tous les produits (actifs + archivés) |
| `POST` | `/admin/products` | Créer un produit |
| `PUT` | `/admin/products/:id` | Modifier un produit |
| `DELETE` | `/admin/products/:id` | Archiver un produit (soft delete `active=0`) |
| `DELETE` | `/admin/products/:id/permanent` | Supprimer définitivement (hard delete, stock=0 ou inactif) |
| `GET` | `/admin/categories` | Liste distincte des catégories (`SELECT DISTINCT category`) |
| `POST` | `/admin/upload` | Upload image → `{ src: "/images/uploads/<fichier>" }` |
| `GET` | `/admin/orders` | Toutes les commandes |
| `PUT` | `/admin/orders/:id` | Changer statut ou confirmer paiement |
| `GET` | `/admin/users` | Tous les utilisateurs |
| `POST` | `/admin/users` | Créer un compte admin, moderator ou livreur |
| `PUT` | `/admin/users/:id` | Changer le rôle d'un utilisateur (admin only) |
| `GET` | `/admin/stocks` | Produits actifs avec niveau de stock |
| `PUT` | `/admin/stocks/:id` | Mettre à jour le stock |
| `GET` | `/admin/team` | Tous les membres équipe (actifs + archivés) |
| `POST` | `/admin/team` | Ajouter un membre |
| `PUT` | `/admin/team/:id` | Modifier un membre |
| `DELETE` | `/admin/team/:id` | Archiver un membre (`active=0`) |
| `GET` | `/admin/settings` | Lire tous les paramètres site |
| `PUT` | `/admin/settings` | Modifier un ou plusieurs paramètres (`{ settings: [{key,value}] }`) |
| `GET` | `/admin/logs` | Historique des actions (`?limit=&offset=&action=`) |
| `GET` | `/admin/chat/rooms` | Salons accessibles (fixes admin_only/admin_mod/livreur_group + directs + clients) |
| `GET` | `/admin/chat/rooms/:id/messages` | Messages d'un salon (`?since=&limit=`) |
| `POST` | `/admin/chat/rooms/:id/messages` | Envoyer un message dans un salon |
| `GET` | `/admin/chat/staff` | Liste du staff pour créer un DM |
| `POST` | `/admin/chat/direct/:userId` | Créer ou récupérer un salon direct avec un membre du staff |

### Livreur (JWT + role livreur)

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/livreur/orders` | Commandes "Confirmé" (disponibles) + ses commandes "En livraison"/"Livré" |
| `PUT` | `/livreur/orders/:id/status` | Changer statut (`En livraison` ou `Livré`) + `departure_time` optionnel |
| `GET` | `/livreur/chat/rooms` | Salons accessibles (`{ group, clients }`) |
| `GET` | `/livreur/chat/rooms/:id/messages` | Messages d'un salon (`?since=&limit=`) |
| `POST` | `/livreur/chat/rooms/:id/messages` | Envoyer un message |
| `GET` | `/livreur/chat/client/:orderId` | Récupère ou crée le salon support du client d'une commande |

**Prise en charge** : quand un livreur passe une commande à `En livraison`, l'API :
1. Met à jour `orders.livreur_id = livreur.id` de façon atomique (`WHERE status='Confirmé'` → 409 si déjà pris)
2. Crée si besoin le salon support du client
3. Insère un message automatique : nom du livreur, téléphone, heure de départ vers le client

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
| `product_add` | `POST /admin/products` | `null` | catégorie du produit |
| `product_edit` | `PUT /admin/products/:id` | champs modifiés avant (ex: `"prix: 15000 · stock: 5"`) | champs modifiés après (ex: `"prix: 18000 · stock: 10"`) — pas de log si aucun champ ne change |
| `product_archive` | `DELETE /admin/products/:id` | `actif` | `archivé` |
| `product_delete` | `DELETE /admin/products/:id/permanent` | nom du produit | `null` |
| `order_status` | `PUT /admin/orders/:id` (status) | ancien statut | nouveau statut |
| `order_payment` | `PUT /admin/orders/:id` (payment_confirmed) | `non confirmé` | `confirmé` |
| `stock_update` | `PUT /admin/stocks/:id` | ancien stock | nouveau stock — pas de log si valeur inchangée |
| `settings_update` | `PUT /admin/settings` | ancienne valeur | nouvelle valeur |
| `user_create` | `POST /admin/users` | `null` | rôle créé (admin/moderator/livreur) |
| `role_change` | `PUT /admin/users/:id` | ancien rôle | nouveau rôle |
| `team_add` | `POST /admin/team` | `null` | rôle/poste du membre |
| `team_edit` | `PUT /admin/team/:id` | ancien rôle/poste | nouveau rôle/poste |
| `team_archive` | `DELETE /admin/team/:id` | `actif` | `archivé` |

**Implémentation** : helper `writeLog()` dans `backend/index.js` — appelé après chaque opération réussie. Un échec du log ne bloque jamais l'opération principale (catch silencieux). La table `admin_logs` est créée automatiquement au démarrage de l'API (`CREATE TABLE IF NOT EXISTS`).

**Page admin (`admin/pages/Logs.jsx`)** :
- Layout grid aligné (pas de double `<table>`)
- Pagination 25 lignes/page, filtres par type d'action
- Icône + couleur distincte par type, chips avant/après tronquées à 30 chars, avatar admin
- Bouton "Actualiser" avec spinner

**Note icônes lucide-react v1.16.0** : `History` et `UserCog` n'existent pas dans cette version. Utiliser `Scroll` (nav Historique) et `Shield` (role_change icon).

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
├── role          VARCHAR(20)         ← client | moderator | admin | livreur
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
├── id                INT  PK AUTO_INCREMENT
├── user_id           INT  FK→users.id
├── payment           VARCHAR(50)         ← mvola | airtel | orange | livraison
├── address           TEXT
├── zone              VARCHAR(50)         ← tana | peripherique
├── delivery_fee      INT
├── hours             VARCHAR(100)
├── note              TEXT
├── total             INT                 ← total TTC en Ar
├── transfer_phone    VARCHAR(30)
├── transfer_name     VARCHAR(100)
├── transfer_id       VARCHAR(100)
├── status            VARCHAR(50)         ← En attente | Confirmé | En livraison | Livré | Annulé
├── payment_confirmed TINYINT(1)          ← 0 = non confirmé | 1 = paiement vérifié
├── livreur_id        INT FK→users.id     ← livreur assigné (NULL jusqu'à prise en charge)
└── created_at        TIMESTAMP

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
├── action      VARCHAR(50)             ← role_change | product_add/edit/archive/delete
│                                          order_status | order_payment | stock_update
│                                          settings_update | team_add/edit/archive
├── target_type VARCHAR(30)             ← user | product | order | setting | team_member
├── target_id   INT                     ← id de la cible
├── target_name VARCHAR(100)            ← nom snapshot de la cible
├── old_value   TEXT                    ← ancienne valeur (rôle, statut…)
├── new_value   TEXT                    ← nouvelle valeur
└── created_at  TIMESTAMP

chat_rooms
├── id         INT  PK AUTO_INCREMENT
├── type       ENUM  ← admin_only | admin_mod | livreur_group | direct | support
├── name       VARCHAR(255)             ← libellé affiché
├── client_id  INT FK→users.id NULL     ← pour type='support' uniquement
└── created_at DATETIME
  Salons permanents : id=1 admin_only, id=2 admin_mod, id=3 livreur_group

chat_room_members (pour type='direct' uniquement)
├── room_id INT FK→chat_rooms.id  PK
└── user_id INT FK→users.id       PK

chat_messages
├── id          INT  PK AUTO_INCREMENT
├── room_id     INT FK→chat_rooms.id
├── sender_id   INT FK→users.id
├── sender_name VARCHAR(255)            ← snapshot nom à l'envoi
├── body        TEXT
└── created_at  DATETIME               (INDEX room_id + created_at pour polling)
```

---

## Système de messagerie

### Architecture

Polling REST simple (pas de WebSocket). Chaque client appelle `?since=<datetime>` toutes les 3–4 secondes pour récupérer uniquement les nouveaux messages.

### Salons

| Type | Accès | Créé |
|------|-------|------|
| `admin_only` | admins uniquement | au démarrage (id=1) |
| `admin_mod` | admins + modérateurs | au démarrage (id=2) |
| `livreur_group` | livreurs + admins/modos en lecture | au démarrage (id=3) |
| `direct` | deux membres du staff | `POST /admin/chat/direct/:userId` |
| `support` | staff (tous) + le client concerné + livreur assigné | au 1er message client |

### Côté admin (`admin/pages/Msgs.jsx`)

5 onglets dans le panneau admin :
1. **Admins** — salon `admin_only` (caché aux modérateurs)
2. **Équipe** — salon `admin_mod`
3. **Livreurs** — salon `livreur_group` (visible par admin et modérateur)
4. **Direct** — liste du staff à gauche, cliquer ouvre/crée un DM
5. **Clients** — liste des fils support à gauche, polling 5s sur la liste

### Côté client (`components/SupportChat.jsx`)

- Bulle flottante `position: fixed` rendue **en dehors** d'`AppInner` (directement dans `App`) pour éviter le clipping `overflow-x: hidden` du body
- Si non connecté : message "Connexion requise"
- Si connecté : conversation avec l'équipe, envoi optimiste (message visible immédiatement, confirmé ou annulé après réponse API)
- Badge rouge sur la bulle si messages reçus pendant que le panel est fermé
- Polling toutes les 4 s via `GET /chat/support/poll?since=`

---

## Comment lancer le projet

```bash
# Première fois — construit et démarre tout
docker compose up --build

# Après toute modification (backend ou frontend sont dans la même image)
docker compose build --no-cache && docker compose up -d

# Logs en direct
docker compose logs -f app
```

Accès :
- **Site client** → http://localhost:3000
- **Panneau admin** → http://localhost:3000/admin
- **Espace livreur** → http://localhost:3000/livreur
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
- 1 point par tranche de 10 000 Ar dépensé (commandes non annulées)
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
- `livreur` — accès espace `/livreur` uniquement : liste des commandes Confirmées, prise en charge, livraison, messagerie groupe + clients

**Flux livraison**
```
En attente → Confirmé (admin) → En livraison (livreur, atomic) → Livré (livreur)
                                      │
                                      └── auto-message dans chat support du client
                                          (nom livreur · téléphone · heure de départ)
```
