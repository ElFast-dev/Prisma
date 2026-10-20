import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, serviceWorker, uiWorkflow, app, utils, storage, stateModel, features, engine, csvParser, personalData, tmdbClient] = await Promise.all([
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
  ['js/import-export/personal-data.js', personalData],
  ['js/tmdb/client.js', tmdbClient]
];
const cached = new Set([...serviceWorker.matchAll(/["'](\.\/(?:js\/[^"']+|app\.js\?[^"']+))["']/g)].map(match => match[1]));
for (const [filename, source] of modules) {
  for (const match of source.matchAll(/from\s+["'](\.\/[^"']+)["']/g)) {
    assert.ok(cached.has(match[1]), filename + ': falta en APP_ASSETS el módulo importado ' + match[1]);
  }
}
for (const [filename] of modules.slice(1)) {
  assert.ok(cached.has('./' + filename), 'El service worker debe incluir ' + filename);
}
console.log('Versionado PWA y módulos coherentes: ' + scriptUrl + ' · caché ' + cacheName + ' · ' + modules.length + ' módulos verificados.');
