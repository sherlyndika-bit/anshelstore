/**
 * Chat widget customer.
 *  - POST /api/chat/start         -> mulai percakapan
 *  - POST /api/chat/message       -> kirim pesan (balasan AI bila mode AI)
 *  - GET  /api/conversations/:id/messages?since=  -> polling pesan baru (agent setelah takeover)
 */
function initChatWidget(options = {}) {
  const mount = document.getElementById("chatWidget");
  if (!mount) return;

  let conversationId = Number(localStorage.getItem("anshel_conv")) || null;
  let lastId = 0, open = options.openByDefault || false, pollTimer = null;

  mount.innerHTML = `
    <button id="cwToggle" class="cw-bubble" aria-label="Buka chat">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    </button>
    <div id="cwPanel" class="cw-panel">
      <div class="cw-head">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="cw-ava">🤖</span>
          <div><strong>Anshel Store</strong><div class="cw-sub" id="cwStatus">Asisten AI • online</div></div>
        </div>
        <button id="cwClose" class="cw-x" aria-label="Tutup">✕</button>
      </div>
      <div class="cw-body" id="cwBody"></div>
      <form class="cw-input" id="cwForm">
        <input id="cwText" type="text" placeholder="Tulis pesan…" autocomplete="off" />
        <button type="submit" class="cw-send" aria-label="Kirim">➤</button>
      </form>
    </div>`;

  injectStyles();
  const panel = mount.querySelector("#cwPanel");
  const body = mount.querySelector("#cwBody");
  const statusEl = mount.querySelector("#cwStatus");
  const render = (o) => (panel.style.display = o ? "flex" : "none");
  render(open);

  mount.querySelector("#cwToggle").onclick = async () => {
    open = !open; render(open);
    if (open && !conversationId) await start();
    if (open) startPolling();
  };
  mount.querySelector("#cwClose").onclick = () => { open = false; render(false); stopPolling(); };

  function addBubble(msg) {
    const isCustomer = msg.sender === "customer";
    const who = msg.sender === "agent" ? "🧑‍💼 Agent" : msg.sender === "ai" ? "🤖 AI" : "";
    const div = document.createElement("div");
    div.className = "cw-msg " + (isCustomer ? "cw-out" : "cw-in");
    div.innerHTML = (who ? `<span class="cw-who">${who}</span>` : "") + escapeHtml(msg.text);
    body.appendChild(div); body.scrollTop = body.scrollHeight;
    if (msg.id > lastId) lastId = msg.id;
  }

  async function start() {
    const data = await fetch("/api/chat/start", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: options.name || "Pengunjung" }),
    }).then((r) => r.json());
    conversationId = data.conversation.id;
    localStorage.setItem("anshel_conv", conversationId);
    data.messages.forEach(addBubble);
  }

  mount.querySelector("#cwForm").onsubmit = async (e) => {
    e.preventDefault();
    const input = mount.querySelector("#cwText");
    const text = input.value.trim(); if (!text) return;
    if (!conversationId) await start();
    input.value = "";
    const data = await fetch("/api/chat/message", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, text }),
    }).then((r) => r.json());
    data.messages.forEach(addBubble);
    statusEl.textContent = data.mode === "human" ? "🧑‍💼 Terhubung dengan agent" : "Asisten AI • online";
  };

  async function poll() {
    if (!conversationId) return;
    try {
      const msgs = await fetch(`/api/conversations/${conversationId}/messages?since=${lastId}`).then((r) => r.json());
      msgs.forEach((m) => { if (m.sender !== "customer") addBubble(m); else if (m.id > lastId) lastId = m.id; });
    } catch (e) {}
  }
  function startPolling() { stopPolling(); pollTimer = setInterval(poll, 2500); }
  function stopPolling() { if (pollTimer) clearInterval(pollTimer); }
  function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

  function injectStyles() {
    if (document.getElementById("cwStyles")) return;
    const css = `
    .cw-bubble{position:fixed;right:22px;bottom:22px;width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;background:linear-gradient(135deg,#bf5d7e,#7d9b78);color:#fff;box-shadow:0 12px 30px -6px rgba(191,93,126,.5);z-index:200;display:grid;place-items:center;transition:transform .2s}
    .cw-bubble:hover{transform:scale(1.06)}
    .cw-panel{position:fixed;right:22px;bottom:94px;width:360px;max-width:calc(100vw - 36px);height:520px;max-height:72vh;background:#fff;border:1px solid #e6e8ee;border-radius:18px;display:none;flex-direction:column;overflow:hidden;z-index:200;box-shadow:0 24px 60px -12px rgba(15,23,42,.3)}
    .cw-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:linear-gradient(135deg,#bf5d7e,#7d9b78);color:#fff}
    .cw-head strong{font-size:.98rem}
    .cw-ava{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.2);display:grid;place-items:center;font-size:1.1rem}
    .cw-sub{font-size:.74rem;opacity:.9;margin-top:1px}
    .cw-x{background:none;border:0;color:#fff;font-size:1.1rem;cursor:pointer;opacity:.85}
    .cw-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:9px;background:#f8fafc}
    .cw-msg{max-width:82%;padding:9px 13px;border-radius:14px;font-size:.9rem;line-height:1.45;word-wrap:break-word}
    .cw-in{align-self:flex-start;background:#fff;border:1px solid #e6e8ee;color:#0f172a;border-bottom-left-radius:4px}
    .cw-out{align-self:flex-end;background:linear-gradient(135deg,#bf5d7e,#7d9b78);color:#fff;border-bottom-right-radius:4px}
    .cw-who{display:block;font-size:.66rem;font-weight:700;opacity:.7;margin-bottom:2px}
    .cw-input{display:flex;gap:8px;padding:12px;border-top:1px solid #e6e8ee;background:#fff}
    .cw-input input{flex:1;padding:11px 14px;border-radius:999px;border:1px solid #e6e8ee;font-size:.9rem;font-family:inherit;color:#0f172a}
    .cw-input input:focus{outline:none;border-color:#a9c4a4;box-shadow:0 0 0 3px rgba(125,155,120,.15)}
    .cw-send{border:0;background:linear-gradient(135deg,#bf5d7e,#7d9b78);color:#fff;width:42px;border-radius:50%;cursor:pointer;font-size:1rem}`;
    const tag = document.createElement("style");
    tag.id = "cwStyles"; tag.textContent = css;
    document.head.appendChild(tag);
  }
}
