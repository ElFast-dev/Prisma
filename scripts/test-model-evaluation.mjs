import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRecommendationEngine } from '../js/recommendations/engine.js';
import { ratingValue } from '../js/core/movie-utils.js';

const [appSource, pageViewsSource, labViewsBaseSource, labRidgeViewSource, labTemporalViewSource] = await Promise.all([
  readFile('app.js', 'utf8'),
  readFile('js/ui/page-views.js', 'utf8'),
  readFile('js/ui/lab-views.js', 'utf8'),
  readFile('js/ui/lab-ridge-view.js', 'utf8'),
  readFile('js/ui/lab-temporal-view.js', 'utf8')
]);
const uiSource = [appSource, pageViewsSource, labViewsBaseSource, labRidgeViewSource, labTemporalViewSource].join('\\n');
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
  const movieFeatures = (movie, entry, options) => {
    const candidate = movie || entry;
    const features = candidate && candidate.genre ? ['género: ' + String(candidate.genre).toLowerCase()] : [];
    (candidate && Array.isArray(candidate.tags) ? candidate.tags : []).forEach(tag => {
      features.push('tema: ' + String(tag).toLowerCase());
    });
    const year = Number(candidate && candidate.year);
    if ((!options || options.includeDecade !== false) && Number.isInteger(year) && year >= 1888 && year <= 2100) {
      features.push('década: ' + String(Math.floor(year / 10) * 10));
    }
    return features;
  };
  const engine = createRecommendationEngine({ getRatings: () => entries, findMovie, movieFeatures, ratingValue });
  return { result: engine.evaluateModel(), calls, engine };
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
assert.equal(evaluated.result.decadeExamples, 0);
assert.equal(evaluated.result.decadeImprovement, null,
  'Sin fechas, la ablación no debe presentarse como una medición válida de la década.');
assert.ok(Number.isFinite(evaluated.result.withoutDecadeMae));
assert.ok(Number.isFinite(evaluated.result.themeShrinkageMae));
assert.ok(Number.isFinite(evaluated.result.themeShrinkageDelta));
assert.equal(evaluated.result.themeShrinkagePrior, 2);
const validationCalls = evaluated.calls.slice(records.length);
assert.ok(validationCalls.some(call => call.title === 'El mismo título' && call.id === '202'),
  'La validación debe conservar el ID del segundo remake al evaluar la muestra retenida');
assert.ok(validationCalls.some(call => call.title === 'Película E' && call.id == null),
  'Cuando no existe ID TMDB, la validación debe conservar la alternativa por título');

const eraRecords = [
  { title: 'Clásico uno', tmdbId: '601', rating: 9, genre: 'drama', year: 1981 },
  { title: 'Clásico dos', tmdbId: '602', rating: 9, genre: 'drama', year: 1984 },
  { title: 'Clásico tres', tmdbId: '603', rating: 9, genre: 'drama', year: 1988 },
  { title: 'Moderna uno', tmdbId: '604', rating: 2, genre: 'drama', year: 2011 },
  { title: 'Moderna dos', tmdbId: '605', rating: 2, genre: 'drama', year: 2014 },
  { title: 'Moderna tres', tmdbId: '606', rating: 2, genre: 'drama', year: 2018 }
];
const eraEvaluation = runEvaluation(eraRecords, eraRecords).result;
assert.equal(eraEvaluation.available, true);
assert.equal(eraEvaluation.decadeExamples, 6);
assert.ok(Number.isFinite(eraEvaluation.withoutDecadeMae));
assert.ok(eraEvaluation.decadeImprovement > 0,
  'El escenario sintético debe demostrar que la ablación distingue una señal temporal útil.');
assert.ok(Math.abs(eraEvaluation.decadeImprovement -
  (eraEvaluation.withoutDecadeMae - eraEvaluation.mae)) < 1e-9,
  'El efecto de década debe usar los mismos pliegues y definirse como MAE sin década menos MAE completo.');

const insufficient = runEvaluation(records.slice(0, 4), records.slice(0, 4)).result;
assert.equal(insufficient.available, false);
assert.equal(insufficient.count, 4);
assert.equal(insufficient.mae, null);
assert.equal(insufficient.baselineMae, null);
assert.equal(insufficient.improvementPct, null);
assert.equal(insufficient.withoutDecadeMae, null);
assert.equal(insufficient.decadeImprovement, null);
assert.equal(insufficient.themeShrinkageMae, null);
assert.equal(insufficient.themeShrinkageDelta, null);

