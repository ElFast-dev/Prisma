import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { posix } from 'node:path';

const [html, serviceWorker, uiWorkflow, app, utils, storage, stateModel, features, engine, csvParser, catalogModel, collectionModel, presentationUtils, pageViews, modalViews, movieActions, importExportActions, eventHandlers, tmdbSettings, tmdbViews, tmdbHistorySync, tmdbBrowserActions, tmdbMovieDetails, modalController, ranking, runtime, lifecycle, personalData, tmdbClient] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('sw.js', 'utf8'),
  readFile('.github/workflows/ui-screenshots.yml', 'utf8'),
  readFile('app.js', 'utf8'),
  readFile('js/core/movie-utils.js', 'utf8'),
  readFile('js/core/storage.js', 'utf8'),
  readFile('js/core/state-model.js', 'utf8'),
  readFile('js/recommendations/features.js', 'utf8'),
  readFile('js/recommendations/engine.js', 'utf8'),
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
  readFile('js/tmdb/client.js', 'utf8')
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
  ['js/core/state-model.js', stateModel],
  ['js/recommendations/features.js', features],
  ['js/recommendations/engine.js', engine],
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
  ['js/import-export/personal-data.js', personalData],
  ['js/tmdb/client.js', tmdbClient]
];
const cached = new Set([...serviceWorker.matchAll(/["'](\.\/(?:js\/[^"']+|app\.js\?[^"']+))["']/g)].map(match => match[1]));
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
console.log('Versionado PWA y módulos coherentes: ' + scriptUrl + ' · caché ' + cacheName + ' · ' + modules.length + ' módulos verificados.');
