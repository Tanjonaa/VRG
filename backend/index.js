const express   = require('express')
const mysql     = require('mysql2/promise')
const bcrypt    = require('bcryptjs')
const jwt       = require('jsonwebtoken')
const cors      = require('cors')
const multer    = require('multer')
const path      = require('path')
const crypto    = require('crypto')
const fs        = require('fs')
const rateLimit = require('express-rate-limit')

const app = express()
app.use(express.json())
app.use(cors())

/* ── Préfixe /api ─────────────────────────────────────────
   Le front appelle toujours /api/...
   • Docker  : nginx retire déjà /api (proxy_pass) → ce middleware est no-op
   • o2switch: app Node unique qui sert tout → on retire /api ici          */
app.use((req, res, next) => {
  if (req.url === '/api' || req.url.startsWith('/api/')) {
    req.isApi = true
    req.url = req.url === '/api' ? '/' : req.url.slice(4)
  }
  next()
})

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Trop de tentatives, réessaie dans 15 minutes' } })
const apiLimiter   = rateLimit({ windowMs: 60 * 1000, max: 120, message: { error: 'Trop de requêtes, ralentis' },
  /* En mode app-unique (o2switch), ne pas limiter le chargement des fichiers statiques */
  skip: req => !!process.env.FRONTEND_DIST && !req.isApi })
app.use('/auth/login', loginLimiter)
app.use(apiLimiter)

/* ── Multer : upload images ──────────────────────────────── */
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/app/uploads'
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase()
    const unique = crypto.randomBytes(8).toString('hex')
    cb(null, `${Date.now()}-${unique}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(file.mimetype)
    cb(null, ok)
  },
})

const pool = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  port:             process.env.DB_PORT     || 3306,
  database:         process.env.DB_NAME     || 'toka5412_vrg',
  user:             process.env.DB_USER     || 'toka5412_varygasy',
  password:         process.env.DB_PASSWORD || '***SECRET-PURGE***',
  waitForConnections: true,
  connectionLimit:  10,
})

const SECRET = process.env.JWT_SECRET || 'change_this_in_production'
if (SECRET === 'change_this_in_production')
  console.warn('⚠️  JWT_SECRET non configuré — utilise la valeur par défaut non sécurisée')

/* ── Initialisation DB (retry — MariaDB peut démarrer après l'API) ── */
;(async () => {
  for (let i = 0; i < 15; i++) {
    try { await pool.execute('SELECT 1'); break }
    catch { if (i === 14) { console.error('DB unreachable'); process.exit(1) }
            await new Promise(r => setTimeout(r, 2000)) }
  }

  await pool.execute(`CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    phone         VARCHAR(20)   NOT NULL UNIQUE,
    password      VARCHAR(255)  NOT NULL,
    referral_code VARCHAR(12)   UNIQUE,
    referred_by   INT           NULL,
    role          VARCHAR(20)   DEFAULT 'client',
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referred_by) REFERENCES users(id) ON DELETE SET NULL
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    price       INT          NOT NULL DEFAULT 0,
    category    VARCHAR(100),
    stock       INT          NOT NULL DEFAULT 0,
    images      LONGTEXT,
    active      TINYINT(1)   DEFAULT 1,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS orders (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    user_id           INT          NOT NULL,
    payment           VARCHAR(50)  NOT NULL,
    address           TEXT         NOT NULL,
    zone              VARCHAR(50),
    delivery_fee      INT          NOT NULL DEFAULT 0,
    hours             VARCHAR(100),
    note              TEXT,
    total             INT          NOT NULL,
    transfer_phone    VARCHAR(30),
    transfer_name     VARCHAR(100),
    transfer_id       VARCHAR(100),
    status            VARCHAR(50)  DEFAULT 'En attente',
    payment_confirmed TINYINT(1)   DEFAULT 0,
    livreur_id        INT          NULL DEFAULT NULL,
    created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`)
  await pool.execute(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS livreur_id INT NULL DEFAULT NULL`)
  await pool.execute(`ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_percent INT NOT NULL DEFAULT 0`)
  await pool.execute(`ALTER TABLE products ADD COLUMN IF NOT EXISTS promo_active TINYINT(1) NOT NULL DEFAULT 0`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS order_items (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT          NOT NULL,
    name     VARCHAR(255) NOT NULL,
    qty      INT          NOT NULL,
    price    INT          NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS referrals (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    referrer_id INT       NOT NULL,
    referred_id INT       NOT NULL UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS visits (
    id    INT  AUTO_INCREMENT PRIMARY KEY,
    date  DATE NOT NULL UNIQUE,
    count INT  DEFAULT 1
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS settings (
    \`key\`      VARCHAR(100) PRIMARY KEY,
    \`value\`    TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS team_members (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    role        VARCHAR(100),
    description TEXT,
    photo       VARCHAR(255),
    order_index INT         NOT NULL DEFAULT 0,
    active      TINYINT(1)  DEFAULT 1,
    created_at  TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS admin_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    admin_id    INT           NOT NULL,
    admin_name  VARCHAR(100)  NOT NULL,
    action      VARCHAR(50)   NOT NULL,
    target_type VARCHAR(30)   NOT NULL,
    target_id   INT           NOT NULL,
    target_name VARCHAR(100)  NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_logs_created (created_at)
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS chat_rooms (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    type      ENUM('admin_only','admin_mod','direct','support') NOT NULL,
    name      VARCHAR(255),
    client_id INT NULL,
    created_at DATETIME DEFAULT NOW()
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    PRIMARY KEY (room_id, user_id)
  )`)
  await pool.execute(`CREATE TABLE IF NOT EXISTS chat_messages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    room_id     INT NOT NULL,
    sender_id   INT NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    body        TEXT NOT NULL,
    created_at  DATETIME DEFAULT NOW(),
    INDEX idx_chat_room_date (room_id, created_at)
  )`)

  const seeds = [
    ['announcement_active','0'],['announcement_text',''],['announcement_color','#FF9900'],
    ['delivery_fee_tana','3000'],['delivery_fee_peripherique','5000'],
    ['whatsapp',''],['facebook',''],['instagram',''],['business_hours',''],
    ['reassurance_text','Livraison gratuite Antananarivo · Paiement à la livraison · Retour sous 7 jours'],
    ['marquee_items','[{"text":"Finger Sleeves Gaming dispo maintenant"},{"text":"Livraison 24h sur Antananarivo"},{"text":"+1 200 gamers équipés à Madagascar"},{"text":"Ventilateurs Turbo — stock limité"},{"text":"Garantie 6 mois sur tous les produits"},{"text":"Support WhatsApp 7j/7 — réponse en 5 min"}]'],
    ['team_badge','Notre équipe'],['team_title','Les personnes derrière'],
    ['team_subtitle','Une équipe passionnée au service de vos commandes à Madagascar.'],
    ['coming_soon','0'],
    ['coming_soon_date',''],
    ['coming_soon_message','Nous préparons quelque chose d\'exceptionnel. La boutique ouvre bientôt !'],
  ]
  for (const [k, v] of seeds)
    await pool.execute('INSERT IGNORE INTO settings (`key`, `value`) VALUES (?, ?)', [k, v])

  const [[r1]] = await pool.execute("SELECT id FROM chat_rooms WHERE type='admin_only' LIMIT 1")
  if (!r1) await pool.execute("INSERT INTO chat_rooms (type, name) VALUES ('admin_only', 'Admins')")
  const [[r2]] = await pool.execute("SELECT id FROM chat_rooms WHERE type='admin_mod' LIMIT 1")
  if (!r2) await pool.execute("INSERT INTO chat_rooms (type, name) VALUES ('admin_mod', 'Equipe')")
  await pool.execute(`ALTER TABLE chat_rooms MODIFY type ENUM('admin_only','admin_mod','direct','support','livreur_group') NOT NULL`).catch(() => {})
  const [[rLiv]] = await pool.execute("SELECT id FROM chat_rooms WHERE type='livreur_group' LIMIT 1")
  if (!rLiv) await pool.execute("INSERT INTO chat_rooms (type, name) VALUES ('livreur_group', 'Livreurs')")

  console.log('DB initialisee')
})().catch(e => console.error('DB init error:', e))

/* ── Log helper ──────────────────────────────────────────── */
async function writeLog(adminId, adminName, action, targetType, targetId, targetName, oldValue, newValue) {
  try {
    await pool.execute(
      'INSERT INTO admin_logs (admin_id, admin_name, action, target_type, target_id, target_name, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [adminId, adminName, action, targetType, Number(targetId), targetName,
       oldValue != null ? String(oldValue) : null,
       newValue != null ? String(newValue) : null]
    )
  } catch {}
}

function makeReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/* ── Auth middleware ─────────────────────────────────── */
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Non authentifié' })
  try { req.user = jwt.verify(token, SECRET); next() }
  catch { res.status(401).json({ error: 'Session expirée, reconnecte-toi' }) }
}

