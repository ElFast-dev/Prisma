import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRecommendationEngine } from '../js/recommendations/engine.js';
import { ratingValue } from '../js/core/movie-utils.js';
const appSource = await readFile('app.js', 'utf8');
const [engineSource, rankingSource] = await Promise.all([
  readFile('js/recommendations/engine.js', 'utf8'),
  readFile('js/recommendations/ranking.js', 'utf8')
]);
const movieFeatures = movie => Array.isArray(movie && movie.features) ? movie.features : [];
const engine = createRecommendationEngine({ getRatings: () => [], findMovie: () => null, movieFeatures, ratingValue });
const predictRating = engine.predictRating;
function profile(features, overrides = {}) {
  return Object.assign({ average: 6.5, features: new Map(features), withMetadata: 10, count: 10 }, overrides);
}
function signal(weight, count = 4, mean = 7) { return { sum: 0, count, mean, weight }; }
function predict(features, model) { return predictRating({ features }, model); }

const conflictProfile = profile([['género: drama', signal(0.5)], ['tema: animal', signal(-0.5)]]);
const conflict = predict(['género: drama', 'tema: animal'], conflictProfile);
assert.ok(conflict.score > conflictProfile.average);
assert.equal(conflict.matches.find(item => item.raw === 'género: drama').signalWeight, 1);
assert.equal(conflict.matches.find(item => item.raw === 'tema: animal').signalWeight, 0.35);
assert.ok(conflict.explanation.includes('drama'));
assert.ok(conflict.explanation.includes('animal'));
const sparseProfile = profile([['género: drama', signal(0.8, 5)]]);
const direct = predict(['género: drama'], sparseProfile);
const sparse = predict(['género: drama', 'género: desconocido', 'tema: nuevo-a', 'tema: nuevo-b'], sparseProfile);
assert.ok(direct.score > sparse.score && sparse.score > sparseProfile.average);
assert.equal(sparse.coverage, 0.25);
assert.equal(sparse.confidence, 'Limitada');
assert.ok(sparse.explanation.includes('no están respaldadas'));
const strongProfile = profile([
  ['género: drama', signal(0.4, 5)],
  ['género: acción', signal(0.3, 2)],
  ['tema: heroísmo', signal(0.4, 3)]
]);
const strong = predict(['género: drama', 'género: acción', 'tema: heroísmo', 'género: desconocido'], strongProfile);
assert.equal(strong.coverage, 0.75);
assert.equal(strong.confidence, 'Moderada');
const tagOnly = predict(['tema: espías'], profile([['tema: espías', signal(0.8, 5)]]));
const genreOnly = predict(['género: suspenso'], profile([['género: suspenso', signal(0.8, 5)]]));
assert.ok(genreOnly.score - 6.5 > tagOnly.score - 6.5);
const decadeOnly = predict(['década: 2010'], profile([['década: 2010', signal(0.8, 5)]]));
assert.equal(decadeOnly.matches[0].signalWeight, 0.2);
assert.ok(genreOnly.score - 6.5 > decadeOnly.score - 6.5,
  'La década debe influir menos que una señal de género de magnitud equivalente.');
assert.equal(decadeOnly.matches[0].name, 'década de 2010');

const noMatch = predict(['género: aventura'], profile([]));
assert.equal(noMatch.score, 6.5);
assert.equal(noMatch.confidence, 'Muy baja');
assert.equal(noMatch.coverage, 0);
assert.ok(noMatch.explanation.includes('nota media'));
const upper = predict(['género: drama'], profile([['género: drama', signal(100, 5)]]));
const lower = predict(['género: drama'], profile([['género: drama', signal(-100, 5)]]));
assert.equal(upper.score, 10);
assert.equal(lower.score, 1);
assert.ok(engineSource.includes('item.weight * signalWeight'));
assert.ok(engineSource.includes('matches.length >= 2 && coverage >= 0.6'));
assert.ok(rankingSource.includes('ctx.predictRating(movie, profile)'));
assert.ok(appSource.includes('createRecommendationRanking('));

const seedFeatures = [
  "género: ciencia ficción", "tema: bucle temporal", "director: directora principal",
  "actor: actriz principal", "trama: misterio"
];
const seedMovie = { title: "Película favorita", features: seedFeatures };
const oneHighRating = createRecommendationEngine({
  getRatings: () => [{ title: "Película favorita", rating: 10, tmdbId: "100" }],
  findMovie: () => seedMovie,
  movieFeatures,
  ratingValue
});
const highProfile = oneHighRating.buildProfile();
assert.equal(highProfile.count, 1);
assert.ok(highProfile.average < 10 && highProfile.average > 6.5,
  "Con una sola nota alta, la base debe suavizarse en vez de saturarse en 10.");
assert.ok(highProfile.features.get("género: ciencia ficción").weight > 0,
  "La primera nota alta ya debe aportar una señal positiva.");
const closeCandidate = oneHighRating.predictRating({ features: seedFeatures }, highProfile);
const distantCandidate = oneHighRating.predictRating({ features: ["género: terror", "director: otro director"] }, highProfile);
assert.ok(closeCandidate.score > distantCandidate.score,
  "Con una sola nota ya se deben priorizar candidatas con metadatos afines.");

const oneLowRating = createRecommendationEngine({
  getRatings: () => [{ title: "Película no afín", rating: 1, tmdbId: "101" }],
  findMovie: () => ({ title: "Película no afín", features: seedFeatures }),
  movieFeatures,
  ratingValue
});
const lowProfile = oneLowRating.buildProfile();
assert.ok(lowProfile.features.get("género: ciencia ficción").weight < 0,
  "La primera nota baja debe aportar una señal negativa desde el inicio.");
assert.ok(oneLowRating.predictRating({ features: seedFeatures }, lowProfile).score <
  oneLowRating.predictRating({ features: ["género: terror"] }, lowProfile).score,
  "Las candidatas que comparten características con una película mal valorada no deben salir favorecidas.");
console.log('Pruebas correctas: señales, cobertura, límites 1–10 y aprendizaje desde la primera nota alta o baja.');
