// Homepage anshelstore — carousel, kategori, katalog game (etalase), artikel
if (location.hash) { try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} }
window.scrollTo(0, 0);
// Smooth-scroll tanpa # di URL (delegasi global)
document.addEventListener("click", (e) => { const b = e.target.closest("[data-scroll]"); if (b) { const t = document.getElementById(b.dataset.scroll); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: "smooth", block: "start" }); } } });

const EMOJI = { ml: "⚔️", ff: "🔥", genshin: "🌟", valorant: "🎯", pubgm: "🪂" };
const GRAD = { ml: "from-primary to-primary-container", ff: "from-tertiary to-tertiary-container", genshin: "from-secondary to-primary-container", valorant: "from-error to-secondary", pubgm: "from-primary-fixed-variant to-primary" };
const gradOf = (id) => GRAD[id] || "from-pink to-secondary";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let allGames = [], currentCat = "game", searchQ = "";

const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");

// ---------- Slider banner (geser/translate, dikelola dari dashboard) ----------
function buildSlider(el, slides, { interval = 5000 } = {}) {
  if (!el) return;
  if (!slides.length) { el.innerHTML = ""; return; }
  const n = slides.length;
  el.innerHTML =
    `<div class="slider-track" style="display:flex;height:100%;width:${n * 100}%;transition:transform .7s cubic-bezier(.45,.05,.2,1)">` +
    slides.map((s) => `<div style="flex:0 0 ${100 / n}%;width:${100 / n}%;height:100%;position:relative;overflow:hidden">${s}</div>`).join("") +
    `</div>` +
    (n > 1 ? `<div class="slider-dots absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-2 z-10"></div>` : "");
  if (n < 2) return;
  const track = el.querySelector(".slider-track");
  const dotsW = el.querySelector(".slider-dots");
  dotsW.innerHTML = slides.map((_, k) => `<button class="carousel-dot ${k === 0 ? "active" : ""}" data-n="${k}"></button>`).join("");
  const dots = dotsW.querySelectorAll(".carousel-dot");
  let i = 0, timer;
  const show = (k) => { i = (k + n) % n; track.style.transform = `translateX(-${i * (100 / n)}%)`; dots.forEach((d, x) => d.classList.toggle("active", x === i)); };
  const play = () => { timer = setInterval(() => show(i + 1), interval); };
  dots.forEach((d) => d.addEventListener("click", () => { show(Number(d.dataset.n)); clearInterval(timer); play(); }));
  play();
}

const imgSlide = (src, n) => `<img src="${esc(src)}" alt="Banner ${n + 1}" class="absolute inset-0 w-full h-full object-cover"/>`;

// Banner utama (besar) — etalase / AI Automation
function renderMainBanner(banners) {
  const el = document.getElementById("mainBanner");
  if (!el) return;
  if (banners && banners.length) { buildSlider(el, banners.map(imgSlide)); return; }
  el.innerHTML = `<div class="absolute inset-0 flex items-center justify-between px-lg md:px-xl text-on-primary" style="background:linear-gradient(120deg,#8127cf,#6d28d9 45%,#00658d)">
      <div><span class="bg-white/15 rounded-full px-sm py-xs font-label-md text-label-md">⭐ Spesialis AI Automation</span><h2 class="font-display-lg-mobile md:font-display-lg leading-tight mt-xs">Otomatiskan Bisnismu dengan AI</h2><button type="button" data-scroll="layanan" class="inline-block mt-sm bg-white text-secondary font-label-md text-label-md px-md py-sm rounded-full hover:scale-105 transition-transform">Pelajari Layanan</button></div>
      <span class="text-[70px] md:text-[120px] hidden sm:block opacity-90">🤖</span>
    </div>`;
}
renderMainBanner();

// Banner kedua (lebih kecil) — promo / diskon, geser menggantikan sebelumnya
function renderPromoBanner(banners) {
  const el = document.getElementById("promoBanner");
  if (!el) return;
  if (banners && banners.length) { buildSlider(el, banners.map(imgSlide), { interval: 4200 }); return; }
  el.innerHTML = `<div class="absolute inset-0 flex items-center justify-between px-md md:px-lg text-on-primary" style="background:linear-gradient(120deg,#e84a8a,#b81d68 55%,#8127cf)">
      <div><span class="bg-white/20 rounded-full px-sm py-[2px] font-label-sm text-label-sm font-bold">PROMO</span><h3 class="font-headline-md md:font-headline-lg leading-tight mt-xs">Diskon spesial menantimu ✨</h3></div>
      <span class="text-[40px] md:text-[64px] opacity-90">🎁</span>
    </div>`;
}
renderPromoBanner();

// ---------- Settings (teks, hero, banner) ----------
async function loadStore() {
  try {
    const d = await fetch("/api/settings").then((r) => r.json());
    const s = d.store || {}, set = d.settings || {};
    if (s.whatsapp) { const cb = document.getElementById("ctaBuild"); if (cb) { cb.href = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Halo anshelstore, saya mau konsultasi jasa AI.")}`; cb.target = "_blank"; cb.rel = "noopener"; } }
    const setText = (id, v) => { const el = document.getElementById(id); if (el && v) el.textContent = v; };
    setText("txtLayananTitle", set.layananTitle); setText("txtLayananDesc", set.layananDesc);
    setText("txtTopupTitle", set.topupTitle); setText("txtArtikelTitle", set.articlesTitle);
    if (set.heroImage) { const img = document.getElementById("heroImg"); if (img) img.src = set.heroImage; }
    renderMainBanner(Array.isArray(set.banners) ? set.banners : []);
    renderPromoBanner(Array.isArray(set.promoBanners) ? set.promoBanners : []);
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
