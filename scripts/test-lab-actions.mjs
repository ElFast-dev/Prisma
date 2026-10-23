import assert from "node:assert/strict";
import { createLabActions } from "../js/app/lab-actions.js";

function createFixture() {
  const toasts = [];
  const clipboardWrites = [];
  let diagnosticInput = null;
  let normalizationCalls = 0;
  let ridgeCalls = 0;
  let temporalCalls = 0;
  const ctx = {
    currentPage: "lab",
    state: {
      rated: [{ title: "Privada 1", rating: 8 }, { title: "Privada 2", rating: 4 }],
      watched: [{ title: "Vista" }],
      watchlist: [{ title: "Pendiente" }],
      hidden: [{ title: "Oculta" }]
    },
    catalog: [{ tmdbId: "1" }],
    recommendationMode: "balanced",
    RECOMMENDATION_SIGNAL_WEIGHTS: { genre: 1 },
    recommendationDiagnosticReportText: "informe anterior",
    recommendationDiagnosticCopyMessage: "mensaje anterior",
    recommendationDiagnosticFeatureLabelsIncluded: false,
    labDiagnosticSnapshot: {
      schema: "prisma-lab-diagnostic-run/v1",
      status: "completed",
      startedAt: 1000,
      finishedAt: 1800,
      durationMs: 800,
      sampleCount: 2,
      globalPercent: 100,
      completedPhases: 7,
      totalPhases: 7,
      estimatedRemainingMs: 0,
      estimateStatus: "measured",
      phases: ["coverage", "baseline", "ranking", "normalization", "ridge", "temporal", "featureFamilies"].map(id => ({
        id, label: id, status: id === "temporal" ? "unavailable" : "completed",
        durationMs: 50, progress: { completed: 2, total: 2 },
        unavailableReason: id === "temporal" ? "No hay fechas sintéticas de visionado." : null
      }))
    },
    ridgeEvaluationResult: null,
    ridgeEvaluationBusy: false,
    ridgeEvaluationProgress: null,
    ridgeEvaluationRunId: 0,
    temporalRidgeEvaluationResult: null,
    temporalRidgeEvaluationBusy: false,
    temporalRidgeEvaluationProgress: null,
    temporalRidgeEvaluationRunId: 0,
    temporalUseCollectionAddedAtProxy: false,
    influenceNormalizationEvaluationResult: null,
    influenceNormalizationEvaluationBusy: false,
    influenceNormalizationEvaluationRunId: 0,
    renderCalls: 0,
    renderApp() { this.renderCalls += 1; },
    toast(message, isError) { toasts.push({ message, isError: Boolean(isError) }); },
    window: {
      requestAnimationFrame(callback) { callback(); },
      setTimeout(callback) { callback(); }
    },
    navigator: {
      clipboard: {
        writeText(text) {
          clipboardWrites.push(text);
          return Promise.resolve();
        }
      }
    },
    labMetrics: {
      stats: { total: 2, average: 6 },
      profile: { count: 2, withMetadata: 2, average: 6, features: new Map() },
      evaluation: { available: true, count: 2, mae: 1.25, baselineMae: 1.5, improvementPct: 16.67 },
      recommendationQuality: {
        ranking: { available: true, count: 2, relevantCount: 1, folds: 5, foldsEvaluated: 0, modes: [] },
        diversity: []
      }
    },
    async ensureLabMetrics() { return this.labMetrics; },
    buildProfile() { return { count: 2, features: new Map() }; },
    ratingValue(record) { return record && Number.isFinite(record.rating) ? record.rating : null; },
    evaluateModel() { return { mae: 1.25 }; },
    evaluateRecommendationQuality() { return { available: true, ndcg: 0.7 }; },
    recommendationNormalizationEvaluation: {
      async evaluateAsync() {
        normalizationCalls += 1;
        return { available: true, sampleCount: 8 };
      }
    },
    ridgeRecommendationExperiment: {
      async evaluateAsync(onProgress) {
        ridgeCalls += 1;
        onProgress({ phase: "starting" });
        onProgress({ phase: "repeat", completedRepeats: 1, totalRepeats: 3 });
        return { available: true, mae: 0.9 };
      },
      async evaluateTemporalAsync(onProgress) {
        temporalCalls += 1;
        onProgress({ phase: "starting" });
        onProgress({ phase: "window", completedWindows: 1, totalWindows: 5 });
        return { available: true, mae: 0.8 };
      }
    },
    buildRecommendationDiagnosticReport(input) {
      diagnosticInput = input;
      return { schema: "test-report", privacy: { networkTransmission: false } };
    }
  };
  return {
    ctx,
    toasts,
    clipboardWrites,
    get diagnosticInput() { return diagnosticInput; },
    get normalizationCalls() { return normalizationCalls; },
    get ridgeCalls() { return ridgeCalls; },
    get temporalCalls() { return temporalCalls; }
  };
}

const fixture = createFixture();
const { ctx, toasts, clipboardWrites } = fixture;
const actions = createLabActions(ctx);

