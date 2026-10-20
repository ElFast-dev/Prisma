import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPresentationUtils } from '../js/ui/presentation-utils.js';

const [appSource, domainSource, tmdbSource, catalogSource, collectionSource, pageViewsSource, movieActionsSource] = await Promise.all([
  readFile('app.js', 'utf8'),
  readFile('js/core/movie-utils.js', 'utf8'),
  readFile('js/tmdb/client.js', 'utf8'),
  readFile('js/catalog/catalog-model.js', 'utf8'),
  readFile('js/collection/collection-model.js', 'utf8'),
  readFile('js/ui/page-views.js', 'utf8'),
  readFile('js/app/movie-actions.js', 'utf8')
]);
const source = appSource + '\\n' + domainSource + '\\n' + tmdbSource + '\\n' + catalogSource + '\\n' + collectionSource + '\\n' + pageViewsSource + '\\n' + movieActionsSource;
function escapeHTML(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}
const helpers = createPresentationUtils({ escapeHTML });
assert.equal(helpers.formatVoteCount(1), '1 voto');
assert.equal(helpers.formatVoteCount(0), '');
assert.equal(helpers.formatVoteCount(-2), '');
assert.equal(helpers.formatVoteCount(1.5), '');
assert.equal(helpers.formatVoteCount('no-dato'), '');
assert.equal(helpers.hasTrustedTMDBScore({voteAverage: 8.1, source: 'tmdb'}), true);
assert.equal(helpers.hasTrustedTMDBScore({voteAverage: 8.1, metadataSource: 'tmdb'}), true);
assert.equal(helpers.hasTrustedTMDBScore({voteAverage: 8.1, source: 'catalog'}), false);
assert.equal(helpers.hasTrustedTMDBScore({voteAverage: 11, source: 'tmdb'}), false);
assert.equal(helpers.hasTrustedTMDBScore({voteAverage: 0, source: 'tmdb'}), false);
const sourcedScore = helpers.buildRatingMetrics({
  title: 'Prisma & Metadatos', tmdbId: '990001', voteAverage: 8.2, voteCount: 1432, metadataSource: 'tmdb'
}, {});
assert.ok(sourcedScore.includes('<strong>8.2</strong>'));
assert.ok(sourcedScore.includes('TMDB · ' + helpers.formatVoteCount(1432)));
assert.ok(sourcedScore.includes('href="https://www.themoviedb.org/movie/990001"'));
assert.ok(sourcedScore.includes('href="https://www.imdb.com/find/?q=Prisma%20%26%20Metadatos"'));
assert.ok(sourcedScore.includes('href="https://www.rottentomatoes.com/search?search=Prisma%20%26%20Metadatos"'));
assert.ok(sourcedScore.includes('href="https://www.metacritic.com/search/Prisma%20%26%20Metadatos/"'));
assert.equal((sourcedScore.match(/Buscar título/g) || []).length, 3);
const directIMDb = helpers.buildRatingMetrics({
  title: 'Prisma fixture', tmdbId: '990002', voteAverage: 7.4, voteCount: 21, source: 'tmdb'
}, { imdb_id: 'tt1234567' });
assert.ok(directIMDb.includes('href="https://www.imdb.com/title/tt1234567/"'));
const noScore = helpers.buildRatingMetrics({
  title: 'Película sin puntuación', tmdbId: '990003', voteAverage: null, voteCount: 0, metadataSource: 'tmdb'
}, {});
assert.ok(!/<strong>\d+(?:\.\d+)?<\/strong>/.test(noScore));
assert.ok(!noScore.includes(' votos'));
assert.ok(noScore.includes('Consultar nota'));
const unverifiedScore = helpers.buildRatingMetrics({
  title: 'Datos importados sin procedencia', tmdbId: '990004', voteAverage: 9.9, voteCount: 876, source: 'catalog'
}, {});
assert.ok(!unverifiedScore.includes('<strong>9.9</strong>'));
assert.ok(!unverifiedScore.includes('876 votos'));
assert.ok(source.includes('const publicRating = ctx.hasTrustedTMDBScore(item) ?'));
assert.ok(source.includes('(hasTrustedTMDBScore(a) ? Number(a.voteAverage) : 0) - (hasTrustedTMDBScore(b) ? Number(b.voteAverage) : 0)'));
assert.ok(source.includes('voteCount: Number(movie.voteCount || movie.vote_count || 0) || null'));
assert.ok(source.includes('voteCount: Number(raw.vote_count) || null'));
assert.ok(source.includes('entry.voteCount = enriched.voteCount || entry.voteCount || null'));
assert.ok(source.includes('voteCount:movie.voteCount || old.voteCount || null'));
assert.ok(source.includes('"posterUrl","voteAverage","voteCount","runtime"'));
assert.ok(source.includes('"posterUrl","voteAverage","voteCount","runtime","releaseDate"'));
console.log('Pruebas de puntuaciones correctas: API de presentación, procedencia, recuento, enlaces y ausencia de cifras inventadas.');
