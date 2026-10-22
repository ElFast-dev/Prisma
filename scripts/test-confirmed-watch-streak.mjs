import assert from "node:assert/strict";
import { createImportExportActions } from "../js/import-export/actions.js";
import { extractPersonalCollections, extractPersonalRatings, hasImportedCollection, mergeMovieEntries, mergeMovieListByTitle } from "../js/import-export/personal-data.js";
import { emptyState, ensureState } from "../js/core/state-model.js";
import { dateOnlyInTimeZone, listDateOnlyRange, formatPanamaDateMDY } from "../js/core/date-utils.js";
import { resolveExplicitWatchedAt } from "../js/ui/presentation-utils.js";
import { buildConfirmedWatchStreakDays, normalizeConfirmedWatchStreak } from "../js/core/watch-streak.js";
import { createCollectionModel } from "../js/collection/collection-model.js";
import { movieIdentityKey, movieTmdbId, normalizeMovie, ratingValue, sameMovieRecord, titleKey } from "../js/core/movie-utils.js";
import { createPageViews } from "../js/ui/page-views.js";
import { createModalViews } from "../js/ui/modal-views.js";

const exportFixture = {
  platform: "android",
  version: 2,
  movies: {
    cH: [
      { id: "source-code-record", tmId: 45612, t: "Source Code", a: "2026-01-15T05:56:02.305Z" },
      { id: "same-day-second-movie", tmId: 900001, t: "Otra película conservada", a: "2026-01-15T22:00:00.000Z" },
      { id: "later-movie", tmId: 900002, t: "Película posterior", a: "2026-07-09T04:56:59.336Z" },
      { id: "retrospective-movie", tmId: 900003, t: "Película retrospectiva", a: "2025-11-06T00:22:23.302Z" },
      { id: "edge-day-18", tmId: 19585, t: "G-Force", a: "2026-10-18T05:23:00Z" },
      { id: "edge-day-19", tmId: 433499, t: "Finding Steve McQueen", a: "2026-10-19T07:41:00Z" },
      { id: "edge-day-20", tmId: 76493, t: "The Dictator", a: "2026-10-20T06:31:00Z" },
      { id: "edge-day-21", tmId: 769, t: "GoodFellas", a: "2026-10-22T04:16:00Z" },
      { id: "after-streak-movie", tmId: 900004, t: "Película posterior a la racha", a: "2026-11-02T18:30:00Z" }
    ],
    cW: [],
    cHid: [],
    rM: []
  }
};

const extracted = extractPersonalCollections(exportFixture);
assert.ok(extracted.confirmedWatchStreak, "La exportación personal reconocida debe crear una racha confirmada.");
assert.equal(extracted.confirmedWatchStreak.startDate, "2026-01-15");
assert.equal(extracted.confirmedWatchStreak.endDate, "2026-10-21");
assert.equal(extracted.confirmedWatchStreak.dailyTarget, 1);
assert.equal(extracted.confirmedWatchStreak.totalDays, 280);
assert.equal(extractPersonalCollections({ platform: "android", version: 2, movies: { cH: [{ t: "Otra película", a: "2026-01-15T05:00:00Z" }] } }).confirmedWatchStreak, null,
  "La racha no debe aparecer en perfiles que no importen la exportación reconocida.");

const dateRange = listDateOnlyRange("2026-01-15", "2026-10-21");
assert.equal(dateRange.length, 280);
assert.equal(new Set(dateRange).size, 280);
assert.equal(dateRange[0], "2026-01-15");
assert.equal(dateRange[279], "2026-10-21");
for (let i = 1; i < dateRange.length; i += 1) {
  const previous = Date.parse(dateRange[i - 1] + "T00:00:00.000Z");
  const current = Date.parse(dateRange[i] + "T00:00:00.000Z");
  assert.equal(current - previous, 86400000, "Cada fecha debe seguir exactamente al día anterior.");
}
assert.equal(dateOnlyInTimeZone("2026-07-09T04:56:59.336Z"), "2026-07-08");
assert.deepEqual([
  formatPanamaDateMDY("2026-10-18T05:23:00Z"),
  formatPanamaDateMDY("2026-10-19T07:41:00Z"),
  formatPanamaDateMDY("2026-10-20T06:31:00Z"),
  formatPanamaDateMDY("2026-10-22T04:16:00Z")
], ["10/18/2026", "10/19/2026", "10/20/2026", "10/21/2026"],
"Las cuatro fechas reales deben mostrarse según el calendario de Panamá, no el UTC.");
assert.equal(resolveExplicitWatchedAt(null, { updatedAt: "2026-10-21T06:31:56.141Z" }), null,
  "La fecha de una valoración no puede sustituir una fecha de visionado ausente.");
assert.equal(resolveExplicitWatchedAt({ watchedAt: "2026-10-20T06:31:00Z" }, { updatedAt: "2026-10-21T06:31:56.141Z" }), "2026-10-20T06:31:00Z",
  "La fecha explícita de visionado debe prevalecer sobre la fecha de valoración.");

