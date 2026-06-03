-- ============================================================
-- VaRyGasy — init.sql  (MariaDB 11)
-- Exécuté automatiquement au premier démarrage du conteneur db
-- Dernière mise à jour : 2026-05-28
-- ============================================================

-- ── users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  phone         VARCHAR(20)   NOT NULL UNIQUE,
  password      VARCHAR(255)  NOT NULL,
  referral_code VARCHAR(12)   UNIQUE,
  referred_by   INT           NULL,
  role          VARCHAR(20)   DEFAULT 'client',   -- client | moderator | admin | livreur
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ── products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  price         INT          NOT NULL DEFAULT 0,
  category      VARCHAR(100),
  stock         INT          NOT NULL DEFAULT 0,
  images        LONGTEXT,                           -- JSON : [{"src":"/images/..."}]
  active        TINYINT(1)   DEFAULT 1,
  promo_percent INT          NOT NULL DEFAULT 0,    -- % de réduction (ex: 20 = -20%)
  promo_active  TINYINT(1)   NOT NULL DEFAULT 0,    -- 1 = promo visible dans /catalogue > Promotions
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT           NOT NULL,
  payment           VARCHAR(50)   NOT NULL,        -- mvola | airtel | orange | livraison
  address           TEXT          NOT NULL,
  zone              VARCHAR(50),                   -- tana | peripherique
  delivery_fee      INT           NOT NULL DEFAULT 0,
  hours             VARCHAR(100),
  note              TEXT,
  total             INT           NOT NULL,
  transfer_phone    VARCHAR(30),
  transfer_name     VARCHAR(100),
  transfer_id       VARCHAR(100),
  status            VARCHAR(50)   DEFAULT 'En attente',
                                                   -- En attente | Confirmé | En livraison | Livré | Annulé
  payment_confirmed TINYINT(1)    DEFAULT 0,       -- 0 = non confirmé | 1 = paiement vérifié
  livreur_id        INT           NULL DEFAULT NULL, -- FK→users.id (livreur assigné)
  created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── order_items ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT          NOT NULL,
  name     VARCHAR(255) NOT NULL,
  qty      INT          NOT NULL,
  price    INT          NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ── referrals ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id INT       NOT NULL,
  referred_id INT       NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── visits ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visits (
  id    INT  AUTO_INCREMENT PRIMARY KEY,
  date  DATE NOT NULL UNIQUE,
  count INT  DEFAULT 1
);

-- ── settings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  `key`      VARCHAR(100) PRIMARY KEY,
  `value`    TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO settings (`key`, `value`) VALUES
  ('announcement_active', '0'),
  ('announcement_text',   ''),
  ('announcement_color',  '#FF9900'),
  ('delivery_fee_tana',        '3000'),
  ('delivery_fee_peripherique', '5000'),
  ('whatsapp',       ''),
  ('facebook',       ''),
  ('instagram',      ''),
  ('business_hours', ''),
  ('reassurance_text', 'Livraison gratuite Antananarivo · Paiement à la livraison · Retour sous 7 jours'),
  ('marquee_items',  '[{"text":"Finger Sleeves Gaming dispo maintenant"},{"text":"Livraison 24h sur Antananarivo"},{"text":"+1 200 gamers équipés à Madagascar"},{"text":"Ventilateurs Turbo — stock limité"},{"text":"Garantie 6 mois sur tous les produits"},{"text":"Support WhatsApp 7j/7 — réponse en 5 min"}]'),
  ('team_badge',    'Notre équipe'),
  ('team_title',    'Les personnes derrière'),
  ('team_subtitle', 'Une équipe passionnée au service de vos commandes à Madagascar.'),
  ('coming_soon',         '0'),
  ('coming_soon_date',    ''),
  ('coming_soon_message', 'Nous préparons quelque chose d''exceptionnel. La boutique ouvre bientôt !');

-- ── team_members ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  role        VARCHAR(100),                        -- ex: Fondateur & CEO
  description TEXT,
  photo       VARCHAR(255),                        -- /images/uploads/<fichier>
  order_index INT          NOT NULL DEFAULT 0,     -- tri croissant
  active      TINYINT(1)  DEFAULT 1,              -- 0 = archivé
  created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
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
  old_value   TEXT,
  new_value   TEXT,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ── chat_rooms ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_rooms (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  type       ENUM('admin_only','admin_mod','direct','support','livreur_group') NOT NULL,
             -- admin_only    : groupe réservé aux admins
             -- admin_mod     : groupe admins + modérateurs
             -- livreur_group : groupe tous les livreurs (+ admins en lecture)
             -- direct        : conversation privée entre deux membres du staff
             -- support       : conversation entre l'équipe et un client
  name       VARCHAR(255),
  client_id  INT NULL,                             -- FK→users.id pour type='support'
  created_at DATETIME DEFAULT NOW(),
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT IGNORE INTO chat_rooms (id, type, name) VALUES
  (1, 'admin_only',    'Admins'),
  (2, 'admin_mod',     'Équipe'),
  (3, 'livreur_group', 'Livreurs');

-- ── chat_room_members ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_room_members (
  room_id INT NOT NULL,
  user_id INT NOT NULL,
  PRIMARY KEY (room_id, user_id)
);

-- ── chat_messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  room_id     INT NOT NULL,
  sender_id   INT NOT NULL,
  sender_name VARCHAR(255) NOT NULL,
  body        TEXT NOT NULL,
  created_at  DATETIME DEFAULT NOW(),
  INDEX idx_chat_room_date (room_id, created_at)
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