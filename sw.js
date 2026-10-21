const CACHE_NAME = "prisma-shell-v54"
const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=ui-20261021-22",
  "./styles/movie-cards.css?v=ui-20261021-22",
  "./styles/dialogs-feedback.css?v=ui-20261021-22",
  "./styles/responsive.css?v=ui-20261021-22",
  "./styles/visual-refinements.css?v=ui-20261021-22",
  "./styles/collection.css?v=ui-20261021-22",
  "./styles/accessibility.css?v=ui-20261021-22",
  "./styles/catalog.css?v=ui-20261021-22",
  "./styles/collection-content.css?v=ui-20261021-22",
  "./styles/movie-details.css?v=ui-20261021-22",
  "./styles/prisma-design-system.css?v=ui-20261021-22",

  "./app.js?v=ui-20261021-46",
  "./js/tmdb/client.js",
  "./js/core/movie-utils.js",
  "./js/core/storage.js?v=core-20261020-1",
  "./js/core/state-model.js",
  "./js/recommendations/features.js",
  "./js/recommendations/engine.js",
  "./js/catalog/csv-parser.js",
  "./js/catalog/catalog-model.js?v=core-20261020-1",
  "./js/collection/collection-model.js?v=core-20261020-1",
  "./js/ui/presentation-utils.js?v=core-20261020-1",
  "./js/ui/page-views.js?v=core-20261021-2",
  "./js/ui/theme-controller.js?v=theme-20261020-1",
  "./js/ui/modal-views.js?v=core-20261020-1",
  "./js/app/movie-actions.js?v=core-20261020-1",
  "./js/import-export/actions.js?v=core-20261020-1",
  "./js/app/event-handlers.js?v=core-20261021-2",
  "./js/tmdb/settings-actions.js?v=core-20261020-3",
  "./js/ui/tmdb-views.js?v=core-20261020-1",
  "./js/tmdb/history-sync.js?v=core-20261020-1",
  "./js/tmdb/browser-actions.js?v=core-20261020-1",
  "./js/tmdb/movie-details.js?v=core-20261020-1",
  "./js/ui/modal-controller.js?v=core-20261020-1",
  "./js/recommendations/ranking.js?v=core-20261021-2",
  "./js/recommendations/preferences.js?v=core-20261021-1",
  "./js/app/runtime.js?v=core-20261020-1",
  "./js/app/lifecycle.js?v=core-20261020-1",
  "./js/import-export/personal-data.js",
  "./manifest.webmanifest?v=ui-20261020-15",
  "./data/catalog.json",
  "./assets/prisma.svg?v=brand-20261020-2"
];
self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    return cache.addAll(APP_ASSETS);
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key.indexOf("prisma-shell-") === 0 && key !== CACHE_NAME; }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(function (response) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put("./index.html", copy); });
      return response;
    }).catch(function () { return caches.match("./index.html"); }));
    return;
  }
  event.respondWith(caches.match(event.request).then(function (cached) {
    if (cached) return cached;
    return fetch(event.request).then(function (response) {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
      }
      return response;
    });
  }));
});
