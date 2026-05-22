CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  phone         VARCHAR(20)   NOT NULL UNIQUE,
  password      VARCHAR(255)  NOT NULL,
  referral_code VARCHAR(12)   UNIQUE,
  referred_by   INT           NULL,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT           NOT NULL,
  payment        VARCHAR(50)   NOT NULL,
  address        TEXT          NOT NULL,
  zone           VARCHAR(50),
  delivery_fee   INT           NOT NULL DEFAULT 0,
  hours          VARCHAR(100),
  note           TEXT,
  total          INT           NOT NULL,
  transfer_phone VARCHAR(30),
  transfer_name  VARCHAR(100),
  transfer_id    VARCHAR(100),
  status         VARCHAR(50)   DEFAULT 'En attente',
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS order_items (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT          NOT NULL,
  name     VARCHAR(255) NOT NULL,
  qty      INT          NOT NULL,
  price    INT          NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS referrals (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  referrer_id INT       NOT NULL,
  referred_id INT       NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_user     ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_items_order     ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_referrals_ref   ON referrals(referrer_id);
