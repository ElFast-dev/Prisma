import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  signalWeights: { genre: 1, theme: 0.35, director: 0.45, collection: 0.4, actor: 0.28, writer: 0.3, composer: 0.18, synopsis: 0.12, company: 0.14, country: 0.12, language: 0.1, spokenLanguage: 0.08, runtime: 0.12, decade: 0.2 },
  recommendationMode: "variety",
  ratingEvaluation: {
    available: true, count: 4, mae: 1.2, baselineMae: 1.5,
    improvementPct: 20, withoutDecadeMae: 1.25, decadeImprovement: 0.05,
    themeShrinkageMae: 1.1, themeShrinkageDelta: 0.1, themeShrinkagePrior: 2,
    decadeExamples: 3
  },
  ridgeEvaluation: {
    available: true, count: 60, mae: 1.05, baselineMae: 1.2, deltaBaseMinusRidge: 0.15,
    hybridMae: 1.11, deltaBaseMinusHybrid: 0.09,
    outerFolds: 5, foldsEvaluated: 5, innerFolds: 3, alphaGrid: [0.1, 1, 10, 100],
    selectedAlphaCounts: { "0.1": 1, "1": 2, "10": 2 },
    foldStability: { available: true, foldsEvaluated: 5, ridgeMaeWins: 4, ties: 0, baselineMaeWins: 1 },
    hybridFoldStability: { available: true, foldsEvaluated: 5, hybridMaeWins: 4, ties: 0, baselineMaeWins: 1 },
    rankingQuality: {
      available: true, count: 60, relevantCount: 31, folds: 5, foldsEvaluated: 5,
      cutoff: 5, relevantThreshold: 7, reason: null,
      modes: [
        { mode: "balanced", available: true, baselineNdcgAt5: 0.61, ridgeNdcgAt5: 0.72, hybridNdcgAt5: 0.70,
          deltaRidgeMinusBaseline: 0.11, deltaHybridMinusBaseline: 0.09, foldsEvaluated: 5,
          foldsRidgeWins: 3, foldsRidgeTies: 1, foldsRidgeLosses: 1,
          foldsHybridWins: 3, foldsHybridTies: 1, foldsHybridLosses: 1 },
        { mode: "affinity", available: true, baselineNdcgAt5: 0.64, ridgeNdcgAt5: 0.74, deltaRidgeMinusBaseline: 0.10, foldsEvaluated: 5, foldsRidgeWins: 4, foldsRidgeTies: 0, foldsRidgeLosses: 1 },
        { mode: "variety", available: true, baselineNdcgAt5: 0.68, ridgeNdcgAt5: 0.70, deltaRidgeMinusBaseline: 0.02, foldsEvaluated: 5, foldsRidgeWins: 4, foldsRidgeTies: 1, foldsRidgeLosses: 0 }
      ]
    },
    repeatedValidation: {
      available: true, sampleCount: 60, repeats: 3, foldsPerRepeat: 5, foldsEvaluated: 15, innerFolds: 3,
      selectedAlphaCounts: { "1": 9, "10": 6 },
      mae: 1.04, baselineMae: 1.18, deltaBaseMinusRidge: 0.14,
      hybridMae: 1.10, deltaBaseMinusHybrid: 0.08,
      foldStability: { available: true, foldsEvaluated: 15, ridgeMaeWins: 11, ties: 1, baselineMaeWins: 3 },
      hybridFoldStability: { available: true, foldsEvaluated: 15, hybridMaeWins: 10, ties: 1, baselineMaeWins: 4 },
      rankingQuality: {
        available: true, count: 60, relevantCount: 31, folds: 15, foldsEvaluated: 15,
        cutoff: 5, relevantThreshold: 7, reason: null,
        modes: [
          { mode: "balanced", available: true, baselineNdcgAt5: 0.62, ridgeNdcgAt5: 0.70, hybridNdcgAt5: 0.68,
          deltaRidgeMinusBaseline: 0.08, deltaHybridMinusBaseline: 0.06, foldsEvaluated: 15,
          foldsRidgeWins: 10, foldsRidgeTies: 1, foldsRidgeLosses: 4,
          foldsHybridWins: 9, foldsHybridTies: 2, foldsHybridLosses: 4 },
          { mode: "affinity", available: true, baselineNdcgAt5: 0.64, ridgeNdcgAt5: 0.66, deltaRidgeMinusBaseline: 0.02, foldsEvaluated: 15, foldsRidgeWins: 7, foldsRidgeTies: 1, foldsRidgeLosses: 7 },
          { mode: "variety", available: true, baselineNdcgAt5: 0.68, ridgeNdcgAt5: 0.79, deltaRidgeMinusBaseline: 0.11, foldsEvaluated: 15, foldsRidgeWins: 12, foldsRidgeTies: 0, foldsRidgeLosses: 3 }
        ]
      },
      repeatSummaries: [
        { repeat: 1, sampleCount: 60, foldsEvaluated: 5, selectedAlphaCounts: { "1": 3, "10": 2 }, mae: 1.05, baselineMae: 1.2, deltaBaseMinusRidge: 0.15,
          hybridMae: 1.08, deltaBaseMinusHybrid: 0.12, hybridFoldStability: { available: true, foldsEvaluated: 5, hybridMaeWins: 4, ties: 0, baselineMaeWins: 1 },
          foldStability: { available: true, foldsEvaluated: 5, ridgeMaeWins: 4, ties: 0, baselineMaeWins: 1 },
          rankingQuality: { available: true, count: 60, relevantCount: 31, folds: 5, foldsEvaluated: 5, cutoff: 5, relevantThreshold: 7, reason: null,
            modes: [{ mode: "variety", available: true, baselineNdcgAt5: 0.68, ridgeNdcgAt5: 0.75, deltaRidgeMinusBaseline: 0.07, foldsEvaluated: 5, foldsRidgeWins: 4, foldsRidgeTies: 0, foldsRidgeLosses: 1 }] } },
        { repeat: 2, sampleCount: 60, foldsEvaluated: 5, selectedAlphaCounts: { "1": 3, "10": 2 }, mae: 1.03, baselineMae: 1.17, deltaBaseMinusRidge: 0.14,
          foldStability: { available: true, foldsEvaluated: 5, ridgeMaeWins: 4, ties: 1, baselineMaeWins: 0 }, rankingQuality: { available: false, count: 60, relevantCount: 31, folds: 5, foldsEvaluated: 0, cutoff: 5, relevantThreshold: 7, reason: "Muestra no válida", modes: [] } },
        { repeat: 3, sampleCount: 60, foldsEvaluated: 5, selectedAlphaCounts: { "1": 3, "10": 2 }, mae: 1.04, baselineMae: 1.17, deltaBaseMinusRidge: 0.13,
          foldStability: { available: true, foldsEvaluated: 5, ridgeMaeWins: 3, ties: 0, baselineMaeWins: 2 }, rankingQuality: { available: true, count: 60, relevantCount: 31, folds: 5, foldsEvaluated: 5, cutoff: 5, relevantThreshold: 7, reason: null, modes: [] } }
      ],
      unavailableReason: null
    },
    reason: null
  },
  temporalRidgeEvaluation: {
    available: true,
    explicitDateCount: 40,
    unverifiedDateCount: 18,
    dateProvenanceStatus: "exploratory",
    dateSourceMode: "collection-added-proxy",
    temporalTimezone: "America/Panama",
    sampleCount: 60,
    featureRowCount: 60,
    timestampedFeatureCount: 58,
    missingDateCount: 2,
    distinctDayCount: 55,
    warmupCount: 29,
    testCount: 29,
    windowsPlanned: 5,
    windowsEvaluated: 5,
    innerWindows: 3,
    alphaGrid: [0.1, 1, 10, 100],
    selectedAlphaCounts: { "1": 3, "10": 2 },
    mae: 0.91,
    baselineMae: 1.08,
    deltaBaseMinusRidge: 0.17,
    windowStability: { available: true, windowsEvaluated: 5, ridgeMaeWins: 4, ties: 0, baselineMaeWins: 1 },
    rankingQuality: {
      available: true, count: 29, relevantCount: 14, folds: 5, foldsEvaluated: 5,
      cutoff: 5, relevantThreshold: 7, reason: null,
      modes: [
        { mode: "balanced", available: true, baselineNdcgAt5: 0.6, ridgeNdcgAt5: 0.7, deltaRidgeMinusBaseline: 0.1, foldsEvaluated: 5, foldsRidgeWins: 4, foldsRidgeTies: 0, foldsRidgeLosses: 1 },
        { mode: "affinity", available: true, baselineNdcgAt5: 0.61, ridgeNdcgAt5: 0.68, deltaRidgeMinusBaseline: 0.07, foldsEvaluated: 5, foldsRidgeWins: 3, foldsRidgeTies: 0, foldsRidgeLosses: 2 },
        { mode: "variety", available: true, baselineNdcgAt5: 0.52, ridgeNdcgAt5: 0.75, deltaRidgeMinusBaseline: 0.23, foldsEvaluated: 5, foldsRidgeWins: 5, foldsRidgeTies: 0, foldsRidgeLosses: 0 }
      ]
    },
    windowSummaries: [
      { window: 1, trainingCount: 29, testCount: 5, selectedAlpha: 1, mae: 0.9, baselineMae: 1.1, deltaBaseMinusRidge: 0.2, rankingAvailable: true,
        watchedAt: "2030-05-13", title: "Private temporal title", tmdbId: "123456" },
      { window: 2, trainingCount: 34, testCount: 6, selectedAlpha: 10, mae: 0.92, baselineMae: 1.06, deltaBaseMinusRidge: 0.14, rankingAvailable: true,
        watchedAt: "2030-05-14", title: "Private temporal title", tmdbId: "123456" }
    ],
    unavailableReason: null
  },
  influenceNormalizationEvaluation: {
    available: true,
    executionStatus: "completed",
    sampleCount: 60,
    relevantRatingsCount: 30,
    folds: 5,
    foldsEvaluated: 5,
    cutoff: 5,
    relevantRatingThreshold: 7,
    baselineMethod: "mean",
    methods: [
      { method: "mean", available: true, mae: 1.2, deltaMaeVsMean: 0,
        maeFoldStability: { available: true, foldsEvaluated: 5, variantWins: 0, ties: 5, meanWins: 0 },
        rankingModes: [{ mode: "balanced", available: true, ndcgAt5: 0.61, deltaNdcgVsMean: 0, foldsEvaluated: 5, foldsWins: 0, foldsTies: 5, foldsLosses: 0 }],
        title: "Private normalization title", tmdbId: "123456", watchedAt: "2030-05-13" },
      { method: "coverage-sqrt", available: true, mae: 1.08, deltaMaeVsMean: 0.12,
        maeFoldStability: { available: true, foldsEvaluated: 5, variantWins: 4, ties: 0, meanWins: 1 },
        rankingModes: [
          { mode: "balanced", available: true, ndcgAt5: 0.68, deltaNdcgVsMean: 0.07, foldsEvaluated: 5, foldsWins: 4, foldsTies: 0, foldsLosses: 1 },
          { mode: "affinity", available: true, ndcgAt5: 0.65, deltaNdcgVsMean: 0.01, foldsEvaluated: 5, foldsWins: 3, foldsTies: 0, foldsLosses: 2 },
          { mode: "variety", available: false, ndcgAt5: null, deltaNdcgVsMean: null, foldsEvaluated: 0, foldsWins: 0, foldsTies: 0, foldsLosses: 0 }
        ] },
      { method: "matched-only", available: true, mae: 1.3, deltaMaeVsMean: -0.1,
        maeFoldStability: { available: true, foldsEvaluated: 5, variantWins: 1, ties: 0, meanWins: 4 },
        rankingModes: [] }
    ]
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
    ],
    candidateAvailability: [{
      mode: "balanced", remoteCandidatesReceived: 4, localCatalogEntries: 20,
      localCandidatesEligible: 8, eligibleCandidatePool: 10, rankedResultsAvailable: 10,
      requestedResultLimit: 5, returnedResultCount: 4, profileAvailable: true,
      shortfallReason: "balanced-genre-cap"
    }]
  }
};

