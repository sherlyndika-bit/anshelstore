// Homepage anshelstore — wire kontak + render game bento dari backend
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
    const s = await fetch("/api/store").then((r) => r.json());
    if (s && s.whatsapp) {
      const wa = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Halo anshelstore, saya mau tanya layanan.")}`;
      ["ctaNav", "ctaBuild", "ctaFooter"].forEach((id) => { const el = document.getElementById(id); if (el) el.href = wa; });
    }
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
      <a href="/topup.html" class="bg-surface glass-panel text-primary font-label-md text-label-md px-md py-sm rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all">Top Up</a>
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
      <a href="/topup.html" class="bg-surface glass-panel text-primary font-label-md text-label-md px-sm py-xs rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center"><span class="material-symbols-outlined text-[16px]">add</span></a>
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
if (typeof initChatWidget === "function") initChatWidget();
