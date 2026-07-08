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
    addMeta("theme-color", "#6c5ce7");
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
      b.style.cssText = "position:fixed;right:16px;bottom:88px;z-index:9999;background:#6c5ce7;color:#fff;border:0;border-radius:999px;padding:12px 18px;font-weight:700;font-family:'Inter',system-ui,sans-serif;font-size:14px;box-shadow:0 8px 24px rgba(108,92,231,0.4);cursor:pointer;display:inline-flex;align-items:center;gap:6px";
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
