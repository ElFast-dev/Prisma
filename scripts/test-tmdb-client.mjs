import assert from 'node:assert/strict';
import { createTMDBClient, normalizeCredential } from '../js/tmdb/client.js';

assert.equal(normalizeCredential('  token-secret-fixture  ', 'readToken').value, 'token-secret-fixture');
assert.equal(normalizeCredential('api-key-fixture', 'apiKey').kind, 'apiKey');
assert.equal(normalizeCredential('', 'apiKey'), null);
assert.equal(normalizeCredential('value', 'unknown').kind, 'readToken');

function makeClient(credential, responder) {
  const calls = [];
  const client = createTMDBClient({
    getCredential: () => credential,
    displayGenre: value => value === 'Drama' ? 'Drama traducido' : value,
    uniqueStrings: values => [...new Set(values.filter(Boolean))],
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return responder(String(url), options);
    }
  });
  return { client, calls };
}
const ok = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload
});

const apiKeyClient = makeClient({ kind: 'apiKey', value: 'api-key-fixture' }, async () => ok({ success: true }));
await apiKeyClient.client.request('/configuration', { language: 'es-ES', empty: '' });
assert.equal(new URL(apiKeyClient.calls[0].url).searchParams.get('api_key'), 'api-key-fixture');
assert.equal(new URL(apiKeyClient.calls[0].url).searchParams.get('language'), 'es-ES');
assert.equal(new URL(apiKeyClient.calls[0].url).searchParams.has('empty'), false);
assert.equal(apiKeyClient.calls[0].options.headers.accept, 'application/json');
assert.equal(apiKeyClient.calls[0].options.headers.Authorization, undefined);

const tokenClient = makeClient({ kind: 'readToken', value: 'read-token-fixture' }, async () => ok({ success: true }));
await tokenClient.client.request('/configuration', {});
assert.equal(tokenClient.calls[0].options.headers.Authorization, 'Bearer read-token-fixture');
assert.equal(new URL(tokenClient.calls[0].url).searchParams.has('api_key'), false);

const missing = makeClient(null, async () => ok({}));
await assert.rejects(() => missing.client.request('/configuration', {}), /Conecta tu credencial/);
assert.equal(missing.calls.length, 0, 'No se realiza una petición sin credenciales');

for (const [status, expected] of [
  [401, /rechazó la credencial/],
  [403, /denegó el acceso/],
  [429, /limitó temporalmente/],
  [500, /fallo interno del servidor/]
]) {
  const errorClient = makeClient({ kind: 'readToken', value: 'fixture' }, async () =>
    ok({ status_message: 'fallo interno del servidor' }, status));
  await assert.rejects(() => errorClient.client.request('/configuration', {}), expected);
}

const genreClient = makeClient({ kind: 'readToken', value: 'fixture' }, async url => {
  if (url.includes('/genre/movie/list')) return ok({ genres: [{ id: 18, name: 'Drama' }] });
  return ok({});
});
await genreClient.client.ensureGenres();
await genreClient.client.ensureGenres();
const normalized = genreClient.client.fromTMDB({
  id: 88001,
  title: 'Prisma Fixture',
  release_date: '2020-05-12',
  genre_ids: [18, 999],
  keywords: { keywords: [{ name: 'Misterio' }, { name: 'Misterio' }, { name: 'Intriga' }] },
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  vote_average: 7.7,
  vote_count: 123,
  runtime: 105,
  production_countries: [{ name: 'Panamá' }]
});
assert.equal(genreClient.calls.length, 1, 'Los géneros se cargan una sola vez y quedan en caché');
assert.equal(normalized.tmdbId, '88001');
assert.equal(normalized.year, 2020);
assert.deepEqual(normalized.genres, ['Drama traducido']);
assert.deepEqual(normalized.tags, ['Misterio', 'Intriga']);
assert.equal(normalized.posterUrl, 'https://image.tmdb.org/t/p/w500/poster.jpg');
assert.equal(normalized.backdropUrl, 'https://image.tmdb.org/t/p/w1280/backdrop.jpg');
assert.equal(normalized.voteAverage, 7.7);
assert.equal(normalized.voteCount, 123);
assert.equal(normalized.metadataSource, 'tmdb');
assert.equal(normalized.source, 'tmdb');
assert.equal(normalized.tmdbCreditsFetchedAt, null,
  'Una respuesta de búsqueda sin créditos no debe fingirse enriquecida.');
assert.ok(normalized.tmdbKeywordsFetchedAt,
  'La presencia de keywords debe quedar marcada como obtenida.');
genreClient.client.resetGenres();
await genreClient.client.ensureGenres();
assert.equal(genreClient.calls.length, 2, 'La caché de géneros puede reiniciarse al cambiar la credencial');
console.log('Cliente TMDB correcto: credenciales, parámetros, errores HTTP, metadatos normalizados y caché de géneros.');
