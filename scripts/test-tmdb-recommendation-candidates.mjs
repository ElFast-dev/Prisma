import assert from "node:assert/strict";
import { createTMDBBrowserActions } from "../js/tmdb/browser-actions.js";
import { createRecommendationRanking } from "../js/recommendations/ranking.js";
import { uniqueDiscoveryMovies } from "../js/core/movie-utils.js";

let candidates = [];
let results = [];
let mode = "popular";
let page = 1;
let totalPages = 3;
let loading = false;
let query = "";
let requestSerial = 0;
let rerenders = 0;
let resultsRenders = 0;
const requests = [];

const apiMovies = {
  "popular:1": [
    { id: 201, title: "Popular nueva", release_date: "2022-01-01", genre_ids: [1] },
    { id: 11, title: "Acción uno desde TMDB", release_date: "2020-01-01", genre_ids: [1] },
    { id: 90, title: "Ya valorada", release_date: "2019-01-01", genre_ids: [2] },
    { id: 92, title: "Pendiente", release_date: "2018-01-01", genre_ids: [2] }
  ],
  "popular:2": [
    { id: 202, title: "Popular segunda página", release_date: "2023-01-01", genre_ids: [3] },
    { id: 201, title: "Popular repetida", release_date: "2022-01-01", genre_ids: [1] },
    { id: 93, title: "Oculta", release_date: "2017-01-01", genre_ids: [2] },
    { id: 96, title: "Remake moderno", release_date: "2021-01-01", genre_ids: [4] }
  ],
  "search:1": [
    { id: 999, title: "Resultado buscado", release_date: "2024-01-01", genre_ids: [3] }
  ]
};

const ctx = {
  tmdbCredential: { value: "synthetic-token" },
  catalogQuery: query,
  get tmdbRequestSerial() { return requestSerial; },
  set tmdbRequestSerial(value) { requestSerial = value; },
  get tmdbMode() { return mode; },
  set tmdbMode(value) { mode = value; },
  get tmdbLoading() { return loading; },
  set tmdbLoading(value) { loading = value; },
  tmdbError: "",
  tmdbResults: results,
  get recommendationCandidates() { return candidates; },
  set recommendationCandidates(value) { candidates = value; },
  tmdbPage: page,
  tmdbTotalPages: totalPages,
  currentPage: "catalog",
  uniqueDiscoveryMovies,
  async ensureTMDBGenres() {},
  async tmdbRequest(path, params) {
    requests.push({ path, params: { ...params } });
    if (path === "/genre/movie/list") return { genres: [] };
    const key = (path === "/movie/popular" ? "popular" : "search") + ":" + params.page;
    return { page: params.page, total_pages: totalPages, results: apiMovies[key] || [] };
  },
  fromTMDB(raw) {
    const genres = { 1: "Acción", 2: "Drama", 3: "Comedia", 4: "Drama" };
    return {
      id: String(raw.id), tmdbId: String(raw.id), title: raw.title,
      year: Number(raw.release_date.slice(0, 4)),
      genres: [genres[raw.genre_ids[0]]], tags: [], source: "tmdb",
      score: raw.id === 201 ? 9.8 : (raw.id === 202 ? 9.4 : 8.5)
    };
  },
  renderTMDBResults() { resultsRenders += 1; },
  renderApp() { rerenders += 1; },
  get catalogQuery() { return query; },
  set catalogQuery(value) { query = value; }
};

const browser = createTMDBBrowserActions(ctx);
await browser.loadTMDBPage(1, "popular", false);
assert.deepEqual(candidates.map(movie => movie.tmdbId), ["201", "11", "90", "92"],
  "Solo la respuesta popular debe crear el pool temporal de candidatas.");
assert.equal(rerenders, 1, "La lista recomendada debe recalcularse tras cargar populares.");
assert.equal(loading, false);

await browser.loadTMDBPage(2, "popular", true);
assert.deepEqual(candidates.map(movie => movie.tmdbId), ["201", "11", "90", "92", "202", "93", "96"],
  "La paginación debe añadir películas nuevas, deduplicar la página repetida y conservar IDs distintos.");
assert.equal(candidates.filter(movie => movie.tmdbId === "201").length, 1);
assert.equal(rerenders, 2);

query = "Duna";
await browser.loadTMDBPage(1, "search", false);
assert.deepEqual(candidates.map(movie => movie.tmdbId), ["201", "11", "90", "92", "202", "93", "96"],
  "Una búsqueda manual no debe reemplazar el pool genérico de películas populares.");
assert.deepEqual(results.map(movie => movie.tmdbId), ["999"]);
assert.equal(rerenders, 3);
assert.ok(requests.some(item => item.path === "/movie/popular"));
assert.ok(requests.some(item => item.path === "/search/movie" && item.params.query === "Duna"));

const localCatalog = [
  { title: "Acción uno", tmdbId: "11", genres: ["Acción"], score: 9.0 },
  { title: "Ya vista", tmdbId: "90", genres: ["Drama"], score: 10 },
  { title: "Solo historial", tmdbId: "91", genres: ["Drama"], score: 10, source: "history" },
  { title: "Pendiente", tmdbId: "92", genres: ["Acción"], score: 9.7 },
  { title: "Oculta", tmdbId: "93", genres: ["Acción"], score: 9.6 },
  { title: "Remake clásico", tmdbId: "95", genres: ["Drama"], score: 8.4 },
  { title: "Remake moderno", tmdbId: "96", genres: ["Drama"], score: 8.3 }
];
const ranking = createRecommendationRanking({
  catalog: localCatalog,
  recommendationCandidates: candidates,
  buildProfile() { return { average: 6.5 }; },
  uniqueDiscoveryMovies,
  isMovieInCollection(title, tmdbId) { return ["90", "92", "93"].includes(String(tmdbId || "")); },
  predictRating(movie) {
    const score = Number(movie.score) || 7.0;
    return { score, freshFeatures: 0, matches: [] };
  },
  state: { rated: [] },
  findMovie() { return null; },
  ratingValue() { return null; }
});
for (const rankingMode of ["balanced", "affinity", "variety"]) {
  const list = ranking.getRecommendations(30, rankingMode);
  const ids = list.map(movie => movie.tmdbId);
  assert.equal(ids.length, new Set(ids).size, "No debe duplicarse una identidad en " + rankingMode);
  assert.ok(ids.includes("201"), "La candidata remota elegible debe llegar al ranking de " + rankingMode);
  assert.ok(ids.includes("202"), "La segunda página también debe alimentar el ranking de " + rankingMode);
  assert.ok(!ids.includes("90"), "Las valoradas/vistas se excluyen en todos los modos");
  assert.ok(!ids.includes("92"), "Las pendientes se excluyen en todos los modos");
  assert.ok(!ids.includes("93"), "Las ocultas se excluyen en todos los modos");
  assert.ok(!ids.includes("91"), "Los registros solo de historial no son candidatas");
  assert.ok(!ids.includes("999"), "Los resultados de búsqueda no invaden el pool de recomendación");
  assert.ok(ids.includes("95") && ids.includes("96"), "Los remakes con IDs TMDB diferentes se conservan");
}
assert.equal(candidates.some(movie => movie.title === "Resultado buscado"), false,
  "El pool de candidatas es temporal y separado del conjunto de resultados de búsqueda.");
console.log("Candidatas TMDB correctas: pool en memoria, paginación, búsqueda aislada, deduplicación, exclusiones y tres modos.");
