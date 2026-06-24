// Homepage anshelstore — katalog game (bintang), search, banner promo, artikel
if (location.hash) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
window.scrollTo(0, 0);

const EMOJI = { ml: "⚔️", ff: "🔥", genshin: "🌟", valorant: "🎯", pubgm: "🪂" };
const GRAD = { ml: "from-primary to-primary-container", ff: "from-tertiary to-tertiary-container", genshin: "from-secondary to-primary-container", valorant: "from-error to-secondary", pubgm: "from-primary-fixed-variant to-primary" };
const gradOf = (id) => GRAD[id] || "from-pink to-secondary";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let allGames = [];

async function loadStore() {
  try {
    const d = await fetch("/api/settings").then((r) => r.json());
    const s = d.store || {}, set = d.settings || {};
    if (s.whatsapp) {
      const wa = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Halo anshelstore, saya mau konsultasi jasa AI.")}`;
      const cb = document.getElementById("ctaBuild"); if (cb) cb.href = wa;
    }
    const setText = (id, v) => { const el = document.getElementById(id); if (el && v) el.textContent = v; };
    setText("heroSub", set.heroSubtitle);
    setText("txtLayananTitle", set.layananTitle);
    setText("txtLayananDesc", set.layananDesc);
    setText("txtTopupTitle", set.topupTitle);
    setText("txtTopupDesc", set.topupDesc);
    setText("txtArtikelTitle", set.articlesTitle);
    const img = document.getElementById("heroImg");
    if (img && set.heroImage) img.src = set.heroImage;
    // Banner promo
    if (set.bannerImage) {
      const b = document.getElementById("promoBanner");
      document.getElementById("promoImg").src = set.bannerImage;
      if (set.bannerLink) b.href = set.bannerLink;
      b.classList.remove("hidden");
    }
  } catch (e) { /* abaikan */ }
}

function gameCard(g) {
  const visual = g.image
    ? `<img src="${esc(g.image)}" alt="${esc(g.name)}" class="w-full h-full object-cover"/>`
    : `<span class="text-[2.4rem]">${EMOJI[g.id] || "🎮"}</span>`;
  return `<a href="/topup?game=${encodeURIComponent(g.id)}" class="group bg-surface-container-lowest rounded-lg p-sm border border-pink-soft/40 shadow-sm hover:-translate-y-1 hover:shadow-[0_12px_28px_-10px_rgba(232,74,138,0.4)] transition-all text-center">
    <div class="aspect-square rounded-xl overflow-hidden bg-gradient-to-br ${gradOf(g.id)} flex items-center justify-center mb-xs">${visual}</div>
    <div class="font-label-md text-label-md text-on-surface font-bold leading-tight truncate">${esc(g.name)}</div>
    <div class="font-label-sm text-label-sm text-on-surface-variant truncate">${esc(g.publisher || "")}</div>
  </a>`;
}

function renderCatalog(filter) {
  const wrap = document.getElementById("gameCatalog");
  const q = (filter || "").toLowerCase().trim();
  const list = q ? allGames.filter((g) => g.name.toLowerCase().includes(q) || (g.publisher || "").toLowerCase().includes(q)) : allGames;
  wrap.innerHTML = list.map(gameCard).join("");
  document.getElementById("noGameHome").classList.toggle("hidden", list.length > 0);
}

async function loadGames() {
  try {
    allGames = await fetch("/api/games").then((r) => r.json());
    renderCatalog("");
  } catch (e) { document.getElementById("gameCatalog").innerHTML = '<div class="col-span-full text-center text-error py-md">Gagal memuat game.</div>'; }
}

const searchEl = document.getElementById("catalogSearch");
if (searchEl) searchEl.addEventListener("input", (e) => {
  renderCatalog(e.target.value);
  if (e.target.value) document.getElementById("katalog").scrollIntoView({ behavior: "smooth", block: "start" });
});

async function loadArticles() {
  try {
    const arts = await fetch("/api/articles").then((r) => r.json());
    if (!arts.length) return;
    document.getElementById("articlesGrid").innerHTML = arts.slice(0, 3).map((a) => `
      <a href="/blog/${a.slug}" class="group bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm border border-pink-soft/40 hover:-translate-y-1 hover:shadow-lg transition-all flex flex-col">
        <div class="aspect-[16/9] overflow-hidden bg-surface-container">${a.cover ? `<img src="${esc(a.cover)}" alt="${esc(a.title)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>` : ""}</div>
        <div class="p-md flex flex-col gap-xs flex-grow">
          <div class="flex flex-wrap gap-xs">${(a.tags || []).slice(0, 2).map((t) => `<span class="bg-pink-50 text-pink font-label-sm text-label-sm px-xs py-[2px] rounded-full">${esc(t)}</span>`).join("")}</div>
          <h3 class="font-headline-md text-headline-md text-on-surface leading-tight">${esc(a.title)}</h3>
          <p class="font-body-md text-body-md text-on-surface-variant flex-grow">${esc(a.excerpt)}</p>
        </div>
      </a>`).join("");
    document.getElementById("articlesSection").classList.remove("hidden");
  } catch (e) { /* abaikan */ }
}

loadStore();
loadGames();
loadArticles();
if (typeof initChatWidget === "function") initChatWidget();
