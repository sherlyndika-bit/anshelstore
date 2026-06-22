/**
 * Chat widget customer. Mengobrol dengan backend:
 *  - POST /api/chat/start         -> mulai percakapan
 *  - POST /api/chat/message       -> kirim pesan (dapat balasan AI bila mode AI)
 *  - GET  /api/conversations/:id/messages?since=  -> polling pesan baru (mis. dari agent setelah takeover)
 */
function initChatWidget(options = {}) {
  const mount = document.getElementById("chatWidget");
  if (!mount) return;

  let conversationId = Number(localStorage.getItem("anshel_conv")) || null;
  let lastId = 0;
  let open = options.openByDefault || false;
  let pollTimer = null;

  mount.innerHTML = `
    <button id="cwToggle" class="cw-bubble" aria-label="Buka chat">💬</button>
    <div id="cwPanel" class="cw-panel">
      <div class="cw-head">
        <div><strong>anshelstore</strong><div class="cw-sub" id="cwStatus">Asisten AI • online</div></div>
        <button id="cwClose" class="cw-x" aria-label="Tutup">✕</button>
      </div>
      <div class="cw-body" id="cwBody"></div>
      <form class="cw-input" id="cwForm">
        <input id="cwText" type="text" placeholder="Tulis pesan…" autocomplete="off" />
        <button type="submit" class="cw-send">➤</button>
      </form>
    </div>`;

  injectStyles();
  const panel = mount.querySelector("#cwPanel");
  const body = mount.querySelector("#cwBody");
  const statusEl = mount.querySelector("#cwStatus");

  function render(open) {
    panel.style.display = open ? "flex" : "none";
  }
  render(open);

  mount.querySelector("#cwToggle").onclick = async () => {
    open = !open;
    render(open);
    if (open && !conversationId) await start();
    if (open) startPolling();
  };
  mount.querySelector("#cwClose").onclick = () => {
    open = false;
    render(false);
    stopPolling();
  };

  function addBubble(msg) {
    const isCustomer = msg.sender === "customer";
    const who = msg.sender === "agent" ? "🧑‍💼 Agent" : msg.sender === "ai" ? "🤖 AI" : "";
    const div = document.createElement("div");
    div.className = "cw-msg " + (isCustomer ? "cw-out" : "cw-in");
    div.innerHTML = (who ? `<span class="cw-who">${who}</span>` : "") + escapeHtml(msg.text);
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    if (msg.id > lastId) lastId = msg.id;
  }

  async function start() {
    const name = options.name || "Pengunjung";
    const data = await fetch("/api/chat/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).then((r) => r.json());
    conversationId = data.conversation.id;
    localStorage.setItem("anshel_conv", conversationId);
    data.messages.forEach(addBubble);
  }

  mount.querySelector("#cwForm").onsubmit = async (e) => {
    e.preventDefault();
    const input = mount.querySelector("#cwText");
    const text = input.value.trim();
    if (!text) return;
    if (!conversationId) await start();
    input.value = "";
    const data = await fetch("/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, text }),
    }).then((r) => r.json());
    data.messages.forEach(addBubble);
    updateStatus(data.mode);
  };

  function updateStatus(mode) {
    if (mode === "human") {
      statusEl.textContent = "🧑‍💼 Terhubung dengan agent";
    } else {
      statusEl.textContent = "Asisten AI • online";
    }
  }

  async function poll() {
    if (!conversationId) return;
    try {
      const msgs = await fetch(
        `/api/conversations/${conversationId}/messages?since=${lastId}`
      ).then((r) => r.json());
      msgs.forEach((m) => {
        // jangan dobel pesan customer yang sudah tampil
        if (m.sender !== "customer") addBubble(m);
        else if (m.id > lastId) lastId = m.id;
      });
    } catch (e) {
      /* abaikan */
    }
  }
  function startPolling() {
    stopPolling();
    pollTimer = setInterval(poll, 2500);
  }
  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function injectStyles() {
    if (document.getElementById("cwStyles")) return;
    const css = `
    .cw-bubble{position:fixed;right:22px;bottom:22px;width:58px;height:58px;border-radius:50%;border:0;cursor:pointer;font-size:1.5rem;background:linear-gradient(120deg,#6d8bff,#22d3ee);color:#07101f;box-shadow:0 10px 30px rgba(109,139,255,.4);z-index:100;}
    .cw-panel{position:fixed;right:22px;bottom:92px;width:340px;max-width:calc(100vw - 44px);height:480px;max-height:70vh;background:#0f1525;border:1px solid #1f2940;border-radius:16px;display:none;flex-direction:column;overflow:hidden;z-index:100;box-shadow:0 20px 60px rgba(0,0,0,.5);}
    .cw-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#131a2c;border-bottom:1px solid #1f2940;}
    .cw-sub{font-size:.75rem;color:#95a1bd;margin-top:2px;}
    .cw-x{background:none;border:0;color:#95a1bd;font-size:1.1rem;cursor:pointer;}
    .cw-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;}
    .cw-msg{max-width:80%;padding:9px 13px;border-radius:14px;font-size:.9rem;line-height:1.45;word-wrap:break-word;}
    .cw-in{align-self:flex-start;background:#1f2940;color:#e7ecf5;border-bottom-left-radius:4px;}
    .cw-out{align-self:flex-end;background:linear-gradient(120deg,#6d8bff,#22d3ee);color:#07101f;border-bottom-right-radius:4px;font-weight:500;}
    .cw-who{display:block;font-size:.68rem;opacity:.7;margin-bottom:2px;font-weight:700;}
    .cw-input{display:flex;gap:8px;padding:12px;border-top:1px solid #1f2940;}
    .cw-input input{flex:1;padding:10px 12px;border-radius:999px;border:1px solid #1f2940;background:#0a0e1a;color:#e7ecf5;}
    .cw-input input:focus{outline:none;border-color:#6d8bff;}
    .cw-send{border:0;background:linear-gradient(120deg,#6d8bff,#22d3ee);color:#07101f;width:40px;border-radius:50%;cursor:pointer;font-size:1rem;}`;
    const tag = document.createElement("style");
    tag.id = "cwStyles";
    tag.textContent = css;
    document.head.appendChild(tag);
  }
}
