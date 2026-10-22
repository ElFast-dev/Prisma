import assert from "node:assert/strict";
import { createRidgeRecommendationExperiment } from "../js/recommendations/ridge-evaluation.js";
import { summarizeRepeatedRidgeStability } from "../js/recommendations/repeated-validation-summary.js";
import { createRecommendationEngine } from "../js/recommendations/engine.js";
import { createRecommendationRanking } from "../js/recommendations/ranking.js";
import { movieFeatures } from "../js/recommendations/features.js";
import { ratingValue, movieTmdbId, titleKey } from "../js/core/movie-utils.js";
import { dateOnlyInTimeZone, PANAMA_TIME_ZONE } from "../js/core/date-utils.js";

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
    const watchedAt = new Date(Date.UTC(2020, 0, 1 + index)).toISOString();
    const record = {
      title, tmdbId, year, genres: [genre], tags, watchedAt,
      rating: Math.max(1, Math.min(10, target))
    };
    return record;
  });
}

function harness(records, allMovies, watchedRecords, temporalAudit, useCollectionAddedAtProxy) {
  const movieById = new Map(allMovies.map(movie => [String(movie.tmdbId), movie]));
  const latestDayByProfile = new WeakMap();
  const watchedSource = watchedRecords || records;
  const watched = watchedSource.map(record => ({
    title: record.title, tmdbId: record.tmdbId, year: record.year,
    watchedAt: record.watchedAt, watchedAtSource: record.watchedAtSource,
    addedAt: record.addedAt, addedAtSource: record.addedAtSource,
    watchDateConfidence: record.watchDateConfidence
  }));
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
    getWatched: () => watched,
    getUseCollectionAddedAtProxy: () => Boolean(useCollectionAddedAtProxy),
    findMovie: (title, id) => id != null ? (movieById.get(String(id)) || null) :
      (allMovies.find(movie => movie.title === title) || null),
    movieFeatures,
    ratingValue,
    buildProfile: function (trainingRatings) {
      const profile = engine.buildProfile(trainingRatings);
      if (temporalAudit) {
        const days = trainingRatings.map(record => String(record.watchedAt || "").slice(0, 10))
          .filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day)).sort();
        latestDayByProfile.set(profile, days.length ? days[days.length - 1] : null);
      }
      return profile;
    },
    predictRating: function (candidate, profile) {
      if (temporalAudit) {
        const candidateDay = String(candidate && candidate.watchedAt || "").slice(0, 10);
        const latestTrainingDay = latestDayByProfile.get(profile);
        if (!candidateDay || !latestTrainingDay || latestTrainingDay >= candidateDay) temporalAudit.violations += 1;
        temporalAudit.predictions += 1;
      }
      return engine.predictRating(candidate, profile);
    },
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
assert.ok(Number.isFinite(result.hybridMae), "El híbrido fijo debe producir un MAE fuera de muestra.");
assert.ok(Number.isFinite(result.deltaBaseMinusHybrid));
assert.ok(Math.abs(result.deltaBaseMinusHybrid - (result.baselineMae - result.hybridMae)) < 1e-10);
assert.equal(result.hybridFoldStability.available, true);
assert.ok(result.predictionMin >= 1 && result.predictionMin <= 10);
assert.ok(result.predictionMax >= 1 && result.predictionMax <= 10);
assert.equal(result.repeatedValidation.available, true);
assert.equal(result.repeatedValidation.repeats, 3);
assert.equal(result.repeatedValidation.foldsPerRepeat, 5);
assert.equal(result.repeatedValidation.foldsEvaluated, 15);
assert.equal(result.repeatedValidation.sampleCount, records.length);
assert.ok(Number.isFinite(result.repeatedValidation.hybridMae));
assert.ok(Number.isFinite(result.repeatedValidation.deltaBaseMinusHybrid));
assert.equal(result.repeatedValidation.hybridFoldStability.foldsEvaluated, 15);
assert.equal(Object.values(result.repeatedValidation.selectedAlphaCounts).reduce((sum, value) => sum + value, 0), 15,
  "La distribución agregada de alpha debe cubrir todos los pliegues externos repetidos.");
assert.ok(result.repeatedValidation.repeatSummaries.every(item =>
  Object.values(item.selectedAlphaCounts).reduce((sum, value) => sum + value, 0) === 5
));
assert.equal(result.repeatedValidation.repeats * result.repeatedValidation.foldsPerRepeat,
  result.repeatedValidation.foldsEvaluated);
assert.equal(result.repeatedValidation.repeatSummaries[0].mae, result.mae,
  "La repetición inicial debe preservar la evaluación histórica de cinco pliegues.");
