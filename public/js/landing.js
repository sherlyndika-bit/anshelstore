// Landing page: ambil store info + daftar layanan dari backend
const ICONS = { robot: "🤖", gear: "⚙️", game: "🎮" };
const rupiah = (n) => "Rp" + Number(n).toLocaleString("id-ID");

document.getElementById("year").textContent = new Date().getFullYear();

async function loadStore() {
  try {
    const store = await fetch("/api/store").then((r) => r.json());
    const wa = document.getElementById("waLink");
    wa.href = `https://wa.me/${store.whatsapp}?text=${encodeURIComponent(
      "Halo anshelstore, saya mau tanya layanan."
    )}`;
    document.getElementById("emailLink").href = `mailto:${store.email}`;
  } catch (e) {
    console.error(e);
  }
}

async function loadServices() {
  const grid = document.getElementById("servicesGrid");
  try {
    const services = await fetch("/api/services").then((r) => r.json());
    grid.innerHTML = services
      .map(
        (s) => `
      <article class="card">
        <div class="card-icon">${ICONS[s.icon] || "✨"}</div>
        <h3>${s.title}</h3>
        <p>${s.desc}</p>
        <span class="price-from">Mulai ${rupiah(s.priceFrom)}</span>
        ${s.id === "topup-game" ? '<div style="margin-top:16px"><a href="/topup.html" class="btn btn-sm">Top Up Sekarang</a></div>' : ""}
      </article>`
      )
      .join("");
  } catch (e) {
    grid.innerHTML = '<p style="color:#f43f5e">Gagal memuat layanan.</p>';
  }
}

loadStore();
loadServices();
initChatWidget(); // dari widget.js
