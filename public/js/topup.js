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

fetch("/api/settings").then((r) => r.json()).then((d) => {
  if (d.store && d.store.whatsapp) WA = d.store.whatsapp;
  const logo = d.settings && d.settings.logo;
  if (logo) { const bg = document.getElementById("topupHeroBg"); if (bg) bg.style.background = `center/cover no-repeat url("${logo}")`; }
}).catch(() => {});

/* ---------------- KATALOG ---------------- */
function coverCard(g) {
  const art = g.image ? `<img src="${esc(g.image)}" alt="${esc(g.name)}" class="w-full h-full object-cover"/>` : `<span class="text-[44px]">${EMOJI[g.id] || "🎮"}</span>`;
  const min = g.items && g.items.length ? Math.min(...g.items.map((i) => i.price)) : 0;
  return `<div class="game-card bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-primary/50 relative flex flex-col group transition-all duration-300 cursor-pointer hover:-translate-y-1" data-id="${esc(g.id)}">
    <div class="w-20 h-20 rounded-2xl mx-auto mb-4 overflow-hidden border border-slate-100 shadow-sm flex items-center justify-center text-4xl" style="background:${gradOf(g)}">${art}</div>
    <div class="text-center flex-grow flex flex-col">
      <h3 class="font-bold text-slate-800 mb-1 leading-tight truncate">${esc(g.name)}</h3>
      <p class="text-xs text-slate-500 mb-4">${esc(catOf(g))}</p>
      <div class="mt-auto pt-3 border-t border-slate-100 flex flex-col gap-2">
        ${min ? `<div class="text-xs text-slate-500">Mulai <b class="text-primary">Rp${min.toLocaleString("id-ID")}</b></div>` : ""}
        <span class="w-full bg-slate-50 text-slate-700 font-semibold py-2 rounded-lg border border-slate-200 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors flex justify-center items-center gap-1 text-sm">
          Top Up <span class="material-symbols-outlined text-[16px]">add_circle</span>
        </span>
      </div>
    </div>
  </div>`;
}

function renderChips() {
  const cats = ["Semua", ...Array.from(new Set(games.map(catOf)))];
  $("catChips").innerHTML = cats.map((c) => `<button type="button" data-cat="${esc(c)}" class="cat-chip text-sm font-semibold px-5 py-2 rounded-full border transition-colors ${c === activeCat ? "bg-primary text-white border-primary shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}">${esc(c)}</button>`).join("");
  $("catChips").querySelectorAll(".cat-chip").forEach((b) => b.addEventListener("click", () => { activeCat = b.dataset.cat; renderChips(); renderGames(); }));
}