const compact = buildRecommendationDiagnosticReport(baseInput);
assert.equal(compact.schema, "prisma-recommendation-diagnostics/v13");
assert.equal(compact.sample.ratedEntries, 4);
assert.equal(compact.sample.ratingDistribution["9"], 1);
assert.equal(compact.sample.ratingDistribution["1"], 0);
assert.equal(compact.sample.metadataCoverage, 0.75);
assert.equal(compact.model.activeRankingMode, "variety");
assert.equal(compact.evaluation.candidateAvailability[0].remoteCandidatesReceived, 4);
assert.equal(compact.evaluation.candidateAvailability[0].localCandidatesEligible, 8);
assert.equal(compact.evaluation.candidateAvailability[0].returnedResultCount, 4);
assert.equal(compact.evaluation.candidateAvailability[0].shortfallReason, "balanced-genre-cap");
assert.equal(compact.model.featureAggregates.totalFeatures, 3);
assert.equal(compact.model.featureAggregates.signalTypes.genre.featureCount, 1);
assert.equal(compact.model.featureAggregates.signalTypes.theme.singleObservationFeatures, 1);
assert.equal(compact.model.featureAggregates.featureDetails, undefined,
  "El informe resumido no debe contener nombres de señales");
assert.equal(compact.evaluation.ratingPrediction.mae, 1.2);
assert.equal(compact.evaluation.ratingPrediction.themeShrinkageMae, 1.1);
assert.equal(compact.evaluation.ratingPrediction.themeShrinkageDeltaBaseMinusRegularized, 0.1);
assert.equal(compact.evaluation.ratingPrediction.themeShrinkageSupportPrior, 2);
assert.equal(compact.evaluation.ridgeExperiment.mae, 1.05);
assert.equal(compact.evaluation.ridgeExperiment.baselineMaeSameFolds, 1.2);
assert.equal(compact.evaluation.ridgeExperiment.deltaBaselineMinusRidge, 0.15);
assert.equal(compact.evaluation.ridgeExperiment.hybridMae, 1.11);
assert.equal(compact.evaluation.ridgeExperiment.deltaBaselineMinusHybrid, 0.09);
assert.deepEqual(compact.evaluation.ridgeExperiment.hybridFoldStability, {
  available: true, foldsEvaluated: 5, hybridMaeWins: 4, ties: 0, baselineMaeWins: 1
});
assert.deepEqual(compact.evaluation.ridgeExperiment.selectedAlphaCounts, { "0.1": 1, "1": 2, "10": 2 });
assert.equal(compact.evaluation.ridgeExperiment.rankingQuality.available, true);
assert.equal(compact.evaluation.ridgeExperiment.rankingQuality.modes[0].ridgeNdcgAt5, 0.72);
assert.equal(compact.evaluation.ridgeExperiment.rankingQuality.modes[0].hybridNdcgAt5, 0.7);
assert.equal(compact.evaluation.ridgeExperiment.rankingQuality.modes[0].deltaHybridMinusBaseline, 0.09);
assert.equal(compact.evaluation.ridgeExperiment.rankingQuality.modes[1].deltaRidgeMinusBaseline, 0.1);
assert.deepEqual(compact.evaluation.ridgeExperiment.foldStability, {
  available: true, foldsEvaluated: 5, ridgeMaeWins: 4, ties: 0, baselineMaeWins: 1
});
assert.deepEqual({
  wins: compact.evaluation.ridgeExperiment.rankingQuality.modes[1].foldsRidgeWins,
  ties: compact.evaluation.ridgeExperiment.rankingQuality.modes[1].foldsRidgeTies,
  losses: compact.evaluation.ridgeExperiment.rankingQuality.modes[1].foldsRidgeLosses
}, { wins: 4, ties: 0, losses: 1 });
assert.equal(compact.evaluation.ridgeExperiment.rankingQuality.sampleCount, 60);
assert.equal(compact.evaluation.ridgeExperiment.repeatedValidation.available, true);
assert.equal(compact.evaluation.ridgeExperiment.repeatedValidation.repeats, 3);
assert.equal(compact.evaluation.ridgeExperiment.repeatedValidation.foldsEvaluated, 15);
assert.equal(compact.evaluation.ridgeExperiment.repeatedValidation.mae, 1.04);
assert.equal(compact.evaluation.ridgeExperiment.repeatedValidation.hybridMae, 1.1);
assert.equal(compact.evaluation.ridgeExperiment.repeatedValidation.deltaBaselineMinusHybrid, 0.08);
assert.deepEqual(compact.evaluation.ridgeExperiment.repeatedValidation.hybridFoldStability, {
  available: true, foldsEvaluated: 15, hybridMaeWins: 10, ties: 1, baselineMaeWins: 4
});
assert.equal(compact.evaluation.ridgeExperiment.repeatedValidation.repeatSummaries[0].hybridMae, 1.08);
assert.deepEqual(compact.evaluation.ridgeExperiment.repeatedValidation.selectedAlphaCounts, { "1": 9, "10": 6 });
assert.deepEqual(compact.evaluation.ridgeExperiment.repeatedValidation.repeatSummaries[0].selectedAlphaCounts, { "1": 3, "10": 2 });
assert.deepEqual(compact.evaluation.ridgeExperiment.repeatedValidation.foldStability, {
  available: true, foldsEvaluated: 15, ridgeMaeWins: 11, ties: 1, baselineMaeWins: 3
});
assert.equal(compact.evaluation.ridgeExperiment.repeatedValidation.rankingQuality.modes[2].foldsRidgeWins, 12);
assert.equal(compact.evaluation.ridgeExperiment.repeatedValidation.repeatSummaries.length, 3);
assert.equal(compact.evaluation.ridgeExperiment.repeatedValidation.repeatSummaries[0].repeat, 1);
assert.equal(compact.evaluation.ridgeExperiment.repeatedValidation.repeatSummaries[2].mae, 1.04);
assert.equal(compact.evaluation.rankingQuality.modes[2].ndcgAt5, 0.68);
assert.equal(compact.evaluation.currentListDiversity[0].score, 0.4);
assert.equal(compact.evaluation.temporalRidgeExperiment.executionStatus, "completed");
assert.equal(compact.evaluation.temporalRidgeExperiment.available, true);
assert.equal(compact.evaluation.temporalRidgeExperiment.timestampedFeatureCount, 58);
assert.equal(compact.evaluation.temporalRidgeExperiment.explicitDateCount, 40);
assert.equal(compact.evaluation.temporalRidgeExperiment.unverifiedDateCount, 18);
assert.equal(compact.evaluation.temporalRidgeExperiment.dateProvenanceStatus, "exploratory");
assert.equal(compact.evaluation.temporalRidgeExperiment.dateSourceMode, "collection-added-proxy");
assert.equal(compact.evaluation.temporalRidgeExperiment.temporalTimezone, "America/Panama");
assert.equal(compact.evaluation.temporalRidgeExperiment.missingDateCount, 2);
assert.equal(compact.evaluation.temporalRidgeExperiment.mae, 0.91);
assert.equal(compact.evaluation.temporalRidgeExperiment.deltaBaselineMinusRidge, 0.17);
assert.equal(compact.evaluation.influenceNormalizationExperiment.executionStatus, "completed");
assert.equal(compact.evaluation.influenceNormalizationExperiment.sampleCount, 60);
assert.equal(compact.evaluation.influenceNormalizationExperiment.methods.length, 3);
assert.equal(compact.evaluation.influenceNormalizationExperiment.methods[1].deltaMaeVsMean, 0.12);
assert.equal(compact.evaluation.influenceNormalizationExperiment.methods[1].rankingModes[0].deltaNdcgVsMean, 0.07);
assert.equal(compact.evaluation.influenceNormalizationExperiment.methods[1].rankingModes[2].available, false);
assert.equal(compact.evaluation.influenceNormalizationExperiment.methods[1].rankingModes[2].ndcgAt5, null);
assert.equal(compact.evaluation.temporalRidgeExperiment.windowSummaries.length, 2);
assert.equal(compact.evaluation.temporalRidgeExperiment.windowSummaries[0].trainingCount, 29);
assert.equal(Object.prototype.hasOwnProperty.call(compact.evaluation.temporalRidgeExperiment.windowSummaries[0], "watchedAt"), false);
assert.equal(Object.prototype.hasOwnProperty.call(compact.evaluation.temporalRidgeExperiment.windowSummaries[0], "title"), false);
assert.equal(Object.prototype.hasOwnProperty.call(compact.evaluation.temporalRidgeExperiment.windowSummaries[0], "tmdbId"), false);
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
const temporalSerialized = JSON.stringify(detailed.evaluation.temporalRidgeExperiment).toLowerCase();
for (const forbidden of ["watchedat", "2030-05-", "private temporal title", "tmdbid", "123456"]) {
  assert.equal(temporalSerialized.includes(forbidden), false,
    "La evaluación temporal solo debe exportar agregados; no debe incluir " + forbidden);
}
const normalizationSerialized = JSON.stringify(detailed.evaluation.influenceNormalizationExperiment).toLowerCase();
for (const forbidden of ["private normalization title", "tmdbid", "watchedat", "2030-05-", "123456"]) {
  assert.equal(normalizationSerialized.includes(forbidden), false,
    "La calibración solo debe exportar agregados; no debe incluir " + forbidden);
}
const repeatedSerialized = JSON.stringify(detailed.evaluation.ridgeExperiment.repeatedValidation).toLowerCase();
for (const forbidden of ["about time", "tmdbid", "tmdb_id", "title", "ratingentry", "watchedat"]) {
  assert.equal(repeatedSerialized.includes(forbidden), false,
    "La validación repetida solo debe exportar agregados; no debe incluir " + forbidden);
}

