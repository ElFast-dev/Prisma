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
assert.equal(remakes.find(movie => movie.tmdbId === '990001').year, 1998);
assert.deepEqual(remakes.find(movie => movie.tmdbId === '990001').genres, ['Drama']);
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
console.log('Pruebas CSV correctas: parser modular, IDs TMDB distintos, IDs de origen, ID inválido y fallback sin TMDB.');
