# Déploiement VaRyGasy sur o2switch

o2switch est un hébergement **mutualisé cPanel** : pas de Docker. Le projet a été
adapté pour tourner en **une seule application Node.js** qui sert l'API, le
frontend React et les images uploadées. Apache/Passenger route tout vers cette app.

```
Domaine (HTTPS via AutoSSL)
        │
        ▼
  App Node.js cPanel (Passenger)  ← backend/index.js
        ├── /api/...            → routes Express
        ├── /images/uploads/... → fichiers uploadés (UPLOAD_DIR)
        └── /* (catalogue, admin, livreur…) → frontend React (FRONTEND_DIST)
        │
        ▼
  MySQL/MariaDB cPanel
```

Aucune fonctionnalité n'est perdue : promotions, chat, espace livreur, admin,
Coming Soon, uploads — tout fonctionne. Seule la **plomberie** change (pas de
Docker, pas de nginx, pas d'Adminer → phpMyAdmin à la place).

---

## 1. Build du frontend (en local)

```bash
cd frontend
npm install
npm run build        # produit frontend/dist/
```

Le dossier `frontend/dist/` contient le site statique à uploader.

---

## 2. Base de données (cPanel → MySQL Databases)

1. **Crée une base** : ex. `vrg` → nom complet `MONUSER_vrg`
2. **Crée un utilisateur** + mot de passe → `MONUSER_vrguser`
3. **Ajoute l'utilisateur à la base** avec **tous les privilèges**

Pas besoin d'importer le schéma : au premier démarrage, l'app **crée toutes les
tables et insère les réglages par défaut** automatiquement (`CREATE TABLE IF NOT
EXISTS` + seeds).

> Si tu préfères importer manuellement : phpMyAdmin → base → Importer →
> `backend/db/init.sql`.

---

## 3. Upload des fichiers sur le serveur

Via le **Gestionnaire de fichiers cPanel** ou FTP, crée une arborescence type :

```
/home/MONUSER/varygasy/
├── backend/            ← tout le dossier backend/ du repo
├── frontend-dist/      ← contenu de frontend/dist/
└── uploads/            ← dossier vide, writable (chmod 755)
```

---

## 4. Application Node.js (cPanel → Setup Node.js App)

1. **Create Application**
   - Node.js version : **20.x** (ou ≥ 18)
   - Application mode : **Production**
   - Application root : `varygasy/backend`
   - Application URL : ton domaine (racine) — ex. `varygasy.com`
   - Application startup file : `index.js`

2. **Environment variables** (bouton "Add Variable") — voir `backend/.env.example` :

   | Variable | Valeur |
   |----------|--------|
   | `DB_HOST` | `localhost` |
   | `DB_PORT` | `3306` |
   | `DB_NAME` | `MONUSER_vrg` |
   | `DB_USER` | `MONUSER_vrguser` |
   | `DB_PASSWORD` | (ton mot de passe) |
   | `JWT_SECRET` | une longue chaîne aléatoire |
   | `UPLOAD_DIR` | `/home/MONUSER/varygasy/uploads` |
   | `FRONTEND_DIST` | `/home/MONUSER/varygasy/frontend-dist` |

   ⚠️ Ne définis **pas** `PORT` : Passenger l'injecte automatiquement.

3. **Run NPM Install** (bouton dans l'interface) → installe les dépendances.
   Toutes les deps sont en JS pur (bcryptjs, mysql2) → aucune compilation native.

4. **Restart** l'application.

---

## 5. HTTPS

cPanel → **SSL/TLS Status** → AutoSSL est activé par défaut sur o2switch.
Le certificat Let's Encrypt se génère automatiquement (quelques minutes).

---

## 6. Vérifications

- `https://tondomaine.com/`            → site vitrine
- `https://tondomaine.com/catalogue`   → boutique
- `https://tondomaine.com/admin`       → panneau admin
- `https://tondomaine.com/livreur`     → espace livreur
- `https://tondomaine.com/api/products`→ doit renvoyer du JSON

Crée le **premier compte admin** : inscris-toi sur le site (compte `client`),
puis passe-le en `admin` directement via phpMyAdmin :
```sql
UPDATE users SET role='admin' WHERE phone='TON_NUMERO';
```

---

## Mises à jour ultérieures

À chaque changement de code :

1. **Frontend modifié** → `npm run build` en local → ré-uploade `frontend/dist/`
   vers `frontend-dist/`
2. **Backend modifié** → ré-uploade les fichiers `backend/` modifiés →
   cPanel → Setup Node.js App → **Restart**

> C'est manuel (pas de `docker compose up`). Pour automatiser, o2switch propose
> un déploiement **Git** dans cPanel (Git Version Control) : clone le repo et
> tire les mises à jour, puis Restart l'app.

---

## Différences avec la version Docker

| | Docker (VPS/local) | o2switch |
|---|---|---|
| Serveur web | nginx | Passenger (Apache) |
| Process | conteneurs app + db | 1 app Node + MySQL cPanel |
| `/api` | nginx retire le préfixe | middleware Express le retire |
| Statique + uploads | nginx | `express.static` (FRONTEND_DIST / UPLOAD_DIR) |
| Admin BDD | Adminer (:8080) | phpMyAdmin |
| Déploiement | `docker compose up` | upload + Restart (ou Git cPanel) |

Le **même `backend/index.js`** fonctionne dans les deux environnements : le code
détecte `FRONTEND_DIST` pour basculer en mode app-unique.
