const express = require('express')
const mysql   = require('mysql2/promise')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const cors    = require('cors')
const multer  = require('multer')
const path    = require('path')
const crypto  = require('crypto')
const fs      = require('fs')

const app = express()
app.use(express.json())
app.use(cors())

/* ── Multer : upload images ──────────────────────────────── */
const UPLOAD_DIR = '/app/uploads'
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
  database:         process.env.DB_NAME     || 'vrg',
  user:             process.env.DB_USER     || 'vrg_user',
  password:         process.env.DB_PASSWORD || 'vrg_pass',
  waitForConnections: true,
  connectionLimit:  10,
})

const SECRET = process.env.JWT_SECRET || 'change_this_in_production'

/* ── Création table admin_logs si absente ────────────────── */
pool.execute(`
  CREATE TABLE IF NOT EXISTS admin_logs (
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
  )
`).catch(() => {})

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

/* ── POST /auth/register ─────────────────────────────── */
app.post('/auth/register', async (req, res) => {
  const { name, phone, password, referralCode } = req.body
  if (!name || !phone || !password)
    return res.status(400).json({ error: 'Remplis tous les champs' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
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
      `SELECT u.name, u.created_at FROM referrals r
       JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = ? ORDER BY r.created_at DESC`,
      [req.user.id]
    )
    res.json({ code, count: referrals.length, points: referrals.length * 10,
      referrals: referrals.map(r => ({ name: r.name, date: new Date(r.created_at).toLocaleDateString('fr-FR') })) })
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
      'SELECT id, name, description, price, category, stock, images FROM products WHERE active=1 ORDER BY category, id'
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
    const [[prev]] = await pool.execute('SELECT name, category FROM products WHERE id=?', [req.params.id])
    await pool.execute(
      `UPDATE products SET name=COALESCE(?,name), description=COALESCE(?,description),
       price=COALESCE(?,price), category=COALESCE(?,category), stock=COALESCE(?,stock),
       images=COALESCE(?,images), active=COALESCE(?,active) WHERE id=?`,
      [name||null, description||null, price??null, category||null, stock??null,
       images ? JSON.stringify(images) : null, active??null, req.params.id]
    )
    const [rows] = await pool.execute('SELECT * FROM products WHERE id = ?', [req.params.id])
    await writeLog(req.user.id, req.user.name, 'product_edit', 'product', req.params.id,
      name || (prev ? prev.name : '—'), prev ? prev.category : null, category || null)
    res.json(rows[0])
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
        COUNT(DISTINCT r.referred_id) as referral_count
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
  const { name, phone, password, role } = req.body
  if (!name || !phone || !password) return res.status(400).json({ error: 'Remplis tous les champs' })
  if (!['admin', 'moderator'].includes(role)) return res.status(400).json({ error: 'Rôle invalide' })
  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE phone = ?', [phone.trim()])
    if (existing.length) return res.status(409).json({ error: 'Ce numéro est déjà utilisé' })
    const hash = await bcrypt.hash(password, 10)
    const code = makeReferralCode()
    await pool.execute(
      'INSERT INTO users (name, phone, password, role, referral_code) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), phone.trim(), hash, role, code]
    )
    res.status(201).json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── PUT /admin/users/:id ────────────────────────────── */
app.put('/admin/users/:id', adminAuth, async (req, res) => {
  const { role } = req.body
  const allowed = ['client', 'moderator', 'admin']
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Rôle invalide' })
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Seul un admin peut changer les rôles' })
  try {
    const [[target]] = await pool.execute('SELECT name, role FROM users WHERE id=?', [req.params.id])
    if (!target) return res.status(404).json({ error: 'Utilisateur introuvable' })
    await pool.execute('UPDATE users SET role=? WHERE id=?', [role, req.params.id])
    await writeLog(req.user.id, req.user.name, 'role_change', 'user', req.params.id, target.name, target.role, role)
    res.json({ ok: true })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
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

app.listen(4000, () => console.log('VRG API → port 4000'))
