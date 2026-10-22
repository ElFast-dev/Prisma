import assert from "node:assert/strict";
import { createImportExportActions } from "../js/import-export/actions.js";
import { extractPersonalCollections, extractPersonalRatings, hasImportedCollection, mergeMovieEntries, mergeMovieListByTitle } from "../js/import-export/personal-data.js";
import { emptyState, ensureState } from "../js/core/state-model.js";
import { dateOnlyInTimeZone, listDateOnlyRange } from "../js/core/date-utils.js";
import { buildConfirmedWatchStreakDays, normalizeConfirmedWatchStreak } from "../js/core/watch-streak.js";
import { movieIdentityKey, normalizeMovie, ratingValue } from "../js/core/movie-utils.js";
import { createPageViews } from "../js/ui/page-views.js";

const exportFixture = {
  platform: "android",
  version: 2,
  movies: {
    cH: [
      { id: "source-code-record", tmId: 45612, t: "Source Code", a: "2026-01-15T05:56:02.305Z" },
      { id: "same-day-second-movie", tmId: 900001, t: "Otra película conservada", a: "2026-01-15T22:00:00.000Z" },
      { id: "later-movie", tmId: 900002, t: "Película posterior", a: "2026-07-09T04:56:59.336Z" },
      { id: "retrospective-movie", tmId: 900003, t: "Película retrospectiva", a: "2025-11-06T00:22:23.302Z" }
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

let state = emptyState();
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
assert.equal(state.watched.length, 4);
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
assert.equal(createPageViews({ state: emptyState(), escapeHTML }).renderConfirmedWatchStreakPanel(), "",
  "La racha personal no debe mostrarse a una instalación vacía ni a otra persona sin importación.");

console.log("Racha diaria verificada: 280 fechas consecutivas, una marca por día, importación local y títulos nunca inventados.");
