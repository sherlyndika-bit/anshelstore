// Top Up (pro): cari game -> pilih -> nominal -> data akun -> bayar -> order
const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");
const EMOJI = { ml: "⚔️", ff: "🔥", genshin: "🌟", valorant: "🎯", pubgm: "🪂" };
const GRAD = { ml: "from-primary to-primary-container", ff: "from-tertiary to-tertiary-container", genshin: "from-secondary to-primary-container", valorant: "from-error to-secondary", pubgm: "from-primary-fixed-variant to-primary" };

let games = [], filtered = [], selGame = null, selItem = null, WA = null;
const $ = (id) => document.getElementById(id);

fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.store && d.store.whatsapp) WA = d.store.whatsapp; }).catch(() => {});

function gameTileHtml(g) {
  const visual = g.image
    ? `<img src="${g.image}" alt="${g.name}" class="w-12 h-12 rounded-xl object-cover"/>`
    : `<div class="w-12 h-12 rounded-xl bg-gradient-to-br ${GRAD[g.id] || "from-primary to-secondary"} flex items-center justify-center text-[24px]">${EMOJI[g.id] || "🎮"}</div>`;
  return `<button type="button" data-id="${g.id}" class="game-tile text-left rounded-DEFAULT border-2 border-outline-variant/40 bg-surface p-sm hover:-translate-y-1 hover:shadow-md transition-all">
    ${visual}
    <div class="font-label-md text-label-md text-on-surface font-bold leading-tight mt-xs">${g.name}</div>
    <div class="font-label-sm text-label-sm text-on-surface-variant">${g.publisher || ""}</div>
  </button>`;
}

function renderGames() {
  const wrap = $("games");
  wrap.innerHTML = filtered.map(gameTileHtml).join("");
  $("noGame").classList.toggle("hidden", filtered.length > 0);
  wrap.querySelectorAll(".game-tile").forEach((b) => b.addEventListener("click", () => selectGame(b.dataset.id, b)));
}

async function loadGames() {
  games = await fetch("/api/games").then((r) => r.json());
  filtered = games;
  renderGames();
  const pre = new URLSearchParams(location.search).get("game");
  if (pre) { const g = games.find((x) => x.id === pre); if (g) { const el = document.querySelector(`.game-tile[data-id="${pre}"]`); selectGame(pre, el); } }
}

$("gameSearch").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  filtered = games.filter((g) => g.name.toLowerCase().includes(q) || (g.publisher || "").toLowerCase().includes(q));
  renderGames();
});

function selectGame(id, el) {
  selGame = games.find((g) => g.id === id); selItem = null;
  document.querySelectorAll(".game-tile").forEach((b) => b.classList.remove("sel"));
  if (el) el.classList.add("sel");
  $("invoice").classList.add("hidden");

  $("items").innerHTML = selGame.items.map((i) => `
    <button type="button" data-id="${i.id}" class="item-tile text-left rounded-DEFAULT border-2 border-outline-variant/40 bg-surface px-sm py-sm hover:-translate-y-0.5 hover:shadow-sm transition-all">
      <div class="font-label-md text-label-md text-on-surface font-bold">${i.label}</div>
      <div class="font-label-md text-label-md text-secondary font-bold">${rupiah(i.price)}</div>
    </button>`).join("");
  $("items").querySelectorAll(".item-tile").forEach((b) => b.addEventListener("click", () => {
    selItem = selGame.items.find((x) => x.id === b.dataset.id);
    document.querySelectorAll(".item-tile").forEach((e) => e.classList.remove("sel"));
    b.classList.add("sel"); update();
  }));

  $("accountFields").innerHTML = selGame.needs.map((n) => `
    <label class="block"><span class="font-label-md text-label-md text-on-surface-variant">${n}</span>
      <input class="acc-field mt-xs w-full rounded-DEFAULT border-outline-variant bg-surface focus:border-primary focus:ring-primary" data-key="${n}" type="text" placeholder="Masukkan ${n}"/></label>`).join("");
  $("accountFields").querySelectorAll(".acc-field").forEach((f) => f.addEventListener("input", () => { update(); checkId(); }));

  $("stepNominal").classList.remove("hidden");
  $("stepAccount").classList.remove("hidden");
  $("stepPay").classList.remove("hidden");
  $("stepNominal").scrollIntoView({ behavior: "smooth", block: "nearest" });
  update();
}

function getAccount() { const a = {}; document.querySelectorAll(".acc-field").forEach((f) => (a[f.dataset.key] = f.value.trim())); return a; }
function getPay() { const r = document.querySelector('input[name="pay"]:checked'); return r ? r.value : "E-Wallet"; }

