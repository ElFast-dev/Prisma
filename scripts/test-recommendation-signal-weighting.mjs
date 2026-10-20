import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('app.js', 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'No se pudo localizar: ' + startMarker);
  return source.slice(start, end);
}

const predictSource = section('  function predictRating(movie, profile) {', '  function getRecommendations(limit) {');
const movieFeatures = movie => Array.isArray(movie && movie.features) ? movie.features : [];
const predictRating = new Function('movieFeatures', predictSource + '\nreturn predictRating;')(movieFeatures);

function profile(features, overrides = {}) {
  return Object.assign({
    average: 6.5,
    features: new Map(features),
    withMetadata: 10,
    count: 10
  }, overrides);
}
function signal(weight, count = 4, mean = 7) {
  return { sum: 0, count, mean, weight };
}
function predict(features, model) {
  return predictRating({ features }, model);
}

const conflictProfile = profile([
  ['género: drama', signal(0.5)],
  ['tema: animal', signal(-0.5)]
]);
const conflict = predict(['género: drama', 'tema: animal'], conflictProfile);
assert.ok(conflict.score > conflictProfile.average,
  'Cuando un género positivo y una etiqueta negativa tienen magnitud igual, debe prevalecer el género');
assert.equal(conflict.matches.find(item => item.raw === 'género: drama').signalWeight, 1);
assert.equal(conflict.matches.find(item => item.raw === 'tema: animal').signalWeight, 0.35);
assert.ok(conflict.explanation.includes('drama'), 'La explicación debe destacar la señal positiva que mueve la nota');
assert.ok(conflict.explanation.includes('animal'), 'Una señal negativa opuesta debe aparecer como señal a vigilar');

const sparseProfile = profile([
  ['género: drama', signal(0.8, 5)]
]);
const direct = predict(['género: drama'], sparseProfile);
const sparse = predict(['género: drama', 'género: desconocido', 'tema: nuevo-a', 'tema: nuevo-b'], sparseProfile);
assert.ok(direct.score > sparse.score && sparse.score > sparseProfile.average,
  'Las características desconocidas deben amortiguar la corrección, no reforzarla ni convertirla en señal negativa');
assert.equal(sparse.coverage, 0.25);
assert.equal(sparse.confidence, 'Limitada', 'La cobertura baja no permite declarar confianza moderada');
assert.ok(sparse.explanation.includes('no están respaldadas'), 'La explicación debe reconocer que faltan señales');

const strongProfile = profile([
  ['género: drama', signal(0.4, 5)],
  ['género: acción', signal(0.3, 2)],
  ['tema: heroísmo', signal(0.4, 3)]
]);
const strong = predict(['género: drama', 'género: acción', 'tema: heroísmo', 'género: desconocido'], strongProfile);
assert.equal(strong.coverage, 0.75);
assert.equal(strong.confidence, 'Moderada',
  'La confianza moderada requiere múltiples coincidencias, cobertura mayoritaria y soporte repetido');

const tagOnly = predict(['tema: espías'], profile([['tema: espías', signal(0.8, 5)]]));
const genreOnly = predict(['género: suspenso'], profile([['género: suspenso', signal(0.8, 5)]]));
assert.ok(genreOnly.score - 6.5 > tagOnly.score - 6.5,
  'Una etiqueta aislada debe tener menos influencia que un género con el mismo peso aprendido');

const noMatch = predict(['género: aventura'], profile([]));
assert.equal(noMatch.score, 6.5);
assert.equal(noMatch.confidence, 'Muy baja');
assert.equal(noMatch.coverage, 0);
assert.ok(noMatch.explanation.includes('nota media'));

const upper = predict(['género: drama'], profile([['género: drama', signal(100, 5)]]));
const lower = predict(['género: drama'], profile([['género: drama', signal(-100, 5)]]));
assert.equal(upper.score, 10, 'La predicción superior debe quedar limitada a 10');
assert.equal(lower.score, 1, 'La predicción inferior debe quedar limitada a 1');

const labSource = section('  function evaluateModel() {', '  function genreStats() {');
assert.ok(labSource.includes('predictRating(movie || heldOut, profile).score'),
  'El Laboratorio debe seguir evaluando el puntaje actualizado del mismo modelo');
assert.ok(source.includes('item.weight * signalWeight'), 'La contribución debe reflejar el peso del tipo de señal');
assert.ok(source.includes('matches.length >= 2 && coverage >= 0.6'),
  'La etiqueta de confianza moderada debe depender de la cobertura y de múltiples coincidencias');

console.log('Pruebas de recomendación correctas: peso por señal, cobertura desconocida, confianza calibrada, explicaciones y límites 1–10.');
