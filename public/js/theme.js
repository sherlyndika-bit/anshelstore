


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
    addMeta("theme-color", "#e11d48");
    addMeta("apple-mobile-web-app-capable", "yes");
    addMeta("apple-mobile-web-app-status-bar-style", "default");
    addMeta("apple-mobile-web-app-title", "Anshel Store");
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
    }

    // Tombol "Pasang App" — muncul saat browser menyatakan situs bisa di-install
    var deferred = null;
    function showInstallBtn() {
      if (window.location.pathname.startsWith('/dashboard')) return;
      if (document.getElementById("pwaInstallBtn") || !document.body) return;
      var b = document.createElement("button");
      b.id = "pwaInstallBtn"; b.type = "button";
      b.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;line-height:1">install_mobile</span> Pasang App';
      b.style.cssText = "position:fixed;left:16px;bottom:110px;z-index:9999;background:#e11d48;color:#fff;border:0;border-radius:9999px;padding:12px 18px;font-weight:700;font-family:'Be Vietnam Pro',system-ui,sans-serif;font-size:14px;box-shadow:0 10px 28px rgba(225,29,72,.45);cursor:pointer;display:inline-flex;align-items:center;gap:6px";
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

// ==== Global Page Transition & Preloader ====
(function() {
  // Inject Preloader DOM
  function injectPreloader() {
    if (document.getElementById('global-preloader')) return;
    const p = document.createElement('div');
    p.id = 'global-preloader';
    p.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#ffffff;display:flex;align-items:center;justify-content:center;transition:opacity 0.4s ease-out,visibility 0.4s ease-out;';
    p.innerHTML = '<div class="preloader-content" style="display:flex;flex-direction:column;align-items:center;justify-content:center;"><img src="/logo.png" alt="Anshel Store Logo" class="preloader-logo" style="height:auto;max-height:120px;width:auto;max-width:80vw;object-fit:contain;"/></div>';
    
    // Fallback if body is somehow not ready
    if (document.body) {
      document.body.prepend(p);
    }
  }

  // Attempt to inject as early as possible
  if (document.body) {
    injectPreloader();
  } else {
    const observer = new MutationObserver(() => {
      if (document.body) {
        injectPreloader();
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, { childList: true });
  }

  // Remove preloader when everything is fully loaded
  window.addEventListener('load', () => {
    const p = document.getElementById('global-preloader');
    if (p) p.classList.add('loaded');
  });

  // Intercept internal links for smooth exit transition
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    // Only intercept if it's an internal link, not opening in new tab, and not a hash link
    const isInternal = link.hostname === window.location.hostname || !link.hostname;
    const isNewTab = link.target === '_blank';
    const isHash = link.getAttribute('href')?.startsWith('#');
    const isAction = link.getAttribute('href')?.startsWith('javascript:') || link.getAttribute('href')?.startsWith('mailto:') || link.getAttribute('href')?.startsWith('tel:');

    if (isInternal && !isNewTab && !isHash && !isAction) {
      e.preventDefault();
      const p = document.getElementById('global-preloader');
      if (p) {
        // Show preloader again
        p.classList.remove('loaded');
        // Fast transition delay (150ms)
        setTimeout(() => {
          window.location.href = link.href;
        }, 150);
      } else {
        window.location.href = link.href;
      }
    }
  });
})();
