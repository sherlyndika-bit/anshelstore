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

// ---------- Upload gambar (dari perangkat) ----------
function pickAndUpload(el, mode) {
  const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    if (f.size > 4 * 1024 * 1024) { alert("Gambar terlalu besar (maks 4MB)."); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const r = await api("/api/admin/upload", { method: "POST", body: JSON.stringify({ dataUrl: reader.result }) });
        if (!r || r.error || !r.url) throw new Error(r && r.error ? r.error : "gagal");
        if (mode === "append") el.value = (el.value.trim() ? el.value.trim() + "\n" : "") + r.url;
        else el.value = r.url;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      } catch (e) { alert("Upload gagal: " + (e.message || "coba lagi")); }
    };
    reader.readAsDataURL(f);
  };
  inp.click();
}
document.addEventListener("click", (e) => {
  const b = e.target.closest(".upload-btn"); if (!b) return; e.preventDefault();
  let el = b.dataset.target ? document.getElementById(b.dataset.target) : null;
  if (!el) { const w = b.closest(".up-wrap"); if (w) el = w.querySelector("input, textarea"); }
  if (el) pickAndUpload(el, b.dataset.mode || "set");
});
// Tombol "Hapus" gambar: kosongkan nilai & hilangkan preview
document.addEventListener("click", (e) => {
  const b = e.target.closest(".img-clear"); if (!b) return; e.preventDefault();
  let el = b.dataset.target ? document.getElementById(b.dataset.target) : null;
  if (!el) { const w = b.closest(".up-wrap, .field, div"); if (w) el = w.querySelector("input[type=hidden], input[type=text], textarea"); }
  if (el) { el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); }
});

// Preview gambar untuk tiap field yang punya tombol upload
function previewFor(el) {
  const wrap = el.closest(".up-wrap") || el.parentElement; if (!wrap) return;
  let pv = wrap.querySelector(".img-preview");
  const urls = (el.value || "").split("\n").map((s) => s.trim()).filter(Boolean);
  if (!urls.length) { if (pv) pv.remove(); return; }
  if (!pv) { pv = document.createElement("div"); pv.className = "img-preview flex gap-2 mt-2 overflow-x-auto pb-2"; wrap.appendChild(pv); }
  pv.innerHTML = urls.slice(0, 6).map((u) => `<img src="${u}" alt="" class="h-16 w-16 object-cover rounded-lg border border-slate-200 shadow-sm shrink-0" loading="lazy"/>`).join("");
}
function refreshAllPreviews() {
  document.querySelectorAll(".upload-btn").forEach((b) => { const w = b.closest(".up-wrap") || b.parentElement.parentElement; if (w) { const f = w.querySelector("input[type=hidden], input[type=text], textarea"); if (f) previewFor(f); } });
}
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") { const w = el.closest(".up-wrap") || el.parentElement; if (w && w.querySelector(".upload-btn")) previewFor(el); }
});

// ============================================================
// AUTH
// ============================================================
const authMsg = $("authMsg");
function showMsg(text, type = "err") { authMsg.textContent = text; authMsg.className = "mt-4 text-center text-sm font-medium empty:hidden " + (type === "err" ? "text-red-600" : "text-emerald-600"); }
function clearMsg() { authMsg.textContent = ""; authMsg.className = "mt-4 text-center text-sm font-medium empty:hidden"; }

// login (password)
$("paneLogin").addEventListener("submit", async (e) => {
  e.preventDefault(); clearMsg();
  const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: $("loginEmail").value.trim(), password: $("loginPass").value }) });
  const d = await r.json();
  if (!r.ok) return showMsg(d.error || "Gagal masuk");
  authSuccess(d);
});

// Google
if ($("googleBtn")) {
  $("googleBtn").addEventListener("click", () => { window.location.href = "/api/auth/google"; });
}

