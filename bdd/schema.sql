-- ============================================================
-- VaRyGasy — Schéma complet base de données MariaDB 11
-- Dernière mise à jour : mai 2026
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

-- ── Index ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_referrals_ref ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_products_cat  ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_act  ON products(active);

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
--   images    : tableau JSON [{"src":"/images/<dossier>/<fichier>"}]
-- ============================================================