function renderGames() {
  const list = games.filter((g) => (activeCat === "Semua" || catOf(g) === activeCat) && (g.name.toLowerCase().includes(searchQ) || (g.publisher || "").toLowerCase().includes(searchQ)));
  $("games").innerHTML = list.map(coverCard).join("");
  $("noGame").classList.toggle("hidden", list.length > 0);
  $("games").querySelectorAll(".game-card").forEach((c) => c.addEventListener("click", () => navTo(c.dataset.id, true)));
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
  el.classList.toggle("hidden", shots.length === 0);
  if (shots.length) el.classList.add("flex");
  el.innerHTML = shots.map((s) => `<a href="${esc(s)}" target="_blank" rel="noopener" class="shrink-0 w-40 h-24 rounded-xl overflow-hidden border-[1.5px] border-outline-variant block"><img src="${esc(s)}" alt="${esc(game.name)}" class="w-full h-full object-cover"/></a>`).join("");
}
function renderGameInfo(game) {
  $("gameDescName").textContent = game.name;
  const desc = game.description || `${game.name}${game.publisher ? ` dari ${game.publisher}` : ""} — top up resmi dengan proses instan & aman di Anshel Store. Pilih nominal di panel sebelah kanan, masukkan ID akunmu dengan benar, lalu lakukan pembayaran. Item/diamond akan langsung masuk ke akunmu dalam hitungan menit. Tersedia berbagai pilihan nominal mulai dari yang termurah, plus promo menarik setiap minggu.`;
  $("gameDesc").innerHTML = desc.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p class="mb-2 text-slate-600 text-sm leading-relaxed">${esc(p)}</p>`).join("");
  $("gameNeeds").innerHTML = game.needs.map((n) => `<span class="inline-flex items-center gap-1 bg-slate-100 text-slate-600 font-semibold text-xs px-3 py-1 rounded-full"><span class="material-symbols-outlined text-[14px]">badge</span> Butuh: ${esc(n)}</span>`).join("");
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
    <div class="relative">
      <label class="absolute top-2 left-4 text-[10px] font-bold text-slate-500 uppercase tracking-wide z-10">${esc(n)}</label>
      <input class="acc-field w-full bg-slate-50 border border-slate-300 focus:border-primary focus:ring-1 focus:ring-primary rounded-lg px-4 pt-6 pb-2 text-slate-800 placeholder:text-slate-400 transition-all" data-key="${esc(n)}" type="text" placeholder="Masukkan ${esc(n)}"/>
    </div>`).join("");
  $("accountFields").querySelectorAll(".acc-field").forEach((f) => f.addEventListener("input", () => { update(); checkId(); }));

  // Nominal
  $("items").innerHTML = game.items.map((i) => `
    <button type="button" data-id="${esc(i.id)}" class="nom-card w-full flex flex-col items-center justify-center border-2 border-slate-200 bg-white rounded-xl p-4 cursor-pointer hover:border-primary/50 hover:bg-rose-50/30 transition-all text-center [&.sel]:border-primary [&.sel]:bg-rose-50/50">
      <div class="font-bold text-slate-800 text-sm flex items-center gap-1"><span class="material-symbols-outlined text-rose-500 text-sm">diamond</span><span class="leading-tight">${esc(i.label)}</span></div>
      <div class="text-sm font-semibold text-primary mt-1">${rupiah(i.price)}</div>
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
    return `<button type="button" data-id="${esc(g.id)}" class="og-card group rounded-xl overflow-hidden aspect-square flex items-center justify-center text-3xl shadow-sm border border-slate-100 hover:shadow-md hover:border-primary/50 hover:-translate-y-1 transition-all" ${style}>${art}</button>`;
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
        prev.className = "mt-3 rounded-lg px-4 py-3 text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2";
        prev.innerHTML = `<span class="material-symbols-outlined text-[18px]">verified</span> Username: <b>${esc(r.username)}</b>`;
        prev.classList.remove("hidden");
      } else { prev.classList.add("hidden"); }
    } catch (e) { prev.classList.add("hidden"); }
  }, 600);
}

function update() {
  if (!selGame) return;
  const acc = getAccount();
  const rows = [`<div class="flex justify-between items-center py-2 border-b border-slate-100"><span class="text-slate-500 text-sm">Game</span><b class="text-slate-900">${esc(selGame.name)}</b></div>`];
  if (selItem) rows.push(`<div class="flex justify-between items-center py-2 border-b border-slate-100"><span class="text-slate-500 text-sm">Item</span><b class="text-slate-900">${esc(selItem.label)}</b></div>`);
  selGame.needs.forEach((n) => { if (acc[n]) rows.push(`<div class="flex justify-between items-center py-2 border-b border-slate-100"><span class="text-slate-500 text-sm">${esc(n)}</span><b class="text-slate-900">${esc(acc[n])}</b></div>`); });
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
  const accRows = Object.entries(order.account).map(([k, v]) => `<div class="flex justify-between items-center py-2 border-b border-slate-100"><span class="text-slate-500 text-sm">${esc(k)}</span><b class="text-slate-900">${esc(v)}</b></div>`).join("");
  const waText = encodeURIComponent(`Halo Anshel Store, konfirmasi pesanan:\nInvoice: ${order.code}\nGame: ${order.gameName}\nItem: ${order.itemLabel}\nTotal: ${rupiah(order.price)}\nBayar: ${order.paymentMethod}`);
  const waBtn = WA ? `<a href="https://wa.me/${WA}?text=${waText}" target="_blank" rel="noopener" class="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-3 text-sm font-bold transition-all shadow-sm shadow-emerald-500/20"><span class="material-symbols-outlined text-[20px]">chat</span> Konfirmasi via WhatsApp</a>` : "";
  $("invoice").classList.remove("hidden");
  $("invoice").innerHTML = `
    <div class="rounded-xl bg-white border border-slate-200 shadow-sm p-6 flex flex-col gap-1">
      <div class="flex items-center gap-2 text-emerald-600 font-bold mb-4 text-base"><span class="material-symbols-outlined">check_circle</span> Pesanan berhasil dibuat!</div>
      <div class="flex justify-between items-center py-2 border-b border-slate-100"><span class="text-slate-500 text-sm">Invoice</span><b class="text-slate-900">${esc(order.code)}</b></div>
      <div class="flex justify-between items-center py-2 border-b border-slate-100"><span class="text-slate-500 text-sm">Game</span><b class="text-slate-900">${esc(order.gameName)}</b></div>
      <div class="flex justify-between items-center py-2 border-b border-slate-100"><span class="text-slate-500 text-sm">Item</span><b class="text-slate-900">${esc(order.itemLabel)}</b></div>
      ${accRows}
      <div class="flex justify-between items-center py-2 border-b border-slate-100"><span class="text-slate-500 text-sm">Bayar via</span><b class="text-slate-900">${esc(order.paymentMethod)}</b></div>
      <div class="flex justify-between items-center pt-4 pb-2"><span class="text-slate-500 text-sm">Total</span><b class="text-primary text-xl">${rupiah(order.price)}</b></div>
      ${waBtn}
      <a href="/cek-transaksi?code=${esc(order.code)}" class="text-center text-sm font-semibold text-primary hover:text-primary-hover mt-4 block">Lacak status pesanan →</a>
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