function showSetup() {
  $("paneLogin").classList.add("hidden");
  $("paneSetup").classList.remove("hidden");
  const h = document.querySelector("#loginScreen h1"); if (h) h.textContent = "Setup Awal 🎉";
  const p = document.querySelector("#loginScreen p"); if (p) p.textContent = "Buat akun Owner pertama untuk mengelola toko.";
}
$("paneSetup").addEventListener("submit", async (e) => {
  e.preventDefault(); clearMsg();
  const r = await fetch("/api/auth/setup-owner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: $("setupName").value.trim(), email: $("setupEmail").value.trim(), password: $("setupPass").value }) });
  const d = await r.json(); if (!r.ok) return showMsg(d.error || "Gagal setup"); authSuccess(d);
});

function authSuccess(d) {
  if (d.user && d.user.admin === false) { showMsg("Akun ini belum punya akses admin. Hubungi pemilik toko untuk didaftarkan.", "err"); return; }
  TOKEN = d.token; localStorage.setItem("anshel_token", TOKEN);
  ME = d.user; boot();
}
function logout() {
  if (TOKEN) fetch("/api/auth/logout", { method: "POST", headers: { "x-auth-token": TOKEN } }).catch(() => {});
  TOKEN = null; ME = null; localStorage.removeItem("anshel_token");
  clearInterval(pollTimer); shell.style.display = "none"; loginScreen.style.display = "flex";
}
$("logoutBtn").addEventListener("click", logout);

// ============================================================
// NAVIGATION (hash routing)
// ============================================================
const sidebar = $("sidebar"), backdrop = $("backdrop");
backdrop.addEventListener("click", () => { sidebar.classList.add("-translate-x-full"); backdrop.classList.add("hidden"); });

const TITLES = { overview: "Overview", orders: "Pesanan", inbox: "Inbox Chat", produk: "Produk & Harga", articles: "Artikel", settings: "Tampilan & Konten", integrasi: "Integrasi & API", finance: "Finansial", team: "Tim & Akses", vouchers: "Promo & Diskon" };
const DESC = {
  overview: "Ringkasan toko & jalan pintas ke semua pengaturan.",
  orders: "Lihat pesanan masuk dan ubah statusnya (paid → diproses → selesai).",
  inbox: "Balas chat pelanggan. Bisa ambil alih dari AI kapan saja.",
  produk: "Atur game, item, harga, gambar, video, dan deskripsi.",
  articles: "Tulis tips/blog biar muncul di Google (SEO).",
  settings: "Atur logo, info toko, sosial media, & harga/foto jasa.",
  integrasi: "Sambungkan provider top-up & API (pembayaran, AI, dll).",
  finance: "Catat uang masuk & keluar toko.",
  team: "Tambah/hapus admin & staff dan atur aksesnya.",
  vouchers: "Kelola voucher promo dan diskon khusus member baru."
};
const PAGES = ["overview", "orders", "inbox", "produk", "articles", "settings", "integrasi", "finance", "team", "vouchers", "users"];
document.querySelectorAll(".side-nav button[data-page], .bottom-nav button[data-page], .qa-btn[data-page]").forEach((btn) =>
  btn.addEventListener("click", () => goto(btn.dataset.page))
);
function goto(page) {
  routeTo(page);
  try { history.replaceState(null, "", "/dashboard"); } catch (e) {}
  try { localStorage.setItem("anshel_page", page); } catch (e) {}
}
function routeTo(page) {
  if (!PAGES.includes(page)) page = "overview";
  
  // Update sidebar active states
  document.querySelectorAll(".side-nav button").forEach((b) => {
    if(b.dataset.page === page) {
      b.classList.add("bg-rose-50", "text-primary", "font-bold");
      b.classList.remove("text-slate-600", "font-medium");
    } else {
      b.classList.remove("bg-rose-50", "text-primary", "font-bold");
      b.classList.add("text-slate-600", "font-medium");
    }
  });
  
  // Update bottom nav active states
  document.querySelectorAll(".bottom-nav-btn").forEach((b) => {
    if(b.dataset.page === page) {
      b.classList.add("text-primary"); b.classList.remove("text-slate-500");
    } else {
      b.classList.remove("text-primary"); b.classList.add("text-slate-500");
    }
  });
  
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  $("page-" + page).classList.add("active");
  $("pageTitle").textContent = TITLES[page];
  { const pd = document.getElementById("pageDesc"); if (pd) pd.textContent = DESC[page] || ""; }
  setTimeout(refreshAllPreviews, 80);
  sidebar.classList.add("-translate-x-full"); backdrop.classList.add("hidden");
  if (page === "overview") loadStats();
  if (page === "orders") loadOrders();
  if (page === "inbox") loadConversations();
  if (page === "articles") loadArticles();
  if (page === "settings") loadSettings();
  if (page === "finance") loadFinance();
  if (page === "team") loadTeam();
  if (page === "produk") loadProduk();
  if (page === "integrasi") loadIntegrasi();
  if (page === "vouchers") loadVouchers();
  if (page === "users") loadUsers();
}

// ============================================================
// OVERVIEW
// ============================================================
async function loadStats() {
  const s = await api("/api/admin/stats");
  $("statsGrid").innerHTML = [
    { ic: "💰", label: "Pendapatan", value: rupiah(s.revenue), sub: "dari pesanan paid/done" },
    { ic: "🧾", label: "Total Pesanan", value: s.totalOrders, sub: `${s.todayOrders} hari ini` },
    { ic: "⏳", label: "Menunggu", value: s.pendingOrders, sub: "perlu diproses" },
    { ic: "💬", label: "Percakapan", value: s.totalConversations, sub: `${s.humanActive} ditangani agent` },
  ].map((c) => `<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div class="text-sm font-semibold text-slate-500 flex items-center gap-2 mb-2"><span class="text-xl">${c.ic}</span> ${c.label}</div>
    <div class="text-2xl font-extrabold text-slate-800 tracking-tight">${c.value}</div>
    <div class="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">${c.sub}</div>
  </div>`).join("");

  const max = Math.max(1, ...s.series.map((d) => d.count));
  $("barsChart").innerHTML = s.series.map((d) => `<div class="flex flex-col items-center justify-end h-full gap-2 flex-1">
    <div class="w-full max-w-[40px] bg-primary rounded-t-md relative flex items-end justify-center group hover:bg-rose-500 transition-colors cursor-pointer" style="height:${(d.count / max) * 100}%">
      <span class="opacity-0 group-hover:opacity-100 absolute -top-8 text-xs font-bold bg-slate-800 text-white px-2 py-1 rounded transition-opacity shadow-lg">${d.count || 0}</span>
    </div>
    <div class="text-[10px] font-semibold text-slate-400 uppercase">${d.label}</div>
  </div>`).join("");

  const tg = $("topGames");
  if (!s.topGames.length) tg.innerHTML = '<p class="text-slate-500 text-sm text-center">Belum ada data.</p>';
  else { const mg = Math.max(...s.topGames.map((g) => g.count)); tg.innerHTML = s.topGames.map((g, i) => `
    <div class="flex items-center gap-3 mb-4 last:mb-0">
      <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold shrink-0">${i + 1}</span>
      <span class="text-sm font-semibold text-slate-700 w-28 truncate" title="${g.name}">${escapeHtml(g.name)}</span>
      <span class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex">
        <span class="block h-full bg-indigo-500 rounded-full" style="width:${(g.count / mg) * 100}%"></span>
      </span>
      <span class="text-xs font-bold text-slate-600 w-8 text-right">${g.count}x</span>
    </div>`).join(""); }

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
    document.querySelectorAll("#orderFilters .filter-chip").forEach((c) => {
      c.classList.remove("bg-slate-800", "text-white", "border-slate-800");
      c.classList.add("bg-white", "text-slate-600", "border-slate-200");
    });
    chip.classList.add("bg-slate-800", "text-white", "border-slate-800");
    chip.classList.remove("bg-white", "text-slate-600", "border-slate-200");
    orderFilter = chip.dataset.f; loadOrders();
  })
);
async function loadOrders() {
  const orders = await api("/api/orders");
  const filtered = orderFilter === "all" ? orders : orders.filter((o) => o.status === orderFilter);
  renderOrderTable($("ordersTable"), filtered, true);
  updateBadges(orders, null);
}
function renderOrderTable(table, orders, editable) {
  if (!orders.length) { table.innerHTML = `<tr><td class="px-6 py-8 text-center text-slate-500 text-sm">Belum ada pesanan.</td></tr>`; return; }
  const head = `<thead class="bg-slate-50 border-b border-slate-200"><tr><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Game</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Akun</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th></tr></thead>`;
  const rows = orders.map((o) => {
    const acc = Object.entries(o.account || {}).map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`).join(", ");
    const stColors = { pending: "bg-amber-100 text-amber-700", paid: "bg-blue-100 text-blue-700", processing: "bg-indigo-100 text-indigo-700", done: "bg-emerald-100 text-emerald-700", cancelled: "bg-rose-100 text-rose-700" };
    const stC = stColors[o.status] || "bg-slate-100 text-slate-700";
    const cell = editable ? `<select class="status-select px-2.5 py-1.5 bg-slate-50 border border-slate-300 text-slate-800 font-medium text-xs rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow" data-id="${o.id}">${STATUSES.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s.toUpperCase()}</option>`).join("")}</select>` : `<span class="px-2 py-0.5 inline-flex text-[10px] font-bold rounded uppercase tracking-wider ${stC}">${o.status}</span>`;
    return `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td class="px-4 py-3 whitespace-nowrap text-sm font-bold text-slate-800">${escapeHtml(o.code)}</td>
      <td class="px-4 py-3 whitespace-nowrap text-sm text-slate-600">${escapeHtml(o.gameName)}</td>
      <td class="px-4 py-3 whitespace-nowrap text-sm text-slate-600">${escapeHtml(o.itemLabel)}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${acc || "-"}</td>
      <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800">${escapeHtml(o.customerName)}<br><span class="text-[11px] text-slate-400 font-normal">${escapeHtml(o.customerContact || "-")}</span></td>
      <td class="px-4 py-3 whitespace-nowrap text-sm font-extrabold text-slate-800">${rupiah(o.price)}</td>
      <td class="px-4 py-3 whitespace-nowrap">${cell}</td>
    </tr>`;
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
  if (!list.length) { el.innerHTML = `<div class="p-6 text-center text-sm text-slate-500">Belum ada percakapan.<br>Buka <a href="/chat" target="_blank" class="text-primary font-bold">/chat</a> untuk simulasi.</div>`; return; }
  el.innerHTML = list.map((c) => {
    const tag = c.mode === "human" ? '<span class="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded uppercase tracking-wider">HUMAN</span>' : '<span class="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-bold rounded uppercase tracking-wider">AI</span>';
    const esc = c.escalate ? '<span class="text-[10px] text-red-500 font-bold flex items-center gap-1"><span class="w-1.5 h-1.5 bg-red-500 rounded-full"></span> minta admin</span>' : "";
    const unread = c.unread ? `<span class="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">${c.unread}</span>` : "";
    return `<div class="p-3 border-b border-slate-100 hover:bg-slate-100 cursor-pointer transition-colors conv-item ${activeConv === c.id ? "bg-indigo-50 border-indigo-100" : ""}" data-id="${c.id}">
      <div class="flex justify-between items-center mb-1"><span class="font-bold text-slate-800 text-sm truncate pr-2">${escapeHtml(c.name)}</span>${unread}</div>
      <div class="text-xs text-slate-500 truncate mb-2">${escapeHtml((c.lastText || "").slice(0, 42))}</div>
      <div class="flex gap-2 items-center">${tag}${esc}</div>
    </div>`;
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
      <div class="flex justify-between items-center p-4 border-b border-slate-200 bg-white shadow-sm z-10">
        <div>
          <strong class="text-slate-800 text-lg">${escapeHtml(conv.name)}</strong>
          <div class="text-xs font-semibold text-slate-500 mt-0.5">${isHuman ? "🧑‍💼 Ditangani " + escapeHtml(conv.agentName || "Agent") : "🤖 Mode AI otomatis"}</div>
        </div>
        ${isHuman ? `<button class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-lg transition-colors shadow-sm" id="btnRelease">↩︎ Kembalikan ke AI</button>` : `<button class="px-4 py-2 bg-primary hover:bg-rose-700 text-white text-sm font-bold rounded-lg transition-colors shadow-sm" id="btnTakeover">🙋 Take Over</button>`}
      </div>
      <div class="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50 relative" id="chatMsgs"></div>
      <div class="p-4 border-t border-slate-200 bg-white">
        <form id="agentForm" class="flex gap-2">
          <input class="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm shadow-sm" id="agentText" type="text" placeholder="${isHuman ? "Balas sebagai agent…" : "Take over dulu untuk membalas manual"}" ${isHuman ? "" : "disabled"} autocomplete="off" />
          <button class="px-6 py-2.5 bg-primary hover:bg-rose-700 text-white font-bold rounded-lg disabled:opacity-50 transition-colors shadow-sm" type="submit" ${isHuman ? "" : "disabled"}>Kirim</button>
        </form>
      </div>`;
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
  msgs.forEach((m) => { 
    const who = m.sender === "customer" ? "Customer" : m.sender === "agent" ? "🧑‍💼 Agent" : "🤖 AI"; 
    const isCust = m.sender === "customer";
    const div = document.createElement("div"); 
    div.className = "flex flex-col w-full " + (isCust ? "items-start" : "items-end"); 
    div.innerHTML = `<span class="text-[10px] font-semibold text-slate-400 mb-1 px-1 uppercase tracking-wider">${who}</span><div class="px-4 py-2.5 rounded-2xl max-w-[85%] text-sm shadow-sm leading-relaxed ${isCust ? 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm' : 'bg-primary text-white rounded-tr-sm'}">${escapeHtml(m.text)}</div>`; 
    box.appendChild(div); 
    box.scrollTop = box.scrollHeight; 
    if (m.id > lastId) lastId = m.id; 
  });
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c])); }

// ============================================================
// BOOT
// ============================================================
function applyUser() {
  if (!ME) return;
  $("userName").textContent = ME.name || ME.email;
  const av = $("userAvatar");
  if (ME.picture) av.innerHTML = `<img src="${ME.picture}" class="w-full h-full rounded-full object-cover">`;
  else av.textContent = (ME.name || ME.email || "A").charAt(0).toUpperCase();
  
  const teamBtn = document.querySelector('.side-nav button[data-page="team"]');
  if (teamBtn) teamBtn.style.display = (ME.role === "owner" || ME.role === "admin") ? "" : "none";
}
function boot() {
  loginScreen.style.display = "none";
  shell.style.display = "flex";
  applyUser();
  let startPage = "overview";
  try { startPage = localStorage.getItem("anshel_page") || "overview"; } catch (e) {}
  routeTo(startPage);
  loadAdminNotifs();
  try { history.replaceState(null, "", "/dashboard"); } catch (e) {}
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    const active = document.querySelector(".page.active");
    if (active && active.id === "page-inbox") { loadConversations(); if (activeConv) pollMessages(); }
    loadAdminNotifs();
  }, 3500);
}

// ---------- Init: Google callback token + auto-login + google availability ----------
(async function init() {
  if (location.hash.includes("token=")) {
    const params = new URLSearchParams(location.hash.slice(1));
    const t = params.get("token");
    if (t) { TOKEN = t; localStorage.setItem("anshel_token", t); }
    history.replaceState(null, "", "/dashboard");
  }
  try { const ns = await fetch("/api/auth/needs-setup").then((r) => r.json()); if (ns.needsSetup) { showSetup(); return; } } catch {}
  try { const cfg = await fetch("/api/auth/config").then((r) => r.json()); if (cfg.google) $("googleWrap").style.display = "block"; } catch {}
  if (TOKEN) {
    try { const r = await fetch("/api/auth/me", { headers: { "x-auth-token": TOKEN } }); if (r.ok) { const u = (await r.json()).user; if (u && u.admin !== false) { ME = u; boot(); return; } } } catch {}
    TOKEN = null; localStorage.removeItem("anshel_token");
  }
})();



// ============================================================
// ARTIKEL (CMS)
// ============================================================
const artMsg = (t, type = "ok") => { const e = $("artMsg"); if (e) { e.textContent = t; e.className = "text-sm font-medium empty:hidden " + (type==="ok" ? "text-emerald-600" : "text-red-600"); } };

async function loadArticles() {
  const list = await api("/api/admin/articles");
  const table = $("articlesTable");
  if (!list.length) { table.innerHTML = `<tr><td class="px-6 py-8 text-center text-slate-500 text-sm">Belum ada artikel. Klik "Tulis Artikel".</td></tr>`; return; }
  table.innerHTML = `<thead class="bg-slate-50 border-b border-slate-200"><tr><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Judul</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tags</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th></tr></thead><tbody>` +
    list.map((a) => `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td class="px-4 py-3">
        <b class="text-sm font-bold text-slate-800">${escapeHtml(a.title)}</b><br>
        <span class="text-xs text-slate-400">/blog/${a.slug}</span>
      </td>
      <td class="px-4 py-3">${a.published ? '<span class="px-2 py-0.5 inline-flex text-[10px] font-bold rounded uppercase tracking-wider bg-emerald-100 text-emerald-700">publish</span>' : '<span class="px-2 py-0.5 inline-flex text-[10px] font-bold rounded uppercase tracking-wider bg-slate-200 text-slate-700">draft</span>'}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${(a.tags || []).join(", ")}</td>
      <td class="px-4 py-3 whitespace-nowrap">
        <button class="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm art-edit mr-2" data-id="${a.id}">Edit</button>
        <button class="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors shadow-sm art-del" data-id="${a.id}">Hapus</button>
      </td>
    </tr>`).join("") + "</tbody>";
  table.querySelectorAll(".art-edit").forEach((b) => b.addEventListener("click", () => openEditor(list.find((a) => a.id === Number(b.dataset.id)))));
  table.querySelectorAll(".art-del").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Hapus artikel ini?")) return;
    await api(`/api/admin/articles/${b.dataset.id}`, { method: "DELETE" }); loadArticles();
  }));
}
function openEditor(a) {
  $("articleEditor").classList.remove("hidden");
  $("editorTitle").textContent = a ? "Edit Artikel" : "Tulis Artikel";
  $("artId").value = a ? a.id : "";
  $("artTitle").value = a ? a.title : "";
  $("artSlug").value = a ? a.slug : "";
  $("artExcerpt").value = a ? a.excerpt : "";
  $("artCover").value = a ? a.cover : "";
  $("artTags").value = a ? (a.tags || []).join(", ") : "";
  $("artAuthor").value = a ? (a.author || "") : "Tim Anshel Store";
  $("artContent").value = a ? a.content : "";
  $("artPublished").checked = a ? a.published : true;
  artMsg("");
  $("articleEditor").scrollIntoView({ behavior: "smooth", block: "nearest" });
}
$("newArticleBtn").addEventListener("click", () => openEditor(null));
$("cancelArticle").addEventListener("click", () => { $("articleEditor").classList.add("hidden"); });
$("saveArticle").addEventListener("click", async () => {
  const id = $("artId").value;
  const payload = {
    title: $("artTitle").value.trim(), slug: $("artSlug").value.trim(), excerpt: $("artExcerpt").value.trim(),
    cover: $("artCover").value.trim(), tags: $("artTags").value, author: $("artAuthor").value.trim(),
    content: $("artContent").value, published: $("artPublished").checked,
  };
  if (!payload.title) { artMsg("Judul wajib diisi", "err"); return; }
  try {
    if (id) await api(`/api/admin/articles/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    else await api("/api/admin/articles", { method: "POST", body: JSON.stringify(payload) });
    artMsg("Tersimpan! ✅", "ok");
    $("articleEditor").classList.add("hidden");
    loadArticles();
  } catch (e) { artMsg("Gagal menyimpan", "err"); }
});

// ============================================================
// KONTEN & HARGA
// ============================================================
let loadedServices = [], loadedGames = [];
async function loadSettings() {
  const d = await api("/api/admin/settings");
  const disc = d.settings && d.settings.newMemberDiscount ? d.settings.newMemberDiscount : 0;
  if(document.getElementById("nmDiscount")) $("nmDiscount").value = disc || "";
  const st = d.store || {}, s = d.settings || {};
  $("setName").value = st.name || ""; $("setTagline").value = st.tagline || "";
  $("setWa").value = st.whatsapp || ""; $("setEmail").value = st.email || "";
  $("setMeta").value = s.metaDescription || "";
  if(document.getElementById("setRequireEmail")) $("setRequireEmail").checked = s.requireEmailVerification !== false;
  $("setIg").value = (s.social || {}).instagram || ""; $("setTt").value = (s.social || {}).tiktok || ""; $("setYt").value = (s.social || {}).youtube || "";
  $("setLogo").value = s.logo || "";
  loadClients();

  loadedServices = await fetch("/api/services").then((r) => r.json());
  $("servicesEditor").innerHTML = loadedServices.map((sv, i) => `
    <div class="border border-slate-200 rounded-xl p-5 bg-slate-50">
      <div class="font-bold text-slate-800 text-base mb-4">${escapeHtml(sv.title)}</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label class="block text-sm font-medium text-slate-700 mb-1">Harga Mulai (Rp)</label><input class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white svc-price shadow-sm" data-i="${i}" type="number" value="${sv.priceFrom || 0}" /></div>
        <div class="up-wrap"><label class="block text-sm font-medium text-slate-700 mb-1">Foto Jasa</label><input type="hidden" class="svc-img" data-i="${i}" value="${escapeHtml(sv.image || "")}" /><div class="flex gap-2 flex-wrap"><button type="button" class="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm rounded-lg font-bold transition-colors upload-btn shadow-sm">📷 Upload foto</button><button type="button" class="px-3 py-1.5 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 text-sm rounded-lg font-bold transition-colors img-clear shadow-sm">Hapus</button></div></div>
      </div>
    </div>`).join("");
  setTimeout(refreshAllPreviews, 60);
}
async function loadIntegrasi() {
  const d = await api("/api/admin/settings");
  const integ = (d.settings || {}).integrations || {};
  $("intPayProvider").value = integ.paymentProvider || ""; $("intPayKey").value = integ.paymentKey || "";
  $("intAiProvider").value = integ.aiProvider || ""; $("intAiKey").value = integ.aiKey || "";
  $("intGcUrl").value = integ.gameCheckUrl || ""; $("intGcKey").value = integ.gameCheckKey || "";
  $("intGpName").value = integ.gameProvider || ""; $("intGpUrl").value = integ.gameProviderUrl || ""; $("intGpKey").value = integ.gameProviderKey || "";
  $("intGpUser").value = integ.gameProviderUser || "";
  if (document.getElementById("intGoogleId")) {
    $("intGoogleAuth").checked = integ.googleAuthEnabled !== false;
    $("intGoogleId").value = integ.googleId || "";
    $("intGoogleSecret").value = integ.googleSecret || "";
  }
}
if(document.getElementById("saveNmDiscount")) {
  $("saveNmDiscount").addEventListener("click", async () => {
    const val = Number($("nmDiscount").value.trim()) || 0;
    try {
      await api("/api/admin/settings/discount", { method: "POST", body: JSON.stringify({ newMemberDiscount: val }) });
      const msg = $("nmDiscountMsg");
      msg.textContent = "Diskon berhasil disimpan!";
      setTimeout(() => msg.textContent = "", 3000);
    } catch (e) {
      alert("Gagal menyimpan diskon: " + e.message);
    }
  });
}
function buildIntegrations() {
  return {
    paymentProvider: $("intPayProvider").value.trim(), paymentKey: $("intPayKey").value.trim(),
    aiProvider: $("intAiProvider").value.trim(), aiKey: $("intAiKey").value.trim(),
    gameCheckUrl: $("intGcUrl").value.trim(), gameCheckKey: $("intGcKey").value.trim(),
    gameProvider: $("intGpName").value.trim(), gameProviderUrl: $("intGpUrl").value.trim(), gameProviderKey: $("intGpKey").value.trim(), gameProviderUser: $("intGpUser").value.trim(),
    googleAuthEnabled: document.getElementById("intGoogleId") ? $("intGoogleAuth").checked : true,
    googleId: document.getElementById("intGoogleId") ? $("intGoogleId").value.trim() : "",
    googleSecret: document.getElementById("intGoogleId") ? $("intGoogleSecret").value.trim() : ""
  };
}
const integMsg = (id, text, type) => { const el = $(id); el.textContent = text; el.className = "text-sm font-bold empty:hidden " + (type === "err" ? "text-red-600" : "text-emerald-600"); };
async function saveIntegAll(msgId) {
  try { await api("/api/admin/settings", { method: "PUT", body: JSON.stringify({ settings: { integrations: buildIntegrations() } }) }); integMsg(msgId, "Tersimpan! ✅", "ok"); }
  catch (e) { integMsg(msgId, "Gagal", "err"); }
}
$("saveIntegrations").addEventListener("click", () => saveIntegAll("intMsg"));
$("saveProvider").addEventListener("click", () => saveIntegAll("gpMsg"));
$("syncGames").addEventListener("click", async () => {
  integMsg("gpMsg", "Menyinkronkan…", "ok");
  await saveIntegAll("gpMsg");
  try {
    const r = await api("/api/admin/sync-games", { method: "POST", body: "{}" });
    if (!r || r.error) throw new Error(r && r.error ? r.error : "gagal");
    integMsg("gpMsg", `Berhasil! ${r.games} game, ${r.items} item tersinkron. ✅`, "ok");
    if (typeof loadProduk === "function") loadProduk();
  } catch (e) {
    integMsg("gpMsg", "Gagal sync: " + (e.message || "cek URL/format provider"), "err");
  }
});
$("saveSettings").addEventListener("click", async () => {
  const body = {
    store: { name: $("setName").value.trim(), tagline: $("setTagline").value.trim(), whatsapp: $("setWa").value.trim(), email: $("setEmail").value.trim() },
    settings: { requireEmailVerification: document.getElementById("setRequireEmail") ? $("setRequireEmail").checked : true, metaDescription: $("setMeta").value.trim(), logo: $("setLogo").value.trim(), social: { instagram: $("setIg").value.trim(), tiktok: $("setTt").value.trim(), youtube: $("setYt").value.trim() } },
  };
  try { await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(body) }); integMsg("setMsg", "Tersimpan! ✅", "ok"); } catch (e) { integMsg("setMsg", "Gagal", "err"); }
});
$("saveServices").addEventListener("click", async () => {
  document.querySelectorAll(".svc-price").forEach((el) => (loadedServices[el.dataset.i].priceFrom = Number(el.value) || 0));
  document.querySelectorAll(".svc-img").forEach((el) => (loadedServices[el.dataset.i].image = el.value.trim()));
  try { await api("/api/admin/services", { method: "PUT", body: JSON.stringify({ services: loadedServices }) }); integMsg("svcMsg", "Tersimpan! ✅", "ok"); } catch (e) { integMsg("svcMsg", "Gagal", "err"); }
});

