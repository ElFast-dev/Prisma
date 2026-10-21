const RANKING_MODES = Object.freeze(["balanced", "affinity", "variety"]);
const DELTA_EPSILON = 1e-10;

function summarizeDeltas(values) {
  const deltas = (Array.isArray(values) ? values : []).filter(function (value) {
    return typeof value === "number" && Number.isFinite(value);
  });
  let ridgeFavorableRepeats = 0;
  let ties = 0;
  let baselineFavorableRepeats = 0;

  deltas.forEach(function (delta) {
    if (delta > DELTA_EPSILON) ridgeFavorableRepeats += 1;
    else if (delta < -DELTA_EPSILON) baselineFavorableRepeats += 1;
    else ties += 1;
  });

  return {
    available: deltas.length > 0,
    repeatsEvaluated: deltas.length,
    ridgeFavorableRepeats: ridgeFavorableRepeats,
    ties: ties,
    baselineFavorableRepeats: baselineFavorableRepeats,
    minDelta: deltas.length ? Math.min.apply(null, deltas) : null,
    maxDelta: deltas.length ? Math.max.apply(null, deltas) : null
  };
}

export function summarizeRepeatedRidgeStability(repeated) {
  const repeatSummaries = repeated && repeated.available && Array.isArray(repeated.repeatSummaries)
    ? repeated.repeatSummaries.filter(function (repeat) {
      return repeat && typeof repeat === "object";
    })
    : [];
  if (!repeatSummaries.length) {
    return {
      available: false,
      repeatCount: 0,
      mae: summarizeDeltas([]),
      rankingModes: RANKING_MODES.map(function (mode) {
        return { mode: mode, ...summarizeDeltas([]) };
      })
    };
  }

  const mae = summarizeDeltas(repeatSummaries.map(function (repeat) {
    return repeat.deltaBaseMinusRidge;
  }));
  const rankingModes = RANKING_MODES.map(function (mode) {
    const deltas = repeatSummaries.map(function (repeat) {
      const quality = repeat.rankingQuality;
      const modes = quality && quality.available && Array.isArray(quality.modes) ? quality.modes : [];
      const result = modes.find(function (item) {
        return item && item.mode === mode && item.available;
      });
      return result && result.deltaRidgeMinusBaseline;
    });
    return { mode: mode, ...summarizeDeltas(deltas) };
  });

  return {
    available: mae.available || rankingModes.some(function (mode) { return mode.available; }),
    repeatCount: repeatSummaries.length,
    mae: mae,
    rankingModes: rankingModes
  };
}
