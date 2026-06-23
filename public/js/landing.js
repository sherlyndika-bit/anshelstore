// Homepage anshelstore — wire kontak + render game bento dari backend
// Pastikan halaman selalu mulai dari atas (hindari lompat ke #anchor lama)
if (location.hash) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
window.scrollTo(0, 0);

const EMOJI = { ml: "⚔️", ff: "🔥", genshin: "🌟", valorant: "🎯", pubgm: "🪂" };
const GRADIENT = {
  ml: "linear-gradient(135deg,#00658d,#00baff)",
  ff: "linear-gradient(135deg,#9f4122,#ff906d)",
  genshin: "linear-gradient(135deg,#8127cf,#00baff)",
  valorant: "linear-gradient(135deg,#ba1a1a,#8127cf)",
  pubgm: "linear-gradient(135deg,#004c6b,#00658d)",
};
const gradOf = (id) => GRADIENT[id] || "linear-gradient(135deg,#00658d,#8127cf)";

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

async function loadStore() {
  try {
    const d = await fetch("/api/settings").then((r) => r.json());
    const s = d.store || {}, set = d.settings || {};
    if (s.whatsapp) {
      const wa = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Halo anshelstore, saya mau tanya layanan.")}`;
      ["ctaNav", "ctaBuild", "ctaFooter"].forEach((id) => { const el = document.getElementById(id); if (el) el.href = wa; });
    }
    const setText = (id, v) => { const el = document.getElementById(id); if (el && v) el.textContent = v; };
    setText("heroBadge", set.heroBadge);
    setText("heroSub", set.heroSubtitle);
    const img = document.getElementById("heroImg");
    if (img && set.heroImage) img.src = set.heroImage;
  } catch (e) { /* abaikan */ }
}

async function loadArticles() {
  try {
    const arts = await fetch("/api/articles").then((r) => r.json());
    if (!arts.length) return;
    const grid = document.getElementById("articlesGrid");
    grid.innerHTML = arts.slice(0, 3).map((a) => `
      <a href="/blog/${a.slug}" class="group bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm shadow-primary/5 border border-outline-variant/20 hover:-translate-y-2 hover:shadow-lg transition-all duration-300 flex flex-col">
        <div class="aspect-[16/9] overflow-hidden bg-surface-container">${a.cover ? `<img src="${a.cover}" alt="${a.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>` : ""}</div>
        <div class="p-md flex flex-col gap-xs flex-grow">
          <div class="flex flex-wrap gap-xs">${(a.tags || []).slice(0, 2).map((t) => `<span class="bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm px-xs py-[2px] rounded-full">${t}</span>`).join("")}</div>
          <h3 class="font-headline-md text-headline-md text-on-surface leading-tight">${a.title}</h3>
          <p class="font-body-md text-body-md text-on-surface-variant flex-grow">${a.excerpt}</p>
          <span class="font-label-md text-label-md text-primary inline-flex items-center gap-xs mt-xs">Baca <span class="material-symbols-outlined text-[18px]">arrow_forward</span></span>
        </div>
      </a>`).join("");
    document.getElementById("articlesSection").classList.remove("hidden");
  } catch (e) { /* abaikan */ }
}

function bigCard(g) {
  return `
  <div class="md:col-span-8 group relative rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] h-[300px] md:h-[400px]" style="background:${gradOf(g.id)}">
    <div class="absolute inset-0 flex items-center justify-center opacity-30 select-none pointer-events-none" style="font-size:14rem;line-height:1">${EMOJI[g.id] || "🎮"}</div>
    <div class="absolute inset-0 bg-gradient-to-t from-inverse-surface/70 via-inverse-surface/10 to-transparent"></div>
    <div class="absolute bottom-0 left-0 p-md w-full flex justify-between items-end">
      <div>
        <span class="inline-block bg-primary-container text-on-primary-container font-label-sm text-label-sm px-xs py-[2px] rounded-full mb-xs">${g.publisher || "Game"}</span>
        <h3 class="font-headline-lg text-headline-lg text-on-primary">${g.name}</h3>
      </div>
      <a href="/topup" class="bg-surface glass-panel text-primary font-label-md text-label-md px-md py-sm rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all">Top Up</a>
    </div>
  </div>`;
}
function smallCard(g) {
  return `
  <div class="flex-1 relative rounded-xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.05)] group h-[188px]" style="background:${gradOf(g.id)}">
    <div class="absolute inset-0 flex items-center justify-center opacity-30 select-none pointer-events-none" style="font-size:7rem;line-height:1">${EMOJI[g.id] || "🎮"}</div>
    <div class="absolute inset-0 bg-gradient-to-t from-inverse-surface/70 via-transparent to-transparent"></div>
    <div class="absolute bottom-0 left-0 p-md w-full flex justify-between items-end">
      <h3 class="font-headline-md text-headline-md text-on-primary">${g.name}</h3>
      <a href="/topup" class="bg-surface glass-panel text-primary font-label-md text-label-md px-sm py-xs rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center"><span class="material-symbols-outlined text-[16px]">add</span></a>
    </div>
  </div>`;
}

async function loadGames() {
  const wrap = document.getElementById("gamesBento");
  try {
    const games = await fetch("/api/games").then((r) => r.json());
    if (!games.length) { wrap.innerHTML = ""; return; }
    const big = games[0];
    const side = games.slice(1, 3);
    wrap.innerHTML = bigCard(big) + `<div class="md:col-span-4 flex flex-col gap-gutter">${side.map(smallCard).join("")}</div>`;
  } catch (e) {
    wrap.innerHTML = '<div class="md:col-span-12 text-center text-error py-md">Gagal memuat game.</div>';
  }
}

loadStore();
loadGames();
loadArticles();
if (typeof initChatWidget === "function") initChatWidget();
