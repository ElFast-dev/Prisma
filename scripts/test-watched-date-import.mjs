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

const previouslyImported = {
  title: "Synthetic Existing Collection Movie",
  tmdbId: "771120",
  addedAt: "2018-03-04T00:00:00.000Z"
};
const reimported = mergeMovieEntries(previouslyImported, {
  title: "Synthetic Existing Collection Movie",
  tmdbId: "771120",
  addedAt: "2018-03-04T00:00:00.000Z",
  addedAtSource: "imported-collection"
});
assert.equal(reimported.addedAtSource, "imported-collection",
  "Volver a importar debe incorporar el marcador de procedencia a una fecha añadida ya existente.");
assert.equal(Object.prototype.hasOwnProperty.call(reimported, "watchedAt"), false,
  "La reimportación no debe convertir la fecha añadida en watchedAt.");

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

const confirmedChallengeImport = {
  title: "Synthetic Merge Movie",
  tmdbId: "771122",
  watchedAt: "2026-10-20T06:20:00.000Z",
  watchedAtSource: "imported-explicit",
  watchDateConfidence: "streak-confirmed"
};
const correctedChallengeMerge = mergeMovieEntries({
  title: "Synthetic Merge Movie",
  tmdbId: "771122",
  watchedAt: "2026-10-21T12:00:00.000Z",
  watchedAtSource: "user-confirmed",
  watchDateConfidence: "user-confirmed"
}, confirmedChallengeImport);
assert.equal(correctedChallengeMerge.watchedAt, confirmedChallengeImport.watchedAt,
  "La reimportación de una fecha de reto verificada debe corregir un día local obsoleto guardado antes.");
assert.equal(correctedChallengeMerge.watchedAtSource, "imported-explicit");
assert.equal(correctedChallengeMerge.watchDateConfidence, "streak-confirmed");

const challengeExport = {
  platform: "android",
  version: 2,
  movies: {
    cH: [
      { id: "source-code-record", tmId: 45612, t: "Source Code", a: "2026-01-15T05:56:02.305Z" },
      { id: "before-challenge", tmId: 10001, t: "Retrospective Movie", a: "2025-11-06T00:22:23.302Z" },
      { id: "challenge-late-utc", tmId: 10002, t: "Late UTC Movie", a: "2026-07-09T04:56:59.336Z" }
    ],
    cW: [],
    cHid: []
  }
};
const importedChallenge = extractPersonalCollections(challengeExport).watched;
const sourceCode = importedChallenge.find(movie => movie.tmdbId === "45612");
const retrospective = importedChallenge.find(movie => movie.tmdbId === "10001");
const lateUtc = importedChallenge.find(movie => movie.tmdbId === "10002");
assert.equal(sourceCode.watchedAt, "2026-01-15T05:56:02.305Z");
assert.equal(sourceCode.watchedAtSource, "imported-explicit");
assert.equal(sourceCode.watchDateConfidence, "streak-confirmed");
assert.equal(retrospective.watchDateConfidence, "pre-streak-unverified");
assert.equal(Object.prototype.hasOwnProperty.call(retrospective, "watchedAt"), false,
  "Una fecha marcada antes del reto no debe tratarse como fecha real de visionado.");
assert.equal(lateUtc.watchedAt, "2026-07-09T04:56:59.336Z",
  "Debe preservarse el instante UTC original del visionado confirmado.");
assert.equal(lateUtc.watchDateConfidence, "streak-confirmed");

const staleRetrospective = mergeMovieEntries({
  title: "Retrospective Movie",
  tmdbId: "10001",
  watchedAt: "2025-11-06T00:22:23.302Z",
  watchedAtSource: "action-time"
}, retrospective);
assert.equal(Object.prototype.hasOwnProperty.call(staleRetrospective, "watchedAt"), false,
  "La reimportación fiable debe retirar una marca de acción retrospectiva heredada.");
const personallyConfirmed = mergeMovieEntries({
  title: "Retrospective Movie",
  tmdbId: "10001",
  watchedAt: "2025-10-01T13:00:00.000Z",
  watchedAtSource: "user-confirmed"
}, retrospective);
assert.equal(personallyConfirmed.watchedAt, "2025-10-01T13:00:00.000Z",
  "Una fecha confirmada manualmente no debe sobrescribirse sin permiso.");

console.log("Importación verificada: fechas UTC, corte del reto personal y separación entre añadido y visionado.");
