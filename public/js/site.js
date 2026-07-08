// Navigasi & footer bersama Anshel Store. Suntik ke #siteNav & #siteFooter. URL bersih (tanpa .html).
(function () {
  // Jangan biarkan browser melompat ke posisi/anchor lama
  if (history.scrollRestoration) history.scrollRestoration = "manual";

  const NAV = [
    { href: "/topup", label: "Top Up Game", key: "topup", icon: "stadia_controller" },
    { href: "/layanan", label: "Layanan", key: "layanan", icon: "support_agent" },
    { href: "/blog", label: "Komunitas", key: "blog", icon: "forum" },
    { href: "/faq", label: "FAQ", key: "faq", icon: "help" },
    { href: "/tentang", label: "Tentang", key: "tentang", icon: "info" },
    { href: "/cek-transaksi", label: "Cek Transaksi", key: "cek", icon: "receipt_long" },
  ];
  const active = document.body.dataset.page || "";

  const navMount = document.getElementById("siteNav");
  if (navMount) {
    navMount.innerHTML = `
    <header class="bg-surface/80 backdrop-blur-md border-b-2 border-dashed border-outline-variant shadow-[0_10px_30px_-10px_rgba(139,111,91,0.15)] sticky top-0 z-50 px-margin-mobile md:px-margin-desktop py-md">
      <div class="max-w-7xl mx-auto flex justify-between items-center gap-3">
        <a href="/" id="siteBrand" class="flex items-center gap-2 group shrink-0">
          <span class="w-12 h-12 rounded-full bg-primary text-on-primary grid place-items-center font-extrabold text-[24px] group-hover:scale-110 transition-transform shadow-sm">A</span>
          <span class="text-2xl text-primary font-extrabold drop-shadow-sm">Anshel <span class="text-on-primary-container">Store</span></span>
        </a>
        <nav class="hidden md:flex items-center gap-1">
          ${NAV.filter((n) => n.key !== "faq" && n.key !== "tentang" && n.key !== "cek").map((n) => `<a href="${n.href}" class="px-4 py-2 rounded-t-lg font-label-md transition-all hover:bg-secondary-container/30 hover:scale-105 ${n.key === active ? "text-primary font-bold border-b-4 border-primary-container" : "text-on-surface-variant hover:text-primary"}">${n.label}</a>`).join("")}
        </nav>
        <div class="flex items-center gap-1 shrink-0" id="siteAuth">
          <a href="/topup" title="Cart" class="hidden sm:grid w-10 h-10 place-items-center rounded-full text-primary hover:bg-secondary-container/30 hover:scale-105 transition-all"><span class="material-symbols-outlined">shopping_cart</span></a>
          <a href="/cek-transaksi" title="Cek Transaksi" class="hidden md:grid w-10 h-10 place-items-center rounded-full text-primary hover:bg-secondary-container/30 hover:scale-105 transition-all"><span class="material-symbols-outlined">receipt_long</span></a>
          <a href="/akun" title="Akun" class="w-10 h-10 grid place-items-center rounded-full text-primary hover:bg-secondary-container/30 hover:scale-105 transition-all"><span class="material-symbols-outlined">account_circle</span></a>
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
    <footer class="bg-surface-container-low border-t-2 border-dashed border-outline-variant w-full py-xl px-margin-mobile md:px-margin-desktop mt-2xl">
      <div class="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-12 gap-gutter">
        <div class="col-span-2 md:col-span-5 flex flex-col gap-sm">
          <div id="footBrand" class="flex items-center gap-2">
            <span class="w-9 h-9 rounded-full bg-primary text-on-primary grid place-items-center font-extrabold text-[18px]">A</span>
            <span class="text-headline-md text-primary font-extrabold">Anshel <span class="text-on-primary-container">Store</span></span>
          </div>
          <p class="text-body-md text-on-surface-variant max-w-xs">Top up game instan, voucher murah, dan layanan digital terpercaya. Proses cepat & transaksi aman.</p>
          <div id="footSocial" class="flex gap-2 mt-xs"></div>
        </div>
        <div class="md:col-span-3">
          <h4 class="text-[11px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-sm">Jelajahi</h4>
          <div class="flex flex-col gap-2.5">${NAV.map((n) => `<a class="text-body-md text-on-surface-variant hover:text-primary hover:translate-x-0.5 transition-all" href="${n.href}">${n.label}</a>`).join("")}</div>
        </div>
        <div class="md:col-span-4">
          <h4 class="text-[11px] font-extrabold uppercase tracking-widest text-on-surface-variant mb-sm">Akun &amp; Kontak</h4>
          <div class="flex flex-col gap-2.5">
            <a href="/masuk" class="text-body-md text-on-surface-variant hover:text-primary transition-colors">Masuk / Daftar</a>
            <a href="/akun" class="text-body-md text-on-surface-variant hover:text-primary transition-colors">Akun Saya</a>
            <a id="footWa" href="/tentang" target="_blank" rel="noopener" class="text-body-md text-on-surface-variant hover:text-primary flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">chat</span> WhatsApp</a>
            <a id="footMail" href="/tentang" class="text-body-md text-on-surface-variant hover:text-primary flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">mail</span> Email</a>
          </div>
        </div>
      </div>
      <div class="max-w-7xl mx-auto mt-lg pt-md border-t border-outline-variant/40 flex flex-col sm:flex-row items-center justify-between gap-xs">
        <span class="text-label-sm text-on-surface-variant">© ${new Date().getFullYear()} Anshel Store. Seluruh hak cipta dilindungi.</span>
        <span class="text-label-sm text-on-surface-variant inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px] text-primary" style="font-variation-settings:'FILL' 1;">verified_user</span> Pembayaran aman & terenkripsi</span>
      </div>
    </footer>`;
  }

  // Kontak dari backend
  fetch("/api/settings").then((r) => r.json()).then((d) => {
    const s = d.store || {}, set = d.settings || {}, soc = set.social || {};
    if (set.logo) {
      const b = document.getElementById("siteBrand");
      if (b) b.innerHTML = `<img src="${set.logo}" alt="Anshel Store" class="h-16 md:h-20 w-auto group-hover:scale-105 transition-transform"/>`;
      const fb = document.getElementById("footBrand");
      if (fb) fb.innerHTML = `<span class="inline-flex items-center bg-white rounded-xl px-3 py-2 shadow-md"><img src="${set.logo}" alt="Anshel Store" class="h-10 w-auto"/></span>`;
    }
    if (s.whatsapp) { const wa = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Halo Anshel Store, saya mau tanya.")}`; const fw = document.getElementById("footWa"); if (fw) fw.href = wa; }
    const fm = document.getElementById("footMail"); if (fm && s.email) fm.href = "mailto:" + s.email;
    const fs = document.getElementById("footSocial");
    if (fs) { const ic = (label, href, icon) => href ? `<a href="${href}" target="_blank" rel="noopener" class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-secondary-fixed transition-colors" title="${label}"><span class="material-symbols-outlined text-[18px]">${icon}</span></a>` : ""; fs.innerHTML = ic("Instagram", soc.instagram, "photo_camera") + ic("TikTok", soc.tiktok, "music_note") + ic("YouTube", soc.youtube, "smart_display"); }
  }).catch(() => {});

  // Status login customer
  const token = localStorage.getItem("anshel_token");
  if (token) {
    fetch("/api/auth/me", { headers: { "x-auth-token": token } }).then((r) => r.ok ? r.json() : null).then((d) => {
      if (!d || !d.user) return;
      const nm = (d.user.name || d.user.email || "Akun").split(" ")[0];
      const av = d.user.picture ? `<img src="${d.user.picture}" class="w-8 h-8 rounded-full object-cover"/>` : `<span class="w-8 h-8 rounded-full bg-gradient-to-br from-pink to-secondary text-on-primary flex items-center justify-center font-bold text-[14px]">${nm.charAt(0).toUpperCase()}</span>`;
      const auth = document.getElementById("siteAuth");
      if (auth) auth.innerHTML = `<a href="/akun" class="flex items-center gap-xs px-sm py-xs rounded-full hover:bg-pink-50 font-label-md text-label-md text-on-surface transition-colors">${av} ${nm}</a><a href="/topup" class="bg-primary text-white font-label-md text-label-md px-md py-sm rounded-full shadow-md hover:bg-pink-600 transition-colors">Top Up Sekarang</a>`;
      const authM = document.getElementById("siteAuthM");
      if (authM) authM.innerHTML = `<a href="/akun" class="py-sm font-label-md text-label-md text-on-surface">👤 ${nm} (Akun Saya)</a><a href="/topup" class="text-center bg-primary text-white font-label-md text-label-md py-sm rounded-full">Top Up Sekarang</a>`;
    }).catch(() => {});
  }

  // Animasi reveal saat scroll
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else { reveals.forEach((el) => el.classList.add("in")); }
})();
