-- ============================================================
-- VaRyGasy — Schéma complet base de données MariaDB 11
-- Dernière mise à jour : 2026-07-02
-- ============================================================

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  phone         VARCHAR(20)   NOT NULL UNIQUE,
  password      VARCHAR(255)  NOT NULL,            -- bcryptjs hash
  referral_code VARCHAR(12)   UNIQUE,              -- code parrainage unique (8 chars alphanum)
  referred_by   INT           NULL,                -- FK → users.id du parrain
  role          VARCHAR(20)   DEFAULT 'client',    -- client | moderator | admin | livreur
  last_seen     DATETIME      NULL,                -- présence staff (maj par le polling /admin/notifications)
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  price         INT          NOT NULL DEFAULT 0,     -- prix en Ar
  category      VARCHAR(100),                        -- Ventilateur | Finger Sleeve | Câble | …
  stock         INT          NOT NULL DEFAULT 0,
  images        LONGTEXT,                            -- JSON : [{"src":"/images/..."}]
  active        TINYINT(1)   DEFAULT 1,              -- 0 = archivé (soft delete)
  promo_percent INT          NOT NULL DEFAULT 0,     -- % de réduction (5-90)
  promo_active  TINYINT(1)   NOT NULL DEFAULT 0,     -- 1 = affiché dans /catalogue > Promotions
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  -- Routes promo : PUT /api/admin/products/:id/promo { promo_percent, promo_active }
  -- Prix client : ROUND(price * (1 - promo_percent / 100))
);

-- ── orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT           NOT NULL,
  payment           VARCHAR(50)   NOT NULL,        -- mvola | airtel | orange | livraison
  address           TEXT          NOT NULL,
  zone              VARCHAR(50)   NULL,            -- tana | peripherique
  delivery_fee      INT           NOT NULL DEFAULT 0, -- frais en Ar
  hours             VARCHAR(100)  NULL,            -- disponibilité client
  note              TEXT,
  total             INT           NOT NULL,        -- total TTC en Ar
  transfer_phone    VARCHAR(30)   NULL,            -- mobile money : numéro
  transfer_name     VARCHAR(100)  NULL,            -- mobile money : nom
  transfer_id       VARCHAR(100)  NULL,            -- mobile money : réf transaction
  status            VARCHAR(50)   DEFAULT 'En attente',
                                                   -- En attente | Confirmé | En livraison | Livré | Annulé
  payment_confirmed TINYINT(1)    DEFAULT 0,       -- 0 = non confirmé | 1 = paiement vérifié
  livreur_id        INT           NULL DEFAULT NULL, -- FK→users.id du livreur assigné
  created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── order_items ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT          NOT NULL,
  name     VARCHAR(255) NOT NULL,
  qty      INT          NOT NULL,
  price    INT          NOT NULL,                  -- prix unitaire en Ar
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ── referrals ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id INT       NOT NULL,                  -- celui qui a invité
  referred_id INT       NOT NULL UNIQUE,           -- celui qui a été invité (1 parrain max)
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── visits ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visits (
  id    INT  AUTO_INCREMENT PRIMARY KEY,
  date  DATE NOT NULL UNIQUE,                      -- 1 ligne par jour
  count INT  DEFAULT 1                             -- incrémenté à chaque visite
);

-- ── settings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  `key`      VARCHAR(100) PRIMARY KEY,
  `value`    TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  -- Clés pré-insérées :
  --   announcement_active       '0'|'1'      bandeau annonce actif
  --   announcement_text         TEXT          texte du bandeau
  --   announcement_color        '#FF9900'     couleur du bandeau
  --   delivery_fee_tana         '3000'        frais livraison Tana Ville (Ar)
  --   delivery_fee_peripherique '5000'        frais livraison périphérique (Ar)
  --   whatsapp / facebook / instagram         liens réseaux sociaux
  --   business_hours            ''            horaires d'ouverture
  --   reassurance_text                        bandeau réassurance
  --   marquee_items             JSON          items du défilé d'annonces
  --   team_badge / team_title / team_subtitle textes section équipe
);

