const CACHE_NAME = "prisma-shell-v118"
const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=ui-20261023-27",
  "./styles/movie-cards.css?v=ui-20261023-27",
  "./styles/dialogs-feedback.css?v=ui-20261023-27",
  "./styles/responsive.css?v=ui-20261023-27",
  "./styles/visual-refinements.css?v=ui-20261023-27",
  "./styles/collection.css?v=ui-20261023-27",
  "./styles/accessibility.css?v=ui-20261023-27",
  "./styles/catalog.css?v=ui-20261023-27",
  "./styles/collection-content.css?v=ui-20261023-27",
  "./styles/movie-details.css?v=ui-20261023-27",
  "./styles/watch-streak.css?v=ui-20261023-27",
  "./styles/prisma-design-system.css?v=ui-20261023-27",

  "./app.js?v=ui-20261023-108",
  "./js/tmdb/client.js?v=core-20261022-3",
  "./js/core/movie-utils.js",
  "./js/core/date-utils.js",
  "./js/core/watch-streak.js",
  "./js/core/storage.js?v=core-20261020-1",
  "./js/core/storage-protection.js",
  "./js/core/state-model.js?v=core-20261022-2",
  "./js/recommendations/features.js?v=rec-20261022-1",
  "./js/recommendations/engine.js?v=rec-20261023-3",
  "./js/recommendations/ridge-evaluation.js?v=rec-20261023-6",
  "./js/recommendations/ridge-alpha-selection.js?v=rec-20261023-1",
  "./js/recommendations/ridge-kernel.js?v=rec-20261023-2",
  "./js/recommendations/repeated-validation-summary.js?v=core-20261021-1",
  "./js/recommendations/evaluation.js?v=rec-20261023-3",
  "./js/recommendations/normalization-evaluation.js?v=rec-20261023-3",
  "./js/diagnostics/lab-diagnostic-coordinator.js?v=diag-20261023-2",
  "./js/recommendations/feature-family-evaluation.js?v=rec-20261023-1",
  "./js/recommendations/paired-ranking-evaluation.js?v=rec-20261023-1",
  "./js/diagnostics/recommendation-report.js?v=core-20261023-3",
  "./js/diagnostics/recommendation-handoff.js?v=diag-20261023-1",
  "./js/catalog/csv-parser.js",
  "./js/catalog/catalog-model.js?v=core-20261022-4",
  "./js/collection/collection-model.js?v=core-20261023-1",
  "./js/ui/presentation-utils.js?v=core-20261022-4",
  "./js/ui/page-views.js?v=core-20261023-11",
  "./js/ui/progress-views.js?v=core-20261023-1",
  "./js/ui/settings-views.js?v=core-20261023-1",
  "./js/ui/catalog-views.js?v=core-20261023-1",
  "./js/ui/collection-views.js?v=core-20261023-1",
  "./js/ui/lab-views.js?v=core-20261023-7",
  "./js/ui/lab-ridge-view.js?v=core-20261023-4",
  "./js/ui/lab-temporal-view.js?v=core-20261023-3",
  "./js/ui/watch-streak-view.js?v=core-20261023-1",
  "./js/ui/theme-controller.js?v=theme-20261020-1",
  "./js/ui/modal-views.js?v=ui-20261023-1",
  "./js/ui/utility-sheet-view.js?v=ui-20261023-1",
  "./js/ui/movie-detail-view.js?v=ui-20261023-1",
  "./js/ui/person-detail-view.js?v=ui-20261023-1",
  "./js/ui/rating-sheet-view.js?v=ui-20261023-1",
  "./js/ui/person-filmography.js?v=core-20261022-1",
  "./js/app/movie-actions.js?v=core-20261022-5",
  "./js/app/lab-actions.js?v=core-20261023-5",
  "./js/app/lab-metrics-actions.js?v=core-20261023-4",
  "./js/app/storage-protection-actions.js?v=core-20261023-1",
  "./js/import-export/actions.js?v=core-20261022-4",
  "./js/app/event-handlers.js?v=core-20261023-2",
  "./js/tmdb/settings-actions.js?v=core-20261020-3",
  "./js/ui/tmdb-views.js?v=core-20261020-1",
  "./js/tmdb/history-sync.js?v=core-20261022-3",
  "./js/tmdb/browser-actions.js?v=core-20261022-3",
  "./js/tmdb/movie-details.js?v=core-20261022-3",
  "./js/ui/modal-controller.js?v=core-20261022-6",
  "./js/recommendations/ranking.js?v=core-20261023-3",
  "./js/recommendations/preferences.js?v=core-20261021-1",
  "./js/app/runtime.js?v=core-20261020-1",
  "./js/app/lifecycle.js?v=core-20261021-2",
  "./js/app/pwa-update.js?v=core-20261021-1",
  "./js/import-export/personal-data.js?v=core-20261022-8",
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
