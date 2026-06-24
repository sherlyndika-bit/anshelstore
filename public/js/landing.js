// Homepage anshelstore — carousel, kategori, katalog game (etalase), artikel
if (location.hash && location.hash !== "#katalog" && location.hash !== "#layanan") { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
window.scrollTo(0, 0);

const EMOJI = { ml: "⚔️", ff: "🔥", genshin: "🌟", valorant: "🎯", pubgm: "🪂" };
const GRAD = { ml: "from-primary to-primary-container", ff: "from-tertiary to-tertiary-container", genshin: "from-secondary to-primary-container", valorant: "from-error to-secondary", pubgm: "from-primary-fixed-variant to-primary" };
const gradOf = (id) => GRAD[id] || "from-pink to-secondary";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let allGames = [], currentCat = "game", searchQ = "";

// ---------- Carousel ----------
(function carousel() {
  const slides = document.querySelectorAll(".carousel-slide");
  const dotsWrap = document.getElementById("carouselDots");
  if (!slides.length || !dotsWrap) return;
  let i = 0;
  dotsWrap.innerHTML = [...slides].map((_, n) => `<button class="carousel-dot ${n === 0 ? "active" : ""}" data-n="${n}"></button>`).join("");
  const dots = dotsWrap.querySelectorAll(".carousel-dot");
  const show = (n) => { slides.forEach((s, k) => s.style.opacity = k === n ? "1" : "0"); dots.forEach((d, k) => d.classList.toggle("active", k === n)); i = n; };
  dots.forEach((d) => d.addEventListener("click", () => show(Number(d.dataset.n))));
  setInterval(() => show((i + 1) % slides.length), 4500);
})();

// ---------- Settings (teks, hero, banner) ----------
async function loadStore() {
  try {
    const d = await fetch("/api/settings").then((r) => r.json());
    const s = d.store || {}, set = d.settings || {};
    if (s.whatsapp) { const cb = document.getElementById("ctaBuild"); if (cb) cb.href = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Halo anshelstore, saya mau konsultasi jasa AI.")}`; }
    const setText = (id, v) => { const el = document.getElementById(id); if (el && v) el.textContent = v; };
    setText("txtLayananTitle", set.layananTitle); setText("txtLayananDesc", set.layananDesc);
    setText("txtTopupTitle", set.topupTitle); setText("txtArtikelTitle", set.articlesTitle);
    if (set.bannerImage) {
      const slide = document.querySelector(".carousel-slide");
      if (slide) { slide.style.backgroundImage = `url('${set.bannerImage}')`; slide.style.backgroundSize = "cover"; slide.style.backgroundPosition = "center"; }
    }
  } catch (e) {}
}

// ---------- Katalog (etalase) ----------
function gameCard(g, i) {
  const visual = g.image
    ? `<img src="${esc(g.image)}" alt="${esc(g.name)}" class="absolute inset-0 w-full h-full object-cover"/>`
    : `<span class="text-[2.6rem] md:text-[3rem]">${EMOJI[g.id] || "🎮"}</span>`;
  const badge = i < 3 ? `<span class="absolute top-1.5 left-1.5 bg-pink text-on-primary text-[10px] font-bold px-2 py-[2px] rounded-full shadow">POPULER</span>` : "";
  return `<a href="/topup?game=${encodeURIComponent(g.id)}" class="group rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm border border-pink-soft/40 hover:-translate-y-1 hover:shadow-[0_14px_30px_-12px_rgba(232,74,138,0.45)] transition-all">
    <div class="aspect-[3/4] bg-gradient-to-br ${gradOf(g.id)} relative flex items-center justify-center overflow-hidden">
      ${visual}${badge}
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2 pt-6">
        <div class="text-white font-bold text-[12px] md:text-[13px] leading-tight line-clamp-2">${esc(g.name)}</div>
      </div>
    </div>
    <div class="px-2 py-1.5 text-center"><div class="font-label-sm text-label-sm text-on-surface-variant truncate">${esc(g.publisher || "Top Up")}</div></div>
  </a>`;
}
function renderCatalog() {
  const wrap = document.getElementById("gameCatalog");
  const note = document.getElementById("noGameHome");
  if (currentCat !== "game") { wrap.innerHTML = ""; note.textContent = "Kategori ini segera hadir 🙏"; note.classList.remove("hidden"); return; }
  const q = searchQ.toLowerCase().trim();
  const list = q ? allGames.filter((g) => g.name.toLowerCase().includes(q) || (g.publisher || "").toLowerCase().includes(q)) : allGames;
  wrap.innerHTML = list.map(gameCard).join("");
  note.textContent = "Game tidak ditemukan.";
  note.classList.toggle("hidden", list.length > 0);
}
async function loadGames() {
  try { allGames = await fetch("/api/games").then((r) => r.json()); renderCatalog(); }
  catch (e) { document.getElementById("gameCatalog").innerHTML = '<div class="col-span-full text-center text-error py-md">Gagal memuat game.</div>'; }
}

document.getElementById("catalogSearch").addEventListener("input", (e) => { searchQ = e.target.value; if (currentCat !== "game") { currentCat = "game"; document.querySelectorAll(".cat-tab").forEach((t) => t.classList.toggle("active", t.dataset.cat === "game")); } renderCatalog(); });
document.querySelectorAll(".cat-tab").forEach((t) => t.addEventListener("click", () => {
  currentCat = t.dataset.cat;
  document.querySelectorAll(".cat-tab").forEach((x) => x.classList.toggle("active", x === t));
  renderCatalog();
  document.getElementById("katalog").scrollIntoView({ behavior: "smooth", block: "start" });
}));

// ---------- Artikel ----------
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
        </div>
      </a>`).join("");
    document.getElementById("articlesSection").classList.remove("hidden");
  } catch (e) {}
}

loadStore();
loadGames();
loadArticles();
if (typeof initChatWidget === "function") initChatWidget();
