import assert from "node:assert/strict";
import { createRecommendationEngine } from "../js/recommendations/engine.js";
import { createRecommendationNormalizationEvaluation } from "../js/recommendations/normalization-evaluation.js";
import { ratingValue } from "../js/core/movie-utils.js";

const ratings = [];
const catalog = new Map();
for (let index = 0; index < 60; index += 1) {
  const title = "Película de prueba " + String(index).padStart(2, "0");
  const positive = index % 2 === 0;
  const rating = positive ? 8 : 5;
  const features = [
    positive ? "género: preferido" : "género: no preferido",
    "tema: recurrente-" + (index % 4),
    "década: " + (index % 3 === 0 ? "2000" : "2010")
  ];
  if (index % 3 === 0) features.push("tema: poco frecuente-" + index);
  const movie = {
    title: title,
    tmdbId: String(900000 + index),
    year: index % 3 === 0 ? 2004 : 2014,
    features: features
  };
  const entry = {
    title: title,
    tmdbId: movie.tmdbId,
    rating: rating,
    features: features
  };
  ratings.push(entry);
  catalog.set(title, movie);
}

const movieFeatures = (movie, entry) =>
  Array.isArray(entry && entry.features) && entry.features.length
    ? entry.features
    : (Array.isArray(movie && movie.features) ? movie.features : []);
const findMovie = title => catalog.get(title) || null;
const engine = createRecommendationEngine({
  getRatings: () => ratings,
  findMovie,
  movieFeatures,
  ratingValue
});
const rankCandidates = (candidates, limit, mode) => candidates.slice().sort((left, right) => {
  const scoreDifference = Number(right.prediction && right.prediction.score || 0) -
    Number(left.prediction && left.prediction.score || 0);
  return scoreDifference || String(left.evaluationIdentity).localeCompare(String(right.evaluationIdentity));
}).slice(0, limit);
const evaluator = createRecommendationNormalizationEvaluation({
  getRatings: () => ratings,
  findMovie,
  movieFeatures,
  ratingValue,
  buildProfile: engine.buildProfile,
  predictRating: engine.predictRating,
  rankCandidates,
  movieTmdbId: record => record && record.tmdbId ? String(record.tmdbId) : "",
  titleKey: value => String(value || "").toLowerCase().trim()
});

const candidate = { title: "Prueba", features: ["género: preferido", "tema: desconocido", "tema: desconocido-2"] };
const profile = {
  average: 6.5,
  withMetadata: 60,
  features: new Map([["género: preferido", { weight: 0.8, count: 10, mean: 8 }]])
};
const defaultPrediction = engine.predictRating(candidate, profile);
const explicitMeanPrediction = engine.predictRating(candidate, profile, { influenceNormalization: "mean" });
const sqrtPrediction = engine.predictRating(candidate, profile, { influenceNormalization: "coverage-sqrt" });
const matchedPrediction = engine.predictRating(candidate, profile, { influenceNormalization: "matched-only" });
assert.equal(defaultPrediction.score, explicitMeanPrediction.score,
  "La normalización de producción debe seguir siendo la fórmula media actual.");
assert.ok(defaultPrediction.score < sqrtPrediction.score && sqrtPrediction.score < matchedPrediction.score,
  "La normalización gradual debe estar entre la media actual y el control sin penalización por cobertura.");
assert.equal(defaultPrediction.coverage, 1 / 3);
assert.equal(sqrtPrediction.coverage, defaultPrediction.coverage);
assert.equal(matchedPrediction.coverage, defaultPrediction.coverage);
for (const result of [defaultPrediction, sqrtPrediction, matchedPrediction]) {
  assert.ok(result.score >= 1 && result.score <= 10, "Las estimaciones deben conservar el límite 1–10.");
}

const result = evaluator.evaluate();
assert.equal(result.executionStatus, "completed");
assert.equal(result.available, true);
assert.equal(result.sampleCount, 60);
assert.equal(result.relevantRatingsCount, 30);
assert.equal(result.folds, 5);
assert.equal(result.foldsEvaluated, 5);
assert.equal(result.methods.length, 3);
assert.deepEqual(result.methods.map(item => item.method), ["mean", "coverage-sqrt", "matched-only"]);
assert.equal(result.methods[0].deltaMaeVsMean, 0);
assert.ok(result.methods.every(item => item.available && Number.isFinite(item.mae) && Number.isFinite(item.deltaMaeVsMean)));
assert.ok(result.methods.every(item => item.maeFoldStability.foldsEvaluated === 5));
assert.ok(result.methods.every(item => item.rankingModes.length === 3));
assert.ok(result.methods.every(item => item.rankingModes.every(mode =>
  mode.available && mode.foldsEvaluated === 5 && Number.isFinite(mode.ndcgAt5) &&
  Number.isFinite(mode.deltaNdcgVsMean) &&
  mode.foldsWins + mode.foldsTies + mode.foldsLosses === 5
)));
assert.ok(result.methods.every(item => item.mae >= 0 && item.mae <= 9));
assert.deepEqual(result, evaluator.evaluate(),
  "La evaluación debe ser determinista con las mismas valoraciones y características.");

const smallRatings = ratings.slice(0, 20);
const smallCatalog = new Map(smallRatings.map(entry => [entry.title, catalog.get(entry.title)]));
const smallEngine = createRecommendationEngine({
  getRatings: () => smallRatings,
  findMovie: title => smallCatalog.get(title) || null,
  movieFeatures,
  ratingValue
});
const smallEvaluation = createRecommendationNormalizationEvaluation({
  getRatings: () => smallRatings,
  findMovie: title => smallCatalog.get(title) || null,
  movieFeatures,
  ratingValue,
  buildProfile: smallEngine.buildProfile,
  predictRating: smallEngine.predictRating,
  rankCandidates,
  movieTmdbId: record => record && record.tmdbId ? String(record.tmdbId) : "",
  titleKey: value => String(value || "").toLowerCase().trim()
}).evaluate();
assert.equal(smallEvaluation.available, true, "MAE puede ejecutarse con una muestra pequeña útil.");
assert.ok(smallEvaluation.methods.every(item => item.available && Number.isFinite(item.mae)));
assert.ok(smallEvaluation.methods.every(item => item.rankingModes.every(mode =>
  !mode.available && mode.ndcgAt5 === null && mode.foldsEvaluated === 0
)), "nDCG no debe mostrarse como medido por debajo de los mínimos de muestra.");

const emptyEvaluator = createRecommendationNormalizationEvaluation({
  getRatings: () => [],
  findMovie: () => null,
  movieFeatures: () => [],
  ratingValue,
  buildProfile: engine.buildProfile,
  predictRating: engine.predictRating,
  rankCandidates,
  movieTmdbId: () => "",
  titleKey: value => String(value || "").toLowerCase().trim()
});
assert.equal(emptyEvaluator.evaluate().available, false);
console.log("Experimento de normalización correcto: fórmula base preservada, cobertura gradual, pliegues comparables, nDCG por modo y mínimos de muestra.");
