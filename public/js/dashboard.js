// ============================================================
// Dashboard anshelstore — auth, overview, orders, inbox
// ============================================================
const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");
const STATUSES = ["pending", "paid", "processing", "done", "cancelled"];
const AGENT_NAME = "Admin";
let TOKEN = localStorage.getItem("anshel_token") || null;

// ---------- API helper ----------
async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", "x-auth-token": TOKEN || "", ...(opts.headers || {}) },
  });
  if (res.status === 401) { logout(); throw new Error("unauthorized"); }
  return res.json();
}

// ---------- Auth ----------
const loginScreen = document.getElementById("loginScreen");
const shell = document.getElementById("shell");

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = document.getElementById("loginErr");
  err.textContent = "";
  try {
    const r = await fetch("/api/auth/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: document.getElementById("pw").value }),
    });
    if (!r.ok) { err.textContent = "Password salah. Coba lagi."; return; }
    const data = await r.json();
    TOKEN = data.token; localStorage.setItem("anshel_token", TOKEN);
    boot();
  } catch (e) { err.textContent = "Gagal terhubung ke server."; }
});

function logout() {
  TOKEN = null; localStorage.removeItem("anshel_token");
  shell.style.display = "none"; loginScreen.style.display = "grid";
  clearInterval(pollTimer);
}
document.getElementById("logoutBtn").addEventListener("click", logout);

// ---------- Navigation ----------
const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("backdrop");
document.getElementById("menuBtn").addEventListener("click", () => { sidebar.classList.toggle("open"); backdrop.classList.toggle("show"); });
backdrop.addEventListener("click", () => { sidebar.classList.remove("open"); backdrop.classList.remove("show"); });

const TITLES = { overview: "Overview", orders: "Pesanan", inbox: "Inbox Chat" };
document.querySelectorAll(".side-nav button").forEach((btn) =>
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    document.querySelectorAll(".side-nav button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    document.getElementById("page-" + page).classList.add("active");
    document.getElementById("pageTitle").textContent = TITLES[page];
    sidebar.classList.remove("open"); backdrop.classList.remove("show");
    if (page === "overview") loadStats();
    if (page === "orders") loadOrders();
    if (page === "inbox") loadConversations();
  })
);

// ---------- Overview ----------
const STAT_ICONS = {
  revenue: "💰", orders: "🧾", today: "📅", pending: "⏳", chat: "💬", human: "🧑‍💼",
};
async function loadStats() {
  const s = await api("/api/stats");
  document.getElementById("statsGrid").innerHTML = [
    { ic: "💰", label: "Pendapatan", value: rupiah(s.revenue), sub: "dari pesanan paid/done" },
    { ic: "🧾", label: "Total Pesanan", value: s.totalOrders, sub: `${s.todayOrders} hari ini` },
    { ic: "⏳", label: "Menunggu", value: s.pendingOrders, sub: "perlu diproses" },
    { ic: "💬", label: "Percakapan", value: s.totalConversations, sub: `${s.humanActive} ditangani agent` },
  ].map((c) => `
    <div class="stat">
      <div class="label"><span class="ic">${c.ic}</span> ${c.label}</div>
      <div class="value">${c.value}</div>
      <div class="sub">${c.sub}</div>
    </div>`).join("");

  // bar chart
  const max = Math.max(1, ...s.series.map((d) => d.count));
  document.getElementById("barsChart").innerHTML = s.series.map((d) => `
    <div class="bar-col">
      <div class="bar" style="height:${(d.count / max) * 100}%"><span>${d.count || ""}</span></div>
      <div class="day">${d.label}</div>
    </div>`).join("");

  // top games
  const tg = document.getElementById("topGames");
  if (!s.topGames.length) { tg.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem">Belum ada data.</p>'; }
  else {
    const maxg = Math.max(...s.topGames.map((g) => g.count));
    tg.innerHTML = s.topGames.map((g, i) => `
      <div class="row">
        <span class="rank">${i + 1}</span>
        <span class="nm">${g.name}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(g.count / maxg) * 100}%"></span></span>
        <span class="ct">${g.count}x</span>
      </div>`).join("");
  }

  // recent orders
  const orders = await api("/api/orders");
  renderOrderTable(document.getElementById("recentOrders"), orders.slice(0, 6), false);
  updateBadges(orders, null);
}

// ---------- Orders ----------
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
  renderOrderTable(document.getElementById("ordersTable"), filtered, true);
  updateBadges(orders, null);
}

function renderOrderTable(table, orders, editable) {
  if (!orders.length) {
    table.innerHTML = `<tr><td style="text-align:center;color:var(--text-muted);padding:30px">Belum ada pesanan.</td></tr>`;
    return;
  }
  const head = `<thead><tr><th>Invoice</th><th>Game</th><th>Item</th><th>Akun</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>`;
  const rows = orders.map((o) => {
    const acc = Object.entries(o.account || {}).map(([k, v]) => `${k}: ${v}`).join(", ");
    const statusCell = editable
      ? `<select class="status-select" data-id="${o.id}">${STATUSES.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select>`
      : `<span class="badge badge-${o.status}">${o.status}</span>`;
    return `<tr>
      <td><b>${o.code}</b></td><td>${o.gameName}</td><td>${o.itemLabel}</td>
      <td style="color:var(--text-muted)">${acc || "-"}</td>
      <td>${o.customerName}<br><span style="color:var(--text-muted);font-size:.82rem">${o.customerContact || "-"}</span></td>
      <td><b>${rupiah(o.price)}</b></td><td>${statusCell}</td>
    </tr>`;
  }).join("");
  table.innerHTML = head + "<tbody>" + rows + "</tbody>";

  if (editable) table.querySelectorAll(".status-select").forEach((sel) =>
    sel.addEventListener("change", async () => {
      await api(`/api/orders/${sel.dataset.id}`, { method: "PATCH", body: JSON.stringify({ status: sel.value }) });
      loadOrders();
    })
  );
}

