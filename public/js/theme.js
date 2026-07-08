// Konfigurasi tema Tailwind Anshel Store — Pink E-commerce Professional
window.tailwind = window.tailwind || {};
tailwind.config = {
  darkMode: "class",
  theme: { extend: {
    colors: {
      "primary": "#e84393", "surface-dim": "#f1f5f9", "secondary": "#2d3436",
      "surface-container": "#f8f9fa", "outline-variant": "#e2e8f0", "primary-container": "#ffeaf2",
      "tertiary-container": "#e3f2fd", "on-secondary": "#ffffff", "error": "#ef4444",
      "on-secondary-container": "#1e293b", "inverse-primary": "#fd79a8", "on-surface": "#1e293b",
      "inverse-on-surface": "#f1f5f9", "surface": "#ffffff", "background": "#f8f9fa",
      "inverse-surface": "#1e293b", "surface-container-highest": "#e2e8f0", "surface-bright": "#ffffff",
      "on-primary": "#ffffff", "on-background": "#1e293b", "on-tertiary-container": "#0984e3",
      "on-primary-fixed": "#d63031", "on-error": "#ffffff", "on-primary-fixed-variant": "#d63031",
      "tertiary": "#0984e3", "surface-container-lowest": "#ffffff", "error-container": "#fee2e2",
      "on-secondary-fixed": "#1e293b", "on-secondary-fixed-variant": "#2d3436", "surface-variant": "#f1f5f9",
      "on-primary-container": "#d63031", "surface-container-high": "#f8f9fa", "tertiary-fixed": "#dbeafe",
      "secondary-container": "#f1f2f6", "surface-container-low": "#ffffff", "tertiary-fixed-dim": "#74b9ff",
      "on-tertiary": "#ffffff", "surface-tint": "#e84393", "outline": "#cbd5e1", "primary-fixed-dim": "#fd79a8",
      "on-surface-variant": "#64748b", "on-error-container": "#991b1b", "secondary-fixed-dim": "#636e72",
      "primary-fixed": "#ffeaf2", "secondary-fixed": "#f1f2f6", "on-tertiary-fixed-variant": "#0984e3",
      "pink": "#e84393", "pink-soft": "#ffeaf2", "pink-50": "#fdf2f8", "pink-100": "#fce7f3", "on-pink": "#9d174d"
    },
    borderRadius: { "DEFAULT": "1rem", "lg": "1.5rem", "xl": "2rem", "full": "9999px" },
    spacing: { "margin-mobile": "16px", "sm": "12px", "gutter": "24px", "md": "24px", "xs": "4px", "lg": "48px", "margin-desktop": "40px", "base": "8px", "xl": "80px", "2xl": "120px" },
    fontFamily: { "display-lg-mobile": ["Inter"], "headline-md": ["Inter"], "display-lg": ["Inter"], "body-lg": ["Inter"], "body-md": ["Inter"], "headline-lg": ["Inter"], "label-sm": ["Inter"], "label-md": ["Inter"], "label-lg": ["Inter"] },
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
