import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'app.js');
const app = await readFile(entry, 'utf8');
const files = [
  'app.js',
  'js/core/movie-utils.js',
  'js/core/storage.js',
  'js/core/state-model.js',
  'js/recommendations/features.js',
  'js/recommendations/engine.js',
  'js/catalog/csv-parser.js',
  'js/catalog/catalog-model.js?v=core-20261020-1',
  'js/import-export/personal-data.js',
  'js/tmdb/client.js'
];

for (const relative of files) {
  const absolute = resolve(root, relative);
  await access(absolute);
  const source = await readFile(absolute, 'utf8');
  assert.ok(source.trim(), relative + ' no debe estar vacío');
  if (relative !== 'app.js') {
    assert.ok(!/document\.(?:querySelector|querySelectorAll|addEventListener)/.test(source),
      relative + ' no debe acoplar la lógica de dominio al DOM');
  }
  for (const match of source.matchAll(/import\s+\{([^}]+)\}\s+from\s+["'](\.\.?\/[^"']+)["']/g)) {
    const namesSource = match[1];
    const specifier = match[2];
    const targetUrl = new URL(specifier, pathToFileURL(absolute));
    const target = fileURLToPath(targetUrl);
    assert.ok(await access(target).then(() => true).catch(() => false),
      relative + ': no existe el módulo importado ' + specifier);
    const namespace = await import(targetUrl.href);
    const names = namesSource
      .split(',').map(item => item.trim()).filter(Boolean).map(item => item.split(/\s+as\s+/)[0]);
    for (const name of names) {
      assert.ok(Object.prototype.hasOwnProperty.call(namespace, name),
        relative + ': ' + specifier + ' no exporta ' + name);
    }
  }
}
assert.ok(!app.includes('function parseCatalogCSV('));
assert.ok(!app.includes('function combineMovies('));
assert.ok(app.includes('createCatalogModel('));
assert.ok(!app.includes('function movieMetadataFromJSON('));
assert.ok(!app.includes('function predictRating('));
assert.ok(!app.includes('async function tmdbRequest('));
assert.ok(!app.includes('function fromTMDB('));
assert.ok(app.includes('createTMDBClient('));
assert.ok(app.includes('createRecommendationEngine('));
assert.ok(app.startsWith('import '));
console.log('Arquitectura modular correcta: ' + files.length + ' módulos, importaciones y exports validados y lógica de dominio separada del DOM.');
