require('dotenv').config()

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
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')

const app = express()
/* Derrière Apache/Passenger (o2switch) ou nginx (Docker) : fait confiance au
   premier proxy pour X-Forwarded-For, sinon express-rate-limit compte tous
   les clients comme une seule IP (voire lève ERR_ERL_UNEXPECTED_X_FORWARDED_FOR) */
app.set('trust proxy', 1)
app.use(express.json({ limit: '256kb' }))   // borne la taille des corps JSON (anti-DoS)
/* CORS restreint : en prod le front est servi par la même app (same-origin),
   CORS ne sert qu'au dev local. Origines connues uniquement + surcharge par env. */
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ||
  'https://varygasy.net,https://www.varygasy.net,http://localhost:5173,http://localhost:3000,http://localhost:8001'
).split(',').map(s => s.trim())
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || ALLOWED_ORIGINS.includes(origin)),
}))
/* En-têtes de sécurité (défense en profondeur, sans dépendance externe) */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')          // anti-clickjacking
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

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

/* Factures PDF — hors du dossier public (jamais servies en statique) :
   accès uniquement via routes authentifiées (données personnelles) */
const INVOICE_DIR = process.env.INVOICE_DIR || path.join(UPLOAD_DIR, '..', 'invoices')
if (!fs.existsSync(INVOICE_DIR)) fs.mkdirSync(INVOICE_DIR, { recursive: true })

/* Extension dérivée du mimetype (jamais du nom fourni par le client) :
   empêche un .html/.svg piégé d'être stocké puis servi en text/html (XSS stocké). */
const MIME_EXT = {
  'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
  'image/webp': '.webp', 'image/avif': '.avif', 'image/gif': '.gif',
}
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const ext    = MIME_EXT[file.mimetype] || '.bin'
    const unique = crypto.randomBytes(8).toString('hex')
    cb(null, `${Date.now()}-${unique}${ext}`)
  },
})
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, !!MIME_EXT[file.mimetype]),
})

/* Identifiants BDD : uniquement via variables d'environnement (.env, Docker ou cPanel) */
if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('❌ DB_NAME, DB_USER et DB_PASSWORD doivent être définis (variables d\'environnement)')
  process.exit(1)
}

const pool = mysql.createPool({
  host:             process.env.DB_HOST || 'localhost',
  port:             process.env.DB_PORT || 3306,
  database:         process.env.DB_NAME,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit:  10,
  charset:          'utf8mb4',   /* emojis (4 octets) dans les messages, noms, etc. */
})

/* JWT_SECRET obligatoire : sans lui, tout token serait forgeable (usurpation
   admin). On refuse de démarrer plutôt que d'utiliser une valeur par défaut. */
const SECRET = process.env.JWT_SECRET
if (!SECRET || SECRET === 'change_this_in_production' || SECRET.length < 16) {
  console.error('❌ JWT_SECRET manquant ou trop faible (min. 16 caractères aléatoires)')
  process.exit(1)
}

