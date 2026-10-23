const REPORT_SCHEMA = "prisma-recommendation-diagnostics/v12";
const MAX_FEATURE_DETAILS = 40;

function numeric(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rounded(value, digits) {
  const n = numeric(value);
  if (n == null) return null;
  const factor = 10 ** (digits == null ? 4 : digits);
  return Math.round(n * factor) / factor;
}

function nonNegativeInteger(value) {
  const n = numeric(value);
  return n == null ? 0 : Math.max(0, Math.floor(n));
}

function featureParts(name) {
  const text = String(name || "");
  const prefixes = [
    ["genre", "género: "],
    ["theme", "tema: "],
    ["synopsis", "trama: "],
    ["actor", "actor: "],
    ["director", "director: "],
    ["writer", "guionista: "],
    ["composer", "compositor: "],
    ["company", "productora: "],
    ["country", "país: "],
    ["language", "idioma original: "],
    ["spokenLanguage", "idioma hablado: "],
    ["collection", "saga: "],
    ["runtime", "duración: "],
    ["decade", "década: "]
  ];
  for (const [type, prefix] of prefixes) {
    if (text.startsWith(prefix)) return { type, value: text.slice(prefix.length) };
  }
  return { type: "other", value: "" };
}

function summarizeFeatures(featureMap, includeLabels) {
  const rows = [];
  if (featureMap && typeof featureMap.forEach === "function") {
    featureMap.forEach(function (item, name) {
      const parts = featureParts(name);
      const weight = numeric(item && item.weight) || 0;
      const support = nonNegativeInteger(item && item.count);
      rows.push({
        type: parts.type,
        value: parts.value,
        support: support,
        meanRating: rounded(item && item.mean, 3),
        learnedWeight: rounded(weight, 4),
        priority: Math.abs(weight) * Math.sqrt(Math.max(1, support))
      });
    });
  }

  const groups = Object.create(null);
  rows.forEach(function (row) {
    const group = groups[row.type] || {
      featureCount: 0,
      observations: 0,
      repeatedFeatures: 0,
      singleObservationFeatures: 0,
      positiveWeights: 0,
      negativeWeights: 0,
      nearZeroWeights: 0,
      meanAbsoluteWeight: 0,
      _absoluteWeightSum: 0
    };
    group.featureCount += 1;
    group.observations += row.support;
    if (row.support >= 2) group.repeatedFeatures += 1;
    else group.singleObservationFeatures += 1;
    if (row.learnedWeight > 0.0001) group.positiveWeights += 1;
    else if (row.learnedWeight < -0.0001) group.negativeWeights += 1;
    else group.nearZeroWeights += 1;
    group._absoluteWeightSum += Math.abs(row.learnedWeight);
    groups[row.type] = group;
  });

  Object.keys(groups).forEach(function (type) {
    const group = groups[type];
    group.meanAbsoluteWeight = group.featureCount
      ? rounded(group._absoluteWeightSum / group.featureCount, 4)
      : 0;
    delete group._absoluteWeightSum;
  });

  const aggregate = {
    signalTypes: groups,
    totalFeatures: rows.length
  };
  if (!includeLabels) return aggregate;

  rows.sort(function (a, b) {
    return b.priority - a.priority ||
      b.support - a.support ||
      a.type.localeCompare(b.type) ||
      a.value.localeCompare(b.value);
  });
  aggregate.featureDetails = rows.slice(0, MAX_FEATURE_DETAILS).map(function (row) {
    return {
      type: row.type,
      value: row.value,
      support: row.support,
      meanRating: row.meanRating,
      learnedWeight: row.learnedWeight
    };
  });
  aggregate.featureDetailsLimit = MAX_FEATURE_DETAILS;
  aggregate.omittedFeatureDetails = Math.max(0, rows.length - MAX_FEATURE_DETAILS);
  return aggregate;
}

function ratingHistogram(values) {
  const counts = {};
  for (let rating = 1; rating <= 10; rating += 1) counts[String(rating)] = 0;
  values.forEach(function (value) {
    const rating = numeric(value);
    if (rating != null && rating >= 1 && rating <= 10) {
      const key = String(Math.round(rating));
      if (key in counts && Math.abs(rating - Math.round(rating)) < 0.000001) counts[key] += 1;
    }
  });
  return counts;
}

function collectionCounts(counts) {
  const input = counts || {};
  return {
    watched: nonNegativeInteger(input.watched),
    pending: nonNegativeInteger(input.pending),
    hidden: nonNegativeInteger(input.hidden)
  };
}

function ratingEvaluation(source) {
  const evaluation = source || {};
  const available = Boolean(evaluation.available);
  return {
    available,
    sampleCount: nonNegativeInteger(evaluation.count),
    mae: available ? rounded(evaluation.mae, 4) : null,
    baselineMae: available ? rounded(evaluation.baselineMae, 4) : null,
    relativeImprovementPct: available ? rounded(evaluation.improvementPct, 2) : null,
    withDecadeMae: available ? rounded(evaluation.mae, 4) : null,
    withoutDecadeMae: available ? rounded(evaluation.withoutDecadeMae, 4) : null,
    decadeMaeDifferenceLowerIsBetter: available ? rounded(evaluation.decadeImprovement, 4) : null,
    themeShrinkageMae: available ? rounded(evaluation.themeShrinkageMae, 4) : null,
    themeShrinkageDeltaBaseMinusRegularized: available ? rounded(evaluation.themeShrinkageDelta, 4) : null,
    themeShrinkageSupportPrior: numeric(evaluation.themeShrinkagePrior),
    decadeExamples: nonNegativeInteger(evaluation.decadeExamples),
    unavailableReason: available ? null : "Se necesitan al menos cinco valoraciones válidas con características enlazadas."
  };
}


function ridgeRankingEvaluation(source) {
  const evaluation = source && typeof source === "object" ? source : {};
  const available = Boolean(evaluation.available);
  const modes = Array.isArray(evaluation.modes) ? evaluation.modes : [];
  return {
    available: available,
    sampleCount: nonNegativeInteger(evaluation.count),
    relevantRatingsCount: nonNegativeInteger(evaluation.relevantCount),
    folds: nonNegativeInteger(evaluation.folds),
    foldsEvaluated: nonNegativeInteger(evaluation.foldsEvaluated),
    cutoff: nonNegativeInteger(evaluation.cutoff),
    relevantRatingThreshold: numeric(evaluation.relevantThreshold),
    unavailableReason: available ? null : (typeof evaluation.reason === "string" ? evaluation.reason : "La comparación Ridge de nDCG@5 no está disponible."),
    modes: modes.map(function (mode) {
      const modeAvailable = Boolean(mode.available);
      return {
        mode: String(mode.mode || ""),
        available: modeAvailable,
        baselineNdcgAt5: modeAvailable ? rounded(mode.baselineNdcgAt5, 4) : null,
        ridgeNdcgAt5: modeAvailable ? rounded(mode.ridgeNdcgAt5, 4) : null,
        hybridNdcgAt5: modeAvailable ? rounded(mode.hybridNdcgAt5, 4) : null,
        deltaRidgeMinusBaseline: modeAvailable ? rounded(mode.deltaRidgeMinusBaseline, 4) : null,
        deltaHybridMinusBaseline: modeAvailable ? rounded(mode.deltaHybridMinusBaseline, 4) : null,
        foldsEvaluated: nonNegativeInteger(mode.foldsEvaluated),
        foldsRidgeWins: nonNegativeInteger(mode.foldsRidgeWins),
        foldsRidgeTies: nonNegativeInteger(mode.foldsRidgeTies),
        foldsRidgeLosses: nonNegativeInteger(mode.foldsRidgeLosses),
        foldsHybridWins: nonNegativeInteger(mode.foldsHybridWins),
        foldsHybridTies: nonNegativeInteger(mode.foldsHybridTies),
        foldsHybridLosses: nonNegativeInteger(mode.foldsHybridLosses)
      };
    })
  };
}

function ridgeFoldStabilityEvaluation(source) {
  const stability = source && typeof source === "object" ? source : {};
  const available = Boolean(stability.available);
  return {
    available: available,
    foldsEvaluated: nonNegativeInteger(stability.foldsEvaluated),
    ridgeMaeWins: nonNegativeInteger(stability.ridgeMaeWins),
    ties: nonNegativeInteger(stability.ties),
    baselineMaeWins: nonNegativeInteger(stability.baselineMaeWins)
  };
}

function hybridFoldStabilityEvaluation(source) {
  const stability = source && typeof source === "object" ? source : {};
  const available = Boolean(stability.available);
  return {
    available: available,
    foldsEvaluated: nonNegativeInteger(stability.foldsEvaluated),
    hybridMaeWins: nonNegativeInteger(stability.hybridMaeWins),
    ties: nonNegativeInteger(stability.ties),
    baselineMaeWins: nonNegativeInteger(stability.baselineMaeWins)
  };
}

function ridgeAlphaCounts(source) {
  const counts = {};
  const raw = source && typeof source === "object" ? source : {};
  Object.keys(raw).sort(function (left, right) { return Number(left) - Number(right); }).forEach(function (alpha) {
    const numericAlpha = Number(alpha);
    const count = nonNegativeInteger(raw[alpha]);
    if (Number.isFinite(numericAlpha) && numericAlpha > 0 && count > 0) counts[String(numericAlpha)] = count;
  });
  return counts;
}

function ridgeRepeatedValidationEvaluation(source) {
  const evaluation = source && typeof source === "object" ? source : null;
  const available = Boolean(evaluation && evaluation.available);
  const repeatSummaries = evaluation && Array.isArray(evaluation.repeatSummaries)
    ? evaluation.repeatSummaries : [];
  return {
    executionStatus: evaluation ? (available ? "completed" : "unavailable") : "not-run",
    available: available,
    sampleCount: nonNegativeInteger(evaluation && evaluation.sampleCount),
    repeats: nonNegativeInteger(evaluation && evaluation.repeats),
    foldsPerRepeat: nonNegativeInteger(evaluation && evaluation.foldsPerRepeat),
    foldsEvaluated: nonNegativeInteger(evaluation && evaluation.foldsEvaluated),
    innerFolds: nonNegativeInteger(evaluation && evaluation.innerFolds),
    selectedAlphaCounts: ridgeAlphaCounts(evaluation && evaluation.selectedAlphaCounts),
    mae: available ? rounded(evaluation.mae, 4) : null,
    baselineMaeSameFolds: available ? rounded(evaluation.baselineMae, 4) : null,
    deltaBaselineMinusRidge: available ? rounded(evaluation.deltaBaseMinusRidge, 4) : null,
    hybridMae: available ? rounded(evaluation.hybridMae, 4) : null,
    deltaBaselineMinusHybrid: available ? rounded(evaluation.deltaBaseMinusHybrid, 4) : null,
    foldStability: ridgeFoldStabilityEvaluation(evaluation && evaluation.foldStability),
    hybridFoldStability: hybridFoldStabilityEvaluation(evaluation && evaluation.hybridFoldStability),
    rankingQuality: ridgeRankingEvaluation(evaluation && evaluation.rankingQuality),
    repeatSummaries: repeatSummaries.map(function (repeat) {
      const repeatAvailable = repeat && typeof repeat === "object";
      return {
        repeat: nonNegativeInteger(repeat && repeat.repeat),
        sampleCount: nonNegativeInteger(repeat && repeat.sampleCount),
        foldsEvaluated: nonNegativeInteger(repeat && repeat.foldsEvaluated),
        selectedAlphaCounts: ridgeAlphaCounts(repeat && repeat.selectedAlphaCounts),
        mae: repeatAvailable ? rounded(repeat.mae, 4) : null,
        baselineMaeSameFolds: repeatAvailable ? rounded(repeat.baselineMae, 4) : null,
        deltaBaselineMinusRidge: repeatAvailable ? rounded(repeat.deltaBaseMinusRidge, 4) : null,
        hybridMae: repeatAvailable ? rounded(repeat.hybridMae, 4) : null,
        deltaBaselineMinusHybrid: repeatAvailable ? rounded(repeat.deltaBaseMinusHybrid, 4) : null,
        foldStability: ridgeFoldStabilityEvaluation(repeat && repeat.foldStability),
        hybridFoldStability: hybridFoldStabilityEvaluation(repeat && repeat.hybridFoldStability),
        rankingQuality: ridgeRankingEvaluation(repeat && repeat.rankingQuality)
      };
    }),
    unavailableReason: available ? null : (evaluation && typeof evaluation.unavailableReason === "string"
      ? evaluation.unavailableReason : (evaluation ? "La validación Ridge repetida no está disponible." : "La validación Ridge repetida no se ha ejecutado."))
  };
}

function ridgeEvaluation(source) {
  const evaluation = source && typeof source === "object" ? source : null;
  const available = Boolean(evaluation && evaluation.available);
  const alphaCounts = {};
  const rawCounts = evaluation && evaluation.selectedAlphaCounts && typeof evaluation.selectedAlphaCounts === "object"
    ? evaluation.selectedAlphaCounts : {};
  Object.keys(rawCounts).sort(function (left, right) { return Number(left) - Number(right); }).forEach(function (alpha) {
    const numericAlpha = Number(alpha);
    const count = nonNegativeInteger(rawCounts[alpha]);
    if (Number.isFinite(numericAlpha) && numericAlpha > 0 && count > 0) {
      alphaCounts[String(numericAlpha)] = count;
    }
  });
  const rawGrid = evaluation && Array.isArray(evaluation.alphaGrid) ? evaluation.alphaGrid : [];
  return {
    executionStatus: evaluation ? (available ? "completed" : "unavailable") : "not-run",
    available,
    sampleCount: nonNegativeInteger(evaluation && evaluation.count),
    mae: available ? rounded(evaluation.mae, 4) : null,
    baselineMaeSameFolds: available ? rounded(evaluation.baselineMae, 4) : null,
    deltaBaselineMinusRidge: available ? rounded(evaluation.deltaBaseMinusRidge, 4) : null,
    hybridMae: available ? rounded(evaluation.hybridMae, 4) : null,
    deltaBaselineMinusHybrid: available ? rounded(evaluation.deltaBaseMinusHybrid, 4) : null,
    outerFolds: nonNegativeInteger(evaluation && evaluation.outerFolds),
    foldsEvaluated: nonNegativeInteger(evaluation && evaluation.foldsEvaluated),
    innerFolds: nonNegativeInteger(evaluation && evaluation.innerFolds),
    alphaGrid: rawGrid.map(numeric).filter(function (value) { return value != null && value > 0; }),
    selectedAlphaCounts: alphaCounts,
    foldStability: ridgeFoldStabilityEvaluation(evaluation && evaluation.foldStability),
    hybridFoldStability: hybridFoldStabilityEvaluation(evaluation && evaluation.hybridFoldStability),
    rankingQuality: ridgeRankingEvaluation(evaluation && evaluation.rankingQuality),
    repeatedValidation: ridgeRepeatedValidationEvaluation(evaluation && evaluation.repeatedValidation),
    unavailableReason: available ? null : (evaluation && typeof evaluation.reason === "string"
      ? evaluation.reason : (evaluation ? "El experimento Ridge no está disponible." : "El experimento Ridge no se ha ejecutado."))
  };
}

function temporalRidgeEvaluation(source) {
  const evaluation = source && typeof source === "object" ? source : null;
  const available = Boolean(evaluation && evaluation.available);
  const stability = evaluation && evaluation.windowStability && typeof evaluation.windowStability === "object"
    ? evaluation.windowStability : {};
  const summaries = evaluation && Array.isArray(evaluation.windowSummaries) ? evaluation.windowSummaries : [];
  return {
    executionStatus: evaluation ? (available ? "completed" : "unavailable") : "not-run",
    available: available,
    sampleCount: nonNegativeInteger(evaluation && evaluation.sampleCount),
    featureRowCount: nonNegativeInteger(evaluation && evaluation.featureRowCount),
    timestampedFeatureCount: nonNegativeInteger(evaluation && evaluation.timestampedFeatureCount),
    explicitDateCount: nonNegativeInteger(evaluation && evaluation.explicitDateCount),
    unverifiedDateCount: nonNegativeInteger(evaluation && evaluation.unverifiedDateCount),
    dateProvenanceStatus: evaluation && evaluation.dateProvenanceStatus === "explicit" ? "explicit" :
      (evaluation && evaluation.dateProvenanceStatus === "exploratory" ? "exploratory" : "unavailable"),
    dateSourceMode: evaluation && evaluation.dateSourceMode === "collection-added-proxy" ? "collection-added-proxy" :
      (evaluation && evaluation.dateSourceMode === "watchedAt-only" ? "watchedAt-only" : "not-selected"),
    temporalTimezone: evaluation && evaluation.temporalTimezone === "America/Panama" ? "America/Panama" : "not-selected",
    missingDateCount: nonNegativeInteger(evaluation && evaluation.missingDateCount),
    distinctDayCount: nonNegativeInteger(evaluation && evaluation.distinctDayCount),
    warmupCount: nonNegativeInteger(evaluation && evaluation.warmupCount),
    testCount: nonNegativeInteger(evaluation && evaluation.testCount),
    windowsPlanned: nonNegativeInteger(evaluation && evaluation.windowsPlanned),
    windowsEvaluated: nonNegativeInteger(evaluation && evaluation.windowsEvaluated),
    innerWindows: nonNegativeInteger(evaluation && evaluation.innerWindows),
    alphaGrid: (Array.isArray(evaluation && evaluation.alphaGrid) ? evaluation.alphaGrid : [])
      .map(numeric).filter(function (value) { return value != null && value > 0; }),
    selectedAlphaCounts: ridgeAlphaCounts(evaluation && evaluation.selectedAlphaCounts),
    mae: available ? rounded(evaluation.mae, 4) : null,
    baselineMaeSameWindows: available ? rounded(evaluation.baselineMae, 4) : null,
    deltaBaselineMinusRidge: available ? rounded(evaluation.deltaBaseMinusRidge, 4) : null,
    windowStability: {
      available: Boolean(stability.available),
      windowsEvaluated: nonNegativeInteger(stability.windowsEvaluated),
      ridgeMaeWins: nonNegativeInteger(stability.ridgeMaeWins),
      ties: nonNegativeInteger(stability.ties),
      baselineMaeWins: nonNegativeInteger(stability.baselineMaeWins)
    },
    rankingQuality: ridgeRankingEvaluation(evaluation && evaluation.rankingQuality),
    windowSummaries: available ? summaries.map(function (window) {
      return {
        window: nonNegativeInteger(window && window.window),
        trainingCount: nonNegativeInteger(window && window.trainingCount),
        testCount: nonNegativeInteger(window && window.testCount),
        selectedAlpha: numeric(window && window.selectedAlpha),
        mae: rounded(window && window.mae, 4),
        baselineMaeSameWindows: rounded(window && window.baselineMae, 4),
        deltaBaselineMinusRidge: rounded(window && window.deltaBaseMinusRidge, 4),
        rankingAvailable: Boolean(window && window.rankingAvailable)
      };
    }) : [],
    unavailableReason: available ? null : (evaluation && typeof evaluation.unavailableReason === "string"
      ? evaluation.unavailableReason : (evaluation ? "La evaluación temporal no está disponible." : "La evaluación temporal no se ha ejecutado."))
  };
}

function influenceNormalizationEvaluation(source) {
  const evaluation = source && typeof source === "object" ? source : null;
  const available = Boolean(evaluation && evaluation.available);
  const methods = Array.isArray(evaluation && evaluation.methods) ? evaluation.methods : [];
  const allowedMethods = new Set(["mean", "coverage-sqrt", "matched-only"]);
  const allowedModes = new Set(["balanced", "affinity", "variety"]);
  return {
    executionStatus: evaluation ? (available ? "completed" : "unavailable") : "not-run",
    available: available,
    sampleCount: nonNegativeInteger(evaluation && evaluation.sampleCount),
    relevantRatingsCount: nonNegativeInteger(evaluation && evaluation.relevantRatingsCount),
    folds: nonNegativeInteger(evaluation && evaluation.folds),
    foldsEvaluated: nonNegativeInteger(evaluation && evaluation.foldsEvaluated),
    cutoff: nonNegativeInteger(evaluation && evaluation.cutoff),
    relevantRatingThreshold: numeric(evaluation && evaluation.relevantRatingThreshold),
    baselineMethod: "mean",
    methods: methods.filter(function (method) {
      return method && allowedMethods.has(method.method);
    }).map(function (method) {
      const methodAvailable = Boolean(method.available);
      const stability = method.maeFoldStability || {};
      const rankingModes = Array.isArray(method.rankingModes) ? method.rankingModes : [];
      return {
        method: method.method,
        available: methodAvailable,
        mae: methodAvailable ? rounded(method.mae, 4) : null,
        deltaMaeVsMean: methodAvailable ? rounded(method.deltaMaeVsMean, 4) : null,
        maeFoldStability: {
          available: Boolean(stability.available),
          foldsEvaluated: nonNegativeInteger(stability.foldsEvaluated),
          variantWins: nonNegativeInteger(stability.variantWins),
          ties: nonNegativeInteger(stability.ties),
          meanWins: nonNegativeInteger(stability.meanWins)
        },
        rankingModes: rankingModes.filter(function (item) {
          return item && allowedModes.has(item.mode);
        }).map(function (item) {
          const modeAvailable = Boolean(item.available);
          return {
            mode: item.mode,
            available: modeAvailable,
            ndcgAt5: modeAvailable ? rounded(item.ndcgAt5, 4) : null,
            deltaNdcgVsMean: modeAvailable ? rounded(item.deltaNdcgVsMean, 4) : null,
            foldsEvaluated: nonNegativeInteger(item.foldsEvaluated),
            foldsWins: nonNegativeInteger(item.foldsWins),
            foldsTies: nonNegativeInteger(item.foldsTies),
            foldsLosses: nonNegativeInteger(item.foldsLosses)
          };
        })
      };
    }),
    unavailableReason: available ? null : "La calibración de normalización de influencia no está disponible."
  };
}


function rankingEvaluation(source) {
  const wrapper = source || {};
  const ranking = wrapper.ranking || wrapper;
  const modes = Array.isArray(ranking.modes) ? ranking.modes : [];
  const diversity = Array.isArray(wrapper.diversity) ? wrapper.diversity : [];
  return {
    ranking: {
      available: Boolean(ranking.available),
      sampleCount: nonNegativeInteger(ranking.count),
      relevantRatingsCount: nonNegativeInteger(ranking.relevantCount),
      folds: nonNegativeInteger(ranking.folds),
      foldsEvaluated: nonNegativeInteger(ranking.foldsEvaluated),
      cutoff: nonNegativeInteger(ranking.cutoff),
      relevantRatingThreshold: numeric(ranking.relevantThreshold),
      unavailableReason: ranking.available ? null : (typeof ranking.reason === "string" ? ranking.reason : "Datos insuficientes para la evaluación del ranking."),
      modes: modes.map(function (mode) {
        return {
          mode: String(mode.mode || ""),
          available: Boolean(mode.available),
          ndcgAt5: mode.available ? rounded(mode.ndcgAt5, 4) : null,
          foldsEvaluated: nonNegativeInteger(mode.foldsEvaluated)
        };
      })
    },
    diversity: diversity.map(function (item) {
      return {
        mode: String(item.mode || ""),
        score: rounded(item.score, 4),
        comparablePairs: nonNegativeInteger(item.pairs),
        listSize: nonNegativeInteger(item.titles),
        titlesWithGenres: nonNegativeInteger(item.titlesWithGenres),
        uniqueGenres: nonNegativeInteger(item.uniqueGenres)
      };
    })
  };
}

const ALLOWED_PHASES = new Set(["coverage", "baseline", "ranking", "normalization", "ridge", "temporal", "featureFamilies"]);
const ALLOWED_PHASE_STATUSES = new Set(["pending", "running", "completed", "unavailable", "cancelled", "error"]);
const FEATURE_FAMILY_LABELS = {
  "genres-only": "Solo géneros",
  "genres-tags": "Géneros + etiquetas",
  "genres-tags-synopsis": "Géneros + etiquetas + sinopsis",
  "full-current": "Conjunto completo actual"
};

function isoDate(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
}

function safeStatus(value) {
  const status = String(value || "");
  return ALLOWED_PHASE_STATUSES.has(status) || ["completed", "partial-error", "partial-cancelled", "incomplete", "unknown"].includes(status)
    ? status : "unknown";
}

function diagnosticRunSummary(run) {
  if (!run || typeof run !== "object") return { schema: "prisma-lab-diagnostic-run/v1", status: "unknown", phases: [], durationMs: null };
  const phases = (Array.isArray(run.phases) ? run.phases : []).filter(function (phase) {
    return phase && ALLOWED_PHASES.has(phase.id);
  }).map(function (phase) {
    const progress = phase.progress || {};
    return {
      id: phase.id,
      status: safeStatus(phase.status),
      durationMs: rounded(phase.durationMs, 1),
      completedWork: nonNegativeInteger(progress.completed),
      totalWork: nonNegativeInteger(progress.total),
      unavailableReason: phase.status === "unavailable"
        ? String(phase.unavailableReason || "No cumple los requisitos de muestra.").slice(0, 220)
        : null,
      error: phase.status === "error" ? "Fase fallida; se conservan las demás mediciones." : null
    };
  });
  const statusValues = phases.map(function (phase) { return phase.status; });
  const allFinal = phases.length === ALLOWED_PHASES.size && statusValues.every(function (status) {
    return ["completed", "unavailable", "cancelled", "error"].includes(status);
  });
  const status = !allFinal ? (statusValues.includes("running") ? "incomplete" : "unknown")
    : (statusValues.includes("error") ? "partial-error"
      : (statusValues.includes("cancelled") ? "partial-cancelled" : "completed"));
  return {
    schema: "prisma-lab-diagnostic-run/v1",
    status: status,
    startedAt: isoDate(run.startedAt),
    finishedAt: isoDate(run.finishedAt),
    durationMs: rounded(run.durationMs, 1),
    sampleCount: nonNegativeInteger(run.sampleCount),
    globalPercent: percentReport(run.globalPercent),
    completedPhases: nonNegativeInteger(run.completedPhases),
    totalPhases: Math.min(ALLOWED_PHASES.size, phases.length || ALLOWED_PHASES.size),
    estimatedRemainingMs: rounded(run.estimatedRemainingMs, 1),
    estimateStatus: run.estimateStatus === "estimated" || run.estimateStatus === "measured" ? run.estimateStatus : "calculating",
    phases: phases
  };
}

function percentReport(value) {
  const number = numeric(value);
  return number == null ? 0 : Math.max(0, Math.min(100, Math.round(number)));
}

function coverageSummary(input) {
  if (!input || typeof input !== "object") return null;
  const nonNegativeKeys = [
    "ratingEntries", "validRatingEntries", "invalidRatingEntries", "uniqueRatedMovies",
    "featureLinkedRatingEntries", "uniqueFeatureMovies", "ratingsWithoutUsefulFeatures",
    "featurelessUniqueMovies", "profileFeatureCount", "featureObservations", "catalogMovies",
    "candidatesAvailable"
  ];
  const result = {};
  nonNegativeKeys.forEach(function (key) { result[key] = nonNegativeInteger(input[key]); });
  result.metadataCoverage = rounded(input.metadataCoverage, 4);
  result.featureLinkedCoverage = rounded(input.featureLinkedCoverage, 4);
  const distribution = input.supportDistribution || {};
  result.supportDistribution = {
    once: nonNegativeInteger(distribution.once),
    twoToFour: nonNegativeInteger(distribution.twoToFour),
    fiveToNine: nonNegativeInteger(distribution.fiveToNine),
    tenOrMore: nonNegativeInteger(distribution.tenOrMore)
  };
  const allowedTypes = ["genre", "theme", "synopsis", "actor", "director", "writer", "composer", "company", "country",
    "language", "spokenLanguage", "collection", "runtime", "decade", "other"];
  const typeCounts = input.signalTypeCounts || {};
  result.signalTypeCounts = {};
  allowedTypes.forEach(function (key) { result.signalTypeCounts[key] = nonNegativeInteger(typeCounts[key]); });
  return result;
}

function featureFamilySummary(input) {
  if (!input || typeof input !== "object") return { available: false, sampleCount: 0, foldsPlanned: 5, foldsEvaluated: 0, sharedPartition: true, families: [], unavailableReason: "La fase no produjo resultados." };
  const sourceFamilies = Array.isArray(input.families) ? input.families : [];
  const expected = ["genres-only", "genres-tags", "genres-tags-synopsis", "full-current"];
  const families = expected.map(function (id) {
    const row = sourceFamilies.find(function (item) { return item && item.id === id; }) || {};
    const modes = ["balanced", "affinity", "variety"].map(function (mode) {
      const current = (Array.isArray(row.rankingModes) ? row.rankingModes : []).find(function (item) { return item && item.mode === mode; }) || {};
      return {
        mode: mode,
        available: Boolean(current.available),
        ndcgAt5: rounded(current.ndcgAt5, 5),
        deltaNdcgVsGenres: rounded(current.deltaNdcgVsGenres, 5),
        foldsEvaluated: nonNegativeInteger(current.foldsEvaluated),
        wins: nonNegativeInteger(current.wins),
        ties: nonNegativeInteger(current.ties),
        losses: nonNegativeInteger(current.losses)
      };
    });
    return {
      id: id,
      label: FEATURE_FAMILY_LABELS[id],
      available: Boolean(row.available),
      mae: rounded(row.mae, 5),
      baselineMae: rounded(row.baselineMae, 5),
      deltaMaeVsGenres: rounded(row.deltaMaeVsGenres, 5),
      foldsEvaluated: nonNegativeInteger(row.foldsEvaluated),
      maeWins: nonNegativeInteger(row.maeWins),
      ties: nonNegativeInteger(row.ties),
      maeLosses: nonNegativeInteger(row.maeLosses),
      foldMae: Array.isArray(row.foldMae) ? row.foldMae.slice(0, 5).map(function (value) { return rounded(value, 5); }) : [],
      rankingModes: modes
    };
  });
  return {
    executionStatus: input.executionStatus === "completed" ? "completed" : "unavailable",
    available: Boolean(input.available),
    sampleCount: nonNegativeInteger(input.sampleCount),
    foldsPlanned: 5,
    foldsEvaluated: Math.min(5, nonNegativeInteger(input.foldsEvaluated)),
    sharedPartition: input.sharedPartition === true,
    trainingLeakageChecked: input.trainingLeakageChecked === true,
    families: families,
    unavailableReason: input.available ? null : String(input.unavailableReason || "La muestra no cumple los requisitos.").slice(0, 220),
    interpretationLimits: [
      "Las cuatro familias comparten las mismas películas con género enlazado y los mismos cinco pliegues.",
      "Las notas del pliegue retenido solo intervienen en el cálculo de error y ganancia, nunca en el perfil que predice ese pliegue.",
      "La comparación es descriptiva y no demuestra significación estadística ni causalidad."
    ]
  };
}

/**
 * Builds a shareable report from local aggregates only. It deliberately never accepts or
 * serializes the raw profile state, movie records, titles, movie IDs, dates or notes.
 */
export function buildRecommendationDiagnosticReport(input) {
  const source = input || {};
  const ratings = Array.isArray(source.ratingValues)
    ? source.ratingValues.filter(function (value) {
      const rating = numeric(value);
      return rating != null && rating >= 1 && rating <= 10;
    })
    : [];
  const profile = source.profile || {};
  const features = profile.features;
  const weights = source.signalWeights || {};
  const ratingCount = nonNegativeInteger(source.ratedCount == null ? ratings.length : source.ratedCount);
  const metadataCount = Math.min(ratings.length, nonNegativeInteger(profile.withMetadata));
  const featureCount = features && typeof features.size === "number" ? nonNegativeInteger(features.size) : 0;
  const quality = rankingEvaluation(source.recommendationQuality);
  const diagnosticRun = diagnosticRunSummary(source.diagnosticSnapshot);
  const coverage = coverageSummary(source.coverage);
  const featureFamilyComparison = featureFamilySummary(source.featureFamilyEvaluation);
  const generatedAt = isoDate(source.generatedAt) || new Date().toISOString();
  const requestedAppVersion = String(source.applicationVersion || "prisma-web/2026.10.23-lab-diagnostic.1");
  const applicationVersion = /^[a-zA-Z0-9./_-]{1,100}$/.test(requestedAppVersion)
    ? requestedAppVersion : "prisma-web/2026.10.23-lab-diagnostic.1";

  return {
    schema: REPORT_SCHEMA,
    generatedAt: generatedAt,
    applicationVersion: applicationVersion,
    privacy: {
      generatedLocally: true,
      networkTransmission: false,
      featureLabelsIncluded: Boolean(source.includeFeatureLabels),
      includes: [
        "Recuentos agregados de valoraciones, catálogo y colecciones",
        "Distribución de puntuaciones por valor",
        "Cobertura y señales agregadas del perfil",
        "Pesos del algoritmo y resultados agregados de MAE, Ridge, mezcla híbrida, validación repetida, evaluación temporal, calibración de normalización de influencia, nDCG@5 por modo y diversidad"
      ],
      excludes: [
        "Títulos y títulos originales de películas",
        "IDs de TMDB y otros identificadores de películas",
        "Registros individuales de valoración y predicciones por película",
        "Fechas de visionado, valoración u otros eventos personales",
        "Emociones, notas libres y textos personales",
        "Credenciales, datos de almacenamiento y copias de seguridad"
      ],
      caution: "Las estadísticas agregadas de géneros, temas, reparto o equipo creativo, si se incluyen sus nombres, pueden revelar parte de las preferencias personales. Revisa el informe antes de compartirlo."
    },
    sample: {
      ratedEntries: ratingCount,
      validRatingCount: ratings.length,
      ratingsWithFeatures: metadataCount,
      ratingsWithoutFeatures: Math.max(0, ratings.length - metadataCount),
      metadataCoverage: ratings.length ? rounded(metadataCount / ratings.length, 4) : 0,
      catalogEntries: nonNegativeInteger(source.catalogCount),
      collectionCounts: collectionCounts(source.collectionCounts),
      ratingDistribution: ratingHistogram(ratings)
    },
    model: {
      kind: "additive-content-baseline",
      activeRankingMode: ["balanced", "affinity", "variety"].includes(source.recommendationMode)
        ? source.recommendationMode
        : "balanced",
      baselineAverageRating: rounded(profile.average, 4),
      learnedFeatureCount: featureCount,
      signalWeights: {
        genre: rounded(weights.genre, 4),
        theme: rounded(weights.theme, 4),
        director: rounded(weights.director, 4),
        collection: rounded(weights.collection, 4),
        actor: rounded(weights.actor, 4),
        writer: rounded(weights.writer, 4),
        composer: rounded(weights.composer, 4),
        synopsis: rounded(weights.synopsis, 4),
        company: rounded(weights.company, 4),
        country: rounded(weights.country, 4),
        language: rounded(weights.language, 4),
        spokenLanguage: rounded(weights.spokenLanguage, 4),
        runtime: rounded(weights.runtime, 4),
        decade: rounded(weights.decade, 4)
      },
      featureAggregates: summarizeFeatures(features, Boolean(source.includeFeatureLabels))
    },
    evaluation: {
      ratingPrediction: ratingEvaluation(source.ratingEvaluation),
      ridgeExperiment: ridgeEvaluation(source.ridgeEvaluation),
      temporalRidgeExperiment: temporalRidgeEvaluation(source.temporalRidgeEvaluation),
      influenceNormalizationExperiment: influenceNormalizationEvaluation(source.influenceNormalizationEvaluation),
      rankingQuality: quality.ranking,
      currentListDiversity: quality.diversity
    },
    diagnostic: {
      schema: "prisma-lab-diagnostic-report/v1",
      status: diagnosticRun.status,
      run: diagnosticRun,
      coverage: coverage,
      featureFamilyComparison: featureFamilyComparison,
      phaseDurationsMs: diagnosticRun.phases.reduce(function (all, phase) {
        all[phase.id] = phase.durationMs;
        return all;
      }, {})
    },
    interpretationLimits: [
      "MAE mide la predicción de notas conocidas y no garantiza satisfacción con películas futuras.",
      "nDCG@5 de Prisma evalúa el orden de películas valoradas retenidas, no todas las películas desconocidas del catálogo.",
      "La evaluación temporal entrena con días anteriores y prueba con días posteriores; sus ventanas reutilizan el mismo historial y no son muestras independientes.",
      "Las métricas temporales con fechas sin procedencia verificable se marcan como exploratorias; el informe solo comparte recuentos agregados de procedencia.",
      "La diversidad Jaccard usa las listas actuales y no es una medida de serendipia.",
      "La calibración de normalización compara el denominador actual con hipótesis diagnósticas; no cambia las recomendaciones activas.",
      "La batería automática usa siete fases independientes; un resultado no disponible por cobertura insuficiente no equivale a un experimento ejecutado correctamente.",
      "La evaluación de familias es emparejada y local. El informe comparte métricas agregadas, no títulos, identificadores individuales, notas por película ni fechas personales.",
      "Una mejora observada en esta muestra personal es descriptiva; no demuestra significación estadística."
    ]
  };
}
