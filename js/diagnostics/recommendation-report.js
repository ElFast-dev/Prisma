const REPORT_SCHEMA = "prisma-recommendation-diagnostics/v14";
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

function ridgeRelativeScaleComparisonEvaluation(source, alphaGridSource) {
  const evaluation = source && typeof source === "object" ? source : null;
  const alphaGrid = (Array.isArray(alphaGridSource) ? alphaGridSource : [])
    .map(numeric).filter(function (value) { return value != null && value > 0; }).slice(0, 14);
  const allowedAnchors = alphaGrid;
  const numericSummary = function (input) {
    const item = input && typeof input === "object" ? input : {};
    return {
      available: Boolean(item.available),
      count: nonNegativeInteger(item.count),
      mean: item.available ? rounded(item.mean, 8) : null,
      median: item.available ? rounded(item.median, 8) : null,
      min: item.available ? rounded(item.min, 8) : null,
      max: item.available ? rounded(item.max, 8) : null
    };
  };
  const countSummary = function (input) {
    const counts = input && typeof input === "object" ? input : {};
    return Object.keys(counts).sort(function (left, right) { return Number(left) - Number(right); })
      .reduce(function (result, key) {
        const value = Number(key);
        if (Number.isFinite(value) && value > 0 && allowedAnchors.includes(value)) {
          result[String(value)] = nonNegativeInteger(counts[key]);
        }
        return result;
      }, {});
  };
  const boundary = function (input) {
    const item = input && typeof input === "object" ? input : {};
    return {
      available: Boolean(item.available),
      minimumAnchorAlpha: numeric(item.minimumAlpha),
      selectedCount: nonNegativeInteger(item.selectedCount),
      foldsEvaluated: nonNegativeInteger(item.foldsEvaluated),
      selectedFraction: rounded(item.selectedFraction, 4),
      majoritySelected: Boolean(item.majoritySelected),
      unresolved: Boolean(item.unresolved)
    };
  };
  const selector = function (input) {
    const item = input && typeof input === "object" ? input : {};
    return {
      available: Boolean(item.available),
      sampleCount: nonNegativeInteger(item.sampleCount),
      selectionFolds: nonNegativeInteger(item.selectionFolds),
      foldsEvaluated: nonNegativeInteger(item.foldsEvaluated),
      mae: item.available ? rounded(item.mae, 4) : null,
      baselineMaeSameFolds: item.available ? rounded(item.baselineMaeSameFolds, 4) : null,
      deltaBaselineMinusSelected: item.available ? rounded(item.deltaBaselineMinusSelected, 4) : null,
      selectedLambda: numericSummary(item.selectedLambda),
      selectedEffectiveAlpha: numericSummary(item.selectedEffectiveAlpha),
      selectedAnchorAlphaCounts: countSummary(item.selectedAnchorAlphaCounts),
      lowerBoundary: boundary(item.lowerBoundary)
    };
  };
  const rankingMetric = function (input, type) {
    const item = input && typeof input === "object" ? input : {};
    const paired = type === "paired";
    return {
      available: Boolean(item.available),
      baselineNdcgAt5: item.available ? rounded(item.baselineNdcgAt5, 4) : null,
      relativeMaeSelectedNdcgAt5: item.available && (paired || type === "mae")
        ? rounded(item.relativeMaeSelectedNdcgAt5, 4) : null,
      relativeRankingSelectedNdcgAt5: item.available && (paired || type === "ranking")
        ? rounded(item.relativeRankingSelectedNdcgAt5, 4) : null,
      deltaRelativeMaeSelectionMinusBaseline: item.available && (paired || type === "mae")
        ? rounded(item.deltaRelativeMaeSelectionMinusBaseline, 4) : null,
      deltaRelativeRankingSelectionMinusBaseline: item.available && (paired || type === "ranking")
        ? rounded(item.deltaRelativeRankingSelectionMinusBaseline, 4) : null,
      deltaRelativeRankingSelectionMinusRelativeMae: item.available && paired
        ? rounded(item.deltaRelativeRankingSelectionMinusRelativeMae, 4) : null,
      foldsEvaluated: nonNegativeInteger(item.foldsEvaluated),
      wins: nonNegativeInteger(item.wins),
      ties: nonNegativeInteger(item.ties),
      losses: nonNegativeInteger(item.losses)
    };
  };
  const rankingModes = function (input) {
    return (Array.isArray(input) ? input : []).slice(0, 3).map(function (mode) {
      const item = mode || {};
      return {
        mode: ["balanced", "affinity", "variety"].includes(item.mode) ? item.mode : "",
        relativeMae: rankingMetric(item.relativeMae, "mae"),
        relativeRanking: rankingMetric(item.relativeRanking, "ranking"),
        pairedRelativeSelectors: rankingMetric(item.pairedRelativeSelectors, "paired")
      };
    });
  };
  const repeatSummaries = (Array.isArray(evaluation && evaluation.repeatSummaries) ?
    evaluation.repeatSummaries : []).slice(0, 3).map(function (repeat) {
    const item = repeat || {};
    return {
      repeat: nonNegativeInteger(item.repeat),
      foldsPlanned: nonNegativeInteger(item.foldsPlanned),
      kernelScale: numericSummary(item.kernelScale),
      relativeMae: selector(item.relativeMae),
      relativeRanking: selector(item.relativeRanking),
      rankingModes: rankingModes(item.rankingModes)
    };
  });
  const scales = evaluation && evaluation.kernelScale || {};
  const diagonal = scales.centeredDiagonal || {};
  const lambdaGrid = scales.relativeLambdaGrid || {};
  return {
    executionStatus: evaluation ? (evaluation.available ? "completed" : "unavailable") : "not-run",
    available: Boolean(evaluation && evaluation.available),
    sampleCount: nonNegativeInteger(evaluation && evaluation.sampleCount),
    selectionFoldsEvaluated: nonNegativeInteger(evaluation && evaluation.selectionFoldsEvaluated),
    relativeMaeFoldsEvaluated: nonNegativeInteger(evaluation && evaluation.relativeMaeFoldsEvaluated),
    relativeRankingFoldsEvaluated: nonNegativeInteger(evaluation && evaluation.relativeRankingFoldsEvaluated),
    scaleUnavailableFolds: nonNegativeInteger(evaluation && evaluation.scaleUnavailableFolds),
    relativeNumericErrors: nonNegativeInteger(evaluation && evaluation.relativeNumericErrors),
    kernelScale: {
      outerTrainingScales: numericSummary(scales.outerTrainingScales),
      innerReferenceScales: numericSummary(scales.innerReferenceScales),
      centeredDiagonal: {
        foldsEvaluated: nonNegativeInteger(diagonal.foldsEvaluated),
        minimumObserved: numeric(diagonal.minimumObserved) == null ? null : rounded(diagonal.minimumObserved, 8),
        medianOfFoldMedians: numeric(diagonal.medianOfFoldMedians) == null ? null : rounded(diagonal.medianOfFoldMedians, 8),
        maximumObserved: numeric(diagonal.maximumObserved) == null ? null : rounded(diagonal.maximumObserved, 8)
      },
      relativeLambdaGrid: {
        foldsEvaluated: nonNegativeInteger(lambdaGrid.foldsEvaluated),
        minimumObserved: numeric(lambdaGrid.minimumObserved) == null ? null : rounded(lambdaGrid.minimumObserved, 8),
        maximumObserved: numeric(lambdaGrid.maximumObserved) == null ? null : rounded(lambdaGrid.maximumObserved, 8)
      }
    },
    absoluteAlphaToScaleRatio: {
      mae: numericSummary(evaluation && evaluation.absoluteAlphaToScaleRatio &&
        evaluation.absoluteAlphaToScaleRatio.mae),
      ranking: numericSummary(evaluation && evaluation.absoluteAlphaToScaleRatio &&
        evaluation.absoluteAlphaToScaleRatio.ranking)
    },
    relativeMae: selector(evaluation && evaluation.relativeMae),
    relativeRanking: selector(evaluation && evaluation.relativeRanking),
    rankingModes: rankingModes(evaluation && evaluation.rankingModes),
    repeatSummaries: repeatSummaries,
    unavailableReason: evaluation && evaluation.available ? null : String(evaluation && evaluation.unavailableReason ||
      "La comparación de regularización relativa no está disponible.").slice(0, 220)
  };
}