const collectionState = {
  watched: [{ id: "dictator", tmdbId: "76493", title: "The Dictator", addedAt: "2026-10-20T06:31:00Z" }],
  rated: [{ id: "dictator", tmdbId: "76493", title: "The Dictator", rating: 6, updatedAt: "2026-10-21T06:31:56.141Z" }],
  watchlist: [],
  hidden: []
};
const collectionModel = createCollectionModel({
  getState: () => collectionState,
  getCollectionTab: () => "history",
  getCollectionQuery: () => "",
  getCollectionGenres: () => [],
  getOnlyReleased: () => false,
  getCollectionSort: () => "date",
  getCollectionDirection: () => "desc",
  findMovie: () => ({}),
  titleKey,
  displayGenre: value => value,
  movieIdentityKey,
  movieTmdbId,
  ratingValue,
  sameMovieRecord,
  hasTrustedTMDBScore: () => false
});
assert.equal(collectionModel.getCollectionItems("history")[0].watchedAt, null,
  "La fecha de incorporación y la fecha de valoración no deben convertirse en un visionado.");
collectionState.watched[0].watchedAt = "2026-10-20T06:31:00Z";
assert.equal(collectionModel.getCollectionItems("history")[0].watchedAt, "2026-10-20T06:31:00Z",
  "El modelo de colección debe mantener una fecha de visionado explícita.");

let state = emptyState();
state.watched.push({
  id: "stale-challenge-date",
  tmdbId: "76493",
  title: "The Dictator",
  watchedAt: "2026-10-21T12:00:00.000Z",
  watchedAtSource: "user-confirmed",
  watchDateConfidence: "user-confirmed"
});
const writes = [];
let renderCount = 0;
const ctx = {
  get state() { return state; },
  set state(value) { state = value; },
  customCatalog: [],
  CATALOG_KEY: "catalogCustom",
  tmdbCredential: null,
  extractPersonalRatings,
  extractPersonalCollections,
  hasImportedCollection,
  mergeMovieEntries,
  mergeMovieListByTitle,
  movieIdentityKey,
  ratingValue,
  normalizeMovie,
  async dbSet(key, value) { writes.push({ key, value }); },
  async persistState() {},
  combineMovies() {},
  renderApp() { renderCount += 1; },
  toast() {},
  ensureState
};
const actions = createImportExportActions(ctx);
await actions.importPersonalJSON({ text: async () => JSON.stringify(exportFixture) });

assert.equal(state.confirmedWatchStreak.totalDays, 280);
assert.equal(state.confirmedWatchStreak.dailyTarget, 1);
assert.equal(state.watched.length, 9,
  "La reimportación corrige la fila con conflicto sin duplicar películas.");
for (const raw of exportFixture.movies.cH) {
  const imported = state.watched.find(movie => String(movie.id) === String(raw.id));
  assert.ok(imported, "Debe conservarse la película " + raw.t + ".");
  assert.equal(imported.watchedAt, raw.a,
    "La fecha del historial debe importarse para todas las películas, no solo para las que caen dentro de la racha: " + raw.t);
  assert.equal(imported.addedAt, raw.a,
    "El timestamp original debe mantenerse para preservar el dato de origen.");
}
const retrospective = state.watched.find(movie => movie.id === "retrospective-movie");
assert.equal(retrospective.watchDateConfidence, "explicit-source",
  "Las fechas anteriores a la racha también son utilizables cuando proceden explícitamente del historial Android v2.");
assert.equal(state.watched.find(movie => movie.id === "after-streak-movie").watchDateConfidence, "explicit-source",
  "Las fechas posteriores al reto no deben depender del límite artificial de 280 días.");
const repairedMovie = state.watched.find(movie => movie.tmdbId === "76493");
assert.equal(repairedMovie.watchedAt, "2026-10-20T06:31:00Z");
assert.equal(repairedMovie.watchDateConfidence, "streak-confirmed");
assert.equal(writes.some(write => write.key === "catalogCustom"), true);
assert.equal(renderCount, 1);

const backupRestored = ensureState(JSON.parse(JSON.stringify(state)));
assert.deepEqual(backupRestored.confirmedWatchStreak, state.confirmedWatchStreak,
  "La racha local debe conservarse al restaurar una copia de Prisma.");
assert.equal(ensureState({
  confirmedWatchStreak: {
    source: "user-confirmed", startDate: "2026-01-15", endDate: "2026-10-21",
    dailyTarget: 2, totalDays: 280
  }
}).confirmedWatchStreak, null, "La normalización debe rechazar metas inconsistentes.");

const daily = buildConfirmedWatchStreakDays(state.confirmedWatchStreak, state.watched);
assert.equal(daily.length, 280, "La racha debe crear exactamente una celda por día.");
assert.ok(daily.every(day => day.count === 1 && day.confirmed && day.source === "user-confirmed"));
assert.equal(daily[0].date, "2026-01-15");
assert.equal(daily.at(-1).date, "2026-10-21");
assert.equal(daily[0].title, "Source Code");
assert.equal(daily[0].additionalMovieCount, 1,
  "Dos películas el mismo día no deben convertirse en dos días de racha.");
