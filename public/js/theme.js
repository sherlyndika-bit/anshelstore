// Konfigurasi tema Tailwind Anshel Store — Pink E-commerce Professional
window.tailwind = window.tailwind || {};
tailwind.config = {
  darkMode: "class",
  theme: { extend: {
    colors: {
      "primary": "#e11d48", "surface-dim": "#f8fafc", "secondary": "#0f172a",
      "surface-container": "#f1f5f9", "outline-variant": "#e2e8f0", "primary-container": "#ffe4e6",
      "tertiary-container": "#e2e8f0", "on-secondary": "#ffffff", "error": "#ef4444",
      "on-secondary-container": "#0f172a", "inverse-primary": "#f43f5e", "on-surface": "#0f172a",
      "inverse-on-surface": "#f8fafc", "surface": "#ffffff", "background": "#f8fafc",
      "inverse-surface": "#0f172a", "surface-container-highest": "#e2e8f0", "surface-bright": "#ffffff",
      "on-primary": "#ffffff", "on-background": "#0f172a", "on-tertiary-container": "#1e293b",
      "on-primary-fixed": "#9f1239", "on-error": "#ffffff", "on-primary-fixed-variant": "#be123c",
      "tertiary": "#334155", "surface-container-lowest": "#ffffff", "error-container": "#fee2e2",
      "on-secondary-fixed": "#0f172a", "on-secondary-fixed-variant": "#1e293b", "surface-variant": "#f1f5f9",
      "on-primary-container": "#e11d48", "surface-container-high": "#f8fafc", "tertiary-fixed": "#e2e8f0",
      "secondary-container": "#f1f5f9", "surface-container-low": "#ffffff", "tertiary-fixed-dim": "#94a3b8",
      "on-tertiary": "#ffffff", "surface-tint": "#e11d48", "outline": "#cbd5e1", "primary-fixed-dim": "#f43f5e",
      "on-surface-variant": "#475569", "on-error-container": "#991b1b", "secondary-fixed-dim": "#64748b",
      "primary-fixed": "#ffe4e6", "secondary-fixed": "#e2e8f0", "on-tertiary-fixed": "#0f172a",
      "on-tertiary-fixed-variant": "#1e293b", "scrim": "#000000", "shadow": "#000000", "pink-100": "#ffe4e6", "on-pink": "#be123c"
    },
    borderRadius: { "DEFAULT": "1rem", "lg": "1.25rem", "xl": "1.5rem", "full": "9999px" },
    spacing: { "margin-mobile": "16px", "sm": "12px", "gutter": "24px", "md": "24px", "xs": "4px", "lg": "48px", "margin-desktop": "40px", "base": "8px", "xl": "80px", "2xl": "120px" },
    fontFamily: { "display-lg-mobile": ["Inter", "sans-serif"], "headline-md": ["Inter", "sans-serif"], "display-lg": ["Inter", "sans-serif"], "body-lg": ["Inter", "sans-serif"], "body-md": ["Inter", "sans-serif"], "headline-lg": ["Inter", "sans-serif"], "label-sm": ["Inter", "sans-serif"], "label-md": ["Inter", "sans-serif"], "label-lg": ["Inter", "sans-serif"] },
    fontSize: {
      "display-lg-mobile": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.02em", "fontWeight": "800" }],
      "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "700" }],
      "display-lg": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.02em", "fontWeight": "800" }],
      "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
      "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
      "headline-lg": ["32px", { "lineHeight": "40px", "fontWeight": "700" }],
      "label-sm": ["12px", { "lineHeight": "16px", "fontWeight": "500" }],
      "label-lg": ["16px", { "lineHeight": "24px", "letterSpacing": "0.01em", "fontWeight": "600" }],
      "label-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0.01em", "fontWeight": "600" }]
    }
  } }
};


// ── PWA: manifest, theme-color, ikon aplikasi, & service worker (berlaku di semua halaman) ──
(function () {
  try {
    var head = document.head || document.getElementsByTagName("head")[0];
    function addLink(rel, href, attrs) {
      if (document.querySelector('link[rel="' + rel + '"]')) return;
      var l = document.createElement("link"); l.rel = rel; l.href = href;
      if (attrs) Object.keys(attrs).forEach(function (k) { l.setAttribute(k, attrs[k]); });
      head.appendChild(l);
    }
    function addMeta(name, content) {
      if (document.querySelector('meta[name="' + name + '"]')) return;
      var m = document.createElement("meta"); m.name = name; m.content = content; head.appendChild(m);
    }
    addLink("manifest", "/manifest.json");
    addLink("apple-touch-icon", "/icon-192.png");
    addLink("icon", "/icon-192.png", { type: "image/png", sizes: "192x192" });
    addMeta("theme-color", "#8c4c52");
    addMeta("apple-mobile-web-app-capable", "yes");
    addMeta("apple-mobile-web-app-status-bar-style", "default");
    addMeta("apple-mobile-web-app-title", "Anshel Store");
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
    }

    // Tombol "Pasang App" — muncul saat browser menyatakan situs bisa di-install
    var deferred = null;
    function showInstallBtn() {
      if (document.getElementById("pwaInstallBtn") || !document.body) return;
      var b = document.createElement("button");
      b.id = "pwaInstallBtn"; b.type = "button";
      b.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;line-height:1">install_mobile</span> Pasang App';
      b.style.cssText = "position:fixed;right:16px;bottom:88px;z-index:9999;background:#8c4c52;color:#fff;border:0;border-radius:9999px;padding:12px 18px;font-weight:700;font-family:'Be Vietnam Pro',system-ui,sans-serif;font-size:14px;box-shadow:0 10px 28px rgba(140,76,82,.45);cursor:pointer;display:inline-flex;align-items:center;gap:6px";
      b.addEventListener("click", function () {
        if (!deferred) return;
        deferred.prompt();
        var done = function () { deferred = null; b.remove(); };
        if (deferred.userChoice && deferred.userChoice.then) deferred.userChoice.then(done, done);
        else done();
      });
      document.body.appendChild(b);
    }
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault(); deferred = e;
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showInstallBtn);
      else showInstallBtn();
    });
    window.addEventListener("appinstalled", function () { var b = document.getElementById("pwaInstallBtn"); if (b) b.remove(); deferred = null; });
  } catch (e) {}
})();
