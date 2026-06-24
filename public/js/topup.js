// Top Up anshelstore — Katalog (grid cover) -> Detail game (flow beli fokus, ala Codashop/Steam)
const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const EMOJI = { ml: "⚔️", ff: "🔥", genshin: "🌟", valorant: "🎯", pubgm: "🪂" };
const GRAD = {
  ml: "linear-gradient(160deg,#1d4ed8,#3b82f6)", ff: "linear-gradient(160deg,#ff6a00,#ee0979)",
  genshin: "linear-gradient(160deg,#0ea5b7,#0369a1)", valorant: "linear-gradient(160deg,#ff4655,#e11d48)",
  pubgm: "linear-gradient(160deg,#f7971e,#a85a00)",
};
const DEF_GRAD = "linear-gradient(160deg,#bf5d7e,#7d9b78)";
const CAT = { ml: "MOBA", ff: "Battle Royale", pubgm: "Battle Royale", genshin: "RPG", valorant: "FPS" };
const gradOf = (g) => GRAD[g.id] || DEF_GRAD;
const catOf = (g) => CAT[g.id] || "Lainnya";

let games = [], selGame = null, selItem = null, WA = null;
let activeCat = "Semua", searchQ = "";

fetch("/api/settings").then((r) => r.json()).then((d) => { if (d.store && d.store.whatsapp) WA = d.store.whatsapp; }).catch(() => {});

/* ---------------- KATALOG ---------------- */
function coverCard(g) {
  const art = g.image ? `<img src="${esc(g.image)}" alt="${esc(g.name)}"/>` : (EMOJI[g.id] || "🎮");
  const style = g.image ? "" : `style="background:${gradOf(g)}"`;
  return `<div class="cover-card" data-id="${esc(g.id)}">
    <div class="cover-art" ${style}>${art}</div>
    <div class="cover-grad"></div>
    <span class="cover-cta">Top Up →</span>
    <div class="ring"></div>
    <div class="cover-meta">
      <div class="font-label-md text-label-md font-extrabold leading-tight">${esc(g.name)}</div>
      <div class="text-[11px] opacity-80">${esc(g.publisher || "")}</div>
    </div>
  </div>`;
}

function renderChips() {
  const cats = ["Semua", ...Array.from(new Set(games.map(catOf)))];
  $("catChips").innerHTML = cats.map((c) => `<button type="button" data-cat="${esc(c)}" class="cat-chip rounded-full border-2 border-outline-variant/50 bg-white px-4 py-1.5 text-label-md font-bold text-on-surface-variant transition ${c === activeCat ? "active" : ""}">${esc(c)}</button>`).join("");
  $("catChips").querySelectorAll(".cat-chip").forEach((b) => b.addEventListener("click", () => { activeCat = b.dataset.cat; renderChips(); renderGames(); }));
}

function renderGames() {
  const list = games.filter((g) => (activeCat === "Semua" || catOf(g) === activeCat) && (g.name.toLowerCase().includes(searchQ) || (g.publisher || "").toLowerCase().includes(searchQ)));
  $("games").innerHTML = list.map(coverCard).join("");
  $("noGame").classList.toggle("hidden", list.length > 0);
  $("games").querySelectorAll(".cover-card").forEach((c) => c.addEventListener("click", () => navTo(c.dataset.id, true)));
}

$("gameSearch").addEventListener("input", (e) => { searchQ = e.target.value.toLowerCase().trim(); renderGames(); });

