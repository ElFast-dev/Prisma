const REPORT_SCHEMA = "prisma-recommendation-diagnostics/v5";
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
        deltaRidgeMinusBaseline: modeAvailable ? rounded(mode.deltaRidgeMinusBaseline, 4) : null,
        foldsEvaluated: nonNegativeInteger(mode.foldsEvaluated),
        foldsRidgeWins: nonNegativeInteger(mode.foldsRidgeWins),
        foldsRidgeTies: nonNegativeInteger(mode.foldsRidgeTies),
        foldsRidgeLosses: nonNegativeInteger(mode.foldsRidgeLosses)
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
    foldStability: ridgeFoldStabilityEvaluation(evaluation && evaluation.foldStability),
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
        foldStability: ridgeFoldStabilityEvaluation(repeat && repeat.foldStability),
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
    outerFolds: nonNegativeInteger(evaluation && evaluation.outerFolds),
    foldsEvaluated: nonNegativeInteger(evaluation && evaluation.foldsEvaluated),
    innerFolds: nonNegativeInteger(evaluation && evaluation.innerFolds),
    alphaGrid: rawGrid.map(numeric).filter(function (value) { return value != null && value > 0; }),
    selectedAlphaCounts: alphaCounts,
    foldStability: ridgeFoldStabilityEvaluation(evaluation && evaluation.foldStability),
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

  return {
    schema: REPORT_SCHEMA,
    privacy: {
      generatedLocally: true,
      networkTransmission: false,
      featureLabelsIncluded: Boolean(source.includeFeatureLabels),
      includes: [
        "Recuentos agregados de valoraciones, catálogo y colecciones",
        "Distribución de puntuaciones por valor",
        "Cobertura y señales agregadas del perfil",
        "Pesos del algoritmo y resultados agregados de MAE, Ridge, validación repetida, evaluación temporal walk-forward, nDCG@5 por modo y diversidad"
      ],
      excludes: [
        "Títulos y títulos originales de películas",
        "IDs de TMDB y otros identificadores de películas",
        "Registros individuales de valoración y predicciones por película",
        "Fechas de visionado, valoración u otros eventos personales",
        "Emociones, notas libres y textos personales",
        "Credenciales, datos de almacenamiento y copias de seguridad"
      ],
      caution: "Las estadísticas agregadas de géneros o temas, si se incluyen sus nombres, pueden revelar parte de las preferencias personales. Revisa el informe antes de compartirlo."
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
        decade: rounded(weights.decade, 4)
      },
      featureAggregates: summarizeFeatures(features, Boolean(source.includeFeatureLabels))
    },
    evaluation: {
      ratingPrediction: ratingEvaluation(source.ratingEvaluation),
      ridgeExperiment: ridgeEvaluation(source.ridgeEvaluation),
      temporalRidgeExperiment: temporalRidgeEvaluation(source.temporalRidgeEvaluation),
      rankingQuality: quality.ranking,
      currentListDiversity: quality.diversity
    },
    interpretationLimits: [
      "MAE mide la predicción de notas conocidas y no garantiza satisfacción con películas futuras.",
      "nDCG@5 de Prisma evalúa el orden de películas valoradas retenidas, no todas las películas desconocidas del catálogo.",
      "La evaluación temporal entrena con días anteriores y prueba con días posteriores; sus ventanas reutilizan el mismo historial y no son muestras independientes.",
      "La diversidad Jaccard usa las listas actuales y no es una medida de serendipia.",
      "Una mejora observada en esta muestra personal es descriptiva; no demuestra significación estadística."
    ]
  };
}