const automaticPhases = [
  "coverage", "baseline", "ranking", "normalization", "ridge", "temporal", "featureFamilies"
].map((id, index) => ({
  id,
  status: id === "temporal" ? "unavailable" : (id === "ridge" ? "error" : "completed"),
  durationMs: index + 1,
  progress: { completed: 10 + index, total: 10 + index },
  unavailableReason: id === "temporal" ? "No hay fechas de visionado suficientes." : null,
  error: id === "ridge" ? "Diagnostic private title must not escape" : null,
  title: "Private diagnostic title",
  tmdbId: "998877"
}));
const integrated = buildRecommendationDiagnosticReport({
  ...baseInput,
  generatedAt: "2026-10-23T14:00:00.000Z",
  applicationVersion: "prisma-web/2026.10.23-lab-diagnostic.1",
  diagnosticSnapshot: {
    schema: "prisma-lab-diagnostic-run/v1",
    status: "partial-error",
    startedAt: 1792764000000,
    finishedAt: 1792764100000,
    durationMs: 100000,
    sampleCount: 351,
    globalPercent: 100,
    completedPhases: 7,
    totalPhases: 7,
    estimatedRemainingMs: 0,
    estimateStatus: "measured",
    phases: automaticPhases
  },
  coverage: {
    ratingEntries: 351, validRatingEntries: 351, invalidRatingEntries: 0,
    uniqueRatedMovies: 351, featureLinkedRatingEntries: 351,
    uniqueFeatureMovies: 351, ratingsWithoutUsefulFeatures: 0,
    featurelessUniqueMovies: 0, profileFeatureCount: 48, featureObservations: 1800,
    catalogMovies: 351, candidatesAvailable: 20, remoteCandidatesReceived: 20, localCandidatesEligible: 40,
    eligibleCandidatePool: 55, rankedResultsAvailable: 55, requestedResultLimit: 5, metadataCoverage: 1,
    featureLinkedCoverage: 1, supportDistribution: { once: 2, twoToFour: 4, fiveToNine: 8, tenOrMore: 34 },
    signalTypeCounts: { genre: 351, theme: 351, synopsis: 900, "personal title": 123456 }
  },
  featureFamilyEvaluation: {
    available: true, executionStatus: "completed", sampleCount: 351,
    repeats: 3, foldsPerRepeat: 5, relevanceThresholds: [7, 9], foldsPlanned: 5, foldsEvaluated: 15, sharedPartition: true,
    trainingLeakageChecked: true,
    families: ["genres-only", "genres-tags", "genres-tags-synopsis", "full-current"].map((id, index) => ({
      id, label: "Personal film title", available: true, mae: 1 + index * 0.1, baselineMae: 1.5,
      deltaMaeVsGenres: index ? 0.2 - index * 0.1 : null, foldsEvaluated: 15,
      maeWins: 8, ties: 3, maeLosses: 4, foldMae: Array(15).fill(1 + index * 0.1),
      title: "Private diagnostic title", tmdbId: "998877",
      rankingModes: ["balanced", "affinity", "variety"].map(mode => ({
        mode, available: true, ndcgAt5: 0.7, deltaNdcgVsGenres: 0.03,
        foldsEvaluated: 15, pairedFoldsEvaluated: 14, wins: 8, ties: 3, losses: 3,
        foldNdcgAt5: [0.7, null, 0.6, 0.7, 0.8, 0.9, 0.6, 0.7, 0.8, 0.9, 0.6, 0.7, 0.8, 0.9, 0.6],
        title: "Private film title"
      }))
    })),
    supportRegularization: {
      available: true, featureSupportWeightFormula: "weight * support / (support + lambda)",
      lambdas: [0, 0.5, 1, 2, 4, 8], signalFamilyLambda: 2,
      results: [{ lambda: 0, available: true, mae: 1.2, deltaMaeVsNoShrinkage: 0,
        foldsEvaluated: 15, foldMae: Array(15).fill(1.2), maeWins: 0, ties: 15, maeLosses: 0,
        rankingModes: {}, rankingByThreshold: {}, repeatSummaries: [] }],
      nestedSelection: { available: false, selectedLambdaCounts: {}, outerFoldsEvaluated: 0 },
      signalFamilyExperiments: [{
        id: "theme", label: "Private film title", lambda: 2, available: true, foldsEvaluated: 15,
        mae: 1.15, baselineMae: 1.2, deltaMaeVsNoShrinkage: 0.05,
        foldMae: Array(15).fill(1.15), maeWins: 9, ties: 2, maeLosses: 4,
        rankingModes: { balanced: {available:false,ndcgAt5:null,foldsEvaluated:0} },
        rankingByThreshold: {}, repeatSummaries: [{repeat:1,mae:1.1,foldCount:5}]
      }],
      featureSupportBySignalType: {theme:{featureObservations:20,supportOneFeatures:10,meanSupport:1.4,meanAbsoluteWeight:0.12}},
      interpretationLimits: []
    },
    unavailableReason: null
  }
});
assert.equal(integrated.schema, "prisma-recommendation-diagnostics/v13");
assert.equal(integrated.generatedAt, "2026-10-23T14:00:00.000Z");
assert.equal(integrated.applicationVersion, "prisma-web/2026.10.23-lab-diagnostic.1");
assert.equal(integrated.diagnostic.status, "partial-error");
assert.equal(integrated.diagnostic.run.phases.length, 7);
assert.equal(integrated.diagnostic.run.completedPhases, 7);
assert.equal(integrated.diagnostic.run.globalPercent, 100);
assert.equal(integrated.diagnostic.run.estimatedRemainingMs, 0);
assert.equal(integrated.diagnostic.run.phases.find(phase => phase.id === "temporal").status, "unavailable");
assert.equal(integrated.diagnostic.run.phases.find(phase => phase.id === "ridge").status, "error");
assert.equal(integrated.diagnostic.coverage.uniqueRatedMovies, 351);
assert.equal(integrated.diagnostic.coverage.signalTypeCounts.genre, 351);
assert.equal(integrated.diagnostic.featureFamilyComparison.families.length, 4);
assert.equal(integrated.diagnostic.featureFamilyComparison.families[2].id, "genres-tags-synopsis");
assert.equal(integrated.diagnostic.featureFamilyComparison.families[0].rankingModes[0].foldNdcgAt5.length, 15);
assert.equal(integrated.diagnostic.featureFamilyComparison.families[0].rankingModes[0].foldNdcgAt5[1], null);
assert.equal(integrated.diagnostic.featureFamilyComparison.families[1].rankingModes[0].pairedFoldsEvaluated, 14);
assert.equal(integrated.diagnostic.featureFamilyComparison.sharedPartition, true);
assert.equal(integrated.diagnostic.featureFamilyComparison.trainingLeakageChecked, true);
assert.equal(integrated.diagnostic.coverage.remoteCandidatesReceived, 20);
assert.equal(integrated.diagnostic.coverage.localCandidatesEligible, 40);
assert.equal(integrated.diagnostic.featureFamilyComparison.repeats, 3);
assert.equal(integrated.diagnostic.featureFamilyComparison.foldsEvaluated, 15);
assert.equal(integrated.diagnostic.featureFamilyComparison.supportRegularization.signalFamilyExperiments.length, 1);
assert.equal(integrated.diagnostic.featureFamilyComparison.supportRegularization.signalFamilyExperiments[0].label, "Temas");
assert.equal(integrated.diagnostic.featureFamilyComparison.supportRegularization.signalFamilyExperiments[0].foldsEvaluated, 15);
const integratedSerialized = JSON.stringify(integrated).toLowerCase();
for (const forbidden of ["private diagnostic title", "personal film title", "998877", "123456", "personal title", "tmdbid"]) {
  assert.equal(integratedSerialized.includes(forbidden), false,
    "El informe integral debe filtrar valores no permitidos: " + forbidden);
}
assert.equal(integrated.privacy.networkTransmission, false);
assert.equal(integrated.privacy.featureLabelsIncluded, false);

