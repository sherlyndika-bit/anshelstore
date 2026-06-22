/**
 * anshelstore - backend
 * Node.js murni (tanpa dependency eksternal / tanpa npm install).
 *
 * Fitur:
 *  - Menyajikan file statis dari folder public/
 *  - REST API: store, services, games, orders, chat (AI + human takeover)
 *  - Statistik dashboard (/api/stats)
 *  - Auth admin sederhana (/api/auth/login) + proteksi endpoint admin
 *  - Penyimpanan data berbasis file JSON (data/db.json)
 *
 * Jalankan: node server.js   (atau: npm start)
 * Env: PORT, ADMIN_PASSWORD (default "admin123")
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const PUBLIC_DIR = path.join(__dirname, "public");
const DB_PATH = path.join(__dirname, "data", "db.json");

// ---------------------------------------------------------------------------
// Penyimpanan data
// ---------------------------------------------------------------------------
let db;
try {
  db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
} catch (e) {
  console.error("Gagal membaca db.json, memakai data kosong:", e.message);
  db = { store: {}, services: [], games: [], orders: [], conversations: [], messages: [], _seq: { order: 0, conversation: 0, message: 0 } };
}
let saveTimer = null;
function saveDB() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), (err) => {
      if (err) console.error("Gagal simpan DB:", err.message);
    });
  }, 150);
}
function nextId(kind) {
  db._seq[kind] = (db._seq[kind] || 0) + 1;
  return db._seq[kind];
}

// ---------------------------------------------------------------------------
// Auth admin (token in-memory)
// ---------------------------------------------------------------------------
const validTokens = new Set();
function isAuthed(req) {
  const token = req.headers["x-auth-token"];
  return token && validTokens.has(token);
}

// ---------------------------------------------------------------------------
// AI reply engine (mock berbasis aturan)
// >> Ganti isi fungsi ini dengan panggilan LLM (OpenAI/Anthropic/Gemini) untuk produksi.
// ---------------------------------------------------------------------------
function generateAIReply(text) {
  const t = (text || "").toLowerCase();
  const has = (...w) => w.some((x) => t.includes(x));
  if (has("admin", "manusia", "agent", "agen", "cs", "komplain", "refund"))
    return "Baik, saya teruskan ke tim kami. Mohon tunggu sebentar, agent akan segera mengambil alih percakapan ini. 🙏";
  if (has("top up", "topup", "diamond", "uc", "vp", "voucher"))
    return "Untuk top up game, sebutkan: 1) nama game, 2) nominal, 3) User ID. Atau buka halaman Top Up. Game tersedia: Mobile Legends, Free Fire, Genshin, Valorant, PUBG. 🎮";
  if (has("harga", "biaya", "price", "tarif", "berapa"))
    return "Jasa Automation mulai Rp500.000, AI Chatbot + Dashboard mulai Rp1.500.000, Top Up Game mulai Rp5.000. Boleh ceritakan kebutuhanmu biar saya estimasikan lebih akurat?";
  if (has("chatbot", "ai", "automation", "otomasi", "bot", "dashboard"))
    return "Jasa AI Chat Automation kami: chatbot AI 24/7 + dashboard inbox dengan human takeover. Mau saya jadwalkan konsultasi gratis?";
  if (has("halo", "hai", "hi", "pagi", "siang", "sore", "malam", "assalam"))
    return "Halo! 👋 Selamat datang di anshelstore. Ada yang bisa saya bantu? Kami melayani AI Chat Automation, Workflow Automation, dan Top Up Game.";
  if (has("terima kasih", "makasih", "thanks", "thank"))
    return "Sama-sama! 😊 Kalau ada yang lain, jangan ragu chat lagi ya.";
  return "Terima kasih atas pesannya! Bisa dijelaskan lebih detail kebutuhanmu? Ketik 'admin' kalau ingin terhubung dengan tim kami.";
}
function shouldEscalate(text) {
  const t = (text || "").toLowerCase();
  return ["manusia", "admin", "agent", "agen", "komplain", "marah", "refund"].some((w) => t.includes(w));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sendJSON(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
}
function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } });
  });
}
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".webp": "image/webp" };
function serveStatic(req, res, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }); return res.end("<h1>404 - Tidak ditemukan</h1>"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream" });
    res.end(content);
  });
}
function addMessage(conversationId, sender, text) {
  const msg = { id: nextId("message"), conversationId, sender, text, ts: Date.now() };
  db.messages.push(msg);
  const conv = db.conversations.find((c) => c.id === conversationId);
  if (conv) { conv.lastTs = msg.ts; conv.lastText = text; if (sender === "customer") conv.unread = (conv.unread || 0) + 1; }
  saveDB();
  return msg;
}

// ---------------------------------------------------------------------------
// Statistik
// ---------------------------------------------------------------------------
function buildStats() {
  const orders = db.orders || [];
  const paidStatuses = ["paid", "processing", "done"];
  const revenue = orders.filter((o) => paidStatuses.includes(o.status)).reduce((s, o) => s + (o.price || 0), 0);
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter((o) => o.createdAt >= startOfDay.getTime()).length;

  // 7-hari terakhir
  const series = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const next = d.getTime() + 86400000;
    const count = orders.filter((o) => o.createdAt >= d.getTime() && o.createdAt < next).length;
    series.push({ label: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][d.getDay()], count });
  }

  // top game
  const byGame = {};
  orders.forEach((o) => { byGame[o.gameName] = (byGame[o.gameName] || 0) + 1; });
  const topGames = Object.entries(byGame).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);

  return {
    revenue,
    totalOrders: orders.length,
    todayOrders,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
    doneOrders: orders.filter((o) => o.status === "done").length,
    totalConversations: (db.conversations || []).length,
    humanActive: (db.conversations || []).filter((c) => c.mode === "human").length,
    unreadTotal: (db.conversations || []).reduce((s, c) => s + (c.unread || 0), 0),
    series,
    topGames,
  };
}

// ---------------------------------------------------------------------------
// Router API
// ---------------------------------------------------------------------------
async function handleApi(req, res, pathname, query) {
  const method = req.method;

  if (pathname === "/api/health" || pathname === "/healthz") return sendJSON(res, 200, { ok: true });

  // ---- Auth ----
  if (pathname === "/api/auth/login" && method === "POST") {
    const body = await readBody(req);
    if (body.password === ADMIN_PASSWORD) {
      const token = crypto.randomBytes(24).toString("hex");
      validTokens.add(token);
      return sendJSON(res, 200, { token });
    }
    return sendJSON(res, 401, { error: "Password salah" });
  }

  // ---- Public catalog ----
  if (pathname === "/api/store" && method === "GET") return sendJSON(res, 200, db.store);
  if (pathname === "/api/services" && method === "GET") return sendJSON(res, 200, db.services);
  if (pathname === "/api/games" && method === "GET") return sendJSON(res, 200, db.games);

  // ---- Orders ----
  if (pathname === "/api/orders" && method === "POST") {
    const body = await readBody(req);
    const game = db.games.find((g) => g.id === body.gameId);
    const item = game && game.items.find((i) => i.id === body.itemId);
    if (!game || !item) return sendJSON(res, 400, { error: "Game atau item tidak valid" });
    const order = {
      id: nextId("order"), code: "INV" + Date.now().toString().slice(-8),
      gameId: game.id, gameName: game.name, itemId: item.id, itemLabel: item.label, price: item.price,
      account: body.account || {}, customerName: body.customerName || "Guest", customerContact: body.customerContact || "",
      status: "pending", createdAt: Date.now(),
    };
    db.orders.push(order); saveDB();
    return sendJSON(res, 201, order);
  }
  if (pathname === "/api/orders" && method === "GET") {
    if (!isAuthed(req)) return sendJSON(res, 401, { error: "Unauthorized" });
    return sendJSON(res, 200, [...db.orders].sort((a, b) => b.createdAt - a.createdAt));
  }
  let m = pathname.match(/^\/api\/orders\/(\d+)$/);
  if (m && method === "PATCH") {
    if (!isAuthed(req)) return sendJSON(res, 401, { error: "Unauthorized" });
    const body = await readBody(req);
    const order = db.orders.find((o) => o.id === Number(m[1]));
    if (!order) return sendJSON(res, 404, { error: "Order tidak ditemukan" });
    const allowed = ["pending", "paid", "processing", "done", "cancelled"];
    if (body.status && allowed.includes(body.status)) order.status = body.status;
    saveDB();
    return sendJSON(res, 200, order);
  }

  // ---- Stats (admin) ----
  if (pathname === "/api/stats" && method === "GET") {
    if (!isAuthed(req)) return sendJSON(res, 401, { error: "Unauthorized" });
    return sendJSON(res, 200, buildStats());
  }

  // ---- Chat: customer ----
  if (pathname === "/api/chat/start" && method === "POST") {
    const body = await readBody(req);
    const conv = { id: nextId("conversation"), name: body.name || "Pengunjung", mode: "ai", agentName: null, unread: 0, createdAt: Date.now(), lastTs: Date.now(), lastText: "" };
    db.conversations.push(conv); saveDB();
    const greet = addMessage(conv.id, "ai", `Halo ${conv.name}! 👋 Saya asisten AI anshelstore. Ada yang bisa saya bantu?`);
    return sendJSON(res, 201, { conversation: conv, messages: [greet] });
  }
  if (pathname === "/api/chat/message" && method === "POST") {
    const body = await readBody(req);
    const conv = db.conversations.find((c) => c.id === Number(body.conversationId));
    if (!conv) return sendJSON(res, 404, { error: "Percakapan tidak ditemukan" });
    if (!body.text || !body.text.trim()) return sendJSON(res, 400, { error: "Pesan kosong" });
    const customerMsg = addMessage(conv.id, "customer", body.text.trim());
    const out = [customerMsg];
    if (conv.mode === "ai") {
      const aiMsg = addMessage(conv.id, "ai", generateAIReply(body.text));
      out.push(aiMsg);
      if (shouldEscalate(body.text)) { conv.escalate = true; saveDB(); }
    }
    return sendJSON(res, 200, { mode: conv.mode, messages: out });
  }

  // ---- Dashboard: conversations (admin) ----
  if (pathname === "/api/conversations" && method === "GET") {
    if (!isAuthed(req)) return sendJSON(res, 401, { error: "Unauthorized" });
    return sendJSON(res, 200, [...db.conversations].sort((a, b) => b.lastTs - a.lastTs));
  }
  m = pathname.match(/^\/api\/conversations\/(\d+)\/messages$/);
  if (m && method === "GET") {
    const cid = Number(m[1]); const since = Number(query.since || 0);
    return sendJSON(res, 200, db.messages.filter((x) => x.conversationId === cid && x.id > since));
  }
  m = pathname.match(/^\/api\/conversations\/(\d+)\/read$/);
  if (m && method === "POST") {
    if (!isAuthed(req)) return sendJSON(res, 401, { error: "Unauthorized" });
    const conv = db.conversations.find((c) => c.id === Number(m[1]));
    if (conv) { conv.unread = 0; saveDB(); }
    return sendJSON(res, 200, conv || {});
  }
  m = pathname.match(/^\/api\/conversations\/(\d+)\/takeover$/);
  if (m && method === "POST") {
    if (!isAuthed(req)) return sendJSON(res, 401, { error: "Unauthorized" });
    const body = await readBody(req);
    const conv = db.conversations.find((c) => c.id === Number(m[1]));
    if (!conv) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    conv.mode = "human"; conv.agentName = body.agentName || "Agent"; conv.escalate = false;
    addMessage(conv.id, "ai", `🧑‍💼 ${conv.agentName} telah bergabung dan akan membantu Anda.`);
    saveDB();
    return sendJSON(res, 200, conv);
  }
  m = pathname.match(/^\/api\/conversations\/(\d+)\/release$/);
  if (m && method === "POST") {
    if (!isAuthed(req)) return sendJSON(res, 401, { error: "Unauthorized" });
    const conv = db.conversations.find((c) => c.id === Number(m[1]));
    if (!conv) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    conv.mode = "ai"; conv.agentName = null;
    addMessage(conv.id, "ai", "🤖 Percakapan dikembalikan ke asisten AI. Ada lagi yang bisa dibantu?");
    saveDB();
    return sendJSON(res, 200, conv);
  }
  m = pathname.match(/^\/api\/conversations\/(\d+)\/agent-message$/);
  if (m && method === "POST") {
    if (!isAuthed(req)) return sendJSON(res, 401, { error: "Unauthorized" });
    const body = await readBody(req);
    const conv = db.conversations.find((c) => c.id === Number(m[1]));
    if (!conv) return sendJSON(res, 404, { error: "Tidak ditemukan" });
    if (!body.text || !body.text.trim()) return sendJSON(res, 400, { error: "Pesan kosong" });
    return sendJSON(res, 200, addMessage(conv.id, "agent", body.text.trim()));
  }

  return sendJSON(res, 404, { error: "Endpoint tidak ditemukan" });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  try {
    if (parsed.pathname.startsWith("/api/") || parsed.pathname === "/healthz") {
      return await handleApi(req, res, parsed.pathname, parsed.query);
    }
    return serveStatic(req, res, parsed.pathname);
  } catch (err) {
    console.error("Server error:", err);
    sendJSON(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`anshelstore berjalan di http://${HOST}:${PORT} (admin password: ${ADMIN_PASSWORD === "admin123" ? "admin123 [default]" : "[custom]"})`);
});
