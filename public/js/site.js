// Navigasi & footer bersama anshelstore. Suntik ke #siteNav & #siteFooter. URL bersih (tanpa .html).
(function () {
  // Jangan biarkan browser melompat ke posisi/anchor lama
  if (history.scrollRestoration) history.scrollRestoration = "manual";

  const NAV = [
    { href: "/topup", label: "Top Up", key: "topup" },
    { href: "/blog", label: "Artikel", key: "blog" },
    { href: "/faq", label: "FAQ", key: "faq" },
    { href: "/tentang", label: "Tentang", key: "tentang" },
    { href: "/cek-transaksi", label: "Cek Transaksi", key: "cek" },
  ];
  const active = document.body.dataset.page || "";
  const linkCls = (k) => k === active ? "text-secondary font-bold border-b-2 border-secondary pb-1" : "text-on-surface-variant hover:text-primary transition-colors";

  const navMount = document.getElementById("siteNav");
  if (navMount) {
    navMount.innerHTML = `
    <div class="sticky top-0 z-50 px-margin-mobile md:px-margin-desktop pt-sm">
      <nav class="max-w-7xl mx-auto rounded-full bg-surface/70 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(232,74,138,0.25)] border border-pink-soft/50">
        <div class="flex justify-between items-center pl-md pr-xs py-2">
          <a href="/" id="siteBrand" class="flex items-center gap-xs group">
            <span class="w-9 h-9 rounded-full bg-gradient-to-br from-pink via-secondary to-primary text-on-primary flex items-center justify-center font-extrabold text-[18px] shadow-[0_4px_12px_rgba(232,74,138,0.4)] group-hover:scale-110 transition-transform">a</span>
            <span class="font-display-lg-mobile text-headline-md text-on-surface tracking-tight font-extrabold">anshel<span class="text-transparent bg-clip-text bg-gradient-to-r from-pink to-secondary">store</span></span>
          </a>
          <div class="hidden md:flex items-center gap-xs">
            ${NAV.map((n) => `<a class="px-md py-sm rounded-full font-label-md text-label-md transition-all ${n.key === active ? "bg-pink-50 text-pink font-bold" : "text-on-surface-variant hover:bg-surface-container hover:text-primary"}" href="${n.href}">${n.label}</a>`).join("")}
          </div>
          <div class="hidden md:flex items-center gap-xs pl-xs" id="siteAuth">
            <a href="/masuk" class="px-md py-sm rounded-full font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors">Masuk</a>
            <a href="/topup" class="bg-gradient-to-r from-pink to-secondary text-on-primary font-label-md text-label-md px-md py-sm rounded-full shadow-[0_4px_14px_rgba(232,74,138,0.35)] hover:scale-105 active:scale-95 transition-all">Top Up ✨</a>
          </div>
          <a href="/akun" id="siteAuthMobile" class="md:hidden w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"><span class="material-symbols-outlined text-[20px]">person</span></a>
        </div>
      </nav>
    </div>`;
  }
  // Bottom tab bar (mobile) — pengganti hamburger
  const BOTTOM = [
    { href: "/", label: "Beranda", icon: "home", key: "home" },
    { href: "/topup", label: "Top Up", icon: "stadia_controller", key: "topup" },
    { href: "/blog", label: "Artikel", icon: "article", key: "blog" },
    { href: "/akun", label: "Akun", icon: "person", key: "akun" },
  ];
  const bnav = document.createElement("div");
  bnav.className = "site-bottom-nav";
  bnav.innerHTML = BOTTOM.map((n) => `<a href="${n.href}" class="${n.key === active ? "active" : ""}"><span class="material-symbols-outlined">${n.icon}</span>${n.label}</a>`).join("");
  document.body.appendChild(bnav);

  const footMount = document.getElementById("siteFooter");
  if (footMount) {
    footMount.innerHTML = `
    <footer class="bg-surface-container-low w-full mt-xl rounded-t-lg">
      <div class="px-margin-mobile md:px-margin-desktop py-lg max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div class="flex flex-col gap-sm">
          <div class="text-headline-md font-display-lg text-secondary" id="footBrand">anshelstore</div>
          <p class="font-body-md text-body-md text-on-surface-variant max-w-xs">AI automation, chatbot pintar, dan top up game instan. Cepat, profesional, terpercaya.</p>
          <div id="footSocial" class="flex gap-sm mt-xs"></div>
        </div>
        <div>
          <h4 class="font-label-md text-label-md text-on-surface font-bold mb-sm">Navigasi</h4>
          <div class="flex flex-col gap-xs">${NAV.map((n) => `<a class="font-label-md text-label-md text-on-surface-variant hover:text-secondary transition-colors" href="${n.href}">${n.label}</a>`).join("")}</div>
        </div>
        <div>
          <h4 class="font-label-md text-label-md text-on-surface font-bold mb-sm">Akun & Kontak</h4>
          <a href="/akun" class="font-label-md text-label-md text-on-surface-variant hover:text-secondary block mb-xs">👤 Akun Saya</a>
          <a id="footWa" href="/tentang" target="_blank" rel="noopener" class="font-label-md text-label-md text-on-surface-variant hover:text-secondary block mb-xs">💬 WhatsApp</a>
          <a id="footMail" href="/tentang" class="font-label-md text-label-md text-on-surface-variant hover:text-secondary block">✉️ Email</a>
        </div>
      </div>
      <div class="border-t border-outline-variant/30 py-md text-center font-body-md text-body-md text-on-surface-variant">© ${new Date().getFullYear()} anshelstore. Dibuat dengan ❤️ di Indonesia.</div>
    </footer>`;
  }

  // Kontak dari backend
  fetch("/api/settings").then((r) => r.json()).then((d) => {
    const s = d.store || {}, set = d.settings || {}, soc = set.social || {};
    if (set.logo) {
      const b = document.getElementById("siteBrand");
      if (b) b.innerHTML = `<img src="${set.logo}" alt="anshelstore" class="h-9 w-auto group-hover:scale-105 transition-transform"/>`;
      const fb = document.getElementById("footBrand");
      if (fb) fb.innerHTML = `<img src="${set.logo}" alt="anshelstore" class="h-9 w-auto"/>`;
    }
    if (s.whatsapp) { const wa = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Halo anshelstore, saya mau tanya.")}`; const fw = document.getElementById("footWa"); if (fw) fw.href = wa; }
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
      if (auth) auth.innerHTML = `<a href="/akun" class="flex items-center gap-xs px-sm py-xs rounded-full hover:bg-pink-50 font-label-md text-label-md text-on-surface transition-colors">${av} ${nm}</a><a href="/topup" class="bg-gradient-to-r from-pink to-secondary text-on-primary font-label-md text-label-md px-md py-sm rounded-full shadow-[0_4px_14px_rgba(232,74,138,0.35)]">Top Up ✨</a>`;
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
