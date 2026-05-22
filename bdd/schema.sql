-- ============================================================
-- VaRyGasy — Schéma base de données MariaDB 11
-- ============================================================

-- ── Table : users ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  phone         VARCHAR(20)   NOT NULL UNIQUE,
  password      VARCHAR(255)  NOT NULL,          -- bcryptjs hash
  referral_code VARCHAR(12)   UNIQUE,            -- code de parrainage unique
  referred_by   INT           NULL,              -- id du parrain
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── Table : orders ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT           NOT NULL,
  payment        VARCHAR(50)   NOT NULL,          -- mvola | airtel | orange | livraison
  address        TEXT          NOT NULL,
  zone           VARCHAR(50)   NULL,              -- tana | peripherique
  delivery_fee   INT           NOT NULL DEFAULT 0,-- frais de livraison en Ar
  hours          VARCHAR(100)  NULL,              -- heures de disponibilité
  note           TEXT,
  total          INT           NOT NULL,          -- total TTC en Ar
  transfer_phone VARCHAR(30)   NULL,              -- mobile money : numéro
  transfer_name  VARCHAR(100)  NULL,              -- mobile money : nom
  transfer_id    VARCHAR(100)  NULL,              -- mobile money : id transaction
  status         VARCHAR(50)   DEFAULT 'En attente', -- En attente | Confirmé | Livré
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Table : order_items ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT          NOT NULL,
  name     VARCHAR(255) NOT NULL,
  qty      INT          NOT NULL,
  price    INT          NOT NULL,                -- prix unitaire en Ar
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ── Table : referrals ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id INT       NOT NULL,               -- celui qui a invité
  referred_id INT       NOT NULL UNIQUE,        -- celui qui a été invité
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Index ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_referrals_ref ON referrals(referrer_id);

-- ============================================================
-- Règles métier (rappel, appliquées côté API)
-- ── Points de fidélité ──────────────────────────────────────
--   1 point par 1 000 Ar dépensé (calculé depuis orders.total)
--   10 points par filleul parrainé (calculé depuis referrals)
--   Niveaux : Bronze 0-199 | Argent 200-499 | Or 500-999 | Platine 1000+
-- ── Parrainage ──────────────────────────────────────────────
--   referral_code généré à l'inscription (8 chars alphanumériques)
--   Lien : https://varygasy.com?ref=<referral_code>
--   À l'inscription avec ref= → INSERT INTO referrals
-- ============================================================