// ============================================================
// PRODUK & GAME (kelola lengkap: tambah/hapus game & item)
// ============================================================
async function loadProduk() {
  loadedGames = await fetch("/api/games").then((r) => r.json());
  renderProduk();
}
function renderProduk() {
  const wrap = $("produkList");
  wrap.innerHTML = loadedGames.map((g, gi) => `
    <div class="bg-white border border-slate-200 rounded-xl p-6 relative overflow-visible shadow-sm">
      <div class="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
        <b class="text-xl font-bold text-slate-800">${escapeHtml(g.name || "(tanpa nama)")} <span class="text-sm font-medium text-slate-400 ml-3 bg-slate-100 px-2 py-1 rounded-md">#${escapeHtml(g.id)}</span></b>
        <button class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold rounded-lg transition-colors pg-delgame shadow-sm" data-g="${gi}">Hapus</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        <div><label class="block text-sm font-medium text-slate-700 mb-1">Nama</label><input class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none pg-name" data-g="${gi}" value="${escapeHtml(g.name || "")}"/></div>
        <div><label class="block text-sm font-medium text-slate-700 mb-1">Publisher</label><input class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none pg-pub" data-g="${gi}" value="${escapeHtml(g.publisher || "")}"/></div>
        <div><label class="block text-sm font-medium text-slate-700 mb-1">Kategori</label><select class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white pg-cat" data-g="${gi}"><option value="MOBA" ${g.category === "MOBA" ? "selected" : ""}>MOBA</option><option value="Battle Royale" ${g.category === "Battle Royale" ? "selected" : ""}>Battle Royale</option><option value="FPS" ${g.category === "FPS" ? "selected" : ""}>FPS</option><option value="RPG" ${g.category === "RPG" ? "selected" : ""}>RPG</option><option value="Sports" ${g.category === "Sports" ? "selected" : ""}>Sports</option><option value="Lainnya" ${g.category === "Lainnya" || !g.category ? "selected" : ""}>Lainnya</option></select></div>
        <div class="up-wrap"><label class="block text-sm font-medium text-slate-700 mb-1">Gambar (cover)</label><input type="hidden" class="pg-img" data-g="${gi}" value="${escapeHtml(g.image || "")}"/><div class="flex gap-2 flex-wrap"><button type="button" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg font-bold transition-colors upload-btn shadow-sm">📷 Upload cover</button><button type="button" class="px-3 py-1.5 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 text-sm rounded-lg font-bold transition-colors img-clear shadow-sm">Hapus</button></div></div>
        <div><label class="block text-sm font-medium text-slate-700 mb-1">Field diminta (koma)</label><input class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none pg-needs" data-g="${gi}" value="${escapeHtml((g.needs || []).join(", "))}"/></div>
        <div class="md:col-span-3"><label class="block text-sm font-medium text-slate-700 mb-1">URL Cek-ID Khusus (Opsional)</label><input class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none pg-checkurl" data-g="${gi}" value="${escapeHtml(g.checkIdUrl || "")}" placeholder="https://.../game/{gameId}?id={userId}&zone={zoneId}"/></div>
        <div class="md:col-span-3"><label class="block text-sm font-medium text-slate-700 mb-1">Deskripsi / penjelasan game</label><textarea class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none pg-desc" data-g="${gi}" rows="2" placeholder="Ceritakan tentang game ini...">${escapeHtml(g.description || "")}</textarea></div>
        <div class="md:col-span-2"><label class="block text-sm font-medium text-slate-700 mb-1">URL Video (YouTube / .mp4)</label><input class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none pg-video" data-g="${gi}" value="${escapeHtml(g.video || "")}" placeholder="https://youtu.be/..."/></div>
        <div class="up-wrap"><label class="block text-sm font-medium text-slate-700 mb-1">Screenshots (beberapa gambar)</label><input type="hidden" class="pg-shots" data-g="${gi}" value="${escapeHtml((g.screenshots || []).join("\n"))}"/><div class="flex gap-2 flex-wrap"><button type="button" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-lg font-bold transition-colors upload-btn shadow-sm" data-mode="append">📷 Upload &amp; tambah</button><button type="button" class="px-3 py-1.5 bg-red-50 border border-red-100 hover:bg-red-100 text-red-600 text-sm rounded-lg font-bold transition-colors img-clear shadow-sm">Hapus semua</button></div></div>
      </div>
      
      <div class="mt-8 mb-4">
        <h4 class="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-2 rounded-lg inline-block border border-slate-200">Item / Nominal (label · harga · stok)</h4>
      </div>
      <div class="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
      ${g.items.map((it, ii) => `
        <div class="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <input class="w-full sm:flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm font-semibold text-slate-800 bg-white shadow-sm pg-ilabel min-w-0" data-g="${gi}" data-i="${ii}" value="${escapeHtml(it.label)}" placeholder="Label"/>
          <div class="flex w-full sm:w-auto gap-2">
            <input class="flex-1 min-w-0 sm:w-32 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm font-bold text-primary bg-white shadow-sm pg-iprice" data-g="${gi}" data-i="${ii}" type="number" value="${it.price}" placeholder="Harga"/>
            <input class="w-16 sm:w-24 px-2 sm:px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary outline-none text-sm text-slate-600 bg-white shadow-sm pg-istock" data-g="${gi}" data-i="${ii}" type="number" value="${typeof it.stock === "number" ? it.stock : ""}" placeholder="Stok"/>
            <button class="w-10 h-10 shrink-0 flex items-center justify-center bg-white border border-red-200 hover:bg-red-50 text-red-500 hover:text-red-600 rounded-lg transition-colors shadow-sm pg-delitem" data-g="${gi}" data-i="${ii}"><span class="material-symbols-outlined text-[18px]">close</span></button>
          </div>
        </div>`).join("")}
      </div>
      <button class="px-5 py-2.5 bg-white border-2 border-dashed border-slate-300 hover:border-primary hover:text-primary text-slate-600 font-bold rounded-xl text-sm w-full transition-colors shadow-sm pg-additem" data-g="${gi}">+ Tambah Item</button>
    </div>`).join("") || '<div class="bg-white p-10 rounded-xl border border-slate-200 shadow-sm text-center"><p class="text-slate-500 font-medium">Belum ada game. Tambah di atas, lalu Simpan.</p></div>';
  bindProduk();
  setTimeout(refreshAllPreviews, 40);
}
function syncProduk() {
  document.querySelectorAll(".pg-name").forEach((el) => (loadedGames[el.dataset.g].name = el.value));
  document.querySelectorAll(".pg-pub").forEach((el) => (loadedGames[el.dataset.g].publisher = el.value));
  document.querySelectorAll(".pg-cat").forEach((el) => (loadedGames[el.dataset.g].category = el.value));
  document.querySelectorAll(".pg-img").forEach((el) => (loadedGames[el.dataset.g].image = el.value.trim()));
  document.querySelectorAll(".pg-needs").forEach((el) => (loadedGames[el.dataset.g].needs = el.value.split(",").map((s) => s.trim()).filter(Boolean)));
  document.querySelectorAll(".pg-checkurl").forEach((el) => (loadedGames[el.dataset.g].checkIdUrl = el.value.trim()));
  document.querySelectorAll(".pg-desc").forEach((el) => (loadedGames[el.dataset.g].description = el.value));
  document.querySelectorAll(".pg-video").forEach((el) => (loadedGames[el.dataset.g].video = el.value.trim()));
  document.querySelectorAll(".pg-shots").forEach((el) => (loadedGames[el.dataset.g].screenshots = el.value.split("\n").map((s) => s.trim()).filter(Boolean)));
  document.querySelectorAll(".pg-ilabel").forEach((el) => (loadedGames[el.dataset.g].items[el.dataset.i].label = el.value));
  document.querySelectorAll(".pg-iprice").forEach((el) => (loadedGames[el.dataset.g].items[el.dataset.i].price = Number(el.value) || 0));
  document.querySelectorAll(".pg-istock").forEach((el) => { const it = loadedGames[el.dataset.g].items[el.dataset.i]; if (el.value === "") delete it.stock; else it.stock = Math.max(0, Number(el.value) || 0); });
}
function bindProduk() {
  $("produkList").querySelectorAll(".pg-delgame").forEach((b) => b.addEventListener("click", () => { syncProduk(); if (confirm("Hapus game ini?")) { loadedGames.splice(Number(b.dataset.g), 1); renderProduk(); } }));
  $("produkList").querySelectorAll(".pg-additem").forEach((b) => b.addEventListener("click", () => { syncProduk(); loadedGames[b.dataset.g].items.push({ id: "i" + Date.now(), label: "Item baru", price: 0 }); renderProduk(); }));
  $("produkList").querySelectorAll(".pg-delitem").forEach((b) => b.addEventListener("click", () => { syncProduk(); loadedGames[b.dataset.g].items.splice(Number(b.dataset.i), 1); renderProduk(); }));
}
$("addGameBtn").addEventListener("click", () => {
  syncProduk();
  const id = $("ngId").value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const m = $("produkMsg");
  if (!id || !$("ngName").value.trim()) { m.textContent = "ID & nama wajib"; m.className = "text-sm font-bold text-red-600"; return; }
  if (loadedGames.some((g) => g.id === id)) { m.textContent = "ID sudah dipakai"; m.className = "text-sm font-bold text-red-600"; return; }
  loadedGames.push({ id, name: $("ngName").value.trim(), publisher: $("ngPub").value.trim(), category: $("ngCategory").value, image: "", needs: $("ngNeeds").value.split(",").map((s) => s.trim()).filter(Boolean), items: [{ id: "i" + Date.now(), label: "Item baru", price: 0 }] });
  $("ngId").value = ""; $("ngName").value = ""; $("ngPub").value = ""; $("ngNeeds").value = ""; $("ngCategory").value = "MOBA";
  m.textContent = "Game ditambah — jangan lupa Simpan."; m.className = "text-sm font-bold text-emerald-600";
  renderProduk();
});
$("saveProduk").addEventListener("click", async () => {
  syncProduk();
  loadedGames.forEach((g) => g.items.forEach((it) => { if (!it.id) it.id = "i" + Math.random().toString(36).slice(2, 7); }));
  // use modal or toast for production, but here we can just alert
  try { await api("/api/admin/games", { method: "PUT", body: JSON.stringify({ games: loadedGames }) }); alert("Semua tersimpan! ✅"); } catch (e) { alert("Gagal menyimpan"); }
});

