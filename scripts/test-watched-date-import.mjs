import assert from "node:assert/strict";
import { extractPersonalCollections, mergeMovieEntries } from "../js/import-export/personal-data.js";

const addedOnly = extractPersonalCollections({
  cH: [{ id: "local-1", t: "Synthetic Added Date Movie", a: "2018-03-04T00:00:00.000Z" }]
});
assert.equal(addedOnly.watched.length, 1);
assert.equal(addedOnly.watched[0].addedAt, "2018-03-04T00:00:00.000Z");
assert.equal(addedOnly.watched[0].addedAtSource, "imported-collection",
  "La procedencia de la incorporación debe conservarse por separado para un proxy opcional.");
assert.equal(Object.prototype.hasOwnProperty.call(addedOnly.watched[0], "watchedAt"), false,
  "El campo a/addedAt no debe convertirse en watchedAt.");
assert.equal(Object.prototype.hasOwnProperty.call(addedOnly.watched[0], "watchedAtSource"), false);

const explicitDate = "2021-08-09T14:25:00.000Z";
const explicit = extractPersonalCollections({
  cH: [{
    id: "local-2",
    t: "Synthetic Explicit Watch Date Movie",
    a: "2019-01-01T00:00:00.000Z",
    watchedAt: explicitDate
  }]
}).watched[0];
assert.equal(explicit.addedAt, "2019-01-01T00:00:00.000Z",
  "La fecha de añadido debe permanecer separada.");
assert.equal(explicit.watchedAt, explicitDate);
assert.equal(explicit.watchedAtSource, "imported-explicit");

const explicitSnakeCase = extractPersonalCollections({
  cH: [{ id: "local-3", t: "Synthetic Snake Case Movie", watched_at: explicitDate }]
}).watched[0];
assert.equal(explicitSnakeCase.watchedAt, explicitDate);
assert.equal(explicitSnakeCase.watchedAtSource, "imported-explicit");

const legacy = {
  title: "Synthetic Merge Movie",
  tmdbId: "771122",
  watchedAt: "2014-05-06T00:00:00.000Z"
};
const freshExplicit = {
  title: "Synthetic Merge Movie",
  tmdbId: "771122",
  watchedAt: explicitDate,
  watchedAtSource: "imported-explicit"
};
const merged = mergeMovieEntries(legacy, freshExplicit);
assert.equal(merged.watchedAt, explicitDate,
  "Al reimportar una fecha explícita debe sustituir el timestamp antiguo sin procedencia.");
assert.equal(merged.watchedAtSource, "imported-explicit");

const incomingActionTime = {
  title: "Synthetic Merge Movie",
  tmdbId: "771122",
  watchedAt: "2025-01-01T00:00:00.000Z",
  watchedAtSource: "action-time"
};
const legacyAfterActionMerge = mergeMovieEntries(legacy, incomingActionTime);
assert.equal(legacyAfterActionMerge.watchedAt, legacy.watchedAt,
  "Una fecha de registro de acción no debe reemplazar un timestamp heredado existente.");
assert.equal(legacyAfterActionMerge.watchedAtSource, undefined);

const confirmed = {
  title: "Synthetic Merge Movie",
  tmdbId: "771122",
  watchedAt: "2013-04-05T00:00:00.000Z",
  watchedAtSource: "user-confirmed"
};
const confirmedMerge = mergeMovieEntries(confirmed, freshExplicit);
assert.equal(confirmedMerge.watchedAt, confirmed.watchedAt,
  "Una fecha confirmada por la persona debe prevalecer sobre una importación posterior.");
assert.equal(confirmedMerge.watchedAtSource, "user-confirmed");

console.log("Importación de fechas verificada: addedAt no se convierte en watchedAt y las fechas explícitas conservan su procedencia.");
