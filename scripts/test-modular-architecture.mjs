import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'js/core/movie-utils.js',
  'js/core/storage.js',
  'js/core/state-model.js',
  'js/recommendations/features.js',
  'js/recommendations/engine.js',
  'js/catalog/csv-parser.js',
  'js/import-export/personal-data.js',
  'js/tmdb/client.js'
];
const app = await readFile(resolve(root, 'app.js'), 'utf8');
for (const file of files) {
  const absolute = resolve(root, file);
  await access(absolute);
  const source = await readFile(absolute, 'utf8');
  assert.ok(source.trim(), file + ' no debe estar vacío');
  assert.ok(!/document\.(?:querySelector|querySelectorAll|addEventListener)/.test(source),
    file + ' no debe acoplar la lógica de dominio al DOM');
  for (const match of source.matchAll(/from\s+["'](\.{1,2}\/[^"']+)["']/g)) {
    const dependency = resolve(dirname(absolute), match[1]);
    assert.ok(await access(dependency).then(() => true).catch(() => false),
      file + ': no existe el módulo importado ' + match[1]);
  }
}
assert.ok(!app.includes('function parseCatalogCSV('));
assert.ok(!app.includes('function movieMetadataFromJSON('));
assert.ok(!app.includes('function predictRating('));
assert.ok(!app.includes('async function tmdbRequest('));
assert.ok(!app.includes('function fromTMDB('));
assert.ok(app.includes('createTMDBClient('));
assert.ok(app.includes('createRecommendationEngine('));
assert.ok(app.startsWith('import '));
console.log('Arquitectura modular correcta: ' + files.length + ' módulos presentes, dependencias explícitas y lógica de dominio separada del DOM.');