// ============================================================
// FINANSIAL
// ============================================================
async function loadFinance() {
  const d = await api("/api/admin/finance");
  const s = d.summary;
  $("financeStats").innerHTML = [
    { ic: "📈", label: "Total Masuk", value: rupiah(s.totalIn), sub: `order ${rupiah(s.orderIncome)} + manual ${rupiah(s.manualIn)}` },
    { ic: "📉", label: "Total Keluar", value: rupiah(s.totalOut), sub: "pengeluaran manual" },
    { ic: "💼", label: "Saldo Bersih", value: rupiah(s.balance), sub: "masuk - keluar" },
    { ic: "🧾", label: "Pendapatan Order", value: rupiah(s.orderIncome), sub: "paid/processing/done" },
  ].map((c) => `<div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
    <div class="text-sm font-semibold text-slate-500 flex items-center gap-2 mb-2"><span class="text-xl">${c.ic}</span> ${c.label}</div>
    <div class="text-xl font-extrabold text-slate-800">${c.value}</div>
    <div class="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-medium">${c.sub}</div>
  </div>`).join("");
  const t = $("financeTable");
  if (!d.entries.length) { t.innerHTML = `<tr><td class="px-6 py-8 text-center text-slate-500 text-sm">Belum ada catatan manual.</td></tr>`; return; }
  t.innerHTML = `<thead class="bg-slate-50 border-b border-slate-200"><tr><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipe</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Kategori</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Catatan</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nominal</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th></tr></thead><tbody>` +
    d.entries.map((f) => `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td class="px-4 py-3 text-sm text-slate-600">${new Date(f.createdAt).toLocaleDateString("id-ID")}</td>
      <td class="px-4 py-3">${f.type === "in" ? '<span class="px-2 py-0.5 inline-flex text-[10px] font-bold rounded uppercase tracking-wider bg-emerald-100 text-emerald-700">masuk</span>' : '<span class="px-2 py-0.5 inline-flex text-[10px] font-bold rounded uppercase tracking-wider bg-rose-100 text-rose-700">keluar</span>'}</td>
      <td class="px-4 py-3 text-sm font-bold text-slate-800">${escapeHtml(f.category)}</td>
      <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(f.note || "-")}</td>
      <td class="px-4 py-3 text-sm font-extrabold text-slate-800">${rupiah(f.amount)}</td>
      <td class="px-4 py-3"><button class="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors shadow-sm fin-del" data-id="${f.id}">Hapus</button></td>
    </tr>`).join("") + "</tbody>";
  t.querySelectorAll(".fin-del").forEach((b) => b.addEventListener("click", async () => { if (!confirm("Hapus catatan ini?")) return; await api(`/api/admin/finance/${b.dataset.id}`, { method: "DELETE" }); loadFinance(); }));
}
$("addFinance").addEventListener("click", async () => {
  const amount = Number($("finAmount").value);
  if (!(amount > 0)) { alert("Nominal harus lebih dari 0"); return; }
  await api("/api/admin/finance", { method: "POST", body: JSON.stringify({ type: $("finType").value, amount, category: $("finCategory").value.trim(), note: $("finNote").value.trim() }) });
  $("finAmount").value = ""; $("finCategory").value = ""; $("finNote").value = "";
  loadFinance();
});