INSERT IGNORE INTO settings (`key`, `value`) VALUES
  ('announcement_active',       '0'),
  ('announcement_text',         ''),
  ('announcement_color',        '#FF9900'),
  ('delivery_fee_tana',         '3000'),
  ('delivery_fee_peripherique', '5000'),
  ('whatsapp',                  ''),
  ('facebook',                  ''),
  ('instagram',                 ''),
  ('business_hours',            ''),
  ('reassurance_text',          'Livraison gratuite Antananarivo · Paiement à la livraison · Retour sous 7 jours'),
  ('marquee_items',             '[{"text":"Finger Sleeves Gaming dispo maintenant"},{"text":"Livraison 24h sur Antananarivo"}]'),
  ('team_badge',                'Notre équipe'),
  ('team_title',                'Les personnes derrière'),
  ('team_subtitle',             'Une équipe passionnée au service de vos commandes à Madagascar.'),
  ('coming_soon',               '0'),
  ('coming_soon_date',          ''),
  ('coming_soon_message',       'Nous préparons quelque chose d''exceptionnel. La boutique ouvre bientôt !');

-- ── team_members ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  role        VARCHAR(100),                        -- ex: Fondateur & CEO
  description TEXT,
  photo       VARCHAR(255),                        -- /images/uploads/<fichier>
  order_index INT          NOT NULL DEFAULT 0,     -- tri croissant (0 = premier)
  active      TINYINT(1)  DEFAULT 1,              -- 0 = archivé (soft delete)
  created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
  -- Routes : GET /api/team (public) · CRUD /api/admin/team (adminAuth)
  -- Photo servie via volume Docker uploads (même pipeline que products)
);

-- ── admin_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  admin_id    INT           NOT NULL,
  admin_name  VARCHAR(100)  NOT NULL,
  action      VARCHAR(50)   NOT NULL,    -- user_create | role_change
                                         -- product_add/edit/archive/delete
                                         -- order_status | order_payment | stock_update
                                         -- settings_update | team_add/edit/archive
  target_type VARCHAR(30)   NOT NULL,    -- user | product | order | setting | team_member
  target_id   INT           NOT NULL,
  target_name VARCHAR(100)  NOT NULL,
  old_value   TEXT,                      -- ancienne valeur — pour product_edit : "prix: X · stock: Y"
  new_value   TEXT,                      -- nouvelle valeur — pour product_edit : "prix: X' · stock: Y'"
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
  -- Route : GET /api/admin/logs (adminAuth)
  -- product_edit : seuls les champs réellement modifiés apparaissent (nom/prix/catégorie/stock)
  -- stock_update : pas de log si l'ancienne valeur == la nouvelle
);

-- ── chat_rooms ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_rooms (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  type       ENUM('admin_only','admin_mod','direct','support','livreur_group') NOT NULL,
             -- admin_only    : groupe réservé aux admins
             -- admin_mod     : groupe admins + modérateurs
             -- livreur_group : groupe tous les livreurs (visible aussi par admins/modos)
             -- direct        : conversation privée entre deux membres du staff
             -- support       : conversation entre l'équipe et un client
  name       VARCHAR(255),                         -- libellé affiché dans la liste
  client_id  INT NULL,                             -- FK→users.id pour type='support'
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Salons permanents créés au démarrage de l'API
INSERT IGNORE INTO chat_rooms (id, type, name) VALUES
  (1, 'admin_only',    'Admins'),
  (2, 'admin_mod',     'Équipe'),
  (3, 'livreur_group', 'Livreurs');

-- ── chat_room_members ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id INT NOT NULL,                            -- FK→chat_rooms.id
  user_id INT NOT NULL,                            -- FK→users.id (staff uniquement)
  PRIMARY KEY (room_id, user_id)
  -- Utilisé uniquement pour type='direct' (salons privés staff-à-staff)
);

-- ── chat_messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  room_id     INT NOT NULL,                        -- FK→chat_rooms.id
  sender_id   INT NOT NULL,                        -- FK→users.id
  sender_name VARCHAR(255) NOT NULL,               -- snapshot du nom à l'envoi
  body        TEXT NOT NULL,
  created_at  DATETIME DEFAULT NOW(),
  INDEX idx_chat_room_date (room_id, created_at)   -- accélère le polling (since=)
);

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_livreur ON orders(livreur_id);
CREATE INDEX IF NOT EXISTS idx_items_order    ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_referrals_ref  ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_products_cat   ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_act   ON products(active);
CREATE INDEX IF NOT EXISTS idx_team_order     ON team_members(active, order_index);
CREATE INDEX IF NOT EXISTS idx_logs_created   ON admin_logs(created_at);

