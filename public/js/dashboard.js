// ============================================================
// Dashboard anshelstore — auth (password/OTP/Google) + routing + data
// ============================================================
const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");
const STATUSES = ["pending", "paid", "processing", "done", "cancelled"];
let TOKEN = localStorage.getItem("anshel_token") || null;
let ME = null;

const $ = (id) => document.getElementById(id);
const loginScreen = $("loginScreen");
const shell = $("shell");

// ---------- API helper ----------
async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { "Content-Type": "application/json", "x-auth-token": TOKEN || "", ...(opts.headers || {}) } });
  if (res.status === 401) { logout(); throw new Error("unauthorized"); }
  return res.json();
}

// ============================================================
// AUTH
// ============================================================
const authMsg = $("authMsg");
function showMsg(text, type = "err") { authMsg.textContent = text; authMsg.className = "auth-msg " + type; }
function clearMsg() { authMsg.textContent = ""; authMsg.className = "auth-msg"; }

// tab switching
document.querySelectorAll(".auth-tabs button").forEach((b) =>
  b.addEventListener("click", () => switchPane(b.dataset.tab))
);
function switchPane(tab) {
  clearMsg();
  document.querySelectorAll(".auth-tabs button").forEach((x) => x.classList.toggle("active", x.dataset.tab === tab));
  ["Login", "Register", "Otp"].forEach((p) => $("pane" + p).classList.remove("active"));
  if (tab === "login") $("paneLogin").classList.add("active");
  if (tab === "register") $("paneRegister").classList.add("active");
  if (tab === "otp") $("paneOtp").classList.add("active");
}
$("toOtp").addEventListener("click", () => switchPane("otp"));
$("backLogin").addEventListener("click", () => switchPane("login"));

// login (password)
$("paneLogin").addEventListener("submit", async (e) => {
  e.preventDefault(); clearMsg();
  const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: $("loginEmail").value.trim(), password: $("loginPass").value }) });
  const d = await r.json();
  if (!r.ok) return showMsg(d.error || "Gagal masuk");
  authSuccess(d);
});

// register
$("paneRegister").addEventListener("submit", async (e) => {
  e.preventDefault(); clearMsg();
  const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: $("regName").value.trim(), email: $("regEmail").value.trim(), password: $("regPass").value }) });
  const d = await r.json();
  if (!r.ok) return showMsg(d.error || "Gagal daftar");
  authSuccess(d);
});

// OTP request
$("sendOtp").addEventListener("click", async () => {
  clearMsg();
  const email = $("otpEmail").value.trim();
  if (!email) return showMsg("Isi email dulu");
  $("sendOtp").disabled = true; $("sendOtp").textContent = "Mengirim…";
  try {
    const r = await fetch("/api/auth/otp/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const d = await r.json();
    if (!r.ok) { showMsg(d.error || "Gagal kirim OTP"); return; }
    $("otpStep").style.display = "block";
    if (d.devCode) { $("devOtp").style.display = "block"; $("devOtp").innerHTML = `Mode dev (email belum diset): kode kamu <b>${d.devCode}</b>`; }
    else { showMsg("Kode OTP terkirim ke email kamu. Cek inbox/spam.", "ok"); }
  } catch (e) { showMsg("Gagal terhubung ke server"); }
  finally { $("sendOtp").disabled = false; $("sendOtp").textContent = "Kirim Ulang Kode"; }
});

// OTP verify
$("paneOtp").addEventListener("submit", async (e) => {
  e.preventDefault(); clearMsg();
  const r = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: $("otpEmail").value.trim(), code: $("otpCode").value.trim() }) });
  const d = await r.json();
  if (!r.ok) return showMsg(d.error || "Kode salah");
  authSuccess(d);
});

// Google
$("googleBtn").addEventListener("click", () => { window.location.href = "/api/auth/google"; });