/* ---------------- DETAIL GAME ---------------- */
function ytId(u) { const m = String(u).match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(u) ? u : null); }
function renderGameHeaderBg(game) {
  const bg = $("gameHeaderBg");
  bg.style.filter = ""; bg.style.transform = ""; bg.style.opacity = ""; bg.style.inset = ""; bg.style.background = "";
  if (game.video) {
    const id = ytId(game.video);
    // video jadi SAMPUL background di belakang nama/publisher/kategori — autoplay, mute, loop
    bg.style.inset = "0"; bg.style.filter = "none"; bg.style.transform = "none"; bg.style.opacity = "1";
    bg.innerHTML = id
      ? `<div class="absolute inset-0 overflow-hidden"><iframe class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" style="width:100%;aspect-ratio:16/9;min-height:100%;min-width:100%" src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0&playsinline=1&showinfo=0&iv_load_policy=3" frameborder="0" allow="autoplay; encrypted-media"></iframe></div>`
      : `<video class="absolute inset-0 w-full h-full object-cover" src="${esc(game.video)}" autoplay muted loop playsinline></video>`;
  } else if (game.image) {
    bg.innerHTML = "";
    bg.style.background = `center/cover no-repeat url('${game.image}')`;
  } else {
    bg.innerHTML = "";
    bg.style.background = gradOf(game);
  }
}
function renderGameShots(game) {
  const el = $("gameShots"); if (!el) return;
  const shots = (game.screenshots || []).filter(Boolean);
  el.innerHTML = shots.length
    ? shots.map((s) => `<a href="${esc(s)}" target="_blank" rel="noopener" class="thumb !w-32 !h-20"><img src="${esc(s)}" alt="${esc(game.name)}"/></a>`).join("")
    : "";
}
function renderGameInfo(game) {
  $("gameDescName").textContent = game.name;
  const desc = game.description || `${game.name}${game.publisher ? ` dari ${game.publisher}` : ""} — top up resmi dengan proses instan & aman di Anshel Store. Pilih nominal di panel sebelah kanan, masukkan ID akunmu dengan benar, lalu lakukan pembayaran. Item/diamond akan langsung masuk ke akunmu dalam hitungan menit. Tersedia berbagai pilihan nominal mulai dari yang termurah, plus promo menarik setiap minggu.`;
  $("gameDesc").innerHTML = desc.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
  $("gameNeeds").innerHTML = game.needs.map((n) => `<span class="inline-flex items-center gap-1 bg-secondary-fixed text-secondary font-label-sm text-label-sm px-3 py-1 rounded-full"><span class="material-symbols-outlined text-[15px]">badge</span> Butuh: ${esc(n)}</span>`).join("");
}
function showDetail(game) {
  selGame = game; selItem = null;
  $("catalogView").classList.add("hidden");
  $("detailView").classList.remove("hidden");
  document.body.setAttribute("data-view", "detail");

  // Header — video/gambar jadi background DI BELAKANG nama/publisher/kategori
  renderGameHeaderBg(game);
  const useImg = !!game.image;
  $("ghCover").style.background = useImg ? "#0000" : gradOf(game);
  $("ghCover").innerHTML = useImg ? `<img src="${esc(game.image)}" alt="${esc(game.name)}" class="w-full h-full object-cover"/>` : (EMOJI[game.id] || "🎮");
  $("ghName").textContent = game.name;
  $("ghPub").textContent = game.publisher ? "oleh " + game.publisher : "";
  renderGameInfo(game);
  renderGameShots(game);

  // Akun
  $("accountFields").innerHTML = game.needs.map((n) => `
    <label class="block"><span class="font-label-md text-label-md text-on-surface-variant">${esc(n)}</span>
      <input class="acc-field mt-xs w-full rounded-xl border-outline-variant bg-surface focus:border-secondary focus:ring-secondary" data-key="${esc(n)}" type="text" placeholder="Masukkan ${esc(n)}"/></label>`).join("");
  $("accountFields").querySelectorAll(".acc-field").forEach((f) => f.addEventListener("input", () => { update(); checkId(); }));

  // Nominal
  $("items").innerHTML = game.items.map((i) => `
    <button type="button" data-id="${esc(i.id)}" class="nom-card">
      <div class="nom-amt"><span>💎</span><span class="leading-tight">${esc(i.label)}</span></div>
      <div class="nom-price">${rupiah(i.price)}</div>
    </button>`).join("");
  $("items").querySelectorAll(".nom-card").forEach((b) => b.addEventListener("click", () => {
    selItem = selGame.items.find((x) => x.id === b.dataset.id);
    $("items").querySelectorAll(".nom-card").forEach((e) => e.classList.remove("sel"));
    b.classList.add("sel"); update();
  }));

  // reset
  $("idPreview").classList.add("hidden");
  $("invoice").classList.add("hidden");
  $("submitOrder").disabled = true;
  $("summaryItems").innerHTML = '<p class="text-center py-md">Pilih nominal dulu ya 🎮</p>';
  $("grandTotal").textContent = "Rp0";

  // Game lain
  $("otherGames").innerHTML = games.filter((g) => g.id !== game.id).map((g) => {
    const art = g.image ? `<img src="${esc(g.image)}" alt="${esc(g.name)}" class="w-full h-full object-cover"/>` : (EMOJI[g.id] || "🎮");
    const style = g.image ? "" : `style="background:${gradOf(g)}"`;
    return `<button type="button" data-id="${esc(g.id)}" class="og-card group rounded-xl overflow-hidden aspect-square flex items-center justify-center text-[34px] shadow-sm hover:-translate-y-1 transition" ${style}>${art}</button>`;
  }).join("");
  $("otherGames").querySelectorAll(".og-card").forEach((b) => b.addEventListener("click", () => navTo(b.dataset.id, true)));

  update();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showCatalog() {
  selGame = null; selItem = null;
  $("detailView").classList.add("hidden");
  $("catalogView").classList.remove("hidden");
  document.body.removeAttribute("data-view");
}

// Navigasi katalog <-> detail dengan URL bersih (tanpa #)
function navTo(gameId, push) {
  const g = games.find((x) => x.id === gameId);
  if (g) { if (push) history.pushState({ game: gameId }, "", "/topup?game=" + encodeURIComponent(gameId)); showDetail(g); }
  else { if (push) history.pushState({}, "", "/topup"); showCatalog(); }
}
$("backToCatalog").addEventListener("click", () => { history.pushState({}, "", "/topup"); showCatalog(); window.scrollTo({ top: 0, behavior: "smooth" }); });
window.addEventListener("popstate", () => { const id = new URLSearchParams(location.search).get("game"); const g = id && games.find((x) => x.id === id); if (g) showDetail(g); else showCatalog(); });

// pilih pembayaran (visual)
document.querySelectorAll('input[name="pay"]').forEach((r) => r.addEventListener("change", () => {
  document.querySelectorAll(".payment-card").forEach((c) => c.classList.remove("sel"));
  if (r.checked) r.closest(".payment-radio").querySelector(".payment-card").classList.add("sel");
}));

/* ---------------- Helpers ---------------- */
function getAccount() { const a = {}; document.querySelectorAll(".acc-field").forEach((f) => (a[f.dataset.key] = f.value.trim())); return a; }
function getPay() { const r = document.querySelector('input[name="pay"]:checked'); return r ? r.value : "E-Wallet"; }

let idTimer = null;
function checkId() {
  clearTimeout(idTimer);
  const prev = $("idPreview"); const acc = getAccount(); const userId = acc[selGame.needs[0]];
  if (!userId) { prev.classList.add("hidden"); return; }
  idTimer = setTimeout(async () => {
    try {
      const q = new URLSearchParams({ gameId: selGame.id, userId: userId || "", zoneId: acc[selGame.needs[1]] || "" });
      const r = await fetch("/api/game/check?" + q.toString()).then((x) => x.json());
      if (r.supported && r.username) {
        prev.className = "mt-sm rounded-xl px-md py-sm font-label-md text-label-md bg-primary-fixed/60 text-on-primary-fixed-variant";
        prev.innerHTML = `<span class="material-symbols-outlined text-[18px] align-middle">verified</span> Username: <b>${esc(r.username)}</b>`;
        prev.classList.remove("hidden");
      } else { prev.classList.add("hidden"); }
    } catch (e) { prev.classList.add("hidden"); }
  }, 600);
}

function update() {
  if (!selGame) return;
  const acc = getAccount();
  const rows = [`<div class="flex justify-between"><span>Game</span><b class="text-on-surface">${esc(selGame.name)}</b></div>`];
  if (selItem) rows.push(`<div class="flex justify-between"><span>Item</span><b class="text-on-surface">${esc(selItem.label)}</b></div>`);
  selGame.needs.forEach((n) => { if (acc[n]) rows.push(`<div class="flex justify-between"><span>${esc(n)}</span><b class="text-on-surface">${esc(acc[n])}</b></div>`); });
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
  const accRows = Object.entries(order.account).map(([k, v]) => `<div class="flex justify-between"><span>${esc(k)}</span><b class="text-on-surface">${esc(v)}</b></div>`).join("");
  const waText = encodeURIComponent(`Halo Anshel Store, konfirmasi pesanan:\nInvoice: ${order.code}\nGame: ${order.gameName}\nItem: ${order.itemLabel}\nTotal: ${rupiah(order.price)}\nBayar: ${order.paymentMethod}`);
  const waBtn = WA ? `<a href="https://wa.me/${WA}?text=${waText}" target="_blank" rel="noopener" class="mt-sm w-full block text-center bg-gradient-to-r from-secondary to-pink text-on-primary rounded-full py-3 font-label-md text-label-md font-bold hover:scale-[1.02] transition-transform">💬 Konfirmasi via WhatsApp</a>` : "";
  $("invoice").classList.remove("hidden");
  $("invoice").innerHTML = `
    <div class="rounded-xl bg-primary-fixed/60 border border-primary-container/40 p-md text-body-md font-body-md text-on-surface-variant flex flex-col gap-xs">
      <div class="flex items-center gap-xs text-primary font-bold mb-xs"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">check_circle</span> Pesanan berhasil dibuat!</div>
      <div class="flex justify-between"><span>Invoice</span><b class="text-on-surface">${esc(order.code)}</b></div>
      <div class="flex justify-between"><span>Game</span><b class="text-on-surface">${esc(order.gameName)}</b></div>
      <div class="flex justify-between"><span>Item</span><b class="text-on-surface">${esc(order.itemLabel)}</b></div>
      ${accRows}
      <div class="flex justify-between"><span>Bayar via</span><b class="text-on-surface">${esc(order.paymentMethod)}</b></div>
      <div class="flex justify-between"><span>Total</span><b class="text-secondary">${rupiah(order.price)}</b></div>
      ${waBtn}
      <a href="/cek-transaksi?code=${esc(order.code)}" class="text-center font-label-md text-label-md text-primary mt-xs">Lacak status pesanan →</a>
    </div>`;
  $("invoice").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------------- Boot ---------------- */
async function init() {
  games = await fetch("/api/games").then((r) => r.json());
  renderChips();
  renderGames();
  const pre = new URLSearchParams(location.search).get("game");
  const g = pre && games.find((x) => x.id === pre);
  if (g) showDetail(g); else showCatalog();
}
init();
if (typeof initChatWidget === "function") initChatWidget();
