import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sameDiscoveryMovie, uniqueDiscoveryMovies } from '../js/core/movie-utils.js';
import { createPresentationUtils } from '../js/ui/presentation-utils.js';

const [source, collectionSource, pageViewsSource] = await Promise.all([readFile('app.js', 'utf8'), readFile('js/collection/collection-model.js', 'utf8'), readFile('js/ui/page-views.js', 'utf8')]);

const identity = { sameDiscoveryMovie, uniqueDiscoveryMovies };
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

const presentation = createPresentationUtils({ escapeHTML: value => String(value == null ? '' : value) });
const formatWatchedDate = presentation.formatWatchedDate;
assert.equal(formatWatchedDate('2024-09-17T15:45:39.000Z'), '09/17/2024');
assert.equal(formatWatchedDate('not-a-date'), 'Fecha desconocida');
assert.ok(!formatWatchedDate('2024-09-17T15:45:39.000Z').includes(':'));
assert.equal(presentation.formatDate('not-a-date'), 'fecha no disponible');
assert.equal(presentation.dateLabel('not-a-date'), 'not-a-date');

assert.ok(pageViewsSource.includes('return ctx.queryOkay && ctx.genreOkay && !ctx.isInHistory(movie.title,movie.tmdbId) && !ctx.isHidden(movie.title,movie.tmdbId);'),
  'El catálogo de Descubrir debe ocultar películas vistas');
assert.ok(source.includes('!isMovieInCollection(movie.title,movie.tmdbId) && movie.source !== "history"'),
  'El recomendador debe excluir vistas, pendientes y ocultas');
assert.ok(source.includes('return !isInHistory(movie.title,movie.tmdbId) && !isHidden(movie.title,movie.tmdbId);'),
  'Los resultados remotos de TMDB deben omitir películas ya vistas u ocultas');

console.log('Pruebas de Descubrir y ficha correctas: identidades únicas, historial excluido y fecha sin hora.');
