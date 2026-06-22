// Top Up: pilih game -> nominal -> data akun -> ringkasan -> buat order
const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");
const EMOJI = { ml: "⚔️", ff: "🔥", genshin: "🌟", valorant: "🎯", pubgm: "🪂" };

let games = [], selGame = null, selItem = null;

document.getElementById("year").textContent = new Date().getFullYear();
const navT = document.getElementById("navToggle"), navL = document.getElementById("navLinks");
if (navT) navT.addEventListener("click", () => navL.classList.toggle("open"));

async function loadGames() {
  games = await fetch("/api/games").then((r) => r.json());
  const el = document.getElementById("games");
  el.innerHTML = games.map((g) => `
    <div class="game-card" data-id="${g.id}">
      <div class="game-emoji">${EMOJI[g.id] || "🎮"}</div>
      <h4>${g.name}</h4><span>${g.publisher}</span>
    </div>`).join("");
  el.querySelectorAll(".game-card").forEach((c) => c.addEventListener("click", () => selectGame(c.dataset.id, c)));
}

function selectGame(id, cardEl) {
  selGame = games.find((g) => g.id === id); selItem = null;
  document.querySelectorAll(".game-card").forEach((c) => c.classList.remove("sel"));
  cardEl.classList.add("sel");
  document.getElementById("detailPanel").classList.remove("hidden");
  document.getElementById("invoice").classList.add("hidden");

  document.getElementById("items").innerHTML = selGame.items.map((i) =>
    `<div class="item" data-id="${i.id}"><b>${i.label}</b><span>${rupiah(i.price)}</span></div>`).join("");
  document.querySelectorAll(".item").forEach((it) => it.addEventListener("click", () => {
    selItem = selGame.items.find((x) => x.id === it.dataset.id);
    document.querySelectorAll(".item").forEach((e) => e.classList.remove("sel"));
    it.classList.add("sel"); update();
  }));

  document.getElementById("accountFields").innerHTML = selGame.needs.map((n) =>
    `<div class="field"><label>${n}</label><input class="input acc-field" data-key="${n}" type="text" placeholder="Masukkan ${n}" /></div>`).join("");
  document.querySelectorAll(".acc-field").forEach((f) => f.addEventListener("input", update));
  update();
}

function getAccount() {
  const acc = {};
  document.querySelectorAll(".acc-field").forEach((f) => (acc[f.dataset.key] = f.value.trim()));
  return acc;
}

function update() {
  const body = document.getElementById("summaryBody");
  if (!selGame) return;
  const rows = [`<div class="row"><span>Game</span><b>${selGame.name}</b></div>`];
  if (selItem) rows.push(`<div class="row"><span>Item</span><b>${selItem.label}</b></div>`);
  const acc = getAccount();
  selGame.needs.forEach((n) => { if (acc[n]) rows.push(`<div class="row"><span>${n}</span><b>${acc[n]}</b></div>`); });
  if (selItem) rows.push(`<div class="row total"><span>Total</span><b>${rupiah(selItem.price)}</b></div>`);
  body.innerHTML = rows.join("");

  const accFilled = selGame.needs.every((n) => acc[n]);
  document.getElementById("submitOrder").disabled = !(selItem && accFilled);
}

document.getElementById("submitOrder").addEventListener("click", async () => {
  const btn = document.getElementById("submitOrder");
  btn.disabled = true; btn.textContent = "Memproses…";
  try {
    const order = await fetch("/api/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: selGame.id, itemId: selItem.id, account: getAccount(),
        customerName: document.getElementById("custName").value.trim() || "Guest",
        customerContact: document.getElementById("custContact").value.trim(),
      }),
    }).then((r) => r.json());
    showInvoice(order);
  } catch (e) { alert("Gagal membuat pesanan, coba lagi."); }
  finally { btn.textContent = "Buat Pesanan"; btn.disabled = false; }
});

function showInvoice(order) {
  const accRows = Object.entries(order.account).map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join("");
  const inv = document.getElementById("invoice");
  inv.classList.remove("hidden");
  inv.innerHTML = `
    <h3>✅ Pesanan berhasil dibuat!</h3>
    <div class="row"><span>Invoice</span><b>${order.code}</b></div>
    <div class="row"><span>Game</span><b>${order.gameName}</b></div>
    <div class="row"><span>Item</span><b>${order.itemLabel}</b></div>
    ${accRows}
    <div class="row"><span>Total</span><b>${rupiah(order.price)}</b></div>
    <p style="color:#166534;margin-top:10px;font-size:.86rem;">Simpan kode invoice ini. Pesanan sedang diproses admin. 🙌</p>`;
  inv.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

loadGames();
initChatWidget();
