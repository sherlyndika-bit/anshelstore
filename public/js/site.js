// Navigasi & footer bersama Anshel Store. Suntik ke #siteNav & #siteFooter. URL bersih (tanpa .html).
(function () {
  // Jangan biarkan browser melompat ke posisi/anchor lama
  if (history.scrollRestoration) history.scrollRestoration = "manual";

  const NAV = [
    { href: "/topup", label: "Top Up Game", key: "topup", icon: "stadia_controller" },
    { href: "/layanan", label: "Layanan AI", key: "layanan", icon: "smart_toy" },
    { href: "/blog", label: "Komunitas", key: "blog", icon: "forum" },
    { href: "/faq", label: "FAQ", key: "faq", icon: "help" },
    { href: "/tentang", label: "Tentang", key: "tentang", icon: "info" },
    { href: "/cek-transaksi", label: "Cek Transaksi", key: "cek", icon: "receipt_long" },
  ];
  const active = document.body.dataset.page || "";

  const navMount = document.getElementById("siteNav");
  if (navMount) {
    navMount.innerHTML = `
    <header class="nav">
      <div class="nav-inner container">
        <a href="/" id="siteBrand" class="brand">
          <div class="brand-logo">A</div>
          <span class="brand-text">Anshel <span>Store</span></span>
        </a>
        <nav class="nav-links">
          ${NAV.filter((n) => n.key !== "faq" && n.key !== "tentang" && n.key !== "cek").map((n) => `<a href="${n.href}" class="${n.key === active ? "active" : ""}">${n.label}</a>`).join("")}
        </nav>
        <div class="nav-actions" id="siteAuth">
          <a href="/topup" title="Cart" class="nav-icon-btn hide-mobile"><span class="material-symbols-outlined">shopping_cart</span></a>
          <a href="/cek-transaksi" title="Cek Transaksi" class="nav-icon-btn hide-tablet"><span class="material-symbols-outlined">receipt_long</span></a>
          <a href="/akun" title="Akun" class="nav-icon-btn"><span class="material-symbols-outlined">account_circle</span></a>
        </div>
      </div>
    </header>`;
  }
  // Bottom tab bar (mobile)
  const BOTTOM = [
    { href: "/", label: "Beranda", icon: "cottage", key: "home" },
    { href: "/topup", label: "Top Up", icon: "stadia_controller", key: "topup" },
    { href: "/layanan", label: "Layanan", icon: "smart_toy", key: "layanan" },
    { href: "/blog", label: "Komunitas", icon: "forum", key: "blog" },
    { href: "/akun", label: "Akun", icon: "person", key: "akun" },
  ];
  const bnav = document.createElement("div");
  bnav.className = "site-bottom-nav";
  bnav.innerHTML = BOTTOM.map((n) => `<a href="${n.href}" class="${n.key === active ? "active" : ""}"><span class="material-symbols-outlined">${n.icon}</span>${n.label}</a>`).join("");
  document.body.appendChild(bnav);

  const footMount = document.getElementById("siteFooter");
  if (footMount) {
    footMount.innerHTML = `
    <footer class="footer">
      <div class="footer-grid container">
        <div class="footer-brand-col">
          <div id="footBrand" class="brand">
            <div class="brand-logo brand-logo--sm">A</div>
            <span class="brand-text">Anshel <span>Store</span></span>
          </div>
          <p class="footer-desc">Top up game instan &amp; jasa AI automation untuk bisnismu. Satu tempat, hangat, terpercaya.</p>
          <div id="footSocial" class="footer-social"></div>
        </div>
        <div class="footer-nav-col">
          <h4 class="footer-heading">Jelajahi</h4>
          <div class="footer-link-list">${NAV.map((n) => `<a class="footer-link" href="${n.href}">${n.label}</a>`).join("")}</div>
        </div>
        <div class="footer-contact-col">
          <h4 class="footer-heading">Akun &amp; Kontak</h4>
          <div class="footer-link-list">
            <a href="/masuk" class="footer-link">Masuk / Daftar</a>
            <a href="/akun" class="footer-link">Akun Saya</a>
            <a id="footWa" href="/tentang" target="_blank" rel="noopener" class="footer-link footer-link--icon"><span class="material-symbols-outlined">chat</span> WhatsApp</a>
            <a id="footMail" href="/tentang" class="footer-link footer-link--icon"><span class="material-symbols-outlined">mail</span> Email</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom container">
        <span class="footer-copy">© ${new Date().getFullYear()} Anshel Store. Seluruh hak cipta dilindungi.</span>
        <span class="footer-secure"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">verified_user</span> Pembayaran aman &amp; terenkripsi</span>
      </div>
    </footer>`;
  }

  // Kontak dari backend
  fetch("/api/settings").then((r) => r.json()).then((d) => {
    const s = d.store || {}, set = d.settings || {}, soc = set.social || {};
    if (set.logo) {
      const b = document.getElementById("siteBrand");
      if (b) b.innerHTML = `<img src="${set.logo}" alt="Anshel Store" class="brand-logo-img"/>`;
      const fb = document.getElementById("footBrand");
      if (fb) fb.innerHTML = `<span class="footer-logo-wrap"><img src="${set.logo}" alt="Anshel Store" class="footer-logo-img"/></span>`;
    }
    if (s.whatsapp) { const wa = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Halo Anshel Store, saya mau tanya.")}`; const fw = document.getElementById("footWa"); if (fw) fw.href = wa; }
    const fm = document.getElementById("footMail"); if (fm && s.email) fm.href = "mailto:" + s.email;
    const fs = document.getElementById("footSocial");
    if (fs) { const ic = (label, href, icon) => href ? `<a href="${href}" target="_blank" rel="noopener" class="footer-social-btn" title="${label}"><span class="material-symbols-outlined">${icon}</span></a>` : ""; fs.innerHTML = ic("Instagram", soc.instagram, "photo_camera") + ic("TikTok", soc.tiktok, "music_note") + ic("YouTube", soc.youtube, "smart_display"); }
  }).catch(() => {});

  // Status login customer
  const token = localStorage.getItem("anshel_token");
  if (token) {
    fetch("/api/auth/me", { headers: { "x-auth-token": token } }).then((r) => r.ok ? r.json() : null).then((d) => {
      if (!d || !d.user) return;
      const nm = (d.user.name || d.user.email || "Akun").split(" ")[0];
      const av = d.user.picture ? `<img src="${d.user.picture}" class="nav-avatar"/>` : `<span class="nav-avatar nav-avatar--fallback">${nm.charAt(0).toUpperCase()}</span>`;
      const auth = document.getElementById("siteAuth");
      if (auth) auth.innerHTML = `<a href="/akun" class="nav-user-btn">${av} ${nm}</a><a href="/topup" class="nav-cta-btn">Top Up ✨</a>`;
      const authM = document.getElementById("siteAuthM");
      if (authM) authM.innerHTML = `<a href="/akun" class="nav-user-link">👤 ${nm} (Akun Saya)</a><a href="/topup" class="nav-cta-btn">Top Up ✨</a>`;
    }).catch(() => {});
  }

  // Animasi reveal saat scroll
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else { reveals.forEach((el) => el.classList.add("in")); }
})();