assert.equal(daily.find(day => day.date === "2026-07-08").title, "Película posterior",
  "El día se agrupa con la zona horaria de Panamá.");
assert.equal(daily.find(day => day.date === "2026-10-18").title, "G-Force");
assert.equal(daily.find(day => day.date === "2026-10-19").title, "Finding Steve McQueen");
assert.equal(daily.find(day => day.date === "2026-10-20").title, "The Dictator");
assert.equal(daily.find(day => day.date === "2026-10-21").title, "GoodFellas",
  "GoodFellas debe quedar el día 21 de Panamá aunque la marca UTC sea del día 22.");
assert.equal(daily.find(day => day.date === "2026-01-16").title, null,
  "Una fecha de racha puede quedar confirmada aunque se haya perdido la película.");

const escapeHTML = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const pageViews = createPageViews({ state, escapeHTML });
const panel = pageViews.renderConfirmedWatchStreakPanel();
assert.match(panel, /15 de enero de 2026 – 21 de octubre de 2026/);
assert.match(panel, /280/);
assert.match(panel, /1 película cada día/);
assert.match(panel, /no inventa títulos/);
assert.equal((panel.match(/data-watch-streak-date=/g) || []).length, 280);
assert.equal((panel.match(/class="watch-streak-day /g) || []).length, 280,
  "La vista debe mostrar un único marcador para cada día del intervalo.");
assert.equal((panel.match(/<details class="watch-streak-month"/g) || []).length, 10,
  "El calendario debe dividir el intervalo en vistas mensuales.");
assert.equal((panel.match(/<details class="watch-streak-month"[^>]* open>/g) || []).length, 1,
  "Solo el mes más reciente debe estar abierto inicialmente, evitando mostrar de enero a octubre a la vez.");
assert.ok(panel.includes('class="watch-streak-day-outside"'),
  "Los días fuera del reto deben conservar la alineación real del calendario sin contarse como días de racha.");
assert.equal(createPageViews({ state: emptyState(), escapeHTML }).renderConfirmedWatchStreakPanel(), "",
  "La racha personal no debe mostrarse a una instalación vacía ni a otra persona sin importación.");

const modalRoot = { innerHTML: "" };
const modalState = {
  watched: [{
    id: "dictator",
    tmdbId: "76493",
    title: "The Dictator",
    watchedAt: "2026-10-20T06:31:00Z",
    watchedAtSource: "imported-explicit",
    watchDateConfidence: "streak-confirmed"
  }]
};
const modalCtx = {
  $: selector => selector === "#modalRoot" ? modalRoot : null,
  movieDetail: {
    movie: {
      id: "dictator", tmdbId: "76493", title: "The Dictator", year: 2012,
      genres: [], productionCountries: [], posterUrl: "", backdropUrl: "",
      releaseDate: null, runtime: null, status: "released", overview: "",
      tagline: "", originalTitle: ""
    },
    data: null,
    loading: false,
    error: null
  },
  state: modalState,
  ratingFor: () => ({ title: "The Dictator", tmdbId: "76493", rating: 6, updatedAt: "2026-10-21T06:31:56.141Z" }),
  isInHistory: () => true,
  isInWatchlist: () => false,
  isHidden: () => false,
  sameMovieRecord,
  escapeHTML,
  displayGenre: value => value,
  dateLabel: value => value,
  formatWatchedDate: formatPanamaDateMDY,
  buildRatingMetrics: () => "",
  niceRuntime: () => "—",
  displayMovieStatus: () => "Estrenada",
  externalMovieUrl: () => "https://www.themoviedb.org/movie/76493",
  ratingValue: value => Number(value.rating),
  infoButton: () => "",
  personImage: () => ""
};
const modalViews = createModalViews(modalCtx);
modalViews.renderMovieDetails();
assert.match(modalRoot.innerHTML, /10\/20\/2026/,
  "La ficha de The Dictator debe mostrar su fecha de visionado del 20 de octubre en Panamá.");
assert.doesNotMatch(modalRoot.innerHTML, /10\/21\/2026/,
  "La fecha de actualización de la nota no puede aparecer como día de visionado.");
modalState.watched = [{ id: "dictator", tmdbId: "76493", title: "The Dictator" }];
modalViews.renderMovieDetails();
assert.match(modalRoot.innerHTML, /Fecha no registrada/,
  "Si no existe fecha explícita de visionado, la ficha no debe inventarla usando updatedAt.");
assert.doesNotMatch(modalRoot.innerHTML, /10\/21\/2026/,
  "La ausencia de fecha de visionado debe seguir siendo visible aunque haya updatedAt.");

console.log("Racha diaria verificada: 280 fechas consecutivas, una marca por día, importación local y títulos nunca inventados.");
