import assert from "node:assert/strict";
import { createRidgeRecommendationExperiment } from "../js/recommendations/ridge-evaluation.js";
import { createRecommendationEngine } from "../js/recommendations/engine.js";
import { movieFeatures } from "../js/recommendations/features.js";
import { ratingValue, movieTmdbId, titleKey } from "../js/core/movie-utils.js";

function fixtures(count) {
  return Array.from({ length: count }, function (_, index) {
    const genre = index % 2 === 0 ? "Drama" : "Comedia";
    const tags = index % 4 === 0 ? ["introspección", "amistad"]
      : (index % 4 === 1 ? ["acción", "persecución"]
        : (index % 4 === 2 ? ["misterio", "investigación"] : ["familia", "esperanza"]));
    const year = 1980 + (index % 40);
    const title = index < 2 ? "El mismo remake" : "Película de prueba " + index;
    const tmdbId = String(7000 + index);
    const target = (genre === "Drama" ? 8 : 4) + (index % 3 - 1) * 0.4 + (tags.includes("esperanza") ? 0.2 : 0);
    const record = {
      title, tmdbId, year, genres: [genre], tags,
      rating: Math.max(1, Math.min(10, target))
    };
    return record;
  });
}

function harness(records, allMovies) {
  const movieById = new Map(allMovies.map(movie => [String(movie.tmdbId), movie]));
  const engine = createRecommendationEngine({
    getRatings: () => records,
    findMovie: (title, id) => id != null ? (movieById.get(String(id)) || null) :
      (allMovies.find(movie => movie.title === title) || null),
    movieFeatures,
    ratingValue
  });
  return createRidgeRecommendationExperiment({
    getRatings: () => records,
    findMovie: (title, id) => id != null ? (movieById.get(String(id)) || null) :
      (allMovies.find(movie => movie.title === title) || null),
    movieFeatures,
    ratingValue,
    buildProfile: engine.buildProfile,
    predictRating: engine.predictRating,
    movieTmdbId,
    titleKey
  });
}

const records = fixtures(36);
const experiment = harness(records, records);
const result = experiment.evaluate();
assert.equal(result.available, true, "Una muestra sintética de 36 películas debe ser suficiente.");
assert.equal(result.count, 36);
assert.equal(result.outerFolds, 5);
assert.equal(result.foldsEvaluated, 5);
assert.equal(result.innerFolds, 3);
assert.deepEqual(result.alphaGrid, [0.1, 1, 10, 100]);
assert.ok(Number.isFinite(result.mae));
assert.ok(Number.isFinite(result.baselineMae));
assert.ok(Number.isFinite(result.deltaBaseMinusRidge));
assert.ok(Math.abs(result.deltaBaseMinusRidge - (result.baselineMae - result.mae)) < 1e-10);
assert.ok(result.predictionMin >= 1 && result.predictionMin <= 10);
assert.ok(result.predictionMax >= 1 && result.predictionMax <= 10);
assert.equal(Object.values(result.selectedAlphaCounts).reduce((sum, value) => sum + value, 0), 5,
  "Debe elegirse exactamente un alpha por pliegue externo.");

const repeated = experiment.evaluate();
assert.equal(repeated.mae, result.mae, "La evaluación debe ser determinista.");
assert.equal(repeated.baselineMae, result.baselineMae, "La referencia emparejada debe ser determinista.");
assert.deepEqual(repeated.selectedAlphaCounts, result.selectedAlphaCounts);

const insufficient = harness(records.slice(0, 29), records).evaluate();
assert.equal(insufficient.available, false);
assert.equal(insufficient.count, 29);
assert.equal(insufficient.mae, null);
assert.equal(insufficient.baselineMae, null);
assert.match(insufficient.reason, /al menos 30/);

const duplicated = records.concat([{ ...records[2], rating: 1 }]);
const duplicateResult = harness(duplicated, records).evaluate();
assert.equal(duplicateResult.count, records.length,
  "Registros repetidos con el mismo ID TMDB no deben inflar la muestra.");

const [engineSource, appSource, viewsSource, reportSource, eventSource] = await Promise.all([
  import("node:fs/promises").then(fs => fs.readFile("js/recommendations/engine.js", "utf8")),
  import("node:fs/promises").then(fs => fs.readFile("app.js", "utf8")),
  import("node:fs/promises").then(fs => fs.readFile("js/ui/page-views.js", "utf8")),
  import("node:fs/promises").then(fs => fs.readFile("js/diagnostics/recommendation-report.js", "utf8")),
  import("node:fs/promises").then(fs => fs.readFile("js/app/event-handlers.js", "utf8"))
]);
assert.match(appSource, /createRidgeRecommendationExperiment/);
assert.match(appSource, /ridgeEvaluationResult = null/);
assert.match(viewsSource, /data-action="run-ridge-experiment"/);
assert.match(eventSource, /action === "run-ridge-experiment"/);
assert.match(reportSource, /ridgeExperiment: ridgeEvaluation/);
assert.doesNotMatch(reportSource, /localStorage|indexedDB|fetch\s*\(|XMLHttpRequest|navigator\.clipboard|dbSet\s*\(/,
  "El constructor de diagnósticos no debe tener efectos secundarios.");
assert.match(engineSource, /function buildProfile/);

console.log("Ridge verificado: validación anidada determinista, métricas emparejadas, alpha interno, muestra mínima, identidad TMDB y clipping 1–10.");