// ============================================================
// TIM & AKSES (manajemen akun + role) + ganti password
// ============================================================
async function loadTeam() {
  const ROLES = ["owner", "admin", "staff", "customer"];
  let users;
  try { users = await api("/api/admin/users"); } catch (e) { return; }
  if (users.error) { $("usersTable").innerHTML = `<tr><td class="px-6 py-8 text-center text-red-500 text-sm font-medium">${users.error}</td></tr>`; return; }
  const t = $("usersTable");
  t.innerHTML = `<thead class="bg-slate-50 border-b border-slate-200"><tr><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nama</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Login</th><th class="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th></tr></thead><tbody>` +
    users.map((u) => `<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
      <td class="px-4 py-3 text-sm font-bold text-slate-800">${escapeHtml(u.name || "-")}</td>
      <td class="px-4 py-3 text-sm font-medium text-slate-600">${escapeHtml(u.email)}</td>
      <td class="px-4 py-3"><select class="status-select role-sel px-2.5 py-1.5 bg-slate-50 border border-slate-300 text-slate-800 font-medium text-xs rounded-lg focus:ring-2 focus:ring-primary outline-none transition-shadow" data-id="${u.id}">${ROLES.map((r) => `<option value="${r}" ${r === u.role ? "selected" : ""}>${r.toUpperCase()}</option>`).join("")}</select></td>
      <td class="px-4 py-3 text-sm font-semibold text-slate-500 capitalize">${u.provider}</td>
      <td class="px-4 py-3"><button class="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors shadow-sm user-del" data-id="${u.id}">Hapus</button></td>
    </tr>`).join("") + "</tbody>";
  t.querySelectorAll(".role-sel").forEach((s) => s.addEventListener("change", async () => {
    const d = await api(`/api/admin/users/${s.dataset.id}`, { method: "PUT", body: JSON.stringify({ role: s.value }) });
    if (d && d.error) alert(d.error);
    loadTeam();
  }));
  t.querySelectorAll(".user-del").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Hapus akun ini?")) return;
    const d = await api(`/api/admin/users/${b.dataset.id}`, { method: "DELETE" });
    if (d && d.error) alert(d.error);
    loadTeam();
  }));
}
$("addUserBtn").addEventListener("click", async () => {
  const m = $("userMsg");
  const body = { name: $("newUserName").value.trim(), email: $("newUserEmail").value.trim(), password: $("newUserPass").value, role: $("newUserRole").value };
  if (!body.email || !body.password) { m.textContent = "Email & password wajib"; m.className = "text-sm font-bold text-red-600"; return; }
  const d = await api("/api/admin/users", { method: "POST", body: JSON.stringify(body) });
  if (d && d.error) { m.textContent = d.error; m.className = "text-sm font-bold text-red-600"; return; }
  m.textContent = "Akun dibuat ✅"; m.className = "text-sm font-bold text-emerald-600";
  $("newUserName").value = ""; $("newUserEmail").value = ""; $("newUserPass").value = "";
  loadTeam();
});
$("changePassBtn").addEventListener("click", async () => {
  const m = $("passMsg"); const newPass = $("newPass").value;
  if (!newPass || newPass.length < 6) { m.textContent = "Min 6 karakter"; m.className = "text-sm font-bold text-red-600"; return; }
  const d = await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ oldPassword: $("oldPass").value, newPassword: newPass }) });
  if (d && d.error) { m.textContent = d.error; m.className = "text-sm font-bold text-red-600"; return; }
  m.textContent = "Password diganti ✅"; m.className = "text-sm font-bold text-emerald-600";
  $("oldPass").value = ""; $("newPass").value = "";
});

