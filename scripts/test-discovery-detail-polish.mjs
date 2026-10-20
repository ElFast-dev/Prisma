import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sameDiscoveryMovie, uniqueDiscoveryMovies } from '../js/core/movie-utils.js';

const source = await readFile('app.js', 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'No se pudo localizar: ' + startMarker);
  return source.slice(start, end);
}

const identitySource = section('  function titleKey(value) {', '  function splitList(value) {');
const identity = new Function(identitySource + '\nreturn { sameDiscoveryMovie, uniqueDiscoveryMovies };')();
assert.equal(identity.sameDiscoveryMovie({ title: 'Título alternativo', tmdbId: '123' }, { title: 'Original Title', tmdbId: '123' }), true,
  'El mismo ID TMDB debe identificar una misma película aunque cambie el título');
assert.equal(identity.sameDiscoveryMovie({ title: 'Remake', year: 1998, tmdbId: '123' }, { title: 'Remake', year: 2024, tmdbId: '456' }), false,
  'No deben fusionarse remakes con IDs TMDB distintos');
assert.equal(identity.sameDiscoveryMovie({ title: 'Película', year: 2020 }, { title: 'Película', year: 2020 }), true);
assert.equal(identity.sameDiscoveryMovie({ title: 'Película', year: 1998 }, { title: 'Película', year: 2024 }), false);

const unique = identity.uniqueDiscoveryMovies([
  { title: 'Prisma', tmdbId: '990001', year: 1998 },
  { title: 'Prisma (título alternativo)', tmdbId: '990001', year: 1998 },
  { title: 'Prisma', tmdbId: '990002', year: 2024 },
  { title: 'Sin ID', year: 2020 },
  { title: 'Sin ID', year: 2020 },
  { title: 'Sin ID', year: 2021 }
]);
assert.equal(unique.length, 4, 'Debe eliminar copias exactas y conservar remakes e identidades diferentes');

const dateSource = section('  function formatWatchedDate(value) {', '  function displayMovieStatus(status) {');
const formatWatchedDate = new Function(dateSource + '\nreturn formatWatchedDate;')();
assert.equal(formatWatchedDate('2024-09-17T15:45:39.000Z'), '09/17/2024');
assert.equal(formatWatchedDate('not-a-date'), 'Fecha desconocida');
assert.ok(!formatWatchedDate('2024-09-17T15:45:39.000Z').includes(':'));

assert.ok(source.includes('return queryOkay && genreOkay && !isInHistory(movie.title,movie.tmdbId) && !isHidden(movie.title,movie.tmdbId);'),
  'El catálogo de Descubrir debe ocultar películas vistas');
assert.ok(source.includes('!isMovieInCollection(movie.title,movie.tmdbId) && movie.source !== "history"'),
  'El recomendador debe excluir vistas, pendientes y ocultas');
assert.ok(source.includes('return !isInHistory(movie.title,movie.tmdbId) && !isHidden(movie.title,movie.tmdbId);'),
  'Los resultados remotos de TMDB deben omitir películas ya vistas u ocultas');

console.log('Pruebas de Descubrir y ficha correctas: identidades únicas, historial excluido y fecha sin hora.');
