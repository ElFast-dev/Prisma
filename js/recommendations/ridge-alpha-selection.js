export const RIDGE_ALPHA_GRID = Object.freeze([
  0.00001, 0.00003, 0.0001, 0.0003,
  0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10, 100
]);

export const ALPHA_TIE_TOLERANCE = 1e-10;
export const MIN_RANKING_INNER_FOLDS = 2;

function validCandidate(candidate) {
  return Boolean(candidate) &&
    Number.isFinite(candidate.alpha) &&
    candidate.alpha > 0 &&
    Number.isFinite(candidate.score);
}

export function selectAlphaByMae(candidates, tolerance) {
  const epsilon = Number.isFinite(tolerance) && tolerance >= 0
    ? tolerance : ALPHA_TIE_TOLERANCE;
  let best = null;
  (candidates || []).forEach(function (candidate) {
    if (!validCandidate(candidate)) return;
    if (!best || candidate.score < best.score - epsilon ||
      (Math.abs(candidate.score - best.score) <= epsilon && candidate.alpha > best.alpha)) {
      best = candidate;
    }
  });
  return best ? best.alpha : null;
}

export function selectAlphaByRanking(candidates, minimumValidFolds, tolerance) {
  const minFolds = Number.isInteger(minimumValidFolds) && minimumValidFolds > 0
    ? minimumValidFolds : MIN_RANKING_INNER_FOLDS;
  const epsilon = Number.isFinite(tolerance) && tolerance >= 0
    ? tolerance : ALPHA_TIE_TOLERANCE;
  let best = null;
  (candidates || []).forEach(function (candidate) {
    if (!validCandidate(candidate) ||
      !Number.isInteger(candidate.foldsEvaluated) ||
      candidate.foldsEvaluated < minFolds) return;
    if (!best || candidate.score > best.score + epsilon ||
      (Math.abs(candidate.score - best.score) <= epsilon && candidate.alpha > best.alpha)) {
      best = candidate;
    }
  });
  return best ? best.alpha : null;
}

export function createAlphaSelectionCounts(grid) {
  const alphas = Array.isArray(grid) ? grid : RIDGE_ALPHA_GRID;
  const counts = Object.create(null);
  alphas.forEach(function (alpha) {
    if (Number.isFinite(alpha) && alpha > 0) counts[String(alpha)] = 0;
  });
  return counts;
}

export function summarizeAlphaBoundary(counts, foldsEvaluated, grid) {
  const alphas = Array.isArray(grid) && grid.length ? grid : RIDGE_ALPHA_GRID;
  const minAlpha = alphas[0];
  const completed = Number.isInteger(foldsEvaluated) && foldsEvaluated > 0
    ? foldsEvaluated : 0;
  const selectedCount = minAlpha == null ? 0 : Math.max(0, Number(counts && counts[String(minAlpha)]) || 0);
  const available = completed > 0 && selectedCount > 0;
  const selectedFraction = completed > 0 ? selectedCount / completed : null;
  const majoritySelected = Boolean(available && selectedCount > completed / 2);
  return {
    available: available,
    minimumAlpha: minAlpha == null ? null : minAlpha,
    selectedCount: selectedCount,
    foldsEvaluated: completed,
    selectedFraction: selectedFraction,
    majoritySelected: majoritySelected,
    unresolved: majoritySelected
  };
}
