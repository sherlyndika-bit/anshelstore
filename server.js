/**
 * anshelstore - backend (Node.js murni, tanpa dependency eksternal)
 *
 * Fitur:
 *  - Static file dari public/  (+ route bersih /dashboard)
 *  - Katalog: store, services, games
 *  - Orders (top up) + ubah status
 *  - Chat AI + human takeover
 *  - Statistik dashboard
 *  - AUTH lengkap: register/login (email+password), OTP email, Google OAuth, sessions
 *
 * Env:
 *  PORT (default 8080)
 *  SMTP_HOST, SMTP_PORT(=465), SMTP_USER, SMTP_PASS, SMTP_FROM   -> untuk kirim OTP email
 *  GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET                        -> untuk Google login
 *  PUBLIC_URL (mis. https://www.anshelstore.biz.id)             -> opsional, untuk redirect Google
 */

const http = require("http");
const https = require("https");
const tls = require("tls");
const fs = require("fs");
const path = require("path");

try { fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach(l=>{const m=l.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);if(m)process.env[m[1]]=m[2].trim();}); } catch(e){}
const url = require("url");
const crypto = require("crypto");
const zlib = require("zlib");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
// DATA_DIR bisa diarahkan ke Railway Volume (mis. /data) agar data persisten lintas deploy.
const SEED_PATH = path.join(__dirname, "data", "db.json");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

const SMTP = {
  host: process.env.SMTP_HOST, port: process.env.SMTP_PORT || 465,
  user: process.env.SMTP_USER, pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
};
const SMTP_READY = !!(SMTP.host && SMTP.user && SMTP.pass);

function getGoogleConfig() {
  const integ = db.settings && db.settings.integrations ? db.settings.integrations : {};
  const id = integ.googleId || process.env.GOOGLE_CLIENT_ID;
  const secret = integ.googleSecret || process.env.GOOGLE_CLIENT_SECRET;
  const ready = integ.googleAuthEnabled !== false && !!(id && secret);
  return { id, secret, ready };
}

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------
let db = {};
const USE_PG = !!process.env.DATABASE_URL;
let pgPool = null;

function applyDefaults() {
  db.store ||= {}; db.services ||= []; db.games ||= []; db.settings ||= {}; db.articles ||= []; db.finances ||= []; db.comments ||= []; db.community ||= []; db.reviews ||= []; db.clients ||= []; db.notifications ||= []; db.vouchers ||= [];
  db.settings.integrations ||= {};
  if (typeof db.settings.newMemberDiscount === "undefined") db.settings.newMemberDiscount = 0; // Default new member discount (%)
  db.orders ||= []; db.conversations ||= []; db.messages ||= []; db.users ||= [];
  db._seq ||= {}; ["order", "conversation", "message", "user", "article", "finance", "comment", "review", "client", "notification", "voucher"].forEach((k) => (db._seq[k] ||= 0));
}
function readSeedOrFile() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      if (fs.existsSync(SEED_PATH) && SEED_PATH !== DB_PATH) fs.copyFileSync(SEED_PATH, DB_PATH);
    }
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch (e) { console.error("DB seed/file load:", e.message); return {}; }
}
async function loadDB() {
  if (USE_PG) {
    try {
      const { Pool } = require("pg");
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.PGSSL === "require" ? { rejectUnauthorized: false } : false,
      });
      await pgPool.query("CREATE TABLE IF NOT EXISTS app_state (id int PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz DEFAULT now())");
      await pgPool.query("CREATE TABLE IF NOT EXISTS uploads (name text PRIMARY KEY, mime text NOT NULL, data bytea NOT NULL, created_at timestamptz DEFAULT now())");
      const r = await pgPool.query("SELECT data FROM app_state WHERE id = 1");
      if (r.rows.length) {
        db = r.rows[0].data || {};
        console.log("DB: PostgreSQL terhubung — data dimuat ✅");
      } else {
        db = readSeedOrFile(); applyDefaults();
        await pgPool.query("INSERT INTO app_state (id, data) VALUES (1, $1::jsonb)", [JSON.stringify(db)]);
        console.log("DB: PostgreSQL terhubung — di-seed dari data awal ✅");
      }
    } catch (e) {
      console.error("Postgres gagal terhubung, fallback ke file:", e.message);
      pgPool = null; db = readSeedOrFile();
    }
  } else {
    db = readSeedOrFile();
  }
  applyDefaults();
}
let saveTimer = null;
function saveDB() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (pgPool) {
      pgPool.query("INSERT INTO app_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()", [JSON.stringify(db)])
        .catch((e) => console.error("pg save:", e.message));
    } else {
      const tmp = DB_PATH + ".tmp";
      fs.writeFile(tmp, JSON.stringify(db, null, 2), (e) => {
        if (e) return console.error("save:", e.message);
        fs.rename(tmp, DB_PATH, (er) => er && console.error("rename:", er.message)); // atomic
      });
    }
  }, 150);
}

function nextId(kind) { db._seq[kind] = (db._seq[kind] || 0) + 1; return db._seq[kind]; }

function addNotification(target, title, message, icon) {
  db.notifications ||= [];
  const notif = { id: nextId("notification"), target, title, message, icon: icon || "notifications", read: false, createdAt: Date.now() };
  db.notifications.push(notif);
  if (db.notifications.length > 200) db.notifications = db.notifications.slice(-200);
  saveDB();
  return notif;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------
const sessions = new Map();    // token -> { userId, expires }
const otpStore = new Map();    // email -> { code, expires, name }
const SESSION_TTL = 7 * 24 * 3600 * 1000;

function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString("hex");
  return salt + ":" + crypto.scryptSync(pw, salt, 64).toString("hex");
}
function verifyPassword(pw, stored) {
  if (!stored) return false;
  const [salt, h] = stored.split(":");
  const hh = crypto.scryptSync(pw, salt, 64).toString("hex");
  return h.length === hh.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hh));
}
function createSession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId, expires: Date.now() + SESSION_TTL });
  const u = db.users.find(u => u.id === userId);
  if (u) { u.lastLogin = Date.now(); saveDB(); }
  return token;
}
function userFromReq(req) {
  const token = req.headers["x-auth-token"];
  if (!token) return null;
  const s = sessions.get(token);
  if (!s || s.expires < Date.now()) { sessions.delete(token); return null; }
  return db.users.find((u) => u.id === s.userId) || null;
}
// Role: owner > admin > staff (akses dashboard) ; customer (tanpa akses dashboard)
const DASH_ROLES = ["owner", "admin", "staff"];
function dashRoleCount() { return db.users.filter((u) => DASH_ROLES.includes(u.role)).length; }
function assignRole(email) {
  const e = String(email).toLowerCase();
  if (ADMIN_EMAILS.includes(e)) return "owner";
  if (ADMIN_EMAILS.length === 0 && dashRoleCount() === 0) return "owner"; // bootstrap pemilik pertama
  return "customer";
}
function isAdmin(u) { return !!u && DASH_ROLES.includes(u.role); }          // akses dashboard
function canManageUsers(u) { return !!u && ["owner", "admin"].includes(u.role); }
function publicUser(u) { return u && { id: u.id, email: u.email, name: u.name, picture: u.picture || null, phone: u.phone || "", bio: u.bio || "", provider: u.provider, role: u.role || "customer", admin: isAdmin(u), createdAt: u.createdAt, lastLogin: u.lastLogin }; }
function findUser(email) { return db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()); }
function upsertUser({ email, name, provider, picture, passwordHash, role }) {
  let u = findUser(email);
  if (u) {
    if (name && !u.name) u.name = name;
    if (picture) u.picture = picture;
    if (passwordHash) u.passwordHash = passwordHash;
    if (!u.role) u.role = assignRole(email);
    if (ADMIN_EMAILS.includes(String(email).toLowerCase()) && u.role === "customer") u.role = "owner";
  } else {
    u = { id: nextId("user"), email, name: name || email.split("@")[0], provider: provider || "email", picture: picture || null, passwordHash: passwordHash || null, role: role || assignRole(email), createdAt: Date.now() };
    db.users.push(u);
    addNotification("admin", "User Baru", "User baru terdaftar: " + email, "person_add");
  }
  saveDB();
  return u;
}

