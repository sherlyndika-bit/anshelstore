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
          <a href="/" id="siteBrand" class="flex items-center shrink-0">
            <img src="/logo.png" alt="Anshel Store" class="h-12 md:h-14 w-auto object-contain"/>
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
    <footer class="bg-white border-t border-slate-200 w-full py-8 px-4 md:px-8 mt-8">
      <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
        <div class="md:col-span-1 flex flex-col gap-3">
          <a href="/" id="footBrand" class="flex items-center">
            <span class="w-12 h-12 rounded bg-primary text-white grid place-items-center font-bold text-2xl">A</span>
          </a>
          <p class="text-slate-500 text-xs leading-relaxed">Platform E-Commerce Top Up Game dan Layanan Digital terpercaya, murah, dan instan di Indonesia.</p>
          <div id="footSocial" class="flex gap-2 mt-1"></div>
        </div>
        <div>
          <h4 class="text-slate-800 font-bold mb-3 text-sm">Navigasi Utama</h4>
          <div class="flex flex-col gap-2">
            ${NAV.map((n) => `<a class="text-slate-500 hover:text-primary transition-colors text-sm" href="${n.href}">${n.label}</a>`).join("")}
          </div>
        </div>
        <div>
          <h4 class="text-slate-800 font-bold mb-3 text-sm">Bantuan & Legal</h4>
          <div class="flex flex-col gap-2">
            <a href="/syarat-dan-ketentuan" class="text-slate-500 hover:text-primary transition-colors text-sm">Syarat dan Ketentuan</a>
            <a href="/kebijakan-privasi" class="text-slate-500 hover:text-primary transition-colors text-sm">Kebijakan Privasi</a>
            <a href="/kebijakan-pengembalian" class="text-slate-500 hover:text-primary transition-colors text-sm">Kebijakan Pengembalian Dana</a>
            <a href="/cara-pembelian" class="text-slate-500 hover:text-primary transition-colors text-sm">Cara Pembelian</a>
            <a href="/kontak" class="text-slate-500 hover:text-primary transition-colors text-sm">Hubungi Kami</a>
          </div>
        </div>
        <div>
          <h4 class="text-slate-800 font-bold mb-3 text-sm">Kontak Kami</h4>
          <div class="flex flex-col gap-2">
            <a id="footWa" href="/kontak" target="_blank" rel="noopener" class="text-slate-500 hover:text-primary transition-colors text-sm flex items-center gap-2"><img src="/img/whatsapp.png" alt="WA" class="h-4 object-contain"/> WhatsApp CS</a>
            <a id="footMail" href="/kontak" class="text-slate-500 hover:text-primary transition-colors text-sm flex items-center gap-2"><span class="material-symbols-outlined text-[16px]">mail</span> Email Support</a>
            <div class="mt-2 bg-slate-50 p-2.5 rounded border border-slate-100 flex items-center gap-2 w-max">
              <span class="material-symbols-outlined text-green-500 text-xl">verified_user</span>
              <div class="text-[10px] text-slate-500 leading-tight">100% Aman &<br/>Terpercaya</div>
            </div>
          </div>
        </div>
      </div>
      <div class="max-w-7xl mx-auto mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span class="text-xs text-slate-400">© ${new Date().getFullYear()} Anshel Store. All rights reserved.</span>
      </div>
    </footer>`;
  }

  // Kontak dari backend
  fetch("/api/settings").then((r) => r.json()).then((d) => {
    const s = d.store || {}, set = d.settings || {}, soc = set.social || {};
    if (set.logo) {
      let icon = document.querySelector("link[rel='icon']");
      if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.appendChild(icon); }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const cvs = document.createElement("canvas");
          cvs.width = 64; cvs.height = 64;
          const ctx = cvs.getContext("2d");
          ctx.drawImage(img, 0, 0, img.width, img.width, 0, 0, 64, 64);
          icon.href = cvs.toDataURL("image/png");
        } catch (e) { icon.href = set.logo; }
      };
      img.onerror = () => { icon.href = set.logo; };
      img.src = set.logo;

      const b = document.getElementById("siteBrand");
      if (b) b.innerHTML = `<img src="${set.logo}" alt="Anshel Store" class="h-20 md:h-24 w-auto -my-5 md:-my-6 transition-transform"/>`;
      const fb = document.getElementById("footBrand");
      if (fb) fb.innerHTML = `<img src="${set.logo}" alt="Anshel Store" class="h-16 w-auto -ml-2"/>`;
    }
    if (s.whatsapp) { const wa = `https://wa.me/${s.whatsapp}?text=${encodeURIComponent("Halo Anshel Store, saya mau tanya.")}`; const fw = document.getElementById("footWa"); if (fw) fw.href = wa; }
    const fm = document.getElementById("footMail"); if (fm && s.email) fm.href = "mailto:" + s.email;
    const fs = document.getElementById("footSocial");
    if (fs) { const ic = (label, href, img) => href ? `<a href="${href}" target="_blank" rel="noopener" class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center hover:bg-secondary-fixed transition-colors" title="${label}"><img src="/img/${img}" alt="${label}" class="w-5 h-5 object-contain"/></a>` : ""; fs.innerHTML = ic("Instagram", soc.instagram, "instagram.png") + ic("TikTok", soc.tiktok, "tiktok.png") + ic("YouTube", soc.youtube, "youtube.png"); }
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

  // Ulasan Pelanggan
  const rSec = document.getElementById("reviewsSection");
  const rCont = document.getElementById("reviewsContainer");
  if (rSec && rCont) {
    const rEsc = (str) => String(str).replace(/[&<>'"]/g, (tag) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[tag]));
    const avatarColors = ["from-pink-500 to-rose-400","from-violet-500 to-purple-400","from-blue-500 to-cyan-400","from-emerald-500 to-teal-400","from-amber-500 to-orange-400","from-red-500 to-pink-400"];
    fetch("/api/reviews?limit=15").then(r => r.json()).then(revs => {
      if (revs && revs.length > 0) {
        // Aggregate rating
        const avg = (revs.reduce((s,r) => s + r.rating, 0) / revs.length).toFixed(1);
        const aggEl = document.getElementById("aggRating");
        if (aggEl) {
          let aggStars = "";
          for (let i = 0; i < 5; i++) { aggStars += `<span class="material-symbols-outlined text-amber-400 text-xl" style="font-family:'Material Symbols Outlined';font-variation-settings:'FILL' ${i < Math.round(Number(avg)) ? 1 : 0}">star</span>`; }
          aggEl.innerHTML = `${aggStars}<span class="text-2xl font-extrabold text-slate-800 ml-1">${avg}</span><span class="text-slate-400 text-sm">/ 5 dari ${revs.length} ulasan</span>`;
        }
        let html = "";
        revs.forEach((r, idx) => {
          let stars = "";
          for (let i = 0; i < 5; i++) { stars += `<span class="material-symbols-outlined text-amber-400 text-xs" style="font-family:'Material Symbols Outlined';font-variation-settings:'FILL' ${i < r.rating ? 1 : 0}">star</span>`; }
          const initial = (r.customerName || "A").charAt(0).toUpperCase();
          const grad = avatarColors[idx % avatarColors.length];
          const timeAgo = ((Date.now() - r.createdAt) / 60000) < 60 ? Math.max(1, Math.floor((Date.now() - r.createdAt) / 60000)) + " menit lalu" : ((Date.now() - r.createdAt) / 3600000) < 24 ? Math.floor((Date.now() - r.createdAt) / 3600000) + " jam lalu" : Math.floor((Date.now() - r.createdAt) / 86400000) + " hari lalu";
          const hasPhoto = r.customerPicture && !r.customerPicture.startsWith("data:");
          const avatarEl = hasPhoto 
            ? `<img src="${rEsc(r.customerPicture)}" class="w-10 h-10 rounded-full object-cover shadow-sm"/>` 
            : `<div class="w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold text-sm shadow-sm">${initial}</div>`;
          html += `
            <div class="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow shrink-0 w-[280px] md:w-[320px]">
              <div class="flex items-center gap-3 mb-3">
                ${avatarEl}
              <div class="flex-1 min-w-0">
                <div class="font-bold text-slate-800 text-sm truncate">${rEsc(r.customerName)}</div>
                <div class="text-xs text-slate-400">${rEsc(r.gameName)} · ${timeAgo}</div>
              </div>
            </div>
            <div class="flex gap-0.5 mb-2">${stars}</div>
            <p class="text-slate-600 text-sm leading-relaxed"><span class="text-slate-300 text-lg font-serif">"</span>${rEsc(r.comment || "Mantap, proses cepat!")}<span class="text-slate-300 text-lg font-serif">"</span></p>
          </div>`;
        });
        rCont.innerHTML = html + html;
        rSec.classList.remove("hidden");
      }
    }).catch(()=>{});
  }

  // Dynamic stats for tentang page
  const statOrders = document.getElementById("stat-orders");
  const statGames = document.getElementById("stat-games");
  const statRating = document.getElementById("stat-rating");
  if (statOrders || statGames || statRating) {
    fetch("/api/stats").then(r => r.json()).then(s => {
      if (statOrders) statOrders.textContent = s.totalOrders > 0 ? s.totalOrders.toLocaleString("id-ID") + "+" : "0";
      if (statGames) statGames.textContent = s.totalGames + "+";
      if (statRating) statRating.textContent = s.totalReviews > 0 ? s.avgRating + "★" : "—";
    }).catch(()=>{});
  }

  // Clients showcase
  const clSec = document.getElementById("clientsSection");
  const clCont = document.getElementById("clientsContainer");
  if (clSec && clCont) {
    fetch("/api/clients").then(r => r.json()).then(clients => {
      if (clients && clients.length > 0) {
        clCont.innerHTML = clients.map(c => 
          c.logo ? `<div class="flex flex-col items-center gap-2"><img src="${c.logo}" alt="${c.name}" class="h-12 md:h-16 object-contain"/><span class="text-xs text-slate-500 font-medium">${c.name}</span></div>` 
          : `<div class="px-6 py-3 bg-white border border-slate-200 rounded-xl shadow-sm text-slate-700 font-bold text-sm">${c.name}</div>`
        ).join("");
        clSec.classList.remove("hidden");
      }
    }).catch(()=>{});
  }

  // Customer notification bell
  const token = localStorage.getItem("anshel_token");
  if (token) {
    fetch("/api/my/notifications", { headers: { "x-auth-token": token } }).then(r => r.json()).then(notifs => {
      if (!Array.isArray(notifs)) return;
      const unread = notifs.filter(n => !n.read).length;
      const nav = document.querySelector("#siteAuth") || document.querySelector("nav");
      if (!nav) return;
      const bell = document.createElement("div");
      bell.className = "relative cursor-pointer mr-2";
      bell.innerHTML = `<span class="material-symbols-outlined text-slate-600 hover:text-primary transition-colors mt-1 block">notifications</span>${unread > 0 ? `<span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">${unread > 9 ? '9+' : unread}</span>` : ''}`;
      
      const panel = document.createElement("div");
      panel.className = "hidden absolute right-0 top-10 w-80 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-left";
      panel.innerHTML = `<div class="px-3 py-2 border-b border-slate-100 font-bold text-sm text-slate-800">Notifikasi</div>` + 
        (notifs.length === 0 ? `<div class="p-4 text-center text-slate-400 text-sm">Belum ada notifikasi</div>` :
        notifs.slice(0, 15).map(n => `<div class="px-3 py-2.5 rounded-lg ${n.read ? '' : 'bg-blue-50'} hover:bg-slate-50 transition-colors flex items-start gap-2 cursor-pointer notif-item" data-id="${n.id}"><span class="material-symbols-outlined text-sm mt-0.5 ${n.read ? 'text-slate-400' : 'text-primary'}">${n.icon || 'notifications'}</span><div class="flex-1 min-w-0"><div class="text-sm font-medium text-slate-800">${n.title}</div><div class="text-xs text-slate-500 truncate">${n.message}</div></div></div>`).join(""));
      
      bell.appendChild(panel);
      bell.addEventListener("click", (e) => { e.stopPropagation(); panel.classList.toggle("hidden"); });
      document.addEventListener("click", () => panel.classList.add("hidden"));
      
      // Mark as read on click
      panel.querySelectorAll(".notif-item").forEach(item => {
        item.addEventListener("click", () => {
          fetch(`/api/my/notifications/${item.dataset.id}/read`, { method: "POST", headers: { "x-auth-token": token } });
          item.classList.remove("bg-blue-50");
          const ubadge = bell.querySelector("span.bg-red-500");
          if(ubadge) { let u = parseInt(ubadge.textContent); if(!isNaN(u) && u>0) { u--; if(u===0) ubadge.remove(); else ubadge.textContent=u; } }
        });
      });
      
      if (nav.firstChild) nav.insertBefore(bell, nav.firstChild);
      else nav.appendChild(bell);
    }).catch(()=>{});
  }

})();
