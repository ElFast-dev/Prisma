import { createLabDiagnosticCoordinator } from "../diagnostics/lab-diagnostic-coordinator.js?v=diag-20261023-1";

function now(windowRef) {
  return windowRef && windowRef.performance && typeof windowRef.performance.now === "function"
    ? windowRef.performance.now() : Date.now();
}

function writeTiming(windowRef, operation, durationMs, sampleCount, status) {
  const logger = windowRef && windowRef.console && windowRef.console.info;
  if (typeof logger !== "function") return;
  logger.call(windowRef.console, "[Prisma performance]", JSON.stringify({
    operation: operation,
    durationMs: Math.round(Math.max(0, durationMs) * 10) / 10,
    sampleCount: Number.isFinite(sampleCount) ? Math.max(0, Math.floor(sampleCount)) : 0,
    status: status || "completed"
  }));
}

function yieldToBrowser(windowRef) {
  return new Promise(function (resolve) {
    if (windowRef && typeof windowRef.setTimeout === "function") windowRef.setTimeout(resolve, 0);
    else setTimeout(resolve, 0);
  });
}

function signalType(feature) {
  const prefixes = [
    ["genre", "género: "], ["theme", "tema: "], ["synopsis", "trama: "],
    ["actor", "actor: "], ["director", "director: "], ["writer", "guionista: "],
    ["composer", "compositor: "], ["company", "productora: "], ["country", "país: "],
    ["language", "idioma original: "], ["spokenLanguage", "idioma hablado: "],
    ["collection", "saga: "], ["runtime", "duración: "], ["decade", "década: "]
  ];
  for (const item of prefixes) if (String(feature || "").indexOf(item[1]) === 0) return item[0];
  return "other";
}

function ratingIdentity(entry, movie, ctx) {
  const id = typeof ctx.movieTmdbId === "function"
    ? (ctx.movieTmdbId(entry) || ctx.movieTmdbId(movie)) : null;
  if (id != null && String(id).trim()) return "tmdb:" + String(id).trim();
  const title = entry && entry.title || movie && movie.title || "";
  const key = typeof ctx.titleKey === "function" ? ctx.titleKey(title) : String(title).trim().toLocaleLowerCase();
  const year = entry && (entry.year || entry.releaseYear || entry.release_year) ||
    movie && (movie.year || movie.releaseYear || movie.release_year) || "";
  return key ? "title:" + key + ":" + String(year) : "";
}

function emptyProfile() {
  return { average: 6.5, personalAverage: 6.5, priorStrength: 0, features: new Map(), count: 0, withMetadata: 0 };
}

function emptyRecommendationQuality(reason) {
  const modes = ["balanced", "affinity", "variety"].map(function (mode) {
    return { mode: mode, available: false, ndcgAt5: null, foldsEvaluated: 0 };
  });
  return {
    available: false,
    ranking: { available: false, count: 0, relevantCount: 0, folds: 5, foldsEvaluated: 0, cutoff: 5,
      relevantThreshold: 7, reason: reason || "La fase no ha generado resultados.", modes: modes },
    diversity: []
  };
}