// Conflicting long-running evaluations are kept mutually exclusive.
ctx.temporalRidgeEvaluationBusy = true;
await actions.runRidgeExperiment();
assert.equal(fixture.ridgeCalls, 0);
const proxyBeforeGuard = ctx.temporalUseCollectionAddedAtProxy;
actions.toggleTemporalAddedAtProxy();
assert.equal(ctx.temporalUseCollectionAddedAtProxy, proxyBeforeGuard);
ctx.temporalRidgeEvaluationBusy = false;

await actions.runRidgeExperiment();
assert.equal(fixture.ridgeCalls, 1);
assert.deepEqual(ctx.ridgeEvaluationResult, { available: true, mae: 0.9 });
assert.equal(ctx.ridgeEvaluationBusy, false);
assert.equal(ctx.ridgeEvaluationProgress, null);
assert.ok(toasts.some(item => item.message.includes("3 repeticiones de 5 pliegues")));
assert.ok(ctx.renderCalls >= 3, "La vista recibe renderizados de inicio, progreso y finalización");

ctx.ridgeEvaluationBusy = true;
await actions.runTemporalRidgeExperiment();
assert.equal(fixture.temporalCalls, 0, "La evaluación temporal respeta la guarda contra Ridge");
ctx.ridgeEvaluationBusy = false;
await actions.runTemporalRidgeExperiment();
assert.equal(fixture.temporalCalls, 1);
assert.deepEqual(ctx.temporalRidgeEvaluationResult, { available: true, mae: 0.8 });
assert.equal(ctx.temporalRidgeEvaluationBusy, false);
assert.equal(ctx.temporalRidgeEvaluationProgress, null);

ctx.temporalRidgeEvaluationResult = { available: true };
ctx.temporalRidgeEvaluationProgress = { completedWindows: 2 };
const temporalRunBeforeToggle = ctx.temporalRidgeEvaluationRunId;
actions.toggleTemporalAddedAtProxy();
assert.equal(ctx.temporalUseCollectionAddedAtProxy, true);
assert.equal(ctx.temporalRidgeEvaluationRunId, temporalRunBeforeToggle + 1);
assert.equal(ctx.temporalRidgeEvaluationResult, null);
assert.equal(ctx.temporalRidgeEvaluationProgress, null);

ctx.ridgeEvaluationBusy = true;
await actions.runInfluenceNormalizationExperiment();
assert.equal(fixture.normalizationCalls, 0);
ctx.ridgeEvaluationBusy = false;
await actions.runInfluenceNormalizationExperiment();
assert.equal(fixture.normalizationCalls, 1);
assert.deepEqual(ctx.influenceNormalizationEvaluationResult, { available: true, sampleCount: 8 });
assert.equal(ctx.influenceNormalizationEvaluationBusy, false);

// The report awaits the current cached metrics snapshot, then copies the aggregate report.
const copyPromise = actions.copyRecommendationDiagnosticReport(true);
await copyPromise;
assert.equal(clipboardWrites.length, 1);
assert.equal(ctx.recommendationDiagnosticFeatureLabelsIncluded, true);
assert.equal(JSON.parse(ctx.recommendationDiagnosticReportText).privacy.networkTransmission, false);
assert.equal(ctx.recommendationDiagnosticCopyMessage,
  "Copiado al portapapeles. Revisa el contenido de abajo antes de pegarlo en otra conversación.");
assert.equal(fixture.diagnosticInput.ratedCount, 2);
assert.equal(fixture.diagnosticInput.catalogCount, 1);
assert.deepEqual(fixture.diagnosticInput.collectionCounts, { watched: 1, pending: 1, hidden: 1 });
assert.deepEqual(fixture.diagnosticInput.ratingValues, [8, 4]);
assert.equal(ctx.recommendationDiagnosticCopyMessage,
  "Copiado al portapapeles. Revisa el contenido de abajo antes de pegarlo en otra conversación.");
assert.ok(toasts.some(item => item.message === "Diagnóstico copiado. Revísalo antes de compartirlo."));

// Clipboard failure leaves the complete report available for manual selection and copying.
ctx.navigator.clipboard.writeText = () => Promise.reject(new Error("clipboard unavailable"));
await actions.copyRecommendationDiagnosticReport(false);
assert.equal(clipboardWrites.length, 1);
assert.equal(ctx.recommendationDiagnosticFeatureLabelsIncluded, false);
assert.equal(ctx.recommendationDiagnosticCopyMessage,
  "No se pudo copiar automáticamente. El informe completo está visible abajo para seleccionarlo y copiarlo manualmente.");
assert.ok(toasts.some(item => item.message === "Informe preparado para revisión y copia manual."));

actions.clearRecommendationDiagnosticReport();
assert.equal(ctx.recommendationDiagnosticReportText, "");
assert.equal(ctx.recommendationDiagnosticCopyMessage, "");
assert.ok(ctx.renderCalls > 0);

console.log("Acciones del Laboratorio verificadas: guardas, progreso, reinicio de estado, proxy temporal, informe local y portapapeles.");
