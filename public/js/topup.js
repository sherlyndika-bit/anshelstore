// Halaman Top Up: pilih game -> nominal -> data akun -> buat order ke backend
const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");
const EMOJI = { ml: "⚔️", ff: "🔥", genshin: "🌟", valorant: "🎯", pubgm: "🪂" };

let games = [];
let selGame = null;
let selItem = null;

document.getElementById("year").textContent = new Date().getFullYear();

async function loadGames() {
  games = await fetch("/api/games").then((r) => r.json());
  const el = document.getElementById("games");
  el.innerHTML = games
    .map(
      (g) => `
    <div class="game-card" data-id="${g.id}">
      <div class="game-emoji">${EMOJI[g.id] || "🎮"}</div>
      <h4>${g.name}</h4>
      <span>${g.publisher}</span>
    </div>`
    )
    .join("");
  el.querySelectorAll(".game-card").forEach((c) =>
    c.addEventListener("click", () => selectGame(c.dataset.id, c))
  );
}

function selectGame(id, cardEl) {
  selGame = games.find((g) => g.id === id);
  selItem = null;
  document.querySelectorAll(".game-card").forEach((c) => c.classList.remove("sel"));
  cardEl.classList.add("sel");

  document.getElementById("orderPanel").classList.remove("hidden");
  document.getElementById("selGameName").textContent = selGame.name + " — " + selGame.publisher;
  document.getElementById("invoice").classList.add("hidden");

  // nominal
  document.getElementById("items").innerHTML = selGame.items
    .map(
      (i) => `<div class="item" data-id="${i.id}"><b>${i.label}</b><span>${rupiah(i.price)}</span></div>`
    )
    .join("");
  document.querySelectorAll(".item").forEach((it) =>
    it.addEventListener("click", () => {
      selItem = selGame.items.find((x) => x.id === it.dataset.id);
      document.querySelectorAll(".item").forEach((e) => e.classList.remove("sel"));
      it.classList.add("sel");
      validate();
    })
  );

  // field data akun sesuai kebutuhan game
  document.getElementById("accountFields").innerHTML = selGame.needs
    .map(
      (n) => `<label>${n}</label><input class="acc-field" data-key="${n}" type="text" placeholder="${n}" />`
    )
    .join("");
  document.querySelectorAll(".acc-field").forEach((f) => f.addEventListener("input", validate));

  document.getElementById("orderPanel").scrollIntoView({ behavior: "smooth" });
  validate();
}

function getAccount() {
  const acc = {};
  document.querySelectorAll(".acc-field").forEach((f) => (acc[f.dataset.key] = f.value.trim()));
  return acc;
}

function validate() {
  const acc = getAccount();
  const accFilled = selGame && selGame.needs.every((n) => acc[n]);
  const ok = selItem && accFilled;
  document.getElementById("submitOrder").disabled = !ok;
}

document.getElementById("submitOrder").addEventListener("click", async () => {
  const btn = document.getElementById("submitOrder");
  btn.disabled = true;
  btn.textContent = "Memproses…";
  try {
    const order = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId: selGame.id,
        itemId: selItem.id,
        account: getAccount(),
        customerName: document.getElementById("custName").value.trim() || "Guest",
        customerContact: document.getElementById("custContact").value.trim(),
      }),
    }).then((r) => r.json());

    showInvoice(order);
  } catch (e) {
    alert("Gagal membuat pesanan, coba lagi.");
  } finally {
    btn.textContent = "Buat Pesanan";
    btn.disabled = false;
  }
});

function showInvoice(order) {
  const accRows = Object.entries(order.account)
    .map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`)
    .join("");
  const inv = document.getElementById("invoice");
  inv.classList.remove("hidden");
  inv.innerHTML = `
    <h3 style="margin-bottom:10px;">✅ Pesanan dibuat!</h3>
    <div class="row"><span>Kode Invoice</span><b>${order.code}</b></div>
    <div class="row"><span>Game</span><b>${order.gameName}</b></div>
    <div class="row"><span>Item</span><b>${order.itemLabel}</b></div>
    ${accRows}
    <div class="row"><span>Total</span><b>${rupiah(order.price)}</b></div>
    <div class="row"><span>Status</span><b><span class="tag tag-${order.status}">${order.status}</span></b></div>
    <p style="color:var(--muted);margin-top:12px;font-size:.9rem;">Pesanan kamu masuk ke dashboard admin untuk diproses. Simpan kode invoice di atas ya.</p>
  `;
  inv.scrollIntoView({ behavior: "smooth" });
}

loadGames();
initChatWidget();
