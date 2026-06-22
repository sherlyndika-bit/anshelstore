// Dashboard admin: kelola order top up + inbox chat dengan human takeover
const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");
const STATUSES = ["pending", "paid", "processing", "done", "cancelled"];
const AGENT_NAME = "Admin";

// ---- Tabs ----
document.querySelectorAll(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".pane").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("pane-" + tab.dataset.pane).classList.add("active");
  })
);

// =========================================================================
// ORDERS
// =========================================================================
async function loadOrders() {
  const orders = await fetch("/api/orders").then((r) => r.json());
  const body = document.getElementById("ordersBody");
  if (!orders.length) {
    body.innerHTML = `<tr><td colspan="7" class="muted" style="padding:24px;text-align:center;">Belum ada order. Coba buat dari halaman Top Up.</td></tr>`;
    return;
  }
  body.innerHTML = orders
    .map((o) => {
      const acc = Object.entries(o.account || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      const opts = STATUSES.map(
        (s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`
      ).join("");
      return `<tr>
        <td><b>${o.code}</b></td>
        <td>${o.gameName}</td>
        <td>${o.itemLabel}</td>
        <td class="muted">${acc || "-"}</td>
        <td>${o.customerName}<br><span class="muted">${o.customerContact || "-"}</span></td>
        <td>${rupiah(o.price)}</td>
        <td><select data-id="${o.id}" class="status-sel">${opts}</select></td>
      </tr>`;
    })
    .join("");

  body.querySelectorAll(".status-sel").forEach((sel) =>
    sel.addEventListener("change", async () => {
      await fetch(`/api/orders/${sel.dataset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: sel.value }),
      });
      loadOrders();
    })
  );
}

// =========================================================================
// INBOX
// =========================================================================
let activeConv = null;
let lastId = 0;

async function loadConversations() {
  const list = await fetch("/api/conversations").then((r) => r.json());
  const el = document.getElementById("convList");
  if (!list.length) {
    el.innerHTML = `<div class="empty" style="height:120px;">Belum ada percakapan.<br>Buka <a href="/chat.html" style="color:var(--brand)">chat.html</a> untuk simulasi.</div>`;
    return;
  }
  el.innerHTML = list
    .map((c) => {
      const modeTag = c.mode === "human" ? '<span class="tag tag-human">HUMAN</span>' : '<span class="tag tag-ai">AI</span>';
      const esc = c.escalate ? '<span class="escalate">● minta admin</span>' : "";
      const unread = c.unread ? `<span class="unread-dot">${c.unread}</span>` : "";
      return `<div class="conv-item ${activeConv === c.id ? "sel" : ""}" data-id="${c.id}">
        <div class="top"><span class="name">${c.name}</span>${unread}</div>
        <div class="top" style="margin-top:6px;">${modeTag} ${esc}</div>
        <div class="last">${(c.lastText || "").slice(0, 40)}</div>
      </div>`;
    })
    .join("");
  el.querySelectorAll(".conv-item").forEach((it) =>
    it.addEventListener("click", () => openConversation(Number(it.dataset.id)))
  );
}

async function openConversation(id) {
  activeConv = id;
  lastId = 0;
  await fetch(`/api/conversations/${id}/read`, { method: "POST" });
  await loadConversations();
  await renderChat(true);
}

async function renderChat(full) {
  if (!activeConv) return;
  const convs = await fetch("/api/conversations").then((r) => r.json());
  const conv = convs.find((c) => c.id === activeConv);
  if (!conv) return;

  const pane = document.getElementById("chatPane");
  if (full) {
    const isHuman = conv.mode === "human";
    pane.innerHTML = `
      <div class="chat-head">
        <div>
          <strong>${conv.name}</strong>
          <div class="muted" style="font-size:.8rem;">${isHuman ? "🧑‍💼 Mode Human (" + (conv.agentName || "Agent") + ")" : "🤖 Mode AI otomatis"}</div>
        </div>
        <div>
          ${
            isHuman
              ? `<button class="btn btn-sm btn-ghost" id="btnRelease">↩︎ Kembalikan ke AI</button>`
              : `<button class="btn btn-sm" id="btnTakeover">🙋 Take Over</button>`
          }
        </div>
      </div>
      <div class="chat-msgs" id="chatMsgs"></div>
      <div class="chat-foot">
        <form id="agentForm">
          <input id="agentText" type="text" placeholder="${isHuman ? "Balas sebagai agent…" : "Take over dulu untuk membalas manual"}" ${isHuman ? "" : "disabled"} autocomplete="off" />
          <button type="submit" class="btn btn-sm" ${isHuman ? "" : "disabled"}>Kirim</button>
        </form>
      </div>`;

    const tk = document.getElementById("btnTakeover");
    if (tk)
      tk.addEventListener("click", async () => {
        await fetch(`/api/conversations/${activeConv}/takeover`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentName: AGENT_NAME }),
        });
        await loadConversations();
        renderChat(true);
      });
    const rl = document.getElementById("btnRelease");
    if (rl)
      rl.addEventListener("click", async () => {
        await fetch(`/api/conversations/${activeConv}/release`, { method: "POST" });
        await loadConversations();
        renderChat(true);
      });

    const form = document.getElementById("agentForm");
    if (form)
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = document.getElementById("agentText");
        const text = input.value.trim();
        if (!text) return;
        input.value = "";
        await fetch(`/api/conversations/${activeConv}/agent-message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
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
  const msgs = await fetch(`/api/conversations/${activeConv}/messages?since=${lastId}`).then((r) => r.json());
  msgs.forEach((m) => {
    const who = m.sender === "customer" ? "Customer" : m.sender === "agent" ? "🧑‍💼 Agent" : "🤖 AI";
    const div = document.createElement("div");
    div.className = "msg m-" + m.sender;
    div.innerHTML = `<span class="who">${who}</span>${escapeHtml(m.text)}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    if (m.id > lastId) lastId = m.id;
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Polling berkala: refresh daftar percakapan + pesan aktif (realtime sederhana)
setInterval(() => {
  loadConversations();
  if (activeConv) pollMessages();
}, 3000);

loadOrders();
loadConversations();
setInterval(loadOrders, 5000);
