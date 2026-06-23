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
const url = require("url");
const crypto = require("crypto");

const PORT = process.env.PORT || 8080;
const HOST = "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
// DATA_DIR bisa diarahkan ke Railway Volume (mis. /data) agar data persisten lintas deploy.
const SEED_PATH = path.join(__dirname, "data", "db.json");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

const SMTP = {
  host: process.env.SMTP_HOST, port: process.env.SMTP_PORT || 465,
  user: process.env.SMTP_USER, pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || process.env.SMTP_USER,
};
const GOOGLE = { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET };
const SMTP_READY = !!(SMTP.host && SMTP.user && SMTP.pass);
const GOOGLE_READY = !!(GOOGLE.id && GOOGLE.secret);

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------
let db;
try {
  // Bootstrap: jika DB belum ada di DATA_DIR (mis. volume baru), salin dari seed bawaan.
  if (!fs.existsSync(DB_PATH)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(SEED_PATH) && SEED_PATH !== DB_PATH) fs.copyFileSync(SEED_PATH, DB_PATH);
  }
  db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
} catch (e) { console.error("DB load:", e.message); db = {}; }
let saveTimer = null;
function saveDB() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = DB_PATH + ".tmp";
    fs.writeFile(tmp, JSON.stringify(db, null, 2), (e) => {
      if (e) return console.error("save:", e.message);
      fs.rename(tmp, DB_PATH, (er) => er && console.error("rename:", er.message)); // atomic
    });
  }, 150);
}
db.store ||= {}; db.services ||= []; db.games ||= []; db.settings ||= {}; db.articles ||= [];
db.orders ||= []; db.conversations ||= []; db.messages ||= []; db.users ||= [];
db._seq ||= {}; ["order", "conversation", "message", "user", "article"].forEach((k) => (db._seq[k] ||= 0));

function nextId(kind) { db._seq[kind] = (db._seq[kind] || 0) + 1; return db._seq[kind]; }

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
  return token;
}
function userFromReq(req) {
  const token = req.headers["x-auth-token"];
  if (!token) return null;
  const s = sessions.get(token);
  if (!s || s.expires < Date.now()) { sessions.delete(token); return null; }
  return db.users.find((u) => u.id === s.userId) || null;
}
function isAdmin(u) { return !!u && (ADMIN_EMAILS.length === 0 || ADMIN_EMAILS.includes(String(u.email).toLowerCase())); }
function publicUser(u) { return u && { id: u.id, email: u.email, name: u.name, picture: u.picture || null, provider: u.provider, admin: isAdmin(u) }; }
function findUser(email) { return db.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase()); }
function upsertUser({ email, name, provider, picture, passwordHash }) {
  let u = findUser(email);
  if (u) {
    if (name && !u.name) u.name = name;
    if (picture) u.picture = picture;
    if (passwordHash) u.passwordHash = passwordHash;
  } else {
    u = { id: nextId("user"), email, name: name || email.split("@")[0], provider: provider || "email", picture: picture || null, passwordHash: passwordHash || null, createdAt: Date.now() };
    db.users.push(u);
  }
  saveDB();
  return u;
}

