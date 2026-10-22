import assert from 'node:assert/strict';
import { parseCatalogCSV } from '../js/catalog/csv-parser.js';

const remakes = parseCatalogCSV([
  'movieId,title,year,tmdb_id,genres',
  '50001,Prisma CSV Remake Fixture,1998,990001,Drama',
  '50002,Prisma CSV Remake Fixture,2024,990002,Action',
  '50003,Prisma CSV Remake Fixture,2000,990001,Comedy'
].join('\n'));
assert.equal(remakes.length, 2, 'Deben preservarse los dos IDs TMDB diferentes y deduplicarse el ID repetido');
assert.deepEqual(remakes.map(movie => movie.tmdbId).sort(), ['990001', '990002']);
assert.equal(remakes.find(movie => movie.tmdbId === '990001').id, '50001');
assert.equal(remakes.find(movie => movie.tmdbId === '990001').year, 1998,
  'Una fila duplicada con año en conflicto no debe sobrescribir el año ya conocido de ese ID TMDB.');
assert.deepEqual(remakes.find(movie => movie.tmdbId === '990001').genres, ['Drama', 'Comedia'],
  'Las filas del mismo ID TMDB deben combinar los metadatos útiles en vez de descartar la segunda fila.');

const movieLens = parseCatalogCSV('movieId,title,genres\n60001,Prisma MovieLens Namespace Fixture (2001),Drama');
assert.equal(movieLens.length, 1);
assert.equal(movieLens[0].id, '60001');
assert.equal(movieLens[0].tmdbId, null);
assert.equal(movieLens[0].year, 2001);

const invalidTmdb = parseCatalogCSV('title,tmdb_id\nPrisma Invalid TMDB Fixture,1e3');
assert.equal(invalidTmdb.length, 1);
assert.equal(invalidTmdb[0].tmdbId, null);

const noTmdb = parseCatalogCSV('title,genres\nPrisma Same Title Fixture,Drama\nPrisma Same Title Fixture,Comedy');
assert.equal(noTmdb.length, 1);
assert.deepEqual(noTmdb[0].genres, ['Drama', 'Comedia'],
  'Las filas duplicadas por título/año deben completar el catálogo sin crear otra película.');

const sameTitleDifferentYears = parseCatalogCSV([
  'title,year,genres',
  'Prisma Year Fallback Fixture,1998,Drama',
  'Prisma Year Fallback Fixture,2024,Action'
].join('\n'));
assert.equal(sameTitleDifferentYears.length, 2,
  'Dos títulos sin ID TMDB pero de años distintos deben seguir separados.');

const multiline = parseCatalogCSV([
  'title,year,overview,genres,tags',
  'Prisma Multiline Fixture,2022,"Primera línea, con coma',
  'segunda línea con ""cita"" y una continuación",Drama,loop temporal'
].join('\r\n'));
assert.equal(multiline.length, 1, 'Un campo entrecomillado multilínea debe seguir siendo una única fila CSV.');
assert.equal(multiline[0].overview, 'Primera línea, con coma\nsegunda línea con "cita" y una continuación',
  'Las comas, saltos de línea y comillas escapadas deben conservarse dentro de la sinopsis.');
assert.deepEqual(multiline[0].tags, ['loop temporal']);

const mergedDuplicate = parseCatalogCSV([
  'title,year,genres,tags,overview',
  'Prisma Duplicate Metadata Fixture,2021,Drama,loop temporal,"Una trama corta"',
  'Prisma Duplicate Metadata Fixture,2021,Comedy,misterio,"Una trama bastante más extensa y completa"'
].join('\n'));
assert.equal(mergedDuplicate.length, 1);
assert.deepEqual(mergedDuplicate[0].genres, ['Drama', 'Comedia']);
assert.deepEqual(mergedDuplicate[0].tags, ['loop temporal', 'misterio']);
assert.equal(mergedDuplicate[0].overview, 'Una trama bastante más extensa y completa',
  'Una sinopsis más completa debe rellenar la fila deduplicada sin duplicar la película.');

assert.throws(
  () => parseCatalogCSV('title,overview\nPrisma Broken CSV Fixture,"comilla sin cierre'),
  /campo entre comillas sin cerrar/,
  'Una comilla sin cerrar debe dar un error comprensible y no filas corruptas.'
);

console.log('Pruebas CSV correctas: remakes, campos multilínea, comillas escapadas, fusión de metadatos y títulos sin ID.');
