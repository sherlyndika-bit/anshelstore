/**
 * anshelstore - backend
 * Node.js murni (tanpa dependency eksternal / tanpa npm install).
 * - Menyajikan file statis dari folder public/
 * - REST API untuk: store info, services, games, orders, dan chat (AI + human takeover)
 * - Penyimpanan data sederhana berbasis file JSON (data/db.json)
 *
 * Jalankan: node server.js   (atau: npm start)
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DB_PATH = path.join(__dirname, "data", "db.json");

// ---------------------------------------------------------------------------
// Penyimpanan data (JSON file)
// ---------------------------------------------------------------------------
let db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
let saveTimer = null;
function saveDB() {
  // debounce penulisan ke disk
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), (err) => {
      if (err) console.error("Gagal simpan DB:", err);
    });
  }, 150);
}
function nextId(kind) {
  db._seq[kind] = (db._seq[kind] || 0) + 1;
  return db._seq[kind];
}

// ---------------------------------------------------------------------------
// AI reply engine (mock berbasis aturan)
//
// >> Untuk produksi, ganti isi fungsi ini dengan panggilan ke LLM (OpenAI/
//    Anthropic/Gemini). Contoh:
//      const res = await fetch("https://api.openai.com/v1/chat/completions", {...})
//    Strukturnya sudah disiapkan agar gampang di-swap.
// ---------------------------------------------------------------------------
function generateAIReply(text, conversation) {
  const t = (text || "").toLowerCase();
  const has = (...words) => words.some((w) => t.includes(w));

  if (has("halo", "hai", "hi", "pagi", "siang", "sore", "malam", "assalam")) {
    return "Halo! 👋 Selamat datang di anshelstore. Ada yang bisa saya bantu? Kami menyediakan jasa AI Chat Automation, Workflow Automation, dan Top Up Game.";
  }
  if (has("top up", "topup", "diamond", "uc", "vp", "voucher")) {
    return "Untuk top up game, silakan sebutkan: 1) nama game, 2) nominal, 3) User ID. Atau buka halaman Top Up di menu untuk pesan langsung. Game tersedia: Mobile Legends, Free Fire, Genshin, Valorant, PUBG. 🎮";
  }
  if (has("harga", "biaya", "price", "tarif", "berapa")) {
    return "Harga tergantung kebutuhan ya. Jasa Automation mulai Rp500.000, AI Chatbot + Dashboard mulai Rp1.500.000, dan Top Up Game mulai Rp5.000. Boleh ceritakan kebutuhanmu biar saya estimasikan lebih akurat?";
  }
  if (has("chatbot", "ai", "automation", "otomasi", "bot", "dashboard")) {
    return "Jasa AI Chat Automation kami mencakup chatbot AI 24/7 + dashboard inbox dengan fitur human takeover. Agent bisa ambil alih percakapan kapan saja. Mau saya jadwalkan konsultasi gratis?";
  }
  if (has("manusia", "admin", "cs", "orang", "agent", "agen")) {
    return "Baik, saya teruskan ke tim kami ya. Mohon tunggu sebentar, salah satu agent akan segera mengambil alih percakapan ini. 🙏";
  }
  if (has("terima kasih", "makasih", "thanks", "thank")) {
    return "Sama-sama! 😊 Kalau ada yang lain, jangan ragu chat lagi ya.";
  }
  return "Terima kasih atas pesannya! Bisa dijelaskan lebih detail kebutuhanmu? Saya bantu sebisanya, atau ketik 'admin' kalau ingin terhubung dengan tim kami.";
}

// Apakah AI sebaiknya minta eskalasi ke manusia?
function shouldEscalate(text) {
  const t = (text || "").toLowerCase();
  return ["manusia", "admin", "agent", "agen", "komplain", "marah", "refund"].some((w) =>
    t.includes(w)
  );
}

// ---------------------------------------------------------------------------
// Helper request/response
// ---------------------------------------------------------------------------
function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
  });
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function serveStatic(req, res, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel));
  // cegah path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end("<h1>404 - Halaman tidak ditemukan</h1>");
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(content);
  });
}

// ---------------------------------------------------------------------------
// Chat helpers
// ---------------------------------------------------------------------------
function addMessage(conversationId, sender, text) {
  const msg = {
    id: nextId("message"),
    conversationId,
    sender, // 'customer' | 'ai' | 'agent'
    text,
    ts: Date.now(),
  };
  db.messages.push(msg);
  const conv = db.conversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.lastTs = msg.ts;
    conv.lastText = text;
    if (sender === "customer") conv.unread = (conv.unread || 0) + 1;
  }
  saveDB();
  return msg;
}

// ---------------------------------------------------------------------------
// Router API
// ---------------------------------------------------------------------------
async function handleApi(req, res, pathname, query) {
  const method = req.method;

  // --- Store & katalog ---
  if (pathname === "/api/store" && method === "GET") {
    return sendJSON(res, 200, db.store);
  }
  if (pathname === "/api/services" && method === "GET") {
    return sendJSON(res, 200, db.services);
  }
  if (pathname === "/api/games" && method === "GET") {
    return sendJSON(res, 200, db.games);
  }

  // --- Orders (top up game) ---
  if (pathname === "/api/orders" && method === "GET") {
    return sendJSON(res, 200, [...db.orders].sort((a, b) => b.createdAt - a.createdAt));
  }
  if (pathname === "/api/orders" && method === "POST") {
    const body = await readBody(req);
    const game = db.games.find((g) => g.id === body.gameId);
    const item = game && game.items.find((i) => i.id === body.itemId);
    if (!game || !item) return sendJSON(res, 400, { error: "Game atau item tidak valid" });

    const order = {
      id: nextId("order"),
      code: "INV" + Date.now().toString().slice(-8),
      gameId: game.id,
      gameName: game.name,
      itemId: item.id,
      itemLabel: item.label,
      price: item.price,
      account: body.account || {},
      customerName: body.customerName || "Guest",
      customerContact: body.customerContact || "",
      status: "pending", // pending -> paid -> processing -> done | cancelled
      createdAt: Date.now(),
    };
    db.orders.push(order);
    saveDB();
    return sendJSON(res, 201, order);
  }

  // PATCH /api/orders/:id  -> update status
  let m = pathname.match(/^\/api\/orders\/(\d+)$/);
  if (m && method === "PATCH") {
    const body = await readBody(req);
    const order = db.orders.find((o) => o.id === Number(m[1]));
    if (!order) return sendJSON(res, 404, { error: "Order tidak ditemukan" });
    const allowed = ["pending", "paid", "processing", "done", "cancelled"];
    if (body.status && allowed.includes(body.status)) order.status = body.status;
    saveDB();
    return sendJSON(res, 200, order);
  }

  // --- Chat: customer mulai percakapan ---
  if (pathname === "/api/chat/start" && method === "POST") {
    const body = await readBody(req);
    const conv = {
      id: nextId("conversation"),
      name: body.name || "Pengunjung",
      mode: "ai", // 'ai' | 'human'
      agentName: null,
      unread: 0,
      createdAt: Date.now(),
      lastTs: Date.now(),
      lastText: "",
    };
    db.conversations.push(conv);
    saveDB();
    const greet = addMessage(
      conv.id,
      "ai",
      `Halo ${conv.name}! 👋 Saya asisten AI anshelstore. Ada yang bisa saya bantu?`
    );
    return sendJSON(res, 201, { conversation: conv, messages: [greet] });
  }

  // --- Chat: customer kirim pesan ---
  if (pathname === "/api/chat/message" && method === "POST") {
    const body = await readBody(req);
    const conv = db.conversations.find((c) => c.id === Number(body.conversationId));
    if (!conv) return sendJSON(res, 404, { error: "Percakapan tidak ditemukan" });
    if (!body.text || !body.text.trim()) return sendJSON(res, 400, { error: "Pesan kosong" });

    const customerMsg = addMessage(conv.id, "customer", body.text.trim());
    const out = [customerMsg];

    // Hanya balas otomatis jika mode AI (kalau sudah di-takeover, diam — tunggu agent)
    if (conv.mode === "ai") {
      const replyText = generateAIReply(body.text, conv);
      const aiMsg = addMessage(conv.id, "ai", replyText);
      out.push(aiMsg);
      // jika perlu eskalasi, tandai (agent bisa takeover dari dashboard)
      if (shouldEscalate(body.text)) conv.escalate = true;
      saveDB();
    }
    return sendJSON(res, 200, { mode: conv.mode, messages: out });
  }

  // --- Dashboard: list percakapan ---
  if (pathname === "/api/conversations" && method === "GET") {
    const list = [...db.conversations].sort((a, b) => b.lastTs - a.lastTs);
    return sendJSON(res, 200, list);
  }

  // GET /api/conversations/:id/messages?since=<id>
  m = pathname.match(/^\/api\/conversations\/(\d+)\/messages$/);
  if (m && method === "GET") {
    const cid = Number(m[1]);
    const since = Number(query.since || 0);
    const msgs = db.messages.filter((x) => x.conversationId === cid && x.id > since);
    return sendJSON(res, 200, msgs);
  }

  // POST /api/conversations/:id/read  -> reset unread (dashboard buka chat)
  m = pathname.match(/^\/api\/conversations\/(\d+)\/read$/);
  if (m && method === "POST") {
    const conv = db.conversations.find((c) => c.id === Number(m[1]));
    if (conv) {
      conv.unread = 0;
      saveDB();
    }
    return sendJSON(res, 200, conv || {});
  }

  // POST /api/conversations/:id/takeover  -> agent ambil alih
  m = pathname.match(/^\/api\/conversations\/(\d+)\/takeover$/);
  if (m && method === "POST") {
    const body = await readBody(req);
    const conv = db.conversations.find((c) => c.id === Number(m[1]));
    if (!conv) return sendJSON(res, 404, { error: "Percakapan tidak ditemukan" });
    conv.mode = "human";
    conv.agentName = body.agentName || "Agent";
    conv.escalate = false;
    addMessage(conv.id, "ai", `🧑‍💼 ${conv.agentName} telah bergabung dan akan membantu Anda.`);
    saveDB();
    return sendJSON(res, 200, conv);
  }

  // POST /api/conversations/:id/release -> kembalikan ke AI
  m = pathname.match(/^\/api\/conversations\/(\d+)\/release$/);
  if (m && method === "POST") {
    const conv = db.conversations.find((c) => c.id === Number(m[1]));
    if (!conv) return sendJSON(res, 404, { error: "Percakapan tidak ditemukan" });
    conv.mode = "ai";
    addMessage(conv.id, "ai", "🤖 Percakapan dikembalikan ke asisten AI. Ada lagi yang bisa dibantu?");
    conv.agentName = null;
    saveDB();
    return sendJSON(res, 200, conv);
  }

  // POST /api/conversations/:id/agent-message -> agent kirim pesan
  m = pathname.match(/^\/api\/conversations\/(\d+)\/agent-message$/);
  if (m && method === "POST") {
    const body = await readBody(req);
    const conv = db.conversations.find((c) => c.id === Number(m[1]));
    if (!conv) return sendJSON(res, 404, { error: "Percakapan tidak ditemukan" });
    if (!body.text || !body.text.trim()) return sendJSON(res, 400, { error: "Pesan kosong" });
    const msg = addMessage(conv.id, "agent", body.text.trim());
    return sendJSON(res, 200, msg);
  }

  return sendJSON(res, 404, { error: "Endpoint tidak ditemukan" });
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  try {
    if (pathname.startsWith("/api/")) {
      return await handleApi(req, res, pathname, parsed.query);
    }
    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error("Server error:", err);
    sendJSON(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`anshelstore berjalan di http://localhost:${PORT}`);
});
