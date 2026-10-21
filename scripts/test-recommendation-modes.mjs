import assert from "node:assert/strict";
import { createRecommendationPreferences, DEFAULT_RECOMMENDATION_MODE, RECOMMENDATION_MODE_KEY } from "../js/recommendations/preferences.js";
import { createRecommendationRanking } from "../js/recommendations/ranking.js";
import { uniqueDiscoveryMovies } from "../js/core/movie-utils.js";

const preferenceValues = new Map();
const memoryStorage = {
  getItem(key) { return preferenceValues.has(key) ? preferenceValues.get(key) : null; },
  setItem(key, value) { preferenceValues.set(key, String(value)); }
};
const preferences = createRecommendationPreferences(() => memoryStorage);
assert.equal(preferences.getMode(), DEFAULT_RECOMMENDATION_MODE);
assert.equal(preferences.setMode("variety"), "variety");
assert.equal(memoryStorage.getItem(RECOMMENDATION_MODE_KEY), "variety");
assert.equal(preferences.getMode(), "variety");
assert.equal(preferences.setMode("unknown"), "variety", "Un modo inválido no debe sobrescribir la elección válida.");
memoryStorage.setItem(RECOMMENDATION_MODE_KEY, "unknown");
assert.equal(preferences.getMode(), DEFAULT_RECOMMENDATION_MODE);

const blocked = createRecommendationPreferences(() => { throw new Error("blocked"); });
assert.equal(blocked.getMode(), DEFAULT_RECOMMENDATION_MODE);
assert.equal(blocked.setMode("affinity"), "affinity", "La función sigue funcionando si no se puede persistir storage.");
assert.equal(blocked.getMode(), DEFAULT_RECOMMENDATION_MODE);

const movies = [
  { title: "Acción uno", tmdbId: "11", genres: ["Acción"], score: 9.0 },
  { title: "Acción dos", tmdbId: "12", genres: ["Acción"], score: 8.8 },
  { title: "Drama uno", tmdbId: "13", genres: ["Drama"], score: 8.7 },
  { title: "Comedia uno", tmdbId: "14", genres: ["Comedia"], score: 8.6 },
  { title: "Misterio uno", tmdbId: "15", genres: ["Misterio"], score: 8.5 },
  { title: "Acción uno alternativo", tmdbId: "11", genres: ["Acción"], score: 9.0 },
  { title: "Ya vista", tmdbId: "90", genres: ["Drama"], score: 10.0 },
  { title: "Solo historial", tmdbId: "91", genres: ["Drama"], score: 10.0, source: "history" },
  { title: "Pendiente", tmdbId: "92", genres: ["Acción"], score: 9.7 },
  { title: "Oculta", tmdbId: "93", genres: ["Acción"], score: 9.6 },
  { title: "Remake clásico", tmdbId: "95", genres: ["Drama"], score: 8.4 },
  { title: "Remake moderno", tmdbId: "96", genres: ["Drama"], score: 8.3 }
];
const ctx = {
  get catalog() { return movies; },
  buildProfile() { return { average: 6.5 }; },
  uniqueDiscoveryMovies,
  isMovieInCollection(title, tmdbId) { return ["90", "92", "93"].includes(String(tmdbId || "")); },
  predictRating(movie) {
    const matches = movie.tmdbId === "12" ? 3 : (movie.tmdbId === "13" ? 2 : 0);
    return { score: movie.score, freshFeatures: 0, matches: Array.from({ length: matches }, (_, i) => ({ name: "señal " + i })) };
  },
  state: { rated: [] },
  findMovie() { return null; },
  ratingValue() { return null; }
};
const ranking = createRecommendationRanking(ctx);
const affinity = ranking.getRecommendations(3, "affinity");
const balanced = ranking.getRecommendations(3, "balanced");
const variety = ranking.getRecommendations(3, "variety");
assert.deepEqual(affinity.map(movie => movie.tmdbId), ["11", "12", "13"],
  "Afinidad sigue la estimación prevista y no penaliza géneros repetidos.");
assert.deepEqual(variety.map(movie => movie.tmdbId), ["11", "13", "14"],
  "Variedad favorece géneros distintos cuando las notas estimadas son comparables.");
assert.ok(balanced.some(movie => movie.tmdbId === "12"), "Equilibrado conserva afinidad cuando el ranking está próximo.");
for (const list of [affinity, balanced, variety]) {
  const ids = list.map(movie => movie.tmdbId);
  assert.equal(ids.length, new Set(ids).size, "No puede repetirse una identidad dentro de una mezcla.");
  assert.ok(!ids.includes("90"), "Las películas vistas/valoradas deben excluirse en todos los modos.");
  assert.ok(!ids.includes("91"), "Entradas solo de historial no deben ser candidatas.");
  assert.ok(!ids.includes("92"), "Las pendientes deben excluirse sin depender del modo.");
  assert.ok(!ids.includes("93"), "Las ocultas deben excluirse sin depender del modo.");
}
const allVariety = ranking.getRecommendations(20, "variety");
assert.notEqual(allVariety.find(movie => movie.tmdbId === "95"), undefined);
assert.notEqual(allVariety.find(movie => movie.tmdbId === "96"), undefined,
  "Los remakes con IDs TMDB distintos deben conservar su identidad.");

const [pageViews, eventHandlers, cacheTest, modularTest, spec, workflow] = await Promise.all([
  import("node:fs/promises").then(fs => fs.readFile("js/ui/page-views.js", "utf8")),
  import("node:fs/promises").then(fs => fs.readFile("js/app/event-handlers.js", "utf8")),
  import("node:fs/promises").then(fs => fs.readFile("scripts/test-cache-versioning.mjs", "utf8")),
  import("node:fs/promises").then(fs => fs.readFile("scripts/test-modular-architecture.mjs", "utf8")),
  import("node:fs/promises").then(fs => fs.readFile("openspec/specs/recommendations/spec.md", "utf8")),
  import("node:fs/promises").then(fs => fs.readFile(".github/workflows/quality.yml", "utf8"))
]);
assert.match(pageViews, /data-action="recommendation-mode"/);
assert.match(pageViews, /aria-pressed=/);
assert.match(eventHandlers, /action === "recommendation-mode"/);
assert.match(spec, /Modos de recomendación ajustables/);
assert.match(cacheTest, /js\/recommendations\/preferences\.js/);
assert.match(modularTest, /js\/recommendations\/preferences\.js/);
assert.match(workflow, /test-recommendation-modes\.mjs/);

console.log("Modos de recomendaciones correctos: persistencia local, afinidad, variedad, exclusión e identidad.");
