// Navigasi & footer bersama Anshel Store. Suntik ke #siteNav & #siteFooter. URL bersih (tanpa .html).
(function () {
  // Jangan biarkan browser melompat ke posisi/anchor lama
  if (history.scrollRestoration) history.scrollRestoration = "manual";

  const NAV = [
    { href: "/topup", label: "Top Up", key: "topup", icon: "stadia_controller" },
    { href: "/blog", label: "Komunitas", key: "blog", icon: "forum" },
    { href: "/faq", label: "FAQ", key: "faq", icon: "help" },
    { href: "/tentang", label: "Tentang", key: "tentang", icon: "info" },
    { href: "/cek-transaksi", label: "Cek Transaksi", key: "cek", icon: "receipt_long" },
  ];
  const active = document.body.dataset.page || "";

  const navMount = document.getElementById("siteNav");
  if (navMount) {
    navMount.innerHTML = `
    <header class="sticky top-0 z-50">
      <div class="h-[3px] w-full bg-gradient-to-r from-pink via-secondary to-pink"></div>
      <div class="bg-surface/95 backdrop-blur-lg border-b border-outline-variant/40 shadow-[0_2px_14px_-8px_rgba(0,0,0,0.25)]">
        <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
          <div class="flex items-center justify-between h-16">
            <a href="/" id="siteBrand" class="flex items-center gap-2 group shrink-0">
              <span class="w-9 h-9 rounded-xl bg-gradient-to-br from-pink to-secondary text-on-primary flex items-center justify-center font-extrabold text-[18px] shadow-[0_4px_12px_rgba(191,93,126,0.4)] group-hover:scale-110 transition-transform">A</span>
              <span class="text-[19px] text-on-surface tracking-tight font-extrabold leading-none">Anshel <span class="text-transparent bg-clip-text bg-gradient-to-r from-pink to-secondary">Store</span></span>
            </a>
            <nav class="hidden md:flex items-center h-16">
              ${NAV.filter((n) => n.key !== "faq" && n.key !== "tentang").map((n) => `<a href="${n.href}" class="relative h-16 flex items-center gap-1.5 px-4 font-label-md text-label-md transition-colors ${n.key === active ? "text-secondary font-bold" : "text-on-surface-variant hover:text-on-surface"}"><span class="material-symbols-outlined text-[18px]">${n.icon}</span>${n.label}${n.key === active ? '<span class="absolute left-3 right-3 bottom-0 h-[3px] rounded-t-full bg-gradient-to-r from-pink to-secondary"></span>' : ""}</a>`).join("")}
            </nav>
            <div class="hidden md:flex items-center gap-2 shrink-0" id="siteAuth">
              <a href="/masuk" class="font-label-md text-label-md font-semibold text-on-surface-variant hover:text-secondary transition-colors px-2">Masuk</a>
              <a href="/masuk" class="bg-gradient-to-r from-pink to-secondary text-on-primary font-label-md text-label-md font-bold px-4 py-2 rounded-lg shadow-[0_4px_14px_rgba(191,93,126,0.35)] hover:shadow-[0_6px_20px_rgba(191,93,126,0.5)] hover:-translate-y-0.5 transition-all inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">person_add</span>Daftar</a>
            </div>
            <a href="/akun" id="siteAuthMobile" class="md:hidden w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-on-surface-variant"><span class="material-symbols-outlined text-[20px]">person</span></a>
          </div>
        </div>
      </div>
    </header>`;
  }
  // Bottom tab bar (mobile) — pengganti hamburger
  const BOTTOM = [
    { href: "/", label: "Beranda", icon: "home", key: "home" },
    { href: "/topup", label: "Top Up", icon: "stadia_controller", key: "topup" },
    { href: "/blog", label: "Komunitas", icon: "forum", key: "blog" },
    { href: "/akun", label: "Akun", icon: "person", key: "akun" },
  ];
  const bnav = document.createElement("div");
  bnav.className = "site-bottom-nav";
  bnav.innerHTML = BOTTOM.map((n) => `<a href="${n.href}" class="${n.key === active ? "active" : ""}"><span class="material-symbols-outlined">${n.icon}</span>${n.label}</a>`).join("");
  document.body.appendChild(bnav);

  const footMount = document.getElementById("siteFooter");
  if (footMount) {
    const pays = ["QRIS", "DANA", "OVO", "GoPay", "ShopeePay", "BCA", "Mandiri"];
    footMount.innerHTML = `
    <footer class="mt-2xl bg-[#332b2e] text-white">
      <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop pt-xl pb-lg grid grid-cols-2 md:grid-cols-12 gap-gutter">
        <div class="col-span-2 md:col-span-4 flex flex-col gap-sm">
          <div id="footBrand" class="flex items-center gap-2">
            <span class="w-9 h-9 rounded-xl bg-gradient-to-br from-pink to-secondary text-white flex items-center justify-center font-extrabold text-[18px]">A</span>
            <span class="text-[19px] font-extrabold">Anshel <span class="text-transparent bg-clip-text bg-gradient-to-r from-pink to-secondary">Store</span></span>
          </div>
          <p class="text-sm text-white/55 max-w-xs leading-relaxed">Top up game instan & jasa AI automation untuk bisnismu. Satu tempat, cepat, aman, dan terpercaya.</p>
          <div id="footSocial" class="flex gap-2 mt-xs"></div>
        </div>
        <div class="md:col-span-2">
          <h4 class="text-[11px] font-extrabold uppercase tracking-widest text-white/40 mb-sm">Jelajahi</h4>
          <div class="flex flex-col gap-2.5">${NAV.map((n) => `<a class="text-sm text-white/70 hover:text-white hover:translate-x-0.5 transition-all" href="${n.href}">${n.label}</a>`).join("")}</div>
        </div>
        <div class="md:col-span-2">
          <h4 class="text-[11px] font-extrabold uppercase tracking-widest text-white/40 mb-sm">Akun</h4>
          <div class="flex flex-col gap-2.5">
            <a href="/masuk" class="text-sm text-white/70 hover:text-white transition-colors">Masuk / Daftar</a>
            <a href="/akun" class="text-sm text-white/70 hover:text-white transition-colors">Akun Saya</a>
            <a href="/cek-transaksi" class="text-sm text-white/70 hover:text-white transition-colors">Lacak Pesanan</a>
          </div>
        </div>
        <div class="col-span-2 md:col-span-4">
          <h4 class="text-[11px] font-extrabold uppercase tracking-widest text-white/40 mb-sm">Kontak</h4>
          <a id="footWa" href="/tentang" target="_blank" rel="noopener" class="text-sm text-white/70 hover:text-white flex items-center gap-2 mb-2.5"><span class="material-symbols-outlined text-[18px]">chat</span> WhatsApp</a>
          <a id="footMail" href="/tentang" class="text-sm text-white/70 hover:text-white flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">mail</span> Email</a>
          <h4 class="text-[11px] font-extrabold uppercase tracking-widest text-white/40 mt-md mb-sm">Pembayaran</h4>
          <div class="flex flex-wrap gap-1.5">${pays.map((p) => `<span class="text-[11px] font-bold text-white/80 bg-white/10 border border-white/10 rounded-md px-2 py-1">${p}</span>`).join("")}</div>
        </div>
      </div>
      <div class="border-t border-white/10">
        <div class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-md flex flex-col sm:flex-row items-center justify-between gap-xs">
          <span class="text-xs text-white/45">© ${new Date().getFullYear()} Anshel Store. Seluruh hak cipta dilindungi.</span>
          <span class="text-xs text-white/45 inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-[15px] text-secondary" style="font-variation-settings:'FILL' 1;">verified_user</span> Pembayaran aman & terenkripsi</span>
        </div>
      </div>
    </footer>`;
  }

  // Kontak dari backend
  fetch("/api/settings").then((r) => r.json()).then((d) => {
    const s = d.store || {}, set = d.settings || {}, soc = set.social || {};
    if (set.logo) {
      const b = document.getElementById("siteBrand");
      if (b) b.innerHTML = `<img src="${set.logo}" alt="Anshel Store" class="h-10 w-auto group-hover:scale-105 transition-transform"/>`;
      const fb = document.getElementById("footBrand");
      if (fb) fb.innerHTML = `<span class="inline-flex items-center bg-white rounded-xl px-2.5 py-1.5 shadow-md"><img src="${set.logo}" alt="Anshel Store" class="h-7 w-auto"/></span>`;
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
      if (auth) auth.innerHTML = `<a href="/akun" class="flex items-center gap-xs px-sm py-xs rounded-full hover:bg-pink-50 font-label-md text-label-md text-on-surface transition-colors">${av} ${nm}</a><a href="/topup" class="bg-gradient-to-r from-pink to-secondary text-on-primary font-label-md text-label-md px-md py-sm rounded-full shadow-[0_4px_14px_rgba(191,93,126,0.35)]">Top Up ✨</a>`;
      const authM = document.getElementById("siteAuthM");
      if (authM) authM.innerHTML = `<a href="/akun" class="py-sm font-label-md text-label-md text-on-surface">👤 ${nm} (Akun Saya)</a><a href="/topup" class="text-center bg-gradient-to-r from-pink to-secondary text-on-primary font-label-md text-label-md py-sm rounded-full">Top Up ✨</a>`;
    }).catch(() => {});
  }

  // Animasi reveal saat scroll
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else { reveals.forEach((el) => el.classList.add("in")); }
})();