// ---------------------------------------------------------------------------
// Email (SMTP via nodemailer). Fallback: log + dev code.
// ---------------------------------------------------------------------------
function smtpSend({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: SMTP.host,
        port: Number(SMTP.port),
        secure: Number(SMTP.port) === 465, // true for 465, false for other ports
        auth: { user: SMTP.user, pass: SMTP.pass },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000
      });
      transporter.sendMail({
        from: `"Anshel Store" <${SMTP.from}>`,
        to,
        subject,
        html
      }, (err, info) => {
        if (err) return reject(err);
        resolve(info);
      });
    } catch (e) {
      reject(e);
    }
  });
}
async function sendOtpEmail(to, code, context = "verifikasi", name = "", reqUrl = "") {
  const subject = `Kode OTP ${context} Anshel Store`;
  const action = context.includes("reset") ? "reset" : "verify";
  const link = reqUrl ? `${reqUrl}/masuk?action=${action}&email=${encodeURIComponent(to)}&code=${code}` : "";
  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #e11d48, #be123c); padding: 40px 30px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
  .body { padding: 40px 30px; color: #334155; line-height: 1.6; }
  .title { font-size: 20px; font-weight: bold; color: #0f172a; margin-top: 0; }
  .code-box { background: #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 30px 0; border: 1px dashed #cbd5e1; }
  .code { font-size: 42px; font-weight: 900; color: #e11d48; letter-spacing: 8px; margin: 0; }
  .btn { display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; margin-top: 10px; }
  .footer { background: #f8fafc; padding: 24px 30px; text-align: center; color: #64748b; font-size: 13px; border-top: 1px solid #e2e8f0; }
</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Anshel Store</h1>
    </div>
    <div class="body">
      <p class="title">Halo ${name || to},</p>
      <p>Terima kasih telah menggunakan Anshel Store. Berikut adalah 6-digit kode rahasia untuk <strong>${context}</strong> akun kamu:</p>
      
      <div class="code-box">
        <p class="code">${code}</p>
      </div>
      
      ${link ? `<p style="text-align: center;">Atau, kamu bisa langsung memverifikasinya dengan menekan tombol di bawah ini:</p>
      <div style="text-align: center;"><a href="${link}" class="btn">Otomatis Verifikasi</a></div>` : ""}
      
      <p style="margin-top: 30px; font-size: 14px; color: #64748b;">Kode ini hanya berlaku selama <strong>10 menit</strong>. Harap tidak membagikan kode ini kepada siapa pun, termasuk pihak yang mengatasnamakan Anshel Store.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Anshel Store. Semua hak cipta dilindungi.</p>
    </div>
  </div>
</body>
</html>
  `;
  if (SMTP_READY) { await smtpSend({ to, subject, html }); return { sent: true }; }
  console.log(`[OTP][DEV] Email belum dikonfigurasi. OTP untuk ${to} = ${code}`);
  return { sent: false, devCode: code };
}

// ---------------------------------------------------------------------------
// HTTPS helper (untuk Google OAuth)
// ---------------------------------------------------------------------------
function httpsRequest(method, urlStr, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const req = https.request({ method, hostname: u.hostname, path: u.pathname + u.search, headers }, (res) => {
      let data = ""; res.on("data", (c) => (data += c));
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}
function baseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers.host}`;
}

// ---------------------------------------------------------------------------
// AI reply engine (mock; ganti dengan LLM untuk produksi)
// ---------------------------------------------------------------------------
async function generateAIReply(text, convId) {
  const integ = db.settings.integrations || {};
  
  // Prompt sistem dengan gaya bahasa casual & enjoy
  const systemPrompt = "Kamu adalah asisten AI dari Anshel Store, toko top up game murah, cepat, dan terpercaya. " +
    "Gaya bahasamu harus asik, santai, enjoy, dan friendly, seperti ngobrol sama teman (tapi tetap sopan). Panggil pelanggan dengan sapaan akrab (misal: 'Kak' atau 'Bro'). " +
    "Jangan pernah menawarkan atau membahas 'jasa AI', 'chat automation', atau 'bot' karena fokus kamu 100% cuma top up game. " +
    "Game yang tersedia: Mobile Legends (MLBB), Free Fire, Genshin Impact, Valorant, PUBG, dll. " +
    "Jika pengguna komplain, marah, minta uang kembali, atau butuh bantuan admin, jawab dengan santai bahwa kamu akan langsung memanggil tim cs/admin manusia.";

  // Gunakan Gemini jika API Key ada
  if (integ.aiKey && (integ.aiProvider || "").toLowerCase().includes("gemini")) {
    try {
      const payload = {
        contents: [
          { role: "user", parts: [{ text: systemPrompt + "\n\nCustomer bilang: " + text }] }
        ]
      };
      
      const res = await httpsRequest("POST", `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${integ.aiKey}`, {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      if (res && res.candidates && res.candidates[0].content && res.candidates[0].content.parts[0].text) {
        return res.candidates[0].content.parts[0].text.trim();
      }
    } catch (e) {
      console.error("Gemini API Error:", e);
    }
  }

  // Fallback (jika gagal atau blm disetting)
  const t = (text || "").toLowerCase(); const has = (...w) => w.some((x) => t.includes(x));
  if (has("admin", "manusia", "agent", "agen", "cs", "komplain", "refund")) return "Siap Kak! Aku panggilin tim admin buat bantu kakak ya, ditunggu bentar! 🙏";
  if (has("top up", "topup", "diamond", "uc", "vp", "voucher")) return "Mau top up game apa nih, Bro? Kita ada MLBB, FF, Genshin, PUBG, Valorant. Tinggal sebut aja game, nominal, sama ID-nya! 🎮";
  if (has("halo", "hai", "hi", "pagi", "siang", "sore", "malam", "assalam")) return "Halo, Kak! 👋 Selamat datang di Anshel Store. Mau top up game apa hari ini?";
  if (has("terima kasih", "makasih", "thanks", "thank")) return "Santai aja Kak, sama-sama! 😊 Kalo butuh apa-apa, chat lagi aja ya.";
  return "Oke Kak, ada lagi yang bisa aku bantu? Kalo butuh bantuan admin, ketik 'admin' aja ya.";
}
function shouldEscalate(text) { const t = (text || "").toLowerCase(); return ["manusia", "admin", "agent", "agen", "komplain", "marah", "refund"].some((w) => t.includes(w)); }

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------
function sendJSON(res, status, data) { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(data)); }
function sendCompressed(req, res, content, contentType, extraHeaders = {}) {
  const acceptEnc = req.headers['accept-encoding'] || '';
  const headers = { "Content-Type": contentType || "text/html; charset=utf-8", ...extraHeaders };
  if (!headers["Cache-Control"] && contentType === "text/html; charset=utf-8") {
    headers["Cache-Control"] = "public, max-age=86400";
  }

  if (acceptEnc.match(/\bgzip\b/)) {
    zlib.gzip(content, (err, result) => {
      if (!err) {
        headers["Content-Encoding"] = "gzip";
        res.writeHead(200, headers);
        return res.end(result);
      }
      res.writeHead(200, headers); res.end(content);
    });
  } else {
    res.writeHead(200, headers); res.end(content);
  }
}
function redirect(res, location) { res.writeHead(302, { Location: location }); res.end(); }

// Header keamanan untuk semua respons
function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}
// Rate limit sederhana per-IP (in-memory)
const rateMap = new Map();
function rateLimit(req, key, max, windowMs) {
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || (req.socket && req.socket.remoteAddress) || "ip";
  const k = key + ":" + ip, now = Date.now();
  let rec = rateMap.get(k);
  if (!rec || rec.reset < now) { rec = { count: 0, reset: now + windowMs }; rateMap.set(k, rec); }
  rec.count++;
  return rec.count <= max;
}
// Settings publik tanpa data sensitif (API keys disembunyikan)
function publicSettings() { const { integrations, ...safe } = db.settings || {}; return safe; }
// Status integrasi (boolean saja, tanpa membocorkan key)
function integrationStatus() {
  const i = db.settings.integrations || {};
  return { payment: !!i.paymentKey, ai: !!i.aiKey, idCheck: !!i.gameCheckUrl };
}
function readBody(req) { return new Promise((resolve) => { let raw = ""; req.on("data", (c) => (raw += c)); req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } }); }); }
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".ico": "image/x-icon", ".webp": "image/webp" };
function serveFile(req, res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      fs.readFile(path.join(PUBLIC_DIR, "404.html"), "utf-8", (err404, content404) => {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
        return res.end(content404 || "<h1>404 - Tidak ditemukan</h1>");
      });
      return;
    }
    const mime = MIME[path.extname(filePath)] || "application/octet-stream";
    const cacheHeader = mime.startsWith("image/") || mime.startsWith("text/css") || mime === "application/javascript" 
      ? "public, max-age=31536000, immutable" 
      : "public, max-age=86400";
      
    if (mime.startsWith("text/") || mime === "application/javascript" || mime === "application/json") {
      const headers = { "Content-Type": mime, "Cache-Control": cacheHeader };
      sendCompressed(req, res, content, mime, headers);
    } else {
      res.writeHead(200, { "Content-Type": mime, "Cache-Control": cacheHeader });
      res.end(content);
    }
  });
}
// Peta URL bersih -> file
const CLEAN_ROUTES = {
  "/dashboard": "dashboard.html", "/topup": "topup.html", "/game": "topup.html", "/games": "topup.html",
  "/cek-transaksi": "cek-transaksi.html", "/lacak": "cek-transaksi.html",
  "/faq": "faq.html", "/tentang": "tentang.html", "/chat": "chat.html",
  "/masuk": "masuk.html", "/login": "masuk.html", "/daftar": "masuk.html",
  "/akun": "akun.html", "/profil": "akun.html",
  "/layanan": "layanan.html", "/automation": "layanan.html", "/ai": "layanan.html",
  "/syarat-dan-ketentuan": "syarat-dan-ketentuan.html", "/kebijakan-privasi": "kebijakan-privasi.html", 
  "/kebijakan-pengembalian": "kebijakan-pengembalian.html", "/cara-pembelian": "cara-pembelian.html", "/kontak": "kontak.html",
};
async function saveImageUpload(dataUrl) {
  const m = /^data:(image\/(png|jpe?g|gif|webp|svg\+xml));base64,(.+)$/.exec(String(dataUrl || ""));
  if (!m) return { status: 400, body: { error: "Format gambar tidak valid (png/jpg/gif/webp/svg)." } };
  let ext = m[2] === "jpeg" ? "jpg" : m[2] === "svg+xml" ? "svg" : m[2];
  let buf; try { buf = Buffer.from(m[3], "base64"); } catch (e) { return { status: 400, body: { error: "Gagal membaca gambar." } }; }
  
  let finalMime = m[1];
  if (ext !== "svg" && ext !== "gif") {
    try {
      const sharp = require("sharp");
      buf = await sharp(buf).webp({ quality: 80 }).toBuffer();
      ext = "webp";
      finalMime = "image/webp";
    } catch(e) { console.error("Sharp warning:", e); }
  }
  
  if (buf.length > 4 * 1024 * 1024) return { status: 413, body: { error: "Gambar terlalu besar (maks 4MB)." } };
  const name = "img-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
  try {
    if (pgPool) await pgPool.query("INSERT INTO uploads (name, mime, data) VALUES ($1, $2, $3)", [name, finalMime, buf]);
    else { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); fs.writeFileSync(path.join(UPLOAD_DIR, name), buf); }
    return { status: 201, body: { url: "/uploads/" + name } };
  } catch (e) { return { status: 500, body: { error: "Gagal menyimpan gambar." } }; }
}

function serveStatic(req, res, pathname) {
  const clean = pathname.replace(/\/$/, "") || "/";
  if (clean === "/") {
    const filePath = path.join(PUBLIC_DIR, "index.html");
    fs.readFile(filePath, "utf-8", (err, content) => {
      if (err) {
        fs.readFile(path.join(PUBLIC_DIR, "404.html"), "utf-8", (err404, content404) => {
          res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
          return res.end(content404 || "<h1>404 - Tidak ditemukan</h1>");
        });
        return;
      }
      const reviews = db.reviews || [];
      if (reviews.length > 0) {
        const ratingSum = reviews.reduce((s, r) => s + r.rating, 0);
        const avg = (ratingSum / reviews.length).toFixed(1);
        const storeName = (db.settings && db.settings.store && db.settings.store.name) || "Anshel Store";
        const seoData = {
          "@context": "https://schema.org/",
          "@type": "Product",
          "name": storeName,
          "description": "Layanan Top Up Game Terpercaya",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": avg,
            "bestRating": "5",
            "worstRating": "1",
            "ratingCount": String(reviews.length)
          }
        };
        const seoScript = `\n<script type="application/ld+json">\n${JSON.stringify(seoData)}\n</script>\n`;
        content = content.replace("</head>", seoScript + "</head>");
      }
      sendCompressed(req, res, content, "text/html; charset=utf-8");
    });
    return;
  }
  if (CLEAN_ROUTES[clean]) return serveFile(req, res, path.join(PUBLIC_DIR, CLEAN_ROUTES[clean]));
  const rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end("Forbidden"); }
  serveFile(req, res, filePath);
}
function addMessage(conversationId, sender, text) {
  const msg = { id: nextId("message"), conversationId, sender, text, ts: Date.now() };
  db.messages.push(msg);
  const conv = db.conversations.find((c) => c.id === conversationId);
  if (conv) { conv.lastTs = msg.ts; conv.lastText = text; if (sender === "customer") conv.unread = (conv.unread || 0) + 1; }
  saveDB(); return msg;
}
function buildStats() {
  const orders = db.orders || []; const paid = ["paid", "processing", "done"];
  const revenue = orders.filter((o) => paid.includes(o.status)).reduce((s, o) => s + (o.price || 0), 0);
  const sod = new Date(); sod.setHours(0, 0, 0, 0);
  const series = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); const n = d.getTime() + 86400000; series.push({ label: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][d.getDay()], count: orders.filter((o) => o.createdAt >= d.getTime() && o.createdAt < n).length }); }
  const byGame = {}; orders.forEach((o) => (byGame[o.gameName] = (byGame[o.gameName] || 0) + 1));
  const topGames = Object.entries(byGame).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  return {
    revenue, totalOrders: orders.length, todayOrders: orders.filter((o) => o.createdAt >= sod.getTime()).length,
    pendingOrders: orders.filter((o) => o.status === "pending").length, doneOrders: orders.filter((o) => o.status === "done").length,
    totalConversations: db.conversations.length, humanActive: db.conversations.filter((c) => c.mode === "human").length,
    unreadTotal: db.conversations.reduce((s, c) => s + (c.unread || 0), 0), series, topGames,
  };
}

// ---------------------------------------------------------------------------
// SEO / Blog helpers
// ---------------------------------------------------------------------------
function escHtml(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function slugify(s) { return String(s || "").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80); }
function siteUrl() { return (db.settings.siteUrl || process.env.PUBLIC_URL || "https://www.anshelstore.biz.id").replace(/\/$/, ""); }