assert.equal(result.repeatedValidation.repeatSummaries[0].baselineMae, result.baselineMae);
assert.deepEqual(result.repeatedValidation.repeatSummaries[0].rankingQuality, result.rankingQuality);
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
const asyncProgress = [];
const asyncResult = await experiment.evaluateAsync(progress => asyncProgress.push(progress));
assert.deepEqual(asyncResult.repeatedValidation, result.repeatedValidation,
  "La ejecución asíncrona debe producir exactamente los mismos agregados.");
assert.deepEqual(asyncProgress.filter(item => item.phase === "completed").map(item => item.completedRepeats), [1, 2, 3],
  "La evaluación asíncrona debe informar progreso entre las tres repeticiones.");
assert.ok(asyncProgress.every(item => item.totalRepeats === 3 && item.foldsPerRepeat === 5));
const cancelled = await experiment.evaluateAsync(progress =>
  progress.phase !== "completed" || progress.completedRepeats < 1
);
assert.equal(cancelled.available, false,
  "La evaluación repetida debe detenerse si el usuario invalida sus datos durante el cálculo.");
assert.match(cancelled.reason, /canceló/);

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
assert.ok(rankingResult.rankingQuality.modes.every(item =>
  Number.isFinite(item.hybridNdcgAt5) && Number.isFinite(item.deltaHybridMinusBaseline)),
  "La evaluación debe incluir nDCG@5 del híbrido en cada modo.");
