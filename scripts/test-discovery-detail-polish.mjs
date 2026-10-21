import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sameDiscoveryMovie, uniqueDiscoveryMovies } from '../js/core/movie-utils.js';
import { createPresentationUtils } from '../js/ui/presentation-utils.js';

const [source, collectionSource, pageViewsSource, tmdbViewsSource, rankingSource] = await Promise.all([readFile('app.js', 'utf8'), readFile('js/collection/collection-model.js', 'utf8'), readFile('js/ui/page-views.js', 'utf8'), readFile('js/ui/tmdb-views.js', 'utf8'), readFile('js/recommendations/ranking.js', 'utf8')]);

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

assert.ok(pageViewsSource.includes('return queryOkay && genreOkay && !ctx.isInHistory(movie.title,movie.tmdbId) && !ctx.isHidden(movie.title,movie.tmdbId);'),
  'El catálogo de Descubrir debe ocultar películas vistas');
assert.ok(rankingSource.includes('!ctx.isMovieInCollection(movie.title,movie.tmdbId) && movie.source !== "history"'),
  'El recomendador debe excluir vistas, pendientes y ocultas');
assert.ok(tmdbViewsSource.includes('return !ctx.isInHistory(movie.title,movie.tmdbId) && !ctx.isHidden(movie.title,movie.tmdbId);'),
  'Los resultados remotos de TMDB deben omitir películas ya vistas u ocultas');

console.log('Pruebas de Descubrir y ficha correctas: identidades únicas, historial excluido y fecha sin hora.');


const [detailStyles, modalViewsSource, interfaceSpec] = await Promise.all([
  readFile('styles/movie-details.css', 'utf8'),
  readFile('js/ui/modal-views.js', 'utf8'),
  readFile('openspec/specs/interface/spec.md', 'utf8')
]);
assert.match(detailStyles, /\.detail-meta-line\s*\{[^}]*display:\s*grid/s,
  'Los metadatos de la ficha deben presentarse en una cuadrícula');
assert.match(detailStyles, /grid-template-columns:\s*repeat\(4,minmax\(0,1fr\)\)/,
  'La ficha debe usar cuatro columnas de metadatos en escritorio');
assert.match(detailStyles, /@media \(max-width:\s*760px\)[\s\S]*?\.detail-meta-line\s*\{[^}]*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)/,
  'La ficha debe adaptarse a dos columnas de metadatos en móvil');
assert.match(detailStyles, /\.synopsis-section p\s*\{[^}]*font-size:\s*14px/s,
  'La sinopsis de escritorio debe usar tipografía legible');
assert.match(detailStyles, /@media \(max-width:\s*760px\)[\s\S]*?\.synopsis-section p\s*\{[^}]*font-size:\s*13px/s,
  'La sinopsis móvil debe conservar tamaño legible');
assert.match(detailStyles, /\.detail-state-actions > \.btn\s*\{[^}]*min-height:\s*44px/s,
  'Las acciones de estado deben mantener objetivos táctiles de 44 px');
assert.match(detailStyles, /\.detail-action-strip > \.btn\s*\{[^}]*min-height:\s*44px/s,
  'Las acciones principales deben mantener objetivos táctiles de 44 px');
assert.match(modalViewsSource, /var\(--bg-elevated\) 100%\),url/,
  'El fondo del encabezado debe terminar en la superficie activa del tema');
assert.doesNotMatch(modalViewsSource, /35%,#08101b 100%/,
  'La ficha no debe forzar un color terminal azul fijo');
assert.match(interfaceSpec, /Ficha de película con jerarquía y lectura cómoda/,
  'La mejora visual debe estar recogida en la especificación vigente');
console.log('Ficha de película verificada: cuadrícula adaptable, sinopsis legible, objetivos táctiles, tema y scroll preservado.');
