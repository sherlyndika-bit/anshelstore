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

// ============================================================
// AUTH
// ============================================================
const authMsg = $("authMsg");
function showMsg(text, type = "err") { authMsg.textContent = text; authMsg.className = "auth-msg " + type; }
function clearMsg() { authMsg.textContent = ""; authMsg.className = "auth-msg"; }

// tab switching
// login (password)
$("paneLogin").addEventListener("submit", async (e) => {
  e.preventDefault(); clearMsg();
  const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: $("loginEmail").value.trim(), password: $("loginPass").value }) });
  const d = await r.json();
  if (!r.ok) return showMsg(d.error || "Gagal masuk");
  authSuccess(d);
});

// (registrasi publik dinonaktifkan di dashboard — akun dibuat oleh owner di menu Tim & Akses)

// (OTP & registrasi dinonaktifkan di dashboard — login cukup email+password)

// Google
$("googleBtn").addEventListener("click", () => { window.location.href = "/api/auth/google"; });

function showSetup() {
  $("paneLogin").classList.remove("active");
  $("paneSetup").classList.add("active");
  const h = document.querySelector(".login-card h1"); if (h) h.textContent = "Setup Awal 🎉";
  const p = document.querySelector(".login-card p"); if (p) p.textContent = "Buat akun Owner pertama untuk mengelola toko.";
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
  clearInterval(pollTimer); shell.style.display = "none"; loginScreen.style.display = "grid";
}
$("logoutBtn").addEventListener("click", logout);

// ============================================================
// NAVIGATION (hash routing)
// ============================================================
const sidebar = $("sidebar"), backdrop = $("backdrop");
$("menuBtn").addEventListener("click", () => { sidebar.classList.toggle("open"); backdrop.classList.toggle("show"); });
backdrop.addEventListener("click", () => { sidebar.classList.remove("open"); backdrop.classList.remove("show"); });