const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Non authentifié' })
  try {
    const user = jwt.verify(token, SECRET)
    if (!['admin', 'moderator'].includes(user.role))
      return res.status(403).json({ error: 'Accès refusé' })
    req.user = user
    next()
  } catch { res.status(401).json({ error: 'Session expirée' }) }
}

const livreurAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Non authentifié' })
  try {
    const user = jwt.verify(token, SECRET)
    if (user.role !== 'livreur') return res.status(403).json({ error: 'Accès réservé aux livreurs' })
    req.user = user
    next()
  } catch { res.status(401).json({ error: 'Session expirée' }) }
}

/* ── GET /auth/check-phone ───────────────────────────── */
/* Vérifie en temps réel si un numéro est disponible (inscription) */
app.get('/auth/check-phone', async (req, res) => {
  const phone = (req.query.phone || '').trim()
  if (!phone) return res.json({ available: false })
  try {
    const [rows] = await pool.execute('SELECT id FROM users WHERE phone = ?', [phone])
    res.json({ available: rows.length === 0 })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── POST /auth/register ─────────────────────────────── */
app.post('/auth/register', async (req, res) => {
  const { name, phone, password, referralCode } = req.body
  if (!name || !phone || !password)
    return res.status(400).json({ error: 'Remplis tous les champs' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    /* Vérifie d'abord que le numéro est disponible */
    const [existing] = await conn.execute('SELECT id FROM users WHERE phone = ?', [phone.trim()])
    if (existing.length) {
      await conn.rollback()
      return res.status(409).json({ error: 'Ce numéro est déjà enregistré' })
    }

    const hash = await bcrypt.hash(password, 10)
    const code = makeReferralCode()

    let referrerId = null
    if (referralCode) {
      const [refs] = await conn.execute('SELECT id FROM users WHERE referral_code = ?', [referralCode.toUpperCase()])
      if (refs[0]) referrerId = refs[0].id
    }

    const [r] = await conn.execute(
      'INSERT INTO users (name, phone, password, referral_code, referred_by) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), phone.trim(), hash, code, referrerId]
    )
    if (referrerId) {
      await conn.execute('INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)', [referrerId, r.insertId])
    }
    await conn.commit()

    const user = { id: r.insertId, name: name.trim(), phone: phone.trim(), role: 'client' }
    const token = jwt.sign(user, SECRET, { expiresIn: '30d' })
    res.json({ token, user })
  } catch (err) {
    await conn.rollback()
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ce numéro est déjà enregistré' })
    res.status(500).json({ error: 'Erreur serveur' })
  } finally { conn.release() }
})

/* ── POST /auth/login ────────────────────────────────── */
app.post('/auth/login', async (req, res) => {
  const { phone, password } = req.body
  if (!phone || !password) return res.status(400).json({ error: 'Remplis tous les champs' })
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE phone = ?', [phone.trim()])
    const u = rows[0]
    if (!u || !(await bcrypt.compare(password, u.password)))
      return res.status(401).json({ error: 'Numéro ou mot de passe incorrect' })
    const user = { id: u.id, name: u.name, phone: u.phone, role: u.role || 'client' }
    const token = jwt.sign(user, SECRET, { expiresIn: '30d' })
    res.json({ token, user })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /auth/me ────────────────────────────────────── */
app.get('/auth/me', auth, (req, res) => res.json({ user: req.user }))

/* ── PUT /auth/profile ───────────────────────────────── */
app.put('/auth/profile', auth, async (req, res) => {
  const { name, phone, currentPassword, newPassword } = req.body
  try {
    if (currentPassword && newPassword) {
      if (newPassword.length < 6)
        return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' })
      const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.id])
      const ok = await bcrypt.compare(currentPassword, rows[0].password)
      if (!ok) return res.status(401).json({ error: 'Mot de passe actuel incorrect' })
      const hash = await bcrypt.hash(newPassword, 10)
      await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id])
    }
    if (name || phone) {
      await pool.execute(
        'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?',
        [name?.trim() || null, phone?.trim() || null, req.user.id]
      )
    }
    const [rows] = await pool.execute('SELECT id, name, phone, role FROM users WHERE id = ?', [req.user.id])
    const user = rows[0]
    const token = jwt.sign(user, SECRET, { expiresIn: '30d' })
    res.json({ user, token })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ce numéro est déjà utilisé' })
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

/* ── GET /referral ───────────────────────────────────── */
app.get('/referral', auth, async (req, res) => {
  try {
    let [rows] = await pool.execute('SELECT referral_code FROM users WHERE id = ?', [req.user.id])
    let code = rows[0].referral_code
    if (!code) {
      code = makeReferralCode()
      await pool.execute('UPDATE users SET referral_code = ? WHERE id = ?', [code, req.user.id])
    }
    const [referrals] = await pool.execute(
      `SELECT u.name, u.created_at,
              COALESCE(SUM(CASE WHEN o.status != 'Annulé' THEN o.total ELSE 0 END), 0) AS total_spent
       FROM referrals r
       JOIN users u ON u.id = r.referred_id
       LEFT JOIN orders o ON o.user_id = r.referred_id
       WHERE r.referrer_id = ?
       GROUP BY r.referred_id, u.name, u.created_at
       ORDER BY u.created_at DESC`,
      [req.user.id]
    )
    const THRESHOLD = 5000
    const validated = referrals.filter(r => Number(r.total_spent) >= THRESHOLD)
    res.json({
      code,
      count:    validated.length,
      points:   validated.length * 10,
      referrals: referrals.map(r => ({
        name:      r.name,
        date:      new Date(r.created_at).toLocaleDateString('fr-FR'),
        validated: Number(r.total_spent) >= THRESHOLD,
        spent:     Number(r.total_spent),
      })),
    })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /orders ─────────────────────────────────────── */
app.get('/orders', auth, async (req, res) => {
  try {
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]
    )
    const result = await Promise.all(orders.map(async (o) => {
      const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [o.id])
      return { id: o.id, payment: o.payment, address: o.address, zone: o.zone,
        delivery_fee: o.delivery_fee, hours: o.hours, note: o.note, total: o.total,
        status: o.status, date: new Date(o.created_at).toLocaleDateString('fr-FR'), items,
        transfer: o.transfer_phone ? { phone: o.transfer_phone, name: o.transfer_name, id: o.transfer_id } : null }
    }))
    res.json(result)
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── POST /orders ────────────────────────────────────── */
app.post('/orders', auth, async (req, res) => {
  if (['admin', 'moderator', 'livreur'].includes(req.user.role))
    return res.status(403).json({ error: 'Les comptes staff ne peuvent pas passer de commande' })
  const { payment, address, zone, delivery_fee, hours, note, total, transfer, items } = req.body
  if (!payment || !address || !total) return res.status(400).json({ error: 'Données incomplètes' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const [r] = await conn.execute(
      `INSERT INTO orders (user_id, payment, address, zone, delivery_fee, hours, note, total,
        transfer_phone, transfer_name, transfer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, payment, address, zone || null, delivery_fee || 0, hours || null,
       note || '', total, transfer?.phone || null, transfer?.name || null, transfer?.id || null]
    )
    const orderId = r.insertId
    if (items?.length) {
      for (const item of items) {
        await conn.execute('INSERT INTO order_items (order_id, name, qty, price) VALUES (?, ?, ?, ?)',
          [orderId, item.name, item.qty, item.price])
        if (item.id) {
          await conn.execute(
            'UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?',
            [item.qty, item.id]
          )
        }
      }
    }
    await conn.commit()
    res.json({ id: orderId, payment, address, zone: zone || null, delivery_fee: delivery_fee || 0,
      hours: hours || null, note: note || '', total, status: 'En attente',
      date: new Date().toLocaleDateString('fr-FR'), items: items || [], transfer: transfer || null })
  } catch { await conn.rollback(); res.status(500).json({ error: 'Erreur lors de la commande, réessaie' }) }
  finally { conn.release() }
})

/* ── POST /visits ────────────────────────────────────── */
app.post('/visits', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    await pool.execute(
      'INSERT INTO visits (date, count) VALUES (?, 1) ON DUPLICATE KEY UPDATE count = count + 1',
      [today]
    )
    res.json({ ok: true })
  } catch { res.json({ ok: false }) }
})

/* ════════════════════════════════════════════════════════
   ADMIN ROUTES
   ════════════════════════════════════════════════════════ */

/* ── GET /admin/stats ────────────────────────────────── */
/* ── GET /admin/notifications ────────────────────────── */
app.get('/admin/notifications', adminAuth, async (req, res) => {
  try {
    const { since } = req.query
    const [[{ pending_orders }]] = await pool.execute(
      "SELECT COUNT(*) as pending_orders FROM orders WHERE status = 'En attente'"
    )
    let unread_msgs = 0
    if (since) {
      const [[{ count }]] = await pool.execute(
        'SELECT COUNT(*) as count FROM chat_messages WHERE created_at > ? AND sender_id != ?',
        [since, req.user.id]
      )
      unread_msgs = count
    }
    res.json({ pending_orders, unread_msgs })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const [[{ total_sales }]] = await pool.execute("SELECT COALESCE(SUM(total),0) as total_sales FROM orders WHERE status != 'Annulé'")
    const [[{ month_sales }]] = await pool.execute("SELECT COALESCE(SUM(total),0) as month_sales FROM orders WHERE MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW()) AND status != 'Annulé'")
    const [[{ today_sales }]] = await pool.execute("SELECT COALESCE(SUM(total),0) as today_sales FROM orders WHERE DATE(created_at)=CURDATE() AND status != 'Annulé'")
    const [[{ total_orders }]] = await pool.execute('SELECT COUNT(*) as total_orders FROM orders')
    const [[{ pending }]]      = await pool.execute("SELECT COUNT(*) as pending FROM orders WHERE status='En attente'")
    const [[{ confirmed }]]    = await pool.execute("SELECT COUNT(*) as confirmed FROM orders WHERE status='Confirmé'")
    const [[{ delivered }]]    = await pool.execute("SELECT COUNT(*) as delivered FROM orders WHERE status='Livré'")
    const [[{ total_users }]]  = await pool.execute("SELECT COUNT(*) as total_users FROM users WHERE role='client'")
    const [[{ month_users }]]  = await pool.execute("SELECT COUNT(*) as month_users FROM users WHERE MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW()) AND role='client'")
    const [[{ today_visits }]] = await pool.execute("SELECT COALESCE(SUM(count),0) as today_visits FROM visits WHERE date=CURDATE()")
    const [[{ month_visits }]] = await pool.execute("SELECT COALESCE(SUM(count),0) as month_visits FROM visits WHERE MONTH(date)=MONTH(NOW()) AND YEAR(date)=YEAR(NOW())")
    const [[{ low_stock }]]    = await pool.execute('SELECT COUNT(*) as low_stock FROM products WHERE stock <= 5 AND active=1')

    const [monthly_sales] = await pool.execute(
      `SELECT MONTH(created_at) as month, YEAR(created_at) as year, SUM(total) as total
       FROM orders WHERE YEAR(created_at)=YEAR(NOW()) GROUP BY YEAR(created_at), MONTH(created_at) ORDER BY month`
    )
    const [monthly_users] = await pool.execute(
      `SELECT MONTH(created_at) as month, COUNT(*) as count
       FROM users WHERE YEAR(created_at)=YEAR(NOW()) AND role='client' GROUP BY MONTH(created_at) ORDER BY month`
    )

    res.json({
      sales:   { total: total_sales, month: month_sales, today: today_sales },
      orders:  { total: total_orders, pending, confirmed, delivered },
      users:   { total: total_users, month: month_users },
      visits:  { today: today_visits, month: month_visits },
      alerts:  { low_stock },
      charts:  { monthly_sales, monthly_users },
    })
  } catch(e) { console.error(e); res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /products (public) ─────────────────────────── */
/* ── POST /admin/upload ──────────────────────────────────── */
app.post('/admin/upload', adminAuth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier ou format non supporté (jpg/png/webp/avif)' })
  res.json({ src: `/images/uploads/${req.file.filename}` })
})

/* ── GET /products (public) ─────────────────────────────── */
app.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, description, price, category, stock, images, created_at, promo_percent, promo_active FROM products WHERE active=1 AND stock > 0 ORDER BY created_at DESC'
    )
    const products = rows.map(p => ({
      ...p,
      images: (() => { try { return JSON.parse(p.images) } catch { return [] } })(),
    }))
    res.json(products)
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /admin/categories ───────────────────────────── */
app.get('/admin/categories', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != '' ORDER BY category"
    )
    res.json(rows.map(r => r.category))
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /admin/products ─────────────────────────────── */
app.get('/admin/products', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM products ORDER BY created_at DESC')
    res.json(rows)
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── POST /admin/products ────────────────────────────── */
app.post('/admin/products', adminAuth, async (req, res) => {
  const { name, description, price, category, stock, images } = req.body
  if (!name || price === undefined) return res.status(400).json({ error: 'Nom et prix requis' })
  try {
    const [r] = await pool.execute(
      'INSERT INTO products (name, description, price, category, stock, images) VALUES (?, ?, ?, ?, ?, ?)',
      [name.trim(), description || '', price, category || '', stock || 0, JSON.stringify(images || [])]
    )
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [r.insertId])
    await writeLog(req.user.id, req.user.name, 'product_add', 'product', r.insertId, name.trim(), null, category || null)
    res.json(rows[0])
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── PUT /admin/products/:id ─────────────────────────── */
app.put('/admin/products/:id', adminAuth, async (req, res) => {
  const { name, description, price, category, stock, images, active } = req.body
  try {
    const [[prev]] = await pool.execute('SELECT name, price, category, stock FROM products WHERE id=?', [req.params.id])
    await pool.execute(
      `UPDATE products SET name=COALESCE(?,name), description=COALESCE(?,description),
       price=COALESCE(?,price), category=COALESCE(?,category), stock=COALESCE(?,stock),
       images=COALESCE(?,images), active=COALESCE(?,active) WHERE id=?`,
      [name||null, description||null, price??null, category||null, stock??null,
       images ? JSON.stringify(images) : null, active??null, req.params.id]
    )
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id])
    if (prev) {
      const checks = [
        { label: 'nom',       oldV: prev.name,     newV: name     },
        { label: 'prix',      oldV: prev.price,    newV: price    },
        { label: 'catégorie', oldV: prev.category, newV: category },
        { label: 'stock',     oldV: prev.stock,    newV: stock    },
      ]
      const diffs = checks.filter(c => c.newV != null && String(c.oldV) !== String(c.newV))
      if (diffs.length > 0) {
        const oldStr = diffs.map(d => `${d.label}: ${d.oldV}`).join(' · ')
        const newStr = diffs.map(d => `${d.label}: ${d.newV}`).join(' · ')
        await writeLog(req.user.id, req.user.name, 'product_edit', 'product', req.params.id,
          name || prev.name, oldStr, newStr)
      }
    }
    res.json(rows[0])
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── PUT /admin/products/:id/promo ──────────────────── */
app.put('/admin/products/:id/promo', adminAuth, async (req, res) => {
  const { promo_percent, promo_active } = req.body
  try {
    const [[prev]] = await pool.execute('SELECT name FROM products WHERE id=?', [req.params.id])
    await pool.execute(
      'UPDATE products SET promo_percent=?, promo_active=? WHERE id=?',
      [Number(promo_percent) || 0, promo_active ? 1 : 0, req.params.id]
    )
    await writeLog(req.user.id, req.user.name, 'product_edit', 'product', req.params.id,
      prev?.name || '—',
      promo_active ? null : `promo ${promo_percent}%`,
      promo_active ? `promo ${promo_percent}%` : 'promo désactivée'
    )
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── DELETE /admin/products/:id ──────────────────────── */
app.delete('/admin/products/:id', adminAuth, async (req, res) => {
  try {
    const [[prev]] = await pool.execute('SELECT name, category FROM products WHERE id=?', [req.params.id])
    await pool.execute('UPDATE products SET active=0 WHERE id=?', [req.params.id])
    await writeLog(req.user.id, req.user.name, 'product_archive', 'product', req.params.id,
      prev ? prev.name : '—', 'actif', 'archivé')
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── DELETE /admin/products/:id/permanent ────────────── */
app.delete('/admin/products/:id/permanent', adminAuth, async (req, res) => {
  try {
    const [[prev]] = await pool.execute('SELECT name FROM products WHERE id=?', [req.params.id])
    await pool.execute('DELETE FROM products WHERE id = ?', [req.params.id])
    await writeLog(req.user.id, req.user.name, 'product_delete', 'product', req.params.id,
      prev ? prev.name : '—', null, null)
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /admin/orders ───────────────────────────────── */
app.get('/admin/orders', adminAuth, async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.*, u.name as user_name, u.phone as user_phone
       FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC`
    )
    const result = await Promise.all(orders.map(async (o) => {
      const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id=?', [o.id])
      return { ...o, items, date: new Date(o.created_at).toLocaleDateString('fr-FR') }
    }))
    res.json(result)
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── PUT /admin/orders/:id ───────────────────────────── */
app.put('/admin/orders/:id', adminAuth, async (req, res) => {
  const { status, payment_confirmed } = req.body
  try {
    const [[prev]] = await pool.execute(
      'SELECT o.status, o.payment_confirmed, u.name as user_name FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=?',
      [req.params.id]
    )
    if (status) await pool.execute('UPDATE orders SET status=? WHERE id=?', [status, req.params.id])
    if (payment_confirmed !== undefined)
      await pool.execute('UPDATE orders SET payment_confirmed=? WHERE id=?', [payment_confirmed ? 1 : 0, req.params.id])
    if (prev) {
      if (status && status !== prev.status)
        await writeLog(req.user.id, req.user.name, 'order_status', 'order', req.params.id,
          `Commande #${req.params.id} (${prev.user_name})`, prev.status, status)
      if (payment_confirmed !== undefined) {
        const oldPay = prev.payment_confirmed ? 'confirmé' : 'non confirmé'
        const newPay = payment_confirmed ? 'confirmé' : 'non confirmé'
        await writeLog(req.user.id, req.user.name, 'order_payment', 'order', req.params.id,
          `Commande #${req.params.id} (${prev.user_name})`, oldPay, newPay)
      }
    }
    res.json({ ok: true, status, payment_confirmed })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /admin/users ────────────────────────────────── */
app.get('/admin/users', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.phone, u.role, u.referral_code, u.created_at,
        COUNT(DISTINCT o.id)      as order_count,
        COALESCE(SUM(o.total), 0) as total_spent,
        COUNT(DISTINCT CASE WHEN (
          SELECT COALESCE(SUM(o2.total),0) FROM orders o2
          WHERE o2.user_id = r.referred_id AND o2.status != 'Annulé'
        ) >= 5000 THEN r.referred_id END) as referral_count
       FROM users u
       LEFT JOIN orders    o ON o.user_id      = u.id
       LEFT JOIN referrals r ON r.referrer_id  = u.id
       GROUP BY u.id ORDER BY u.created_at DESC`
    )
    res.json(rows.map(u => ({ ...u, date: new Date(u.created_at).toLocaleDateString('fr-FR') })))
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /admin/users/:id/referrals ─────────────────── */
app.get('/admin/users/:id/referrals', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.phone, u.created_at
       FROM referrals r JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = ? ORDER BY r.created_at DESC`,
      [req.params.id]
    )
    res.json(rows)
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── POST /admin/users ───────────────────────────────── */
app.post('/admin/users', adminAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Seul un admin peut créer des comptes staff' })
  const { name, phone, password, role } = req.body
  if (!name || !phone || !password) return res.status(400).json({ error: 'Remplis tous les champs' })
  if (!['admin', 'moderator', 'livreur'].includes(role)) return res.status(400).json({ error: 'Rôle invalide' })
  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE phone = ?', [phone.trim()])
    if (existing.length) return res.status(409).json({ error: 'Ce numéro est déjà utilisé' })
    const hash = await bcrypt.hash(password, 10)
    const code = makeReferralCode()
    const [r] = await pool.execute(
      'INSERT INTO users (name, phone, password, role, referral_code) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), phone.trim(), hash, role, code]
    )
    await writeLog(req.user.id, req.user.name, 'user_create', 'user', r.insertId, `${name.trim()} (${phone.trim()})`, null, role)
    res.status(201).json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── PUT /admin/users/:id ────────────────────────────── */
app.put('/admin/users/:id', adminAuth, async (req, res) => {
  const { role } = req.body
  const allowed = ['client', 'moderator', 'admin', 'livreur']
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Rôle invalide' })
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Seul un admin peut changer les rôles' })
  if (String(req.params.id) === String(req.user.id)) return res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre rôle' })
  try {
    const [[target]] = await pool.execute('SELECT name, role FROM users WHERE id=?', [req.params.id])
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' })
    await pool.execute('UPDATE users SET role=? WHERE id=?', [role, req.params.id])
    await writeLog(req.user.id, req.user.name, 'role_change', 'user', req.params.id, target.name, target.role, role)
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── POST /admin/users/purge-inactive ────────────────── */
/* Supprime tous les clients sans aucune commande (admin only) */
app.post('/admin/users/purge-inactive', adminAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Seul un admin peut purger les comptes' })
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.phone FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       WHERE u.role = 'client'
       GROUP BY u.id
       HAVING COUNT(o.id) = 0`
    )
    if (rows.length === 0) return res.json({ ok: true, deleted: 0 })
    const ids = rows.map(r => r.id)
    const placeholders = ids.map(() => '?').join(',')
    await pool.execute(`DELETE FROM users WHERE id IN (${placeholders})`, ids)
    await writeLog(req.user.id, req.user.name, 'user_purge', 'user', 0,
      `${rows.length} client(s) inactif(s)`, null, `supprimés : ${rows.length}`)
    res.json({ ok: true, deleted: rows.length })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── DELETE /admin/users/:id ─────────────────────────── */
/* Supprime un compte (client/moderator/admin) — admin only, jamais soi-même */
app.delete('/admin/users/:id', adminAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Seul un admin peut supprimer un compte' })
  if (String(req.params.id) === String(req.user.id)) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' })
  try {
    const [[target]] = await pool.execute('SELECT name, phone, role FROM users WHERE id=?', [req.params.id])
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' })
    await pool.execute('DELETE FROM users WHERE id=?', [req.params.id])
    await writeLog(req.user.id, req.user.name, 'user_delete', 'user', req.params.id,
      `${target.name} (${target.phone})`, target.role, 'supprimé')
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── GET /admin/stocks ───────────────────────────────── */
app.get('/admin/stocks', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, category, stock, price, active FROM products ORDER BY stock ASC'
    )
    res.json(rows)
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── PUT /admin/stocks/:id ───────────────────────────── */
app.put('/admin/stocks/:id', adminAuth, async (req, res) => {
  const { stock } = req.body
  if (stock === undefined) return res.status(400).json({ error: 'Stock requis' })
  try {
    const [[prev]] = await pool.execute('SELECT name, stock FROM products WHERE id=?', [req.params.id])
    await pool.execute('UPDATE products SET stock=? WHERE id=?', [stock, req.params.id])
    await writeLog(req.user.id, req.user.name, 'stock_update', 'product', req.params.id,
      prev ? prev.name : '—', prev ? String(prev.stock) : null, String(stock))
    res.json({ ok: true, stock })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /settings (public) ──────────────────────────────── */
app.get('/settings', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT `key`, `value` FROM settings')
    const obj = {}
    rows.forEach(r => { obj[r.key] = r.value })
    res.json(obj)
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /admin/settings ─────────────────────────────────── */
app.get('/admin/settings', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT `key`, `value` FROM settings')
    const obj = {}
    rows.forEach(r => { obj[r.key] = r.value })
    res.json(obj)
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── PUT /admin/settings ─────────────────────────────────── */
app.put('/admin/settings', adminAuth, async (req, res) => {
  const { settings } = req.body // [{ key, value }]
  if (!Array.isArray(settings) || settings.length === 0)
    return res.status(400).json({ error: 'Données invalides' })
  try {
    for (const { key, value } of settings) {
      const [[prev]] = await pool.execute('SELECT `value` FROM settings WHERE `key`=?', [key])
      await pool.execute(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value`=?',
        [key, value, value]
      )
      if (!prev || prev.value !== value)
        await writeLog(req.user.id, req.user.name, 'settings_update', 'setting', 0, key,
          prev ? prev.value : null, value)
    }
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /team (public) ──────────────────────────────────── */
app.get('/team', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, role, description, photo FROM team_members WHERE active=1 ORDER BY order_index ASC, id ASC'
    )
    res.json(rows)
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /admin/team ─────────────────────────────────────── */
app.get('/admin/team', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM team_members ORDER BY order_index ASC, id ASC'
    )
    res.json(rows)
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── POST /admin/team ────────────────────────────────────── */
app.post('/admin/team', adminAuth, async (req, res) => {
  const { name, role, description, photo, order_index } = req.body
  if (!name) return res.status(400).json({ error: 'Nom requis' })
  try {
    const [r] = await pool.execute(
      'INSERT INTO team_members (name, role, description, photo, order_index) VALUES (?, ?, ?, ?, ?)',
      [name, role || null, description || null, photo || null, order_index || 0]
    )
    await writeLog(req.user.id, req.user.name, 'team_add', 'team_member', r.insertId, name, null, role || null)
    res.json({ id: r.insertId })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── PUT /admin/team/:id ─────────────────────────────────── */
app.put('/admin/team/:id', adminAuth, async (req, res) => {
  const { name, role, description, photo, order_index, active } = req.body
  if (!name) return res.status(400).json({ error: 'Nom requis' })
  try {
    const [[prev]] = await pool.execute('SELECT name, role FROM team_members WHERE id=?', [req.params.id])
    await pool.execute(
      'UPDATE team_members SET name=?, role=?, description=?, photo=?, order_index=?, active=? WHERE id=?',
      [name, role || null, description || null, photo || null, order_index || 0,
       active !== undefined ? (active ? 1 : 0) : 1, req.params.id]
    )
    await writeLog(req.user.id, req.user.name, 'team_edit', 'team_member', req.params.id,
      name, prev ? prev.role : null, role || null)
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── DELETE /admin/team/:id (soft delete) ────────────────── */
app.delete('/admin/team/:id', adminAuth, async (req, res) => {
  try {
    const [[prev]] = await pool.execute('SELECT name FROM team_members WHERE id=?', [req.params.id])
    await pool.execute('UPDATE team_members SET active=0 WHERE id=?', [req.params.id])
    await writeLog(req.user.id, req.user.name, 'team_archive', 'team_member', req.params.id,
      prev ? prev.name : '—', 'actif', 'archivé')
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── GET /admin/logs ─────────────────────────────────────── */
app.get('/admin/logs', adminAuth, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit)  || 100, 200)
  const offset = parseInt(req.query.offset) || 0
  const action = req.query.action || null
  try {
    const where = action ? 'WHERE action=?' : ''
    const params = action ? [action, limit, offset] : [limit, offset]
    const [rows] = await pool.execute(
      `SELECT id, admin_id, admin_name, action, target_type, target_id, target_name,
              old_value, new_value, created_at
       FROM admin_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      params
    )
    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM admin_logs ${action ? 'WHERE action=?' : ''}`,
      action ? [action] : []
    )
    res.json({ rows, total })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ═══════════════════════════════════════════════════════════
   CHAT — routes admin
   ═══════════════════════════════════════════════════════════ */

/* GET /admin/chat/rooms — liste des salons accessibles */
app.get('/admin/chat/rooms', adminAuth, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin'
    const [fixed] = await pool.execute(
      isAdmin
        ? "SELECT id, type, name FROM chat_rooms WHERE type IN ('admin_only','admin_mod','livreur_group') ORDER BY id"
        : "SELECT id, type, name FROM chat_rooms WHERE type IN ('admin_mod','livreur_group') ORDER BY id"
    )
    const [directs] = await pool.execute(`
      SELECT cr.id, cr.type, cr.name,
             u.name AS other_name, u.role AS other_role
      FROM chat_rooms cr
      JOIN chat_room_members m1 ON m1.room_id = cr.id AND m1.user_id = ?
      JOIN chat_room_members m2 ON m2.room_id = cr.id AND m2.user_id != ?
      JOIN users u ON u.id = m2.user_id
      WHERE cr.type = 'direct'
    `, [req.user.id, req.user.id])
    const [supports] = await pool.execute(`
      SELECT cr.id, cr.type, cr.name, cr.client_id,
             (SELECT body FROM chat_messages WHERE room_id=cr.id ORDER BY created_at DESC LIMIT 1) AS last_msg,
             (SELECT created_at FROM chat_messages WHERE room_id=cr.id ORDER BY created_at DESC LIMIT 1) AS last_at
      FROM chat_rooms cr WHERE cr.type='support' ORDER BY last_at DESC
    `)
    res.json({ fixed, directs, supports })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* GET /admin/chat/rooms/:id/messages */
app.get('/admin/chat/rooms/:id/messages', adminAuth, async (req, res) => {
  try {
    const { since, limit = 60 } = req.query
    const roomId = Number(req.params.id)
    const [[room]] = await pool.execute('SELECT * FROM chat_rooms WHERE id=?', [roomId])
    if (!room) return res.status(404).json({ error: 'Salon introuvable' })
    if (room.type === 'admin_only' && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Acces refuse' })
    if (room.type === 'direct') {
      const [[m]] = await pool.execute(
        'SELECT 1 FROM chat_room_members WHERE room_id=? AND user_id=?', [roomId, req.user.id]
      )
      if (!m) return res.status(403).json({ error: 'Acces refuse' })
    }
    let query = 'SELECT * FROM chat_messages WHERE room_id=?'
    const params = [roomId]
    if (since) { query += ' AND created_at > ?'; params.push(since) }
    query += ' ORDER BY created_at ASC LIMIT ?'
    params.push(Number(limit))
    const [rows] = await pool.execute(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* POST /admin/chat/rooms/:id/messages */
app.post('/admin/chat/rooms/:id/messages', adminAuth, async (req, res) => {
  const { body } = req.body
  if (!body?.trim()) return res.status(400).json({ error: 'Message vide' })
  try {
    const roomId = Number(req.params.id)
    const [[room]] = await pool.execute('SELECT * FROM chat_rooms WHERE id=?', [roomId])
    if (!room) return res.status(404).json({ error: 'Salon introuvable' })
    if (room.type === 'admin_only' && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Acces refuse' })
    const [r] = await pool.execute(
      'INSERT INTO chat_messages (room_id, sender_id, sender_name, body) VALUES (?,?,?,?)',
      [roomId, req.user.id, req.user.name, body.trim()]
    )
    const [[msg]] = await pool.execute('SELECT * FROM chat_messages WHERE id=?', [r.insertId])
    res.json(msg)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* GET /admin/chat/staff — liste du staff pour creer un DM */
app.get('/admin/chat/staff', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, role FROM users WHERE role IN ('admin','moderator') AND id != ? ORDER BY name",
      [req.user.id]
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* POST /admin/chat/direct/:userId — creer ou recuperer un DM */
app.post('/admin/chat/direct/:userId', adminAuth, async (req, res) => {
  const otherId = Number(req.params.userId)
  const myId    = req.user.id
  try {
    const [[other]] = await pool.execute(
      "SELECT id, name, role FROM users WHERE id=? AND role IN ('admin','moderator')", [otherId]
    )
    if (!other) return res.status(404).json({ error: 'Utilisateur introuvable' })
    const [existing] = await pool.execute(`
      SELECT cr.id FROM chat_rooms cr
      JOIN chat_room_members m1 ON m1.room_id=cr.id AND m1.user_id=?
      JOIN chat_room_members m2 ON m2.room_id=cr.id AND m2.user_id=?
      WHERE cr.type='direct' LIMIT 1
    `, [myId, otherId])
    if (existing.length) return res.json({ room_id: existing[0].id })
    const [r] = await pool.execute(
      "INSERT INTO chat_rooms (type, name) VALUES ('direct', ?)",
      [req.user.name + ' & ' + other.name]
    )
    const roomId = r.insertId
    await pool.execute('INSERT INTO chat_room_members (room_id, user_id) VALUES (?,?)', [roomId, myId])
    await pool.execute('INSERT INTO chat_room_members (room_id, user_id) VALUES (?,?)', [roomId, otherId])
    res.json({ room_id: roomId })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ═══════════════════════════════════════════════════════════
   CHAT — routes client (support)
   ═══════════════════════════════════════════════════════════ */

/* GET /chat/support */
app.get('/chat/support', auth, async (req, res) => {
  try {
    let [[room]] = await pool.execute(
      "SELECT * FROM chat_rooms WHERE type='support' AND client_id=? LIMIT 1", [req.user.id]
    )
    if (!room) {
      const [[u]] = await pool.execute('SELECT name FROM users WHERE id=?', [req.user.id])
      const [r] = await pool.execute(
        "INSERT INTO chat_rooms (type, name, client_id) VALUES ('support',?,?)",
        [u ? u.name : 'Client', req.user.id]
      )
      const insertId = r.insertId;
      [[room]] = await pool.execute('SELECT * FROM chat_rooms WHERE id=?', [insertId])
    }
    const [messages] = await pool.execute(
      'SELECT * FROM chat_messages WHERE room_id=? ORDER BY created_at ASC LIMIT 100', [room.id]
    )
    res.json({ room_id: room.id, messages })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* POST /chat/support/messages */
app.post('/chat/support/messages', auth, async (req, res) => {
  const { body } = req.body
  if (!body?.trim()) return res.status(400).json({ error: 'Message vide' })
  try {
    let [[room]] = await pool.execute(
      "SELECT * FROM chat_rooms WHERE type='support' AND client_id=? LIMIT 1", [req.user.id]
    )
    if (!room) {
      const [[u]] = await pool.execute('SELECT name FROM users WHERE id=?', [req.user.id])
      const [r] = await pool.execute(
        "INSERT INTO chat_rooms (type, name, client_id) VALUES ('support',?,?)",
        [u ? u.name : 'Client', req.user.id]
      )
      const insertId = r.insertId;
      [[room]] = await pool.execute('SELECT * FROM chat_rooms WHERE id=?', [insertId])
    }
    const [[u]] = await pool.execute('SELECT name FROM users WHERE id=?', [req.user.id])
    const [r] = await pool.execute(
      'INSERT INTO chat_messages (room_id, sender_id, sender_name, body) VALUES (?,?,?,?)',
      [room.id, req.user.id, u ? u.name : 'Client', body.trim()]
    )
    const [[msg]] = await pool.execute('SELECT * FROM chat_messages WHERE id=?', [r.insertId])
    res.json(msg)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* GET /chat/support/poll?since= */
app.get('/chat/support/poll', auth, async (req, res) => {
  try {
    const [[room]] = await pool.execute(
      "SELECT id FROM chat_rooms WHERE type='support' AND client_id=? LIMIT 1", [req.user.id]
    )
    if (!room) return res.json([])
    const { since } = req.query
    let query = 'SELECT * FROM chat_messages WHERE room_id=?'
    const params = [room.id]
    if (since) { query += ' AND created_at > ?'; params.push(since) }
    query += ' ORDER BY created_at ASC LIMIT 50'
    const [rows] = await pool.execute(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── GET /livreur/orders ─────────────────────────────── */
app.get('/livreur/orders', livreurAuth, async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.*, u.name as user_name, u.phone as user_phone
       FROM orders o JOIN users u ON u.id = o.user_id
       WHERE o.status = 'Confirmé'
          OR (o.status IN ('En livraison','Livré') AND o.livreur_id = ?)
       ORDER BY o.created_at DESC`,
      [req.user.id]
    )
    const result = await Promise.all(orders.map(async (o) => {
      const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id=?', [o.id])
      return { ...o, items, date: new Date(o.created_at).toLocaleDateString('fr-FR') }
    }))
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── PUT /livreur/orders/:id/status ─────────────────── */
app.put('/livreur/orders/:id/status', livreurAuth, async (req, res) => {
  const { status, departure_time } = req.body
  if (!['En livraison', 'Livré'].includes(status))
    return res.status(400).json({ error: 'Statut invalide' })
  try {
    if (status === 'En livraison') {
      const [r] = await pool.execute(
        `UPDATE orders SET status='En livraison', livreur_id=? WHERE id=? AND status='Confirmé'`,
        [req.user.id, req.params.id]
      )
      if (r.affectedRows === 0)
        return res.status(409).json({ error: 'Commande déjà prise en charge par un autre livreur' })
      // Auto-message to client
      try {
        const [[order]] = await pool.execute('SELECT user_id FROM orders WHERE id=?', [req.params.id])
        const [[lvrr]] = await pool.execute('SELECT name, phone FROM users WHERE id=?', [req.user.id])
        if (order && lvrr) {
          let [[room]] = await pool.execute("SELECT id FROM chat_rooms WHERE type='support' AND client_id=? LIMIT 1", [order.user_id])
          if (!room) {
            const [[u]] = await pool.execute('SELECT name FROM users WHERE id=?', [order.user_id])
            const [r2] = await pool.execute("INSERT INTO chat_rooms (type, name, client_id) VALUES ('support',?,?)", [u?.name || 'Client', order.user_id])
            room = { id: r2.insertId }
          }
          const timeStr = departure_time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          const msgBody = `🛵 Votre commande est prise en charge !\n👤 Livreur : ${lvrr.name}\n📞 Téléphone : ${lvrr.phone}\n🕐 Départ vers chez vous : ${timeStr}`
          await pool.execute('INSERT INTO chat_messages (room_id, sender_id, sender_name, body) VALUES (?,?,?,?)', [room.id, req.user.id, lvrr.name, msgBody])
        }
      } catch {}
    } else {
      const [r] = await pool.execute(
        `UPDATE orders SET status='Livré' WHERE id=? AND livreur_id=? AND status='En livraison'`,
        [req.params.id, req.user.id]
      )
      if (r.affectedRows === 0)
        return res.status(403).json({ error: 'Action non autorisée' })
    }
    res.json({ ok: true, status })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── GET /livreur/chat/rooms ─────────────────────────── */
app.get('/livreur/chat/rooms', livreurAuth, async (req, res) => {
  try {
    const [[group]] = await pool.execute("SELECT id, type, name FROM chat_rooms WHERE type='livreur_group' LIMIT 1")
    const [clients] = await pool.execute(`
      SELECT cr.id, cr.type, cr.name, cr.client_id, u.name AS client_name,
             o.id AS order_id, o.status AS order_status,
             (SELECT body FROM chat_messages WHERE room_id=cr.id ORDER BY created_at DESC LIMIT 1) AS last_msg,
             (SELECT created_at FROM chat_messages WHERE room_id=cr.id ORDER BY created_at DESC LIMIT 1) AS last_at
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN chat_rooms cr ON cr.type='support' AND cr.client_id = o.user_id
      WHERE o.livreur_id = ? AND o.status IN ('En livraison','Livré')
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, [req.user.id])
    res.json({ group: group || null, clients })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── GET /livreur/chat/rooms/:id/messages ────────────── */
app.get('/livreur/chat/rooms/:id/messages', livreurAuth, async (req, res) => {
  try {
    const roomId = Number(req.params.id)
    const { since, limit = 60 } = req.query
    const [[room]] = await pool.execute('SELECT * FROM chat_rooms WHERE id=?', [roomId])
    if (!room) return res.status(404).json({ error: 'Salon introuvable' })
    if (room.type === 'livreur_group') {
      // all livreurs OK
    } else if (room.type === 'support') {
      const [[order]] = await pool.execute('SELECT id FROM orders WHERE user_id=? AND livreur_id=? LIMIT 1', [room.client_id, req.user.id])
      if (!order) return res.status(403).json({ error: 'Accès refusé' })
    } else { return res.status(403).json({ error: 'Accès refusé' }) }
    let query = 'SELECT * FROM chat_messages WHERE room_id=?'
    const params = [roomId]
    if (since) { query += ' AND created_at > ?'; params.push(since) }
    query += ' ORDER BY created_at ASC LIMIT ?'
    params.push(Number(limit))
    const [rows] = await pool.execute(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── POST /livreur/chat/rooms/:id/messages ───────────── */
app.post('/livreur/chat/rooms/:id/messages', livreurAuth, async (req, res) => {
  const { body } = req.body
  if (!body?.trim()) return res.status(400).json({ error: 'Message vide' })
  try {
    const roomId = Number(req.params.id)
    const [[room]] = await pool.execute('SELECT * FROM chat_rooms WHERE id=?', [roomId])
    if (!room) return res.status(404).json({ error: 'Salon introuvable' })
    if (room.type === 'livreur_group') {
      // OK
    } else if (room.type === 'support') {
      const [[order]] = await pool.execute('SELECT id FROM orders WHERE user_id=? AND livreur_id=? LIMIT 1', [room.client_id, req.user.id])
      if (!order) return res.status(403).json({ error: 'Accès refusé' })
    } else { return res.status(403).json({ error: 'Accès refusé' }) }
    const [r] = await pool.execute('INSERT INTO chat_messages (room_id, sender_id, sender_name, body) VALUES (?,?,?,?)', [roomId, req.user.id, req.user.name, body.trim()])
    const [[msg]] = await pool.execute('SELECT * FROM chat_messages WHERE id=?', [r.insertId])
    res.json(msg)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── GET /livreur/chat/client/:orderId ───────────────── */
/* Crée ou récupère le salon support du client d'une commande livreur */
app.get('/livreur/chat/client/:orderId', livreurAuth, async (req, res) => {
  try {
    const [[order]] = await pool.execute('SELECT user_id FROM orders WHERE id=? AND livreur_id=?', [req.params.orderId, req.user.id])
    if (!order) return res.status(403).json({ error: 'Accès refusé' })
    let [[room]] = await pool.execute("SELECT * FROM chat_rooms WHERE type='support' AND client_id=? LIMIT 1", [order.user_id])
    if (!room) {
      const [[u]] = await pool.execute('SELECT name FROM users WHERE id=?', [order.user_id])
      const [r] = await pool.execute("INSERT INTO chat_rooms (type, name, client_id) VALUES ('support',?,?)", [u?.name || 'Client', order.user_id])
      const [[nr]] = await pool.execute('SELECT * FROM chat_rooms WHERE id=?', [r.insertId])
      room = nr
    }
    res.json({ room_id: room.id })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ═══════════════════════════════════════════════════════════
   FICHIERS STATIQUES — mode app unique (o2switch)
   Sur Docker, nginx s'en charge ; ces handlers ne sont jamais atteints.
   ═══════════════════════════════════════════════════════════ */

/* Images uploadées (servies depuis UPLOAD_DIR) */
app.use('/images/uploads', express.static(UPLOAD_DIR))

/* Frontend React — activé seulement si FRONTEND_DIST est défini */
if (process.env.FRONTEND_DIST) {
  const dist = process.env.FRONTEND_DIST
  app.use(express.static(dist))
  /* Fallback SPA : toute route inconnue → index.html (sauf API) */
  app.get('*', (req, res) => {
    if (req.isApi) return res.status(404).json({ error: 'Route introuvable' })
    res.sendFile(path.join(dist, 'index.html'))
  })
  console.log('Frontend servi depuis', dist)
}

const PORT = process.env.API_PORT || process.env.PORT || 4000
app.listen(PORT, () => console.log('VRG API on port ' + PORT))