const unavailable = buildRecommendationDiagnosticReport({
  ratedCount: 2,
  ratingValues: [7, 4],
  profile: { average: 5.5, withMetadata: 0, features: new Map() },
  ratingEvaluation: { available: false, count: 0 },
  recommendationQuality: { ranking: { available: false, count: 3, relevantCount: 1, folds: 5, reason: "Muestra insuficiente", modes: [] }, diversity: [] }
});
assert.equal(unavailable.evaluation.ratingPrediction.mae, null);
assert.equal(unavailable.evaluation.ridgeExperiment.available, false);
assert.equal(unavailable.evaluation.ridgeExperiment.executionStatus, "not-run");
assert.equal(unavailable.evaluation.ridgeExperiment.repeatedValidation.executionStatus, "not-run");
assert.equal(unavailable.evaluation.temporalRidgeExperiment.executionStatus, "not-run");
assert.equal(unavailable.evaluation.temporalRidgeExperiment.mae, null);
assert.equal(unavailable.evaluation.temporalRidgeExperiment.dateProvenanceStatus, "unavailable");
assert.equal(unavailable.evaluation.influenceNormalizationExperiment.executionStatus, "not-run");
assert.equal(unavailable.evaluation.influenceNormalizationExperiment.available, false);
assert.equal(unavailable.evaluation.ratingPrediction.unavailableReason,
  "Se necesitan al menos cinco valoraciones válidas con características enlazadas.");