// ---------------------------------------------------------------------------
// Email (SMTP via implicit TLS, mis. port 465). Fallback: log + dev code.
// ---------------------------------------------------------------------------
function smtpSend({ to, subject, text }) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: SMTP.host, port: Number(SMTP.port), servername: SMTP.host });
    const b64 = (s) => Buffer.from(s).toString("base64");
    const cmds = [
      "EHLO anshelstore", "AUTH LOGIN", b64(SMTP.user), b64(SMTP.pass),
      `MAIL FROM:<${SMTP.from}>`, `RCPT TO:<${to}>`, "DATA",
      `From: anshelstore <${SMTP.from}>\r\nTo: <${to}>\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${text}\r\n.`,
      "QUIT",
    ];
    let step = 0, buf = "";
    socket.setEncoding("utf8");
    socket.setTimeout(15000, () => { socket.destroy(); reject(new Error("SMTP timeout")); });
    socket.on("data", (d) => {
      buf += d;
      const lines = buf.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1];
      if (!/^\d{3} /.test(last)) return;
      const code = parseInt(last.slice(0, 3), 10);
      buf = "";
      if (code >= 400) { socket.end(); return reject(new Error("SMTP " + code + ": " + last)); }
      if (step < cmds.length) socket.write(cmds[step++] + "\r\n");
      else { socket.end(); resolve(true); }
    });
    socket.on("error", reject);
  });
}
async function sendOtpEmail(to, code) {
  const subject = "Kode OTP anshelstore";
  const text = `Kode verifikasi anshelstore kamu: ${code}\n\nKode berlaku 10 menit. Jangan bagikan ke siapa pun.`;
  if (SMTP_READY) { await smtpSend({ to, subject, text }); return { sent: true }; }
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
function generateAIReply(text) {
  const t = (text || "").toLowerCase(); const has = (...w) => w.some((x) => t.includes(x));
  if (has("admin", "manusia", "agent", "agen", "cs", "komplain", "refund")) return "Baik, saya teruskan ke tim kami. Mohon tunggu sebentar, agent akan segera mengambil alih percakapan ini. 🙏";
  if (has("top up", "topup", "diamond", "uc", "vp", "voucher")) return "Untuk top up game, sebutkan: 1) nama game, 2) nominal, 3) User ID. Atau buka halaman Top Up. Game tersedia: Mobile Legends, Free Fire, Genshin, Valorant, PUBG. 🎮";
  if (has("harga", "biaya", "price", "tarif", "berapa")) return "Jasa Automation mulai Rp500.000, AI Chatbot + Dashboard mulai Rp1.500.000, Top Up Game mulai Rp5.000. Boleh ceritakan kebutuhanmu biar saya estimasikan lebih akurat?";
  if (has("chatbot", "ai", "automation", "otomasi", "bot", "dashboard")) return "Jasa AI Chat Automation kami: chatbot AI 24/7 + dashboard inbox dengan human takeover. Mau saya jadwalkan konsultasi gratis?";
  if (has("halo", "hai", "hi", "pagi", "siang", "sore", "malam", "assalam")) return "Halo! 👋 Selamat datang di anshelstore. Ada yang bisa saya bantu? Kami melayani AI Chat Automation, Workflow Automation, dan Top Up Game.";
  if (has("terima kasih", "makasih", "thanks", "thank")) return "Sama-sama! 😊 Kalau ada yang lain, jangan ragu chat lagi ya.";
  return "Terima kasih atas pesannya! Bisa dijelaskan lebih detail kebutuhanmu? Ketik 'admin' kalau ingin terhubung dengan tim kami.";
}
function shouldEscalate(text) { const t = (text || "").toLowerCase(); return ["manusia", "admin", "agent", "agen", "komplain", "marah", "refund"].some((w) => t.includes(w)); }

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------
function sendJSON(res, status, data) { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(data)); }
function redirect(res, location) { res.writeHead(302, { Location: location }); res.end(); }
function readBody(req) { return new Promise((resolve) => { let raw = ""; req.on("data", (c) => (raw += c)); req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } }); }); }
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webp": "image/webp" };
function serveFile(res, filePath) {
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); return res.end("<h1>404 - Tidak ditemukan</h1>"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  });
}
function serveStatic(req, res, pathname) {
  if (pathname === "/dashboard" || pathname === "/dashboard/") return serveFile(res, path.join(PUBLIC_DIR, "dashboard.html"));
  const rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end("Forbidden"); }
  serveFile(res, filePath);
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
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
<script src="/js/theme.js"></script>
<link href="/css/theme.css" rel="stylesheet"/>`;

function pageNav() { return `<div id="siteNav"></div>`; }
function pageFooter() { return `<div id="siteFooter"></div>`; }

function renderBlogList() {
  const arts = db.articles.filter((a) => a.published).sort((a, b) => b.createdAt - a.createdAt);
  const cards = arts.map((a) => `
    <a href="/blog/${a.slug}" class="group bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm shadow-primary/5 border border-outline-variant/20 hover:-translate-y-2 hover:shadow-lg transition-all duration-300 flex flex-col">
      <div class="aspect-[16/9] overflow-hidden bg-surface-container">${a.cover ? `<img src="${escHtml(a.cover)}" alt="${escHtml(a.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>` : ""}</div>
      <div class="p-md flex flex-col gap-xs flex-grow">
        <div class="flex flex-wrap gap-xs">${(a.tags || []).slice(0, 2).map((t) => `<span class="bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm px-xs py-[2px] rounded-full">${escHtml(t)}</span>`).join("")}</div>
        <h2 class="font-headline-md text-headline-md text-on-surface leading-tight">${escHtml(a.title)}</h2>
        <p class="font-body-md text-body-md text-on-surface-variant flex-grow">${escHtml(a.excerpt)}</p>
        <span class="font-label-md text-label-md text-primary inline-flex items-center gap-xs mt-xs">Baca selengkapnya <span class="material-symbols-outlined text-[18px]">arrow_forward</span></span>
      </div>
    </a>`).join("");
  return `<!DOCTYPE html><html class="light" lang="id"><head>
    <meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>Artikel & Tips — anshelstore</title>
    <meta name="description" content="Artikel, tips top up game, dan panduan AI automation dari anshelstore."/>
    <link rel="canonical" href="${siteUrl()}/blog"/>
    <meta property="og:title" content="Artikel & Tips — anshelstore"/><meta property="og:type" content="website"/>
    ${THEME_HEAD}</head>
    <body data-page="blog" class="bg-ambient text-on-background font-body-md min-h-screen overflow-x-hidden">
    ${pageNav()}
    <main class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-xl">
      <div class="text-center mb-xl">
        <h1 class="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-xs">Artikel & <span class="bg-gradient-to-r from-primary to-secondary text-gradient">Tips</span></h1>
        <p class="font-body-lg text-body-lg text-on-surface-variant">Panduan top up, tips gaming, dan insight AI automation.</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">${cards || '<p class="text-on-surface-variant">Belum ada artikel.</p>'}</div>
    </main>${pageFooter()}<script src="/js/site.js"></script></body></html>`;
}

function renderArticle(a) {
  const u = siteUrl() + "/blog/" + a.slug;
  const jsonld = {
    "@context": "https://schema.org", "@type": "BlogPosting", "headline": a.title, "description": a.excerpt,
    "image": a.cover || undefined, "datePublished": new Date(a.createdAt).toISOString(), "dateModified": new Date(a.updatedAt || a.createdAt).toISOString(),
    "author": { "@type": "Organization", "name": a.author || "anshelstore" }, "publisher": { "@type": "Organization", "name": "anshelstore" }, "mainEntityOfPage": u,
  };
  return `<!DOCTYPE html><html class="light" lang="id"><head>
    <meta charset="utf-8"/><meta content="width=device-width, initial-scale=1.0" name="viewport"/>
    <title>${escHtml(a.title)} — anshelstore</title>
    <meta name="description" content="${escHtml(a.excerpt)}"/>
    <link rel="canonical" href="${u}"/>
    <meta property="og:title" content="${escHtml(a.title)}"/>
    <meta property="og:description" content="${escHtml(a.excerpt)}"/>
    <meta property="og:type" content="article"/>
    <meta property="og:url" content="${u}"/>
    ${a.cover ? `<meta property="og:image" content="${escHtml(a.cover)}"/>` : ""}
    <meta name="twitter:card" content="summary_large_image"/>
    <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
    ${THEME_HEAD}</head>
    <body data-page="blog" class="bg-ambient text-on-background font-body-md min-h-screen overflow-x-hidden">
    ${pageNav()}
    <main class="max-w-3xl mx-auto px-margin-mobile md:px-margin-desktop py-lg md:py-xl">
      <a href="/blog" class="inline-flex items-center gap-xs text-on-surface-variant hover:text-primary font-label-md text-label-md mb-md"><span class="material-symbols-outlined text-[20px]">arrow_back</span> Semua artikel</a>
      <div class="flex flex-wrap gap-xs mb-sm">${(a.tags || []).map((t) => `<span class="bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm px-sm py-[2px] rounded-full">${escHtml(t)}</span>`).join("")}</div>
      <h1 class="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-sm">${escHtml(a.title)}</h1>
      <div class="flex items-center gap-xs text-on-surface-variant font-label-md text-label-md mb-md">
        <span>${escHtml(a.author || "anshelstore")}</span><span>•</span>
        <span>${new Date(a.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
      </div>
      ${a.cover ? `<img src="${escHtml(a.cover)}" alt="${escHtml(a.title)}" class="w-full rounded-lg shadow-md mb-lg object-cover"/>` : ""}
      <article class="max-w-none">${mdToHtml(a.content)}</article>
      <div class="mt-xl p-lg rounded-lg bg-gradient-to-r from-primary to-secondary text-on-primary text-center">
        <h3 class="font-headline-md text-headline-md mb-sm">Butuh bantuan AI automation atau top up?</h3>
        <a href="/topup.html" class="inline-block bg-surface text-primary font-label-md text-label-md px-gutter py-sm rounded-full mt-xs hover:scale-105 transition-transform">Mulai Sekarang</a>
      </div>
    </main>${pageFooter()}<script src="/js/site.js"></script></body></html>`;
}

function renderSitemap() {
  const base = siteUrl();
  const urls = [
    { loc: base + "/", pri: "1.0" }, { loc: base + "/topup.html", pri: "0.9" }, { loc: base + "/blog", pri: "0.8" },
    { loc: base + "/tentang.html", pri: "0.6" }, { loc: base + "/faq.html", pri: "0.6" },
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
  if (pathname === "/api/auth/config" && method === "GET") return sendJSON(res, 200, { google: GOOGLE_READY, smtp: SMTP_READY });

  // ---- AUTH ----
  if (pathname === "/api/auth/register" && method === "POST") {
    const b = await readBody(req);
    const email = (b.email || "").trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return sendJSON(res, 400, { error: "Email tidak valid" });
    if (!b.password || b.password.length < 6) return sendJSON(res, 400, { error: "Password minimal 6 karakter" });
    if (findUser(email) && findUser(email).passwordHash) return sendJSON(res, 409, { error: "Email sudah terdaftar" });
    const u = upsertUser({ email, name: b.name, provider: "email", passwordHash: hashPassword(b.password) });
    return sendJSON(res, 201, { token: createSession(u.id), user: publicUser(u) });
  }
  if (pathname === "/api/auth/login" && method === "POST") {
    const b = await readBody(req);
    const u = findUser((b.email || "").trim());
    if (!u || !verifyPassword(b.password || "", u.passwordHash)) return sendJSON(res, 401, { error: "Email atau password salah" });
    return sendJSON(res, 200, { token: createSession(u.id), user: publicUser(u) });
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

  // ---- Google OAuth ----
  if (pathname === "/api/auth/google" && method === "GET") {
    if (!GOOGLE_READY) return sendJSON(res, 503, { error: "Google login belum dikonfigurasi" });
    const redirectUri = baseUrl(req) + "/api/auth/google/callback";
    const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
      client_id: GOOGLE.id, redirect_uri: redirectUri, response_type: "code",
      scope: "openid email profile", access_type: "online", prompt: "select_account",
    }).toString();
    return redirect(res, authUrl);
  }
  if (pathname === "/api/auth/google/callback" && method === "GET") {
    try {
      const redirectUri = baseUrl(req) + "/api/auth/google/callback";
      const tokenResp = await httpsRequest("POST", "https://oauth2.googleapis.com/token", {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code: query.code, client_id: GOOGLE.id, client_secret: GOOGLE.secret, redirect_uri: redirectUri, grant_type: "authorization_code" }).toString(),
      });
      if (!tokenResp.access_token) return redirect(res, "/dashboard#error=google");
      const info = await httpsRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: "Bearer " + tokenResp.access_token } });
      if (!info.email) return redirect(res, "/dashboard#error=google");
      const u = upsertUser({ email: info.email, name: info.name, provider: "google", picture: info.picture });
      return redirect(res, "/dashboard#token=" + createSession(u.id));
    } catch (e) { console.error("Google callback:", e.message); return redirect(res, "/dashboard#error=google"); }
  }

  // ---- Public catalog ----
  if (pathname === "/api/store" && method === "GET") return sendJSON(res, 200, db.store);
  if (pathname === "/api/services" && method === "GET") return sendJSON(res, 200, db.services);
  if (pathname === "/api/games" && method === "GET") return sendJSON(res, 200, db.games);
  if (pathname === "/api/settings" && method === "GET") return sendJSON(res, 200, { store: db.store, settings: db.settings });
  if (pathname === "/api/track" && method === "GET") {
    const code = String(query.code || "").trim().toUpperCase();
    const o = db.orders.find((x) => x.code.toUpperCase() === code);
    if (!o) return sendJSON(res, 404, { error: "Pesanan tidak ditemukan" });
    return sendJSON(res, 200, { code: o.code, gameName: o.gameName, itemLabel: o.itemLabel, price: o.price, status: o.status, paymentMethod: o.paymentMethod, account: o.account, createdAt: o.createdAt });
  }
  if (pathname === "/api/articles" && method === "GET") return sendJSON(res, 200, db.articles.filter((a) => a.published).sort((a, b) => b.createdAt - a.createdAt).map(({ content, ...rest }) => rest));
  let am = pathname.match(/^\/api\/articles\/([a-z0-9-]+)$/);
  if (am && method === "GET") { const a = db.articles.find((x) => x.slug === am[1] && x.published); return a ? sendJSON(res, 200, a) : sendJSON(res, 404, { error: "Artikel tidak ditemukan" }); }

  // ---- Orders ----
  if (pathname === "/api/orders" && method === "POST") {
    const b = await readBody(req);
    const game = db.games.find((g) => g.id === b.gameId);
    const item = game && game.items.find((i) => i.id === b.itemId);
    if (!game || !item) return sendJSON(res, 400, { error: "Game atau item tidak valid" });
    const order = { id: nextId("order"), code: "INV" + Date.now().toString().slice(-8), gameId: game.id, gameName: game.name, itemId: item.id, itemLabel: item.label, price: item.price, account: b.account || {}, customerName: b.customerName || "Guest", customerContact: b.customerContact || "", paymentMethod: b.paymentMethod || "-", status: "pending", createdAt: Date.now() };
    db.orders.push(order); saveDB();
    return sendJSON(res, 201, order);
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
  if (pathname === "/api/stats" && method === "GET") { if (!authed) return needAuth(); return sendJSON(res, 200, buildStats()); }

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
  if (pathname === "/api/admin/articles" && method === "GET") { if (!authed) return needAuth(); return sendJSON(res, 200, [...db.articles].sort((a, b) => b.createdAt - a.createdAt)); }
  if (pathname === "/api/admin/articles" && method === "POST") {
    if (!authed) return needAuth(); const b = await readBody(req);
    if (!b.title) return sendJSON(res, 400, { error: "Judul wajib diisi" });
    let slug = b.slug ? slugify(b.slug) : slugify(b.title);
    if (db.articles.some((a) => a.slug === slug)) slug = slug + "-" + Date.now().toString().slice(-4);
    const now = Date.now();
    const art = { id: nextId("article"), slug, title: b.title, excerpt: b.excerpt || "", cover: b.cover || "", tags: Array.isArray(b.tags) ? b.tags : (b.tags ? String(b.tags).split(",").map((t) => t.trim()).filter(Boolean) : []), author: b.author || "Tim anshelstore", content: b.content || "", published: b.published !== false, createdAt: now, updatedAt: now };
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
    return sendJSON(res, 201, { conversation: conv, messages: [addMessage(conv.id, "ai", `Halo ${conv.name}! 👋 Saya asisten AI anshelstore. Ada yang bisa saya bantu?`)] });
  }
  if (pathname === "/api/chat/message" && method === "POST") {
    const b = await readBody(req); const conv = db.conversations.find((c) => c.id === Number(b.conversationId));
    if (!conv) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    if (!b.text || !b.text.trim()) return sendJSON(res, 400, { error: "Pesan kosong" });
    const out = [addMessage(conv.id, "customer", b.text.trim())];
    if (conv.mode === "ai") { out.push(addMessage(conv.id, "ai", generateAIReply(b.text))); if (shouldEscalate(b.text)) { conv.escalate = true; saveDB(); } }
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

  return sendJSON(res, 404, { error: "Endpoint tidak ditemukan" });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  try {
    if (pathname.startsWith("/api/") || pathname === "/healthz") return await handleApi(req, res, pathname, parsed.query);
    // SEO routes (server-rendered)
    if (pathname === "/robots.txt") { res.writeHead(200, { "Content-Type": "text/plain" }); return res.end(`User-agent: *\nAllow: /\nDisallow: /dashboard\nSitemap: ${siteUrl()}/sitemap.xml\n`); }
    if (pathname === "/sitemap.xml") { res.writeHead(200, { "Content-Type": "application/xml; charset=utf-8" }); return res.end(renderSitemap()); }
    if (pathname === "/blog" || pathname === "/blog/") { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(renderBlogList()); }
    const bm = pathname.match(/^\/blog\/([a-z0-9-]+)\/?$/);
    if (bm) {
      const a = db.articles.find((x) => x.slug === bm[1] && x.published);
      if (a) { res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); return res.end(renderArticle(a)); }
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); return res.end("<h1>404 - Artikel tidak ditemukan</h1>");
    }
    return serveStatic(req, res, pathname);
  } catch (err) { console.error("Server error:", err); sendJSON(res, 500, { error: "Internal server error" }); }
});
server.listen(PORT, HOST, () => {
  console.log(`anshelstore berjalan di http://${HOST}:${PORT}`);
  console.log(`  Email OTP: ${SMTP_READY ? "AKTIF (SMTP)" : "mode dev (kode tampil di layar/log)"}`);
  console.log(`  Google login: ${GOOGLE_READY ? "AKTIF" : "belum dikonfigurasi"}`);
});