// ============================================================
// Bottom tab bar (mobile) — rasa aplikasi
// ============================================================
(function () {
  const items = [["overview", "Home", "space_dashboard"], ["orders", "Pesanan", "receipt_long"], ["inbox", "Chat", "forum"], ["finance", "Uang", "payments"], ["__more", "Menu", "menu"]];
  const bn = document.createElement("div");
  bn.className = "lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-[90] pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]";
  bn.innerHTML = items.map(([p, l, ic]) => `<button class="flex flex-col items-center justify-center w-full h-full text-slate-500 hover:text-primary transition-colors bottom-nav-btn" data-page="${p}"><span class="material-symbols-outlined text-[24px] mb-0.5 leading-none">${ic}</span><span class="text-[10px] font-bold uppercase tracking-wider">${l}</span></button>`).join("");
  document.body.appendChild(bn);
  bn.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.page === "__more") { sidebar.classList.remove("-translate-x-full"); backdrop.classList.remove("hidden"); return; }
    goto(b.dataset.page);
  }));
})();

// ============================================================
// Clients & Admin Notifications
// ============================================================
async function loadClients() {
  try {
    const clients = await api("/api/clients");
    const list = document.getElementById("clientsList");
    if (!list) return;
    if (!clients || clients.length === 0) { list.innerHTML = '<p class="text-sm text-slate-400 italic">Belum ada klien.</p>'; return; }
    list.innerHTML = clients.map(c => `
      <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
        ${c.logo ? `<img src="${c.logo}" class="w-10 h-10 object-contain rounded"/>` : `<div class="w-10 h-10 bg-slate-200 rounded flex items-center justify-center text-slate-500 text-sm font-bold">${c.name.charAt(0)}</div>`}
        <div class="flex-1 font-medium text-slate-800 text-sm">${c.name}</div>
        <button class="text-red-500 hover:text-red-700 text-sm font-medium cl-del" data-id="${c.id}">Hapus</button>
      </div>
    `).join("");
    list.querySelectorAll(".cl-del").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Hapus klien ini?")) return;
      await api(`/api/admin/clients/${b.dataset.id}`, { method: "DELETE" });
      loadClients();
    }));
  } catch(e){}
}