assert.equal(unavailable.evaluation.rankingQuality.modes.length, 0);
assert.equal(unavailable.evaluation.rankingQuality.unavailableReason, "Muestra insuficiente");
assert.equal(unavailable.sample.ratingsWithoutFeatures, 2);

const [appSource, labViewsSource, eventHandlersSource, reportSource, labActionsSource] = await Promise.all([
  readFile("app.js", "utf8"),
  readFile("js/ui/lab-views.js", "utf8"),
  readFile("js/app/event-handlers.js", "utf8"),
  readFile("js/diagnostics/recommendation-report.js", "utf8"),
  readFile("js/app/lab-actions.js", "utf8")
]);
assert.match(appSource, /buildRecommendationDiagnosticReport/);
assert.match(labActionsSource, /ctx\.navigator\.clipboard\.writeText/);
assert.match(labViewsSource, /data-action="copy-recommendation-diagnostics"/);
assert.match(labViewsSource, /Excluye títulos, identificadores de películas/);
assert.match(labViewsSource, /Experimento \(temas atenuados por soporte\)/);
assert.match(reportSource, /themeShrinkageDeltaBaseMinusRegularized/);
assert.match(labViewsSource, /Incluir hasta 40 nombres de señales agregadas/);
assert.match(eventHandlersSource, /action === "copy-recommendation-diagnostics"/);
assert.doesNotMatch(reportSource, /localStorage|indexedDB|fetch\s*\(|XMLHttpRequest|navigator\.clipboard|dbSet\s*\(/,
  "El constructor del informe debe ser puro: sin DOM, persistencia, red ni portapapeles");

console.log("Informe de diagnóstico correcto: métricas reales agregadas, detalles opcionales de señales, privacidad y flujo de copia.");
