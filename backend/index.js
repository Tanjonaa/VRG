const express = require('express')
const mysql   = require('mysql2/promise')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const cors    = require('cors')

const app = express()
app.use(express.json())
app.use(cors())

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

/* ── Auth middleware ─────────────────────────────────── */
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Non authentifié' })
  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Session expirée, reconnecte-toi' })
  }
}

/* ── POST /auth/register ─────────────────────────────── */
app.post('/auth/register', async (req, res) => {
  const { name, phone, password } = req.body
  if (!name || !phone || !password)
    return res.status(400).json({ error: 'Remplis tous les champs' })
  try {
    const hash = await bcrypt.hash(password, 10)
    const [r] = await pool.execute(
      'INSERT INTO users (name, phone, password) VALUES (?, ?, ?)',
      [name.trim(), phone.trim(), hash]
    )
    const user = { id: r.insertId, name: name.trim(), phone: phone.trim() }
    const token = jwt.sign(user, SECRET, { expiresIn: '30d' })
    res.json({ token, user })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ce numéro est déjà enregistré' })
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

/* ── POST /auth/login ────────────────────────────────── */
app.post('/auth/login', async (req, res) => {
  const { phone, password } = req.body
  if (!phone || !password)
    return res.status(400).json({ error: 'Remplis tous les champs' })
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE phone = ?', [phone.trim()])
    const u = rows[0]
    if (!u || !(await bcrypt.compare(password, u.password)))
      return res.status(401).json({ error: 'Numéro ou mot de passe incorrect' })
    const user = { id: u.id, name: u.name, phone: u.phone }
    const token = jwt.sign(user, SECRET, { expiresIn: '30d' })
    res.json({ token, user })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

/* ── GET /auth/me ────────────────────────────────────── */
app.get('/auth/me', auth, (req, res) => {
  res.json({ user: req.user })
})

/* ── PUT /auth/profile ───────────────────────────────── */
app.put('/auth/profile', auth, async (req, res) => {
  const { name, phone, currentPassword, newPassword } = req.body
  try {
    // Changement de mot de passe
    if (currentPassword && newPassword) {
      if (newPassword.length < 6)
        return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' })
      const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [req.user.id])
      const ok = await bcrypt.compare(currentPassword, rows[0].password)
      if (!ok) return res.status(401).json({ error: 'Mot de passe actuel incorrect' })
      const hash = await bcrypt.hash(newPassword, 10)
      await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id])
    }

    // Mise à jour nom / téléphone
    if (name || phone) {
      await pool.execute(
        'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?',
        [name?.trim() || null, phone?.trim() || null, req.user.id]
      )
    }

    const [rows] = await pool.execute('SELECT id, name, phone FROM users WHERE id = ?', [req.user.id])
    const user = rows[0]
    const token = require('jsonwebtoken').sign(user, SECRET, { expiresIn: '30d' })
    res.json({ user, token })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ce numéro est déjà utilisé' })
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

/* ── GET /orders ─────────────────────────────────────── */
app.get('/orders', auth, async (req, res) => {
  try {
    const [orders] = await pool.execute(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    )
    const result = await Promise.all(orders.map(async (o) => {
      const [items] = await pool.execute(
        'SELECT * FROM order_items WHERE order_id = ?', [o.id]
      )
      return {
        id:           o.id,
        payment:      o.payment,
        address:      o.address,
        zone:         o.zone,
        delivery_fee: o.delivery_fee,
        hours:        o.hours,
        note:         o.note,
        total:        o.total,
        status:       o.status,
        date:         new Date(o.created_at).toLocaleDateString('fr-FR'),
        items,
        transfer: o.transfer_phone
          ? { phone: o.transfer_phone, name: o.transfer_name, id: o.transfer_id }
          : null,
      }
    }))
    res.json(result)
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

/* ── POST /orders ────────────────────────────────────── */
app.post('/orders', auth, async (req, res) => {
  const { payment, address, zone, delivery_fee, hours, note, total, transfer, items } = req.body
  if (!payment || !address || !total)
    return res.status(400).json({ error: 'Données incomplètes' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const [r] = await conn.execute(
      `INSERT INTO orders (user_id, payment, address, zone, delivery_fee, hours, note, total,
        transfer_phone, transfer_name, transfer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, payment, address, zone || null, delivery_fee || 0, hours || null,
       note || '', total, transfer?.phone || null, transfer?.name || null, transfer?.id || null]
    )
    const orderId = r.insertId

    if (items?.length) {
      for (const item of items) {
        await conn.execute(
          'INSERT INTO order_items (order_id, name, qty, price) VALUES (?, ?, ?, ?)',
          [orderId, item.name, item.qty, item.price]
        )
      }
    }

    await conn.commit()
    res.json({
      id: orderId, payment, address, zone: zone || null,
      delivery_fee: delivery_fee || 0, hours: hours || null,
      note: note || '', total, status: 'En attente',
      date: new Date().toLocaleDateString('fr-FR'),
      items: items || [], transfer: transfer || null,
    })
  } catch {
    await conn.rollback()
    res.status(500).json({ error: 'Erreur lors de la commande, réessaie' })
  } finally {
    conn.release()
  }
})

app.listen(4000, () => console.log('VRG API → port 4000'))
