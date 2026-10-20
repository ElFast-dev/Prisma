import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRecommendationEngine } from '../js/recommendations/engine.js';
import { ratingValue } from '../js/core/movie-utils.js';
const [appSource, pageViewsSource] = await Promise.all([
  readFile('app.js', 'utf8'),
  readFile('js/ui/page-views.js', 'utf8')
]);
const uiSource = appSource + '\\n' + pageViewsSource;
const engineSource = await readFile('js/recommendations/engine.js', 'utf8');
function runEvaluation(entries, movieRecords) {
  const calls = [];
  const byId = new Map(movieRecords.filter(movie => movie.tmdbId).map(movie => [String(movie.tmdbId), movie]));
  const byTitle = new Map();
  movieRecords.forEach(movie => {
    const key = String(movie.title).trim().toLocaleLowerCase('es');
    if (!byTitle.has(key)) byTitle.set(key, movie);
  });
  const findMovie = (title, tmdbId) => {
    const id = tmdbId == null || tmdbId === '' ? null : String(tmdbId);
    calls.push({ title, id });
    return id ? (byId.get(id) || null) : (byTitle.get(String(title).trim().toLocaleLowerCase('es')) || null);
  };
  const movieFeatures = (movie, entry) => {
    const candidate = movie || entry;
    return candidate && candidate.genre ? [candidate.genre] : [];
  };
  const engine = createRecommendationEngine({ getRatings: () => entries, findMovie, movieFeatures, ratingValue });
  return { result: engine.evaluateModel(), calls };
}
const records = [
  { title: 'El mismo título', tmdbId: '101', rating: 9, genre: 'drama' },
  { title: 'El mismo título', tmdbId: '202', rating: 2, genre: 'comedia' },
  { title: 'Película C', tmdbId: '303', rating: 8, genre: 'drama' },
  { title: 'Película D', tmdbId: '404', rating: 3, genre: 'comedia' },
  { title: 'Película E', rating: 7, genre: 'misterio' }
];
const evaluated = runEvaluation(records, records);
assert.equal(evaluated.result.available, true);
assert.equal(evaluated.result.count, 5);
assert.ok(Number.isFinite(evaluated.result.mae));
assert.ok(Number.isFinite(evaluated.result.baselineMae));
assert.ok(evaluated.result.mae < evaluated.result.baselineMae,
  'Las características de género deben mejorar la predicción frente a usar solo la media en este escenario sintético');
const validationCalls = evaluated.calls.slice(records.length);
assert.ok(validationCalls.some(call => call.title === 'El mismo título' && call.id === '202'),
  'La validación debe conservar el ID del segundo remake al evaluar la muestra retenida');
assert.ok(validationCalls.some(call => call.title === 'Película E' && call.id == null),
  'Cuando no existe ID TMDB, la validación debe conservar la alternativa por título');
const insufficient = runEvaluation(records.slice(0, 4), records.slice(0, 4)).result;
assert.equal(insufficient.available, false);
assert.equal(insufficient.count, 4);
assert.equal(insufficient.mae, null);
assert.equal(insufficient.baselineMae, null);
assert.equal(insufficient.improvementPct, null);
const perfectBaselineRecords = [
  { title: 'A', tmdbId: '501', rating: 8, genre: 'drama' },
  { title: 'B', tmdbId: '502', rating: 8, genre: 'comedia' },
  { title: 'C', tmdbId: '503', rating: 8, genre: 'misterio' },
  { title: 'D', tmdbId: '504', rating: 8, genre: 'acción' },
  { title: 'E', tmdbId: '505', rating: 8, genre: 'fantasía' }
];
const zeroBaseline = runEvaluation(perfectBaselineRecords, perfectBaselineRecords).result;
assert.equal(zeroBaseline.mae, 0);
assert.equal(zeroBaseline.baselineMae, 0);
assert.equal(zeroBaseline.improvementPct, null);
assert.ok(engineSource.includes('predictRating(movie || heldOut, profile).score'));
assert.ok(uiSource.includes('Referencia (media de entrenamiento): '));
assert.ok(uiSource.includes('Datos insuficientes: se necesitan al menos 5 películas valoradas con características'));
console.log('Pruebas de evaluación correctas: API modular, identidad TMDB, mejora frente a la media, muestra insuficiente y referencia perfecta.');