const perfectBaselineRecords = [
  { title: 'A', tmdbId: '501', rating: 8, genre: 'drama' },
  { title: 'B', tmdbId: '502', rating: 8, genre: 'comedia' },
  { title: 'C', tmdbId: '503', rating: 8, genre: 'misterio' },
  { title: 'D', tmdbId: '504', rating: 8, genre: 'acción' },
  { title: 'E', tmdbId: '505', rating: 8, genre: 'fantasía' }
];
const zeroBaseline = runEvaluation(perfectBaselineRecords, perfectBaselineRecords).result;
assert.ok(zeroBaseline.mae > 0,
  'El predictor activo tiene prior suavizado y no tiene que coincidir con la media exacta en muestras pequeñas.');
assert.equal(zeroBaseline.baselineMae, 0,
  'La referencia debe ser la media real de entrenamiento, que es perfecta cuando todas las notas retenidas son 8.');
assert.equal(zeroBaseline.improvementPct, null,
  'No se calcula una mejora porcentual indefinida cuando la referencia tiene MAE cero.');
assert.equal(zeroBaseline.decadeImprovement, null);
assert.ok(Math.abs(zeroBaseline.themeShrinkageMae - zeroBaseline.mae) < 1e-10);
assert.ok(Math.abs(zeroBaseline.themeShrinkageDelta) < 1e-10);

const supportRecords = [
  { title: 'Una señal rara', tmdbId: '711', rating: 10, genre: 'drama', tags: ['tema-raro'], year: 2001 },
  { title: 'Tema común A', tmdbId: '712', rating: 8, genre: 'drama', tags: ['tema-comun'], year: 2002 },
  { title: 'Tema común B', tmdbId: '713', rating: 7, genre: 'comedia', tags: ['tema-comun'], year: 2003 },
  { title: 'Tema común C', tmdbId: '714', rating: 6, genre: 'misterio', tags: ['tema-comun'], year: 2004 },
  { title: 'Tema común D', tmdbId: '715', rating: 5, genre: 'comedia', tags: ['tema-comun'], year: 2005 }
];
const supportHarness = runEvaluation(supportRecords, supportRecords);
const baselineProfile = supportHarness.engine.buildProfile(supportRecords);
const shrinkageProfile = supportHarness.engine.buildProfile(supportRecords, { themeSupportShrinkage: true });
const rareBase = baselineProfile.features.get('tema: tema-raro');
const rareShrunk = shrinkageProfile.features.get('tema: tema-raro');
const commonBase = baselineProfile.features.get('tema: tema-comun');
const commonShrunk = shrinkageProfile.features.get('tema: tema-comun');
assert.equal(rareBase.count, 1);
assert.ok(Math.abs(rareShrunk.weight - rareBase.weight / 3) < 1e-10,
  'Un tema de soporte 1 debe reducir su peso por n/(n+2)=1/3.');
assert.equal(commonBase.count, 4);
assert.ok(Math.abs(commonShrunk.weight - commonBase.weight * 4 / 6) < 1e-10,
  'Un tema de soporte 4 debe reducir su peso por n/(n+2)=4/6.');
assert.equal(
  shrinkageProfile.features.get('género: drama').weight,
  baselineProfile.features.get('género: drama').weight,
  'La comparación no debe cambiar pesos de género.'
);
assert.equal(
  shrinkageProfile.features.get('década: 2000').weight,
  baselineProfile.features.get('década: 2000').weight,
  'La comparación no debe cambiar pesos de década.'
);

assert.ok(engineSource.includes('predictRating(candidate, profile).score'));
assert.ok(uiSource.includes('Referencia (media de entrenamiento): '));
assert.ok(uiSource.includes('Sin señal de década: '));
assert.ok(uiSource.includes('Se necesitan al menos 5 valoraciones evaluadas con año válido para medir la señal de década'));
console.log('Pruebas de evaluación correctas: identidad TMDB, referencia, ablación de década, muestra insuficiente y efecto temporal.');
