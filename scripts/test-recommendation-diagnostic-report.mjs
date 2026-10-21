import assert from "node:assert/strict";
import { buildRecommendationDiagnosticReport } from "../js/diagnostics/recommendation-report.js";

const profile = {
  average: 7.25,
  count: 4,
  withMetadata: 3,
  features: new Map([
    ["género: drama", { count: 3, mean: 8, weight: 0.21 }],
    ["tema: viaje en el tiempo", { count: 1, mean: 9, weight: 0.65 }],
    ["década: 1990", { count: 2, mean: 7.5, weight: 0.04 }]
  ])
};
const baseInput = {
  ratedCount: 4,
  ratingValues: [9, 8, 7, 5],
  catalogCount: 12,
  collectionCounts: { watched: 3, pending: 2, hidden: 1 },
  profile,
  signalWeights: { genre: 1, theme: 0.35, decade: 0.2 },
  recommendationMode: "variety",
  ratingEvaluation: {
    available: true, count: 4, mae: 1.2, baselineMae: 1.5,
    improvementPct: 20, withoutDecadeMae: 1.25, decadeImprovement: 0.05,
    decadeExamples: 3
  },
  recommendationQuality: {
    ranking: {
      available: true, count: 60, relevantCount: 15, folds: 5,
      foldsEvaluated: 5, cutoff: 5, relevantThreshold: 7,
      modes: [
        { mode: "balanced", available: true, ndcgAt5: 0.61, foldsEvaluated: 5 },
        { mode: "affinity", available: true, ndcgAt5: 0.64, foldsEvaluated: 5 },
        { mode: "variety", available: true, ndcgAt5: 0.68, foldsEvaluated: 5 }
      ]
    },
    diversity: [
      { mode: "balanced", score: 0.4, pairs: 10, titles: 5, titlesWithGenres: 5, uniqueGenres: 3 }
    ]
  }
};

const compact = buildRecommendationDiagnosticReport(baseInput);
assert.equal(compact.schema, "prisma-recommendation-diagnostics/v1");
assert.equal(compact.sample.ratedEntries, 4);
assert.equal(compact.sample.ratingDistribution["9"], 1);
assert.equal(compact.sample.ratingDistribution["1"], 0);
assert.equal(compact.sample.metadataCoverage, 0.75);
assert.equal(compact.model.activeRankingMode, "variety");
assert.equal(compact.model.featureAggregates.totalFeatures, 3);
assert.equal(compact.model.featureAggregates.signalTypes.genre.featureCount, 1);
assert.equal(compact.model.featureAggregates.signalTypes.theme.singleObservationFeatures, 1);
assert.equal(compact.model.featureAggregates.featureDetails, undefined,
  "El informe resumido no debe contener nombres de señales");
assert.equal(compact.evaluation.ratingPrediction.mae, 1.2);
assert.equal(compact.evaluation.rankingQuality.modes[2].ndcgAt5, 0.68);
assert.equal(compact.evaluation.currentListDiversity[0].score, 0.4);
assert.equal(compact.privacy.generatedLocally, true);
assert.equal(compact.privacy.networkTransmission, false);

const detailed = buildRecommendationDiagnosticReport({ ...baseInput, includeFeatureLabels: true });
assert.equal(detailed.privacy.featureLabelsIncluded, true);
assert.equal(detailed.model.featureAggregates.featureDetails.length, 3);
assert.equal(detailed.model.featureAggregates.featureDetails[0].type, "theme");
assert.equal(detailed.model.featureAggregates.omittedFeatureDetails, 0);
assert.ok(JSON.stringify(detailed).includes("viaje en el tiempo"),
  "Los nombres de señales solo se incluyen si la persona los selecciona");

const serialized = JSON.stringify(detailed).toLowerCase();
for (const forbidden of [
  "about time", "tmdbid", "tmdb_id", "movie title", "personalnotes",
  "emotion", "credentials", "credentialvalue", "watchedat", "ratingentry"
]) {
  assert.equal(serialized.includes(forbidden), false, "No debe exportar el campo/dato prohibido: " + forbidden);
}
assert.equal(Object.prototype.hasOwnProperty.call(detailed, "ratings"), false);
assert.equal(Object.prototype.hasOwnProperty.call(detailed, "movies"), false);

const unavailable = buildRecommendationDiagnosticReport({
  ratedCount: 2,
  ratingValues: [7, 4],
  profile: { average: 5.5, withMetadata: 0, features: new Map() },
  ratingEvaluation: { available: false, count: 0 },
  recommendationQuality: { ranking: { available: false, count: 3, relevantCount: 1, folds: 5, reason: "Muestra insuficiente", modes: [] }, diversity: [] }
});
assert.equal(unavailable.evaluation.ratingPrediction.mae, null);
assert.equal(unavailable.evaluation.ratingPrediction.unavailableReason,
  "Se necesitan al menos cinco valoraciones válidas con características enlazadas.");
assert.equal(unavailable.evaluation.rankingQuality.modes.length, 0);
assert.equal(unavailable.evaluation.rankingQuality.unavailableReason, "Muestra insuficiente");
assert.equal(unavailable.sample.ratingsWithoutFeatures, 2);

console.log("Informe de diagnóstico correcto: métricas reales agregadas, detalles opcionales de señales y exclusión de registros individuales.");