const acb = document.getElementById("addClientBtn");
if (acb) acb.addEventListener("click", async () => {
  const name = document.getElementById("newClientName").value.trim();
  if (!name) return alert("Nama klien wajib diisi");
  const logo = document.getElementById("newClientLogo").value || "";
  try {
    await api("/api/admin/clients", { method: "POST", body: JSON.stringify({ name, logo }) });
    document.getElementById("newClientName").value = "";
    document.getElementById("newClientLogo").value = "";
    loadClients();
  } catch(e) { alert("Gagal menambah klien"); }
});

async function loadAdminNotifs() {
  try {
    const notifs = await api("/api/admin/notifications");
    if (!Array.isArray(notifs)) return;
    const unread = notifs.filter(n => !n.read).length;
    const existing = document.getElementById("adminNotifBell");
    if (existing) {
      const badge = existing.querySelector(".notif-badge");
      if (badge) {
        badge.textContent = unread > 9 ? "9+" : unread;
        if (unread === 0) badge.classList.add("hidden"); else badge.classList.remove("hidden");
      }
    }
    const panel = document.getElementById("adminNotifPanel");
    if (panel) {
      panel.innerHTML = notifs.length === 0 ? '<div class="p-4 text-center text-slate-400 text-sm">Belum ada notifikasi</div>' :
        notifs.slice(0, 20).map(n => `<div class="px-3 py-2.5 rounded-lg ${n.read ? '' : 'bg-blue-50'} hover:bg-slate-50 transition-colors flex items-start gap-2 cursor-pointer admin-notif-item" data-id="${n.id}"><span class="material-symbols-outlined text-sm mt-0.5 ${n.read ? 'text-slate-400' : 'text-primary'}">${n.icon || 'notifications'}</span><div class="flex-1 min-w-0"><div class="text-sm font-medium text-slate-800">${n.title}</div><div class="text-xs text-slate-500">${n.message}</div></div></div>`).join("");
      panel.querySelectorAll(".admin-notif-item").forEach(item => {
        item.addEventListener("click", async (e) => {
          e.stopPropagation();
          await api(`/api/admin/notifications/${item.dataset.id}/read`, { method: "POST" });
          item.classList.remove("bg-blue-50");
          loadAdminNotifs();
        });
      });
    }
  } catch(e) {}
}