const TITLES = { overview: "Overview", orders: "Pesanan", inbox: "Inbox Chat", produk: "Produk & Harga", articles: "Artikel", settings: "Tampilan & Konten", integrasi: "Integrasi & API", finance: "Finansial", team: "Tim & Akses" };
const PAGES = ["overview", "orders", "inbox", "produk", "articles", "settings", "integrasi", "finance", "team"];
document.querySelectorAll(".side-nav button[data-page], .bottom-nav button[data-page]").forEach((btn) =>
  btn.addEventListener("click", () => goto(btn.dataset.page))
);
function goto(page) {
  routeTo(page);
  try { history.replaceState(null, "", "/dashboard"); } catch (e) {}
  try { localStorage.setItem("anshel_page", page); } catch (e) {}
}
function routeTo(page) {
  if (!PAGES.includes(page)) page = "overview";
  document.querySelectorAll(".side-nav button").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  document.querySelectorAll(".bottom-nav button[data-page]").forEach((b) => b.classList.toggle("active", b.dataset.page === page));
  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  $("page-" + page).classList.add("active");
  $("pageTitle").textContent = TITLES[page];
  sidebar.classList.remove("open"); backdrop.classList.remove("show");
  if (page === "overview") loadStats();
  if (page === "orders") loadOrders();
  if (page === "inbox") loadConversations();
  if (page === "articles") loadArticles();
  if (page === "settings") loadSettings();
  if (page === "finance") loadFinance();
  if (page === "team") loadTeam();
  if (page === "produk") loadProduk();
  if (page === "integrasi") loadIntegrasi();
}

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
    const acc = Object.entries(o.account || {}).map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(v)}`).join(", ");
    const cell = editable ? `<select class="status-select" data-id="${o.id}">${STATUSES.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select>` : `<span class="badge badge-${o.status}">${o.status}</span>`;
    return `<tr><td><b>${escapeHtml(o.code)}</b></td><td>${escapeHtml(o.gameName)}</td><td>${escapeHtml(o.itemLabel)}</td><td style="color:var(--text-muted)">${acc || "-"}</td><td>${escapeHtml(o.customerName)}<br><span style="color:var(--text-muted);font-size:.82rem">${escapeHtml(o.customerContact || "-")}</span></td><td><b>${rupiah(o.price)}</b></td><td>${cell}</td></tr>`;
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
  if (!list.length) { el.innerHTML = `<div class="chat-empty">Belum ada percakapan.<br>Buka <a href="/chat" target="_blank" style="color:var(--primary)">/chat</a> untuk simulasi.</div>`; return; }
  el.innerHTML = list.map((c) => {
    const tag = c.mode === "human" ? '<span class="badge badge-human">HUMAN</span>' : '<span class="badge badge-ai">AI</span>';
    const esc = c.escalate ? '<span class="escalate-dot">● minta admin</span>' : "";
    const unread = c.unread ? `<span class="unread">${c.unread}</span>` : "";
    return `<div class="conv-item ${activeConv === c.id ? "sel" : ""}" data-id="${c.id}"><div class="top"><span class="nm">${escapeHtml(c.name)}</span>${unread}</div><div class="last">${escapeHtml((c.lastText || "").slice(0, 42))}</div><div class="meta">${tag}${esc}</div></div>`;
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
        <div><strong>${escapeHtml(conv.name)}</strong><div style="font-size:.8rem;color:var(--text-muted)">${isHuman ? "🧑‍💼 Ditangani " + escapeHtml(conv.agentName || "Agent") : "🤖 Mode AI otomatis"}</div></div>
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
  // Sembunyikan menu Tim & Akses untuk yang bukan owner/admin
  const teamBtn = document.querySelector('.side-nav button[data-page="team"]');
  if (teamBtn) teamBtn.style.display = (ME.role === "owner" || ME.role === "admin") ? "" : "none";
}
function boot() {
  loginScreen.style.display = "none";
  shell.style.display = "grid";
  applyUser();
  let startPage = "overview";
  try { startPage = localStorage.getItem("anshel_page") || "overview"; } catch (e) {}
  routeTo(startPage);
  try { history.replaceState(null, "", "/dashboard"); } catch (e) {}
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
  // First-run: kalau belum ada akun dashboard, tampilkan setup owner
  try { const ns = await fetch("/api/auth/needs-setup").then((r) => r.json()); if (ns.needsSetup) { showSetup(); return; } } catch {}
  // tampilkan tombol Google bila dikonfigurasi
  try { const cfg = await fetch("/api/auth/config").then((r) => r.json()); if (cfg.google) $("googleWrap").style.display = "block"; } catch {}
  // auto-login bila token valid
  if (TOKEN) {
    try { const r = await fetch("/api/auth/me", { headers: { "x-auth-token": TOKEN } }); if (r.ok) { const u = (await r.json()).user; if (u && u.admin !== false) { ME = u; boot(); return; } } } catch {}
    TOKEN = null; localStorage.removeItem("anshel_token");
  }
})();



// ============================================================
// ARTIKEL (CMS)
// ============================================================
const artMsg = (t, type = "ok") => { const e = $("artMsg"); if (e) { e.textContent = t; e.className = "auth-msg " + type; } };

async function loadArticles() {
  const list = await api("/api/admin/articles");
  const table = $("articlesTable");
  if (!list.length) { table.innerHTML = `<tr><td style="text-align:center;color:var(--text-muted);padding:30px">Belum ada artikel. Klik "Tulis Artikel".</td></tr>`; return; }
  table.innerHTML = `<thead><tr><th>Judul</th><th>Status</th><th>Tags</th><th>Aksi</th></tr></thead><tbody>` +
    list.map((a) => `<tr>
      <td><b>${escapeHtml(a.title)}</b><br><span style="color:var(--text-muted);font-size:.8rem">/blog/${a.slug}</span></td>
      <td>${a.published ? '<span class="badge badge-done">publish</span>' : '<span class="badge badge-pending">draft</span>'}</td>
      <td style="color:var(--text-muted)">${(a.tags || []).join(", ")}</td>
      <td style="white-space:nowrap"><button class="btn btn-light btn-sm art-edit" data-id="${a.id}">Edit</button> <button class="btn btn-light btn-sm art-del" data-id="${a.id}" style="color:var(--red)">Hapus</button></td>
    </tr>`).join("") + "</tbody>";
  table.querySelectorAll(".art-edit").forEach((b) => b.addEventListener("click", () => openEditor(list.find((a) => a.id === Number(b.dataset.id)))));
  table.querySelectorAll(".art-del").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("Hapus artikel ini?")) return;
    await api(`/api/admin/articles/${b.dataset.id}`, { method: "DELETE" }); loadArticles();
  }));
}
function openEditor(a) {
  $("articleEditor").style.display = "block";
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
$("cancelArticle").addEventListener("click", () => { $("articleEditor").style.display = "none"; });
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
    $("articleEditor").style.display = "none";
    loadArticles();
  } catch (e) { artMsg("Gagal menyimpan", "err"); }
});

// ============================================================
// KONTEN & HARGA
// ============================================================
let loadedServices = [], loadedGames = [];
async function loadSettings() {
  const d = await api("/api/admin/settings");
  const st = d.store || {}, s = d.settings || {};
  $("setName").value = st.name || ""; $("setTagline").value = st.tagline || "";
  $("setWa").value = st.whatsapp || ""; $("setEmail").value = st.email || "";
  $("setHeroTitle").value = s.heroTitle || ""; $("setHeroImage").value = s.heroImage || "";
  $("setHeroSub").value = s.heroSubtitle || ""; $("setMeta").value = s.metaDescription || "";
  $("setIg").value = (s.social || {}).instagram || ""; $("setTt").value = (s.social || {}).tiktok || ""; $("setYt").value = (s.social || {}).youtube || "";
  $("setLogo").value = s.logo || "";
  $("setBanners").value = Array.isArray(s.banners) ? s.banners.join("\n") : "";
  promoList = Array.isArray(s.promos) ? s.promos.map((p) => ({ ...p })) : [];
  renderPromoEditor();
  $("setLayananTitle").value = s.layananTitle || ""; $("setLayananDesc").value = s.layananDesc || "";
  $("setTopupTitle").value = s.topupTitle || ""; $("setTopupDesc").value = s.topupDesc || "";
  $("setArtikelTitle").value = s.articlesTitle || "";

  loadedServices = await fetch("/api/services").then((r) => r.json());
  $("servicesEditor").innerHTML = loadedServices.map((sv, i) => `
    <div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">
      <div style="font-weight:700;margin-bottom:8px">${escapeHtml(sv.title)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" class="set-grid">
        <div class="field" style="margin:0"><label>Harga Mulai (Rp)</label><input class="input svc-price" data-i="${i}" type="number" value="${sv.priceFrom || 0}" /></div>
        <div class="field" style="margin:0"><label>URL Gambar</label><input class="input svc-img" data-i="${i}" value="${escapeHtml(sv.image || "")}" placeholder="https://..." /></div>
      </div>
    </div>`).join("");
}
async function loadIntegrasi() {
  const d = await api("/api/admin/settings");
  const integ = (d.settings || {}).integrations || {};
  $("intPayProvider").value = integ.paymentProvider || ""; $("intPayKey").value = integ.paymentKey || "";
  $("intAiProvider").value = integ.aiProvider || ""; $("intAiKey").value = integ.aiKey || "";
  $("intGcUrl").value = integ.gameCheckUrl || ""; $("intGcKey").value = integ.gameCheckKey || "";
  $("intGpName").value = integ.gameProvider || ""; $("intGpUrl").value = integ.gameProviderUrl || ""; $("intGpKey").value = integ.gameProviderKey || "";
}
function buildIntegrations() {
  return {
    paymentProvider: $("intPayProvider").value.trim(), paymentKey: $("intPayKey").value.trim(),
    aiProvider: $("intAiProvider").value.trim(), aiKey: $("intAiKey").value.trim(),
    gameCheckUrl: $("intGcUrl").value.trim(), gameCheckKey: $("intGcKey").value.trim(),
    gameProvider: $("intGpName").value.trim(), gameProviderUrl: $("intGpUrl").value.trim(), gameProviderKey: $("intGpKey").value.trim(),
  };
}
async function saveIntegAll(msgId) {
  try { await api("/api/admin/settings", { method: "PUT", body: JSON.stringify({ settings: { integrations: buildIntegrations() } }) }); const e = $(msgId); e.textContent = "Tersimpan! ✅"; e.className = "auth-msg ok"; }
  catch (e) { const x = $(msgId); x.textContent = "Gagal"; x.className = "auth-msg err"; }
}
$("saveIntegrations").addEventListener("click", () => saveIntegAll("intMsg"));
$("saveProvider").addEventListener("click", () => saveIntegAll("gpMsg"));
$("syncGames").addEventListener("click", async () => {
  const m = $("gpMsg"); m.textContent = "Menyinkronkan…"; m.className = "auth-msg";
  await saveIntegAll("gpMsg");
  try {
    const r = await api("/api/admin/sync-games", { method: "POST", body: "{}" });
    if (!r || r.error) throw new Error(r && r.error ? r.error : "gagal");
    m.textContent = `Berhasil! ${r.games} game, ${r.items} item tersinkron. ✅`; m.className = "auth-msg ok";
    if (typeof loadProduk === "function") loadProduk();
  } catch (e) {
    m.textContent = "Gagal sync: " + (e.message || "cek URL/format provider"); m.className = "auth-msg err";
  }
});
let promoList = [];
function toLocalInput(iso) { const d = new Date(iso); if (isNaN(d)) return ""; const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
function collectPromos() {
  document.querySelectorAll(".promo-row").forEach((row, i) => {
    const g = (c) => row.querySelector("." + c);
    promoList[i] = {
      category: g("pr-cat").value.trim(), title: g("pr-title").value.trim(), info: g("pr-info").value.trim(),
      image: g("pr-img").value.trim(), deadline: g("pr-deadline").value ? new Date(g("pr-deadline").value).toISOString() : "",
      quotaLabel: g("pr-qlabel").value.trim() || "Sisa Kuota", quota: g("pr-quota").value !== "" ? Number(g("pr-quota").value) : null,
      link: g("pr-link").value.trim(),
    };
  });
}
function renderPromoEditor() {
  const wrap = $("promoEditor"); if (!wrap) return;
  wrap.innerHTML = promoList.map((p, i) => `
    <div class="promo-row" style="border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:10px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" class="set-grid">
        <div class="field" style="margin:0"><label>Kategori (mis. Mobile Legends)</label><input class="input pr-cat" value="${escapeHtml(p.category || "")}" /></div>
        <div class="field" style="margin:0"><label>Judul Promo</label><input class="input pr-title" value="${escapeHtml(p.title || "")}" placeholder="Bonus Spesial" /></div>
        <div class="field" style="margin:0"><label>Info (mis. 210000 Diamond)</label><input class="input pr-info" value="${escapeHtml(p.info || "")}" /></div>
        <div class="field up-wrap" style="margin:0"><label>URL Gambar</label><input class="input pr-img" value="${escapeHtml(p.image || "")}" placeholder="https://..." /><button type="button" class="btn btn-light btn-sm upload-btn" style="margin-top:6px">📷 Upload gambar</button></div>
        <div class="field" style="margin:0"><label>Batas Waktu (hitung mundur)</label><input class="input pr-deadline" type="datetime-local" value="${p.deadline ? toLocalInput(p.deadline) : ""}" /></div>
        <div class="field" style="margin:0"><label>Label Kuota</label><input class="input pr-qlabel" value="${escapeHtml(p.quotaLabel || "Sisa Kuota")}" /></div>
        <div class="field" style="margin:0"><label>Jumlah Kuota (kosong = sembunyi)</label><input class="input pr-quota" type="number" value="${p.quota != null ? p.quota : ""}" /></div>
        <div class="field" style="margin:0"><label>Link saat diklik (opsional)</label><input class="input pr-link" value="${escapeHtml(p.link || "")}" placeholder="/topup?game=ml" /></div>
      </div>
      <button class="btn btn-light btn-sm pr-del" data-i="${i}" type="button" style="margin-top:8px;color:var(--red)">Hapus promo ini</button>
    </div>`).join("") || '<p style="color:var(--text-soft);font-size:.85rem">Belum ada promo. Klik "Tambah Promo".</p>';
  wrap.querySelectorAll(".pr-del").forEach((b) => b.addEventListener("click", () => { collectPromos(); promoList.splice(Number(b.dataset.i), 1); renderPromoEditor(); }));
}
$("addPromo").addEventListener("click", () => { collectPromos(); promoList.push({ quotaLabel: "Sisa Kuota" }); renderPromoEditor(); });
$("savePromos").addEventListener("click", async () => {
  collectPromos();
  const promos = promoList.filter((p) => p.title || p.image);
  try { await api("/api/admin/settings", { method: "PUT", body: JSON.stringify({ settings: { promos } }) }); const e = $("promoMsg"); e.textContent = "Tersimpan! ✅"; e.className = "auth-msg ok"; } catch (e) { const x = $("promoMsg"); x.textContent = "Gagal"; x.className = "auth-msg err"; }
});
$("saveSettings").addEventListener("click", async () => {
  const body = {
    store: { name: $("setName").value.trim(), tagline: $("setTagline").value.trim(), whatsapp: $("setWa").value.trim(), email: $("setEmail").value.trim() },
    settings: { heroTitle: $("setHeroTitle").value.trim(), heroImage: $("setHeroImage").value.trim(), heroSubtitle: $("setHeroSub").value.trim(), metaDescription: $("setMeta").value.trim(), logo: $("setLogo").value.trim(), banners: $("setBanners").value.split("\n").map((x) => x.trim()).filter(Boolean), layananTitle: $("setLayananTitle").value.trim(), layananDesc: $("setLayananDesc").value.trim(), topupTitle: $("setTopupTitle").value.trim(), topupDesc: $("setTopupDesc").value.trim(), articlesTitle: $("setArtikelTitle").value.trim(), social: { instagram: $("setIg").value.trim(), tiktok: $("setTt").value.trim(), youtube: $("setYt").value.trim() } },
  };
  try { await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(body) }); const e = $("setMsg"); e.textContent = "Tersimpan! ✅"; e.className = "auth-msg ok"; } catch (e) { const x = $("setMsg"); x.textContent = "Gagal"; x.className = "auth-msg err"; }
});
$("saveServices").addEventListener("click", async () => {
  document.querySelectorAll(".svc-price").forEach((el) => (loadedServices[el.dataset.i].priceFrom = Number(el.value) || 0));
  document.querySelectorAll(".svc-img").forEach((el) => (loadedServices[el.dataset.i].image = el.value.trim()));
  try { await api("/api/admin/services", { method: "PUT", body: JSON.stringify({ services: loadedServices }) }); const e = $("svcMsg"); e.textContent = "Tersimpan! ✅"; e.className = "auth-msg ok"; } catch (e) { const x = $("svcMsg"); x.textContent = "Gagal"; x.className = "auth-msg err"; }
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
    <div class="game-admin-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <b style="font-size:1.05rem">${escapeHtml(g.name || "(tanpa nama)")} <span style="color:var(--text-muted);font-weight:400;font-size:.85rem">#${escapeHtml(g.id)}</span></b>
        <button class="btn btn-light btn-sm pg-delgame" data-g="${gi}" style="color:var(--red)">Hapus</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" class="set-grid">
        <div class="field" style="margin:0"><label>Nama</label><input class="input pg-name" data-g="${gi}" value="${escapeHtml(g.name || "")}"/></div>
        <div class="field" style="margin:0"><label>Publisher</label><input class="input pg-pub" data-g="${gi}" value="${escapeHtml(g.publisher || "")}"/></div>
        <div class="field up-wrap" style="margin:0"><label>URL Gambar (cover)</label><input class="input pg-img" data-g="${gi}" value="${escapeHtml(g.image || "")}"/><button type="button" class="btn btn-light btn-sm upload-btn" style="margin-top:6px">📷 Upload cover</button></div>
        <div class="field" style="margin:0"><label>Field diminta (koma)</label><input class="input pg-needs" data-g="${gi}" value="${escapeHtml((g.needs || []).join(", "))}"/></div>
        <div class="field" style="margin:0;grid-column:1/-1"><label>Deskripsi / penjelasan game (tampil di kiri halaman detail)</label><textarea class="input pg-desc" data-g="${gi}" rows="3" placeholder="Ceritakan tentang game ini...">${escapeHtml(g.description || "")}</textarea></div>
        <div class="field" style="margin:0"><label>URL Video (YouTube / .mp4)</label><input class="input pg-video" data-g="${gi}" value="${escapeHtml(g.video || "")}" placeholder="https://youtu.be/..."/></div>
        <div class="field up-wrap" style="margin:0"><label>Screenshots (URL gambar, 1 per baris)</label><textarea class="input pg-shots" data-g="${gi}" rows="2" placeholder="https://.../ss1.jpg">${escapeHtml((g.screenshots || []).join("\n"))}</textarea><button type="button" class="btn btn-light btn-sm upload-btn" data-mode="append" style="margin-top:6px">📷 Upload & tambah screenshot</button></div>
      </div>
      <div style="margin:10px 0 4px;font-weight:600;font-size:.82rem;color:var(--text-soft)">Item / Nominal (label · harga · stok)</div>
      ${g.items.map((it, ii) => `<div class="gitem">
        <input class="input pg-ilabel" data-g="${gi}" data-i="${ii}" value="${escapeHtml(it.label)}" placeholder="Label"/>
        <input class="input pg-iprice" data-g="${gi}" data-i="${ii}" type="number" value="${it.price}" placeholder="Harga"/>
        <input class="input pg-istock" data-g="${gi}" data-i="${ii}" type="number" value="${typeof it.stock === "number" ? it.stock : ""}" placeholder="∞"/>
        <button class="btn btn-light btn-sm pg-delitem" data-g="${gi}" data-i="${ii}" style="color:var(--red)">✕</button>
      </div>`).join("")}
      <button class="btn btn-light btn-sm pg-additem" data-g="${gi}" style="margin-top:6px">+ Tambah Item</button>
    </div>`).join("") || '<p style="color:var(--text-muted)">Belum ada game. Tambah di atas, lalu Simpan.</p>';
  bindProduk();
}
function syncProduk() {
  document.querySelectorAll(".pg-name").forEach((el) => (loadedGames[el.dataset.g].name = el.value));
  document.querySelectorAll(".pg-pub").forEach((el) => (loadedGames[el.dataset.g].publisher = el.value));
  document.querySelectorAll(".pg-img").forEach((el) => (loadedGames[el.dataset.g].image = el.value.trim()));
  document.querySelectorAll(".pg-needs").forEach((el) => (loadedGames[el.dataset.g].needs = el.value.split(",").map((s) => s.trim()).filter(Boolean)));
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
  if (!id || !$("ngName").value.trim()) { m.textContent = "ID & nama wajib"; m.className = "auth-msg err"; return; }
  if (loadedGames.some((g) => g.id === id)) { m.textContent = "ID sudah dipakai"; m.className = "auth-msg err"; return; }
  loadedGames.push({ id, name: $("ngName").value.trim(), publisher: $("ngPub").value.trim(), image: "", needs: $("ngNeeds").value.split(",").map((s) => s.trim()).filter(Boolean), items: [{ id: "i" + Date.now(), label: "Item baru", price: 0 }] });
  $("ngId").value = ""; $("ngName").value = ""; $("ngPub").value = ""; $("ngNeeds").value = "";
  m.textContent = "Game ditambah — jangan lupa Simpan."; m.className = "auth-msg ok";
  renderProduk();
});
$("saveProduk").addEventListener("click", async () => {
  syncProduk();
  loadedGames.forEach((g) => g.items.forEach((it) => { if (!it.id) it.id = "i" + Math.random().toString(36).slice(2, 7); }));
  const m = $("produkMsg");
  try { await api("/api/admin/games", { method: "PUT", body: JSON.stringify({ games: loadedGames }) }); m.textContent = "Semua tersimpan! ✅"; m.className = "auth-msg ok"; } catch (e) { m.textContent = "Gagal menyimpan"; m.className = "auth-msg err"; }
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
  ].map((c) => `<div class="stat"><div class="label"><span class="ic">${c.ic}</span> ${c.label}</div><div class="value">${c.value}</div><div class="sub">${c.sub}</div></div>`).join("");
  const t = $("financeTable");
  if (!d.entries.length) { t.innerHTML = `<tr><td style="text-align:center;color:var(--text-muted);padding:24px">Belum ada catatan manual.</td></tr>`; return; }
  t.innerHTML = `<thead><tr><th>Tanggal</th><th>Tipe</th><th>Kategori</th><th>Catatan</th><th>Nominal</th><th></th></tr></thead><tbody>` +
    d.entries.map((f) => `<tr>
      <td>${new Date(f.createdAt).toLocaleDateString("id-ID")}</td>
      <td><span class="badge ${f.type === "in" ? "badge-done" : "badge-cancelled"}">${f.type === "in" ? "masuk" : "keluar"}</span></td>
      <td>${escapeHtml(f.category)}</td><td style="color:var(--text-muted)">${escapeHtml(f.note || "-")}</td>
      <td><b>${rupiah(f.amount)}</b></td>
      <td><button class="btn btn-light btn-sm fin-del" data-id="${f.id}" style="color:var(--red)">Hapus</button></td>
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
  if (users.error) { $("usersTable").innerHTML = `<tr><td style="padding:24px;text-align:center;color:var(--text-muted)">${users.error}</td></tr>`; return; }
  const t = $("usersTable");
  t.innerHTML = `<thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Login</th><th>Aksi</th></tr></thead><tbody>` +
    users.map((u) => `<tr>
      <td><b>${escapeHtml(u.name || "-")}</b></td>
      <td>${escapeHtml(u.email)}</td>
      <td><select class="status-select role-sel" data-id="${u.id}">${ROLES.map((r) => `<option value="${r}" ${r === u.role ? "selected" : ""}>${r}</option>`).join("")}</select></td>
      <td style="color:var(--text-muted)">${u.provider}</td>
      <td><button class="btn btn-light btn-sm user-del" data-id="${u.id}" style="color:var(--red)">Hapus</button></td>
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
  if (!body.email || !body.password) { m.textContent = "Email & password wajib"; m.className = "auth-msg err"; return; }
  const d = await api("/api/admin/users", { method: "POST", body: JSON.stringify(body) });
  if (d && d.error) { m.textContent = d.error; m.className = "auth-msg err"; return; }
  m.textContent = "Akun dibuat ✅"; m.className = "auth-msg ok";
  $("newUserName").value = ""; $("newUserEmail").value = ""; $("newUserPass").value = "";
  loadTeam();
});
$("changePassBtn").addEventListener("click", async () => {
  const m = $("passMsg"); const newPass = $("newPass").value;
  if (!newPass || newPass.length < 6) { m.textContent = "Min 6 karakter"; m.className = "auth-msg err"; return; }
  const d = await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ oldPassword: $("oldPass").value, newPassword: newPass }) });
  if (d && d.error) { m.textContent = d.error; m.className = "auth-msg err"; return; }
  m.textContent = "Password diganti ✅"; m.className = "auth-msg ok";
  $("oldPass").value = ""; $("newPass").value = "";
});



// ============================================================
// Bottom tab bar (mobile) — rasa aplikasi
// ============================================================
(function () {
  const items = [["overview", "Home", "space_dashboard"], ["orders", "Pesanan", "receipt_long"], ["inbox", "Chat", "forum"], ["finance", "Uang", "payments"], ["__more", "Menu", "menu"]];
  const bn = document.createElement("div");
  bn.className = "bottom-nav";
  bn.innerHTML = items.map(([p, l, ic]) => `<button data-page="${p}"><span class="material-symbols-outlined">${ic}</span>${l}</button>`).join("");
  document.body.appendChild(bn);
  bn.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.page === "__more") { sidebar.classList.add("open"); backdrop.classList.add("show"); return; }
    goto(b.dataset.page);
  }));
})();
