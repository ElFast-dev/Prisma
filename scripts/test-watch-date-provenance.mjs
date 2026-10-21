import assert from "node:assert/strict";
import { createMovieActions } from "../js/app/movie-actions.js";

const movie = {
  title: "Película sintética",
  tmdbId: "778899",
  year: 2011,
  genres: ["Drama"],
  tags: []
};

function createHarness(options) {
  const input = options || {};
  const state = {
    rated: (input.rated || []).map(record => ({ ...record })),
    watched: (input.watched || []).map(record => ({ ...record })),
    watchlist: [],
    hidden: [],
    events: []
  };
  const elements = {
    "#ratingInput": { value: "8" },
    "#ratingNote": { value: "" },
    "#modalRoot": { innerHTML: "" }
  };
  const ctx = {
    state,
    modalDraft: { movie: { ...movie }, emotions: [] },
    movieDetail: null,
    ratingReturnDetail: false,
    $: selector => elements[selector] || {},
    sameMovieRecord(left, right) {
      if (!left || !right) return false;
      const leftId = String(left.tmdbId || left.tmId || "");
      const rightId = String(right.tmdbId || right.tmId || "");
      if (leftId && rightId) return leftId === rightId;
      return String(left.title || "").trim().toLowerCase() === String(right.title || "").trim().toLowerCase()
        && String(left.year || "") === String(right.year || "");
    },
    uniqueStrings: values => [...new Set(values)],
    titleKey: title => String(title || "").trim().toLowerCase(),
    movieTmdbId: entry => String(entry && (entry.tmdbId || entry.tmId) || ""),
    findMovie: () => ({ ...movie }),
    toast() {},
    logEvent() {},
    async persistState() {},
    combineMovies() {},
    renderApp() {},
    renderMovieDetails() {}
  };
  return { ctx, state, actions: createMovieActions(ctx) };
}

const firstRating = createHarness();
await firstRating.actions.saveRating();
assert.equal(firstRating.state.rated.length, 1);
assert.equal(firstRating.state.watched.length, 1);
assert.equal(typeof firstRating.state.watched[0].watchedAt, "string");
assert.ok(Number.isFinite(Date.parse(firstRating.state.watched[0].watchedAt)),
  "Guardar una nueva valoración registra el momento de esa acción.");

const oldUpdatedAt = "2018-04-12T09:30:00.000Z";
const editedRating = createHarness({
  rated: [{ ...movie, rating: 6, updatedAt: oldUpdatedAt }]
});
await editedRating.actions.saveRating();
assert.equal(editedRating.state.watched.length, 1);
assert.equal(Object.prototype.hasOwnProperty.call(editedRating.state.watched[0], "watchedAt"), false,
  "Editar una nota antigua sin fecha de visionado no debe fabricar watchedAt desde updatedAt.");

const explicitWatchedAt = "2017-09-03T12:00:00.000Z";
const existingWatch = createHarness({
  rated: [{ ...movie, rating: 6, updatedAt: oldUpdatedAt }],
  watched: [{ ...movie, watchedAt: explicitWatchedAt }]
});
await existingWatch.actions.saveRating();
assert.equal(existingWatch.state.watched[0].watchedAt, explicitWatchedAt,
  "Al editar una nota se conserva la fecha de visionado que ya existía.");

const explicitMark = createHarness({
  rated: [{ ...movie, rating: 6, updatedAt: oldUpdatedAt }]
});
await explicitMark.actions.markWatched(movie.title, movie.tmdbId);
assert.ok(Number.isFinite(Date.parse(explicitMark.state.watched[0].watchedAt)),
  "La acción explícita «marcar como vista» debe registrar su propia fecha.");
assert.notEqual(explicitMark.state.watched[0].watchedAt, oldUpdatedAt,
  "Marcar como vista no debe reutilizar la fecha de edición de la nota.");

console.log("Procedencia de fechas verificada: nuevas acciones explícitas se fechan y la edición de notas no inventa watchedAt.");