function authSuccess(d) {
  TOKEN = d.token; localStorage.setItem("anshel_token", TOKEN);
  ME = d.user; boot();
}
function logout() {
  if (TOKEN) fetch("/api/auth/logout", { method: "POST", headers: { "x-auth-token": TOKEN } }).catch(() => {});
  TOKEN = null; ME = null; localStorage.removeItem("anshel_token");
  clearInterval(pollTimer); shell.style.display = "none"; loginScreen.style.display = "grid";
}
$("logoutBtn").addEventListener("click", logout);

// ============================================================
// NAVIGATION (hash routing)
// ============================================================
const sidebar = $("sidebar"), backdrop = $("backdrop");
$("menuBtn").addEventListener("click", () => { sidebar.classList.toggle("open"); backdrop.classList.toggle("show"); });
backdrop.addEventListener("click", () => { sidebar.classList.remove("open"); backdrop.classList.remove("show"); });

const TITLES = { overview: "Overview", orders: "Pesanan", inbox: "Inbox Chat" };
const PAGES = ["overview", "orders", "inbox"];
document.querySelectorAll(".side-nav button").forEach((btn) =>
  btn.addEventListener("click", () => { location.hash = btn.dataset.page; })
);
function routeTo(page) {
  if (!PAGES.includes(page)) page = "overview";
  document.querySelectorAll(".side-nav button").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  $("page-" + page).classList.add("active");
  $("pageTitle").textContent = TITLES[page];
  sidebar.classList.remove("open"); backdrop.classList.remove("show");
  if (page === "overview") loadStats();
  if (page === "orders") loadOrders();
  if (page === "inbox") loadConversations();
}
window.addEventListener("hashchange", () => { if (TOKEN) routeTo(location.hash.replace("#", "")); });

// ============================================================
// OVERVIEW
// ============================================================
async function loadStats() {
  const s = await api("/api/stats");
  $("statsGrid").innerHTML = [
    { ic: "💰", label: "Pendapatan", value: rupiah(s.revenue), sub: "dari pesanan paid/done" },
    { ic: "🧾", label: "Total Pesanan", value: s.totalOrders, sub: `${s.todayOrders} hari ini` },
    { ic: "⏳", label: "Menunggu", value: s.pendingOrders, sub: "perlu diproses" },
    { ic: "💬", label: "Percakapan", value: s.totalConversations, sub: `${s.humanActive} ditangani agent` },
  ].map((c) => `<div class="stat"><div class="label"><span class="ic">${c.ic}</span> ${c.label}</div><div class="value">${c.value}</div><div class="sub">${c.sub}</div></div>`).join("");

  const max = Math.max(1, ...s.series.map((d) => d.count));
  $("barsChart").innerHTML = s.series.map((d) => `<div class="bar-col"><div class="bar" style="height:${(d.count / max) * 100}%"><span>${d.count || ""}</span></div><div class="day">${d.label}</div></div>`).join("");

  const tg = $("topGames");
  if (!s.topGames.length) tg.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem">Belum ada data.</p>';
  else { const mg = Math.max(...s.topGames.map((g) => g.count)); tg.innerHTML = s.topGames.map((g, i) => `<div class="row"><span class="rank">${i + 1}</span><span class="nm">${g.name}</span><span class="bar-track"><span class="bar-fill" style="width:${(g.count / mg) * 100}%"></span></span><span class="ct">${g.count}x</span></div>`).join(""); }

  const orders = await api("/api/orders");
  renderOrderTable($("recentOrders"), orders.slice(0, 6), false);
  updateBadges(orders, null);
}

