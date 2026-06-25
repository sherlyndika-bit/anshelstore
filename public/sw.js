/* Anshel Store — Service Worker (PWA)
   Strategi: HALAMAN (HTML) = network-first (selalu coba versi terbaru, fallback cache saat offline).
             ASET statis (css/js/gambar) = cache-first (cepat), diperbarui di belakang layar.
   API (/api/) tidak pernah di-cache (selalu data segar). */
const CACHE = "anshel-v2";
const PRECACHE = ["/", "/css/theme.css", "/js/theme.js", "/js/site.js", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // jangan ganggu CDN / domain lain
  if (url.pathname.startsWith("/api/")) return;            // API selalu langsung ke network
  if (url.pathname.startsWith("/uploads/")) return;        // gambar upload langsung dari server

  const isHTML = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // network-first
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match("/")))
    );
    return;
  }

  // aset statis: cache-first
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.status === 200 && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
