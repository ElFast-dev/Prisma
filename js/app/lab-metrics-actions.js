function now(windowRef) {
  return windowRef && windowRef.performance && typeof windowRef.performance.now === "function"
    ? windowRef.performance.now()
    : Date.now();
}

function writeTiming(windowRef, operation, durationMs, sampleCount, status) {
  const logger = windowRef && windowRef.console && windowRef.console.info;
  if (typeof logger !== "function") return;
  // Only timing, operation names, a coarse row count and status are logged. Never serialize profile data.
  logger.call(windowRef.console, "[Prisma performance]", JSON.stringify({
    operation: operation,
    durationMs: Math.round(Math.max(0, durationMs) * 10) / 10,
    sampleCount: Number.isFinite(sampleCount) ? Math.max(0, Math.floor(sampleCount)) : 0,
    status: status || "completed"
  }));
}

function nextTask(windowRef) {
  return new Promise(function (resolve) {
    if (windowRef && typeof windowRef.setTimeout === "function") windowRef.setTimeout(resolve, 0);
    else setTimeout(resolve, 0);
  });
}

export function createLabMetricsActions(ctx) {
  let metrics = null;
  let busy = false;
  let progress = null;
  let error = null;
  let revision = 0;
  let runId = 0;
  let activePromise = null;
  let activeKey = "";
  let cachedKey = "";
  let observed = null;

  function dataKey() {
    const state = ctx.state || {};
    const ratings = Array.isArray(state.rated) ? state.rated : [];
    const catalog = Array.isArray(ctx.catalog) ? ctx.catalog : [];
    const candidates = Array.isArray(ctx.recommendationCandidates) ? ctx.recommendationCandidates : [];
    const watched = Array.isArray(state.watched) ? state.watched.length : 0;
    const pending = Array.isArray(state.watchlist) ? state.watchlist.length : 0;
    const hidden = Array.isArray(state.hidden) ? state.hidden.length : 0;
    return [
      revision, state.updatedAt || "", ratings.length, catalog.length, candidates.length,
      watched, pending, hidden, ctx.recommendationMode || "balanced"
    ].join("|");
  }

  function observeSourceReferences() {
    const state = ctx.state || {};
    const current = {
      state: state,
      ratings: state.rated,
      catalog: ctx.catalog,
      candidates: ctx.recommendationCandidates,
      mode: ctx.recommendationMode,
      updatedAt: state.updatedAt
    };
    if (observed && (
      observed.state !== current.state ||
      observed.ratings !== current.ratings ||
      observed.catalog !== current.catalog ||
      observed.candidates !== current.candidates ||
      observed.mode !== current.mode ||
      observed.updatedAt !== current.updatedAt
    )) {
      revision += 1;
      metrics = null;
      cachedKey = "";
      cancelLabMetrics();
    }
    observed = current;
  }

  function cancelLabMetrics() {
    if (busy || activePromise) {
      runId += 1;
      busy = false;
      progress = null;
      activePromise = null;
      activeKey = "";
    }
  }

  function invalidateLabMetrics() {
    revision += 1;
    metrics = null;
    cachedKey = "";
    error = null;
    cancelLabMetrics();
  }

  async function timed(operation, callback, sampleCount, shouldContinue) {
    const startedAt = now(ctx.window);
    let result;
    let status = "completed";
    try {
      result = await callback();
      if (result == null || (typeof shouldContinue === "function" && !shouldContinue())) {
        status = "cancelled";
      } else if (result.available === false) {
        status = "unavailable";
      }
      return result;
    } catch (_) {
      status = "error";
      throw _;
    } finally {
      writeTiming(ctx.window, operation, now(ctx.window) - startedAt,
        typeof sampleCount === "function" ? sampleCount(result) : sampleCount, status);
    }
  }

  async function ensureLabMetrics() {
    observeSourceReferences();
    const key = dataKey();
    if (metrics && cachedKey === key) return metrics;
    if (activePromise && activeKey === key) return activePromise;
    cancelLabMetrics();

    const thisRun = ++runId;
    activeKey = key;
    busy = true;
    error = null;
    progress = { phase: "starting", completed: 0, total: 0 };
    const isCurrent = function () {
      return thisRun === runId && ctx.currentPage === "lab" && key === dataKey();
    };

    const work = async function () {
      await nextTask(ctx.window);
      if (!isCurrent()) return null;

      const stats = await timed("summaryStats", function () { return ctx.summaryStats(); },
        function () { return (ctx.state && ctx.state.rated || []).length; }, isCurrent);
      if (!stats || !isCurrent()) return null;

      const profile = await timed("buildProfile", function () { return ctx.buildProfile(); },
        function (value) { return value && value.count; }, isCurrent);
      if (!profile || !isCurrent()) return null;

      const genres = await timed("genreStats", function () { return ctx.genreStats(); },
        function () { return (ctx.state && ctx.state.rated || []).length; }, isCurrent);
      if (!genres || !isCurrent()) return null;

      progress = { phase: "rating-evaluation", completed: 0, total: (ctx.state && ctx.state.rated || []).length };
      const evaluation = await timed("rating-evaluation", function () {
        return ctx.evaluateModelAsync({
          batchSize: 3,
          shouldContinue: isCurrent,
          onProgress: function (update) { if (isCurrent()) progress = update; }
        });
      }, function (value) { return value && value.count; }, isCurrent);
      if (!evaluation || !isCurrent()) return null;

      progress = { phase: "ranking-evaluation", completed: 0, total: 5 };
      const recommendationQuality = await timed("recommendation-quality", function () {
        return ctx.evaluateRecommendationQualityAsync({
          shouldContinue: isCurrent,
          onMeasure: function (operation, durationMs, sampleCount, status) {
            writeTiming(ctx.window, operation, durationMs, sampleCount, status);
          }
        });
      }, function (value) { return value && value.ranking && value.ranking.count; }, isCurrent);
      if (!recommendationQuality || !isCurrent()) return null;

      metrics = {
        stats: stats,
        profile: profile,
        genres: genres,
        evaluation: evaluation,
        recommendationQuality: recommendationQuality
      };
      cachedKey = key;
      error = null;
      return metrics;
    };

    activePromise = Promise.resolve().then(work).catch(function () {
      if (thisRun === runId) {
        error = "No se pudieron completar las métricas del Laboratorio. Puedes volver a intentarlo.";
        writeTiming(ctx.window, "lab-metrics", 0, (ctx.state && ctx.state.rated || []).length, "error");
      }
      return null;
    }).then(function (result) {
      if (thisRun === runId) {
        busy = false;
        progress = null;
        activePromise = null;
        activeKey = "";
        if (ctx.currentPage === "lab") ctx.renderApp();
      }
      return result;
    });

    // The first, lightweight state is already in the DOM. This refresh shows the loading state
    // before any evaluation work starts; recursive rendering sees the same active promise.
    if (ctx.currentPage === "lab") ctx.renderApp();
    return activePromise;
  }

  return {
    get labMetrics() { return metrics; },
    get labMetricsBusy() { return busy; },
    get labMetricsProgress() { return progress; },
    get labMetricsError() { return error; },
    ensureLabMetrics: ensureLabMetrics,
    cancelLabMetrics: cancelLabMetrics,
    invalidateLabMetrics: invalidateLabMetrics
  };
}
