-- ============================================================
-- VaRyGasy — Schéma complet base de données MariaDB 11
-- Dernière mise à jour : 2026-05-23
-- ============================================================

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  phone         VARCHAR(20)   NOT NULL UNIQUE,
  password      VARCHAR(255)  NOT NULL,            -- bcryptjs hash
  referral_code VARCHAR(12)   UNIQUE,              -- code parrainage unique (8 chars alphanum)
  referred_by   INT           NULL,                -- FK → users.id du parrain
  role          VARCHAR(20)   DEFAULT 'client',    -- client | moderator | admin
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  price       INT          NOT NULL DEFAULT 0,     -- prix en Ar
  category    VARCHAR(100),                        -- Ventilateur | Finger Sleeve | Câble | …
  stock       INT          NOT NULL DEFAULT 0,
  images      LONGTEXT,                            -- JSON : [{"src":"/images/..."}]
  active      TINYINT(1)   DEFAULT 1,              -- 0 = archivé (soft delete)
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT           NOT NULL,
  payment        VARCHAR(50)   NOT NULL,           -- mvola | airtel | orange | livraison
  address        TEXT          NOT NULL,
  zone           VARCHAR(50)   NULL,               -- tana | peripherique
  delivery_fee   INT           NOT NULL DEFAULT 0, -- frais en Ar
  hours          VARCHAR(100)  NULL,               -- disponibilité client
  note           TEXT,
  total          INT           NOT NULL,           -- total TTC en Ar
  transfer_phone VARCHAR(30)   NULL,               -- mobile money : numéro
  transfer_name  VARCHAR(100)  NULL,               -- mobile money : nom
  transfer_id    VARCHAR(100)  NULL,               -- mobile money : réf transaction
  status         VARCHAR(50)   DEFAULT 'En attente',
                                                   -- En attente | Confirmé | En livraison | Livré | Annulé
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
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
  --   announcement_active  '0'|'1'       bandeau annonce actif
  --   announcement_text    TEXT           texte du bandeau
  --   announcement_color   '#FF9900'      couleur du bandeau
  --   delivery_fee_tana    '3000'         frais livraison Tana Ville (Ar)
  --   delivery_fee_peripherique '5000'    frais livraison périphérique (Ar)
  --   whatsapp             ''             numéro WhatsApp contact
  --   business_hours       ''             horaires d'ouverture
);

INSERT IGNORE INTO settings (`key`, `value`) VALUES
  ('announcement_active',       '0'),
  ('announcement_text',         ''),
  ('announcement_color',        '#FF9900'),
  ('delivery_fee_tana',         '3000'),
  ('delivery_fee_peripherique', '5000'),
  ('whatsapp',                  ''),
  ('business_hours',            ''),
  ('team_badge',                'Notre équipe'),
  ('team_title',                'Les personnes derrière'),
  ('team_subtitle',             'Une équipe passionnée au service de vos commandes à Madagascar.');

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
  action      VARCHAR(50)   NOT NULL,    -- role_change | team_add | team_edit | team_archive
  target_type VARCHAR(30)   NOT NULL,    -- user | team_member
  target_id   INT           NOT NULL,
  target_name VARCHAR(100)  NOT NULL,
  old_value   TEXT,                      -- ancienne valeur (rôle, statut…)
  new_value   TEXT,                      -- nouvelle valeur
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
  -- Route : GET /api/admin/logs (adminAuth)
);

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_referrals_ref ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_products_cat  ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_act  ON products(active);
CREATE INDEX IF NOT EXISTS idx_team_order    ON team_members(active, order_index);
CREATE INDEX IF NOT EXISTS idx_logs_created  ON admin_logs(created_at);

-- ============================================================
-- Règles métier (appliquées côté API — backend/index.js)
-- ── Points de fidélité ──────────────────────────────────────
--   1 pt par tranche de 1 000 Ar dépensé (orders.total, status ≠ Annulé)
--   10 pts par filleul parrainé (referrals)
--   Total = orderPoints + referralPoints
--   Niveaux : Bronze 0-199 | Argent 200-499 | Or 500-999 | Platine 1000+
-- ── Parrainage ──────────────────────────────────────────────
--   referral_code généré à l'inscription (8 chars alphanumériques)
--   Lien : https://varygasy.com?ref=<referral_code>
--   À l'inscription avec ref= → INSERT INTO referrals
-- ── Rôles ───────────────────────────────────────────────────
--   client    : accès au site, commandes, profil
--   moderator : accès au panneau admin (lecture + gestion commandes/stocks)
--   admin     : accès complet (+ gestion utilisateurs, changement de rôles)
-- ── Produits ────────────────────────────────────────────────
--   active=0  : archivé (soft delete), invisible sur le site client
--   stock=0   : badge "Rupture" côté client, bouton désactivé
--   images    : tableau JSON [{"src":"/images/uploads/<fichier>"}]
--              fichier stocké dans volume Docker partagé api↔app
--              upload via POST /api/admin/upload (multer, 5 Mo max)
-- ── Catégories ──────────────────────────────────────────────
--   products.category : libre, pas de table dédiée
--   liste déduite par SELECT DISTINCT category FROM products
--   couleur automatique côté frontend (catColors.js, hash djb2)
-- ── Settings ────────────────────────────────────────────────
--   clé/valeur simple, lue par l'API et exposée aux composants
--   ne pas ajouter de colonne ici — utiliser une nouvelle clé
-- ============================================================
