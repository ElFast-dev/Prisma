import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { posix } from 'node:path';

const [html, serviceWorker, uiWorkflow, app, utils, storage, storageProtection, diagnosticReport, stateModel, features, engine, evaluation, normalizationEvaluation, ridgeEvaluation, repeatedValidationSummary, csvParser, catalogModel, collectionModel, presentationUtils, pageViews, modalViews, movieActions, importExportActions, eventHandlers, tmdbSettings, tmdbViews, tmdbHistorySync, tmdbBrowserActions, tmdbMovieDetails, modalController, ranking, runtime, lifecycle, personalData, tmdbClient, themeController, recommendationPreferences, pwaUpdate, dateUtils, watchStreak, personFilmography] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('sw.js', 'utf8'),
  readFile('.github/workflows/ui-screenshots.yml', 'utf8'),
  readFile('app.js', 'utf8'),
  readFile('js/core/movie-utils.js', 'utf8'),
  readFile('js/core/storage.js', 'utf8'),
  readFile('js/core/storage-protection.js', 'utf8'),
  readFile('js/diagnostics/recommendation-report.js', 'utf8'),
  readFile('js/core/state-model.js', 'utf8'),
  readFile('js/recommendations/features.js', 'utf8'),
  readFile('js/recommendations/engine.js', 'utf8'),
  readFile('js/recommendations/evaluation.js', 'utf8'),
  readFile('js/recommendations/normalization-evaluation.js', 'utf8'),
  readFile('js/recommendations/ridge-evaluation.js', 'utf8'),
  readFile('js/recommendations/repeated-validation-summary.js', 'utf8'),
  readFile('js/catalog/csv-parser.js', 'utf8'),
  readFile('js/catalog/catalog-model.js', 'utf8'),
  readFile('js/collection/collection-model.js', 'utf8'),
  readFile('js/ui/presentation-utils.js', 'utf8'),
  readFile('js/ui/page-views.js', 'utf8'),
  readFile('js/ui/modal-views.js', 'utf8'),
  readFile('js/app/movie-actions.js', 'utf8'),
  readFile('js/import-export/actions.js', 'utf8'),
  readFile('js/app/event-handlers.js', 'utf8'),
  readFile('js/tmdb/settings-actions.js', 'utf8'),
  readFile('js/ui/tmdb-views.js', 'utf8'),
  readFile('js/tmdb/history-sync.js', 'utf8'),
  readFile('js/tmdb/browser-actions.js', 'utf8'),
  readFile('js/tmdb/movie-details.js', 'utf8'),
  readFile('js/ui/modal-controller.js', 'utf8'),
  readFile('js/recommendations/ranking.js', 'utf8'),
  readFile('js/app/runtime.js', 'utf8'),
  readFile('js/app/lifecycle.js', 'utf8'),
  readFile('js/import-export/personal-data.js', 'utf8'),
  readFile('js/tmdb/client.js', 'utf8'),
  readFile('js/ui/theme-controller.js', 'utf8'),
  readFile('js/recommendations/preferences.js', 'utf8'),
  readFile('js/app/pwa-update.js', 'utf8'),
  readFile('js/core/date-utils.js', 'utf8'),
  readFile('js/core/watch-streak.js', 'utf8'),
  readFile('js/ui/person-filmography.js', 'utf8')
]);

function singleMatch(regex, source, label) {
  const matches = [...source.matchAll(regex)];
  assert.equal(matches.length, 1, label + ': se esperaba exactamente una coincidencia, se encontraron ' + matches.length);
  return matches[0];
}