// ============================================================
// ORDERS
// ============================================================
let orderFilter = "all";
document.querySelectorAll("#orderFilters .filter-chip").forEach((chip) =>
  chip.addEventListener("click", () => {
    document.querySelectorAll("#orderFilters .filter-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active"); orderFilter = chip.dataset.f; loadOrders();
  })
);
async function loadOrders() {
  const orders = await api("/api/orders");
  const filtered = orderFilter === "all" ? orders : orders.filter((o) => o.status === orderFilter);
  renderOrderTable($("ordersTable"), filtered, true);
  updateBadges(orders, null);
}
function renderOrderTable(table, orders, editable) {
  if (!orders.length) { table.innerHTML = `<tr><td style="text-align:center;color:var(--text-muted);padding:30px">Belum ada pesanan.</td></tr>`; return; }
  const head = `<thead><tr><th>Invoice</th><th>Game</th><th>Item</th><th>Akun</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>`;
  const rows = orders.map((o) => {
    const acc = Object.entries(o.account || {}).map(([k, v]) => `${k}: ${v}`).join(", ");
    const cell = editable ? `<select class="status-select" data-id="${o.id}">${STATUSES.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select>` : `<span class="badge badge-${o.status}">${o.status}</span>`;
    return `<tr><td><b>${o.code}</b></td><td>${o.gameName}</td><td>${o.itemLabel}</td><td style="color:var(--text-muted)">${acc || "-"}</td><td>${o.customerName}<br><span style="color:var(--text-muted);font-size:.82rem">${o.customerContact || "-"}</span></td><td><b>${rupiah(o.price)}</b></td><td>${cell}</td></tr>`;
  }).join("");
  table.innerHTML = head + "<tbody>" + rows + "</tbody>";
  if (editable) table.querySelectorAll(".status-select").forEach((sel) =>
    sel.addEventListener("change", async () => { await api(`/api/orders/${sel.dataset.id}`, { method: "PATCH", body: JSON.stringify({ status: sel.value }) }); loadOrders(); })
  );
}
function updateBadges(orders, convs) {
  if (orders) { const p = orders.filter((o) => o.status === "pending").length; const el = $("ordersCount"); el.style.display = p ? "inline-block" : "none"; el.textContent = p; }
  if (convs) { const u = convs.reduce((s, c) => s + (c.unread || 0), 0); const el = $("inboxCount"); el.style.display = u ? "inline-block" : "none"; el.textContent = u; }
}