function updateBadges(orders, convs) {
  if (orders) {
    const pend = orders.filter((o) => o.status === "pending").length;
    const el = document.getElementById("ordersCount");
    el.style.display = pend ? "inline-block" : "none"; el.textContent = pend;
  }
  if (convs) {
    const unread = convs.reduce((s, c) => s + (c.unread || 0), 0);
    const el = document.getElementById("inboxCount");
    el.style.display = unread ? "inline-block" : "none"; el.textContent = unread;
  }
}

// ---------- Inbox ----------
let activeConv = null, lastId = 0, pollTimer = null;

async function loadConversations() {
  const list = await api("/api/conversations");
  updateBadges(null, list);
  const el = document.getElementById("convList");
  if (!list.length) {
    el.innerHTML = `<div class="chat-empty">Belum ada percakapan.<br>Buka <a href="/chat.html" target="_blank" style="color:var(--primary)">chat.html</a> untuk simulasi.</div>`;
    return;
  }
  el.innerHTML = list.map((c) => {
    const tag = c.mode === "human" ? '<span class="badge badge-human">HUMAN</span>' : '<span class="badge badge-ai">AI</span>';
    const esc = c.escalate ? '<span class="escalate-dot">● minta admin</span>' : "";
    const unread = c.unread ? `<span class="unread">${c.unread}</span>` : "";
    return `<div class="conv-item ${activeConv === c.id ? "sel" : ""}" data-id="${c.id}">
      <div class="top"><span class="nm">${c.name}</span>${unread}</div>
      <div class="last">${(c.lastText || "").slice(0, 42)}</div>
      <div class="meta">${tag}${esc}</div>
    </div>`;
  }).join("");
  el.querySelectorAll(".conv-item").forEach((it) => it.addEventListener("click", () => openConversation(Number(it.dataset.id))));
}

async function openConversation(id) {
  activeConv = id; lastId = 0;
  await api(`/api/conversations/${id}/read`, { method: "POST" });
  await loadConversations();
  await renderChat(true);
}

async function renderChat(full) {
  if (!activeConv) return;
  const convs = await api("/api/conversations");
  const conv = convs.find((c) => c.id === activeConv);
  if (!conv) return;
  const pane = document.getElementById("chatPane");
  if (full) {
    const isHuman = conv.mode === "human";
    pane.innerHTML = `
      <div class="chat-head">
        <div>
          <strong>${conv.name}</strong>
          <div style="font-size:.8rem;color:var(--text-muted)">${isHuman ? "🧑‍💼 Ditangani " + (conv.agentName || "Agent") : "🤖 Mode AI otomatis"}</div>
        </div>
        ${isHuman
          ? `<button class="btn btn-light btn-sm" id="btnRelease">↩︎ Kembalikan ke AI</button>`
          : `<button class="btn btn-primary btn-sm" id="btnTakeover">🙋 Take Over</button>`}
      </div>
      <div class="chat-msgs" id="chatMsgs"></div>
      <div class="chat-foot">
        <form id="agentForm">
          <input class="input" id="agentText" type="text" placeholder="${isHuman ? "Balas sebagai agent…" : "Take over dulu untuk membalas manual"}" ${isHuman ? "" : "disabled"} autocomplete="off" />
          <button class="btn btn-primary" type="submit" ${isHuman ? "" : "disabled"}>Kirim</button>
        </form>
      </div>`;
    const tk = document.getElementById("btnTakeover");
    if (tk) tk.addEventListener("click", async () => {
      await api(`/api/conversations/${activeConv}/takeover`, { method: "POST", body: JSON.stringify({ agentName: AGENT_NAME }) });
      await loadConversations(); renderChat(true);
    });
    const rl = document.getElementById("btnRelease");
    if (rl) rl.addEventListener("click", async () => {
      await api(`/api/conversations/${activeConv}/release`, { method: "POST" });
      await loadConversations(); renderChat(true);
    });
    const form = document.getElementById("agentForm");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = document.getElementById("agentText");
      const text = input.value.trim(); if (!text) return; input.value = "";
      await api(`/api/conversations/${activeConv}/agent-message`, { method: "POST", body: JSON.stringify({ text }) });
      await pollMessages();
    });
    lastId = 0;
  }
  await pollMessages();
}

async function pollMessages() {
  if (!activeConv) return;
  const box = document.getElementById("chatMsgs");
  if (!box) return;
  const msgs = await api(`/api/conversations/${activeConv}/messages?since=${lastId}`);
  msgs.forEach((m) => {
    const who = m.sender === "customer" ? "Customer" : m.sender === "agent" ? "🧑‍💼 Agent" : "🤖 AI";
    const div = document.createElement("div");
    div.className = "bubble b-" + m.sender;
    div.innerHTML = `<span class="who">${who}</span>${escapeHtml(m.text)}`;
    box.appendChild(div); box.scrollTop = box.scrollHeight;
    if (m.id > lastId) lastId = m.id;
  });
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

// ---------- Boot ----------
function boot() {
  loginScreen.style.display = "none";
  shell.style.display = "grid";
  loadStats();
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    const active = document.querySelector(".page.active").id;
    if (active === "page-inbox") { loadConversations(); if (activeConv) pollMessages(); }
    if (active === "page-overview") { /* ringan, biar gak terlalu sering */ }
  }, 3500);
}

// auto-login jika token tersimpan
if (TOKEN) {
  fetch("/api/stats", { headers: { "x-auth-token": TOKEN } }).then((r) => {
    if (r.ok) boot(); else logout();
  }).catch(() => logout());
}