function ridgeAlphaSelectionEvaluation(source) {
  const evaluation = source && typeof source === "object" ? source : null;
  const available = Boolean(evaluation && evaluation.available);
  const alphaGrid = evaluation && Array.isArray(evaluation.alphaGrid) ? evaluation.alphaGrid
    .map(numeric).filter(function (value) { return value != null && value > 0; }).slice(0, 14) : [];
  const summarizeCounts = function (counts) {
    const input = counts && typeof counts === "object" ? counts : {};
    return Object.keys(input).sort(function (left, right) { return Number(left) - Number(right); }).reduce(function (all, alpha) {
      const numericAlpha = Number(alpha);
      if (Number.isFinite(numericAlpha) && numericAlpha > 0 && alphaGrid.includes(numericAlpha)) all[String(numericAlpha)] = nonNegativeInteger(input[alpha]);
      return all;
    }, {});
  };
  const summary = function (input, key) {
    const item = input && typeof input === "object" ? input : {};
    return {
      available: Boolean(item.available),
      mae: item.available ? rounded(item.mae, 4) : null,
      baselineMaeSameFolds: item.available ? rounded(item.baselineMaeSameFolds, 4) : null,
      deltaBaselineMinusSelected: item.available ? rounded(item[key], 4) : null
    };
  };
  const rankingModes = (Array.isArray(evaluation && evaluation.rankingModes) ? evaluation.rankingModes : []).slice(0, 3).map(function (mode) {
    const item = mode || {};
    const modeAvailable = Boolean(item.available);
    return {
      mode: ["balanced", "affinity", "variety"].includes(item.mode) ? item.mode : "",
      available: modeAvailable,
      baselineNdcgAt5: modeAvailable ? rounded(item.baselineNdcgAt5, 4) : null,
      maeSelectedNdcgAt5: modeAvailable ? rounded(item.maeSelectedNdcgAt5, 4) : null,
      rankingSelectedNdcgAt5: modeAvailable ? rounded(item.rankingSelectedNdcgAt5, 4) : null,
      deltaRankingSelectionMinusMaeSelection: modeAvailable ? rounded(item.deltaRankingSelectionMinusMaeSelection, 4) : null,
      deltaMaeSelectionMinusBaseline: modeAvailable ? rounded(item.deltaMaeSelectionMinusBaseline, 4) : null,
      deltaRankingSelectionMinusBaseline: modeAvailable ? rounded(item.deltaRankingSelectionMinusBaseline, 4) : null,
      foldsEvaluated: nonNegativeInteger(item.foldsEvaluated),
      rankingSelectorWins: nonNegativeInteger(item.rankingSelectorWins),
      ties: nonNegativeInteger(item.ties),
      rankingSelectorLosses: nonNegativeInteger(item.rankingSelectorLosses),
      maeVsBaselineWins: nonNegativeInteger(item.maeVsBaselineWins),
      maeVsBaselineTies: nonNegativeInteger(item.maeVsBaselineTies),
      maeVsBaselineLosses: nonNegativeInteger(item.maeVsBaselineLosses),
      rankingVsBaselineWins: nonNegativeInteger(item.rankingVsBaselineWins),
      rankingVsBaselineTies: nonNegativeInteger(item.rankingVsBaselineTies),
      rankingVsBaselineLosses: nonNegativeInteger(item.rankingVsBaselineLosses)
    };
  });
  const repeats = (Array.isArray(evaluation && evaluation.repeatSummaries) ? evaluation.repeatSummaries : []).slice(0, 3).map(function (repeat) {
    const item = repeat || {};
    const modes = (Array.isArray(item.rankingModes) ? item.rankingModes : []).slice(0, 3).map(function (mode) {
      return {
        mode: ["balanced", "affinity", "variety"].includes(mode.mode) ? mode.mode : "",
        available: Boolean(mode.available),
        maeSelectedNdcgAt5: mode.available ? rounded(mode.maeSelectedNdcgAt5, 4) : null,
        rankingSelectedNdcgAt5: mode.available ? rounded(mode.rankingSelectedNdcgAt5, 4) : null,
        deltaRankingSelectionMinusMaeSelection: mode.available ? rounded(mode.deltaRankingSelectionMinusMaeSelection, 4) : null,
        deltaMaeSelectionMinusBaseline: mode.available ? rounded(mode.deltaMaeSelectionMinusBaseline, 4) : null,
        deltaRankingSelectionMinusBaseline: mode.available ? rounded(mode.deltaRankingSelectionMinusBaseline, 4) : null,
        foldsEvaluated: nonNegativeInteger(mode.foldsEvaluated),
        rankingSelectorWins: nonNegativeInteger(mode.rankingSelectorWins),
        ties: nonNegativeInteger(mode.ties),
        rankingSelectorLosses: nonNegativeInteger(mode.rankingSelectorLosses),
        maeVsBaselineWins: nonNegativeInteger(mode.maeVsBaselineWins),
        maeVsBaselineTies: nonNegativeInteger(mode.maeVsBaselineTies),
        maeVsBaselineLosses: nonNegativeInteger(mode.maeVsBaselineLosses),
        rankingVsBaselineWins: nonNegativeInteger(mode.rankingVsBaselineWins),
        rankingVsBaselineTies: nonNegativeInteger(mode.rankingVsBaselineTies),
        rankingVsBaselineLosses: nonNegativeInteger(mode.rankingVsBaselineLosses)
      };
    });
    return {
      repeat: nonNegativeInteger(item.repeat),
      foldsEvaluated: nonNegativeInteger(item.foldsEvaluated),
      selectedAlphaCountsByMae: summarizeCounts(item.selectedAlphaCountsByMae),
      selectedAlphaCountsByRanking: summarizeCounts(item.selectedAlphaCountsByRanking),
      maeSelectedMae: rounded(item.maeSelectedMae, 4),
      rankingSelectedMae: rounded(item.rankingSelectedMae, 4),
      deltaRankingSelectionMinusMaeSelection: rounded(item.deltaRankingSelectionMinusMaeSelection, 4),
      rankingModes: modes
    };
  });
  const boundarySummary = function (source) {
    const item = source && typeof source === "object" ? source : {};
    return {
      available: Boolean(item.available),
      minimumAlpha: numeric(item.minimumAlpha),
      selectedCount: nonNegativeInteger(item.selectedCount),
      foldsEvaluated: nonNegativeInteger(item.foldsEvaluated),
      selectedFraction: rounded(item.selectedFraction, 4),
      majoritySelected: Boolean(item.majoritySelected),
      unresolved: Boolean(item.unresolved)
    };
  };
  const boundary = evaluation && evaluation.lowerBoundary || {};
  const foldSummaries = (Array.isArray(evaluation && evaluation.foldSummaries) ? evaluation.foldSummaries : [])
    .slice(0, 15).map(function (fold) {
      const item = fold || {};
      const modes = (Array.isArray(item.rankingModes) ? item.rankingModes : []).slice(0, 3).map(function (mode) {
        const value = mode || {};
        const modeAvailable = Boolean(value.available);
        return {
          mode: ["balanced", "affinity", "variety"].includes(value.mode) ? value.mode : "",
          available: modeAvailable,
          baselineNdcgAt5: modeAvailable ? rounded(value.baselineNdcgAt5, 4) : null,
          maeSelectedNdcgAt5: modeAvailable ? rounded(value.maeSelectedNdcgAt5, 4) : null,
          rankingSelectedNdcgAt5: modeAvailable ? rounded(value.rankingSelectedNdcgAt5, 4) : null,
          deltaRankingSelectionMinusMaeSelection: modeAvailable
            ? rounded(value.deltaRankingSelectionMinusMaeSelection, 4) : null,
          deltaMaeSelectionMinusBaseline: modeAvailable
            ? rounded(value.deltaMaeSelectionMinusBaseline, 4) : null,
          deltaRankingSelectionMinusBaseline: modeAvailable
            ? rounded(value.deltaRankingSelectionMinusBaseline, 4) : null,
          wins: nonNegativeInteger(value.wins),
          ties: nonNegativeInteger(value.ties),
          losses: nonNegativeInteger(value.losses),
          maeVsBaselineWins: nonNegativeInteger(value.maeVsBaselineWins),
          maeVsBaselineTies: nonNegativeInteger(value.maeVsBaselineTies),
          maeVsBaselineLosses: nonNegativeInteger(value.maeVsBaselineLosses),
          rankingVsBaselineWins: nonNegativeInteger(value.rankingVsBaselineWins),
          rankingVsBaselineTies: nonNegativeInteger(value.rankingVsBaselineTies),
          rankingVsBaselineLosses: nonNegativeInteger(value.rankingVsBaselineLosses)
        };
      });
      return {
        repeat: nonNegativeInteger(item.repeat),
        outerFold: nonNegativeInteger(item.outerFold),
        selectedAlphaByMae: numeric(item.selectedAlphaByMae),
        selectedAlphaByRanking: numeric(item.selectedAlphaByRanking),
        maeSelectedMae: rounded(item.maeSelectedMae, 4),
        baselineMae: rounded(item.baselineMae, 4),
        rankingSelectedMae: rounded(item.rankingSelectedMae, 4),
        deltaRankingSelectionMinusMaeSelection: rounded(item.deltaRankingSelectionMinusMaeSelection, 4),
        rankingModes: modes
      };
    });
  const paired = evaluation && evaluation.pairedMaeDifference || {};
  return {
    executionStatus: evaluation ? (available ? "completed" : "unavailable") : "not-run",
    available: available,
    sampleCount: nonNegativeInteger(evaluation && evaluation.sampleCount),
    selectionFoldsEvaluated: nonNegativeInteger(evaluation && evaluation.selectionFoldsEvaluated),
    pairedSelectionFoldsEvaluated: nonNegativeInteger(evaluation && evaluation.pairedSelectionFoldsEvaluated),
    outerFoldsPlanned: nonNegativeInteger(evaluation && evaluation.outerFoldsPlanned),
    innerFolds: nonNegativeInteger(evaluation && evaluation.innerFolds),
    alphaGrid: alphaGrid,
    selectionCriteria: {
      mae: "Menor MAE medio en validación interna del entrenamiento exterior.",
      ranking: "Mayor nDCG@5 medio en validación interna con relevancia ≥ 7 y mínimo de 50 películas, 10 relevantes y dos pliegues internos válidos."
    },
    selectedAlphaCountsByMae: summarizeCounts(evaluation && evaluation.selectedAlphaCountsByMae),
    selectedAlphaCountsByRanking: summarizeCounts(evaluation && evaluation.selectedAlphaCountsByRanking),
    lowerBoundary: {
      mae: boundarySummary(boundary.mae),
      ranking: boundarySummary(boundary.ranking),
      unresolved: Boolean(boundary.unresolved || (boundary.mae && boundary.mae.unresolved) ||
        (boundary.ranking && boundary.ranking.unresolved))
    },
    foldSummaries: foldSummaries,
    maeSelected: summary(evaluation && evaluation.maeSelected, "deltaBaselineMinusMaeSelected"),
    rankingSelected: summary(evaluation && evaluation.rankingSelected, "deltaBaselineMinusRankingSelected"),
    pairedMaeDifference: {
      available: Boolean(paired.available),
      deltaRankingSelectionMinusMaeSelection: paired.available ? rounded(paired.deltaRankingSelectionMinusMaeSelection, 4) : null,
      rankingSelectionMaeWins: nonNegativeInteger(paired.rankingSelectionMaeWins),
      ties: nonNegativeInteger(paired.ties),
      maeSelectionMaeWins: nonNegativeInteger(paired.maeSelectionMaeWins),
      foldsEvaluated: nonNegativeInteger(paired.foldsEvaluated)
    },
    rankingModes: rankingModes,
    repeatSummaries: repeats,
    relativeScaleComparison: ridgeRelativeScaleComparisonEvaluation(
      evaluation && evaluation.relativeScaleComparison, evaluation && evaluation.alphaGrid
    ),
    unavailableReason: available ? null : String(evaluation && evaluation.unavailableReason ||
      "La selección interna de alpha por ranking no alcanza los mínimos de muestra.").slice(0, 220)
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
    alphaSelectionComparison: ridgeAlphaSelectionEvaluation(evaluation && evaluation.alphaSelectionComparison),
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
  const candidateAvailability = Array.isArray(wrapper.candidateAvailability) ? wrapper.candidateAvailability : [];
  return {
    candidateAvailability: candidateAvailability.slice(0, 3).map(function (item) {
      const source = item || {};
      const mode = ["balanced", "affinity", "variety"].includes(source.mode) ? source.mode : "";
      return {
        mode: mode,
        remoteCandidatesReceived: nonNegativeInteger(source.remoteCandidatesReceived),
        localCatalogEntries: nonNegativeInteger(source.localCatalogEntries),
        localCandidatesEligible: nonNegativeInteger(source.localCandidatesEligible),
        eligibleCandidatePool: nonNegativeInteger(source.eligibleCandidatePool),
        rankedResultsAvailable: nonNegativeInteger(source.rankedResultsAvailable),
        requestedResultLimit: nonNegativeInteger(source.requestedResultLimit),
        returnedResultCount: nonNegativeInteger(source.returnedResultCount),
        profileAvailable: Boolean(source.profileAvailable),
        shortfallReason: ["empty-personal-profile", "eligible-pool-too-small", "balanced-genre-cap", "ranking-policy-shortfall"].includes(source.shortfallReason)
          ? source.shortfallReason : null
      };
    }),
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
  return ALLOWED_PHASE_STATUSES.has(status) || ["completed", "completed-with-unavailable", "partial-error", "partial-cancelled", "incomplete", "unknown"].includes(status)
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
      : (statusValues.includes("cancelled") ? "partial-cancelled"
        : (statusValues.includes("unavailable") ? "completed-with-unavailable" : "completed")));
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
    "candidatesAvailable", "remoteCandidatesReceived", "localCandidatesEligible", "eligibleCandidatePool",
    "rankedResultsAvailable", "requestedResultLimit"
  ];
  const result = {};
  nonNegativeKeys.forEach(function (key) { result[key] = nonNegativeInteger(input[key]); });
  result.metadataCoverage = rounded(input.metadataCoverage, 4);
  result.featureLinkedCoverage = rounded(input.featureLinkedCoverage, 4);
  result.shortfallReason = ["empty-personal-profile", "eligible-pool-too-small", "balanced-genre-cap", "ranking-policy-shortfall"].includes(input.shortfallReason)
    ? input.shortfallReason : null;
  result.candidateCountsMeaning = {
    candidatesAvailable: "Compatibilidad heredada: solo candidatas remotas temporales de TMDB; no equivale al catálogo local.",
    localCandidatesEligible: "Películas del catálogo local que siguen siendo elegibles tras deduplicación y exclusión de la colección.",
    eligibleCandidatePool: "Candidatas locales y remotas únicas que superan los filtros.",
    rankedResultsAvailable: "Tamaño del pool elegible cuando existe perfil personal; cero si el perfil está vacío."
  };
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
  if (!input || typeof input !== "object") return {
    available: false, sampleCount: 0, repeats: 3, foldsPerRepeat: 5, foldsEvaluated: 0,
    sharedPartition: true, trainingLeakageChecked: false, families: [],
    unavailableReason: "La fase no produjo resultados."
  };
  const sourceFamilies = Array.isArray(input.families) ? input.families : [];
  const expected = ["genres-only", "genres-tags", "genres-tags-synopsis", "full-current"];
  const summarizeModes = function (row, threshold, reference) {
    const modesSource = row && row.rankingByThreshold && row.rankingByThreshold[String(threshold)]
      ? row.rankingByThreshold[String(threshold)]
      : (threshold === 7 && row ? row.rankingModes : null);
    return ["balanced", "affinity", "variety"].map(function (mode) {
      const current = modesSource && modesSource[mode] ? modesSource[mode] :
        ((Array.isArray(row && row.rankingModes) ? row.rankingModes : []).find(function (item) { return item && item.mode === mode; }) || {});
      return {
        mode: mode,
        available: Boolean(current.available),
        ndcgAt5: current.available ? rounded(current.ndcgAt5, 5) : null,
        deltaNdcgVsGenres: current.available ? rounded(current.deltaNdcgVsGenres, 5) : null,
        foldsEvaluated: nonNegativeInteger(current.foldsEvaluated),
        pairedFoldsEvaluated: nonNegativeInteger(current.pairedFoldsEvaluated),
        wins: nonNegativeInteger(current.wins),
        ties: nonNegativeInteger(current.ties),
        losses: nonNegativeInteger(current.losses),
        foldNdcgAt5: Array.isArray(current.foldNdcgAt5) ? current.foldNdcgAt5.slice(0, 15).map(function (v) { return v == null ? null : rounded(v, 5); }) : []
      };
    });
  };
  const families = expected.map(function (id) {
    const row = sourceFamilies.find(function (item) { return item && item.id === id; }) || {};
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
      foldMae: Array.isArray(row.foldMae) ? row.foldMae.slice(0, 15).map(function (value) { return rounded(value, 5); }) : [],
      rankingModes: summarizeModes(row, 7),
      rankingByThreshold: {
        "7": summarizeModes(row, 7),
        "9": summarizeModes(row, 9)
      }
    };
  });
  const repeatSummaries = (Array.isArray(input.repeatSummaries) ? input.repeatSummaries : []).slice(0, 3).map(function (repeat) {
    const folds = (Array.isArray(repeat && repeat.folds) ? repeat.folds : []).slice(0, 5).map(function (fold) {
      const foldFamilies = {};
      const sourceFoldFamilies = fold && fold.families && typeof fold.families === "object" ? fold.families : {};
      expected.forEach(function (id) {
        const row = sourceFoldFamilies[id] || {};
        foldFamilies[id] = {
          mae: rounded(row.mae, 5),
          ndcgAt5: summarizeRawFoldModes(row.ndcgAt5),
          ndcgAt5Threshold9: summarizeRawFoldModes(row.ndcgAt5Threshold9)
        };
      });
      const lambdas = {};
      const sourceLambdas = fold && fold.lambdas && typeof fold.lambdas === "object" ? fold.lambdas : {};
      const signalFamilies = {};
      const sourceSignalFamilies = fold && fold.signalFamilies && typeof fold.signalFamilies === "object" ? fold.signalFamilies : {};
      ["genre", "theme", "synopsis", "actor", "director", "writer", "composer"].forEach(function (id) {
        const row = sourceSignalFamilies[id] || {};
        signalFamilies[id] = {
          mae: rounded(row.mae, 5),
          ndcgAt5: summarizeRawFoldModes(row.ndcgAt5),
          ndcgAt5Threshold9: summarizeRawFoldModes(row.ndcgAt5Threshold9)
        };
      });
      Object.keys(sourceLambdas).filter(function (key) { return ["0", "0.5", "1", "2", "4", "8"].includes(key); }).forEach(function (key) {
        const row = sourceLambdas[key] || {};
        lambdas[key] = {
          mae: rounded(row.mae, 5),
          ndcgAt5: summarizeRawFoldModes(row.ndcgAt5),
          ndcgAt5Threshold9: summarizeRawFoldModes(row.ndcgAt5Threshold9)
        };
      });
      const selected = fold && fold.selectedLambda || {};
      return {
        fold: nonNegativeInteger(fold && fold.fold),
        trainingCount: nonNegativeInteger(fold && fold.trainCount),
        testCount: nonNegativeInteger(fold && fold.testCount),
        families: foldFamilies,
        lambdas: lambdas,
        signalFamilies: signalFamilies,
        selectedLambda: {
          available: Number.isFinite(Number(selected.lambda)),
          lambda: Number.isFinite(Number(selected.lambda)) ? rounded(selected.lambda, 4) : null,
          mae: rounded(selected.mae, 5),
          ndcgAt5: summarizeRawFoldModes(selected.ndcgAt5),
          ndcgAt5Threshold9: summarizeRawFoldModes(selected.ndcgAt5Threshold9),
          unavailableReason: selected.available === false ? String(selected.reason || "La selección interna no está disponible.").slice(0, 180) : null
        }
      };
    });
    return {
      repeat: nonNegativeInteger(repeat && repeat.repeat),
      foldsEvaluated: folds.length,
      maeByFamily: expected.reduce(function (all, id) {
        const values = folds.map(function (fold) { return fold.families[id].mae; }).filter(Number.isFinite);
        all[id] = rounded(values.length ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length : null, 5);
        return all;
      }, {}),
      folds: folds
    };
  });
  const support = input.supportRegularization && typeof input.supportRegularization === "object" ? input.supportRegularization : null;
  const supportRegularization = support ? {
    available: Boolean(support.available),
    featureSupportWeightFormula: support.featureSupportWeightFormula === "weight * support / (support + lambda)"
      ? support.featureSupportWeightFormula : null,
    lambdas: Array.isArray(support.lambdas) ? support.lambdas.map(numeric).filter(function (v) { return v != null && v >= 0; }).slice(0, 10) : [],
    results: (Array.isArray(support.results) ? support.results : []).slice(0, 10).map(function (row) {
      return {
        lambda: rounded(row.lambda, 4),
        available: Boolean(row.available),
        foldsEvaluated: nonNegativeInteger(row.foldsEvaluated),
        mae: rounded(row.mae, 5),
        deltaMaeVsNoShrinkage: rounded(row.deltaMaeVsNoShrinkage, 5),
        foldMae: Array.isArray(row.foldMae) ? row.foldMae.slice(0, 15).map(function (v) { return rounded(v, 5); }) : [],
        maeWins: nonNegativeInteger(row.maeWins),
        ties: nonNegativeInteger(row.ties),
        maeLosses: nonNegativeInteger(row.maeLosses),
        rankingModes: summarizeModes(row, 7),
        rankingByThreshold: { "7": summarizeModes(row, 7), "9": summarizeModes(row, 9) },
        repeatSummaries: (Array.isArray(row.repeatSummaries) ? row.repeatSummaries : []).slice(0, 3).map(function (repeat) {
          return { repeat: nonNegativeInteger(repeat.repeat), mae: rounded(repeat.mae, 5), foldsEvaluated: nonNegativeInteger(repeat.foldCount) };
        })
      };
    }),
    signalFamilyLambda: rounded(support.signalFamilyLambda, 4),
    signalFamilyExperiments: (Array.isArray(support.signalFamilyExperiments) ? support.signalFamilyExperiments : []).slice(0, 7).map(function (row) {
      const id = ["genre", "theme", "synopsis", "actor", "director", "writer", "composer"].includes(row && row.id) ? row.id : "";
      return {
        id: id,
        label: ({
          genre: "Géneros", theme: "Temas", synopsis: "Sinopsis", actor: "Reparto",
          director: "Dirección", writer: "Guion", composer: "Música"
        })[id] || "",
        lambda: rounded(row.lambda, 4),
        available: Boolean(row.available),
        foldsEvaluated: nonNegativeInteger(row.foldsEvaluated),
        mae: rounded(row.mae, 5),
        baselineMae: rounded(row.baselineMae, 5),
        deltaMaeVsNoShrinkage: rounded(row.deltaMaeVsNoShrinkage, 5),
        foldMae: Array.isArray(row.foldMae) ? row.foldMae.slice(0, 15).map(function (v) { return rounded(v, 5); }) : [],
        maeWins: nonNegativeInteger(row.maeWins),
        ties: nonNegativeInteger(row.ties),
        maeLosses: nonNegativeInteger(row.maeLosses),
        rankingModes: summarizeModes(row, 7),
        rankingByThreshold: {
          "7": summarizeModes(row, 7),
          "9": summarizeModes(row, 9)
        },
        repeatSummaries: (Array.isArray(row.repeatSummaries) ? row.repeatSummaries : []).slice(0, 3).map(function (repeat) {
          return {
            repeat: nonNegativeInteger(repeat.repeat),
            mae: rounded(repeat.mae, 5),
            foldCount: nonNegativeInteger(repeat.foldCount)
          };
        })
      };
    }),
    nestedSelection: support.nestedSelection ? {
      available: Boolean(support.nestedSelection.available),
      selectionCriterion: String(support.nestedSelection.selectionCriterion || "").slice(0, 180),
      outerFoldsEvaluated: nonNegativeInteger(support.nestedSelection.outerFoldsEvaluated),
      selectedLambdaCounts: Object.keys(support.nestedSelection.selectedLambdaCounts || {}).filter(function (key) {
        return ["0", "0.5", "1", "2", "4", "8"].includes(key);
      }).reduce(function (all, key) {
        all[key] = nonNegativeInteger(support.nestedSelection.selectedLambdaCounts[key]);
        return all;
      }, {}),
      mae: rounded(support.nestedSelection.mae, 5),
      baselineMaeSameFolds: rounded(support.nestedSelection.baselineMaeSameFolds, 5),
      deltaMaeVsNoShrinkage: rounded(support.nestedSelection.deltaMaeVsNoShrinkage, 5),
      maeWins: nonNegativeInteger(support.nestedSelection.maeWins),
      ties: nonNegativeInteger(support.nestedSelection.ties),
      maeLosses: nonNegativeInteger(support.nestedSelection.maeLosses),
      foldMae: Array.isArray(support.nestedSelection.foldMae) ? support.nestedSelection.foldMae.slice(0, 15).map(function (v) { return rounded(v, 5); }) : [],
      rankingModes: summarizeModes(support.nestedSelection, 7),
      rankingByThreshold: { "7": summarizeModes(support.nestedSelection, 7), "9": summarizeModes(support.nestedSelection, 9) }
    } : null,
    featureSupportBySignalType: summarizeSupportSignalTypes(support.featureSupportBySignalType),
    interpretationLimits: Array.isArray(support.interpretationLimits) ? support.interpretationLimits.map(function (v) { return String(v).slice(0, 220); }).slice(0, 8) : []
  } : null;
  return {
    executionStatus: input.executionStatus === "completed" ? "completed" : "unavailable",
    available: Boolean(input.available),
    sampleCount: nonNegativeInteger(input.sampleCount),
    repeats: nonNegativeInteger(input.repeats),
    foldsPerRepeat: nonNegativeInteger(input.foldsPerRepeat),
    foldsPlanned: nonNegativeInteger(input.foldsPerRepeat),
    foldsEvaluated: Math.min(15, nonNegativeInteger(input.foldsEvaluated)),
    sharedPartition: input.sharedPartition === true || input.sharedPartitions === true,
    trainingLeakageChecked: input.trainingLeakageChecked === true,
    relevanceThresholds: Array.isArray(input.relevanceThresholds) ? input.relevanceThresholds.map(numeric).filter(function (v) { return v != null; }).slice(0, 4) : [7],
    relevantCounts: {
      "7": nonNegativeInteger(input.relevantCounts && input.relevantCounts["7"]),
      "9": nonNegativeInteger(input.relevantCounts && input.relevantCounts["9"])
    },
    durationMs: rounded(input.durationMs, 1),
    families: families,
    repeatSummaries: repeatSummaries,
    supportRegularization: supportRegularization,
    unavailableReason: input.available ? null : String(input.unavailableReason || "La muestra no cumple los requisitos.").slice(0, 220),
    interpretationLimits: [
      "Las cuatro familias comparten las mismas identidades y particiones exteriores dentro de cada repetición.",
      "Las notas del pliegue exterior se usan solo para métricas; la selección de lambda emplea únicamente particiones internas del entrenamiento.",
      "Tres repeticiones y quince pliegues reutilizan el mismo historial personal: no son quince muestras independientes.",
      "El umbral 9 puede tener baja potencia con pocos ratings muy altos; las dos notas 10 no bastan para estimar predicción de obras excepcionales.",
      "Una mejora descriptiva en este historial no demuestra significación estadística ni causalidad."
    ]
  };
}
function summarizeRawFoldModes(source) {
  const input = source && typeof source === "object" ? source : {};
  return ["balanced", "affinity", "variety"].reduce(function (all, mode) {
    const value = input[mode];
    all[mode] = value != null && Number.isFinite(Number(value)) ? rounded(value, 5) : null;
    return all;
  }, {});
}
function summarizeSupportSignalTypes(source) {
  const input = source && typeof source === "object" ? source : {};
  const allowed = ["genre", "theme", "synopsis", "actor", "director", "writer", "composer", "company", "country", "language", "spokenLanguage", "collection", "runtime", "decade", "other"];
  return allowed.reduce(function (all, type) {
    const row = input[type] || {};
    all[type] = {
      featureObservations: nonNegativeInteger(row.featureObservations),
      supportOneFeatures: nonNegativeInteger(row.supportOneFeatures),
      meanSupport: rounded(row.meanSupport, 4),
      meanAbsoluteWeight: rounded(row.meanAbsoluteWeight, 5)
    };
    return all;
  }, {});
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
      candidateAvailability: quality.candidateAvailability,
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
