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
    <header class="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
      <!-- Teks Berjalan (Announcement Bar) -->
      <div class="bg-primary text-white text-xs font-medium py-1.5 px-4">
        <div class="max-w-7xl mx-auto flex items-center">
          <span class="material-symbols-outlined text-[14px] mr-2">campaign</span>
          <marquee scrollamount="5" class="flex-1">Selamat datang di Anshel Store! Nikmati layanan top up game instan, termurah, dan terpercaya 24/7. Promo spesial diskon untuk member baru!</marquee>
        </div>
      </div>
      <!-- Navbar Utama -->
      <div class="px-4 md:px-8 py-3">
        <div class="max-w-7xl mx-auto flex justify-between items-center gap-4">
          <a href="/" id="siteBrand" class="flex items-center gap-3 shrink-0">
            <span class="w-12 h-12 rounded-lg bg-primary text-white grid place-items-center font-bold text-2xl shadow-sm">A</span>
            <span class="text-2xl text-slate-800 font-extrabold tracking-tight">Anshel<span class="text-primary">Store</span></span>
          </a>
          <nav class="hidden md:flex items-center gap-2">
            ${NAV.filter((n) => n.key !== "faq" && n.key !== "tentang" && n.key !== "cek").map((n) => `<a href="${n.href}" class="px-5 py-2.5 rounded-full font-medium transition-colors ${n.key === active ? "bg-pink-50 text-primary" : "text-slate-600 hover:text-primary hover:bg-slate-50"}">${n.label}</a>`).join("")}
          </nav>
          <div class="flex items-center gap-3 shrink-0" id="siteAuth">
            <a href="/cek-transaksi" title="Cek Transaksi" class="hidden md:flex items-center gap-2 text-slate-600 hover:text-primary font-medium transition-colors"><span class="material-symbols-outlined text-[20px]">receipt_long</span> Lacak Pesanan</a>
            <a href="/masuk" class="bg-primary hover:bg-pink-700 text-white font-medium px-6 py-2.5 rounded-full shadow-sm transition-colors hidden sm:block">Masuk / Daftar</a>
            <a href="/masuk" class="sm:hidden text-slate-600"><span class="material-symbols-outlined text-2xl">account_circle</span></a>
          </div>
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
  bnav.className = "fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 flex justify-between items-center px-1 pb-[env(safe-area-inset-bottom)] sm:hidden z-50 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]";
  bnav.innerHTML = BOTTOM.map((n) => `<a href="${n.href}" class="flex flex-col items-center justify-center w-full py-2 px-1 text-[10px] font-medium transition-colors ${n.key === active ? "text-primary" : "text-slate-400 hover:text-slate-600"}"><span class="material-symbols-outlined text-[24px] mb-0.5" ${n.key === active ? 'style="font-variation-settings:\'FILL\' 1"' : ""}>${n.icon}</span><span class="truncate w-full text-center">${n.label}</span></a>`).join("");
  document.body.appendChild(bnav);

  const footMount = document.getElementById("siteFooter");
  if (footMount) {
    footMount.innerHTML = `
    <footer class="bg-white border-t border-slate-200 w-full py-10 px-4 md:px-8 mt-12">
      <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div class="md:col-span-1 flex flex-col gap-4">
          <a href="/" id="footBrand" class="flex items-center gap-2">
            <span class="w-8 h-8 rounded bg-primary text-white grid place-items-center font-bold text-lg">A</span>
            <span class="text-xl text-slate-800 font-extrabold tracking-tight">Anshel<span class="text-primary">Store</span></span>
          </a>
          <p class="text-slate-500 text-xs leading-relaxed">Platform E-Commerce Top Up Game dan Layanan Digital terpercaya, murah, dan instan di Indonesia.</p>
          <div id="footSocial" class="flex gap-2 mt-2"></div>
        </div>
        <div>
          <h4 class="text-slate-800 font-bold mb-4 text-sm">Navigasi Utama</h4>
          <div class="flex flex-col gap-2.5">
            ${NAV.map((n) => `<a class="text-slate-500 hover:text-primary transition-colors text-sm" href="${n.href}">${n.label}</a>`).join("")}
          </div>
        </div>
        <div>
          <h4 class="text-slate-800 font-bold mb-4 text-sm">Bantuan & Legal</h4>
          <div class="flex flex-col gap-2.5">
            <a href="/syarat-dan-ketentuan" class="text-slate-500 hover:text-primary transition-colors text-sm">Syarat dan Ketentuan</a>
            <a href="/kebijakan-privasi" class="text-slate-500 hover:text-primary transition-colors text-sm">Kebijakan Privasi</a>
            <a href="/kebijakan-pengembalian" class="text-slate-500 hover:text-primary transition-colors text-sm">Kebijakan Pengembalian Dana</a>
            <a href="/cara-pembelian" class="text-slate-500 hover:text-primary transition-colors text-sm">Cara Pembelian</a>
            <a href="/kontak" class="text-slate-500 hover:text-primary transition-colors text-sm">Hubungi Kami</a>
          </div>
        </div>
        <div>
          <h4 class="text-slate-800 font-bold mb-4 text-sm">Kontak Kami</h4>
          <div class="flex flex-col gap-2.5">
            <a id="footWa" href="/kontak" target="_blank" rel="noopener" class="text-slate-500 hover:text-primary transition-colors text-sm flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">chat</span> WhatsApp CS</a>
            <a id="footMail" href="/kontak" class="text-slate-500 hover:text-primary transition-colors text-sm flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">mail</span> Email Support</a>
            <div class="mt-2 bg-slate-50 p-3 rounded border border-slate-100 flex items-center gap-2 w-max">
              <span class="material-symbols-outlined text-green-500 text-xl">verified_user</span>
              <div class="text-[10px] text-slate-500 leading-tight">100% Aman &<br/>Terpercaya</div>
            </div>
          </div>
        </div>
      </div>
      <div class="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span class="text-xs text-slate-400">© ${new Date().getFullYear()} Anshel Store. All rights reserved.</span>
      </div>
    </footer>`;
  }

  // Kontak dari backend
  fetch("/api/settings").then((r) => r.json()).then((d) => {
    const s = d.store || {}, set = d.settings || {}, soc = set.social || {};
    if (set.logo) {
      const b = document.getElementById("siteBrand");
      if (b) b.innerHTML = `<img src="${set.logo}" alt="Anshel Store" class="h-16 md:h-24 w-auto -my-3 md:-my-6 transition-transform"/>`;
      const fb = document.getElementById("footBrand");
      if (fb) fb.innerHTML = `<img src="${set.logo}" alt="Anshel Store" class="h-8 w-auto mr-1"/><span class="text-xl text-slate-800 font-extrabold tracking-tight">Anshel<span class="text-primary">Store</span></span>`;
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
      if (auth) auth.innerHTML = `<a href="/cek-transaksi" class="hidden md:flex items-center gap-2 text-slate-600 hover:text-primary font-medium mr-2 transition-colors"><span class="material-symbols-outlined text-[20px]">receipt_long</span> Lacak Pesanan</a><a href="/akun" class="flex items-center gap-2 pr-4 pl-1 py-1 rounded-full border border-slate-200 hover:border-primary/30 hover:bg-pink-50 font-medium text-sm text-slate-700 transition-colors">${av} ${nm}</a><a href="/dashboard" class="hidden md:block bg-slate-800 text-white font-medium px-5 py-2 rounded-full hover:bg-slate-900 transition-colors text-sm">Dashboard</a>`;
      const authM = document.getElementById("siteAuthM");
      if (authM) authM.innerHTML = `<a href="/akun" class="py-sm font-medium text-slate-700">👤 ${nm} (Akun Saya)</a><a href="/dashboard" class="text-center bg-slate-800 text-white font-medium py-sm rounded-full mt-2">Dashboard Admin</a>`;
    }).catch(() => {});
  }

  // Animasi reveal saat scroll
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else { reveals.forEach((el) => el.classList.add("in")); }
})();
