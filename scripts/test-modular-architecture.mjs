import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createTMDBMovieDetails } from '../js/tmdb/movie-details.js';
import { createLabActions } from '../js/app/lab-actions.js';
import { createCatalogViews } from '../js/ui/catalog-views.js';
import { createCollectionViews } from '../js/ui/collection-views.js';
import { createSettingsViews } from '../js/ui/settings-views.js';
import { createProgressViews } from '../js/ui/progress-views.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = resolve(root, 'app.js');
const app = await readFile(entry, 'utf8');
const files = [
  'app.js',
  'js/core/movie-utils.js',
  'js/core/storage.js',
  'js/core/storage-protection.js',
  'js/diagnostics/recommendation-report.js',
  'js/core/state-model.js',
  'js/recommendations/features.js',
  'js/recommendations/engine.js',
  'js/recommendations/ridge-evaluation.js',
  'js/recommendations/ridge-kernel.js',
  'js/recommendations/evaluation.js',
  'js/recommendations/normalization-evaluation.js',
  'js/recommendations/preferences.js',
  'js/catalog/csv-parser.js',
  'js/catalog/catalog-model.js',
  'js/collection/collection-model.js',
  'js/ui/presentation-utils.js',
  'js/ui/page-views.js',
  'js/ui/progress-views.js',
  'js/ui/settings-views.js',
  'js/ui/catalog-views.js',
  'js/ui/collection-views.js',
  'js/ui/lab-views.js',
  'js/ui/lab-ridge-view.js',
  'js/ui/lab-temporal-view.js',
  'js/ui/watch-streak-view.js',
  'js/ui/theme-controller.js',
  'js/ui/modal-views.js',
  'js/ui/utility-sheet-view.js',
  'js/ui/movie-detail-view.js',
  'js/ui/person-detail-view.js',
  'js/ui/rating-sheet-view.js',
  'js/ui/person-filmography.js',
  'js/app/movie-actions.js',
  'js/app/lab-actions.js',
  'js/import-export/actions.js',
  'js/app/event-handlers.js',
  'js/tmdb/settings-actions.js',
  'js/ui/tmdb-views.js',
  'js/tmdb/history-sync.js',
  'js/tmdb/browser-actions.js',
  'js/app/lifecycle.js',
  'js/app/pwa-update.js',
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
const [modalSplitFacadeSource, utilitySheetSplitSource, movieDetailSplitSource, personDetailSplitSource, ratingSheetSplitSource] = await Promise.all([
  readFile('js/ui/modal-views.js', 'utf8'),
  readFile('js/ui/utility-sheet-view.js', 'utf8'),
  readFile('js/ui/movie-detail-view.js', 'utf8'),
  readFile('js/ui/person-detail-view.js', 'utf8'),
  readFile('js/ui/rating-sheet-view.js', 'utf8')
]);
assert.doesNotMatch(modalSplitFacadeSource, /function render(?:UtilitySheet|MovieDetails|PersonDetails|RatingSheet)\(/,
  'La fachada modal no debe volver a concentrar los renderizadores concretos.');
assert.match(modalSplitFacadeSource, /createUtilitySheetView\(ctx\)/);
assert.match(modalSplitFacadeSource, /createMovieDetailView\(ctx\)/);
assert.match(modalSplitFacadeSource, /createPersonDetailView\(ctx\)/);
assert.match(modalSplitFacadeSource, /createRatingSheetView\(ctx\)/);
assert.match(utilitySheetSplitSource, /export function createUtilitySheetView\(ctx\)/);
assert.match(movieDetailSplitSource, /export function createMovieDetailView\(ctx\)/);
assert.match(personDetailSplitSource, /export function createPersonDetailView\(ctx\)/);
assert.match(ratingSheetSplitSource, /export function createRatingSheetView\(ctx\)/);
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
assert.ok(!app.includes('function updateRatingPreview('));
assert.ok(!app.includes('function closeModal('));
assert.ok(!app.includes('function getRecommendations('));
assert.ok(!app.includes('function toast('));
assert.ok(!app.includes('async function init('));
assert.ok(app.includes('createTMDBMovieDetails('));
assert.ok(app.includes('createModalController('));
assert.ok(app.includes('createRecommendationRanking('));
assert.ok(app.includes('createAppRuntime('));
assert.ok(app.includes('createAppLifecycle('));
const [pageViewsSource, progressViewsSource, settingsViewsSource, catalogViewsSource, collectionViewsSource, labViewsSource, labRidgeViewSource, labTemporalViewSource] = await Promise.all([
  readFile('js/ui/page-views.js', 'utf8'),
  readFile('js/ui/progress-views.js', 'utf8'),
  readFile('js/ui/settings-views.js', 'utf8'),
  readFile('js/ui/catalog-views.js', 'utf8'),
  readFile('js/ui/collection-views.js', 'utf8'),
  readFile('js/ui/lab-views.js', 'utf8'),
  readFile('js/ui/lab-ridge-view.js', 'utf8'),
  readFile('js/ui/lab-temporal-view.js', 'utf8')
]);
assert.match(pageViewsSource, /createProgressViews\(ctx, renderConfirmedWatchStreakPanel\)/,
  'La composición general debe delegar Progreso al módulo especializado.');
assert.doesNotMatch(pageViewsSource, /function renderHome\(/,
  'El renderizador de Progreso no debe seguir concentrado en page-views.js.');
assert.match(progressViewsSource, /export function createProgressViews\(ctx, renderConfirmedWatchStreakPanel\)/,
  'Progreso debe exponer una fábrica de vistas con su dependencia de racha inyectada.');
const progressFixture = {
  state: { events: [], watchlist: [] },
  summaryStats() { return { total: 0, average: null }; },
  getCollectionItems() { return []; },
  dateScore() { return 0; },
  genreStats() { return []; },
  escapeHTML(value) { return String(value == null ? '' : value); },
  formatDate() { return '20/10/2026'; },
  infoButton() { return ''; },
  metric(label, value) { return '<span class="metric">' + label + ':' + value + '</span>'; },
  displayGenre(value) { return String(value); },
  barRow() { return ''; }
};
const progressViews = createProgressViews(progressFixture, () => '<section class="streak-test"></section>');
const progressMarkup = progressViews.renderHome();
assert.match(progressMarkup, /<h1>Progreso<\/h1>/);
assert.match(progressMarkup, /Empieza a construir tu perfil/);
assert.match(progressMarkup, /class="streak-test"/,
  'La vista de Progreso debe incluir el renderizador de racha recibido por inyección.');
assert.match(progressMarkup, /Sin actividad reciente/);

assert.match(pageViewsSource, /createSettingsViews\(ctx\)/,
  'La composición general debe delegar Ajustes y Datos al módulo especializado.');
assert.doesNotMatch(pageViewsSource, /function (?:renderAppearanceSettings|renderTMDBSettings|formatStorageBytes|renderStorageProtectionSettings|renderData)\(/,
  'Los renderizadores de Ajustes no deben volver a concentrarse en page-views.js.');
assert.match(settingsViewsSource, /export function createSettingsViews\(ctx\)/,
  'Ajustes debe exponer una fábrica de vistas con contexto inyectado.');
assert.match(settingsViewsSource, /data-action="protect-storage"/,
  'La vista de protección del almacenamiento debe conservar su acción explícita.');
const settingsFixture = {
  theme: 'dark',
  tmdbCredential: null,
  storageProtectionSnapshot: { supported: true, persisted: false, usage: 2048, quota: 1048576 },
  storageProtectionBusy: false,
  state: { updatedAt: '2026-10-20T12:00:00.000Z' },
  summaryStats() { return { total: 0, matched: 0 }; },
  infoButton() { return ''; },
  escapeHTML(value) { return String(value == null ? '' : value); },
  formatDate() { return '20/10/2026'; },
  renderTMDBHistoryPanel() { return '<div></div>'; }
};
const settingsViews = createSettingsViews(settingsFixture);
assert.equal(typeof settingsViews.renderTMDBSettings, 'function');
assert.equal(typeof settingsViews.renderData, 'function');
const settingsMarkup = settingsViews.renderData();
assert.match(settingsMarkup, /Apariencia/);
assert.match(settingsMarkup, /Importar historial JSON/);
assert.match(settingsMarkup, /Protección de datos locales/);

assert.match(pageViewsSource, /createCatalogViews\(ctx\)/,
  'La composición general debe delegar Descubrir y catálogo a su módulo especializado.');
assert.doesNotMatch(pageViewsSource, /function (?:movieCard|movieGrid|filterCatalog|renderCatalogResults|renderCatalog)\(/,
  'Los renderizadores de catálogo no deben volver a concentrarse en page-views.js.');
assert.match(catalogViewsSource, /export function createCatalogViews\(ctx\)/,
  'El catálogo debe exponer una fábrica de vistas con contexto inyectado.');
assert.match(catalogViewsSource, /data-action="recommendation-mode"/,
  'La vista de catálogo debe conservar el selector de modos de recomendación.');

const catalogFixture = {
  catalogQuery: '',
  catalog: [
    { title: 'Drama incluido', genres: ['Drama'], tags: [], year: 2020, tmdbId: '990001' },
    { title: 'Drama visto', genres: ['Drama'], tags: [], year: 2021, tmdbId: '990002' }
  ],
  activeGenre: 'Todos',
  titleKey(value) { return String(value == null ? '' : value).toLowerCase(); },
  uniqueDiscoveryMovies(items) { return items; },
  isInHistory(title) { return title === 'Drama visto'; },
  isHidden() { return false; }
};
const catalogViews = createCatalogViews(catalogFixture);
assert.deepEqual(catalogViews.filterCatalog().map(movie => movie.title), ['Drama incluido'],
  'Descubrir debe seguir excluyendo películas ya vistas después de aislar el renderizador.');

assert.match(pageViewsSource, /createCollectionViews\(ctx\)/,
  'La composición general debe delegar Colección a su módulo especializado.');
assert.doesNotMatch(pageViewsSource, /function (?:renderCollectionContent|renderLibrary|collectionRow|collectionCompactCard)\(/,
  'Los renderizadores de Colección no deben volver a concentrarse en page-views.js.');
assert.match(collectionViewsSource, /export function createCollectionViews\(ctx\)/,
  'El módulo de Colección debe exponer una fábrica con dependencias inyectadas.');
assert.match(collectionViewsSource, /function renderCollectionContent\(/);
assert.match(collectionViewsSource, /function renderLibrary\(/);

assert.match(pageViewsSource, /createLabViews\(ctx\)/,
  'La composición general debe delegar los renderizadores de Laboratorio al módulo especializado.');
assert.doesNotMatch(pageViewsSource, /function render(?:RecommendationDiagnosticPanel|RidgeExperimentPanel|InfluenceNormalizationPanel|TemporalRidgePanel|Lab)\(/,
  'Los renderizadores del Laboratorio no deben volver a concentrarse en page-views.js.');
assert.match(labViewsSource, /export function createLabViews\(ctx\)/,
  'El módulo de Laboratorio debe exponer su fábrica con dependencias inyectadas.');
assert.match(labViewsSource, /createLabRidgeView\(ctx\)/,
  'La composición del Laboratorio debe delegar Ridge a su submódulo.');
assert.match(labViewsSource, /createLabTemporalView\(ctx\)/,
  'La composición del Laboratorio debe delegar la evaluación temporal a su submódulo.');
assert.doesNotMatch(labViewsSource, /function render(?:RidgeExperimentPanel|TemporalRidgePanel)\(/,
  'Los renderizadores Ridge y temporal no deben concentrarse en lab-views.js.');
assert.match(labRidgeViewSource, /export function createLabRidgeView\(ctx\)/);
assert.match(labRidgeViewSource, /function renderRidgeExperimentPanel\(/);
assert.match(labTemporalViewSource, /export function createLabTemporalView\(ctx\)/);
assert.match(labTemporalViewSource, /function renderTemporalRidgePanel\(/);

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
const movieDetailsApi = createTMDBMovieDetails({});
assert.equal(typeof movieDetailsApi.loadMovieDetail, 'function');
assert.equal(typeof movieDetailsApi.persistMovieMetadata, 'function');
assert.equal(typeof movieDetailsApi.openPersonDetails, 'function');
assert.ok(!app.includes('persistMovieMetadata, mergeMatching, openPersonDetails'));
const collectionFixture = {
  collectionMode: 'lists',
  collectionTab: 'history',
  getCollectionItems(tab) {
    return { history: [{ title: 'Una película' }], pending: [], hidden: [{ title: 'Otra película' }] }[tab] || [];
  }
};
const collectionViews = createCollectionViews(collectionFixture);
assert.equal(typeof collectionViews.renderLibrary, 'function');
assert.equal(typeof collectionViews.refreshCollectionContent, 'function');
const listsMarkup = collectionViews.renderLibrary();
assert.match(listsMarkup, /Historial/);
assert.match(listsMarkup, /Pendientes/);
assert.match(listsMarkup, /Ocultos/);
assert.match(listsMarkup, /data-action="collection-open-tab"/,
  'El módulo debe conservar las acciones de las listas de Colección.');

const [ridgeKernelSource, ridgeEvaluationSource] = await Promise.all([
  readFile('js/recommendations/ridge-kernel.js', 'utf8'),
  readFile('js/recommendations/ridge-evaluation.js', 'utf8')
]);
assert.match(ridgeKernelSource, /export function buildKernel\(/,
  'El kernel numérico debe exponer el cálculo de similitud.');
assert.match(ridgeKernelSource, /export function trainRidge\(/,
  'El kernel numérico debe exponer el entrenamiento Ridge.');
assert.match(ridgeKernelSource, /export function predictRidge\(/,
  'El kernel numérico debe exponer la predicción Ridge.');
assert.doesNotMatch(ridgeKernelSource, /\b(?:document|window|localStorage|indexedDB|fetch|XMLHttpRequest)\b/,
  'El kernel numérico debe permanecer aislado de DOM, almacenamiento y red.');
assert.doesNotMatch(ridgeEvaluationSource, /function (?:buildKernel|solveCholesky|trainRidge|predictRidge)\(/,
  'El módulo de evaluación no debe volver a contener las rutinas numéricas extraídas.');

const labActionsSource = await readFile('js/app/lab-actions.js', 'utf8');
assert.equal(typeof createLabActions, 'function');
assert.ok(labActionsSource.includes('export function createLabActions(ctx)'));
assert.ok(app.includes('createLabActions('));
assert.ok(app.includes('labActions.runRidgeExperiment()'));
assert.ok(app.startsWith('import '));
console.log('Arquitectura modular correcta: ' + files.length + ' módulos, importaciones y exports validados y lógica de dominio separada del DOM.');