export function createLabMetricsActions(ctx) {
  let metrics = null;
  let error = null;
  let revision = 0;
  let cachedKey = "";
  let observed = null;
  let renderQueued = false;
  let snapshot = null;
  let phaseResults = Object.create(null);
  const sourceIds = new WeakMap();
  let nextSourceId = 1;
  let reportedPipelineKey = "";

  function sourceId(value) {
    if ((typeof value !== "object" || value === null) && typeof value !== "function") return "none";
    if (!sourceIds.has(value)) sourceIds.set(value, nextSourceId++);
    return sourceIds.get(value);
  }

  function dataKey() {
    const state = ctx.state || {};
    const ratings = Array.isArray(state.rated) ? state.rated : [];
    const catalog = Array.isArray(ctx.catalog) ? ctx.catalog : [];
    const candidates = Array.isArray(ctx.recommendationCandidates) ? ctx.recommendationCandidates : [];
    return [
      revision, sourceId(state), sourceId(state.rated), sourceId(ctx.catalog), sourceId(ctx.recommendationCandidates),
      state.updatedAt || "", ratings.length, catalog.length, candidates.length,
      Array.isArray(state.watched) ? state.watched.length : 0,
      Array.isArray(state.watchlist) ? state.watchlist.length : 0,
      Array.isArray(state.hidden) ? state.hidden.length : 0,
      ctx.recommendationMode || "balanced"
    ].join("|");
  }

  function clearExperimentResults() {
    if (Object.prototype.hasOwnProperty.call(ctx, "ridgeEvaluationResult")) ctx.ridgeEvaluationResult = null;
    if (Object.prototype.hasOwnProperty.call(ctx, "temporalRidgeEvaluationResult")) ctx.temporalRidgeEvaluationResult = null;
    if (Object.prototype.hasOwnProperty.call(ctx, "influenceNormalizationEvaluationResult")) ctx.influenceNormalizationEvaluationResult = null;
  }

  function buildMetrics(results) {
    const source = results || {};
    const coveragePhase = source.coverage || {};
    const coverage = coveragePhase.coverage || null;
    const allFinal = Boolean(snapshot && Array.isArray(snapshot.phases) && snapshot.phases.every(function (phase) {
      return ["completed", "unavailable", "cancelled", "error"].includes(phase.status);
    }));
    if (!coveragePhase.available && !allFinal) return null;
    const profile = coveragePhase.profile || emptyProfile();
    const rawEvaluation = source.baseline || null;
    const evaluation = rawEvaluation || {
      available: false, count: coverage ? coverage.uniqueFeatureMovies : 0, mae: null, baselineMae: null,
      improvementPct: null, withoutDecadeMae: null, decadeImprovement: null, themeShrinkageMae: null,
      themeShrinkageDelta: null, themeShrinkagePrior: 2, decadeExamples: 0,
      unavailableReason: "La fase de línea base no ha generado métricas."
    };
    const recommendationQuality = source.ranking || emptyRecommendationQuality();
    return {
      stats: coveragePhase.stats || { total: (ctx.state && ctx.state.rated || []).length, average: null },
      profile: profile,
      genres: Array.isArray(coveragePhase.genres) ? coveragePhase.genres : [],
      coverage: coverage,
      evaluation: evaluation,
      recommendationQuality: recommendationQuality,
      ridgeEvaluation: source.ridge || null,
      normalizationEvaluation: source.normalization || null,
      featureFamilyEvaluation: source.featureFamilies || null,
      temporalEvaluation: source.temporal || null,
      diagnostic: snapshot
    };
  }

  function scheduleRender() {
    if (ctx.currentPage !== "lab" || renderQueued || !ctx.window) return;
    renderQueued = true;
    const render = function () {
      renderQueued = false;
      if (ctx.currentPage === "lab" && typeof ctx.renderApp === "function") ctx.renderApp();
    };
    if (typeof ctx.window.requestAnimationFrame === "function") ctx.window.requestAnimationFrame(render);
    else if (typeof ctx.window.setTimeout === "function") ctx.window.setTimeout(render, 0);
    else render();
  }

  function handleUpdate(nextSnapshot, results) {
    if (!nextSnapshot) {
      snapshot = null;
      phaseResults = Object.create(null);
      metrics = null;
      error = null;
      cachedKey = "";
      scheduleRender();
      return;
    }
    if (snapshot && snapshot.dataKey !== nextSnapshot.dataKey) {
      phaseResults = Object.create(null);
      metrics = null;
      cachedKey = "";
    }
    snapshot = nextSnapshot;
    if (results && typeof results === "object") phaseResults = results;
    const currentResults = phaseResults;
    metrics = buildMetrics(currentResults);
    if (nextSnapshot && nextSnapshot.phases) {
      error = nextSnapshot.phases.some(function (phase) { return phase.status === "error"; })
        ? "Una o más fases fallaron. El diagnóstico parcial está disponible y puedes reintentar las fases fallidas."
        : null;
      if (nextSnapshot.phases.every(function (phase) {
        return ["completed", "unavailable", "cancelled", "error"].indexOf(phase.status) !== -1;
      })) {
        cachedKey = dataKey();
        const pipelineKey = String(nextSnapshot.dataKey || "") + "|" + String(nextSnapshot.startedAt || "");
        if (pipelineKey !== reportedPipelineKey && nextSnapshot.durationMs != null) {
          reportedPipelineKey = pipelineKey;
          writeTiming(ctx.window, "lab-metrics-pipeline", nextSnapshot.durationMs,
            nextSnapshot.sampleCount, nextSnapshot.status === "partial-error" ? "partial-error" : "completed");
        }
      }
    } else {
      metrics = null;
      error = null;
      cachedKey = "";
      phaseResults = Object.create(null);
    }
    if (Object.prototype.hasOwnProperty.call(currentResults, "ridge")) ctx.ridgeEvaluationResult = currentResults.ridge;
    if (Object.prototype.hasOwnProperty.call(currentResults, "temporal")) ctx.temporalRidgeEvaluationResult = currentResults.temporal;
    if (Object.prototype.hasOwnProperty.call(currentResults, "normalization")) ctx.influenceNormalizationEvaluationResult = currentResults.normalization;
    scheduleRender();
  }

  function observation() {
    const state = ctx.state || {};
    return {
      state: state,
      ratings: state.rated,
      catalog: ctx.catalog,
      candidates: ctx.recommendationCandidates,
      mode: ctx.recommendationMode,
      updatedAt: state.updatedAt
    };
  }

  let coordinator;
  function observeSourceReferences() {
    const current = observation();
    if (observed && (
      observed.state !== current.state || observed.ratings !== current.ratings ||
      observed.catalog !== current.catalog || observed.candidates !== current.candidates ||
      observed.mode !== current.mode || observed.updatedAt !== current.updatedAt
    )) {
      revision += 1;
      metrics = null;
      cachedKey = "";
      if (coordinator) coordinator.invalidate();
    }
    observed = current;
  }

  function ratedEntries() {
    return Array.isArray(ctx.state && ctx.state.rated) ? ctx.state.rated : [];
  }

  function validRating(entry) {
    const value = typeof ctx.ratingValue === "function" ? ctx.ratingValue(entry) : Number(entry && entry.rating);
    return Number.isFinite(value) && value >= 1 && value <= 10 ? value : null;
  }

  async function runCoverage(control) {
    const settings = control || {};
    const ratings = ratedEntries();
    const seen = new Set();
    const supportByType = Object.create(null);
    const genreTotals = new Map();
    const mappedProfileRows = [];
    let genreAggregationMs = 0;
    let validEntries = 0;
    let ratingSum = 0;
    let linkedEntries = 0;
    let featureRows = 0;
    let uniqueRatings = 0;
    let uniqueFeatureRows = 0;
    const mappingStartedAt = now(ctx.window);
    const totalWork = Math.max(1, ratings.length * 2);

    for (let index = 0; index < ratings.length; index += 1) {
      if (!settings.shouldContinue()) return null;
      const entry = ratings[index];
      const rating = validRating(entry);
      if (rating != null) {
        validEntries += 1;
        ratingSum += rating;
        const movie = typeof ctx.findMovie === "function"
          ? ctx.findMovie(entry.title, entry.tmdbId || entry.tmId, entry.year || entry.releaseYear || entry.release_year)
          : null;
        const features = typeof ctx.movieFeatures === "function" ? (ctx.movieFeatures(movie, entry) || []) : [];
        mappedProfileRows.push({ entry: entry, movie: movie, features: features, rating: rating });
        const identity = ratingIdentity(entry, movie, ctx);
        if (identity && !seen.has(identity)) {
          seen.add(identity);
          uniqueRatings += 1;
          if (features.length) uniqueFeatureRows += 1;
        }
        if (features.length) {
          linkedEntries += 1;
          featureRows += features.length;
          features.forEach(function (feature) {
            const type = signalType(feature);
            supportByType[type] = (supportByType[type] || 0) + 1;
          });
        }
        const genreAggregationStartedAt = now(ctx.window);
        const genres = entry.genres && entry.genres.length ? entry.genres : (movie && movie.genres) || [];
        genres.forEach(function (genre) {
          const key = String(genre == null ? "" : genre).trim();
          if (!key) return;
          const current = genreTotals.get(key) || { sum: 0, count: 0 };
          current.sum += rating;
          current.count += 1;
          genreTotals.set(key, current);
        });
        genreAggregationMs += Math.max(0, now(ctx.window) - genreAggregationStartedAt);
      }
      if ((index + 1) % 16 === 0 || index + 1 === ratings.length) {
        settings.onProgress({
          completedWork: index + 1,
          totalWork: totalWork,
          detail: "Contando identidad y cobertura de metadatos"
        });
        await yieldToBrowser(ctx.window);
      }
    }
    writeTiming(ctx.window, "coverage-mapping", now(ctx.window) - mappingStartedAt, validEntries, "completed");

    const statsStartedAt = now(ctx.window);
    const stats = {
      total: validEntries,
      average: validEntries ? ratingSum / validEntries : null,
      matched: linkedEntries
    };
    writeTiming(ctx.window, "summaryStats", now(ctx.window) - statsStartedAt, validEntries, "completed");

    const genres = Array.from(genreTotals.entries()).map(function (entry) {
      return { name: entry[0], average: entry[1].sum / entry[1].count, count: entry[1].count };
    }).filter(function (item) { return item.count >= 2; })
      .sort(function (left, right) { return right.average - left.average; });

    const profileStartedAt = now(ctx.window);
    let profile;
    if (typeof ctx.buildProfileAsync === "function") {
      profile = await ctx.buildProfileAsync(undefined, undefined, {
        shouldContinue: settings.shouldContinue,
        mappedRows: mappedProfileRows,
        batchSize: 32,
        yieldToBrowser: function () { return yieldToBrowser(ctx.window); },
        onProgress: function (update) {
          if (!update) return;
          settings.onProgress({
            completedWork: ratings.length + (Number(update.completedWork) || 0),
            totalWork: totalWork,
            detail: update.detail || "Construcción cooperativa del perfil"
          });
        }
      });
      if (!profile || !settings.shouldContinue()) return null;
    } else {
      profile = typeof ctx.buildProfile === "function" ? ctx.buildProfile() : emptyProfile();
    }
    writeTiming(ctx.window, "buildProfile", now(ctx.window) - profileStartedAt,
      profile && profile.count || validEntries, "completed");
    writeTiming(ctx.window, "genreStats", genreAggregationMs, validEntries, "completed");

    const features = profile.features && typeof profile.features.forEach === "function" ? profile.features : new Map();
    const supportDistribution = { once: 0, twoToFour: 0, fiveToNine: 0, tenOrMore: 0 };
    features.forEach(function (feature) {
      const count = Number(feature && feature.count) || 0;
      if (count <= 1) supportDistribution.once += 1;
      else if (count <= 4) supportDistribution.twoToFour += 1;
      else if (count <= 9) supportDistribution.fiveToNine += 1;
      else supportDistribution.tenOrMore += 1;
    });
    const metadataCount = Math.min(validEntries, linkedEntries);
    const report = {
      ratingEntries: ratings.length,
      validRatingEntries: validEntries,
      invalidRatingEntries: Math.max(0, ratings.length - validEntries),
      uniqueRatedMovies: uniqueRatings,
      featureLinkedRatingEntries: linkedEntries,
      uniqueFeatureMovies: uniqueFeatureRows,
      ratingsWithoutUsefulFeatures: Math.max(0, validEntries - linkedEntries),
      featurelessUniqueMovies: Math.max(0, uniqueRatings - uniqueFeatureRows),
      profileFeatureCount: features.size,
      featureObservations: featureRows,
      supportDistribution: supportDistribution,
      signalTypeCounts: supportByType,
      catalogMovies: Array.isArray(ctx.catalog) ? ctx.catalog.length : 0,
      candidatesAvailable: Array.isArray(ctx.recommendationCandidates) ? ctx.recommendationCandidates.length : 0,
      metadataCoverage: validEntries ? metadataCount / validEntries : 0,
      featureLinkedCoverage: uniqueRatings ? uniqueFeatureRows / uniqueRatings : 0
    };
    return { available: true, stats: stats, profile: profile, genres: genres, coverage: report };
  }

  async function runBaseline(control) {
    if (typeof ctx.evaluateModelAsync !== "function") {
      return { available: false, count: 0, mae: null, baselineMae: null, unavailableReason: "El evaluador heurístico asíncrono no está configurado." };
    }
    const n = Math.max(0, ratedEntries().length);
    const startedAt = now(ctx.window);
    const result = await ctx.evaluateModelAsync({
      batchSize: 8,
      shouldContinue: control.shouldContinue,
      onProgress: function (update) {
        if (!update) return;
        const completed = Math.max(0, Number(update.completed) || 0);
        control.onProgress({
          completedWork: update.phase === "mapping" ? completed : n + completed,
          totalWork: Math.max(1, n * 2),
          detail: update.phase === "mapping" ? "Enlazando metadatos" : "Validación de error absoluto"
        });
      }
    });
    writeTiming(ctx.window, "rating-evaluation", now(ctx.window) - startedAt,
      result && result.count || n, result == null ? "cancelled" : (result.available === false ? "unavailable" : "completed"));
    return result;
  }

  async function runRanking(control) {
    const coveragePhase = phaseResults.coverage || {};
    const profile = coveragePhase.profile || (typeof ctx.buildProfile === "function" ? ctx.buildProfile() : emptyProfile());
    if (typeof ctx.evaluateRecommendationQualityAsync !== "function") {
      return { available: false, ranking: emptyRecommendationQuality("El evaluador de ranking no está configurado.").ranking, diversity: [], unavailableReason: "El evaluador de ranking no está configurado." };
    }
    const startedAt = now(ctx.window);
    const value = await ctx.evaluateRecommendationQualityAsync({
      profile: profile,
      shouldContinue: control.shouldContinue,
      onProgress: control.onProgress,
      onMeasure: function (operation, durationMs, sampleCount, status) {
        writeTiming(ctx.window, operation, durationMs, sampleCount, status);
      }
    });
    writeTiming(ctx.window, "recommendation-quality", now(ctx.window) - startedAt,
      value && value.ranking && value.ranking.count || ratedEntries().length, value == null ? "cancelled" : "completed");
    if (!value) return null;
    const ranking = value.ranking || {};
    return {
      available: Boolean(ranking.available),
      ranking: ranking,
      diversity: Array.isArray(value.diversity) ? value.diversity : [],
      unavailableReason: ranking.available ? null : (ranking.reason || "nDCG@5 no disponible con la muestra retenida.")
    };
  }

  const phaseRunners = {
    coverage: runCoverage,
    baseline: runBaseline,
    ranking: runRanking,
    normalization: async function (control) {
      if (!ctx.recommendationNormalizationEvaluation || typeof ctx.recommendationNormalizationEvaluation.evaluateAsync !== "function") {
        return { available: false, unavailableReason: "El evaluador de normalización no está configurado." };
      }
      return ctx.recommendationNormalizationEvaluation.evaluateAsync({
        shouldContinue: control.shouldContinue,
        onProgress: control.onProgress,
        onMeasure: function (operation, durationMs, sampleCount, status) {
          writeTiming(ctx.window, operation, durationMs, sampleCount, status);
        }
      });
    },
    ridge: async function (control) {
      if (!ctx.ridgeRecommendationExperiment || typeof ctx.ridgeRecommendationExperiment.evaluateAsync !== "function") {
        return { available: false, unavailableReason: "El evaluador Ridge no está configurado." };
      }
      return ctx.ridgeRecommendationExperiment.evaluateAsync(function (update) {
        const repeats = Math.max(1, Number(update && update.totalRepeats) || 3);
        const completedRepeats = Math.max(0, Number(update && update.completedRepeats) || 0);
        const folds = Math.max(1, Number(update && update.foldsPerRepeat) || 5);
        const completed = Number.isFinite(Number(update && update.completedWork))
          ? Number(update.completedWork) : completedRepeats * folds;
        const total = Number.isFinite(Number(update && update.totalWork))
          ? Number(update.totalWork) : repeats * folds;
        control.onProgress({
          completedWork: completed,
          totalWork: total,
          detail: update && update.detail || ("Repetición " + Math.min(repeats, completedRepeats) + " de " + repeats)
        });
        return control.shouldContinue();
      }, {
        shouldContinue: control.shouldContinue,
        yieldToBrowser: function () { return yieldToBrowser(ctx.window); },
        batchSize: 48
      });
    },
    temporal: async function (control) {
      const evaluator = ctx.temporalRidgeDiagnosticExperiment || ctx.temporalRidgeRecommendationExperiment;
      if (!evaluator || typeof evaluator.evaluateTemporalAsync !== "function") {
        return { available: false, unavailableReason: "El evaluador temporal con fechas explícitas no está configurado." };
      }
      return evaluator.evaluateTemporalAsync(function (update) {
        const total = Math.max(1, Number(update && update.totalWork) || Number(update && update.totalWindows) || 5);
        const completed = Math.max(0, Number(update && update.completedWork) || Number(update && update.completedWindows) || 0);
        control.onProgress({
          completedWork: completed,
          totalWork: total,
          detail: update && update.detail || ("Ventana temporal " + Number(update && update.completedWindows || 0) + " de " + Number(update && update.totalWindows || 5))
        });
        return control.shouldContinue();
      }, {
        shouldContinue: control.shouldContinue,
        yieldToBrowser: function () { return yieldToBrowser(ctx.window); },
        batchSize: 12
      });
    },
    featureFamilies: async function (control) {
      if (!ctx.featureFamilyEvaluation || typeof ctx.featureFamilyEvaluation.evaluateAsync !== "function") {
        return { available: false, unavailableReason: "El evaluador emparejado de familias de características no está configurado." };
      }
      return ctx.featureFamilyEvaluation.evaluateAsync({
        shouldContinue: control.shouldContinue,
        onProgress: control.onProgress
      });
    }
  };

  coordinator = createLabDiagnosticCoordinator({
    getDataKey: dataKey,
    getSampleCount: function () { return ratedEntries().length; },
    runPhase: async function (phaseId, control) {
      const runner = phaseRunners[phaseId];
      if (typeof runner !== "function") return { available: false, unavailableReason: "Fase desconocida." };
      const startedAt = now(ctx.window);
      let result;
      let status = "completed";
      try {
        result = await runner(control);
        if (result == null || !control.shouldContinue()) status = "cancelled";
        else if (result.available === false) status = "unavailable";
        return result;
      } catch (error) {
        status = control.shouldContinue() ? "error" : "cancelled";
        throw error;
      } finally {
        writeTiming(ctx.window, "lab-diagnostic-" + phaseId, now(ctx.window) - startedAt,
          result && (result.sampleCount || result.count) || ratedEntries().length, status);
      }
    },
    onUpdate: handleUpdate,
    yieldToBrowser: function () { return yieldToBrowser(ctx.window); }
  });

  function ensureLabMetrics() {
    observeSourceReferences();
    const key = dataKey();
    if (metrics && cachedKey === key && snapshot && snapshot.status !== "running") return Promise.resolve(metrics);
    error = null;
    return coordinator.ensure().then(function () {
      return metrics;
    });
  }

  function restartLabDiagnostic() {
    observeSourceReferences();
    clearExperimentResults();
    metrics = null;
    error = null;
    cachedKey = "";
    return coordinator.restart().then(function () { return metrics; });
  }

  function retryLabDiagnosticFailures() {
    observeSourceReferences();
    error = null;
    return coordinator.retryFailures().then(function () { return metrics; });
  }

  function cancelLabMetrics() {
    if (coordinator) coordinator.invalidate();
    metrics = null;
    error = null;
    cachedKey = "";
  }

  function invalidateLabMetrics() {
    revision += 1;
    metrics = null;
    error = null;
    cachedKey = "";
    observed = observation();
    if (coordinator) coordinator.invalidate();
  }

  return {
    get labMetrics() { return metrics; },
    get labMetricsBusy() { return Boolean(snapshot && snapshot.status === "running"); },
    get labMetricsProgress() { return snapshot || null; },
    get labDiagnosticSnapshot() { return coordinator.getSnapshot(); },
    get labMetricsError() { return error; },
    ensureLabMetrics: ensureLabMetrics,
    restartLabDiagnostic: restartLabDiagnostic,
    retryLabDiagnosticFailures: retryLabDiagnosticFailures,
    cancelLabMetrics: cancelLabMetrics,
    invalidateLabMetrics: invalidateLabMetrics
  };
}