assert.ok(rankingResult.rankingQuality.modes.every(item =>
  item.foldsHybridWins + item.foldsHybridTies + item.foldsHybridLosses === item.foldsEvaluated),
  "Los recuentos del híbrido deben cubrir los pliegues válidos por modo.");
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
  item.foldsRidgeWins + item.foldsRidgeTies + item.foldsRidgeLosses === item.foldsEvaluated &&
  Number.isFinite(item.hybridNdcgAt5) &&
  item.foldsHybridWins + item.foldsHybridTies + item.foldsHybridLosses === item.foldsEvaluated
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
assert.match(appSource, /ridgeRecommendationExperiment\.evaluateAsync/);
assert.match(appSource, /ridgeEvaluationProgress = progress/);
assert.match(viewsSource, /ridgeEvaluationProgress/);
assert.match(reportSource, /ridgeExperiment: ridgeEvaluation/);
assert.match(reportSource, /repeatedValidation: ridgeRepeatedValidationEvaluation/);
assert.doesNotMatch(reportSource, /localStorage|indexedDB|fetch\s*\(|XMLHttpRequest|navigator\.clipboard|dbSet\s*\(/,
  "El constructor de diagnósticos no debe tener efectos secundarios.");
assert.match(engineSource, /function buildProfile/);

const consistency = summarizeRepeatedRidgeStability({
  available: true,
  repeatSummaries: [
    { deltaBaseMinusRidge: 0.0934, rankingQuality: { available: true, modes: [
      { mode: "balanced", available: true, deltaRidgeMinusBaseline: 0.0088 },
      { mode: "affinity", available: true, deltaRidgeMinusBaseline: 0.0079 },
      { mode: "variety", available: true, deltaRidgeMinusBaseline: 0.1272 }
    ] } },
    { deltaBaseMinusRidge: 0.1043, rankingQuality: { available: true, modes: [
      { mode: "balanced", available: true, deltaRidgeMinusBaseline: 0.0273 },
      { mode: "affinity", available: true, deltaRidgeMinusBaseline: 0.0939 },
      { mode: "variety", available: true, deltaRidgeMinusBaseline: 0.1130 }
    ] } },
    { deltaBaseMinusRidge: 0.0934, rankingQuality: { available: true, modes: [
      { mode: "balanced", available: true, deltaRidgeMinusBaseline: 0.0032 },
      { mode: "affinity", available: true, deltaRidgeMinusBaseline: -0.00000000001 },
      { mode: "variety", available: true, deltaRidgeMinusBaseline: 0.1348 }
    ] } }
  ]
});
assert.equal(consistency.mae.ridgeFavorableRepeats, 3);
assert.equal(consistency.mae.repeatsEvaluated, 3);
assert.equal(consistency.mae.minDelta, 0.0934);
assert.equal(consistency.mae.maxDelta, 0.1043);
assert.equal(consistency.rankingModes.find(mode => mode.mode === "balanced").ridgeFavorableRepeats, 3);
assert.equal(consistency.rankingModes.find(mode => mode.mode === "balanced").minDelta, 0.0032);
assert.equal(consistency.rankingModes.find(mode => mode.mode === "affinity").ties, 1,
  "Las diferencias dentro de la tolerancia deben contarse como empates.");
assert.equal(consistency.rankingModes.find(mode => mode.mode === "variety").ridgeFavorableRepeats, 3);
assert.equal(summarizeRepeatedRidgeStability({ available: false, repeatSummaries: [] }).available, false,
  "Sin validación repetida no se debe fabricar un resumen.");
assert.equal(summarizeRepeatedRidgeStability({ available: true, repeatSummaries: [] }).mae.available, false,
  "Sin repeticiones la métrica debe permanecer no disponible.");
const baselineWins = summarizeRepeatedRidgeStability({
  available: true,
  repeatSummaries: [{
    deltaBaseMinusRidge: -0.025,
    rankingQuality: { available: true, modes: [
      { mode: "balanced", available: true, deltaRidgeMinusBaseline: -0.04 }
    ] }
  }]
});
assert.equal(baselineWins.mae.baselineFavorableRepeats, 1,
  "El resumen de MAE debe contar las repeticiones favorables al baseline.");
assert.equal(baselineWins.rankingModes.find(mode => mode.mode === "balanced").baselineFavorableRepeats, 1,
  "El resumen de nDCG@5 debe contar las repeticiones favorables al baseline.");
const missingMode = summarizeRepeatedRidgeStability({
  available: true,
  repeatSummaries: [
    { deltaBaseMinusRidge: 0.01, rankingQuality: { available: true, modes: [
      { mode: "balanced", available: true, deltaRidgeMinusBaseline: 0.02 }
    ] } },
    { deltaBaseMinusRidge: -0.03, rankingQuality: { available: false, modes: [] } }
  ]
});
const balancedWithMissing = missingMode.rankingModes.find(mode => mode.mode === "balanced");
assert.equal(balancedWithMissing.repeatsEvaluated, 1,
  "nDCG@5 debe excluir repeticiones sin una comparación válida para ese modo.");
assert.equal(balancedWithMissing.minDelta, 0.02,
  "Una métrica ausente no debe introducir un cero ficticio en el rango.");

assert.match(viewsSource, /Consistencia por repetición/);
assert.match(viewsSource, /intervalo de confianza/);
assert.match(viewsSource, /baselineFavorableRepeats/);
assert.match(viewsSource, /summary\.ties/);


const temporalAudit = { violations: 0, predictions: 0 };
const temporalRecords = fixtures(120).map(function (record, index) {
  return Object.assign({}, record, {
    watchedAt: new Date(Date.UTC(2020, 0, 1 + Math.floor(index / 10))).toISOString(),
    watchedAtSource: "imported-explicit"
  });
});
const temporalExperiment = harness(temporalRecords, temporalRecords, null, temporalAudit);
const temporalProgress = [];
const temporalResult = await temporalExperiment.evaluateTemporalAsync(progress => temporalProgress.push(progress));
assert.equal(temporalResult.available, true, "Una muestra sintética fechada y suficiente debe habilitar walk-forward.");
assert.equal(temporalResult.sampleCount, 120);
assert.equal(temporalResult.timestampedFeatureCount, 120);
assert.equal(temporalResult.explicitDateCount, 120);
assert.equal(temporalResult.unverifiedDateCount, 0);
assert.equal(temporalResult.dateProvenanceStatus, "explicit");
assert.equal(temporalResult.missingDateCount, 0);
assert.equal(temporalResult.distinctDayCount, 12,
  "Los registros del mismo día deben agruparse como una única unidad temporal.");
assert.equal(temporalResult.windowsPlanned, 5);
assert.equal(temporalResult.windowsEvaluated, 5);
assert.equal(temporalResult.innerWindows, 3);
assert.ok(temporalResult.warmupCount > 0);
assert.equal(temporalResult.warmupCount + temporalResult.testCount, temporalResult.sampleCount);
assert.equal(temporalResult.windowSummaries.length, 5);
assert.ok(temporalResult.windowSummaries.every((window, index, windows) =>
  window.trainingCount < temporalResult.sampleCount &&
  window.testCount > 0 &&
  (index === 0 || window.trainingCount >= windows[index - 1].trainingCount)
), "Cada ventana exterior usa solo el pasado y resume recuentos.");
assert.equal(Object.values(temporalResult.selectedAlphaCounts).reduce((sum, count) => sum + count, 0), 5);
assert.equal(temporalResult.windowStability.ridgeMaeWins + temporalResult.windowStability.ties +
  temporalResult.windowStability.baselineMaeWins, 5);
assert.deepEqual(temporalProgress.filter(item => item.phase === "completed").map(item => item.completedWindows),
  [1, 2, 3, 4, 5]);
assert.equal(temporalAudit.violations, 0,
  "Cada predicción debe entrenarse únicamente con visionados estrictamente anteriores al día de prueba.");
assert.ok(temporalAudit.predictions > 0);
const temporalRepeat = await temporalExperiment.evaluateTemporalAsync();
assert.deepEqual({
  mae: temporalRepeat.mae,
  baselineMae: temporalRepeat.baselineMae,
  windowSummaries: temporalRepeat.windowSummaries
}, {
  mae: temporalResult.mae,
  baselineMae: temporalResult.baselineMae,
  windowSummaries: temporalResult.windowSummaries
}, "Walk-forward debe ser determinista.");
const temporalCancelled = await temporalExperiment.evaluateTemporalAsync(progress =>
  progress.phase !== "completed" || progress.completedWindows < 1
);
assert.equal(temporalCancelled.available, false);
assert.match(temporalCancelled.unavailableReason, /canceló/);

const undatedRecords = temporalRecords.map(function (record) {
  const copy = Object.assign({}, record, { updatedAt: record.watchedAt });
  delete copy.watchedAt;
  delete copy.watchedAtSource;
  return copy;
});
const joinedDatesExperiment = harness(undatedRecords, temporalRecords, temporalRecords);
const joinedDates = await joinedDatesExperiment.evaluateTemporalAsync();
assert.equal(joinedDates.available, true,
  "La fecha puede resolverse por identidad desde el historial de vistas aunque falte en la valoración.");
assert.equal(joinedDates.timestampedFeatureCount, 120);
assert.equal(joinedDates.explicitDateCount, 120,
  "Una fecha explícita del historial debe prevalecer sobre un watchedAt heredado de la valoración.");
const conflictingLegacyRecords = temporalRecords.map(function (record) {
  const copy = Object.assign({}, record, { watchedAt: "2010-02-01T10:00:00.000Z" });
  delete copy.watchedAtSource;
  return copy;
});
const conflictingDates = await harness(conflictingLegacyRecords, temporalRecords, temporalRecords).evaluateTemporalAsync();
assert.equal(conflictingDates.available, true,
  "Una fecha heredada repetida no debe ocultar las fechas explícitas del historial.");
assert.equal(conflictingDates.distinctDayCount, 12,
  "La ventana temporal debe ordenar por la fecha explícita, no por el timestamp heredado conflictivo.");
assert.equal(conflictingDates.explicitDateCount, 120);
const legacyDatedRecords = temporalRecords.map(function (record) {
  const copy = Object.assign({}, record, { watchedAtSource: "action-time" });
  return copy;
});
const legacyDated = await harness(legacyDatedRecords, legacyDatedRecords).evaluateTemporalAsync();
assert.equal(legacyDated.available, true);
assert.equal(legacyDated.explicitDateCount, 0);
assert.equal(legacyDated.unverifiedDateCount, 120);
assert.equal(legacyDated.dateProvenanceStatus, "exploratory",
  "Una marca de tiempo de acción debe distinguirse de una fecha de visionado explícita.");
const noDates = await harness(undatedRecords, undatedRecords).evaluateTemporalAsync();
assert.equal(noDates.available, false);
assert.equal(noDates.timestampedFeatureCount, 0);
assert.equal(noDates.missingDateCount, 120);
assert.equal(noDates.mae, null, "Sin fechas válidas no se debe presentar una métrica.");
assert.equal(noDates.dateSourceMode, "watchedAt-only");

const addedAtOnlyRecords = temporalRecords.map(function (record) {
  const copy = Object.assign({}, record, {
    addedAt: record.watchedAt,
    addedAtSource: "imported-collection"
  });
  delete copy.watchedAt;
  delete copy.watchedAtSource;
  return copy;
});
const addedAtWithoutOptIn = await harness(undatedRecords, temporalRecords, addedAtOnlyRecords).evaluateTemporalAsync();
assert.equal(addedAtWithoutOptIn.available, false,
  "La fecha de incorporación no puede usarse sin que la persona active expresamente el modo exploratorio.");
assert.equal(addedAtWithoutOptIn.timestampedFeatureCount, 0);
assert.equal(addedAtWithoutOptIn.missingDateCount, 120);
assert.equal(addedAtWithoutOptIn.dateSourceMode, "watchedAt-only");
const addedAtProxy = await harness(undatedRecords, temporalRecords, addedAtOnlyRecords, null, true).evaluateTemporalAsync();
assert.equal(addedAtProxy.available, true,
  "Con el proxy activado, las fechas de la lista importada permiten evaluar 120 registros distribuidos en 12 días.");
assert.equal(addedAtProxy.sampleCount, 120);
assert.equal(addedAtProxy.timestampedFeatureCount, 120);
assert.equal(addedAtProxy.explicitDateCount, 0);
assert.equal(addedAtProxy.unverifiedDateCount, 120);
assert.equal(addedAtProxy.missingDateCount, 0);
assert.equal(addedAtProxy.distinctDayCount, 12);
assert.equal(addedAtProxy.dateProvenanceStatus, "exploratory");
assert.equal(addedAtProxy.dateSourceMode, "collection-added-proxy");
assert.doesNotMatch(JSON.stringify(addedAtProxy.windowSummaries), /2020-|addedAt|watchedAt|tmdbId|Película de prueba/i,
  "El resumen temporal no debe exportar fechas ni identidades individuales.");

assert.equal(PANAMA_TIME_ZONE, "America/Panama");
assert.equal(dateOnlyInTimeZone("2025-11-06T00:22:23.302Z"), "2025-11-05",
  "La conversión UTC→Panamá debe retroceder al día anterior cuando corresponde.");
assert.equal(dateOnlyInTimeZone("2026-01-15T05:56:02.305Z"), "2026-01-15",
  "Source Code debe quedar en el 15 de enero de Panamá.");
assert.equal(dateOnlyInTimeZone("2026-07-09T04:56:59.336Z"), "2026-07-08",
  "Las fechas que cruzan la medianoche UTC deben agruparse en el día panameño correcto.");

const retrospectiveRecords = temporalRecords.map(function (record) {
  const copy = Object.assign({}, record, {
    addedAt: record.watchedAt,
    addedAtSource: "imported-collection",
    watchDateConfidence: "pre-streak-unverified"
  });
  delete copy.watchedAt;
  delete copy.watchedAtSource;
  return copy;
});
const retrospectiveResult = await harness(retrospectiveRecords, temporalRecords, retrospectiveRecords, null, true).evaluateTemporalAsync();
assert.equal(retrospectiveResult.available, false,
  "El proxy no debe rehabilitar fechas retrospectivas anteriores al reto.");
assert.equal(retrospectiveResult.timestampedFeatureCount, 0);
assert.equal(retrospectiveResult.missingDateCount, 120);
assert.equal(retrospectiveResult.dateSourceMode, "collection-added-proxy");

const dayStart = Date.UTC(2026, 0, 15, 5, 0, 0);
const challengeDays = Array.from({length:280}, (_, index) =>
  dateOnlyInTimeZone(new Date(dayStart + index * 86400000).toISOString()));
assert.equal(new Set(challengeDays).size, 280,
  "El intervalo verificado contiene 280 días locales distintos sin huecos.");
assert.equal(challengeDays[0], "2026-01-15");
assert.equal(challengeDays.at(-1), "2026-10-21");

const sameDayRecords = temporalRecords.map(record => Object.assign({}, record, { watchedAt: "2020-02-01T10:00:00.000Z" }));
const sameDay = await harness(sameDayRecords, sameDayRecords).evaluateTemporalAsync();
assert.equal(sameDay.available, false, "Un solo día no debe dividirse artificialmente entre entrenamiento y prueba.");
assert.equal(sameDay.distinctDayCount, 1);
assert.doesNotMatch(JSON.stringify(temporalResult.windowSummaries), /2020-|watchedAt|tmdbId|Película de prueba/i);

assert.match(appSource, /runTemporalRidgeExperiment/);
assert.match(appSource, /evaluateTemporalAsync/);
assert.match(viewsSource, /data-action="run-temporal-ridge-experiment"/);
assert.match(viewsSource, /data-action="toggle-temporal-added-date-proxy"/);
assert.match(viewsSource, /el reto de 280 días permanece limitado del 15 de enero al 21 de octubre de 2026/i);
assert.match(viewsSource, /Ventana por incorporación/);
assert.match(viewsSource, /Orden temporal exploratorio por fecha de incorporación/);
assert.match(viewsSource, /Calidad del orden por fecha de incorporación/);
assert.match(eventSource, /action === "run-temporal-ridge-experiment"/);
assert.match(eventSource, /action === "toggle-temporal-added-date-proxy"/);
assert.match(appSource, /getUseCollectionAddedAtProxy/);
assert.match(reportSource, /temporalRidgeExperiment/);
assert.match(reportSource, /dateSourceMode/);

console.log("Ridge verificado: validación anidada repetida, evaluación temporal walk-forward, privacidad y clipping 1–10.");
