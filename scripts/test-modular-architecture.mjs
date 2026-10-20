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
  'js/catalog/catalog-model.js',
  'js/collection/collection-model.js',
  'js/ui/presentation-utils.js',
  'js/ui/page-views.js',
  'js/ui/modal-views.js',
  'js/app/movie-actions.js',
  'js/import-export/actions.js',
  'js/app/event-handlers.js',
  'js/tmdb/settings-actions.js',
  'js/ui/tmdb-views.js',
  'js/tmdb/history-sync.js',
  'js/tmdb/browser-actions.js',
  'js/app/lifecycle.js',
  'js/app/runtime.js',
  'js/recommendations/ranking.js',
  'js/ui/modal-controller.js',
  'js/tmdb/movie-details.js',
  'js/import-export/personal-data.js',
  'js/tmdb/client.js'
];

for (const relative of files) {
  const absolute = resolve(root, relative);
  await access(absolute);
  const source = await readFile(absolute, 'utf8');
  assert.ok(source.trim(), relative + ' no debe estar vacío');
  if (relative !== 'app.js') {
    assert.ok(!/(?<!ctx\.)document\.(?:querySelector|querySelectorAll|addEventListener)/.test(source),
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
assert.ok(!app.includes('function getCollectionItems('));
assert.ok(!app.includes('function buildRatingMetrics('));
assert.ok(!app.includes('function renderHome('));
assert.ok(!app.includes('function renderLibrary('));
assert.ok(!app.includes('function renderApp('));
assert.ok(!app.includes('function renderMovieDetails('));
assert.ok(!app.includes('function renderPersonDetails('));
assert.ok(!app.includes('function renderRatingSheet('));
assert.ok(!app.includes('function renderUtilitySheet('));
assert.ok(app.includes('createModalViews('));
assert.ok(!app.includes('async function saveRating('));
assert.ok(!app.includes('async function toggleWatchlist('));
assert.ok(app.includes('createMovieActions('));
assert.ok(!app.includes('async function importPersonalJSON('));
assert.ok(!app.includes('async function exportBackup('));
assert.ok(app.includes('createImportExportActions('));
assert.ok(!app.includes('document.addEventListener('));
assert.ok(app.includes('registerAppEvents('));
assert.ok(!app.includes('async function saveTMDBCredential('));
assert.ok(app.includes('createTMDBSettingsActions('));
assert.ok(!app.includes('function renderTMDBResults('));
assert.ok(app.includes('createTMDBViews('));
assert.ok(!app.includes('async function enrichRatedHistoryWithTMDB('));
assert.ok(!app.includes('async function loadTMDBPage('));
assert.ok(app.includes('createTMDBHistorySync('));
assert.ok(app.includes('createTMDBBrowserActions('));
assert.ok(!app.includes('async function loadMovieDetail('));
assert.ok(!app.includes('function renderModal('));
assert.ok(!app.includes('function getRecommendations('));
assert.ok(!app.includes('function toast('));
assert.ok(!app.includes('async function init('));
assert.ok(app.includes('createTMDBMovieDetails('));
assert.ok(app.includes('createModalController('));
assert.ok(app.includes('createRecommendationRanking('));
assert.ok(app.includes('createAppRuntime('));
assert.ok(app.includes('createAppLifecycle('));
assert.ok(app.includes('createPageViews('));
assert.ok(app.includes('createPresentationUtils('));
assert.ok(app.includes('createCollectionModel('));
assert.ok(app.includes('createCatalogModel('));
assert.ok(!app.includes('function movieMetadataFromJSON('));
assert.ok(!app.includes('function predictRating('));
assert.ok(!app.includes('async function tmdbRequest('));
assert.ok(!app.includes('function fromTMDB('));
assert.ok(app.includes('createTMDBClient('));
assert.ok(app.includes('createRecommendationEngine('));
assert.ok(app.startsWith('import '));
console.log('Arquitectura modular correcta: ' + files.length + ' módulos, importaciones y exports validados y lógica de dominio separada del DOM.');