// ============================================================
// INBOX
// ============================================================
let activeConv = null, lastId = 0, pollTimer = null;
async function loadConversations() {
  const list = await api("/api/conversations");
  updateBadges(null, list);
  const el = $("convList");
  if (!list.length) { el.innerHTML = `<div class="chat-empty">Belum ada percakapan.<br>Buka <a href="/chat.html" target="_blank" style="color:var(--primary)">chat.html</a> untuk simulasi.</div>`; return; }
  el.innerHTML = list.map((c) => {
    const tag = c.mode === "human" ? '<span class="badge badge-human">HUMAN</span>' : '<span class="badge badge-ai">AI</span>';
    const esc = c.escalate ? '<span class="escalate-dot">● minta admin</span>' : "";
    const unread = c.unread ? `<span class="unread">${c.unread}</span>` : "";
    return `<div class="conv-item ${activeConv === c.id ? "sel" : ""}" data-id="${c.id}"><div class="top"><span class="nm">${c.name}</span>${unread}</div><div class="last">${(c.lastText || "").slice(0, 42)}</div><div class="meta">${tag}${esc}</div></div>`;
  }).join("");
  el.querySelectorAll(".conv-item").forEach((it) => it.addEventListener("click", () => openConversation(Number(it.dataset.id))));
}
async function openConversation(id) {
  activeConv = id; lastId = 0;
  await api(`/api/conversations/${id}/read`, { method: "POST" });
  await loadConversations(); await renderChat(true);
}
async function renderChat(full) {
  if (!activeConv) return;
  const convs = await api("/api/conversations");
  const conv = convs.find((c) => c.id === activeConv); if (!conv) return;
  const pane = $("chatPane");
  if (full) {
    const isHuman = conv.mode === "human";
    pane.innerHTML = `
      <div class="chat-head">
        <div><strong>${conv.name}</strong><div style="font-size:.8rem;color:var(--text-muted)">${isHuman ? "🧑‍💼 Ditangani " + (conv.agentName || "Agent") : "🤖 Mode AI otomatis"}</div></div>
        ${isHuman ? `<button class="btn btn-light btn-sm" id="btnRelease">↩︎ Kembalikan ke AI</button>` : `<button class="btn btn-primary btn-sm" id="btnTakeover">🙋 Take Over</button>`}
      </div>
      <div class="chat-msgs" id="chatMsgs"></div>
      <div class="chat-foot"><form id="agentForm"><input class="input" id="agentText" type="text" placeholder="${isHuman ? "Balas sebagai agent…" : "Take over dulu untuk membalas manual"}" ${isHuman ? "" : "disabled"} autocomplete="off" /><button class="btn btn-primary" type="submit" ${isHuman ? "" : "disabled"}>Kirim</button></form></div>`;
    const tk = $("btnTakeover");
    if (tk) tk.addEventListener("click", async () => { await api(`/api/conversations/${activeConv}/takeover`, { method: "POST", body: JSON.stringify({}) }); await loadConversations(); renderChat(true); });
    const rl = $("btnRelease");
    if (rl) rl.addEventListener("click", async () => { await api(`/api/conversations/${activeConv}/release`, { method: "POST" }); await loadConversations(); renderChat(true); });
    const form = $("agentForm");
    if (form) form.addEventListener("submit", async (e) => { e.preventDefault(); const inp = $("agentText"); const t = inp.value.trim(); if (!t) return; inp.value = ""; await api(`/api/conversations/${activeConv}/agent-message`, { method: "POST", body: JSON.stringify({ text: t }) }); await pollMessages(); });
    lastId = 0;
  }
  await pollMessages();
}
async function pollMessages() {
  if (!activeConv) return;
  const box = $("chatMsgs"); if (!box) return;
  const msgs = await api(`/api/conversations/${activeConv}/messages?since=${lastId}`);
  msgs.forEach((m) => { const who = m.sender === "customer" ? "Customer" : m.sender === "agent" ? "🧑‍💼 Agent" : "🤖 AI"; const div = document.createElement("div"); div.className = "bubble b-" + m.sender; div.innerHTML = `<span class="who">${who}</span>${escapeHtml(m.text)}`; box.appendChild(div); box.scrollTop = box.scrollHeight; if (m.id > lastId) lastId = m.id; });
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }

// ============================================================
// BOOT
// ============================================================
function applyUser() {
  if (!ME) return;
  $("userName").textContent = ME.name || ME.email;
  const av = $("userAvatar");
  if (ME.picture) av.innerHTML = `<img src="${ME.picture}" alt="">`;
  else av.textContent = (ME.name || ME.email || "A").charAt(0).toUpperCase();
}
function boot() {
  loginScreen.style.display = "none";
  shell.style.display = "grid";
  applyUser();
  routeTo(location.hash.replace("#", "") || "overview");
  if (!location.hash) location.hash = "overview";
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    const active = document.querySelector(".page.active");
    if (active && active.id === "page-inbox") { loadConversations(); if (activeConv) pollMessages(); }
  }, 3500);
}

// ---------- Init: Google callback token + auto-login + google availability ----------
(async function init() {
  // Google redirect mengembalikan #token=...
  if (location.hash.includes("token=")) {
    const params = new URLSearchParams(location.hash.slice(1));
    const t = params.get("token");
    if (t) { TOKEN = t; localStorage.setItem("anshel_token", t); }
    history.replaceState(null, "", "/dashboard");
  }
  // tampilkan tombol Google bila dikonfigurasi
  try { const cfg = await fetch("/api/auth/config").then((r) => r.json()); if (cfg.google) $("googleWrap").style.display = "block"; } catch {}
  // auto-login bila token valid
  if (TOKEN) {
    try { const r = await fetch("/api/auth/me", { headers: { "x-auth-token": TOKEN } }); if (r.ok) { ME = (await r.json()).user; boot(); return; } } catch {}
    TOKEN = null; localStorage.removeItem("anshel_token");
  }
})();
