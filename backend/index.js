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

function makeReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

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
  const { name, phone, password, referralCode } = req.body
  if (!name || !phone || !password)
    return res.status(400).json({ error: 'Remplis tous les champs' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    const hash = await bcrypt.hash(password, 10)
    const code = makeReferralCode()

    // Trouver le parrain si un code de parrainage est fourni
    let referrerId = null
    if (referralCode) {
      const [refs] = await conn.execute(
        'SELECT id FROM users WHERE referral_code = ?', [referralCode.toUpperCase()]
      )
      if (refs[0]) referrerId = refs[0].id
    }

    const [r] = await conn.execute(
      'INSERT INTO users (name, phone, password, referral_code, referred_by) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), phone.trim(), hash, code, referrerId]
    )
    const newUserId = r.insertId

    // Enregistrer le parrainage et créditer le parrain
    if (referrerId) {
      await conn.execute(
        'INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)',
        [referrerId, newUserId]
      )
    }

    await conn.commit()

    const user = { id: newUserId, name: name.trim(), phone: phone.trim() }
    const token = jwt.sign(user, SECRET, { expiresIn: '30d' })
    res.json({ token, user })
  } catch (err) {
    await conn.rollback()
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ error: 'Ce numéro est déjà enregistré' })
    res.status(500).json({ error: 'Erreur serveur' })
  } finally {
    conn.release()
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

    const [rows] = await pool.execute('SELECT id, name, phone FROM users WHERE id = ?', [req.user.id])
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
    // Récupérer ou générer le code de parrainage
    let [rows] = await pool.execute('SELECT referral_code FROM users WHERE id = ?', [req.user.id])
    let code = rows[0].referral_code
    if (!code) {
      code = makeReferralCode()
      await pool.execute('UPDATE users SET referral_code = ? WHERE id = ?', [code, req.user.id])
    }

    // Nombre de filleuls et leurs infos
    const [referrals] = await pool.execute(
      `SELECT u.name, u.created_at
       FROM referrals r
       JOIN users u ON u.id = r.referred_id
       WHERE r.referrer_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    )

    res.json({
      code,
      count: referrals.length,
      points: referrals.length * 10,
      referrals: referrals.map(r => ({
        name: r.name,
        date: new Date(r.created_at).toLocaleDateString('fr-FR'),
      })),
    })
  } catch {
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
