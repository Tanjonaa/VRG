# VaRyGasy — Architecture du projet

## Vue d'ensemble

```
Navigateur (client)
      │
      │  HTTP  localhost:3000
      ▼
┌─────────────────────────────────────────────────────┐
│                  Docker Compose                     │
│                                                     │
│  ┌──────────────┐        ┌──────────────────────┐  │
│  │  app         │        │  api                 │  │
│  │  nginx:alpine│──/api/─▶  node:22-alpine      │  │
│  │  port 3000   │        │  Express.js port 4000│  │
│  │  (frontend)  │        │  (backend)           │  │
│  └──────────────┘        └──────────┬───────────┘  │
│                                     │ SQL           │
│                           ┌─────────▼───────────┐  │
│                           │  db                 │  │
│                           │  MariaDB 11         │  │
│                           │  port 3306          │  │
│                           └─────────────────────┘  │
│                                                     │
│  ┌──────────────┐                                   │
│  │  adminer     │  ← interface web pour la BDD      │
│  │  port 8080   │      localhost:8080               │
│  └──────────────┘                                   │
└─────────────────────────────────────────────────────┘
```

---

## Structure des dossiers

```
VRG/
│
├── frontend/                        ← ÉQUIPE FRONTEND
│   │
│   ├── src/
│   │   ├── main.jsx                 point d'entrée React
│   │   ├── App.jsx                  composant racine, routing
│   │   ├── index.css                styles globaux
│   │   │
│   │   ├── components/              composants UI
│   │   │   ├── Navbar.jsx           barre de navigation
│   │   │   ├── Hero.jsx             section hero (bannière)
│   │   │   ├── Products.jsx         catalogue produits
│   │   │   ├── CartPanel.jsx        panier + checkout
│   │   │   ├── AccountPanel.jsx     profil + fidélité + commandes
│   │   │   ├── AuthModal.jsx        connexion / inscription
│   │   │   ├── Features.jsx         section avantages
│   │   │   ├── Gallery.jsx          galerie photos
│   │   │   ├── Pricing.jsx          section prix
│   │   │   ├── CTA.jsx              call-to-action
│   │   │   ├── Footer.jsx           pied de page
│   │   │   ├── Marquee.jsx          défilement texte
│   │   │   ├── Particles.jsx        effet particules fond
│   │   │   └── ScrollProgress.jsx   barre de progression scroll
│   │   │
│   │   ├── context/                 état global (React Context)
│   │   │   ├── AuthContext.jsx      utilisateur connecté + commandes
│   │   │   └── CartContext.jsx      articles dans le panier
│   │   │
│   │   ├── hooks/
│   │   │   └── useAnimatedCounter.js  compteur animé (chiffres)
│   │   │
│   │   └── lib/
│   │       └── api.js               client HTTP → appels vers /api
│   │
│   ├── public/
│   │   └── images/                  images statiques servies directement
│   │       ├── logo/                logo SVG
│   │       ├── fan/                 photos ventilateurs
│   │       ├── finger-sleeve/       photos finger sleeves
│   │       └── gallery/             photos galerie
│   │
│   ├── index.html                   page HTML racine (Vite)
│   ├── vite.config.js               config bundler + proxy /api → :4000
│   ├── package.json                 dépendances frontend
│   ├── nginx.conf                   config nginx (prod)
│   └── Dockerfile                   build multi-stage : Vite → nginx
│
├── backend/                         ← ÉQUIPE BACKEND
│   │
│   ├── index.js                     serveur Express, toutes les routes API
│   │
│   ├── db/
│   │   └── init.sql                 schéma BDD (tables users, orders, order_items)
│   │
│   ├── package.json                 dépendances backend
│   └── Dockerfile                   image node:22-alpine
│
├── docker-compose.yml               orchestration des 4 services
├── .env                             variables secrètes (ne pas committer)
└── .gitignore
```

---

## Stack technique

### Frontend

| Outil | Rôle |
|-------|------|
| **React 19** | UI déclarative, composants |
| **Vite 8** | Bundler + dev server (HMR) |
| **Framer Motion** | Animations (spring, accordéon, transitions) |
| **Lucide React** | Icônes SVG |
| **React Context** | État global sans Redux |
| **fetch API** | Appels HTTP vers le backend |
| **nginx** | Serveur fichiers statiques en production |

### Backend

| Outil | Rôle |
|-------|------|
| **Node.js 22** | Runtime JavaScript |
| **Express.js** | Framework HTTP, routing |
| **mysql2/promise** | Connexion MariaDB (async/await) |
| **bcryptjs** | Hash des mots de passe |
| **jsonwebtoken** | Auth JWT (tokens 30 jours) |
| **cors** | Autoriser les requêtes cross-origin |

### Infrastructure

| Outil | Rôle |
|-------|------|
| **Docker** | Conteneurisation |
| **Docker Compose** | Orchestration multi-service |
| **MariaDB 11** | Base de données relationnelle |
| **Adminer** | Interface web BDD (dev) |

---

## Routes API

```
POST   /auth/register    inscription (nom, téléphone, mot de passe)
POST   /auth/login       connexion → retourne JWT
GET    /auth/me          profil de l'utilisateur connecté
PUT    /auth/profile     modifier nom / téléphone / mot de passe

GET    /orders           liste des commandes de l'utilisateur
POST   /orders           créer une commande
```

Toutes les routes sauf `/auth/register` et `/auth/login` nécessitent le header :
```
Authorization: Bearer <token>
```

---

## Schéma base de données

```
users
├── id          INT  AUTO_INCREMENT PK
├── name        VARCHAR(100)
├── phone       VARCHAR(20) UNIQUE
├── password    VARCHAR(255)  ← bcrypt hash
└── created_at  TIMESTAMP

orders
├── id            INT  AUTO_INCREMENT PK
├── user_id       INT  FK → users.id
├── payment       VARCHAR(50)   (mvola / airtel / orange / livraison)
├── address       TEXT
├── zone          VARCHAR(50)   (tana / peripherique)
├── delivery_fee  INT
├── hours         VARCHAR(100)
├── note          TEXT
├── total         INT
├── transfer_phone / transfer_name / transfer_id
├── status        VARCHAR(50)   (En attente / Confirmé / Livré)
└── created_at    TIMESTAMP

order_items
├── id        INT  AUTO_INCREMENT PK
├── order_id  INT  FK → orders.id
├── name      VARCHAR(255)
├── qty       INT
└── price     INT
```

---

## Comment lancer le projet

```bash
# Première fois
docker compose up --build

# Relancer après modif backend
docker compose up --build api

# Relancer après modif frontend
docker compose up --build app

# Voir les logs en direct
docker compose logs -f api
docker compose logs -f app
```

Accès :
- **Site**    → http://localhost:3000
- **Adminer** → http://localhost:8080  (serveur: db, user: vrg_user, mdp: vrg_pass)

---

## Flux d'une commande

```
1. Client ajoute au panier          → CartContext (état local)
2. Client passe commande            → POST /api/orders
3. API vérifie JWT                  → middleware auth
4. API insère orders + order_items  → transaction MariaDB
5. Réponse JSON → AuthContext       → met à jour orders[]
6. AccountPanel affiche la commande → section "Mes commandes"
7. Points fidélité calculés         → 1 pt par 1 000 Ar (front only)
```
