import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('app.js', 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'No se pudo localizar: ' + startMarker);
  return source.slice(start, end);
}

const evaluationSource = section('  function evaluateModel() {', '  function genreStats() {');

function runEvaluation(entries, movieRecords) {
  const calls = [];
  const byId = new Map(movieRecords.filter(movie => movie.tmdbId).map(movie => [String(movie.tmdbId), movie]));
  const byTitle = new Map();
  movieRecords.forEach(movie => {
    const key = String(movie.title).trim().toLocaleLowerCase('es');
    if (!byTitle.has(key)) byTitle.set(key, movie);
  });

  function findMovie(title, tmdbId) {
    const id = tmdbId == null || tmdbId === '' ? null : String(tmdbId);
    calls.push({ title, id });
    return id ? (byId.get(id) || null) : (byTitle.get(String(title).trim().toLocaleLowerCase('es')) || null);
  }
  function ratingValue(entry) {
    const rating = Number(entry && entry.rating);
    return Number.isFinite(rating) && rating >= 1 && rating <= 10 ? rating : null;
  }
  function movieFeatures(movie, entry) {
    const candidate = movie || entry;
    return candidate && candidate.genre ? [candidate.genre] : [];
  }
  function buildProfile(trainingRatings) {
    const ratings = trainingRatings.map(ratingValue).filter(value => value != null);
    return {
      average: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : 6.5,
      features: new Map(),
      count: ratings.length,
      withMetadata: ratings.length
    };
  }
  function predictRating(movie) {
    return { score: movie.expectedPrediction };
  }

  const state = { rated: entries };
  const evaluate = new Function(
    'state', 'findMovie', 'ratingValue', 'movieFeatures', 'buildProfile', 'predictRating',
    evaluationSource + '\nreturn evaluateModel;'
  )(state, findMovie, ratingValue, movieFeatures, buildProfile, predictRating);
  return { result: evaluate(), calls };
}

const records = [
  { title: 'El mismo título', tmdbId: '101', rating: 9, genre: 'drama', expectedPrediction: 9 },
  { title: 'El mismo título', tmdbId: '202', rating: 2, genre: 'comedia', expectedPrediction: 2 },
  { title: 'Película C', tmdbId: '303', rating: 8, genre: 'misterio', expectedPrediction: 8 },
  { title: 'Película D', tmdbId: '404', rating: 3, genre: 'acción', expectedPrediction: 3 },
  { title: 'Película E', rating: 7, genre: 'fantasía', expectedPrediction: 7 }
];
const evaluated = runEvaluation(records, records);
assert.equal(evaluated.result.available, true);
assert.equal(evaluated.result.count, 5);
assert.equal(evaluated.result.mae, 0, 'Cada remake debe probarse contra su propio registro de TMDB');
assert.ok(evaluated.result.baselineMae > 0, 'La referencia debe medir el error de la media de entrenamiento');
assert.equal(evaluated.result.improvementPct, 100, 'Una predicción perfecta mejora la referencia con MAE positivo');
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
  { title: 'A', tmdbId: '501', rating: 8, genre: 'drama', expectedPrediction: 8 },
  { title: 'B', tmdbId: '502', rating: 8, genre: 'comedia', expectedPrediction: 8 },
  { title: 'C', tmdbId: '503', rating: 8, genre: 'misterio', expectedPrediction: 8 },
  { title: 'D', tmdbId: '504', rating: 8, genre: 'acción', expectedPrediction: 8 },
  { title: 'E', tmdbId: '505', rating: 8, genre: 'fantasía', expectedPrediction: 8 }
];
const zeroBaseline = runEvaluation(perfectBaselineRecords, perfectBaselineRecords).result;
assert.equal(zeroBaseline.mae, 0);
assert.equal(zeroBaseline.baselineMae, 0);
assert.equal(zeroBaseline.improvementPct, null, 'Una referencia con MAE cero no permite calcular mejora porcentual');

assert.ok(source.includes('Referencia (media de entrenamiento): '), 'El laboratorio debe etiquetar la métrica de referencia');
assert.ok(source.includes('Datos insuficientes: se necesitan al menos 5 películas valoradas con características'),
  'El laboratorio debe explicar el umbral de muestra mínima');
console.log('Pruebas de evaluación correctas: identidad TMDB, comparación MAE/base, muestra insuficiente y referencia perfecta.');