// Auto-detect ID game (jika provider dikonfigurasi admin)
let idTimer = null;
function checkId() {
  clearTimeout(idTimer);
  const prev = $("idPreview");
  const acc = getAccount();
  const idKey = selGame.needs[0];
  const userId = acc[idKey];
  if (!userId) { prev.classList.add("hidden"); return; }
  idTimer = setTimeout(async () => {
    try {
      const q = new URLSearchParams({ gameId: selGame.id, userId: userId || "", zoneId: acc[selGame.needs[1]] || "" });
      const r = await fetch("/api/game/check?" + q.toString()).then((x) => x.json());
      if (r.supported && r.username) {
        prev.className = "mt-sm rounded-DEFAULT px-md py-sm font-label-md text-label-md bg-primary-fixed/60 text-on-primary-fixed-variant";
        prev.innerHTML = `<span class="material-symbols-outlined text-[18px] align-middle">verified</span> Username: <b>${r.username}</b>`;
        prev.classList.remove("hidden");
      } else { prev.classList.add("hidden"); }
    } catch (e) { prev.classList.add("hidden"); }
  }, 600);
}

function update() {
  if (!selGame) return;
  const acc = getAccount();
  const rows = [`<div class="flex justify-between"><span>Game</span><b class="text-on-surface">${selGame.name}</b></div>`];
  if (selItem) rows.push(`<div class="flex justify-between"><span>Item</span><b class="text-on-surface">${selItem.label}</b></div>`);
  selGame.needs.forEach((n) => { if (acc[n]) rows.push(`<div class="flex justify-between"><span>${n}</span><b class="text-on-surface">${acc[n]}</b></div>`); });
  $("summaryItems").innerHTML = rows.join("");
  $("grandTotal").textContent = selItem ? rupiah(selItem.price) : "Rp0";
  $("submitOrder").disabled = !(selItem && selGame.needs.every((n) => acc[n]));
}

$("submitOrder").addEventListener("click", async () => {
  const btn = $("submitOrder");
  btn.disabled = true; btn.innerHTML = 'Memproses… <span class="material-symbols-outlined animate-spin">progress_activity</span>';
  try {
    const order = await fetch("/api/orders", {
      method: "POST", headers: { "Content-Type": "application/json", "x-auth-token": localStorage.getItem("anshel_token") || "" },
      body: JSON.stringify({ gameId: selGame.id, itemId: selItem.id, account: getAccount(), customerName: $("custName").value.trim() || "Guest", customerContact: $("custContact").value.trim(), paymentMethod: getPay() }),
    }).then((r) => r.json());
    showInvoice(order);
  } catch (e) { alert("Gagal membuat pesanan, coba lagi."); }
  finally { btn.innerHTML = 'Buat Pesanan <span class="material-symbols-outlined">auto_awesome</span>'; btn.disabled = false; }
});

function showInvoice(order) {
  const accRows = Object.entries(order.account).map(([k, v]) => `<div class="flex justify-between"><span>${k}</span><b class="text-on-surface">${v}</b></div>`).join("");
  const waText = encodeURIComponent(`Halo anshelstore, konfirmasi pesanan:\nInvoice: ${order.code}\nGame: ${order.gameName}\nItem: ${order.itemLabel}\nTotal: ${rupiah(order.price)}\nBayar: ${order.paymentMethod}`);
  const waBtn = WA ? `<a href="https://wa.me/${WA}?text=${waText}" target="_blank" rel="noopener" class="mt-sm w-full block text-center bg-gradient-to-r from-primary to-secondary text-on-primary rounded-full py-3 font-label-md text-label-md font-bold hover:scale-[1.02] transition-transform">💬 Konfirmasi via WhatsApp</a>` : "";
  $("invoice").classList.remove("hidden");
  $("invoice").innerHTML = `
    <div class="rounded-DEFAULT bg-primary-fixed/60 border border-primary-container/40 p-md text-body-md font-body-md text-on-surface-variant flex flex-col gap-xs">
      <div class="flex items-center gap-xs text-primary font-bold mb-xs"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">check_circle</span> Pesanan berhasil dibuat!</div>
      <div class="flex justify-between"><span>Invoice</span><b class="text-on-surface">${order.code}</b></div>
      <div class="flex justify-between"><span>Game</span><b class="text-on-surface">${order.gameName}</b></div>
      <div class="flex justify-between"><span>Item</span><b class="text-on-surface">${order.itemLabel}</b></div>
      ${accRows}
      <div class="flex justify-between"><span>Bayar via</span><b class="text-on-surface">${order.paymentMethod}</b></div>
      <div class="flex justify-between"><span>Total</span><b class="text-secondary">${rupiah(order.price)}</b></div>
      ${waBtn}
      <a href="/cek-transaksi?code=${order.code}" class="text-center font-label-md text-label-md text-primary mt-xs">Lacak status pesanan →</a>
    </div>`;
  $("invoice").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

loadGames();
if (typeof initChatWidget === "function") initChatWidget();