-- ============================================================
-- Règles métier (appliquées côté API — backend/index.js)
-- ── Stock ───────────────────────────────────────────────────
--   À chaque commande (POST /orders), le stock de chaque article
--   est décrémenté : UPDATE products SET stock = GREATEST(0, stock - qty)
--   Le site client (GET /products) filtre stock > 0.
-- ── Messagerie ──────────────────────────────────────────────
--   Salons permanents id=1 (admin_only), id=2 (admin_mod), id=3 (livreur_group).
--   Salons directs créés à la demande (POST /admin/chat/direct/:userId).
--   Salons support : un par client, créé au 1er message (GET /chat/support).
--   Polling toutes les 3-4 s via param since= (datetime ISO).
--   Livreur → client : auto-message lors de la prise en charge (nom + téléphone + heure départ).
-- ── Livraisons ──────────────────────────────────────────────
--   Flux statut : En attente → Confirmé → En livraison → Livré | Annulé
--   Confirmé : admin confirme la commande, visible par les livreurs
--   En livraison : livreur prend en charge (orders.livreur_id = livreur.id)
--                  → auto-message envoyé dans le chat support du client
--   Livré : livreur marque livrée
--   livreur_id : FK optionnelle vers users.id (rôle='livreur')
-- ── Points de fidélité ──────────────────────────────────────
--   1 pt par tranche de 2 000 Ar dépensé — commandes status='Livré' UNIQUEMENT
--   (les commandes en cours affichent des points "en attente", crédités à la livraison)
--   +10 pts par filleul validé (filleul doit avoir dépensé >= 5 000 Ar, status != Annulé)
--   Total = orderPoints + referralPoints (validés uniquement)
--   Niveaux : Bronze 0-199 | Argent 200-499 | Or 500-999 | Platine 1000+
-- ── Parrainage ──────────────────────────────────────────────
--   referral_code généré à l'inscription (8 chars alphanumériques)
--   Lien : https://varygasy.com?ref=<referral_code>
--   À l'inscription avec ref= → INSERT INTO referrals (ligne créée immédiatement)
--   Points crédités UNIQUEMENT si SUM(orders.total WHERE status!='Annulé') >= 5 000 Ar
--   GET /referral : retourne validated + spent par filleul
--   referral_count dans /admin/users = filleuls validés uniquement
-- ── Rôles ───────────────────────────────────────────────────
--   client    : accès au site, commandes, profil
--   moderator : accès au panneau admin (lecture + gestion commandes/stocks)
--   admin     : accès complet (+ gestion utilisateurs, changement de rôles)
--   livreur   : accès espace livreur (/livreur), gestion livraisons, chat groupe + clients
-- ── Produits ────────────────────────────────────────────────
--   active=0  : archivé (soft delete), invisible sur le site client
--   stock=0   : badge "Rupture" côté client, bouton désactivé
--   images    : tableau JSON [{"src":"/images/uploads/<fichier>"}]
--              fichier stocké dans UPLOAD_DIR (volume Docker en local,
--              dossier ~/VRG/uploads/ sur o2switch — hors git)
--              upload via POST /api/admin/upload (multer, 5 Mo max)
-- ── Catégories ──────────────────────────────────────────────
--   products.category : libre, pas de table dédiée
--   liste déduite par SELECT DISTINCT category FROM products
--   couleur automatique côté frontend (catColors.js, hash djb2)
-- ── Settings ────────────────────────────────────────────────
--   clé/valeur simple, lue par l'API et exposée aux composants
--   ne pas ajouter de colonne ici — utiliser une nouvelle clé
-- ── Sécurité ────────────────────────────────────────────────
--   Rate limiting : 20 tentatives/15 min sur /auth/login, 120 req/min global
--     (fichiers statiques exclus en mode app-unique o2switch)
--   trust proxy = 1 : IP réelle des clients derrière Passenger/nginx
--     (sans ça, tous les clients partagent le même compteur de rate-limit)
--   POST /orders bloqué pour admin | moderator | livreur
--   POST /admin/users réservé au rôle admin uniquement
--   PUT /admin/users/:id : admin ne peut pas modifier son propre rôle
--   Démarrage : refus (exit 1) si DB_NAME/DB_USER/DB_PASSWORD absents
--     — aucun identifiant en dur dans le code, tout vient de l'environnement
--   JWT_SECRET : warning au démarrage si valeur par défaut détectée
-- ============================================================