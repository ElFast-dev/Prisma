import assert from "node:assert/strict";
import { createRecommendationRanking } from "../js/recommendations/ranking.js";

let profile = { count: 0, average: 6.5 };
let predictions = 0;
const candidates = [
  { title: "Película local", tmdbId: "101", genres: ["Drama"], source: "catalog" },
  { title: "Película remota", tmdbId: "202", genres: ["Ciencia ficción"], source: "tmdb" }
];

const ranking = createRecommendationRanking({
  catalog: [candidates[0]],
  recommendationCandidates: [candidates[1]],
  buildProfile() { return profile; },
  uniqueDiscoveryMovies(items) { return items; },
  isMovieInCollection() { return false; },
  predictRating(movie) {
    predictions += 1;
    return { score: 7, matches: [], freshFeatures: 0, title: movie.title };
  },
  state: { rated: [] },
  findMovie() { return null; },
  ratingValue() { return null; }
});

for (const mode of ["balanced", "affinity", "variety"]) {
  assert.deepEqual(
    ranking.getRecommendations(8, mode),
    [],
    "Un perfil sin valoraciones válidas debe producir cero recomendaciones en modo " + mode
  );
}
assert.equal(predictions, 0, "No se deben puntuar candidatas con el perfil vacío");

// La exploración y el ranking puro de candidatas explícitamente puntuadas no se bloquean.
const explicitlyScored = [
  { title: "Candidata sintética", prediction: { score: 8, matches: [] } }
];
assert.equal(ranking.rankCandidates(explicitlyScored, 8, "affinity").length, 1);

profile = { count: 1, average: 7 };
const firstRatingRecommendations = ranking.getRecommendations(8, "balanced");
assert.equal(firstRatingRecommendations.length, 2,
  "Tras una primera valoración válida se permite puntuar candidatas");
assert.equal(predictions, 2);
console.log("Perfil vacío: recomendaciones bloqueadas; ranking puro y primera valoración: correctos.");
