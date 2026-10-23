function performanceNow(windowRef) {
  return windowRef && windowRef.performance && typeof windowRef.performance.now === "function"
    ? windowRef.performance.now()
    : Date.now();
}

function logLabEvaluationTiming(windowRef, operation, startedAt, sampleCount, status) {
  const logger = windowRef && windowRef.console && windowRef.console.info;
  if (typeof logger !== "function") return;
  logger.call(windowRef.console, "[Prisma performance]", JSON.stringify({
    operation: operation,
    durationMs: Math.round(Math.max(0, performanceNow(windowRef) - startedAt) * 10) / 10,
    sampleCount: Number.isFinite(sampleCount) ? Math.max(0, Math.floor(sampleCount)) : 0,
    status: status || "completed"
  }));
}

export function createLabActions(ctx) {
  async function runInfluenceNormalizationExperiment() {
    if (ctx.influenceNormalizationEvaluationBusy || ctx.ridgeEvaluationBusy || ctx.temporalRidgeEvaluationBusy) return;
    const runId = ++ctx.influenceNormalizationEvaluationRunId;
    const timingStartedAt = performanceNow(ctx.window);
    let timingStatus = "completed";
    ctx.influenceNormalizationEvaluationBusy = true;
    if (ctx.currentPage === "lab") ctx.renderApp();
    await new Promise(function (resolve) {
      if (ctx.window && typeof ctx.window.requestAnimationFrame === "function") ctx.window.requestAnimationFrame(resolve);
      else ctx.window.setTimeout(resolve, 0);
    });
    try {
      const evaluationResult = await ctx.recommendationNormalizationEvaluation.evaluateAsync({
        shouldContinue: function () { return runId === ctx.influenceNormalizationEvaluationRunId && ctx.currentPage === "lab"; },
        onMeasure: function (operation, durationMs, sampleCount, status) {
          const logger = ctx.window && ctx.window.console && ctx.window.console.info;
          if (typeof logger === "function") logger.call(ctx.window.console, "[Prisma performance]", JSON.stringify({
            operation: operation,
            durationMs: Math.round(Math.max(0, durationMs) * 10) / 10,
            sampleCount: Number.isFinite(sampleCount) ? Math.max(0, Math.floor(sampleCount)) : 0,
            status: status || "completed"
          }));
        }
      });
      if (runId !== ctx.influenceNormalizationEvaluationRunId || ctx.currentPage !== "lab") {
        timingStatus = "cancelled";
        return;
      }
      if (!evaluationResult) {
        timingStatus = "cancelled";
        return;
      }
      ctx.influenceNormalizationEvaluationResult = evaluationResult;
      ctx.toast(evaluationResult.available
        ? "Calibración de influencia terminada: tres variantes y los mismos pliegues comparados."
        : (evaluationResult.unavailableReason || "No se pudo evaluar la normalización de influencia."),
      !evaluationResult.available);
    } catch (_) {
      timingStatus = "error";
      if (runId !== ctx.influenceNormalizationEvaluationRunId) return;
      ctx.influenceNormalizationEvaluationResult = {
        executionStatus: "unavailable",
        available: false,
        sampleCount: 0,
        methods: [],
        unavailableReason: "No se pudo completar el experimento de normalización de forma estable."
      };
      ctx.toast("No se pudo completar el experimento de normalización de forma estable.", true);
    } finally {
      logLabEvaluationTiming(ctx.window, "influence-normalization", timingStartedAt,
        ctx.state && ctx.state.rated ? ctx.state.rated.length : 0, timingStatus);
      if (runId === ctx.influenceNormalizationEvaluationRunId) {
        ctx.influenceNormalizationEvaluationBusy = false;
        if (ctx.currentPage === "lab") ctx.renderApp();
      }
    }
  }

  async function runRidgeExperiment() {
    if (ctx.ridgeEvaluationBusy || ctx.temporalRidgeEvaluationBusy) return;
    const runId = ++ctx.ridgeEvaluationRunId;
    const timingStartedAt = performanceNow(ctx.window);
    let timingStatus = "completed";
    ctx.ridgeEvaluationBusy = true;
    ctx.ridgeEvaluationProgress = { completedRepeats: 0, totalRepeats: 3, foldsPerRepeat: 5 };
    if (ctx.currentPage === "lab") ctx.renderApp();
    await new Promise(function (resolve) {
      if (ctx.window && typeof ctx.window.requestAnimationFrame === "function") ctx.window.requestAnimationFrame(resolve);
      else ctx.window.setTimeout(resolve, 0);
    });
    try {
      const evaluationResult = await ctx.ridgeRecommendationExperiment.evaluateAsync(function (progress) {
        if (runId !== ctx.ridgeEvaluationRunId) return false;
        if (progress.phase !== "starting") {
          ctx.ridgeEvaluationProgress = progress;
          if (ctx.currentPage === "lab") ctx.renderApp();
        }
        return true;
      });
      if (runId !== ctx.ridgeEvaluationRunId || ctx.currentPage !== "lab") {
        timingStatus = "cancelled";
        return;
      }
      ctx.ridgeEvaluationResult = evaluationResult;
      ctx.toast(ctx.ridgeEvaluationResult.available
        ? "Validación Ridge terminada: se evaluaron 3 repeticiones de 5 pliegues. Revisa los agregados en el Laboratorio."
        : (ctx.ridgeEvaluationResult.reason || "No se pudo evaluar Ridge con esta muestra."), !ctx.ridgeEvaluationResult.available);
    } catch (_) {
      timingStatus = "error";
      if (runId !== ctx.ridgeEvaluationRunId) return;
      ctx.ridgeEvaluationResult = { available: false, count: 0, mae: null, baselineMae: null,
        deltaBaseMinusRidge: null, outerFolds: 5, foldsEvaluated: 0, innerFolds: 3,
        selectedAlphaCounts: {}, repeatedValidation: { available: false, repeats: 3, foldsPerRepeat: 5,
          foldsEvaluated: 0, repeatSummaries: [], unavailableReason: "No se pudo completar la validación Ridge repetida." },
        reason: "No se pudo completar el experimento Ridge de forma estable." };
      ctx.toast("No se pudo completar el experimento Ridge de forma estable.", true);
    } finally {
      logLabEvaluationTiming(ctx.window, "ridge-evaluation", timingStartedAt,
        ctx.state && ctx.state.rated ? ctx.state.rated.length : 0, timingStatus);
      if (runId === ctx.ridgeEvaluationRunId) {
        ctx.ridgeEvaluationBusy = false;
        ctx.ridgeEvaluationProgress = null;
        if (ctx.currentPage === "lab") ctx.renderApp();
      }
    }
  }

  function toggleTemporalAddedAtProxy() {
    if (ctx.temporalRidgeEvaluationBusy || ctx.ridgeEvaluationBusy) return;
    ctx.temporalUseCollectionAddedAtProxy = !ctx.temporalUseCollectionAddedAtProxy;
    ctx.temporalRidgeEvaluationRunId += 1;
    ctx.temporalRidgeEvaluationResult = null;
    ctx.temporalRidgeEvaluationProgress = null;
    ctx.toast(ctx.temporalUseCollectionAddedAtProxy
      ? "Proxy exploratorio activado: la fecha de incorporación a la lista podrá usarse solo en la evaluación temporal."
      : "Proxy desactivado: la evaluación temporal usará solo las fechas watchedAt disponibles.");
    if (ctx.currentPage === "lab") ctx.renderApp();
  }

  async function runTemporalRidgeExperiment() {
    if (ctx.temporalRidgeEvaluationBusy || ctx.ridgeEvaluationBusy) return;
    const runId = ++ctx.temporalRidgeEvaluationRunId;
    const timingStartedAt = performanceNow(ctx.window);
    let timingStatus = "completed";
    ctx.temporalRidgeEvaluationBusy = true;
    ctx.temporalRidgeEvaluationProgress = { completedWindows: 0, totalWindows: 5 };
    if (ctx.currentPage === "lab") ctx.renderApp();
    await new Promise(function (resolve) {
      if (ctx.window && typeof ctx.window.requestAnimationFrame === "function") ctx.window.requestAnimationFrame(resolve);
      else ctx.window.setTimeout(resolve, 0);
    });
    try {
      const evaluationResult = await ctx.ridgeRecommendationExperiment.evaluateTemporalAsync(function (progress) {
        if (runId !== ctx.temporalRidgeEvaluationRunId) return false;
        if (progress.phase !== "starting") {
          ctx.temporalRidgeEvaluationProgress = progress;
          if (ctx.currentPage === "lab") ctx.renderApp();
        }
        return true;
      });
      if (runId !== ctx.temporalRidgeEvaluationRunId || ctx.currentPage !== "lab") {
        timingStatus = "cancelled";
        return;
      }
      ctx.temporalRidgeEvaluationResult = evaluationResult;
      ctx.toast(ctx.temporalRidgeEvaluationResult.available
        ? "Validación temporal terminada. Revisa las ventanas futuras en el Laboratorio."
        : (ctx.temporalRidgeEvaluationResult.unavailableReason || "No se pudo completar la evaluación temporal."),
      !ctx.temporalRidgeEvaluationResult.available);
    } catch (_) {
      timingStatus = "error";
      if (runId !== ctx.temporalRidgeEvaluationRunId) return;
      ctx.temporalRidgeEvaluationResult = {
        available: false, sampleCount: 0, featureRowCount: 0, timestampedFeatureCount: 0,
        missingDateCount: 0, warmupCount: 0, testCount: 0, windowsPlanned: 5,
        windowsEvaluated: 0, innerWindows: 3, selectedAlphaCounts: {}, mae: null, baselineMae: null,
        deltaBaseMinusRidge: null, windowSummaries: [],
        unavailableReason: "No se pudo completar la evaluación temporal de forma estable."
      };
      ctx.toast("No se pudo completar la evaluación temporal de forma estable.", true);
    } finally {
      logLabEvaluationTiming(ctx.window, "temporal-ridge-evaluation", timingStartedAt,
        ctx.state && ctx.state.rated ? ctx.state.rated.length : 0, timingStatus);
      if (runId === ctx.temporalRidgeEvaluationRunId) {
        ctx.temporalRidgeEvaluationBusy = false;
        ctx.temporalRidgeEvaluationProgress = null;
        if (ctx.currentPage === "lab") ctx.renderApp();
      }
    }
  }

  function clearRecommendationDiagnosticReport() {
    ctx.recommendationDiagnosticReportText = "";
    ctx.recommendationDiagnosticCopyMessage = "";
    if (ctx.currentPage === "lab") ctx.renderApp();
  }

  async function copyRecommendationDiagnosticReport(includeFeatureLabels) {
    ctx.recommendationDiagnosticFeatureLabelsIncluded = Boolean(includeFeatureLabels);
    const snapshotBefore = ctx.labDiagnosticSnapshot;
    const finalStatuses = ["completed", "unavailable", "cancelled", "error"];
    if (!snapshotBefore || !Array.isArray(snapshotBefore.phases) ||
        !snapshotBefore.phases.every(function (phase) { return finalStatuses.indexOf(phase.status) !== -1; })) {
      ctx.toast("El diagnóstico aún tiene fases pendientes o en ejecución.", true);
      return;
    }
    const metrics = await ctx.ensureLabMetrics();
    const snapshot = ctx.labDiagnosticSnapshot;
    if (!snapshot || !Array.isArray(snapshot.phases) ||
        !snapshot.phases.every(function (phase) { return finalStatuses.indexOf(phase.status) !== -1; })) {
      ctx.toast("El diagnóstico cambió durante la preparación. Espera a que todas las fases alcancen un estado final.", true);
      return;
    }
    const sourceMetrics = metrics || {};
    const profile = sourceMetrics.profile || { average: 6.5, withMetadata: 0, features: new Map() };
    const state = ctx.state || {};
    const ratings = Array.isArray(state.rated) ? state.rated : [];
    const report = ctx.buildRecommendationDiagnosticReport({
      ratedCount: ratings.length,
      ratingValues: ratings.map(ctx.ratingValue).filter(function (value) { return value != null; }),
      catalogCount: Array.isArray(ctx.catalog) ? ctx.catalog.length : 0,
      collectionCounts: {
        watched: (state.watched || []).length,
        pending: (state.watchlist || []).length,
        hidden: (state.hidden || []).length
      },
      profile: profile,
      coverage: sourceMetrics.coverage,
      featureFamilyEvaluation: sourceMetrics.featureFamilyEvaluation,
      diagnosticSnapshot: snapshot,
      applicationVersion: "prisma-web/2026.10.23-lab-diagnostic.1",
      signalWeights: ctx.RECOMMENDATION_SIGNAL_WEIGHTS,
      recommendationMode: ctx.recommendationMode,
      ratingEvaluation: sourceMetrics.evaluation,
      ridgeEvaluation: ctx.ridgeEvaluationResult,
      temporalRidgeEvaluation: ctx.temporalRidgeEvaluationResult,
      influenceNormalizationEvaluation: ctx.influenceNormalizationEvaluationResult,
      recommendationQuality: sourceMetrics.recommendationQuality,
      includeFeatureLabels: ctx.recommendationDiagnosticFeatureLabelsIncluded
    });
    const reportText = JSON.stringify(report, null, 2);
    ctx.recommendationDiagnosticReportText = reportText;
    ctx.recommendationDiagnosticCopyMessage = "Informe generado localmente. Revisa su contenido antes de compartirlo; Prisma no lo envía a ningún servidor.";

    let copied = false;
    try {
      if (!ctx.navigator.clipboard || typeof ctx.navigator.clipboard.writeText !== "function") {
        throw new Error("El portapapeles no está disponible");
      }
      // Keep the clipboard write directly within the explicit click activation.
      const writePromise = ctx.navigator.clipboard.writeText(reportText);
      await writePromise;
      copied = true;
      ctx.recommendationDiagnosticCopyMessage = "Copiado al portapapeles. Revisa el contenido de abajo antes de pegarlo en otra conversación.";
    } catch (_) {
      ctx.recommendationDiagnosticCopyMessage = "No se pudo copiar automáticamente. El informe completo está visible abajo para seleccionarlo y copiarlo manualmente.";
    }

    if (ctx.currentPage === "lab") ctx.renderApp();
    if (copied) ctx.toast("Diagnóstico copiado. Revísalo antes de compartirlo.");
    else ctx.toast("Informe preparado para revisión y copia manual.");
  }

  return {
    runInfluenceNormalizationExperiment,
    runRidgeExperiment,
    toggleTemporalAddedAtProxy,
    runTemporalRidgeExperiment,
    clearRecommendationDiagnosticReport,
    copyRecommendationDiagnosticReport
  };
}
