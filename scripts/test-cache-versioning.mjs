import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, serviceWorker, uiWorkflow] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('sw.js', 'utf8'),
  readFile('.github/workflows/ui-screenshots.yml', 'utf8')
]);

function singleMatch(regex, source, label) {
  const matches = [...source.matchAll(regex)];
  assert.equal(matches.length, 1, label + ': se esperaba exactamente una coincidencia, se encontraron ' + matches.length);
  return matches[0];
}

const scriptTag = singleMatch(/<script\b[^>]*\bsrc=["']([^"']*app\.js\?[^"']+)["'][^>]*><\/script>/g, html, 'index.html app.js');
const scriptUrl = scriptTag[1];
const swAsset = singleMatch(/["'](\.\/app\.js\?[^"']+)["']/g, serviceWorker, 'APP_ASSETS app.js')[1];
const version = new URL(scriptUrl, 'https://prisma.invalid/').searchParams.get('v');
assert.ok(version, 'index.html: app.js necesita un parámetro de versión explícito');
assert.equal(swAsset, scriptUrl, 'sw.js APP_ASSETS debe usar exactamente la URL versionada de index.html');

const uiAssertion = singleMatch(/lastUI\.appSrc\.includes\(["']([^"']+)["']\)/g, uiWorkflow, 'Playwright app.js version');
assert.equal(uiAssertion[1], 'v=' + version, 'La verificación Playwright debe comprobar la misma versión declarada en index.html');

const cacheName = singleMatch(/const CACHE_NAME = ["']([^"']+)["']/g, serviceWorker, 'service worker cache name')[1];
assert.match(cacheName, /^prisma-shell-v\d+$/, 'El nombre de caché debe incluir un número de versión');
console.log('Versionado PWA coherente: ' + scriptUrl + ' · caché ' + cacheName + '.');