const bell = document.getElementById("adminNotifBell");
const panel = document.getElementById("adminNotifPanel");
if (bell && panel) {
  bell.addEventListener("click", (e) => { e.stopPropagation(); panel.classList.toggle("hidden"); });
  document.addEventListener("click", () => panel.classList.add("hidden"));
}

// ============================================================
// Vouchers
// ============================================================
async function loadVouchers() {
  try {
    const data = await api("/api/admin/vouchers");
    const dSettings = await api("/api/admin/settings");
    
    if ($("nmDiscountVal") && dSettings.settings) {
      $("nmDiscountVal").value = dSettings.settings.newMemberDiscount || "";
    }

    const tbody = $("vouchersTable");
    if (!tbody) return;
    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="px-4 py-8 text-center text-slate-400 italic">Belum ada voucher.</td></tr>`;
      return;
    }
    
    tbody.innerHTML = data.map(v => {
      const isExpired = v.validUntil && Date.now() > v.validUntil;
      const valText = v.type === "percent" ? v.value + "%" : rupiah(v.value);
      const quotaText = v.quota === null ? "Unlimited" : v.quota;
      const untilText = v.validUntil ? new Date(v.validUntil).toLocaleDateString("id-ID") : "Selamanya";
      return `
        <tr class="hover:bg-slate-50 transition-colors ${!v.active || isExpired ? 'opacity-50' : ''}">
          <td class="px-4 py-3 font-bold text-slate-800">${esc(v.code)}</td>
          <td class="px-4 py-3">${valText}</td>
          <td class="px-4 py-3">${quotaText}</td>
          <td class="px-4 py-3">${untilText}</td>
          <td class="px-4 py-3">
            <button class="text-rose-500 hover:text-rose-700 text-xs font-bold del-voucher" data-id="${v.id}">Hapus</button>
          </td>
        </tr>
      `;
    }).join("");
    
    tbody.querySelectorAll(".del-voucher").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("Hapus voucher ini?")) return;
      b.disabled = true;
      await api(`/api/admin/vouchers/${b.dataset.id}`, { method: "DELETE" });
      loadVouchers();
    }));
  } catch(e) {}
}

if ($("addVoucherForm")) {
  $("addVoucherForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true; btn.textContent = "Loading...";
    
    const payload = {
      code: $("vCode").value,
      type: $("vType").value,
      value: Number($("vValue").value),
      quota: $("vQuota").value ? Number($("vQuota").value) : null
    };
    
    await api("/api/admin/vouchers", { method: "POST", body: JSON.stringify(payload) });
    $("vCode").value = ""; $("vValue").value = ""; $("vQuota").value = "";
    btn.disabled = false; btn.textContent = "Buat Voucher";
    loadVouchers();
  });
}

if ($("nmDiscountForm")) {

}

// ---- USERS ----
async function loadUsers() {
  const d = await api("/api/admin/users");
  if (Array.isArray(d)) renderUsers(d);
}
function renderUsers(list) {
  const tbody = $("usersTableBody");
  if (!list.length) { tbody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-slate-400">Belum ada pengguna terdaftar</td></tr>'; return; }
  tbody.innerHTML = list.map(u => {
    const icon = u.provider === 'google' ? 'google' : 'mail';
    const dateStr = new Date(u.createdAt).toLocaleString("id-ID", {dateStyle:"short", timeStyle:"short"});
    const loginStr = u.lastLogin ? new Date(u.lastLogin).toLocaleString("id-ID", {dateStyle:"short", timeStyle:"short"}) : '-';
    return `<tr>
      <td class="px-6 py-4">
        <div class="font-medium text-slate-900">${esc(u.name || "-")}</div>
        <div class="text-xs text-slate-500">${esc(u.email)}</div>
      </td>
      <td class="px-6 py-4"><span class="px-2 py-1 bg-slate-100 rounded text-xs font-semibold uppercase">${u.role}</span></td>
      <td class="px-6 py-4 flex items-center gap-1"><span class="material-symbols-outlined text-[16px] text-slate-400">${icon}</span> ${u.provider}</td>
      <td class="px-6 py-4 text-xs">${dateStr}</td>
      <td class="px-6 py-4 text-xs">${loginStr}</td>
    </tr>`;
  }).join("");
}
