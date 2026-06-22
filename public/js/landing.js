// Landing: ambil store info + layanan dari backend, ikon SVG, nav mobile
const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");

const ICONS = {
  robot: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 8V4M9 14h.01M15 14h.01M2 13v2M22 13v2"/></svg>',
  gear: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  game: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h4M8 10v4M15 13h.01M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="4"/></svg>',
};

document.getElementById("year").textContent = new Date().getFullYear();

// nav mobile
const toggle = document.getElementById("navToggle");
const links = document.getElementById("navLinks");
if (toggle) {
  toggle.addEventListener("click", () => links.classList.toggle("open"));
  links.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => links.classList.remove("open")));
}

async function loadStore() {
  try {
    const s = await fetch("/api/store").then((r) => r.json());
    const wa = document.getElementById("waLink");
    if (wa && s.whatsapp) wa.href = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Halo anshelstore, saya mau tanya layanan.")}`;
    const em = document.getElementById("emailLink");
    if (em && s.email) em.href = `mailto:${s.email}`;
  } catch (e) { console.error(e); }
}

async function loadServices() {
  const grid = document.getElementById("servicesGrid");
  try {
    const services = await fetch("/api/services").then((r) => r.json());
    grid.innerHTML = services.map((s) => `
      <article class="feature-card">
        <div class="feature-icon">${ICONS[s.icon] || ICONS.gear}</div>
        <h3>${s.title}</h3>
        <p>${s.desc}</p>
        <span class="price-pill">Mulai ${rupiah(s.priceFrom)}</span>
        ${s.id === "topup-game" ? '<div style="margin-top:18px"><a href="/topup.html" class="btn btn-light btn-sm">Top Up Sekarang →</a></div>' : ""}
      </article>`).join("");
  } catch (e) { grid.innerHTML = '<p style="color:var(--red)">Gagal memuat layanan.</p>'; }
}

loadStore();
loadServices();
initChatWidget();
