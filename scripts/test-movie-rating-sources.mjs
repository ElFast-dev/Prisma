import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('app.js', 'utf8');

function section(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0 && end > start, 'No se pudo localizar: ' + startMarker);
  return source.slice(start, end);
}

function escapeHTML(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

const helpersSource = section('  function formatVoteCount(value) {', '  function renderMovieDetails() {');
const helpers = new Function('escapeHTML', helpersSource + '\nreturn { formatVoteCount, buildRatingMetrics };')(escapeHTML);
assert.equal(helpers.formatVoteCount(1), '1 voto');
assert.equal(helpers.formatVoteCount(0), '');
assert.equal(helpers.formatVoteCount(-2), '');
assert.equal(helpers.formatVoteCount(1.5), '');
assert.equal(helpers.formatVoteCount('no-dato'), '');

const sourcedScore = helpers.buildRatingMetrics({
  title: 'Prisma & Metadatos', tmdbId: '990001', voteAverage: 8.2, voteCount: 1432, metadataSource: 'tmdb'
}, {});
assert.ok(sourcedScore.includes('<strong>8.2</strong>'), 'Debe mostrar la nota media real de TMDB');
assert.ok(sourcedScore.includes('TMDB · ' + helpers.formatVoteCount(1432)), 'Debe mostrar fuente y recuento de votos');
assert.ok(sourcedScore.includes('href="https://www.themoviedb.org/movie/990001"'), 'La nota enlaza a la película correcta en TMDB');
assert.ok(sourcedScore.includes('href="https://www.imdb.com/find/?q=Prisma%20%26%20Metadatos"'), 'Sin IMDb ID, debe abrir su búsqueda propia');
assert.ok(sourcedScore.includes('href="https://www.rottentomatoes.com/search?search=Prisma%20%26%20Metadatos"'));
assert.ok(sourcedScore.includes('href="https://www.metacritic.com/search/Prisma%20%26%20Metadatos/"'));
assert.equal((sourcedScore.match(/Buscar título/g) || []).length, 3, 'Los otros sitios deben quedar identificados como búsquedas externas');

const directIMDb = helpers.buildRatingMetrics({
  title: 'Prisma fixture', tmdbId: '990002', voteAverage: 7.4, voteCount: 21, source: 'tmdb'
}, { imdb_id: 'tt1234567' });
assert.ok(directIMDb.includes('href="https://www.imdb.com/title/tt1234567/"'));

const noScore = helpers.buildRatingMetrics({
  title: 'Película sin puntuación', tmdbId: '990003', voteAverage: null, voteCount: 0, metadataSource: 'tmdb'
}, {});
assert.ok(!/<strong>\d+(?:\.\d+)?<\/strong>/.test(noScore), 'No se debe inventar una nota');
assert.ok(!noScore.includes(' votos'), 'No se debe inventar un recuento');
assert.ok(noScore.includes('Consultar nota'));

const unverifiedScore = helpers.buildRatingMetrics({
  title: 'Datos importados sin procedencia', tmdbId: '990004', voteAverage: 9.9, voteCount: 876, source: 'catalog'
}, {});
assert.ok(!unverifiedScore.includes('<strong>9.9</strong>'), 'Una cifra sin origen TMDB confirmado no debe mostrarse como nota pública');
assert.ok(!unverifiedScore.includes('876 votos'));

assert.ok(source.includes('voteCount: Number(movie.voteCount || movie.vote_count || 0) || null'));
assert.ok(source.includes('voteCount: Number(raw.vote_count) || null'));
assert.ok(source.includes('voteCount: enriched.voteCount || entry.voteCount || null'));
assert.ok(source.includes('voteCount:movie.voteCount || old.voteCount || null'));
assert.ok(source.includes('"posterUrl","voteAverage","voteCount","runtime"'));
assert.ok(source.includes('"posterUrl","voteAverage","voteCount","runtime","releaseDate"'));

console.log('Pruebas de puntuaciones correctas: procedencia, recuento, enlaces externos y ausencia de cifras inventadas.');