// Mini markdown -> HTML (tanpa dependency): heading, bold, italic, list, link, paragraf
function mdToHtml(md) {
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (t) => esc(t)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary underline" target="_blank" rel="noopener">$1</a>');
  const blocks = String(md || "").split(/\n{2,}/);
  let html = "";
  for (const b of blocks) {
    const t = b.trim();
    if (!t) continue;
    if (/^###\s/.test(t)) html += `<h3 class="font-headline-md text-headline-md text-on-surface mt-lg mb-sm">${inline(t.replace(/^###\s/, ""))}</h3>`;
    else if (/^##\s/.test(t)) html += `<h2 class="font-headline-lg text-headline-lg text-on-surface mt-xl mb-sm">${inline(t.replace(/^##\s/, ""))}</h2>`;
    else if (/^#\s/.test(t)) html += `<h2 class="font-headline-lg text-headline-lg text-on-surface mt-xl mb-sm">${inline(t.replace(/^#\s/, ""))}</h2>`;
    else if (/^(\-|\*)\s/m.test(t) && t.split("\n").every((l) => /^(\-|\*)\s/.test(l.trim()))) {
      html += '<ul class="list-disc pl-6 my-md flex flex-col gap-xs">' + t.split("\n").map((l) => `<li>${inline(l.trim().replace(/^(\-|\*)\s/, ""))}</li>`).join("") + "</ul>";
    } else html += `<p class="font-body-lg text-body-lg text-on-surface-variant my-md leading-relaxed">${inline(t)}</p>`;
  }
  return html;
}

const THEME_HEAD = `
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block" rel="stylesheet"/>
<script src="/js/theme.js"></script>
<link href="/css/theme.css" rel="stylesheet"/>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-NXRVTQKMZF"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-NXRVTQKMZF');
</script>`;

function pageNav() { return `<div id="siteNav"></div>`; }
function pageFooter() { return `<div id="siteFooter"></div>`; }

function allTags() {
  const set = new Map();
  db.articles.filter((a) => a.published).forEach((a) => (a.tags || []).forEach((t) => set.set(t, (set.get(t) || 0) + 1)));
  return [...set.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}
function communityChatCard(boxStyle) {
  return `<div class="bg-surface-container-lowest rounded-2xl shadow-md border border-outline-variant/20 overflow-hidden flex flex-col" style="${boxStyle}">
        <div class="px-md py-sm bg-gradient-to-r from-secondary to-pink text-on-primary flex items-center gap-xs">
          <span class="relative flex h-2.5 w-2.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span></span>
          <b class="font-label-md text-label-md">Live Chat Komunitas</b>
          <span id="chatOnline" class="ml-auto font-label-sm text-label-sm opacity-90"></span>
        </div>
        <div id="chatList" class="flex-grow overflow-y-auto p-md flex flex-col gap-sm bg-surface" style="min-height:0"></div>
        <div id="chatGate" class="p-sm border-t border-outline-variant/30 bg-surface-container-lowest text-center hidden">
          <p class="font-label-sm text-label-sm text-on-surface-variant mb-2">Masuk dulu untuk ikut ngobrol 💬</p>
          <a href="/masuk?next=/blog" class="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink to-secondary text-on-primary font-label-md text-label-md font-bold px-4 py-2 rounded-full"><span class="material-symbols-outlined text-[18px]">login</span> Masuk / Daftar</a>
        </div>
        <form id="chatForm" class="p-sm border-t border-outline-variant/30 flex gap-xs bg-surface-container-lowest hidden">
          <input id="chatText" type="text" maxlength="400" placeholder="Tulis pesan ke komunitas..." class="flex-grow rounded-full border-outline-variant bg-surface text-[14px] px-3 py-2 focus:border-secondary focus:ring-secondary"/>
          <button class="shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-secondary to-pink text-on-primary grid place-items-center hover:scale-105 transition-transform"><span class="material-symbols-outlined text-[20px]">send</span></button>
        </form>
      </div>`;
}
function communityChatScript() {
  return `<script>
      (function(){
        var list=document.getElementById("chatList"); if(!list) return;
        var last=0, atBottom=true, textEl=document.getElementById("chatText");
        var form=document.getElementById("chatForm"), gate=document.getElementById("chatGate");
        var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
        function loggedIn(){ return !!localStorage.getItem("anshel_token"); }
        function refreshGate(){ if(loggedIn()){ form.classList.remove("hidden"); gate.classList.add("hidden"); } else { form.classList.add("hidden"); gate.classList.remove("hidden"); } }
        refreshGate();
        function time(ts){var d=new Date(ts);return ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2);}
        function color(n){var h=0;for(var i=0;i<n.length;i++)h=n.charCodeAt(i)+((h<<5)-h);return "hsl("+(h%360)+",45%,55%)";}
        list.addEventListener("scroll",function(){atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<60;});
        function add(m){
          var d=document.createElement("div"); d.className="flex gap-2 items-start";
          d.innerHTML='<span class="w-7 h-7 shrink-0 rounded-full grid place-items-center text-[12px] font-bold text-white" style="background:'+color(m.name)+'">'+esc(m.name.charAt(0).toUpperCase())+'</span>'+
            '<div class="min-w-0"><div class="flex items-baseline gap-2"><b class="font-label-sm text-label-sm text-on-surface">'+esc(m.name)+'</b><span class="text-[11px] text-on-surface-variant">'+time(m.createdAt)+'</span></div>'+
            '<p class="font-label-md text-label-md text-on-surface-variant break-words">'+esc(m.text)+'</p></div>';
          list.appendChild(d);
        }
        function poll(){
          fetch("/api/community"+(last?"?since="+last:"")).then(function(r){return r.json();}).then(function(ms){
            if(!ms.length && !last){ list.innerHTML='<p class="text-center text-on-surface-variant font-label-md text-label-md m-auto">Belum ada pesan. Jadi yang pertama menyapa! 💬</p>'; }
            if(ms.length && last===0) list.innerHTML="";
            ms.forEach(function(m){ if(m.createdAt>last)last=m.createdAt; add(m); });
            if(ms.length && atBottom) list.scrollTop=list.scrollHeight;
          }).catch(function(){});
        }
        form.addEventListener("submit",function(e){ e.preventDefault();
          if(!loggedIn()){ refreshGate(); return; }
          var text=textEl.value.trim(); if(!text)return;
          var tok=localStorage.getItem("anshel_token");
          textEl.value="";
          fetch("/api/community",{method:"POST",headers:{"Content-Type":"application/json","x-auth-token":tok},body:JSON.stringify({text:text})})
            .then(function(r){ if(r.status===401){ localStorage.removeItem("anshel_token"); refreshGate(); return null; } return r.json(); })
            .then(function(){ atBottom=true; poll(); }).catch(function(){});
        });
        poll(); setInterval(poll,4000);
      })();
    </script>`;
}

function renderBlogList(tag) {
  let arts = db.articles.filter((a) => a.published).sort((a, b) => b.createdAt - a.createdAt);
  if (tag) arts = arts.filter((a) => (a.tags || []).map((t) => t.toLowerCase()).includes(String(tag).toLowerCase()));
  const chips = `<a href="/blog" class="px-md py-xs rounded-full font-label-md text-label-md ${!tag ? "bg-secondary text-on-primary" : "bg-surface-container text-on-surface-variant hover:text-secondary"} transition-colors">Semua</a>` +
    allTags().map((t) => `<a href="/blog?tag=${encodeURIComponent(t.name)}" class="px-md py-xs rounded-full font-label-md text-label-md ${tag && tag.toLowerCase() === t.name.toLowerCase() ? "bg-secondary text-on-primary" : "bg-surface-container text-on-surface-variant hover:text-secondary"} transition-colors">${escHtml(t.name)} <span class="opacity-60">${t.count}</span></a>`).join("");
  const cards = arts.map((a) => `
    <a href="/blog/${a.slug}" class="group bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm border border-outline-variant/20 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex">
      <div class="w-32 sm:w-44 shrink-0 overflow-hidden bg-surface-container">${a.cover ? `<img src="${escHtml(a.cover)}" alt="${escHtml(a.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>` : '<div class="w-full h-full grid place-items-center text-3xl">📝</div>'}</div>
      <div class="p-md flex flex-col gap-xs flex-grow min-w-0">
        <div class="flex flex-wrap gap-xs">${(a.tags || []).slice(0, 2).map((t) => `<span class="bg-secondary-fixed text-secondary font-label-sm text-label-sm px-xs py-[2px] rounded-full">${escHtml(t)}</span>`).join("")}</div>
        <h2 class="font-headline-md text-headline-md text-on-surface leading-tight line-clamp-2">${escHtml(a.title)}</h2>
        <p class="font-body-md text-body-md text-on-surface-variant line-clamp-2 flex-grow">${escHtml(a.excerpt)}</p>
        <span class="font-label-md text-label-md text-secondary inline-flex items-center gap-xs">Baca <span class="material-symbols-outlined text-[18px]">arrow_forward</span></span>
      </div>
    </a>`).join("");
  const chatBox = `<aside class="lg:col-span-1 lg:sticky lg:top-[88px] self-start" style="height:calc(100vh - 120px);min-height:480px">${communityChatCard("height:100%")}</aside>`;
  const pageTitle = tag ? escHtml(tag) + " — Komunitas & Artikel — Anshel Store" : "Komunitas & Artikel — Anshel Store";
  const pageDesc = "Komunitas Anshel Store: ngobrol langsung di live chat, baca artikel & tips top up game dan AI automation.";
  return `<!DOCTYPE html><html class="light" lang="id"><head>
    <meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>${pageTitle}</title>
    <meta name="description" content="${pageDesc}"/>
    <link rel="canonical" href="${siteUrl()}/blog"/>
    <meta property="og:title" content="${pageTitle}"/>
    <meta property="og:description" content="${pageDesc}"/>
    <meta property="og:url" content="${siteUrl()}/blog"/>
    <meta property="og:image" content="${siteUrl()}/logo.png"/>
    <meta property="og:type" content="website"/>
    <meta property="og:site_name" content="Anshel Store"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${pageTitle}"/>
    <meta name="twitter:description" content="${pageDesc}"/>
    <meta name="twitter:image" content="${siteUrl()}/logo.png"/>
    ${THEME_HEAD}</head>
    <body data-page="blog" class="bg-ambient text-on-background font-body-md min-h-screen overflow-x-hidden">
    ${pageNav()}
    <main class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-lg">
      <div class="mb-lg">
        <h1 class="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">Komunitas Anshel Store</h1>
        <p class="font-body-lg text-body-lg text-on-surface-variant mt-xs">Baca artikel & tips di kiri, ngobrol bareng komunitas di live chat sebelah kanan. 👋</p>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-gutter lg:gap-xl">
        <div class="lg:col-span-2">
          <div class="flex flex-wrap gap-xs mb-md">${chips}</div>
          <div class="flex flex-col gap-md">${cards || '<p class="text-on-surface-variant text-center py-lg">Belum ada artikel di kategori ini.</p>'}</div>
        </div>
        ${chatBox}
      </div>
    </main>${pageFooter()}<script src="/js/site.js"></script>
    </body></html>`;
}

function renderArticle(a) {
  const u = siteUrl() + "/blog/" + a.slug;
  const words = String(a.content || "").split(/\s+/).filter(Boolean).length;
  const readMin = Math.max(1, Math.round(words / 180));
  const dateStr = new Date(a.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const related = db.articles.filter((x) => x.published && x.id !== a.id).sort((x, y) => y.createdAt - x.createdAt).slice(0, 4);
  const cats = allTags().slice(0, 12);
  const sidebar = `
    <aside class="lg:col-span-1 flex flex-col gap-md lg:sticky lg:top-[96px] self-start">
      ${communityChatCard("height:440px")}
      <div class="bg-surface-container-lowest rounded-lg p-md shadow-sm border border-outline-variant/20">
        <h3 class="font-headline-md text-headline-md text-on-surface mb-sm">Kategori</h3>
        <div class="flex flex-wrap gap-xs">${cats.length ? cats.map((t) => `<a href="/blog?tag=${encodeURIComponent(t.name)}" class="bg-pink-50 text-pink font-label-sm text-label-sm px-sm py-[3px] rounded-full hover:bg-pink hover:text-on-primary transition-colors">${escHtml(t.name)}</a>`).join("") : '<span class="text-on-surface-variant font-label-md text-label-md">—</span>'}</div>
      </div>
      <div class="bg-surface-container-lowest rounded-lg p-md shadow-sm border border-outline-variant/20">
        <h3 class="font-headline-md text-headline-md text-on-surface mb-sm">Artikel Lainnya</h3>
        <div class="flex flex-col gap-sm">${related.length ? related.map((r) => `<a href="/blog/${r.slug}" class="flex gap-sm group">
          <div class="w-16 h-16 rounded-DEFAULT overflow-hidden bg-surface-container flex-shrink-0">${r.cover ? `<img src="${escHtml(r.cover)}" alt="${escHtml(r.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform"/>` : ""}</div>
          <span class="font-label-md text-label-md text-on-surface group-hover:text-pink transition-colors leading-snug">${escHtml(r.title)}</span></a>`).join("") : '<span class="text-on-surface-variant font-label-md text-label-md">Belum ada.</span>'}</div>
      </div>
      <div class="bg-surface-container-lowest rounded-lg p-md shadow-sm border border-outline-variant/20">
        <h3 class="font-headline-md text-headline-md text-on-surface mb-xs flex items-center gap-xs"><span class="material-symbols-outlined text-pink">forum</span> Komunitas</h3>
        <p class="font-label-sm text-label-sm text-on-surface-variant mb-sm">Diskusi & komentar pembaca.</p>
        <div id="commentList" class="flex flex-col gap-sm mb-sm max-h-80 overflow-y-auto"></div>
        <form id="commentForm" class="flex flex-col gap-xs">
          <input id="cName" type="text" placeholder="Nama (opsional)" class="w-full rounded-DEFAULT border-outline-variant bg-surface text-[14px] focus:border-pink focus:ring-pink"/>
          <textarea id="cText" rows="2" placeholder="Tulis komentar..." class="w-full rounded-DEFAULT border-outline-variant bg-surface text-[14px] focus:border-pink focus:ring-pink"></textarea>
          <button class="bg-gradient-to-r from-pink to-secondary text-on-primary rounded-full py-2 font-label-md text-label-md font-bold hover:scale-[1.02] transition-transform">Kirim</button>
        </form>
      </div>
    </aside>`;
  const jsonld = {
    "@context": "https://schema.org", "@type": "BlogPosting", "headline": a.title, "description": a.excerpt,
    "image": a.cover || undefined, "datePublished": new Date(a.createdAt).toISOString(), "dateModified": new Date(a.updatedAt || a.createdAt).toISOString(),
    "author": { "@type": "Organization", "name": a.author || "Anshel Store" }, "publisher": { "@type": "Organization", "name": "Anshel Store" }, "mainEntityOfPage": u,
  };
  return `<!DOCTYPE html><html class="light" lang="id"><head>
    <meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>${escHtml(a.title)} — Anshel Store</title>
    <meta name="description" content="${escHtml(a.excerpt)}"/>
    <link rel="canonical" href="${u}"/>
    <meta property="og:title" content="${escHtml(a.title)}"/>
    <meta property="og:description" content="${escHtml(a.excerpt)}"/>
    <meta property="og:type" content="article"/><meta property="og:url" content="${u}"/>
    <meta property="og:site_name" content="Anshel Store"/>
    <meta property="og:image" content="${escHtml(a.cover || siteUrl() + "/logo.png")}"/>
    <meta name="twitter:card" content="summary_large_image"/>
    <meta name="twitter:title" content="${escHtml(a.title)}"/>
    <meta name="twitter:description" content="${escHtml(a.excerpt)}"/>
    <meta name="twitter:image" content="${escHtml(a.cover || siteUrl() + "/logo.png")}"/>
    <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
    ${THEME_HEAD}</head>
    <body data-page="blog" class="bg-ambient text-on-background font-body-md min-h-screen overflow-x-hidden">
    ${pageNav()}
    <header class="relative overflow-hidden">
      <div class="absolute inset-0 bg-gradient-to-br from-pink-100/60 via-surface to-secondary-fixed/30"></div>
      <div class="relative max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop pt-lg pb-md">
        <a href="/blog" class="inline-flex items-center gap-xs text-on-surface-variant hover:text-pink font-label-md text-label-md mb-md"><span class="material-symbols-outlined text-[20px]">arrow_back</span> Semua artikel</a>
        <div class="flex flex-wrap gap-xs mb-sm">${(a.tags || []).map((t) => `<a href="/blog?tag=${encodeURIComponent(t)}" class="bg-pink-50 text-pink font-label-sm text-label-sm px-sm py-[3px] rounded-full">${escHtml(t)}</a>`).join("")}</div>
        <h1 class="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-sm max-w-3xl">${escHtml(a.title)}</h1>
        <div class="flex items-center gap-sm text-on-surface-variant font-label-md text-label-md">
          <span class="inline-flex items-center gap-xs"><span class="material-symbols-outlined text-[18px]">person</span>${escHtml(a.author || "Anshel Store")}</span>
          <span>•</span><span>${dateStr}</span><span>•</span>
          <span class="inline-flex items-center gap-xs"><span class="material-symbols-outlined text-[18px]">schedule</span>${readMin} mnt baca</span>
        </div>
      </div>
    </header>
    <main class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop pb-xl grid grid-cols-1 lg:grid-cols-3 gap-xl mt-md">
      <div class="lg:col-span-2">
        ${a.cover ? `<img src="${escHtml(a.cover)}" alt="${escHtml(a.title)}" class="w-full rounded-lg shadow-lg mb-lg object-cover aspect-[16/9]"/>` : ""}
        <article class="article-body max-w-none">${mdToHtml(a.content)}</article>
        <div class="flex items-center gap-sm mt-lg pt-md border-t border-outline-variant/30">
          <span class="font-label-md text-label-md text-on-surface-variant">Bagikan:</span>
          <a href="https://wa.me/?text=${encodeURIComponent(a.title + " " + u)}" target="_blank" rel="noopener" class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-secondary hover:scale-110 transition-transform"><span class="material-symbols-outlined text-[20px]">share</span></a>
          <a href="https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(a.title)}" target="_blank" rel="noopener" class="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary hover:scale-110 transition-transform"><span class="material-symbols-outlined text-[20px]">send</span></a>
        </div>
        <div class="mt-lg p-lg rounded-lg bg-gradient-to-r from-pink to-secondary text-on-primary text-center">
          <h3 class="font-headline-md text-headline-md mb-sm">Butuh bantuan AI automation atau top up?</h3>
          <a href="/topup" class="inline-block bg-surface text-pink font-label-md text-label-md px-gutter py-sm rounded-full mt-xs hover:scale-105 transition-transform">Mulai Sekarang</a>
        </div>
      </div>
      ${sidebar}
    </main>${pageFooter()}
    <script src="/js/site.js"></script>${communityChatScript()}
    <script>
      (function(){
        var slug=${JSON.stringify(a.slug)}; var list=document.getElementById("commentList");
        var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
        function load(){ fetch("/api/articles/"+slug+"/comments").then(function(r){return r.json();}).then(function(cs){
          if(!cs.length){ list.innerHTML='<p class="font-label-sm text-label-sm text-on-surface-variant">Jadilah yang pertama berkomentar! 💬</p>'; return; }
          list.innerHTML=cs.map(function(c){return '<div class="bg-surface-container rounded-DEFAULT p-sm"><div class="flex items-center gap-xs mb-[2px]"><span class="w-6 h-6 rounded-full bg-gradient-to-br from-pink to-secondary text-on-primary flex items-center justify-center text-[11px] font-bold">'+esc((c.name||"A").charAt(0).toUpperCase())+'</span><b class="font-label-sm text-label-sm text-on-surface">'+esc(c.name)+'</b></div><p class="font-label-md text-label-md text-on-surface-variant">'+esc(c.text)+'</p></div>';}).join("");
        }).catch(function(){}); }
        var tok=localStorage.getItem("anshel_token");
        document.getElementById("commentForm").addEventListener("submit",function(e){ e.preventDefault();
          var text=document.getElementById("cText").value.trim(); if(!text)return;
          var h={"Content-Type":"application/json"}; if(tok)h["x-auth-token"]=tok;
          fetch("/api/articles/"+slug+"/comments",{method:"POST",headers:h,body:JSON.stringify({name:document.getElementById("cName").value.trim(),text:text})}).then(function(r){return r.json();}).then(function(){ document.getElementById("cText").value=""; load(); });
        });
        load();
      })();
    </script>
    </body></html>`;
}

function renderSitemap() {
  const base = siteUrl();
  const urls = [
    { loc: base + "/", pri: "1.0" }, { loc: base + "/topup", pri: "0.9" }, { loc: base + "/blog", pri: "0.8" },
    { loc: base + "/tentang", pri: "0.6" }, { loc: base + "/faq", pri: "0.6" },
    ...db.articles.filter((a) => a.published).map((a) => ({ loc: base + "/blog/" + a.slug, pri: "0.7", mod: new Date(a.updatedAt || a.createdAt).toISOString() })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${u.loc}</loc>${u.mod ? `<lastmod>${u.mod}</lastmod>` : ""}<priority>${u.pri}</priority></url>`).join("\n") + `\n</urlset>`;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
async function handleApi(req, res, pathname, query) {
  const method = req.method;
  if (pathname === "/api/health" || pathname === "/healthz") return sendJSON(res, 200, { ok: true });
  if (pathname === "/api/auth/config" && method === "GET") return sendJSON(res, 200, { google: getGoogleConfig().ready, smtp: SMTP_READY });
  if (pathname.startsWith("/api/auth/") && method === "POST" && !rateLimit(req, "auth", 30, 60000))
    return sendJSON(res, 429, { error: "Terlalu banyak percobaan. Coba lagi sebentar." });
  // First-run: buat akun owner pertama bila belum ada akun dashboard
  if (pathname === "/api/auth/needs-setup" && method === "GET") return sendJSON(res, 200, { needsSetup: dashRoleCount() === 0 });
  if (pathname === "/api/auth/setup-owner" && method === "POST") {
    if (dashRoleCount() > 0) return sendJSON(res, 403, { error: "Owner sudah ada. Silakan login." });
    const b = await readBody(req);
    const email = (b.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return sendJSON(res, 400, { error: "Email tidak valid" });
    if (!b.password || b.password.length < 6) return sendJSON(res, 400, { error: "Password minimal 6 karakter" });
    const u = upsertUser({ email, name: b.name, provider: "email", passwordHash: hashPassword(b.password), role: "owner" });
    u.role = "owner"; saveDB();
    return sendJSON(res, 201, { token: createSession(u.id), user: publicUser(u) });
  }

  // ---- AUTH ----
  if (pathname === "/api/auth/register" && method === "POST") {
    const b = await readBody(req);
    const email = (b.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return sendJSON(res, 400, { error: "Email tidak valid" });
    if (!b.password || b.password.length < 6) return sendJSON(res, 400, { error: "Password minimal 6 karakter" });
    let u = findUser(email);
    if (u) {
      if (u.verified !== false) return sendJSON(res, 409, { error: "Email sudah terdaftar. Silakan masuk." });
      u.passwordHash = hashPassword(b.password);
      if (b.name) u.name = b.name;
    } else {
      u = upsertUser({ email, name: b.name, provider: "email", passwordHash: hashPassword(b.password) });
      u.verified = false;
    }
    saveDB();
    
    // Check if email OTP is required
    if (db.settings.requireEmailVerification === false) {
      if (u) { u.verified = true; saveDB(); }
      return sendJSON(res, 201, { ok: true, requiresVerification: false, token: createSession(u.id) });
    }

    const code = ("" + Math.floor(100000 + Math.random() * 900000));
    otpStore.set(email, { type: "verify", code, expires: Date.now() + 10 * 60 * 1000 });
    try {
      const r = await sendOtpEmail(email, code, "verifikasi pendaftaran", b.name, baseUrl(req));
      return sendJSON(res, 201, { ok: true, requiresVerification: true, sent: r.sent, devCode: r.devCode || undefined });
    } catch (e) {
      console.error(e);
      return sendJSON(res, 201, { ok: true, requiresVerification: true, sent: false, devCode: code, warning: "Mode dev" });
    }
  }
  
  if (pathname === "/api/auth/verify-register" && method === "POST") {
    const b = await readBody(req);
    const email = (b.email || "").trim().toLowerCase();
    const rec = otpStore.get(email);
    if (!rec || rec.type !== "verify" || rec.expires < Date.now()) return sendJSON(res, 400, { error: "Kode tidak valid/kedaluwarsa" });
    if (rec.code !== String(b.code || "").trim()) return sendJSON(res, 400, { error: "Kode OTP salah" });
    otpStore.delete(email);
    const u = findUser(email);
    if (u) { u.verified = true; saveDB(); }
    return sendJSON(res, 200, { token: createSession(u ? u.id : ""), user: publicUser(u) });
  }

  if (pathname === "/api/auth/login" && method === "POST") {
    const b = await readBody(req);
    const u = findUser((b.email || "").trim());
    if (!u) return sendJSON(res, 401, { error: "Akun belum terdaftar. Silakan daftar dulu." });
    if (!verifyPassword(b.password || "", u.passwordHash)) return sendJSON(res, 401, { error: "Password yang dimasukkan salah." });
    if (u.verified === false) return sendJSON(res, 403, { error: "Akun belum diverifikasi. Silakan verifikasi email.", unverified: true });
    return sendJSON(res, 200, { token: createSession(u.id), user: publicUser(u) });
  }

  if (pathname === "/api/auth/forgot-password" && method === "POST") {
    const b = await readBody(req);
    const email = (b.email || "").trim().toLowerCase();
    const u = findUser(email);
    if (!u || u.verified === false) return sendJSON(res, 404, { error: "Email tidak terdaftar atau belum verifikasi" });
    const code = ("" + Math.floor(100000 + Math.random() * 900000));
    otpStore.set(email, { type: "reset", code, expires: Date.now() + 10 * 60 * 1000 });
    try {
      const r = await sendOtpEmail(email, code, "reset password", u.name, baseUrl(req));
      return sendJSON(res, 200, { ok: true, sent: r.sent, devCode: r.devCode || undefined });
    } catch (e) {
      return sendJSON(res, 200, { ok: true, sent: false, devCode: code });
    }
  }

  if (pathname === "/api/auth/reset-password" && method === "POST") {
    const b = await readBody(req);
    const email = (b.email || "").trim().toLowerCase();
    const rec = otpStore.get(email);
    if (!rec || rec.type !== "reset" || rec.expires < Date.now()) return sendJSON(res, 400, { error: "Kode tidak valid/kedaluwarsa" });
    if (rec.code !== String(b.code || "").trim()) return sendJSON(res, 400, { error: "Kode OTP salah" });
    if (!b.password || b.password.length < 6) return sendJSON(res, 400, { error: "Password baru minimal 6 karakter" });
    otpStore.delete(email);
    const u = findUser(email);
    if (u) { u.passwordHash = hashPassword(b.password); saveDB(); }
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/auth/otp/request" && method === "POST") {
    const b = await readBody(req);
    const email = (b.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return sendJSON(res, 400, { error: "Email tidak valid" });
    const code = ("" + Math.floor(100000 + Math.random() * 900000));
    otpStore.set(email, { code, expires: Date.now() + 10 * 60 * 1000, name: b.name || "" });
    try {
      const r = await sendOtpEmail(email, code);
      return sendJSON(res, 200, { ok: true, sent: r.sent, devCode: r.devCode || undefined });
    } catch (e) {
      console.error("OTP email gagal:", e.message);
      return sendJSON(res, 200, { ok: true, sent: false, devCode: code, warning: "Email gagal terkirim, memakai mode dev." });
    }
  }
  
  if (pathname === "/api/auth/otp/resend" && method === "POST") {
    const b = await readBody(req);
    const email = (b.email || "").trim().toLowerCase();
    const type = b.type || "verify";
    const u = findUser(email);
    const name = u ? u.name : (b.name || "");
    
    // For verify, user might exist (but unverified) or be pending
    const code = ("" + Math.floor(100000 + Math.random() * 900000));
    otpStore.set(email, { type, code, expires: Date.now() + 10 * 60 * 1000, name });
    try {
      const r = await sendOtpEmail(email, code, type === "reset" ? "reset password" : "verifikasi pendaftaran", name, baseUrl(req));
      return sendJSON(res, 200, { ok: true, sent: r.sent, devCode: r.devCode || undefined });
    } catch (e) {
      return sendJSON(res, 200, { ok: true, sent: false, devCode: code, warning: "Mode dev" });
    }
  }
  if (pathname === "/api/auth/otp/verify" && method === "POST") {
    const b = await readBody(req);
    const email = (b.email || "").trim().toLowerCase();
    const rec = otpStore.get(email);
    if (!rec || rec.expires < Date.now()) return sendJSON(res, 400, { error: "Kode kedaluwarsa, minta ulang." });
    if (rec.code !== String(b.code || "").trim()) return sendJSON(res, 400, { error: "Kode OTP salah" });
    otpStore.delete(email);
    const u = upsertUser({ email, name: rec.name, provider: "otp" });
    return sendJSON(res, 200, { token: createSession(u.id), user: publicUser(u) });
  }
  if (pathname === "/api/auth/me" && method === "GET") {
    const u = userFromReq(req);
    if (!u) return sendJSON(res, 401, { error: "Unauthorized" });
    return sendJSON(res, 200, { user: publicUser(u) });
  }
  if (pathname === "/api/auth/logout" && method === "POST") {
    const token = req.headers["x-auth-token"]; if (token) sessions.delete(token);
    return sendJSON(res, 200, { ok: true });
  }
  if (pathname === "/api/auth/profile" && method === "PUT") {
    const u = userFromReq(req); if (!u) return sendJSON(res, 401, { error: "Unauthorized" });
    const b = await readBody(req);
    if (typeof b.name === "string") u.name = b.name.trim().slice(0, 60) || u.name;
    if (typeof b.phone === "string") u.phone = b.phone.trim().slice(0, 20);
    if (typeof b.bio === "string") u.bio = b.bio.trim().slice(0, 200);
    if (typeof b.picture === "string") u.picture = b.picture.trim().slice(0, 500);
    saveDB();
    return sendJSON(res, 200, { user: publicUser(u) });
  }
  if (pathname === "/api/auth/change-password" && method === "POST") {
    const u = userFromReq(req); if (!u) return sendJSON(res, 401, { error: "Unauthorized" });
    const b = await readBody(req);
    if (!b.newPassword || b.newPassword.length < 6) return sendJSON(res, 400, { error: "Password baru minimal 6 karakter" });
    if (u.passwordHash && !verifyPassword(b.oldPassword || "", u.passwordHash)) return sendJSON(res, 400, { error: "Password lama salah" });
    u.passwordHash = hashPassword(b.newPassword); saveDB();
    return sendJSON(res, 200, { ok: true });
  }

  // ---- Google OAuth ----
  if (pathname === "/api/auth/google" && method === "GET") {
    if (!getGoogleConfig().ready) return sendJSON(res, 503, { error: "Google login belum dikonfigurasi" });
    const redirectUri = baseUrl(req) + "/api/auth/google/callback";
    const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
      client_id: getGoogleConfig().id, redirect_uri: redirectUri, response_type: "code",
      scope: "openid email profile", access_type: "online", prompt: "select_account",
      state: query.from === "masuk" ? "masuk" : "dashboard",
    }).toString();
    return redirect(res, authUrl);
  }
  if (pathname === "/api/auth/google/callback" && method === "GET") {
    const dest = query.state === "masuk" ? "/masuk" : "/dashboard";
    try {
      const redirectUri = baseUrl(req) + "/api/auth/google/callback";
      const tokenResp = await httpsRequest("POST", "https://oauth2.googleapis.com/token", {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code: query.code, client_id: getGoogleConfig().id, client_secret: getGoogleConfig().secret, redirect_uri: redirectUri, grant_type: "authorization_code" }).toString(),
      });
      if (!tokenResp.access_token) return redirect(res, dest + "#error=google");
      const info = await httpsRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: "Bearer " + tokenResp.access_token } });
      if (!info.email) return redirect(res, dest + "#error=google");
      const u = upsertUser({ email: info.email, name: info.name, provider: "google", picture: info.picture });
      return redirect(res, dest + "#token=" + createSession(u.id));
    } catch (e) { console.error("Google callback:", e.message); return redirect(res, dest + "#error=google"); }
  }

  // ---- Public catalog ----
  if (pathname === "/api/store" && method === "GET") return sendJSON(res, 200, db.store);
  if (pathname === "/api/services" && method === "GET") return sendJSON(res, 200, db.services);
  if (pathname === "/api/games" && method === "GET") return sendJSON(res, 200, db.games);
  if (pathname === "/api/settings" && method === "GET") return sendJSON(res, 200, { store: db.store, settings: publicSettings() });
  if (pathname === "/api/track" && method === "GET") {
    const code = String(query.code || "").trim().toUpperCase();
    const o = db.orders.find((x) => x.code.toUpperCase() === code);
    if (!o) return sendJSON(res, 404, { error: "Pesanan tidak ditemukan" });
    return sendJSON(res, 200, { code: o.code, gameName: o.gameName, itemLabel: o.itemLabel, price: o.price, status: o.status, paymentMethod: o.paymentMethod, account: o.account, createdAt: o.createdAt });
  }
  if (pathname === "/api/articles" && method === "GET") return sendJSON(res, 200, db.articles.filter((a) => a.published).sort((a, b) => b.createdAt - a.createdAt).map(({ content, ...rest }) => rest));
  let am = pathname.match(/^\/api\/articles\/([a-z0-9-]+)$/);
  if (am && method === "GET") { const a = db.articles.find((x) => x.slug === am[1] && x.published); return a ? sendJSON(res, 200, a) : sendJSON(res, 404, { error: "Artikel tidak ditemukan" }); }
  // Komentar / komunitas per artikel
  let mc = pathname.match(/^\/api\/articles\/([a-z0-9-]+)\/comments$/);
  if (mc && method === "GET") { const slug = mc[1]; return sendJSON(res, 200, db.comments.filter((c) => c.slug === slug).sort((a, b) => a.createdAt - b.createdAt)); }
  if (mc && method === "POST") {
    if (!rateLimit(req, "comment", 15, 60000)) return sendJSON(res, 429, { error: "Terlalu cepat. Coba lagi sebentar." });
    const slug = mc[1]; const art = db.articles.find((a) => a.slug === slug && a.published);
    if (!art) return sendJSON(res, 404, { error: "Artikel tidak ditemukan" });
    const b = await readBody(req);
    const text = String(b.text || "").trim().slice(0, 500);
    if (!text) return sendJSON(res, 400, { error: "Komentar kosong" });
    const u = userFromReq(req);
    const name = (u && u.name) || String(b.name || "Anonim").trim().slice(0, 40) || "Anonim";
    const c = { id: nextId("comment"), slug, name, text, createdAt: Date.now() };
    db.comments.push(c); saveDB(); return sendJSON(res, 201, c);
  }

  // ---- Live chat komunitas (publik) ----
  if (pathname === "/api/community" && method === "GET") {
    const since = Number(query.since || 0);
    let msgs = db.community.filter((m) => !since || m.createdAt > since);
    return sendJSON(res, 200, msgs.slice(-80));
  }
  if (pathname === "/api/community" && method === "POST") {
    const u = userFromReq(req);
    if (!u) return sendJSON(res, 401, { error: "Login dulu untuk ikut ngobrol di komunitas." });
    if (!rateLimit(req, "community", 12, 60000)) return sendJSON(res, 429, { error: "Santai dulu, kirim lagi sebentar ya 🙏" });
    const b = await readBody(req);
    const text = String(b.text || "").trim().slice(0, 400);
    if (!text) return sendJSON(res, 400, { error: "Pesan kosong" });
    const name = u.name || (u.email ? u.email.split("@")[0] : "Member");
    const m = { id: nextId("cm"), name, text, createdAt: Date.now() };
    db.community.push(m);
    if (db.community.length > 500) db.community = db.community.slice(-500);
    saveDB();
    return sendJSON(res, 201, m);
  }

  // ---- Orders ----
  if (pathname === "/api/orders" && method === "POST") {
    const b = await readBody(req);
    const game = db.games.find((g) => g.id === b.gameId);
    const item = game && game.items.find((i) => i.id === b.itemId);
    if (!game || !item) return sendJSON(res, 400, { error: "Game atau item tidak valid" });
    if (typeof item.stock === "number" && item.stock <= 0) return sendJSON(res, 409, { error: "Stok item ini sedang habis" });
    
    const u = userFromReq(req);
    let finalPrice = item.price;
    let discount = 0;
    let appliedPromo = null;

    // Check new member discount (if no voucher code sent, and user logged in)
    const newMemberDiscount = Number(db.settings.newMemberDiscount) || 0;
    if (u && !b.voucherCode && newMemberDiscount > 0) {
      const userOrders = db.orders.filter(o => o.userId === u.id);
      if (userOrders.length === 0) {
        discount = Math.floor(item.price * (newMemberDiscount / 100));
        appliedPromo = "NEW_MEMBER";
      }
    }

    // Check voucher if provided
    let voucherObj = null;
    if (b.voucherCode) {
      voucherObj = db.vouchers.find(v => v.code === b.voucherCode && v.active !== false);
      if (!voucherObj) return sendJSON(res, 400, { error: "Kode voucher tidak valid" });
      if (voucherObj.validUntil && Date.now() > voucherObj.validUntil) return sendJSON(res, 400, { error: "Voucher sudah kadaluwarsa" });
      if (typeof voucherObj.quota === "number" && voucherObj.quota <= 0) return sendJSON(res, 400, { error: "Kuota voucher habis" });
      
      let vDisc = 0;
      if (voucherObj.type === "percent") vDisc = Math.floor(item.price * (voucherObj.value / 100));
      else vDisc = voucherObj.value;
      
      if (vDisc > 0) {
        discount = vDisc;
        appliedPromo = voucherObj.code;
      }
    }

    finalPrice = Math.max(0, finalPrice - discount);

    const order = { 
      id: nextId("order"), code: "INV" + Date.now().toString().slice(-8), gameId: game.id, gameName: game.name, 
      itemId: item.id, itemLabel: item.label, price: item.price, finalPrice, discount, promoCode: appliedPromo, 
      account: b.account || {}, customerName: b.customerName || (u && u.name) || "Guest", 
      customerContact: b.customerContact || "", paymentMethod: b.paymentMethod || "-", 
      status: "pending", userId: u ? u.id : null, createdAt: Date.now() 
    };

    if (typeof item.stock === "number") item.stock = Math.max(0, item.stock - 1);
    if (voucherObj && typeof voucherObj.quota === "number") voucherObj.quota -= 1;
    
    db.orders.push(order); saveDB();
    addNotification("admin", "Pesanan Baru", "Pesanan " + order.code + " dari " + (order.contact || "customer"), "shopping_cart");
    return sendJSON(res, 201, order);
  }
  // Status integrasi publik (boolean saja)
  if (pathname === "/api/integrations" && method === "GET") return sendJSON(res, 200, integrationStatus());
  // Verifikasi ID game otomatis (jika provider dikonfigurasi)
  if (pathname === "/api/game/check" && method === "GET") {
    const game = db.games.find((g) => g.id === query.gameId);
    if (!game) return sendJSON(res, 400, { error: "Game tidak valid" });
    try {
      const integ = db.settings.integrations || {};
      let apiUrl = game.checkIdUrl || integ.gameCheckUrl;
      if (!apiUrl) return sendJSON(res, 200, { supported: false });

      // Mendukung format template URL seperti: https://api.com/game/{gameId}?user={userId}&zone={zoneId}
      if (apiUrl.includes("{userId}") || apiUrl.includes("{gameId}")) {
        apiUrl = apiUrl.replace(/{gameId}/g, encodeURIComponent(game.id || ""))
                       .replace(/{userId}/g, encodeURIComponent(query.userId || ""))
                       .replace(/{zoneId}/g, encodeURIComponent(query.zoneId || ""));
      } else {
        const sep = apiUrl.includes("?") ? "&" : "?";
        apiUrl = apiUrl + sep + new URLSearchParams({ game: game.id, user_id: query.userId || "", zone_id: query.zoneId || "", key: integ.gameCheckKey || "" }).toString();
      }

      const headers = {};
      if (apiUrl.toLowerCase().includes("rapidapi")) {
        headers["X-RapidAPI-Key"] = integ.gameCheckKey || "";
        try { headers["X-RapidAPI-Host"] = new URL(apiUrl).hostname; } catch(e){}
      }

      const r = await httpsRequest("GET", apiUrl, { headers });
      const username = (r && (r.username || r.nickname || (r.data && (r.data.username || r.data.nickname)))) || null;
      return sendJSON(res, 200, { supported: true, username, ok: !!username, debug_api_response: r });
    } catch (e) { return sendJSON(res, 200, { supported: true, ok: false, username: null }); }
  }
  // Pesanan milik user yang login (customer)
  if (pathname === "/api/my/orders" && method === "GET") {
    const u = userFromReq(req);
    if (!u) return sendJSON(res, 401, { error: "Unauthorized" });
    return sendJSON(res, 200, db.orders.filter((o) => o.userId === u.id).sort((a, b) => b.createdAt - a.createdAt));
  }

  // ---- Protected (butuh login + akses admin) ----
  const meUser = userFromReq(req);
  const authed = !!meUser && isAdmin(meUser);
  const needAuth = () => sendJSON(res, meUser ? 403 : 401, { error: meUser ? "Akun ini tidak memiliki akses admin" : "Unauthorized" });

  if (pathname === "/api/orders" && method === "GET") { if (!authed) return needAuth(); return sendJSON(res, 200, [...db.orders].sort((a, b) => b.createdAt - a.createdAt)); }
  let m = pathname.match(/^\/api\/orders\/(\d+)$/);
  if (m && method === "PATCH") {
    if (!authed) return needAuth();
    const b = await readBody(req); const order = db.orders.find((o) => o.id === Number(m[1]));
    if (!order) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    if (b.status && ["pending", "paid", "processing", "done", "cancelled"].includes(b.status)) order.status = b.status;
    saveDB(); return sendJSON(res, 200, order);
  }
  if (pathname === "/api/admin/stats" && method === "GET") { if (!authed) return needAuth(); return sendJSON(res, 200, buildStats()); }

  // Settings penuh untuk admin (termasuk integrasi/API keys)
  if (pathname === "/api/admin/settings" && method === "GET") { if (!authed) return needAuth(); return sendJSON(res, 200, { store: db.store, settings: db.settings }); }



  // ---- Finansial (admin) ----
  if (pathname === "/api/admin/finance" && method === "GET") {
    if (!authed) return needAuth();
    const paid = ["paid", "processing", "done"];
    const orderIncome = db.orders.filter((o) => paid.includes(o.status)).reduce((s, o) => s + (o.price || 0), 0);
    const manualIn = db.finances.filter((f) => f.type === "in").reduce((s, f) => s + f.amount, 0);
    const manualOut = db.finances.filter((f) => f.type === "out").reduce((s, f) => s + f.amount, 0);
    return sendJSON(res, 200, {
      summary: { orderIncome, manualIn, manualOut, totalIn: orderIncome + manualIn, totalOut: manualOut, balance: orderIncome + manualIn - manualOut },
      entries: [...db.finances].sort((a, b) => b.createdAt - a.createdAt),
    });
  }
  if (pathname === "/api/admin/finance" && method === "POST") {
    if (!authed) return needAuth(); const b = await readBody(req);
    const amount = Number(b.amount);
    if (!["in", "out"].includes(b.type) || !(amount > 0)) return sendJSON(res, 400, { error: "Tipe/nominal tidak valid" });
    const f = { id: nextId("finance"), type: b.type, amount, note: (b.note || "").slice(0, 200), category: (b.category || "Lainnya").slice(0, 50), createdAt: Date.now() };
    db.finances.push(f); saveDB(); return sendJSON(res, 201, f);
  }
  let mf = pathname.match(/^\/api\/admin\/finance\/(\d+)$/);
  if (mf && method === "DELETE") {
    if (!authed) return needAuth();
    const i = db.finances.findIndex((f) => f.id === Number(mf[1]));
    if (i === -1) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    db.finances.splice(i, 1); saveDB(); return sendJSON(res, 200, { ok: true });
  }

  // ---- Manajemen akun & role (owner/admin) ----
  if (pathname === "/api/admin/users" && method === "GET") { if (!canManageUsers(meUser)) return needAuth(); return sendJSON(res, 200, db.users.map(publicUser)); }
  if (pathname === "/api/admin/users" && method === "POST") {
    if (!canManageUsers(meUser)) return needAuth();
    const b = await readBody(req);
    const email = (b.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return sendJSON(res, 400, { error: "Email tidak valid" });
    if (!b.password || b.password.length < 6) return sendJSON(res, 400, { error: "Password minimal 6 karakter" });
    const role = ["owner", "admin", "staff", "customer"].includes(b.role) ? b.role : "staff";
    if (role === "owner" && meUser.role !== "owner") return sendJSON(res, 403, { error: "Hanya owner yang bisa membuat owner" });
    const exist = findUser(email);
    if (exist && exist.passwordHash) return sendJSON(res, 409, { error: "Email sudah terdaftar" });
    const u = upsertUser({ email, name: b.name, provider: "email", passwordHash: hashPassword(b.password), role });
    u.role = role; saveDB();
    return sendJSON(res, 201, publicUser(u));
  }
  let mu = pathname.match(/^\/api\/admin\/users\/(\d+)$/);
  if (mu && method === "PUT") {
    if (!canManageUsers(meUser)) return needAuth();
    const b = await readBody(req); const u = db.users.find((x) => x.id === Number(mu[1]));
    if (!u) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    const role = ["owner", "admin", "staff", "customer"].includes(b.role) ? b.role : null;
    if (!role) return sendJSON(res, 400, { error: "Role tidak valid" });
    if (role === "owner" && meUser.role !== "owner") return sendJSON(res, 403, { error: "Hanya owner yang bisa menetapkan owner" });
    if (u.role === "owner" && role !== "owner" && db.users.filter((x) => x.role === "owner").length <= 1) return sendJSON(res, 400, { error: "Tidak bisa menurunkan owner terakhir" });
    u.role = role; saveDB(); return sendJSON(res, 200, publicUser(u));
  }
  if (mu && method === "DELETE") {
    if (!canManageUsers(meUser)) return needAuth();
    const u = db.users.find((x) => x.id === Number(mu[1]));
    if (!u) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    if (u.id === meUser.id) return sendJSON(res, 400, { error: "Tidak bisa menghapus akun sendiri" });
    if (u.role === "owner" && db.users.filter((x) => x.role === "owner").length <= 1) return sendJSON(res, 400, { error: "Tidak bisa menghapus owner terakhir" });
    db.users = db.users.filter((x) => x.id !== u.id); saveDB(); return sendJSON(res, 200, { ok: true });
  }

  // ---- ADMIN: kelola konten (butuh login) ----
  if (pathname === "/api/admin/settings" && method === "PUT") {
    if (!authed) return needAuth();
    const b = await readBody(req);
    if (b.store && typeof b.store === "object") db.store = { ...db.store, ...b.store };
    if (b.settings && typeof b.settings === "object") db.settings = { ...db.settings, ...b.settings };
    saveDB(); return sendJSON(res, 200, { store: db.store, settings: db.settings });
  }
  if (pathname === "/api/admin/services" && method === "PUT") {
    if (!authed) return needAuth(); const b = await readBody(req);
    if (Array.isArray(b.services)) db.services = b.services;
    saveDB(); return sendJSON(res, 200, db.services);
  }
  if (pathname === "/api/admin/games" && method === "PUT") {
    if (!authed) return needAuth(); const b = await readBody(req);
    if (Array.isArray(b.games)) db.games = b.games;
    saveDB(); return sendJSON(res, 200, db.games);
  }
  if (pathname === "/api/admin/upload" && method === "POST") {
    if (!authed) return needAuth();
    const b = await readBody(req); const r = await saveImageUpload(b.dataUrl);
    return sendJSON(res, r.status, r.body);
  }
  if (pathname === "/api/upload" && method === "POST") {
    const u = userFromReq(req); if (!u) return sendJSON(res, 401, { error: "Login dulu untuk upload." });
    if (!rateLimit(req, "upload", 20, 60000)) return sendJSON(res, 429, { error: "Terlalu sering upload, coba lagi sebentar." });
    const b = await readBody(req); const r = await saveImageUpload(b.dataUrl);
    return sendJSON(res, r.status, r.body);
  }
  if (pathname === "/api/admin/sync-games" && method === "POST") {
    if (!authed) return needAuth();
    const integ = db.settings.integrations || {};
    const provider = (integ.gameProvider || "").toLowerCase();
    const isDigiflazz = provider.includes("digiflazz");
    if (!isDigiflazz && !integ.gameProviderUrl) return sendJSON(res, 400, { error: "Isi dulu URL API provider (atau set Nama Provider = digiflazz) di Integrasi & API." });
    try {
      let raw;
      if (isDigiflazz) {
        const username = (integ.gameProviderUser || "").trim();
        const key = (integ.gameProviderKey || "").trim();
        if (!username || !key) return sendJSON(res, 400, { error: "Digiflazz butuh Username + API Key. Isi keduanya di Integrasi." });
        const sign = crypto.createHash("md5").update(username + key + "pricelist").digest("hex");
        const url = (integ.gameProviderUrl || "").trim() || "https://api.digiflazz.com/v1/price-list";
        const payload = JSON.stringify({ cmd: "prepaid", username, sign });
        raw = await httpsRequest("POST", url, { headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }, body: payload });
      } else {
        const headers = integ.gameProviderKey ? { "Authorization": "Bearer " + integ.gameProviderKey, "X-API-Key": integ.gameProviderKey } : {};
        raw = await httpsRequest("GET", integ.gameProviderUrl, { headers });
      }
      const list = Array.isArray(raw) ? raw
        : Array.isArray(raw && raw.data) ? raw.data
        : Array.isArray(raw && raw.products) ? raw.products
        : Array.isArray(raw && raw.pricelist) ? raw.pricelist : null;
      if (!list) return sendJSON(res, 502, { error: (raw && (raw.message || (raw.data && raw.data.message))) || "Format respons provider tidak dikenali (perlu array produk atau {data:[...]})." });
      const byGame = {};
      list.forEach((p, i) => {
        const gname = String(p.brand || p.game || p.category || p.kategori || "Lainnya").trim();
        const gid = slugify(gname) || ("g" + i);
        const price = Number(p.price != null ? p.price : (p.harga != null ? p.harga : (p.harga_jual != null ? p.harga_jual : (p.amount || 0))));
        const label = String(p.product_name || p.name || p.nama || p.desc || p.layanan || "Item").trim();
        const sku = String(p.buyer_sku_code || p.sku || p.code || p.kode || (gid + "-" + i));
        (byGame[gid] || (byGame[gid] = { id: gid, name: gname, items: [] })).items.push({ id: sku, label, price });
      });
      const incoming = Object.values(byGame).filter((g) => g.items.length);
      if (!incoming.length) return sendJSON(res, 502, { error: "Tidak ada produk terbaca dari provider." });
      const prevById = {}; db.games.forEach((g) => (prevById[g.id] = g));
      incoming.forEach((g) => {
        const prev = prevById[g.id];
        if (prev) { prev.items = g.items; if (!prev.name) prev.name = g.name; }
        else db.games.push({ id: g.id, name: g.name, publisher: "", image: "", description: "", video: "", screenshots: [], needs: ["User ID"], items: g.items });
      });
      saveDB();
      return sendJSON(res, 200, { ok: true, games: db.games.length, items: incoming.reduce((s, g) => s + g.items.length, 0) });
    } catch (e) {
      return sendJSON(res, 502, { error: "Gagal menghubungi provider: " + (e && e.message ? e.message : String(e)) });
    }
  }

  // ---- Reviews ----
  if (pathname === "/api/reviews" && method === "GET") {
    const limit = Number(query.limit) || 20;
    const sorted = [...(db.reviews || [])].sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
    return sendJSON(res, 200, sorted);
  }
  if (pathname === "/api/reviews" && method === "POST") {
    if (!rateLimit(req, "submit_review", 5, 3600000)) return sendJSON(res, 429, { error: "Terlalu banyak ulasan, coba lagi nanti." });
    const b = await readBody(req);
    if (!b.orderId || !b.rating) return sendJSON(res, 400, { error: "ID pesanan dan rating wajib diisi" });
    const order = db.orders.find(o => o.code === b.orderId);
    if (!order) return sendJSON(res, 404, { error: "Pesanan tidak ditemukan" });
    db.reviews ||= [];
    if (db.reviews.some(r => r.orderId === b.orderId)) return sendJSON(res, 400, { error: "Pesanan ini sudah diberi ulasan." });
    
    let cName = "Anonim";
    let cPicture = "";
    if (!b.anonymous) {
      const me = userFromReq(req);
      if (me) {
        cName = me.name || me.email.split("@")[0];
        cPicture = me.picture || "";
      } else if (order.contact && order.contact.length >= 6) {
        cName = order.contact.substring(0, 4) + "***" + order.contact.slice(-2);
      }
    } else if (order.contact && order.contact.length >= 6) {
      cName = order.contact.substring(0, 4) + "***" + order.contact.slice(-2);
    }
    
    const rtg = Math.max(1, Math.min(5, Number(b.rating)));
    const review = {
      id: nextId("review"),
      orderId: order.code,
      userId: order.userId,
      customerName: cName,
      customerPicture: cPicture,
      gameName: order.gameName,
      rating: rtg,
      comment: (b.comment || "").slice(0, 500).trim(),
      createdAt: Date.now()
    };
    db.reviews.push(review);
    saveDB();
    addNotification("admin", "Ulasan Baru", cName + " memberi " + rtg + " bintang", "star");
    return sendJSON(res, 201, { ok: true, review });
  }

  // ---- NEW ENDPOINTS (Clients, Stats, Profile Stats, Notifications) ----
  if (pathname === "/api/stats" && method === "GET") {
    const reviews = db.reviews || [];
    const avg = reviews.length ? (reviews.reduce((s,r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0";
    return sendJSON(res, 200, {
      totalOrders: (db.orders || []).length,
      totalGames: (db.games || []).length,
      avgRating: avg,
      totalReviews: reviews.length
    });
  }
  if (pathname === "/api/clients" && method === "GET") {
    return sendJSON(res, 200, db.clients || []);
  }
  if (pathname === "/api/admin/clients" && method === "POST") {
    if (!authed) return needAuth();
    const b = await readBody(req);
    if (!b.name) return sendJSON(res, 400, { error: "Nama klien wajib diisi" });
    const client = { id: nextId("client"), name: b.name, logo: b.logo || "", url: b.url || "", createdAt: Date.now() };
    db.clients ||= []; db.clients.push(client); saveDB();
    return sendJSON(res, 201, client);
  }
  let mclient = pathname.match(/^\/api\/admin\/clients\/(\d+)$/);
  if (mclient && method === "DELETE") {
    if (!authed) return needAuth();
    const i = (db.clients||[]).findIndex(c => c.id === Number(mclient[1]));
    if (i === -1) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    db.clients.splice(i, 1); saveDB();
    return sendJSON(res, 200, { ok: true });
  }
  
  if (pathname === "/api/my/profile-stats" && method === "GET") {
    const me = userFromReq(req);
    if (!me) return sendJSON(res, 401, { error: "Login diperlukan" });
    const myOrders = (db.orders || []).filter(o => o.contact === me.email || o.userId === me.id);
    const doneOrders = myOrders.filter(o => o.status === "done");
    const totalSpend = myOrders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.price || 0), 0);
    const hasReview = (db.reviews || []).some(r => r.userId === me.id);
    const last24h = myOrders.filter(o => (Date.now() - o.createdAt) < 86400000).length;
    
    const done = doneOrders.length;
    let tier = "Newbie", tierColor = "slate";
    if (done >= 100) { tier = "Diamond"; tierColor = "cyan"; }
    else if (done >= 50) { tier = "Platinum"; tierColor = "violet"; }
    else if (done >= 25) { tier = "Gold"; tierColor = "amber"; }
    else if (done >= 10) { tier = "Silver"; tierColor = "gray"; }
    else if (done >= 3) { tier = "Bronze"; tierColor = "orange"; }
    
    const tiers = [{name:"Newbie",min:0},{name:"Bronze",min:3},{name:"Silver",min:10},{name:"Gold",min:25},{name:"Platinum",min:50},{name:"Diamond",min:100}];
    const currentIdx = tiers.findIndex(t => t.name === tier);
    const nextTier = tiers[currentIdx + 1] || null;
    const progress = nextTier ? Math.min(100, Math.round((done / nextTier.min) * 100)) : 100;
    
    const achievements = [
      { id: "first", icon: "🎮", name: "Pembelian Pertama", desc: "Selesaikan 1 pesanan", unlocked: done >= 1 },
      { id: "active", icon: "🔥", name: "Gamer Aktif", desc: "Selesaikan 5 pesanan", unlocked: done >= 5 },
      { id: "spender", icon: "💎", name: "Top Spender", desc: "Total belanja ≥ Rp500.000", unlocked: totalSpend >= 500000 },
      { id: "reviewer", icon: "🌟", name: "Reviewer", desc: "Kirim ulasan pertama", unlocked: hasReview },
      { id: "loyal", icon: "👑", name: "Pelanggan Setia", desc: "Selesaikan 25 pesanan", unlocked: done >= 25 },
      { id: "speed", icon: "⚡", name: "Speed Runner", desc: "3 pesanan dalam 24 jam", unlocked: last24h >= 3 }
    ];
    
    return sendJSON(res, 200, { tier, tierColor, progress, nextTier: nextTier ? nextTier.name : null, nextTierMin: nextTier ? nextTier.min : null, doneCount: done, achievements });
  }

  if (pathname === "/api/my/notifications" && method === "GET") {
    const me = userFromReq(req);
    if (!me) return sendJSON(res, 401, { error: "Login diperlukan" });
    const mine = (db.notifications || []).filter(n => n.target === "user:" + me.id).sort((a,b) => b.createdAt - a.createdAt).slice(0, 30);
    return sendJSON(res, 200, mine);
  }
  let mn = pathname.match(/^\/api\/my\/notifications\/(\d+)\/read$/);
  if (mn && method === "POST") {
    const me = userFromReq(req);
    if (!me) return sendJSON(res, 401, { error: "Login diperlukan" });
    const n = (db.notifications || []).find(x => x.id === Number(mn[1]) && x.target === "user:" + me.id);
    if (n) { n.read = true; saveDB(); }
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/admin/notifications" && method === "GET") {
    if (!authed) return needAuth();
    const mine = (db.notifications || []).filter(n => n.target === "admin").sort((a,b) => b.createdAt - a.createdAt).slice(0, 50);
    return sendJSON(res, 200, mine);
  }
  let mna = pathname.match(/^\/api\/admin\/notifications\/(\d+)\/read$/);
  if (mna && method === "POST") {
    if (!authed) return needAuth();
    const n = (db.notifications || []).find(x => x.id === Number(mna[1]) && x.target === "admin");
    if (n) { n.read = true; saveDB(); }
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/admin/articles" && method === "GET") { if (!authed) return needAuth(); return sendJSON(res, 200, [...db.articles].sort((a, b) => b.createdAt - a.createdAt)); }
  if (pathname === "/api/admin/articles" && method === "POST") {
    if (!authed) return needAuth(); const b = await readBody(req);
    if (!b.title) return sendJSON(res, 400, { error: "Judul wajib diisi" });
    let slug = b.slug ? slugify(b.slug) : slugify(b.title);
    if (db.articles.some((a) => a.slug === slug)) slug = slug + "-" + Date.now().toString().slice(-4);
    const now = Date.now();
    const art = { id: nextId("article"), slug, title: b.title, excerpt: b.excerpt || "", cover: b.cover || "", tags: Array.isArray(b.tags) ? b.tags : (b.tags ? String(b.tags).split(",").map((t) => t.trim()).filter(Boolean) : []), author: b.author || "Tim Anshel Store", content: b.content || "", published: b.published !== false, createdAt: now, updatedAt: now };
    db.articles.push(art); saveDB(); return sendJSON(res, 201, art);
  }
  let ma = pathname.match(/^\/api\/admin\/articles\/(\d+)$/);
  if (ma && method === "PUT") {
    if (!authed) return needAuth(); const b = await readBody(req);
    const art = db.articles.find((a) => a.id === Number(ma[1]));
    if (!art) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    if (b.title != null) art.title = b.title;
    if (b.slug != null) art.slug = slugify(b.slug) || art.slug;
    if (b.excerpt != null) art.excerpt = b.excerpt;
    if (b.cover != null) art.cover = b.cover;
    if (b.author != null) art.author = b.author;
    if (b.content != null) art.content = b.content;
    if (b.published != null) art.published = !!b.published;
    if (b.tags != null) art.tags = Array.isArray(b.tags) ? b.tags : String(b.tags).split(",").map((t) => t.trim()).filter(Boolean);
    art.updatedAt = Date.now(); saveDB(); return sendJSON(res, 200, art);
  }
  if (ma && method === "DELETE") {
    if (!authed) return needAuth();
    const i = db.articles.findIndex((a) => a.id === Number(ma[1]));
    if (i === -1) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    db.articles.splice(i, 1); saveDB(); return sendJSON(res, 200, { ok: true });
  }

  // ---- Chat: customer (publik) ----
  if (pathname === "/api/chat/start" && method === "POST") {
    const b = await readBody(req);
    const conv = { id: nextId("conversation"), name: b.name || "Pengunjung", mode: "ai", agentName: null, unread: 0, createdAt: Date.now(), lastTs: Date.now(), lastText: "" };
    db.conversations.push(conv); saveDB();
    return sendJSON(res, 201, { conversation: conv, messages: [addMessage(conv.id, "ai", `Halo Kak ${conv.name}! 👋 Kenalin aku asisten AI Anshel Store. Mau top up game apa nih hari ini?`)] });
  }
  if (pathname === "/api/chat/message" && method === "POST") {
    const b = await readBody(req); const conv = db.conversations.find((c) => c.id === Number(b.conversationId));
    if (!conv) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    if (!b.text || !b.text.trim()) return sendJSON(res, 400, { error: "Pesan kosong" });
    const out = [addMessage(conv.id, "customer", b.text.trim())];
    if (conv.mode === "ai") { out.push(addMessage(conv.id, "ai", await generateAIReply(b.text, conv.id))); if (shouldEscalate(b.text)) { conv.escalate = true; saveDB(); } }
    return sendJSON(res, 200, { mode: conv.mode, messages: out });
  }
  m = pathname.match(/^\/api\/conversations\/(\d+)\/messages$/);
  if (m && method === "GET") { const cid = Number(m[1]); const since = Number(query.since || 0); return sendJSON(res, 200, db.messages.filter((x) => x.conversationId === cid && x.id > since)); }

  // ---- Inbox (protected) ----
  if (pathname === "/api/conversations" && method === "GET") { if (!authed) return needAuth(); return sendJSON(res, 200, [...db.conversations].sort((a, b) => b.lastTs - a.lastTs)); }
  m = pathname.match(/^\/api\/conversations\/(\d+)\/read$/);
  if (m && method === "POST") { if (!authed) return needAuth(); const c = db.conversations.find((x) => x.id === Number(m[1])); if (c) { c.unread = 0; saveDB(); } return sendJSON(res, 200, c || {}); }
  m = pathname.match(/^\/api\/conversations\/(\d+)\/takeover$/);
  if (m && method === "POST") { if (!authed) return needAuth(); const b = await readBody(req); const c = db.conversations.find((x) => x.id === Number(m[1])); if (!c) return sendJSON(res, 404, { error: "Tidak ditemukan" }); c.mode = "human"; c.agentName = b.agentName || (userFromReq(req) || {}).name || "Agent"; c.escalate = false; addMessage(c.id, "ai", `🧑‍💼 ${c.agentName} telah bergabung dan akan membantu Anda.`); saveDB(); return sendJSON(res, 200, c); }
  m = pathname.match(/^\/api\/conversations\/(\d+)\/release$/);
  if (m && method === "POST") { if (!authed) return needAuth(); const c = db.conversations.find((x) => x.id === Number(m[1])); if (!c) return sendJSON(res, 404, { error: "Tidak ditemukan" }); c.mode = "ai"; c.agentName = null; addMessage(c.id, "ai", "🤖 Percakapan dikembalikan ke asisten AI. Ada lagi yang bisa dibantu?"); saveDB(); return sendJSON(res, 200, c); }
  m = pathname.match(/^\/api\/conversations\/(\d+)\/agent-message$/);
  if (m && method === "POST") { if (!authed) return needAuth(); const b = await readBody(req); const c = db.conversations.find((x) => x.id === Number(m[1])); if (!c) return sendJSON(res, 404, { error: "Tidak ditemukan" }); if (!b.text || !b.text.trim()) return sendJSON(res, 400, { error: "Pesan kosong" }); return sendJSON(res, 200, addMessage(c.id, "agent", b.text.trim())); }

  if (pathname === "/api/admin/vouchers" && method === "GET") {
    if (!authed) return needAuth();
    return sendJSON(res, 200, db.vouchers || []);
  }
  if (pathname === "/api/admin/vouchers" && method === "POST") {
    if (!authed) return needAuth();
    const b = await readBody(req);
    if (!b.code || !b.value) return sendJSON(res, 400, { error: "Kode dan nilai diskon wajib" });
    const voucher = { id: nextId("voucher"), code: b.code.toUpperCase(), type: b.type || "flat", value: Number(b.value), quota: b.quota ? Number(b.quota) : null, validUntil: b.validUntil ? Number(b.validUntil) : null, active: true, createdAt: Date.now() };
    db.vouchers ||= []; db.vouchers.push(voucher); saveDB();
    return sendJSON(res, 201, voucher);
  }
  let mvoucher = pathname.match(/^\/api\/admin\/vouchers\/(\d+)$/);
  if (mvoucher && method === "DELETE") {
    if (!authed) return needAuth();
    const i = (db.vouchers||[]).findIndex(v => v.id === Number(mvoucher[1]));
    if (i === -1) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    db.vouchers.splice(i, 1); saveDB();
    return sendJSON(res, 200, { ok: true });
  }
  
  if (pathname === "/api/admin/settings/discount" && method === "POST") {
    if (!authed) return needAuth();
    const b = await readBody(req);
    db.settings.newMemberDiscount = Number(b.newMemberDiscount) || 0;
    saveDB();
    return sendJSON(res, 200, { ok: true });
  }

  if (pathname === "/api/vouchers/check" && method === "POST") {
    const b = await readBody(req);
    const u = userFromReq(req);
    
    if (!b.code) {
      const nmDisc = Number(db.settings.newMemberDiscount) || 0;
      if (u && nmDisc > 0 && db.orders.filter(o => o.userId === u.id).length === 0) {
        return sendJSON(res, 200, { valid: true, type: "percent", value: nmDisc, code: "NEW_MEMBER" });
      }
      return sendJSON(res, 200, { valid: false });
    }

    const v = (db.vouchers || []).find(x => x.code === b.code.toUpperCase() && x.active !== false);
    if (!v) return sendJSON(res, 400, { error: "Kode voucher tidak ditemukan atau tidak valid" });
    if (v.validUntil && Date.now() > v.validUntil) return sendJSON(res, 400, { error: "Voucher sudah kadaluwarsa" });
    if (typeof v.quota === "number" && v.quota <= 0) return sendJSON(res, 400, { error: "Kuota voucher habis digunakan" });

    return sendJSON(res, 200, { valid: true, type: v.type, value: v.value, code: v.code });
  }

  return sendJSON(res, 404, { error: "Endpoint tidak ditemukan" });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const host = req.headers.host || "";
  if (host.startsWith("www.anshelstore.biz.id")) {
    res.writeHead(301, { "Location": "https://anshelstore.biz.id" + req.url });
    return res.end();
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  setSecurityHeaders(res);
  try {
    if (pathname.startsWith("/api/") || pathname === "/healthz") return await handleApi(req, res, pathname, parsed.query);
    // Sembunyikan .html: redirect permanen ke URL bersih (kecuali file verifikasi google)
    if (pathname.endsWith(".html") && !pathname.startsWith("/google")) {
      let clean = pathname.replace(/\.html$/, "");
      if (clean === "/index") clean = "/";
      res.writeHead(301, { Location: clean + (parsed.search || "") });
      return res.end();
    }
    // SEO routes (server-rendered)
    if (pathname === "/robots.txt") { res.writeHead(200, { "Content-Type": "text/plain" }); return res.end(`User-agent: *\nAllow: /\nDisallow: /dashboard\nSitemap: ${siteUrl()}/sitemap.xml\n`); }
    if (pathname === "/sitemap.xml") { res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" }); return res.end(renderSitemap()); }
    if (pathname.startsWith("/uploads/")) {
      const name = path.basename(pathname);
      if (pgPool) {
        try {
          const r = await pgPool.query("SELECT mime, data FROM uploads WHERE name = $1", [name]);
          if (r.rows.length) { res.writeHead(200, { "Content-Type": r.rows[0].mime, "Cache-Control": "public, max-age=31536000" }); return res.end(r.rows[0].data); }
        } catch (e) {}
        res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("Not found");
      }
      const fp = path.join(UPLOAD_DIR, name); if (!fp.startsWith(UPLOAD_DIR)) { res.writeHead(403); return res.end("Forbidden"); } return serveFile(req, res, fp);
    }
    if (["/blog", "/blog/", "/artikel", "/artikel/"].includes(pathname)) { return sendCompressed(req, res, renderBlogList(parsed.query.tag), "text/html; charset=utf-8"); }
    const bm = pathname.match(/^\/(?:blog|artikel)\/([a-z0-9-]+)\/?$/);
    if (bm) {
      const a = db.articles.find((x) => x.slug === bm[1] && x.published);
      if (a) { return sendCompressed(req, res, renderArticle(a), "text/html; charset=utf-8"); }
      fs.readFile(path.join(PUBLIC_DIR, "404.html"), "utf-8", (err404, content404) => {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });
        return res.end(content404 || "<h1>404 - Artikel tidak ditemukan</h1>");
      });
      return;
    }
    return serveStatic(req, res, pathname);
  } catch (err) { console.error("Server error:", err); sendJSON(res, 500, { error: "Internal server error" }); }
});
loadDB().then(() => {
  server.listen(PORT, HOST, () => {
    console.log(`Anshel Store berjalan di http://${HOST}:${PORT}`);
    console.log(`  Database: ${pgPool ? "PostgreSQL" : "file JSON (" + DB_PATH + ")"}`);
    console.log(`  Email OTP: ${SMTP_READY ? "AKTIF (SMTP)" : "mode dev (kode tampil di layar/log)"}`);
    console.log(`  Google login: ${getGoogleConfig().ready ? "AKTIF" : "belum dikonfigurasi"}`);
  });
});