const scriptTag = singleMatch(/<script\b[^>]*\bsrc=["']([^"']*app\.js\?[^"']+)["'][^>]*><\/script>/g, html, 'index.html app.js');
assert.match(scriptTag[0], /type=["']module["']/, 'La entrada debe cargarse como módulo nativo');
const scriptUrl = scriptTag[1];
const swAsset = singleMatch(/["'](\.\/app\.js\?[^"']+)["']/g, serviceWorker, 'APP_ASSETS app.js')[1];
const version = new URL(scriptUrl, 'https://prisma.invalid/').searchParams.get('v');
assert.ok(version, 'index.html: app.js necesita un parámetro de versión explícito');
assert.equal(swAsset, scriptUrl, 'sw.js APP_ASSETS debe usar exactamente la URL versionada de index.html');
const uiAssertion = singleMatch(/lastUI\.appSrc\.includes\(["']([^"']+)["']\)/g, uiWorkflow, 'Playwright app.js version');
assert.equal(uiAssertion[1], 'v=' + version, 'Playwright debe comprobar la misma versión declarada en index.html');
const cacheName = singleMatch(/const CACHE_NAME = ["']([^"']+)["']/g, serviceWorker, 'service worker cache name')[1];
assert.match(cacheName, /^prisma-shell-v\d+$/, 'El nombre de caché debe incluir un número de versión');

const modules = [
  ['app.js', app],
  ['js/core/movie-utils.js', utils],
  ['js/core/storage.js', storage],
  ['js/core/storage-protection.js', storageProtection],
  ['js/diagnostics/recommendation-report.js', diagnosticReport],
  ['js/core/state-model.js', stateModel],
  ['js/recommendations/features.js', features],
  ['js/recommendations/engine.js', engine],
  ['js/recommendations/evaluation.js', evaluation],
  ['js/recommendations/normalization-evaluation.js', normalizationEvaluation],
  ['js/recommendations/ridge-evaluation.js', ridgeEvaluation],
  ['js/recommendations/repeated-validation-summary.js', repeatedValidationSummary],
  ['js/recommendations/preferences.js', recommendationPreferences],
  ['js/catalog/csv-parser.js', csvParser],
  ['js/catalog/catalog-model.js', catalogModel],
  ['js/collection/collection-model.js', collectionModel],
  ['js/ui/presentation-utils.js', presentationUtils],
  ['js/ui/page-views.js', pageViews],
  ['js/ui/modal-views.js', modalViews],
  ['js/app/movie-actions.js', movieActions],
  ['js/import-export/actions.js', importExportActions],
  ['js/app/event-handlers.js', eventHandlers],
  ['js/tmdb/settings-actions.js', tmdbSettings],
  ['js/ui/tmdb-views.js', tmdbViews],
  ['js/tmdb/history-sync.js', tmdbHistorySync],
  ['js/tmdb/browser-actions.js', tmdbBrowserActions],
  ['js/tmdb/movie-details.js', tmdbMovieDetails],
  ['js/ui/modal-controller.js', modalController],
  ['js/recommendations/ranking.js', ranking],
  ['js/app/runtime.js', runtime],
  ['js/app/lifecycle.js', lifecycle],
  ['js/app/pwa-update.js', pwaUpdate],
  ['js/import-export/personal-data.js', personalData],
  ['js/tmdb/client.js', tmdbClient],
  ['js/ui/theme-controller.js', themeController],
  ['js/core/date-utils.js', dateUtils],
  ['js/core/watch-streak.js', watchStreak],
  ['js/ui/person-filmography.js', personFilmography]
];
const cached = new Set([...serviceWorker.matchAll(/["'](\.\/(?:js\/[^"']+|app\.js\?[^"']+))["']/g)].map(match => match[1]));
assert.ok(cached.has("./js/recommendations/features.js?v=rec-20261022-1"),
  "El extractor ampliado de características debe tener una URL versionada en caché.");
assert.ok(cached.has("./js/recommendations/engine.js?v=rec-20261022-1"),
  "El motor de recomendación actualizado debe estar versionado.");
assert.ok(cached.has("./js/core/movie-utils.js"),
  "El normalizador compartido debe estar disponible en la caché PWA renovada.");
assert.ok(cached.has("./js/tmdb/client.js?v=core-20261022-3"),
  "El cliente TMDB ampliado debe estar versionado.");
assert.ok(cached.has("./js/tmdb/movie-details.js?v=core-20261022-3"),
  "Los detalles de película deben guardar los marcadores de créditos y keywords.");
assert.ok(cached.has("./js/catalog/catalog-model.js?v=core-20261022-4"),
  "El catálogo debe fusionar las nuevas familias de metadatos.");
assert.ok(cached.has("./js/collection/collection-model.js?v=core-20261022-5"),
  "El modelo de colección debe usar la identidad contextual y filtrar fechas automáticas.");
assert.ok(cached.has("./js/import-export/personal-data.js?v=core-20261022-7"),
  "La importación de datos personales debe usar la nueva reconciliación de identidades.");
assert.ok(cached.has("./js/ui/tmdb-views.js?v=core-20261022-2"),
  "El filtrado de resultados TMDB debe pasar el año al comprobar la colección.");
assert.ok(cached.has("./js/tmdb/history-sync.js?v=core-20261022-3"),
  "La sincronización del historial debe utilizar metadatos enriquecidos.");
assert.ok(cached.has("./js/tmdb/browser-actions.js?v=core-20261022-3"),
  "El enriquecimiento temporal de candidatas debe estar versionado.");
assert.ok(cached.has("./js/app/movie-actions.js?v=core-20261022-6"),
  "El registro de notas sin emociones debe estar versionado.");
assert.ok(cached.has("./js/recommendations/ridge-evaluation.js?v=core-20261022-9"),
  "El módulo Ridge debe quedar versionado y disponible en la caché de la aplicación.");
assert.ok(cached.has("./js/recommendations/repeated-validation-summary.js?v=core-20261021-1"),
  "El resumen de consistencia por repetición debe quedar disponible en la caché.");
assert.ok(cached.has("./js/ui/page-views.js?v=core-20261022-21"),
  "La vista del Laboratorio debe quedar versionada en la caché.");
assert.ok(cached.has("./js/recommendations/ranking.js?v=core-20261022-5"),
  "El ranking debe usar búsqueda de perfil con identidad y año fiables.");
assert.ok(cached.has("./js/core/state-model.js?v=core-20261022-2"),
  "El modelo de estado debe quedar versionado al añadir la racha confirmada.");
assert.ok(cached.has("./js/core/watch-streak.js"),
  "La lógica de racha confirmada debe quedar disponible en la caché.");
assert.ok(cached.has("./js/diagnostics/recommendation-report.js?v=core-20261022-2"),
  "El informe de diagnóstico v11 debe quedar versionado y disponible en la caché de la aplicación.");
assert.ok(cached.has("./js/recommendations/normalization-evaluation.js"),
  "El evaluador experimental de normalización debe quedar disponible en la caché de la aplicación.");
assert.ok(cached.has("./js/app/event-handlers.js?v=core-20261022-8"),
  "El manejador de acciones corregido debe quedar versionado en la caché de la aplicación.");
assert.ok(cached.has("./js/ui/modal-views.js?v=core-20261022-9"),
  "La vista del modal debe quedar versionada al corregir las fechas de visionado.");
assert.ok(cached.has("./js/ui/person-filmography.js?v=core-20261022-1"),
  "El helper de filmografía debe quedar versionado y precargado en la caché.");
assert.ok(cached.has("./js/ui/presentation-utils.js?v=core-20261022-4"),
  "El formateador de fechas explícitas debe quedar versionado en la caché.");
const actionsImportUrl = singleMatch(/from\s+["\'](\.\/js\/import-export\/actions\.js\?[^"\']+)["\']/g, app, "módulo de importación y exportación")[1];
assert.equal(actionsImportUrl, "./js/import-export/actions.js?v=core-20261022-4",
  "La reconciliación del historial debe invalidar la URL de módulo obsoleta.");
assert.ok(cached.has(actionsImportUrl),
  "El service worker debe precargar la misma URL versionada de actions.js que usa app.js.");
assert.ok(!cached.has("./js/import-export/actions.js?v=core-20261020-1"),
  "La caché PWA no debe conservar la URL antigua del módulo de importación.");
assert.ok(cached.has("./js/ui/modal-controller.js?v=core-20261022-6"),
  "El controlador del modal debe quedar versionado tras corregir su función de renderizado local.");
for (const [filename, source] of modules) {
  for (const match of source.matchAll(/from\s+["'](\.\/[^"']+)["']/g)) {
    const resolvedPath = './' + posix.normalize(posix.join(posix.dirname(filename), match[1])).replace(/^\.\//, '');
    assert.ok(cached.has(resolvedPath), filename + ': falta en APP_ASSETS el módulo importado ' + resolvedPath);
  }
}
for (const [filename] of modules.slice(1)) {
  assert.ok([...cached].some(asset => asset.split('?')[0] === './' + filename),
    'El service worker debe incluir ' + filename + ' aunque use una URL versionada');
}
assert.match(ridgeEvaluation, /evaluateTemporalAsync/,
  "El experimento Ridge debe exportar la evaluación temporal bajo demanda.");
assert.match(app, /runTemporalRidgeExperiment/);
assert.match(diagnosticReport, /temporalRidgeExperiment/);
assert.match(diagnosticReport, /influenceNormalizationExperiment/);
assert.match(app, /runInfluenceNormalizationExperiment/);
console.log('Versionado PWA, módulos y experimento temporal con procedencia coherentes: ' + scriptUrl + ' · caché ' + cacheName + ' · ' + modules.length + ' módulos verificados.');
