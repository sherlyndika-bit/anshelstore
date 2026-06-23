// Navigasi & footer bersama anshelstore (semua halaman). Menyuntik ke #siteNav & #siteFooter.
(function () {
  const NAV = [
    { href: "/#layanan", label: "Layanan AI", key: "layanan" },
    { href: "/topup.html", label: "Top Up Game", key: "topup" },
    { href: "/blog", label: "Artikel", key: "blog" },
    { href: "/faq.html", label: "FAQ", key: "faq" },
    { href: "/tentang.html", label: "Tentang", key: "tentang" },
    { href: "/cek-transaksi.html", label: "Cek Transaksi", key: "cek" },
  ];
  const active = document.body.dataset.page || "";
  const linkClass = (k) => k === active
    ? "text-secondary font-bold border-b-2 border-secondary pb-1"
    : "text-on-surface-variant hover:text-primary transition-colors";

  const navMount = document.getElementById("siteNav");
  if (navMount) {
    navMount.innerHTML = `
    <nav class="sticky top-0 w-full z-50 bg-surface/80 backdrop-blur-xl shadow-sm shadow-primary/10">
      <div class="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 max-w-7xl mx-auto">
        <a href="/" class="text-headline-md md:text-headline-lg font-display-lg-mobile md:font-display-lg text-primary tracking-tight font-extrabold hover:scale-105 transition-transform duration-200">anshelstore</a>
        <div class="hidden lg:flex items-center gap-gutter">
          ${NAV.map((n) => `<a class="font-label-md text-label-md ${linkClass(n.key)}" href="${n.href}">${n.label}</a>`).join("")}
        </div>
        <div class="hidden lg:block">
          <a id="navWa" href="#" target="_blank" rel="noopener" class="bg-gradient-to-r from-primary-container to-secondary-container text-on-primary font-label-md text-label-md px-gutter py-sm rounded-full shadow-[0_4px_12px_rgba(129,39,207,0.2)] hover:scale-105 active:scale-95 transition-all">Hubungi Kami</a>
        </div>
        <button id="navToggle" class="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors" aria-label="Menu">
          <span class="material-symbols-outlined">menu</span>
        </button>
      </div>
      <div id="navMobile" class="lg:hidden hidden border-t border-outline-variant/30 bg-surface/95 backdrop-blur-xl">
        <div class="px-margin-mobile py-sm flex flex-col">
          ${NAV.map((n) => `<a class="py-sm font-label-md text-label-md ${active === n.key ? "text-secondary font-bold" : "text-on-surface-variant"}" href="${n.href}">${n.label}</a>`).join("")}
          <a id="navWaM" href="#" target="_blank" rel="noopener" class="mt-xs text-center bg-gradient-to-r from-primary-container to-secondary-container text-on-primary font-label-md text-label-md py-sm rounded-full">Hubungi Kami</a>
        </div>
      </div>
    </nav>`;
    const toggle = document.getElementById("navToggle");
    const mobile = document.getElementById("navMobile");
    toggle.addEventListener("click", () => mobile.classList.toggle("hidden"));
  }

  const footMount = document.getElementById("siteFooter");
  if (footMount) {
    footMount.innerHTML = `
    <footer class="bg-surface-container-low w-full mt-xl rounded-t-lg">
      <div class="px-margin-mobile md:px-margin-desktop py-lg max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div class="flex flex-col gap-sm">
          <div class="text-headline-md font-display-lg text-secondary">anshelstore</div>
          <p class="font-body-md text-body-md text-on-surface-variant max-w-xs">AI automation, chatbot pintar, dan top up game instan. Cepat, profesional, terpercaya.</p>
          <div id="footSocial" class="flex gap-sm mt-xs"></div>
        </div>
        <div>
          <h4 class="font-label-md text-label-md text-on-surface font-bold mb-sm">Navigasi</h4>
          <div class="flex flex-col gap-xs">
            ${NAV.map((n) => `<a class="font-label-md text-label-md text-on-surface-variant hover:text-secondary transition-colors" href="${n.href}">${n.label}</a>`).join("")}
          </div>
        </div>
        <div>
          <h4 class="font-label-md text-label-md text-on-surface font-bold mb-sm">Kontak</h4>
          <a id="footWa" href="#" target="_blank" rel="noopener" class="font-label-md text-label-md text-on-surface-variant hover:text-secondary transition-colors block mb-xs">💬 WhatsApp</a>
          <a id="footMail" href="#" class="font-label-md text-label-md text-on-surface-variant hover:text-secondary transition-colors block">✉️ Email</a>
        </div>
      </div>
      <div class="border-t border-outline-variant/30 py-md text-center font-body-md text-body-md text-on-surface-variant">© ${new Date().getFullYear()} anshelstore. Dibuat dengan ❤️ di Indonesia.</div>
    </footer>`;
  }

  // Isi kontak (WA, email, sosmed) dari backend
  fetch("/api/settings").then((r) => r.json()).then((d) => {
    const s = d.store || {}, set = d.settings || {}, soc = set.social || {};
    if (s.whatsapp) {
      const wa = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Halo anshelstore, saya mau tanya.")}`;
      ["navWa", "navWaM", "footWa"].forEach((id) => { const el = document.getElementById(id); if (el) el.href = wa; });
    }
    const fm = document.getElementById("footMail"); if (fm && s.email) fm.href = "mailto:" + s.email;
    const fs = document.getElementById("footSocial");
    if (fs) {
      const ic = (label, href) => href ? `<a href="${href}" target="_blank" rel="noopener" class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-secondary hover:bg-secondary-fixed transition-colors" title="${label}"><span class="material-symbols-outlined text-[18px]">${label === "Instagram" ? "photo_camera" : label === "YouTube" ? "smart_display" : "tag"}</span></a>` : "";
      fs.innerHTML = ic("Instagram", soc.instagram) + ic("TikTok", soc.tiktok) + ic("YouTube", soc.youtube);
    }
  }).catch(() => {});
})();
