// Konfigurasi tema Tailwind Anshel Store — gaya marshmallow (dipakai semua halaman publik)
tailwind.config = {
  darkMode: "class",
  theme: { extend: {
    colors: {
      "primary": "#8c4c52", "surface-dim": "#ded9d5", "secondary": "#735946",
      "surface-container": "#f3ede9", "outline-variant": "#d7c1c2", "primary-container": "#f2a2a9",
      "tertiary-container": "#d4b191", "on-secondary": "#ffffff", "error": "#ba1a1a",
      "on-secondary-container": "#785d4a", "inverse-primary": "#ffb2b9", "on-surface": "#1d1b19",
      "inverse-on-surface": "#f5f0ec", "surface": "#fef8f4", "background": "#fef8f4",
      "inverse-surface": "#32302e", "surface-container-highest": "#e7e1de", "surface-bright": "#fef8f4",
      "on-primary": "#ffffff", "on-background": "#1d1b19", "on-tertiary-container": "#5c432a",
      "on-primary-fixed": "#390a12", "on-error": "#ffffff", "on-primary-fixed-variant": "#6f353c",
      "tertiary": "#75593e", "surface-container-lowest": "#ffffff", "error-container": "#ffdad6",
      "on-secondary-fixed": "#291709", "on-secondary-fixed-variant": "#594230", "surface-variant": "#e7e1de",
      "on-primary-container": "#71363d", "surface-container-high": "#ede7e3", "tertiary-fixed": "#ffdcbe",
      "secondary-container": "#fcd9c1", "surface-container-low": "#f8f2ef", "tertiary-fixed-dim": "#e4c09f",
      "on-tertiary": "#ffffff", "surface-tint": "#8c4c52", "outline": "#857374", "primary-fixed-dim": "#ffb2b9",
      "on-surface-variant": "#524344", "on-error-container": "#93000a", "secondary-fixed-dim": "#e2c0a9",
      "primary-fixed": "#ffdadb", "secondary-fixed": "#ffdcc4", "on-tertiary-fixed-variant": "#5b4229",
      "pink": "#bf5d7e", "pink-soft": "#fbe1e9", "pink-50": "#fdf3f6", "pink-100": "#fbe7ee", "on-pink": "#7d2f49"
    },
    borderRadius: { "DEFAULT": "1rem", "lg": "2rem", "xl": "3rem", "full": "9999px" },
    spacing: { "margin-mobile": "16px", "sm": "12px", "gutter": "24px", "md": "24px", "xs": "4px", "lg": "48px", "margin-desktop": "40px", "base": "8px", "xl": "80px", "2xl": "120px" },
    fontFamily: { "display-lg-mobile": ["Plus Jakarta Sans"], "headline-md": ["Plus Jakarta Sans"], "display-lg": ["Plus Jakarta Sans"], "body-lg": ["Be Vietnam Pro"], "body-md": ["Be Vietnam Pro"], "headline-lg": ["Plus Jakarta Sans"], "label-sm": ["Be Vietnam Pro"], "label-md": ["Be Vietnam Pro"], "label-lg": ["Be Vietnam Pro"] },
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
  } catch (e) {}
})();
