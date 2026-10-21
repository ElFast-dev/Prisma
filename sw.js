const CACHE_NAME = "prisma-shell-v82"
const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=ui-20261021-24",
  "./styles/movie-cards.css?v=ui-20261021-24",
  "./styles/dialogs-feedback.css?v=ui-20261021-24",
  "./styles/responsive.css?v=ui-20261021-24",
  "./styles/visual-refinements.css?v=ui-20261021-24",
  "./styles/collection.css?v=ui-20261021-24",
  "./styles/accessibility.css?v=ui-20261021-24",
  "./styles/catalog.css?v=ui-20261021-24",
  "./styles/collection-content.css?v=ui-20261021-24",
  "./styles/movie-details.css?v=ui-20261021-24",
  "./styles/prisma-design-system.css?v=ui-20261021-24",

  "./app.js?v=ui-20261021-72",
  "./js/tmdb/client.js",
  "./js/core/movie-utils.js",
  "./js/core/storage.js?v=core-20261020-1",
  "./js/core/storage-protection.js",
  "./js/core/state-model.js",
  "./js/recommendations/features.js",
  "./js/recommendations/engine.js",
  "./js/recommendations/ridge-evaluation.js?v=core-20261021-7",
  "./js/recommendations/repeated-validation-summary.js?v=core-20261021-1",
  "./js/recommendations/evaluation.js",
  "./js/diagnostics/recommendation-report.js?v=core-20261021-5",
  "./js/catalog/csv-parser.js",
  "./js/catalog/catalog-model.js?v=core-20261021-1",
  "./js/collection/collection-model.js?v=core-20261020-1",
  "./js/ui/presentation-utils.js?v=core-20261020-1",
  "./js/ui/page-views.js?v=core-20261021-14",
  "./js/ui/theme-controller.js?v=theme-20261020-1",
  "./js/ui/modal-views.js?v=core-20261021-3",
  "./js/app/movie-actions.js?v=core-20261021-1",
  "./js/import-export/actions.js?v=core-20261020-1",
  "./js/app/event-handlers.js?v=core-20261021-5",
  "./js/tmdb/settings-actions.js?v=core-20261020-3",
  "./js/ui/tmdb-views.js?v=core-20261020-1",
  "./js/tmdb/history-sync.js?v=core-20261020-1",
  "./js/tmdb/browser-actions.js?v=core-20261021-1",
  "./js/tmdb/movie-details.js?v=core-20261020-1",
  "./js/ui/modal-controller.js?v=core-20261021-4",
  "./js/recommendations/ranking.js?v=core-20261021-3",
  "./js/recommendations/preferences.js?v=core-20261021-1",
  "./js/app/runtime.js?v=core-20261020-1",
  "./js/app/lifecycle.js?v=core-20261021-2",
  "./js/app/pwa-update.js?v=core-20261021-1",
  "./js/import-export/personal-data.js?v=core-20261021-1",
  "./manifest.webmanifest?v=ui-20261020-15",
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