/* ── Initialisation DB (retry — MariaDB peut démarrer après l'API) ── */
;(async () => {
  for (let i = 0; i < 15; i++) {
    try { await pool.execute('SELECT 1'); break }
    catch (e) { if (i === 14) { console.error('DB unreachable:', e.code || '', e.message); process.exit(1) }
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
  await pool.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen DATETIME NULL`)
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
  await pool.execute(`CREATE TABLE IF NOT EXISTS visit_uniques (
    date    DATE     NOT NULL,
    ip_hash CHAR(16) NOT NULL,
    PRIMARY KEY (date, ip_hash)
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
  await pool.execute(`CREATE TABLE IF NOT EXISTS chat_reads (
    room_id      INT NOT NULL,
    user_id      INT NOT NULL,
    last_read_id INT NOT NULL DEFAULT 0,
    PRIMARY KEY (room_id, user_id)
  )`)

  /* Emojis : convertit les tables à texte libre en utf8mb4 (4 octets).
     Idempotent — sans effet si déjà en utf8mb4. Isolé pour qu'un échec
     (index trop long, table absente) ne bloque pas le démarrage. */
  for (const t of ['chat_messages', 'users', 'products', 'settings']) {
    await pool.execute(`ALTER TABLE ${t} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
      .catch(e => console.warn(`utf8mb4 ${t}:`, e.code || e.message))
  }
  await pool.execute(`CREATE TABLE IF NOT EXISTS invoices (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    number       VARCHAR(30)  NOT NULL UNIQUE,        -- ex: FA2026-00042
    order_id     INT          NOT NULL UNIQUE,        -- 1 facture par commande
    user_id      INT          NOT NULL,
    user_name    VARCHAR(100) NOT NULL,               -- snapshot au moment de la facture
    user_phone   VARCHAR(20),
    subtotal     INT          NOT NULL DEFAULT 0,     -- somme des articles (Ar)
    delivery_fee INT          NOT NULL DEFAULT 0,
    tva_percent  INT          NOT NULL DEFAULT 0,
    total        INT          NOT NULL,               -- TTC (Ar)
    pdf_path     VARCHAR(255),                        -- fichier dans INVOICE_DIR
    created_at   DATETIME     DEFAULT NOW(),
    INDEX idx_invoices_date (created_at)
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
    /* Mentions légales des factures — à remplir par l'admin dans Réglages */
    ['company_legal_name','VaRyGasy'],
    ['company_nif',''],['company_stat',''],
    ['company_address','Antananarivo, Madagascar'],
    ['company_phone',''],['company_email',''],
    ['invoice_tva_percent','0'],
    ['invoice_footer','Merci de votre confiance. VaRyGasy — accessoires mobile & gaming à Madagascar.'],
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

/* ═══════════════════════════════════════════════════════════
   FACTURES — génération PDF (pdf-lib, pur JS) + stockage
   ═══════════════════════════════════════════════════════════ */

/* WinAnsi (StandardFonts) ne couvre pas tout l'Unicode : on nettoie les
   caractères hors Latin-1 pour éviter une erreur d'encodage à la génération. */
const winAnsi = s => String(s ?? '').replace(/[^\x20-\xFF]/g, '')
const arFmt   = n => Number(n || 0).toLocaleString('fr-FR') + ' Ar'

async function loadSettings() {
  const [rows] = await pool.execute('SELECT `key`, `value` FROM settings')
  const o = {}; rows.forEach(r => { o[r.key] = r.value }); return o
}

/* Construit le PDF d'une facture et retourne un Buffer. */
async function buildInvoicePDF({ number, date, company, client, items, subtotal, deliveryFee, tvaPercent, total }) {
  const doc  = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4 en points
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const W = 595, M = 50
  const gold = rgb(0.8, 0.55, 0.02), dark = rgb(0.1, 0.1, 0.13), grey = rgb(0.45, 0.45, 0.5)
  let y = 792
  const text = (t, x, yy, { size = 10, f = font, color = dark } = {}) =>
    page.drawText(winAnsi(t), { x, y: yy, size, font: f, color })
  const right = (t, xR, yy, opt = {}) => {
    const s = winAnsi(t), w = (opt.f || font).widthOfTextAtSize(s, opt.size || 10)
    text(s, xR - w, yy, opt)
  }

  /* En-tête entreprise */
  text(company.legal_name || 'VaRyGasy', M, y, { size: 20, f: bold, color: gold }); y -= 18
  const infoLines = [company.address, company.phone && 'Tél : ' + company.phone,
    company.email, company.nif && 'NIF : ' + company.nif, company.stat && 'STAT : ' + company.stat].filter(Boolean)
  for (const l of infoLines) { text(l, M, y, { size: 9, color: grey }); y -= 12 }

  /* Bloc FACTURE (droite) */
  right('FACTURE', W - M, 792, { size: 22, f: bold, color: dark })
  right('N° ' + number, W - M, 768, { size: 11, f: bold })
  right('Date : ' + date, W - M, 752, { size: 10, color: grey })

  /* Bloc client */
  y = Math.min(y, 720) - 10
  page.drawRectangle({ x: M, y: y - 54, width: W - 2 * M, height: 58, color: rgb(0.96, 0.96, 0.97) })
  text('FACTURÉ À', M + 14, y - 14, { size: 8, f: bold, color: grey })
  text(client.name, M + 14, y - 30, { size: 12, f: bold })
  if (client.phone)   text('Tél : ' + client.phone, M + 14, y - 44, { size: 9, color: grey })
  if (client.address) right(client.address.slice(0, 60), W - M - 14, y - 44, { size: 9, color: grey })
  y -= 84

  /* En-tête tableau */
  const cQty = 330, cPrice = 410, cTot = W - M
  page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 24, color: dark })
  text('DÉSIGNATION', M + 10, y, { size: 9, f: bold, color: rgb(1, 1, 1) })
  right('QTÉ', cQty, y, { size: 9, f: bold, color: rgb(1, 1, 1) })
  right('P.U.', cPrice, y, { size: 9, f: bold, color: rgb(1, 1, 1) })
  right('MONTANT', cTot, y, { size: 9, f: bold, color: rgb(1, 1, 1) })
  y -= 26

  /* Lignes articles */
  for (const it of items) {
    text((it.name || '').slice(0, 42), M + 10, y, { size: 10 })
    right(String(it.qty), cQty, y)
    right(arFmt(it.price), cPrice, y)
    right(arFmt(it.qty * it.price), cTot, y)
    y -= 8
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: rgb(0.88, 0.88, 0.9) })
    y -= 14
  }

  /* Totaux */
  y -= 8
  const totLabelX = cPrice
  const line = (label, val, opt = {}) => {
    right(label, totLabelX, y, { size: opt.big ? 12 : 10, f: opt.big ? bold : font, color: opt.big ? dark : grey })
    right(val, cTot, y, { size: opt.big ? 13 : 10, f: opt.big ? bold : font, color: opt.big ? gold : dark })
    y -= opt.big ? 22 : 16
  }
  line('Sous-total', arFmt(subtotal))
  if (deliveryFee > 0) line('Livraison', arFmt(deliveryFee))
  if (tvaPercent > 0)  line(`TVA ${tvaPercent}%`, arFmt(Math.round((subtotal + deliveryFee) * tvaPercent / 100)))
  page.drawLine({ start: { x: totLabelX - 40, y: y + 6 }, end: { x: cTot, y: y + 6 }, thickness: 1, color: dark })
  y -= 6
  line('TOTAL', arFmt(total), { big: true })

  /* Pied de page */
  text(company.footer || '', M, 60, { size: 9, color: grey })
  text('Document généré automatiquement — VaRyGasy', M, 46, { size: 8, color: rgb(0.7, 0.7, 0.75) })

  const bytes = await doc.save()
  return Buffer.from(bytes)
}

/* Crée la facture d'une commande LIVRÉE (idempotent : ne double jamais).
   Retourne le numéro, ou null si échec silencieux (ne bloque pas la livraison). */
async function createInvoiceForOrder(orderId) {
  try {
    const [[existing]] = await pool.execute('SELECT number FROM invoices WHERE order_id=?', [orderId])
    if (existing) return existing.number

    const [[order]] = await pool.execute(
      `SELECT o.*, u.name AS user_name, u.phone AS user_phone
       FROM orders o JOIN users u ON u.id = o.user_id WHERE o.id=?`, [orderId]
    )
    if (!order) return null
    const [items] = await pool.execute('SELECT name, qty, price FROM order_items WHERE order_id=?', [orderId])
    const s = await loadSettings()

    const deliveryFee = Number(order.delivery_fee) || 0
    const subtotal    = items.reduce((a, it) => a + it.qty * it.price, 0)
    const tvaPercent  = Number(s.invoice_tva_percent) || 0
    const total       = Number(order.total)

    /* Insert d'abord (id atomique) → numéro dérivé → génère le PDF → update */
    const [ins] = await pool.execute(
      `INSERT INTO invoices (number, order_id, user_id, user_name, user_phone,
        subtotal, delivery_fee, tva_percent, total)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      ['TMP-' + orderId, orderId, order.user_id, order.user_name, order.user_phone,
       subtotal, deliveryFee, tvaPercent, total]
    )
    const number = `FA${new Date().getFullYear()}-${String(ins.insertId).padStart(5, '0')}`

    const pdf = await buildInvoicePDF({
      number,
      date: new Date(order.created_at).toLocaleDateString('fr-FR'),
      company: {
        legal_name: s.company_legal_name, address: s.company_address, phone: s.company_phone,
        email: s.company_email, nif: s.company_nif, stat: s.company_stat, footer: s.invoice_footer,
      },
      client: { name: order.user_name, phone: order.user_phone, address: order.address },
      items, subtotal, deliveryFee, tvaPercent, total,
    })
    const fileName = number + '.pdf'
    fs.writeFileSync(path.join(INVOICE_DIR, fileName), pdf)
    await pool.execute('UPDATE invoices SET number=?, pdf_path=? WHERE id=?', [number, fileName, ins.insertId])

    /* Notifie le client dans son salon support avec le lien de téléchargement */
    try {
      let [[room]] = await pool.execute("SELECT id FROM chat_rooms WHERE type='support' AND client_id=? LIMIT 1", [order.user_id])
      if (!room) {
        const [r] = await pool.execute("INSERT INTO chat_rooms (type, name, client_id) VALUES ('support',?,?)", [order.user_name, order.user_id])
        room = { id: r.insertId }
      }
      const msg = `🧾 Votre facture ${number} est disponible !\nCommande livrée · Total : ${arFmt(total)}\nTéléchargez-la depuis "Mes commandes" dans votre compte.`
      await pool.execute('INSERT INTO chat_messages (room_id, sender_id, sender_name, body) VALUES (?,?,?,?)',
        [room.id, order.user_id, 'VaRyGasy', msg])
    } catch {}

    return number
  } catch (e) { console.error('Facture:', e.message); return null }
}

/* ── Numéros malgaches : normalisation + validation ──────────
   Accepte « 034 12 345 67 », « +261 34 12 345 67 », « 00261341234567 »…
   Retourne toujours la forme locale 10 chiffres (0341234567), ou null.
   Préfixes attribués : 032 Orange · 033 Airtel · 034/037/038 Telma-Yas */
function normalizePhone(raw) {
  if (!raw) return null
  let p = String(raw).replace(/[\s.\-()]/g, '')
  if (p.startsWith('+261'))                       p = '0' + p.slice(4)
  else if (p.startsWith('00261'))                 p = '0' + p.slice(5)
  else if (p.startsWith('261') && p.length === 12) p = '0' + p.slice(3)
  return /^0(32|33|34|37|38)\d{7}$/.test(p) ? p : null
}
const PHONE_ERROR = 'Numéro malgache attendu : 03X XX XXX XX (032, 033, 034, 037 ou 038)'

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
  const phone = normalizePhone(req.query.phone)
  if (!phone) return res.json({ available: false, invalid: true })
  try {
    const [rows] = await pool.execute('SELECT id FROM users WHERE phone = ?', [phone])
    res.json({ available: rows.length === 0 })
  } catch { res.status(500).json({ error: 'Erreur serveur' }) }
})

/* ── POST /auth/register ─────────────────────────────── */
app.post('/auth/register', async (req, res) => {
  const { name, password, referralCode } = req.body
  const phone = normalizePhone(req.body.phone)
  if (!name || !req.body.phone || !password)
    return res.status(400).json({ error: 'Remplis tous les champs' })
  if (!phone)
    return res.status(400).json({ error: PHONE_ERROR })
  if (String(password).length < 8)
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' })

  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    /* Vérifie d'abord que le numéro est disponible */
    const [existing] = await conn.execute('SELECT id FROM users WHERE phone = ?', [phone])
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
      [name.trim(), phone, hash, code, referrerId]
    )
    if (referrerId) {
      await conn.execute('INSERT INTO referrals (referrer_id, referred_id) VALUES (?, ?)', [referrerId, r.insertId])
    }
    await conn.commit()

    const user = { id: r.insertId, name: name.trim(), phone, role: 'client' }
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
    /* Normalise si possible, sinon garde la saisie brute — ne jamais
       verrouiller un compte historique au format non standard */
    const lookup = normalizePhone(phone) || phone.trim()
    const [rows] = await pool.execute('SELECT * FROM users WHERE phone = ?', [lookup])
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
      let newPhone = null
      if (phone) {
        newPhone = normalizePhone(phone)
        if (!newPhone) return res.status(400).json({ error: PHONE_ERROR })
      }
      await pool.execute(
        'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?',
        [name?.trim() || null, newPhone, req.user.id]
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
       note || '', total,
       /* numéro mobile money : normalisé si valide, brut sinon — on ne bloque
          jamais une commande dont le paiement est déjà parti */
       transfer?.phone ? (normalizePhone(transfer.phone) || transfer.phone) : null,
       transfer?.name || null, transfer?.id || null]
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
    /* Les robots connus ne comptent pas (Googlebot exécute le JS du site) */
    const ua = req.headers['user-agent'] || ''
    if (/bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget/i.test(ua))
      return res.json({ ok: true })

    /* Sessions : compteur brut (CURDATE() = même horloge que les stats) */
    await pool.execute(
      'INSERT INTO visits (date, count) VALUES (CURDATE(), 1) ON DUPLICATE KEY UPDATE count = count + 1'
    )
    /* Visiteurs uniques : empreinte IP+navigateur hachée, dédupliquée par jour
       côté serveur — insensible aux onglets multiples et aux rafales.
       IP+UA (et pas IP seule) : les IP mobiles malgaches sont partagées (CGNAT),
       l'User-Agent distingue partiellement les appareils derrière. */
    const hash = crypto.createHash('sha256').update(req.ip + '|' + ua).digest('hex').slice(0, 16)
    await pool.execute('INSERT IGNORE INTO visit_uniques (date, ip_hash) VALUES (CURDATE(), ?)', [hash])
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
    /* Présence : ce endpoint est pollé toutes les 5 s par chaque staff connecté */
    pool.execute('UPDATE users SET last_seen=NOW() WHERE id=?', [req.user.id]).catch(() => {})
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
    /* server_now : horloge du serveur, à renvoyer telle quelle dans ?since=.
       Le client ne doit JAMAIS fabriquer ce timestamp lui-même : son horloge
       UTC comparée au created_at local de MySQL décale de 2h et fait revenir
       les notifications déjà lues. */
    const [[{ server_now }]] = await pool.execute(
      "SELECT DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') AS server_now"
    )
    res.json({ pending_orders, unread_msgs, server_now })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── GET /admin/online ───────────────────────────────── */
/* Staff vu dans les 2 dernières minutes ; ago (s) permet au front
   d'afficher vert < 60s puis rouge 60-120s avant disparition */
app.get('/admin/online', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, name, role, TIMESTAMPDIFF(SECOND, last_seen, NOW()) AS ago FROM users WHERE role IN ('admin','moderator') AND last_seen > NOW() - INTERVAL 2 MINUTE ORDER BY name"
    )
    res.json(rows)
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
    const [[{ today_uniques }]] = await pool.execute("SELECT COUNT(*) as today_uniques FROM visit_uniques WHERE date=CURDATE()")
    const [[{ month_uniques }]] = await pool.execute("SELECT COUNT(*) as month_uniques FROM visit_uniques WHERE MONTH(date)=MONTH(NOW()) AND YEAR(date)=YEAR(NOW())")
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
      visits:  { today: today_visits, month: month_visits, today_uniques, month_uniques },
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
    /* Passage à Livré (par l'admin) → génère la facture, une seule fois */
    if (status === 'Livré' && prev && prev.status !== 'Livré')
      createInvoiceForOrder(Number(req.params.id)).catch(() => {})
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

/* ═══════════════════════════════════════════════════════════
   FACTURES — routes
   ═══════════════════════════════════════════════════════════ */

/* Sert un fichier facture depuis INVOICE_DIR (protégé — jamais en statique) */
function sendInvoiceFile(res, inv) {
  if (!inv.pdf_path) return res.status(404).json({ error: 'Facture non disponible' })
  const file = path.join(INVOICE_DIR, path.basename(inv.pdf_path))
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Fichier introuvable' })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="${inv.number}.pdf"`)
  fs.createReadStream(file).pipe(res)
}

/* GET /invoices/order/:orderId — le client télécharge SA facture */
app.get('/invoices/order/:orderId', auth, async (req, res) => {
  try {
    const [[inv]] = await pool.execute('SELECT * FROM invoices WHERE order_id=?', [Number(req.params.orderId)])
    if (!inv) return res.status(404).json({ error: 'Aucune facture pour cette commande' })
    if (inv.user_id !== req.user.id && !['admin', 'moderator'].includes(req.user.role))
      return res.status(403).json({ error: 'Accès refusé' })
    sendInvoiceFile(res, inv)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* GET /admin/accounting — comptabilité (ADMIN strict, pas modérateur) */
app.get('/admin/accounting', adminAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Réservé aux administrateurs' })
  try {
    const [[tot]] = await pool.execute(
      'SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS revenue FROM invoices'
    )
    const [[month]] = await pool.execute(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS revenue FROM invoices
       WHERE MONTH(created_at)=MONTH(NOW()) AND YEAR(created_at)=YEAR(NOW())`
    )
    const [monthly] = await pool.execute(
      `SELECT MONTH(created_at) AS month, COALESCE(SUM(total),0) AS total, COUNT(*) AS count
       FROM invoices WHERE YEAR(created_at)=YEAR(NOW())
       GROUP BY MONTH(created_at) ORDER BY month`
    )
    const [rows] = await pool.execute(
      `SELECT id, number, order_id, user_name, user_phone, subtotal, delivery_fee, tva_percent, total, created_at
       FROM invoices ORDER BY id DESC LIMIT 500`
    )
    const avg = tot.count > 0 ? Math.round(tot.revenue / tot.count) : 0
    res.json({
      totals: { count: tot.count, revenue: Number(tot.revenue), avg,
                month_count: month.count, month_revenue: Number(month.revenue) },
      monthly,
      invoices: rows.map(r => ({ ...r, date: new Date(r.created_at).toLocaleDateString('fr-FR') })),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* GET /admin/accounting/:id/pdf — télécharge une facture (ADMIN strict) */
app.get('/admin/accounting/:id/pdf', adminAuth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Réservé aux administrateurs' })
  try {
    const [[inv]] = await pool.execute('SELECT * FROM invoices WHERE id=?', [Number(req.params.id)])
    if (!inv) return res.status(404).json({ error: 'Facture introuvable' })
    sendInvoiceFile(res, inv)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ── GET /admin/users ────────────────────────────────── */
app.get('/admin/users', adminAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.name, u.phone, u.role, u.referral_code, u.created_at,
        COUNT(DISTINCT o.id)      as order_count,
        COALESCE(SUM(o.total), 0) as total_spent,
        COALESCE(SUM(CASE WHEN o.status='Livré' THEN o.total ELSE 0 END), 0) as delivered_total,
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
  const { name, password, role } = req.body
  const phone = normalizePhone(req.body.phone)
  if (!name || !req.body.phone || !password) return res.status(400).json({ error: 'Remplis tous les champs' })
  if (!phone) return res.status(400).json({ error: PHONE_ERROR })
  if (String(password).length < 8) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' })
  if (!['admin', 'moderator', 'livreur'].includes(role)) return res.status(400).json({ error: 'Rôle invalide' })
  try {
    const [existing] = await pool.execute('SELECT id FROM users WHERE phone = ?', [phone])
    if (existing.length) return res.status(409).json({ error: 'Ce numéro est déjà utilisé' })
    const hash = await bcrypt.hash(password, 10)
    const code = makeReferralCode()
    const [r] = await pool.execute(
      'INSERT INTO users (name, phone, password, role, referral_code) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), phone, hash, role, code]
    )
    await writeLog(req.user.id, req.user.name, 'user_create', 'user', r.insertId, `${name.trim()} (${phone})`, null, role)
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
    const uid = req.user.id
    /* Messages plus récents que le marqueur de lecture, hors les siens */
    const unreadSub = `(SELECT COUNT(*) FROM chat_messages ms
        WHERE ms.room_id = cr.id AND ms.sender_id != ?
          AND ms.id > COALESCE((SELECT last_read_id FROM chat_reads rd
                                WHERE rd.room_id = cr.id AND rd.user_id = ?), 0)) AS unread`
    const [fixed] = await pool.execute(`
      SELECT cr.id, cr.type, cr.name, ${unreadSub}
      FROM chat_rooms cr
      WHERE cr.type IN (${isAdmin ? "'admin_only','admin_mod','livreur_group'" : "'admin_mod','livreur_group'"})
      ORDER BY cr.id
    `, [uid, uid])
    const [directs] = await pool.execute(`
      SELECT cr.id, cr.type, cr.name,
             u.id AS other_id, u.name AS other_name, u.role AS other_role, ${unreadSub}
      FROM chat_rooms cr
      JOIN chat_room_members m1 ON m1.room_id = cr.id AND m1.user_id = ?
      JOIN chat_room_members m2 ON m2.room_id = cr.id AND m2.user_id != ?
      JOIN users u ON u.id = m2.user_id
      WHERE cr.type = 'direct'
    `, [uid, uid, uid, uid])
    const [supports] = await pool.execute(`
      SELECT cr.id, cr.type, cr.name, cr.client_id,
             (SELECT body FROM chat_messages WHERE room_id=cr.id ORDER BY created_at DESC LIMIT 1) AS last_msg,
             (SELECT created_at FROM chat_messages WHERE room_id=cr.id ORDER BY created_at DESC LIMIT 1) AS last_at,
             (SELECT sender_name FROM chat_messages
              WHERE room_id=cr.id AND sender_id != cr.client_id
              ORDER BY id DESC LIMIT 1) AS last_staff,
             ${unreadSub}
      FROM chat_rooms cr WHERE cr.type='support' ORDER BY last_at DESC
    `, [uid, uid])
    res.json({ fixed, directs, supports })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* GET /admin/chat/rooms/:id/messages */
app.get('/admin/chat/rooms/:id/messages', adminAuth, async (req, res) => {
  try {
    const { since, after, limit = 60 } = req.query
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
    let initial = false
    if (after)      { query += ' AND id > ?'; params.push(Number(after)) }
    else if (since) { query += ' AND created_at > ?'; params.push(since) }
    else            { initial = true } /* chargement initial : les N plus récents */
    query += ` ORDER BY id ${initial ? 'DESC' : 'ASC'} LIMIT ?`
    params.push(Number(limit))
    const [rows] = await pool.execute(query, params)
    if (initial) rows.reverse()
    /* Consulter un salon = le lire : avance le marqueur de lecture */
    if (rows.length > 0) {
      pool.execute(
        `INSERT INTO chat_reads (room_id, user_id, last_read_id) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE last_read_id = GREATEST(last_read_id, VALUES(last_read_id))`,
        [roomId, req.user.id, rows[rows.length - 1].id]
      ).catch(() => {})
    }
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
    const { since, after } = req.query
    let query = 'SELECT * FROM chat_messages WHERE room_id=?'
    const params = [room.id]
    if (after)      { query += ' AND id > ?'; params.push(Number(after)) }
    else if (since) { query += ' AND created_at > ?'; params.push(since) }
    query += ' ORDER BY id ASC LIMIT 50'
    const [rows] = await pool.execute(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* ═══════════════════════════════════════════════════════════
   ACCUSÉS DE LECTURE — communs à tous les rôles
   chat_reads.last_read_id = plus grand id de message lu par user
   ═══════════════════════════════════════════════════════════ */

/* Un utilisateur peut-il accéder à ce salon ? (mêmes règles que les routes messages) */
async function canAccessRoom(user, room) {
  if (!room) return false
  if (user.role === 'admin' || user.role === 'moderator') {
    if (room.type === 'admin_only') return user.role === 'admin'
    if (room.type === 'direct') {
      const [[m]] = await pool.execute('SELECT 1 FROM chat_room_members WHERE room_id=? AND user_id=?', [room.id, user.id])
      return !!m
    }
    return true
  }
  if (user.role === 'livreur') {
    if (room.type === 'livreur_group') return true
    if (room.type === 'support') {
      const [[o]] = await pool.execute('SELECT id FROM orders WHERE user_id=? AND livreur_id=? LIMIT 1', [room.client_id, user.id])
      return !!o
    }
    return false
  }
  return room.type === 'support' && room.client_id === user.id
}

/* GET /chat/rooms/:id/read-status — plus grand message lu par les AUTRES participants */
app.get('/chat/rooms/:id/read-status', auth, async (req, res) => {
  try {
    const [[room]] = await pool.execute('SELECT * FROM chat_rooms WHERE id=?', [Number(req.params.id)])
    if (!(await canAccessRoom(req.user, room))) return res.status(403).json({ error: 'Accès refusé' })
    const [[r]] = await pool.execute(
      'SELECT COALESCE(MAX(last_read_id), 0) AS others_read FROM chat_reads WHERE room_id=? AND user_id != ?',
      [room.id, req.user.id]
    )
    res.json({ others_read: Number(r.others_read) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

/* POST /chat/rooms/:id/read — marque lu jusqu'à last_id
   (utilisé par le widget client, qui polle aussi panneau fermé :
    on ne peut pas avancer le marqueur au poll, seulement à l'affichage) */
app.post('/chat/rooms/:id/read', auth, async (req, res) => {
  const lastId = Number(req.body?.last_id)
  if (!lastId) return res.status(400).json({ error: 'last_id requis' })
  try {
    const [[room]] = await pool.execute('SELECT * FROM chat_rooms WHERE id=?', [Number(req.params.id)])
    if (!(await canAccessRoom(req.user, room))) return res.status(403).json({ error: 'Accès refusé' })
    await pool.execute(
      `INSERT INTO chat_reads (room_id, user_id, last_read_id) VALUES (?,?,?)
       ON DUPLICATE KEY UPDATE last_read_id = GREATEST(last_read_id, VALUES(last_read_id))`,
      [room.id, req.user.id, lastId]
    )
    res.json({ ok: true })
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
      /* Livraison confirmée → génère la facture (n'échoue jamais l'opération) */
      createInvoiceForOrder(Number(req.params.id)).catch(() => {})
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
    const { since, after, limit = 60 } = req.query
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
    if (after)      { query += ' AND id > ?'; params.push(Number(after)) }
    else if (since) { query += ' AND created_at > ?'; params.push(since) }
    query += ' ORDER BY id ASC LIMIT ?'
    params.push(Number(limit))
    const [rows] = await pool.execute(query, params)
    /* Consulter un salon = le lire (même logique que côté admin) */
    if (rows.length > 0) {
      pool.execute(
        `INSERT INTO chat_reads (room_id, user_id, last_read_id) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE last_read_id = GREATEST(last_read_id, VALUES(last_read_id))`,
        [roomId, req.user.id, rows[rows.length - 1].id]
      ).catch(() => {})
    }
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
app.use('/images/uploads', express.static(UPLOAD_DIR, {
  /* nosniff : le navigateur ne peut pas réinterpréter un upload comme du HTML/JS.
     Content-Disposition attachment : un fichier douteux est téléchargé, pas rendu. */
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "default-src 'none'")
  },
}))

/* Frontend React — activé seulement si FRONTEND_DIST est défini */
if (process.env.FRONTEND_DIST) {
  const dist = process.env.FRONTEND_DIST
  const SITE = 'https://varygasy.net'
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  /* /produit/:id — sert index.html avec les balises OG du produit injectées.
     Les robots WhatsApp/Facebook n'exécutent pas le JS : sans cette injection,
     tout lien produit partagé afficherait l'aperçu générique du site. */
  app.get(/^\/produit\/(\d+)$/, async (req, res) => {
    const fallback = () => res.sendFile(path.join(dist, 'index.html'))
    try {
      const [[p]] = await pool.execute(
        'SELECT id, name, description, price, images, category, stock, promo_percent, promo_active FROM products WHERE id=? AND active=1',
        [Number(req.params[0])]
      )
      if (!p) return fallback()
      let img = null
      try { img = (JSON.parse(p.images) || [])[0]?.src } catch {}
      const price  = p.promo_active ? Math.round(p.price * (1 - p.promo_percent / 100)) : p.price
      const title  = `${p.name} — ${Number(price).toLocaleString('fr-FR')} Ar | VaRyGasy`
      const desc   = (p.description || 'Accessoire gaming disponible chez VaRyGasy — livraison sur Antananarivo.').slice(0, 200)
      const imgUrl = img ? SITE + img : `${SITE}/images/gallery/hero-gaming.jpg`
      const url    = `${SITE}/produit/${p.id}`
      let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
      html = html
        .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
        .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
        .replace(/(<meta property="og:type" content=")[^"]*(")/, '$1product$2')
        .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
        .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${imgUrl}$2`)
        .replace(/<meta property="og:image:(width|height)" content="[^"]*"\s*\/>\s*/g, '')
        .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
        .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
        .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${imgUrl}$2`)
      /* Données structurées Product : extraits enrichis Google (prix + dispo) */
      const jsonLd = {
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: p.name,
        image: [imgUrl],
        description: desc,
        category: p.category || undefined,
        brand: { '@type': 'Brand', name: 'VaRyGasy' },
        offers: {
          '@type': 'Offer',
          url,
          priceCurrency: 'MGA',
          price: String(price),
          availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        },
      }
      html = html.replace(
        '</head>',
        `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script></head>`
      )
      res.send(html)
    } catch { fallback() }
  })

  /* Sitemap dynamique : pages fixes + tous les produits en ligne
     (prend le pas sur le fichier statique de dist/) */
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const [rows] = await pool.execute('SELECT id FROM products WHERE active=1 AND stock > 0 ORDER BY id')
      const urls = [
        `<url><loc>${SITE}/</loc><priority>1.0</priority></url>`,
        `<url><loc>${SITE}/catalogue</loc><priority>0.9</priority></url>`,
        ...rows.map(r => `<url><loc>${SITE}/produit/${r.id}</loc><priority>0.8</priority></url>`),
        `<url><loc>${SITE}/confidentialite</loc><priority>0.2</priority></url>`,
        `<url><loc>${SITE}/cgu</loc><priority>0.2</priority></url>`,
      ].join('')
      res.type('application/xml').send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
      )
    } catch { res.sendFile(path.join(dist, 'sitemap.xml')) }
  })

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
