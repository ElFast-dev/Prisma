import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRecommendationEngine } from '../js/recommendations/engine.js';
import { ratingValue } from '../js/core/movie-utils.js';
const appSource = await readFile('app.js', 'utf8');
const engineSource = await readFile('js/recommendations/engine.js', 'utf8');
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
assert.ok(appSource.includes('predictRating(movie, profile)'));
console.log('Pruebas de recomendación correctas: API modular, señales, cobertura, confianza, explicaciones y límites 1–10.');
