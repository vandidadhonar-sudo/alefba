/* Service worker — دفترِ الف‌ب */
var CACHE = "alefba-v5";
var SHELL = [
  "./", "index.html", "assets/styles.css", "assets/app.js", "assets/config.js",
  "assets/fonts/vazir-400.woff2", "assets/fonts/vazir-500.woff2",
  "assets/fonts/vazir-700.woff2", "assets/fonts/gulzar-400.woff2",
  "assets/img/favicon.svg", "assets/img/icon-192.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);

  // Supabase (data + media): network-first, fall back to cache
  if (url.hostname.indexOf("supabase.co") > -1) {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match(req); })
    );
    return;
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(req).then(function (cached) {
      return cached || fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      });
    })
  );
});
