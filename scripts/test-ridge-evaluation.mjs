import assert from "node:assert/strict";
import { createRidgeRecommendationExperiment } from "../js/recommendations/ridge-evaluation.js";
import { createRecommendationEngine } from "../js/recommendations/engine.js";
import { createRecommendationRanking } from "../js/recommendations/ranking.js";
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
  const productionRanking = createRecommendationRanking({});
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
    titleKey,
    rankCandidates: (candidates, limit, mode) => {
      assert.ok(candidates.every(candidate => !("rating" in candidate) &&
        !("userRating" in candidate) && !("personalRating" in candidate)),
      "El ranker Ridge no debe recibir notas retenidas ni campos de valoraciones personales.");
      assert.ok(candidates.every(candidate => !("tmdbId" in candidate)),
        "El ranker experimental no debe recibir IDs TMDB.");
      return productionRanking.rankCandidates(candidates, limit, mode);
    }
  });
}

const records = fixtures(36);
const experiment = harness(records, records);
const result = experiment.evaluate();
assert.equal(result.available, true, "Una muestra sintética de 36 películas debe ser suficiente.");
assert.equal(result.count, 36);
assert.equal(result.rankingQuality.available, false,
  "nDCG requiere 50 películas aunque Ridge permita medir MAE con 30.");
assert.match(result.rankingQuality.reason, /al menos 50/);
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
assert.equal(result.repeatedValidation.available, true);
assert.equal(result.repeatedValidation.repeats, 3);
assert.equal(result.repeatedValidation.foldsPerRepeat, 5);
assert.equal(result.repeatedValidation.foldsEvaluated, 15);
assert.equal(result.repeatedValidation.sampleCount, records.length);
assert.equal(result.repeatedValidation.repeatSummaries.length, 3);
assert.ok(result.repeatedValidation.repeatSummaries.every(item =>
  item.foldsEvaluated === 5 && item.sampleCount === records.length &&
  Number.isFinite(item.mae) && Number.isFinite(item.baselineMae)
));
assert.equal(
  result.repeatedValidation.foldStability.ridgeMaeWins +
  result.repeatedValidation.foldStability.ties +
  result.repeatedValidation.foldStability.baselineMaeWins,
  15,
  "La estabilidad agregada debe clasificar los 15 pliegues externos de las tres repeticiones."
);
assert.equal(Object.values(result.selectedAlphaCounts).reduce((sum, value) => sum + value, 0), 5,
  "Debe elegirse exactamente un alpha por pliegue externo.");

const repeated = experiment.evaluate();
assert.equal(repeated.mae, result.mae, "La evaluación debe ser determinista.");
assert.equal(repeated.baselineMae, result.baselineMae, "La referencia emparejada debe ser determinista.");
assert.deepEqual(repeated.selectedAlphaCounts, result.selectedAlphaCounts);
assert.deepEqual(repeated.repeatedValidation, result.repeatedValidation,
  "Las tres repeticiones de validación anidada deben ser deterministas.");
assert.deepEqual(repeated.rankingQuality, result.rankingQuality,
  "Disponibilidad y motivo de nDCG deben ser deterministas.");

const rankingRecords = fixtures(60);
const rankingResult = harness(rankingRecords, rankingRecords).evaluate();
assert.equal(rankingResult.available, true);
assert.equal(rankingResult.rankingQuality.available, true,
  "nDCG está disponible cuando hay suficientes películas y notas relevantes.");
assert.equal(rankingResult.rankingQuality.count, 60);
assert.equal(rankingResult.rankingQuality.relevantCount,
  rankingRecords.filter(record => record.rating >= 7).length);
assert.equal(rankingResult.rankingQuality.folds, 5);
assert.equal(rankingResult.rankingQuality.foldsEvaluated, 5);
assert.deepEqual(rankingResult.rankingQuality.modes.map(item => item.mode),
  ["balanced", "affinity", "variety"]);
assert.equal(rankingResult.foldStability.available, true,
  "La evaluación debe resumir la dirección de MAE en cada pliegue externo.");
assert.equal(rankingResult.foldStability.foldsEvaluated, rankingResult.outerFolds);
assert.equal(
  rankingResult.foldStability.ridgeMaeWins + rankingResult.foldStability.ties +
  rankingResult.foldStability.baselineMaeWins,
  rankingResult.foldStability.foldsEvaluated,
  "Los recuentos de estabilidad del MAE deben cubrir todos los pliegues evaluados."
);
assert.ok(rankingResult.rankingQuality.modes.every(item =>
  item.foldsRidgeWins + item.foldsRidgeTies + item.foldsRidgeLosses === item.foldsEvaluated),
  "Los resultados de cada modo deben clasificar todos los pliegues nDCG válidos."
);
assert.deepEqual(rankingResult.foldStability,
  harness(rankingRecords, rankingRecords).evaluate().foldStability,
  "La estabilidad agregada debe ser determinista.");

assert.ok(rankingResult.rankingQuality.modes.every(item =>
  item.available && item.foldsEvaluated === 5 &&
  item.baselineNdcgAt5 >= 0 && item.baselineNdcgAt5 <= 1 &&
  item.ridgeNdcgAt5 >= 0 && item.ridgeNdcgAt5 <= 1 &&
  Math.abs(item.deltaRidgeMinusBaseline - (item.ridgeNdcgAt5 - item.baselineNdcgAt5)) < 1e-10),
"Los tres modos comparan nDCG de ambos modelos sobre idénticos pliegues.");
assert.equal(rankingResult.repeatedValidation.rankingQuality.available, true);
assert.equal(rankingResult.repeatedValidation.rankingQuality.folds, 15);
assert.equal(rankingResult.repeatedValidation.rankingQuality.foldsEvaluated, 15);
assert.equal(rankingResult.repeatedValidation.rankingQuality.modes.length, 3);
assert.ok(rankingResult.repeatedValidation.rankingQuality.modes.every(item =>
  item.available && item.foldsEvaluated === 15 &&
  item.foldsRidgeWins + item.foldsRidgeTies + item.foldsRidgeLosses === item.foldsEvaluated
));
assert.deepEqual(rankingResult.repeatedValidation,
  harness(rankingRecords, rankingRecords).evaluate().repeatedValidation,
  "La validación repetida y sus agregados por modo deben ser deterministas.");
assert.deepEqual(rankingResult.rankingQuality,
  harness(rankingRecords, rankingRecords).evaluate().rankingQuality,
  "nDCG@5 debe ser determinista.");

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
assert.match(viewsSource, /Validación repetida/);
assert.match(viewsSource, /3 × 5/);
assert.match(eventSource, /action === "run-ridge-experiment"/);
assert.match(appSource, /3 repeticiones de 5 pliegues/);
assert.match(reportSource, /ridgeExperiment: ridgeEvaluation/);
assert.match(reportSource, /repeatedValidation: ridgeRepeatedValidationEvaluation/);
assert.doesNotMatch(reportSource, /localStorage|indexedDB|fetch\s*\(|XMLHttpRequest|navigator\.clipboard|dbSet\s*\(/,
  "El constructor de diagnósticos no debe tener efectos secundarios.");
assert.match(engineSource, /function buildProfile/);

console.log("Ridge verificado: validación anidada determinista, MAE y nDCG@5 emparejados, alpha interno, privacidad y clipping 1–10.");
