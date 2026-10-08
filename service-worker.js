// Offline shell. Roster data itself is cached by Firestore (IndexedDB), not here.
const CACHE = "micu-roster-v1";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./firebase-config.js", "./manifest.json",
  "./icon.svg", "./icon-180.png", "./icon-192.png", "./icon-512.png",
  "./fonts/inter-400.woff2", "./fonts/inter-700.woff2", "./fonts/inter-900.woff2",
  "./fonts/poppins-400.woff2", "./fonts/poppins-700.woff2", "./fonts/poppins-900.woff2",
  "./fonts/nunito-400.woff2", "./fonts/nunito-700.woff2", "./fonts/nunito-900.woff2",
  "./fonts/lora-400.woff2", "./fonts/lora-700.woff2", "./fonts/lora-900.woff2"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(ASSETS.map((a) => c.add(a).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

// App files: network first (so updates arrive), cache when offline or slow. Fonts: cache first.
function networkFirst(req) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done && r) { done = true; resolve(r); } };
    const t = setTimeout(() => caches.match(req, { ignoreSearch: true }).then(finish), 4000);
    fetch(req).then((res) => {
      clearTimeout(t);
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      finish(res);
    }).catch(() => {
      clearTimeout(t);
      caches.match(req, { ignoreSearch: true }).then((c) => finish(c || caches.match("./index.html")));
    });
  });
}
self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return; // Firebase calls go straight to the network
  if (u.pathname.includes("/fonts/")) {
    e.respondWith(caches.match(r).then((c) => c || fetch(r).then((res) => { const copy = res.clone(); caches.open(CACHE).then((x) => x.put(r, copy)); return res; })));
  } else e.respondWith(networkFirst(r));
});
