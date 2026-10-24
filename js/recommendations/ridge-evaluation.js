import { dateOnlyInTimeZone, PANAMA_TIME_ZONE } from "../core/date-utils.js";
import { RIDGE_ALPHA_GRID, MIN_RANKING_INNER_FOLDS, selectAlphaByMae, selectAlphaByRanking, summarizeAlphaBoundary, buildRelativeLambdaGrid, effectiveRidgeAlpha, summarizeNumericScale } from "./ridge-alpha-selection.js?v=rec-20261023-relative-1";
import { buildKernel, buildKernelAsync, clampRating, predictRidge, trainRidge, trainRidgeAsync, vectorize, summarizeCenteredKernelScale } from "./ridge-kernel.js?v=rec-20261023-relative-1";

const OUTER_FOLDS = 5;
const INNER_FOLDS = 3;
const REPEATED_VALIDATION_RUNS = 3;
const MIN_RECORDS = 30;
const MIN_RANKING_RECORDS = 50;
const MIN_RELEVANT_RECORDS = 10;
const RELEVANT_RATING_THRESHOLD = 7;
const RANKING_CUTOFF = 5;
const RANKING_MODES = Object.freeze(["balanced", "affinity", "variety"]);
const TEMPORAL_OUTER_WINDOWS = 5;
const TEMPORAL_MIN_RECORDS = 100;
const TEMPORAL_MIN_DATE_GROUPS = 12;
const TEMPORAL_WARMUP_RATIO = 0.5;
const ALPHAS = RIDGE_ALPHA_GRID;

function nonNegativeInteger(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
}

function stableHash(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function numericYear(record) {
  const raw = record && (record.year || record.releaseYear || record.release_year);
  if (raw != null && /^\d{4}$/.test(String(raw))) return String(raw);
  const releaseDate = String(record && (record.releaseDate || record.release_date) || "");
  const match = releaseDate.match(/^(\d{4})/);
  return match ? match[1] : "";
}


function foldIndices(indices, rows, foldCount, salt) {
  const ordered = indices.slice().sort(function (left, right) {
    const leftHash = stableHash(rows[left].identity + "|" + salt);
    const rightHash = stableHash(rows[right].identity + "|" + salt);
    return leftHash - rightHash || rows[left].identity.localeCompare(rows[right].identity);
  });
  const folds = Array.from({ length: foldCount }, function () { return []; });
  ordered.forEach(function (index, position) {
    folds[position % foldCount].push(index);
  });
  return folds;
}

function meanAbsoluteError(errors) {
  if (!errors.length) throw new Error("No hay errores evaluables");
  return errors.reduce(function (sum, value) { return sum + value; }, 0) / errors.length;
}

function identityFor(entry, movie, dependencies) {
  const getId = dependencies.movieTmdbId;
  const id = (typeof getId === "function" ? getId(entry) : "") ||
    (typeof getId === "function" ? getId(movie) : "") ||
    (entry && (entry.tmdbId || entry.tmId)) || (movie && (movie.tmdbId || movie.tmId));
  if (id != null && String(id).trim() && String(id) !== "0") return "tmdb:" + String(id).trim();
  const rawTitle = (entry && entry.title) || (movie && movie.title) || "";
  const normalizeTitle = dependencies.titleKey;
  const title = typeof normalizeTitle === "function"
    ? normalizeTitle(rawTitle)
    : String(rawTitle).trim().toLocaleLowerCase();
  if (!title) return "";
  return "title:" + title + ":" + (numericYear(entry) || numericYear(movie));
}


function dayForDateValue(raw) {
  return dateOnlyInTimeZone(raw, PANAMA_TIME_ZONE);
}

function watchedDayFor(record) {
  if (record && record.watchDateConfidence === "pre-streak-unverified" &&
    record.watchedAtSource !== "user-confirmed") return null;
  const raw = record && (record.watchedAt != null ? record.watchedAt : record.watched_at);
  return dayForDateValue(raw);
}

function collectionAddedDayFor(record) {
  if (!record || record.addedAtSource !== "imported-collection" || record.watchDateConfidence) return null;
  const raw = record.addedAt != null ? record.addedAt : record.added_at;
  return dayForDateValue(raw);
}

function groupIndicesByWatchedDay(rows, indices) {
  const ordered = indices.slice().sort(function (left, right) {
    return rows[left].watchedDay.localeCompare(rows[right].watchedDay) ||
      rows[left].identity.localeCompare(rows[right].identity);
  });
  const groups = [];
  ordered.forEach(function (index) {
    const day = rows[index].watchedDay;
    let group = groups[groups.length - 1];
    if (!group || group.day !== day) {
      group = { day: day, indices: [] };
      groups.push(group);
    }
    group.indices.push(index);
  });
  return groups;
}

function forwardValidationWindows(rows, indices, windowCount, warmupRatio) {
  const groups = groupIndicesByWatchedDay(rows, indices);
  const warmupGroupCount = Math.floor(groups.length * warmupRatio);
  const futureGroups = groups.slice(warmupGroupCount);
  if (warmupGroupCount < 1 || futureGroups.length < windowCount) return null;
  const windows = [];
  for (let windowIndex = 0; windowIndex < windowCount; windowIndex += 1) {
    const start = Math.floor(futureGroups.length * windowIndex / windowCount);
    const end = Math.floor(futureGroups.length * (windowIndex + 1) / windowCount);
    const testGroups = futureGroups.slice(start, end);
    if (!testGroups.length) return null;
    const trainingGroups = groups.slice(0, warmupGroupCount + start);
    windows.push({
      trainingIndices: trainingGroups.reduce(function (all, group) { return all.concat(group.indices); }, []),
      testIndices: testGroups.reduce(function (all, group) { return all.concat(group.indices); }, [])
    });
  }
  return {
    dayGroupCount: groups.length,
    warmupIndices: groups.slice(0, warmupGroupCount).reduce(function (all, group) {
      return all.concat(group.indices);
    }, []),
    windows: windows
  };
}

function relevanceGain(rating) {
  return rating >= RELEVANT_RATING_THRESHOLD ? rating - 6 : 0;
}
function dcgAt5(rows) {
  return rows.slice(0, RANKING_CUTOFF).reduce(function (sum, row, index) {
    return sum + row.gain / Math.log2(index + 2);
  }, 0);
}
function unavailableRankingQuality(count, relevantCount, reason, foldCount) {
  let unavailableReason = reason || "";
  if (!unavailableReason && count < MIN_RANKING_RECORDS) unavailableReason = "Se necesitan al menos " + MIN_RANKING_RECORDS + " películas únicas con características para comparar nDCG@5.";
  if (!unavailableReason && relevantCount < MIN_RELEVANT_RECORDS) unavailableReason = "Se necesitan al menos " + MIN_RELEVANT_RECORDS + " valoraciones de 7 o más para comparar nDCG@5.";
  if (!unavailableReason) unavailableReason = "No se pudo calcular una comparación de ranking estable.";
  return {
    available: false, count: count, relevantCount: relevantCount, folds: foldCount || OUTER_FOLDS,
    foldsEvaluated: 0, cutoff: RANKING_CUTOFF, relevantThreshold: RELEVANT_RATING_THRESHOLD,
    reason: unavailableReason,
    modes: RANKING_MODES.map(function (mode) {
      return { mode: mode, available: false, baselineNdcgAt5: null, ridgeNdcgAt5: null,
        hybridNdcgAt5: null, deltaRidgeMinusBaseline: null, deltaHybridMinusBaseline: null,
        foldsEvaluated: 0, foldsRidgeWins: 0, foldsRidgeTies: 0, foldsRidgeLosses: 0,
        foldsHybridWins: 0, foldsHybridTies: 0, foldsHybridLosses: 0 };
    })
  };
}
function summarizeMaeFoldStability(deltas) {
  let ridgeMaeWins = 0;
  let ties = 0;
  let baselineMaeWins = 0;
  (deltas || []).forEach(function (delta) {
    if (delta > 1e-10) ridgeMaeWins += 1;
    else if (delta < -1e-10) baselineMaeWins += 1;
    else ties += 1;
  });
  return {
    available: (deltas || []).length > 0,
    foldsEvaluated: (deltas || []).length,
    ridgeMaeWins: ridgeMaeWins,
    ties: ties,
    baselineMaeWins: baselineMaeWins
  };
}

function summarizeHybridMaeFoldStability(deltas) {
  let hybridMaeWins = 0;
  let ties = 0;
  let baselineMaeWins = 0;
  (deltas || []).forEach(function (delta) {
    if (delta > 1e-10) hybridMaeWins += 1;
    else if (delta < -1e-10) baselineMaeWins += 1;
    else ties += 1;
  });
  return {
    available: (deltas || []).length > 0,
    foldsEvaluated: (deltas || []).length,
    hybridMaeWins: hybridMaeWins,
    ties: ties,
    baselineMaeWins: baselineMaeWins
  };
}
function completeRankingQuality(count, relevantCount, totals, foldCount) {
  if (count < MIN_RANKING_RECORDS || relevantCount < MIN_RELEVANT_RECORDS) {
    return unavailableRankingQuality(count, relevantCount, null, foldCount);
  }
  const modes = RANKING_MODES.map(function (mode) {
    const total = totals[mode];
    const available = Boolean(total && total.idealDcg > 0 && total.foldsEvaluated > 0);
    const baselineNdcgAt5 = available ? total.baselineDcg / total.idealDcg : null;
    const ridgeNdcgAt5 = available ? total.ridgeDcg / total.idealDcg : null;
    const result = {
      mode: mode,
      available: available,
      baselineNdcgAt5: baselineNdcgAt5,
      ridgeNdcgAt5: ridgeNdcgAt5,
      deltaRidgeMinusBaseline: available ? ridgeNdcgAt5 - baselineNdcgAt5 : null,
      foldsEvaluated: total ? total.foldsEvaluated : 0,
      foldsRidgeWins: total ? total.foldsRidgeWins : 0,
      foldsRidgeTies: total ? total.foldsRidgeTies : 0,
      foldsRidgeLosses: total ? total.foldsRidgeLosses : 0
    };
    // The fixed blend is measured in nested repeated CV, not in temporal evaluation.
    if (total && Object.prototype.hasOwnProperty.call(total, "hybridDcg")) {
      const hybridAvailable = Boolean(available && Number.isFinite(total.hybridDcg));
      result.hybridNdcgAt5 = hybridAvailable ? total.hybridDcg / total.idealDcg : null;
      result.deltaHybridMinusBaseline = hybridAvailable
        ? result.hybridNdcgAt5 - baselineNdcgAt5 : null;
      result.foldsHybridWins = total.foldsHybridWins || 0;
      result.foldsHybridTies = total.foldsHybridTies || 0;
      result.foldsHybridLosses = total.foldsHybridLosses || 0;
    }
    return result;
  });
  const usable = modes.filter(function (mode) { return mode.available; });
  if (!usable.length) return unavailableRankingQuality(count, relevantCount,
    "No hubo suficientes valoraciones relevantes distribuidas en los pliegues externos.", foldCount);
  return {
    available: true,
    count: count,
    relevantCount: relevantCount,
    folds: foldCount || OUTER_FOLDS,
    foldsEvaluated: Math.min.apply(null, usable.map(function (mode) { return mode.foldsEvaluated; })),
    cutoff: RANKING_CUTOFF,
    relevantThreshold: RELEVANT_RATING_THRESHOLD,
    reason: null,
    modes: modes
  };
}
function rankingCandidate(row, prediction, fallbackScore, token) {
  const movie = row.movie || {};
  const entry = row.entry || {};
  return {
    title: movie.title || entry.title || "",
    genres: movie.genres && movie.genres.length ? movie.genres.slice() : (entry.genres || []).slice(),
    tags: movie.tags && movie.tags.length ? movie.tags.slice() : (entry.tags || []).slice(),
    prediction: {
      score: Number.isFinite(prediction && prediction.score) ? prediction.score : fallbackScore,
      matches: Array.isArray(prediction && prediction.matches) ? prediction.matches : [],
      freshFeatures: Number.isFinite(prediction && prediction.freshFeatures) ? prediction.freshFeatures : 0
    },
    evaluationToken: token
  };
}

function unavailableRepeatedValidation(count, relevantCount, reason) {
  const totalFolds = REPEATED_VALIDATION_RUNS * OUTER_FOLDS;
  return {
    available: false,
    sampleCount: Number.isInteger(count) && count >= 0 ? count : 0,
    repeats: REPEATED_VALIDATION_RUNS,
    foldsPerRepeat: OUTER_FOLDS,
    foldsEvaluated: 0,
    innerFolds: INNER_FOLDS,
    mae: null,
    baselineMae: null,
    deltaBaseMinusRidge: null,
    hybridMae: null,
    deltaBaseMinusHybrid: null,
    foldStability: { available: false, foldsEvaluated: 0, ridgeMaeWins: 0, ties: 0, baselineMaeWins: 0 },
    hybridFoldStability: { available: false, foldsEvaluated: 0, hybridMaeWins: 0, ties: 0, baselineMaeWins: 0 },
    rankingQuality: unavailableRankingQuality(count, relevantCount, null, totalFolds),
    repeatSummaries: [],
    unavailableReason: reason || "La validación Ridge repetida no está disponible."
  };
}

function unavailableResult(count, reason, rankingQuality, relevantCount) {
  return {
    available: false,
    count: Number.isInteger(count) && count >= 0 ? count : 0,
    mae: null,
    baselineMae: null,
    deltaBaseMinusRidge: null,
    hybridMae: null,
    deltaBaseMinusHybrid: null,
    outerFolds: OUTER_FOLDS,
    foldsEvaluated: 0,
    innerFolds: INNER_FOLDS,
    alphaGrid: ALPHAS.slice(),
    selectedAlphaCounts: {},
    predictionMin: null,
    predictionMax: null,
    foldStability: { available: false, foldsEvaluated: 0, ridgeMaeWins: 0, ties: 0, baselineMaeWins: 0 },
    hybridFoldStability: { available: false, foldsEvaluated: 0, hybridMaeWins: 0, ties: 0, baselineMaeWins: 0 },
    repeatedValidation: unavailableRepeatedValidation(count, relevantCount || 0, reason),
    rankingQuality: rankingQuality || unavailableRankingQuality(count, 0),
    reason: reason || "No hay suficientes valoraciones únicas con características."
  };
}

export function createRidgeRecommendationExperiment(dependencies) {
  const getRatings = dependencies.getRatings;
  const findMovie = dependencies.findMovie;
  const movieFeatures = dependencies.movieFeatures;
  const ratingValue = dependencies.ratingValue;
  const buildProfile = dependencies.buildProfile;
  const predictRating = dependencies.predictRating;
  const rankCandidates = dependencies.rankCandidates;
  const getWatched = dependencies.getWatched;
  const requireExplicitTemporalDates = dependencies.requireExplicitTemporalDates === true;
  const onAlphaSelectionAudit = dependencies.onAlphaSelectionAudit;

  function rankRows(candidates, mode) {
    if (typeof rankCandidates === "function") return (rankCandidates(candidates, RANKING_CUTOFF, mode) || []).slice(0, RANKING_CUTOFF);
    return candidates.slice().sort(function (left, right) {
      return right.prediction.score - left.prediction.score || left.title.localeCompare(right.title);
    }).slice(0, RANKING_CUTOFF);
  }

  function mappedRows() {
    const seen = new Set();
    const rows = [];
    (getRatings() || []).forEach(function (entry) {
      const rating = ratingValue(entry);
      if (rating == null) return;
      const movie = findMovie(entry.title, entry.tmdbId || entry.tmId, entry.year || entry.releaseYear || entry.release_year);
      const names = movieFeatures(movie, entry);
      if (!names || !names.length) return;
      const identity = identityFor(entry, movie, dependencies);
      if (!identity || seen.has(identity)) return;
      seen.add(identity);
      const candidate = movie || entry;
      rows.push({
        entry: entry,
        movie: movie,
        candidate: candidate,
        identity: identity,
        rating: rating,
        trainingVector: vectorize(names),
        candidateVector: vectorize(names)
      });
    });
    return rows;
  }

  function selectAlpha(rows, kernel, outerTraining, outerFold, repetitionIndex) {
    const innerSalt = repetitionIndex === 0
      ? "ridge-inner-" + outerFold
      : "ridge-inner-repeat-" + repetitionIndex + "-" + outerFold;
    const folds = foldIndices(outerTraining, rows, INNER_FOLDS, innerSalt);
    const candidates = [];
    ALPHAS.forEach(function (alpha) {
      const errors = [];
      folds.forEach(function (validationIndices) {
        const validationSet = new Set(validationIndices);
        const trainingIndices = outerTraining.filter(function (index) { return !validationSet.has(index); });
        if (!trainingIndices.length || !validationIndices.length) return;
        const model = trainRidge(rows, kernel, trainingIndices, alpha);
        validationIndices.forEach(function (index) {
          const prediction = predictRidge(rows, model, rows[index].candidateVector);
          errors.push(Math.abs(prediction - rows[index].rating));
        });
      });
      if (!errors.length) throw new Error("Validación interna insuficiente");
      candidates.push({ alpha: alpha, score: meanAbsoluteError(errors) });
    });
    const bestAlpha = selectAlphaByMae(candidates);
    if (bestAlpha == null) throw new Error("No se pudo seleccionar alpha");
    return bestAlpha;
  }

  function evaluateFoldSet(rows, kernel, indices, repetitionIndex, relevantCount) {
    const repeatSalt = repetitionIndex === 0 ? "" : "-repeat-" + repetitionIndex;
    const outerSalt = repetitionIndex === 0 ? "ridge-outer" : "ridge-outer" + repeatSalt;
    const outer = foldIndices(indices, rows, OUTER_FOLDS, outerSalt);
    const ridgeErrors = [];
    const baselineErrors = [];
    const hybridErrors = [];
    const foldMaeDeltas = [];
    const hybridFoldMaeDeltas = [];
    const selectedAlphaCounts = Object.create(null);
    ALPHAS.forEach(function (alpha) { selectedAlphaCounts[String(alpha)] = 0; });
    const rankingTotals = Object.create(null);
    RANKING_MODES.forEach(function (mode) {
      rankingTotals[mode] = {
        baselineDcg: 0, ridgeDcg: 0, hybridDcg: 0, idealDcg: 0, foldsEvaluated: 0,
        foldsRidgeWins: 0, foldsRidgeTies: 0, foldsRidgeLosses: 0,
        foldsHybridWins: 0, foldsHybridTies: 0, foldsHybridLosses: 0
      };
    });
    const canCompareRanking = rows.length >= MIN_RANKING_RECORDS && relevantCount >= MIN_RELEVANT_RECORDS;
    let predictionMin = Infinity;
    let predictionMax = -Infinity;

    outer.forEach(function (testIndices, outerFold) {
      const testSet = new Set(testIndices);
      const trainingIndices = indices.filter(function (index) { return !testSet.has(index); });
      const alpha = selectAlpha(rows, kernel, trainingIndices, outerFold, repetitionIndex);
      selectedAlphaCounts[String(alpha)] += 1;
      const ridgeModel = trainRidge(rows, kernel, trainingIndices, alpha);
      const trainingRatings = trainingIndices.map(function (index) { return rows[index].entry; });
      const additiveProfile = buildProfile(trainingRatings);
      const baselineCandidates = [];
      const ridgeCandidates = [];
      const hybridCandidates = [];
      const gains = new Map();
      const ridgeFoldErrors = [];
      const baselineFoldErrors = [];
      const hybridFoldErrors = [];

      testIndices.forEach(function (index, position) {
        const row = rows[index];
        const ridgePrediction = predictRidge(rows, ridgeModel, row.trainingVector);
        const additiveResult = predictRating(row.candidate, additiveProfile);
        const additivePrediction = clampRating(Number.isFinite(additiveResult && additiveResult.score)
          ? additiveResult.score : additiveProfile.average);
        const hybridPrediction = clampRating((ridgePrediction + additivePrediction) / 2);
        const ridgeError = Math.abs(ridgePrediction - row.rating);
        const baselineError = Math.abs(additivePrediction - row.rating);
        const hybridError = Math.abs(hybridPrediction - row.rating);
        ridgeErrors.push(ridgeError);
        baselineErrors.push(baselineError);
        hybridErrors.push(hybridError);
        ridgeFoldErrors.push(ridgeError);
        baselineFoldErrors.push(baselineError);
        hybridFoldErrors.push(hybridError);
        predictionMin = Math.min(predictionMin, ridgePrediction);
        predictionMax = Math.max(predictionMax, ridgePrediction);
        if (canCompareRanking) {
          const token = "candidate-" + position;
          const baselinePrediction = Object.assign({}, additiveResult || {}, { score: additivePrediction });
          const ridgePredictionExplained = Object.assign({}, additiveResult || {}, { score: ridgePrediction });
          baselineCandidates.push(rankingCandidate(row, baselinePrediction, additivePrediction, token));
          ridgeCandidates.push(rankingCandidate(row, ridgePredictionExplained, ridgePrediction, token));
          const hybridExplained = Object.assign({}, additiveResult || {}, { score: hybridPrediction });
          hybridCandidates.push(rankingCandidate(row, hybridExplained, hybridPrediction, token));
          gains.set(token, relevanceGain(row.rating));
        }
      });

      foldMaeDeltas.push(meanAbsoluteError(baselineFoldErrors) - meanAbsoluteError(ridgeFoldErrors));
      hybridFoldMaeDeltas.push(meanAbsoluteError(baselineFoldErrors) - meanAbsoluteError(hybridFoldErrors));
      if (canCompareRanking) {
        const ideal = testIndices.map(function (_, position) {
          const token = "candidate-" + position;
          return { gain: gains.get(token) || 0, token: token };
        }).sort(function (left, right) {
          return right.gain - left.gain || left.token.localeCompare(right.token);
        });
        const idealDcg = dcgAt5(ideal);
        if (idealDcg > 0) {
          RANKING_MODES.forEach(function (mode) {
            const baselineTop = rankRows(baselineCandidates, mode);
            const ridgeTop = rankRows(ridgeCandidates, mode);
            const hybridTop = rankRows(hybridCandidates, mode);
            const baselineDcg = dcgAt5(baselineTop.map(function (candidate) {
              return { gain: gains.get(candidate.evaluationToken) || 0 };
            }));
            const ridgeDcg = dcgAt5(ridgeTop.map(function (candidate) {
              return { gain: gains.get(candidate.evaluationToken) || 0 };
            }));
            const hybridDcg = dcgAt5(hybridTop.map(function (candidate) {
              return { gain: gains.get(candidate.evaluationToken) || 0 };
            }));
            const foldDelta = (ridgeDcg - baselineDcg) / idealDcg;
            const hybridFoldDelta = (hybridDcg - baselineDcg) / idealDcg;
            if (foldDelta > 1e-10) rankingTotals[mode].foldsRidgeWins += 1;
            else if (foldDelta < -1e-10) rankingTotals[mode].foldsRidgeLosses += 1;
            else rankingTotals[mode].foldsRidgeTies += 1;
            if (hybridFoldDelta > 1e-10) rankingTotals[mode].foldsHybridWins += 1;
            else if (hybridFoldDelta < -1e-10) rankingTotals[mode].foldsHybridLosses += 1;
            else rankingTotals[mode].foldsHybridTies += 1;
            rankingTotals[mode].baselineDcg += baselineDcg;
            rankingTotals[mode].ridgeDcg += ridgeDcg;
            rankingTotals[mode].hybridDcg += hybridDcg;
            rankingTotals[mode].idealDcg += idealDcg;
            rankingTotals[mode].foldsEvaluated += 1;
          });
        }
      }
    });

    return {
      repetitionIndex: repetitionIndex,
      ridgeErrors: ridgeErrors,
      baselineErrors: baselineErrors,
      hybridErrors: hybridErrors,
      foldMaeDeltas: foldMaeDeltas,
      hybridFoldMaeDeltas: hybridFoldMaeDeltas,
      selectedAlphaCounts: selectedAlphaCounts,
      predictionMin: predictionMin,
      predictionMax: predictionMax,
      outerFoldsEvaluated: outer.length,
      rankingTotals: rankingTotals,
      rankingQuality: canCompareRanking
        ? completeRankingQuality(rows.length, rel  async function selectAlphaAsync(rows, kernel, outerTraining, outerFold, repetitionIndex, control) {
    const innerSalt = repetitionIndex === 0
      ? "ridge-inner-" + outerFold
      : "ridge-inner-repeat-" + repetitionIndex + "-" + outerFold;
    const folds = foldIndices(outerTraining, rows, INNER_FOLDS, innerSalt);
    const outerKernelScale = summarizeCenteredKernelScale(kernel, outerTraining);
    const innerTrainingInfos = folds.map(function (validationIndices, foldIndex) {
      const validationSet = new Set(validationIndices);
      const trainingIndices = outerTraining.filter(function (index) { return !validationSet.has(index); });
      return {
        foldIndex: foldIndex,
        validationIndices: validationIndices,
        trainingIndices: trainingIndices,
        scale: summarizeCenteredKernelScale(kernel, trainingIndices)
      };
    });
    const innerScalesAvailable = innerTrainingInfos.every(function (item) {
      return item.trainingIndices.length > 0 && item.scale.available;
    });
    const innerScaleReference = summarizeNumericScale(innerTrainingInfos.map(function (item) {
      return item.scale.scale;
    }));
    const lambdaGrid = outerKernelScale.available && innerScalesAvailable && innerScaleReference.available
      ? buildRelativeLambdaGrid(ALPHAS, innerScaleReference.median) : null;
    const maeCandidates = [];
    const rankingCandidates = [];
    const relativeMaeCandidates = [];
    const relativeRankingCandidates = [];
    const canSelectRanking = outerTraining.length >= MIN_RANKING_RECORDS &&
      outerTraining.filter(function (index) { return rows[index].rating >= RELEVANT_RATING_THRESHOLD; }).length >= MIN_RELEVANT_RECORDS;
    let relativeNumericErrors = 0;

    for (let alphaIndex = 0; alphaIndex < ALPHAS.length; alphaIndex += 1) {
      if (!control.shouldContinue()) return null;
      const alpha = ALPHAS[alphaIndex];
      const lambda = lambdaGrid ? lambdaGrid[alphaIndex] : null;
      const errors = [];
      const rankingScores = [];
      const relativeErrors = [];
      const relativeRankingScores = [];
      let rankingFoldsEvaluated = 0;
      let relativeRankingFoldsEvaluated = 0;
      let relativeCandidateValid = Boolean(lambdaGrid);

      for (let foldIndex = 0; foldIndex < innerTrainingInfos.length; foldIndex += 1) {
        if (!control.shouldContinue()) return null;
        const info = innerTrainingInfos[foldIndex];
        const validationIndices = info.validationIndices;
        const trainingIndices = info.trainingIndices;
        if (!trainingIndices.length || !validationIndices.length) {
          relativeCandidateValid = false;
          continue;
        }

        const model = await trainRidgeAsync(rows, kernel, trainingIndices, alpha, {
          shouldContinue: control.shouldContinue,
          yieldToBrowser: control.yieldToBrowser,
          batchSize: control.batchSize
        });
        if (!model || !control.shouldContinue()) return null;
        const validationScores = [];
        validationIndices.forEach(function (index) {
          const prediction = predictRidge(rows, model, rows[index].candidateVector);
          errors.push(Math.abs(prediction - rows[index].rating));
          validationScores.push({ index: index, score: prediction });
        });

        let relativeModel = null;
        if (lambdaGrid && info.scale.available) {
          const effectiveAlpha = effectiveRidgeAlpha(lambda, info.scale.scale);
          if (effectiveAlpha != null) {
            try {
              relativeModel = await trainRidgeAsync(rows, kernel, trainingIndices, effectiveAlpha, {
                shouldContinue: control.shouldContinue,
                yieldToBrowser: control.yieldToBrowser,
                batchSize: control.batchSize
              });
            } catch (error) {
              relativeNumericErrors += 1;
              relativeCandidateValid = false;
            }
            if (!control.shouldContinue()) return null;
          } else {
            relativeNumericErrors += 1;
            relativeCandidateValid = false;
          }
        } else {
          relativeCandidateValid = false;
        }

        const relativeValidationScores = [];
        if (relativeModel) {
          validationIndices.forEach(function (index) {
            const prediction = predictRidge(rows, relativeModel, rows[index].candidateVector);
            relativeErrors.push(Math.abs(prediction - rows[index].rating));
            relativeValidationScores.push({ index: index, score: prediction });
          });
        } else {
          relativeCandidateValid = false;
        }

        const tokenByIndex = new Map(validationIndices.map(function (index) {
          return [index, "inner-candidate-" + index];
        }));
        const gains = new Map(validationIndices.map(function (index) {
          return [tokenByIndex.get(index), relevanceGain(rows[index].rating)];
        }));
        const ideal = validationIndices.map(function (index) {
          return { token: tokenByIndex.get(index), gain: gains.get(tokenByIndex.get(index)) || 0 };
        }).sort(function (left, right) {
          return right.gain - left.gain || left.token.localeCompare(right.token);
        });
        const idealDcg = dcgAt5(ideal);
        if (canSelectRanking && idealDcg > 0) {
          const candidates = validationScores.map(function (item) {
            return rankingCandidate(rows[item.index], { score: item.score }, item.score, tokenByIndex.get(item.index));
          });
          RANKING_MODES.forEach(function (mode) {
            const top = rankRows(candidates, mode);
            const dcg = dcgAt5(top.map(function (candidate) {
              return { gain: gains.get(candidate.evaluationToken) || 0 };
            }));
            rankingScores.push(dcg / idealDcg);
          });
          rankingFoldsEvaluated += 1;

          if (relativeModel) {
            const relativeCandidates = relativeValidationScores.map(function (item) {
              return rankingCandidate(rows[item.index], { score: item.score }, item.score, tokenByIndex.get(item.index));
            });
            RANKING_MODES.forEach(function (mode) {
              const top = rankRows(relativeCandidates, mode);
              const dcg = dcgAt5(top.map(function (candidate) {
                return { gain: gains.get(candidate.evaluationToken) || 0 };
              }));
              relativeRankingScores.push(dcg / idealDcg);
            });
            relativeRankingFoldsEvaluated += 1;
          }
        }

        control.onModelFit({
          stage: "inner",
          alpha: alpha,
          repetitionIndex: repetitionIndex,
          outerFold: outerFold,
          innerFold: foldIndex
        });
        if (relativeModel) control.onModelFit({
          stage: "inner-relative",
          alpha: effectiveRidgeAlpha(lambda, info.scale.scale),
          lambda: lambda,
          repetitionIndex: repetitionIndex,
          outerFold: outerFold,
          innerFold: foldIndex
        });
        await control.yieldToBrowser();
      }

      if (!errors.length) throw new Error("Validación interna insuficiente");
      maeCandidates.push({ alpha: alpha, score: meanAbsoluteError(errors) });
      if (canSelectRanking && rankingFoldsEvaluated >= MIN_RANKING_INNER_FOLDS && rankingScores.length) {
        const score = rankingScores.reduce(function (sum, value) { return sum + value; }, 0) / rankingScores.length;
        rankingCandidates.push({ alpha: alpha, score: score, foldsEvaluated: rankingFoldsEvaluated });
      }
      if (relativeCandidateValid && relativeErrors.length === errors.length &&
        relativeErrors.length > 0 && lambda != null) {
        relativeMaeCandidates.push({ alpha: lambda, score: meanAbsoluteError(relativeErrors) });
        if (canSelectRanking && relativeRankingFoldsEvaluated >= MIN_RANKING_INNER_FOLDS &&
          relativeRankingScores.length) {
          const score = relativeRankingScores.reduce(function (sum, value) { return sum + value; }, 0) /
            relativeRankingScores.length;
          relativeRankingCandidates.push({
            alpha: lambda, score: score, foldsEvaluated: relativeRankingFoldsEvaluated
          });
        }
      }
    }

    const bestAlpha = selectAlphaByMae(maeCandidates);
    const bestRankingAlpha = selectAlphaByRanking(rankingCandidates);
    const bestLambdaByMae = selectAlphaByMae(relativeMaeCandidates);
    const bestLambdaByRanking = selectAlphaByRanking(relativeRankingCandidates);
    if (bestAlpha == null) throw new Error("No se pudo seleccionar alpha");
    return {
      mae: bestAlpha,
      ranking: bestRankingAlpha,
      relativeMae: bestLambdaByMae,
      relativeRanking: bestLambdaByRanking,
      outerKernelScale: outerKernelScale,
      innerTrainingScales: innerTrainingInfos.map(function (item) {
        return {
          fold: item.foldIndex + 1,
          count: item.scale.count,
          available: item.scale.available,
          meanDiagonal: item.scale.meanDiagonal,
          medianDiagonal: item.scale.medianDiagonal,
          minDiagonal: item.scale.minDiagonal,
          maxDiagonal: item.scale.maxDiagonal,
          reason: item.scale.reason
        };
      }),
      innerScaleReference: innerScaleReference,
      lambdaGrid: lambdaGrid,
      relativeNumericErrors: relativeNumericErrors,
      innerValidationIndices: folds.map(function (fold) { return fold.slice(); })
    };
  }

ing: bestRankingAlpha,
      innerValidationIndices: folds.map(function (fold) { return fold.slice(); })
    };
  }

  async function evaluateFoldSetAsync(rows, kernel, indices, repetitionIndex, relevantCount, control) {
    const repeatSalt = repetitionIndex === 0 ? "" : "-repeat-" + repetitionIndex;
    const outerSalt = repetitionIndex === 0 ? "ridge-outer" : "ridge-outer" + repeatSalt;
    const outer = foldIndices(indices, rows, OUTER_FOLDS, outerSalt);
    const ridgeErrors = [];
    const baselineErrors = [];
    const hybridErrors = [];
    const foldMaeDeltas = [];
    const hybridFoldMaeDeltas = [];
    const selectedAlphaCounts = Object.create(null);
    ALPHAS.forEach(function (alpha) { selectedAlphaCounts[String(alpha)] = 0; });
    const rankingTotals = Object.create(null);
    const rankingSelectionTotals = Object.create(null);
    const rankingSelectedAlphaCounts = Object.create(null);
    ALPHAS.forEach(function (alpha) { rankingSelectedAlphaCounts[String(alpha)] = 0; });
    const alphaComparisonMaeSelectorErrors = [];
    const alphaComparisonBaselineErrors = [];
    const alphaComparisonRankingErrors = [];
    const alphaComparisonFoldMaeDeltas = [];
    const alphaComparisonFoldSummaries = [];
    const relativeMaeSelectorErrors = [];
    const relativeMaeBaselineErrors = [];
    const relativeRankingSelectorErrors = [];
    const relativeRankingBaselineErrors = [];
    const selectedRelativeLambdaCountsByMae = Object.create(null);
    const selectedRelativeLambdaCountsByRanking = Object.create(null);
    ALPHAS.forEach(function (alpha) {
      selectedRelativeLambdaCountsByMae[String(alpha)] = 0;
      selectedRelativeLambdaCountsByRanking[String(alpha)] = 0;
    });
    let relativeNumericErrors = 0;
    RANKING_MODES.forEach(function (mode) {
      rankingTotals[mode] = {
        baselineDcg: 0, ridgeDcg: 0, hybridDcg: 0, idealDcg: 0, foldsEvaluated: 0,
        foldsRidgeWins: 0, foldsRidgeTies: 0, foldsRidgeLosses: 0,
        foldsHybridWins: 0, foldsHybridTies: 0, foldsHybridLosses: 0
      };
      rankingSelectionTotals[mode] = {
        baselineDcg: 0, maeSelectedDcg: 0, rankingSelectedDcg: 0, idealDcg: 0, foldsEvaluated: 0,
        rankingSelectorWins: 0, rankingSelectorTies: 0, rankingSelectorLosses: 0,
        maeVsBaselineWins: 0, maeVsBaselineTies: 0, maeVsBaselineLosses: 0,
        rankingVsBaselineWins: 0, rankingVsBaselineTies: 0, rankingVsBaselineLosses: 0
      };
    });
    const canCompareRanking = rows.length >= MIN_RANKING_RECORDS && relevantCount >= MIN_RELEVANT_RECORDS;
    let predictionMin = Infinity;
    let predictionMax = -Infinity;

    for (let outerFold = 0; outerFold < outer.length; outerFold += 1) {
      if (!control.shouldContinue()) return null;
      const testIndices = outer[outerFold];
      const testSet = new Set(testIndices);
      const trainingIndices = indices.filter(function (index) { return !testSet.has(index); });
      const alphaSelection = await selectAlphaAsync(rows, kernel, trainingIndices, outerFold, repetitionIndex, control);
      if (alphaSelection == null || alphaSelection.mae == null || !control.shouldContinue()) return null;
      const alpha = alphaSelection.mae;
      const rankingAlpha = alphaSelection.ranking;
      const relativeLambdaMae = alphaSelection.relativeMae;
      const relativeLambdaRanking = alphaSelection.relativeRanking;
      const outerKernelScale = alphaSelection.outerKernelScale;
      const relativeAlphaMae = effectiveRidgeAlpha(relativeLambdaMae, outerKernelScale && outerKernelScale.scale);
      const relativeAlphaRanking = effectiveRidgeAlpha(relativeLambdaRanking, outerKernelScale && outerKernelScale.scale);
      const relativeMaeIndex = alphaSelection.lambdaGrid ? alphaSelection.lambdaGrid.indexOf(relativeLambdaMae) : -1;
      const relativeRankingIndex = alphaSelection.lambdaGrid ? alphaSelection.lambdaGrid.indexOf(relativeLambdaRanking) : -1;
      relativeNumericErrors += Number(alphaSelection.relativeNumericErrors) || 0;
      if (relativeMaeIndex >= 0) selectedRelativeLambdaCountsByMae[String(ALPHAS[relativeMaeIndex])] += 1;
      if (relativeRankingIndex >= 0) selectedRelativeLambdaCountsByRanking[String(ALPHAS[relativeRankingIndex])] += 1;
      if (typeof onAlphaSelectionAudit === "function") onAlphaSelectionAudit({
        repeat: repetitionIndex + 1,
        outerFold: outerFold + 1,
        outerTrainingIndices: trainingIndices.slice(),
        outerTestIndices: testIndices.slice(),
        innerValidationIndices: alphaSelection.innerValidationIndices.map(function (fold) { return fold.slice(); }),
        selectedAlphaByMae: alpha,
        selectedAlphaByRanking: rankingAlpha,
        outerKernelScale: outerKernelScale,
        innerTrainingScales: alphaSelection.innerTrainingScales,
        innerScaleReference: alphaSelection.innerScaleReference,
        lambdaGrid: alphaSelection.lambdaGrid,
        selectedLambdaByMae: relativeLambdaMae,
        selectedLambdaByRanking: relativeLambdaRanking,
        effectiveAlphaByRelativeMae: relativeAlphaMae,
        effectiveAlphaByRelativeRanking: relativeAlphaRanking
      });
      selectedAlphaCounts[String(alpha)] += 1;
      const ridgeModel = await trainRidgeAsync(rows, kernel, trainingIndices, alpha, {
        shouldContinue: control.shouldContinue,
        yieldToBrowser: control.yieldToBrowser,
        batchSize: control.batchSize
      });
      if (!ridgeModel || !control.shouldContinue()) return null;
      let rankingSelectedModel = null;
      if (rankingAlpha != null) {
        rankingSelectedAlphaCounts[String(rankingAlpha)] += 1;
        rankingSelectedModel = rankingAlpha === alpha ? ridgeModel : await trainRidgeAsync(rows, kernel, trainingIndices, rankingAlpha, {
          shouldContinue: control.shouldContinue,
          yieldToBrowser: control.yieldToBrowser,
          batchSize: control.batchSize
        });
        if (!rankingSelectedModel || !control.shouldContinue()) return null;
        if (rankingAlpha !== alpha) control.onModelFit({
          stage: "outer-ranking-alpha",
          alpha: rankingAlpha,
          repetitionIndex: repetitionIndex,
          outerFold: outerFold
        });
      }
      let relativeMaeSelectedModel = null;
      let relativeRankingSelectedModel = null;
      if (relativeAlphaMae != null) {
        try {
          relativeMaeSelectedModel = await trainRidgeAsync(rows, kernel, trainingIndices, relativeAlphaMae, {
            shouldContinue: control.shouldContinue,
            yieldToBrowser: control.yieldToBrowser,
            batchSize: control.batchSize
          });
        } catch (error) {
          relativeNumericErrors += 1;
        }
        if (!control.shouldContinue()) return null;
      }
      if (relativeAlphaRanking != null) {
        if (relativeAlphaRanking === relativeAlphaMae) {
          relativeRankingSelectedModel = relativeMaeSelectedModel;
        } else {
          try {
            relativeRankingSelectedModel = await trainRidgeAsync(rows, kernel, trainingIndices, relativeAlphaRanking, {
              shouldContinue: control.shouldContinue,
              yieldToBrowser: control.yieldToBrowser,
              batchSize: control.batchSize
            });
          } catch (error) {
            relativeNumericErrors += 1;
          }
          if (!control.shouldContinue()) return null;
        }
      }
      if (relativeMaeSelectedModel) control.onModelFit({
        stage: "outer-relative-mae",
        alpha: relativeAlphaMae,
        lambda: relativeLambdaMae,
        repetitionIndex: repetitionIndex,
        outerFold: outerFold
      });
      if (relativeRankingSelectedModel && relativeAlphaRanking !== relativeAlphaMae) control.onModelFit({
        stage: "outer-relative-ranking",
        alpha: relativeAlphaRanking,
        lambda: relativeLambdaRanking,
        repetitionIndex: repetitionIndex,
        outerFold: outerFold
      });
      control.onModelFit({
        stage: "outer",
        alpha: alpha,
        repetitionIndex: repetitionIndex,
        outerFold: outerFold
      });
      const trainingRatings = trainingIndices.map(function (index) { return rows[index].entry; });
      const additiveProfile = buildProfile(trainingRatings);
      const baselineCandidates = [];
      const ridgeCandidates = [];
      const hybridCandidates = [];
      const rankingSelectedCandidates = [];
      const relativeMaeCandidates = [];
      const relativeRankingCandidates = [];
      const gains = new Map();
      const ridgeFoldErrors = [];
      const baselineFoldErrors = [];
      const hybridFoldErrors = [];
      const rankingSelectedFoldErrors = [];
      const relativeMaeFoldErrors = [];
      const relativeRankingFoldErrors = [];
      const foldRankingComparisons = Object.create(null);
      RANKING_MODES.forEach(function (mode) {
        foldRankingComparisons[mode] = {
          mode: mode, available: false, baselineNdcgAt5: null, maeSelectedNdcgAt5: null,
          rankingSelectedNdcgAt5: null, deltaRankingSelectionMinusMaeSelection: null,
          relativeMaeAvailable: false, relativeRankingAvailable: false,
          relativeMaeSelectedNdcgAt5: null, relativeRankingSelectedNdcgAt5: null,
          deltaRelativeMaeSelectionMinusBaseline: null, deltaRelativeRankingSelectionMinusBaseline: null,
          deltaRelativeRankingSelectionMinusRelativeMae: null, idealDcgWeight: null,
          relativeMaeVsBaselineWins: 0, relativeMaeVsBaselineTies: 0, relativeMaeVsBaselineLosses: 0,
          relativeRankingVsBaselineWins: 0, relativeRankingVsBaselineTies: 0, relativeRankingVsBaselineLosses: 0,
          relativeRankingVsRelativeMaeWins: 0, relativeRankingVsRelativeMaeTies: 0, relativeRankingVsRelativeMaeLosses: 0,
          wins: 0, ties: 0, losses: 0
        };
      });

      testIndices.forEach(function (index, position) {
        const row = rows[index];
        const ridgePrediction = predictRidge(rows, ridgeModel, row.trainingVector);
        const additiveResult = predictRating(row.candidate, additiveProfile);
        const additivePrediction = clampRating(Number.isFinite(additiveResult && additiveResult.score)
          ? additiveResult.score : additiveProfile.average);
        const hybridPrediction = clampRating((ridgePrediction + additivePrediction) / 2);
        const rankingSelectedPrediction = rankingAlpha == null ? null : predictRidge(rows, rankingSelectedModel, row.trainingVector);
        const relativeMaePrediction = relativeMaeSelectedModel
          ? predictRidge(rows, relativeMaeSelectedModel, row.trainingVector) : null;
        const relativeRankingPrediction = relativeRankingSelectedModel
          ? predictRidge(rows, relativeRankingSelectedModel, row.trainingVector) : null;
        const ridgeError = Math.abs(ridgePrediction - row.rating);
        const baselineError = Math.abs(additivePrediction - row.rating);
        const hybridError = Math.abs(hybridPrediction - row.rating);
        const rankingSelectedError = rankingAlpha == null ? null : Math.abs(rankingSelectedPrediction - row.rating);
        const relativeMaeError = relativeMaePrediction == null ? null : Math.abs(relativeMaePrediction - row.rating);
        const relativeRankingError = relativeRankingPrediction == null ? null : Math.abs(relativeRankingPrediction - row.rating);
        ridgeErrors.push(ridgeError);
        baselineErrors.push(baselineError);
        hybridErrors.push(hybridError);
        ridgeFoldErrors.push(ridgeError);
        baselineFoldErrors.push(baselineError);
        hybridFoldErrors.push(hybridError);
        if (rankingAlpha != null) {
          alphaComparisonMaeSelectorErrors.push(ridgeError);
          alphaComparisonBaselineErrors.push(baselineError);
          alphaComparisonRankingErrors.push(rankingSelectedError);
          rankingSelectedFoldErrors.push(rankingSelectedError);
        }
        if (relativeMaeSelectedModel) {
          if (Number.isFinite(relativeMaeError)) relativeMaeFoldErrors.push(relativeMaeError);
          else relativeNumericErrors += 1;
        }
        if (relativeRankingSelectedModel) {
          if (Number.isFinite(relativeRankingError)) relativeRankingFoldErrors.push(relativeRankingError);
          else relativeNumericErrors += 1;
        }
        predictionMin = Math.min(predictionMin, ridgePrediction);
        predictionMax = Math.max(predictionMax, ridgePrediction);
        if (canCompareRanking) {
          const token = "candidate-" + position;
          const baselinePrediction = Object.assign({}, additiveResult || {}, { score: additivePrediction });
          const ridgePredictionExplained = Object.assign({}, additiveResult || {}, { score: ridgePrediction });
          baselineCandidates.push(rankingCandidate(row, baselinePrediction, additivePrediction, token));
          ridgeCandidates.push(rankingCandidate(row, ridgePredictionExplained, ridgePrediction, token));
          const hybridExplained = Object.assign({}, additiveResult || {}, { score: hybridPrediction });
          hybridCandidates.push(rankingCandidate(row, hybridExplained, hybridPrediction, token));
          if (rankingAlpha != null) {
            rankingSelectedCandidates.push(rankingCandidate(row, { score: rankingSelectedPrediction }, rankingSelectedPrediction, token));
          }
          if (relativeMaeSelectedModel) {
            relativeMaeCandidates.push(rankingCandidate(row, { score: relativeMaePrediction }, relativeMaePrediction, token));
          }
          if (relativeRankingSelectedModel) {
            relativeRankingCandidates.push(rankingCandidate(row, { score: relativeRankingPrediction }, relativeRankingPrediction, token));
          }
          gains.set(token, relevanceGain(row.rating));
        }
      });

      if (relativeMaeSelectedModel && relativeMaeFoldErrors.length === testIndices.length) {
        relativeMaeSelectorErrors.push.apply(relativeMaeSelectorErrors, relativeMaeFoldErrors);
        relativeMaeBaselineErrors.push.apply(relativeMaeBaselineErrors, baselineFoldErrors);
      }
      if (relativeRankingSelectedModel && relativeRankingFoldErrors.length === testIndices.length) {
        relativeRankingSelectorErrors.push.apply(relativeRankingSelectorErrors, relativeRankingFoldErrors);
        relativeRankingBaselineErrors.push.apply(relativeRankingBaselineErrors, baselineFoldErrors);
      }
      foldMaeDeltas.push(meanAbsoluteError(baselineFoldErrors) - meanAbsoluteError(ridgeFoldErrors));
      hybridFoldMaeDeltas.push(meanAbsoluteError(baselineFoldErrors) - meanAbsoluteError(hybridFoldErrors));
      if (rankingAlpha != null) {
        alphaComparisonFoldMaeDeltas.push(meanAbsoluteError(rankingSelectedFoldErrors) - meanAbsoluteError(ridgeFoldErrors));
      }
      if (canCompareRanking) {
        const ideal = testIndices.map(function (_, position) {
          const token = "candidate-" + position;
          return { gain: gains.get(token) || 0, token: token };
        }).sort(function (left, right) {
          return right.gain - left.gain || left.token.localeCompare(right.token);
        });
        const idealDcg = dcgAt5(ideal);
        if (idealDcg > 0) {
          RANKING_MODES.forEach(function (mode) {
            const baselineTop = rankRows(baselineCandidates, mode);
            const ridgeTop = rankRows(ridgeCandidates, mode);
            const hybridTop = rankRows(hybridCandidates, mode);
            const rankingSelectedTop = rankingAlpha == null ? [] : rankRows(rankingSelectedCandidates, mode);
            const baselineDcg = dcgAt5(baselineTop.map(function (candidate) {
              return { gain: gains.get(candidate.evaluationToken) || 0 };
            }));
            const ridgeDcg = dcgAt5(ridgeTop.map(function (candidate) {
              return { gain: gains.get(candidate.evaluationToken) || 0 };
            }));
            const hybridDcg = dcgAt5(hybridTop.map(function (candidate) {
              return { gain: gains.get(candidate.evaluationToken) || 0 };
            }));
            const rankingSelectedDcg = rankingAlpha == null ? null : dcgAt5(rankingSelectedTop.map(function (candidate) {
              return { gain: gains.get(candidate.evaluationToken) || 0 };
            }));
            const relativeMaeTop = relativeMaeSelectedModel ? rankRows(relativeMaeCandidates, mode) : [];
            const relativeRankingTop = relativeRankingSelectedModel ? rankRows(relativeRankingCandidates, mode) : [];
            const relativeMaeSelectedDcg = relativeMaeSelectedModel && relativeMaeFoldErrors.length === testIndices.length
              ? dcgAt5(relativeMaeTop.map(function (candidate) {
                return { gain: gains.get(candidate.evaluationToken) || 0 };
              })) : null;
            const relativeRankingSelectedDcg = relativeRankingSelectedModel && relativeRankingFoldErrors.length === testIndices.length
              ? dcgAt5(relativeRankingTop.map(function (candidate) {
                return { gain: gains.get(candidate.evaluationToken) || 0 };
              })) : null;
            const foldDelta = (ridgeDcg - baselineDcg) / idealDcg;
            const hybridFoldDelta = (hybridDcg - baselineDcg) / idealDcg;
            if (foldDelta > 1e-10) rankingTotals[mode].foldsRidgeWins += 1;
            else if (foldDelta < -1e-10) rankingTotals[mode].foldsRidgeLosses += 1;
            else rankingTotals[mode].foldsRidgeTies += 1;
            if (hybridFoldDelta > 1e-10) rankingTotals[mode].foldsHybridWins += 1;
            else if (hybridFoldDelta < -1e-10) rankingTotals[mode].foldsHybridLosses += 1;
            else rankingTotals[mode].foldsHybridTies += 1;
            rankingTotals[mode].baselineDcg += baselineDcg;
            rankingTotals[mode].ridgeDcg += ridgeDcg;
            rankingTotals[mode].hybridDcg += hybridDcg;
            rankingTotals[mode].idealDcg += idealDcg;
            rankingTotals[mode].foldsEvaluated += 1;
            if (rankingAlpha != null && Number.isFinite(rankingSelectedDcg)) {
              const comparisonDelta = (rankingSelectedDcg - ridgeDcg) / idealDcg;
              if (comparisonDelta > 1e-10) rankingSelectionTotals[mode].rankingSelectorWins += 1;
              else if (comparisonDelta < -1e-10) rankingSelectionTotals[mode].rankingSelectorLosses += 1;
              else rankingSelectionTotals[mode].rankingSelectorTies += 1;
              const maeBaselineDelta = (ridgeDcg - baselineDcg) / idealDcg;
              if (maeBaselineDelta > 1e-10) rankingSelectionTotals[mode].maeVsBaselineWins += 1;
              else if (maeBaselineDelta < -1e-10) rankingSelectionTotals[mode].maeVsBaselineLosses += 1;
              else rankingSelectionTotals[mode].maeVsBaselineTies += 1;
              const rankingBaselineDelta = (rankingSelectedDcg - baselineDcg) / idealDcg;
              if (rankingBaselineDelta > 1e-10) rankingSelectionTotals[mode].rankingVsBaselineWins += 1;
              else if (rankingBaselineDelta < -1e-10) rankingSelectionTotals[mode].rankingVsBaselineLosses += 1;
              else rankingSelectionTotals[mode].rankingVsBaselineTies += 1;
              rankingSelectionTotals[mode].baselineDcg += baselineDcg;
              rankingSelectionTotals[mode].maeSelectedDcg += ridgeDcg;
              rankingSelectionTotals[mode].rankingSelectedDcg += rankingSelectedDcg;
              rankingSelectionTotals[mode].idealDcg += idealDcg;
              rankingSelectionTotals[mode].foldsEvaluated += 1;
              foldRankingComparisons[mode] = {
                mode: mode,
                available: true,
                baselineNdcgAt5: baselineDcg / idealDcg,
                maeSelectedNdcgAt5: ridgeDcg / idealDcg,
                rankingSelectedNdcgAt5: rankingSelectedDcg / idealDcg,
                deltaRankingSelectionMinusMaeSelection: comparisonDelta,
                deltaMaeSelectionMinusBaseline: maeBaselineDelta,
                deltaRankingSelectionMinusBaseline: rankingBaselineDelta,
                wins: comparisonDelta > 1e-10 ? 1 : 0,
                ties: Math.abs(comparisonDelta) <= 1e-10 ? 1 : 0,
                losses: comparisonDelta < -1e-10 ? 1 : 0,
                maeVsBaselineWins: maeBaselineDelta > 1e-10 ? 1 : 0,
                maeVsBaselineTies: Math.abs(maeBaselineDelta) <= 1e-10 ? 1 : 0,
                maeVsBaselineLosses: maeBaselineDelta < -1e-10 ? 1 : 0,
                rankingVsBaselineWins: rankingBaselineDelta > 1e-10 ? 1 : 0,
                rankingVsBaselineTies: Math.abs(rankingBaselineDelta) <= 1e-10 ? 1 : 0,
                rankingVsBaselineLosses: rankingBaselineDelta < -1e-10 ? 1 : 0
              };
            }

            const relativeMaeAvailable = Boolean(relativeMaeSelectedModel && Number.isFinite(relativeMaeSelectedDcg));
            const relativeRankingAvailable = Boolean(relativeRankingSelectedModel && Number.isFinite(relativeRankingSelectedDcg));
            const relativeMaeDelta = relativeMaeAvailable ? (relativeMaeSelectedDcg - baselineDcg) / idealDcg : null;
            const relativeRankingDelta = relativeRankingAvailable ? (relativeRankingSelectedDcg - baselineDcg) / idealDcg : null;
            const relativeSelectorDelta = relativeMaeAvailable && relativeRankingAvailable
              ? (relativeRankingSelectedDcg - relativeMaeSelectedDcg) / idealDcg : null;
            const deltaCounts = function (delta) {
              return {
                wins: delta != null && delta > 1e-10 ? 1 : 0,
                ties: delta != null && Math.abs(delta) <= 1e-10 ? 1 : 0,
                losses: delta != null && delta < -1e-10 ? 1 : 0
              };
            };
            const relativeMaeCounts = deltaCounts(relativeMaeDelta);
            const relativeRankingCounts = deltaCounts(relativeRankingDelta);
            const relativeSelectorCounts = deltaCounts(relativeSelectorDelta);
            foldRankingComparisons[mode] = Object.assign({}, foldRankingComparisons[mode], {
              relativeMaeAvailable: relativeMaeAvailable,
              relativeRankingAvailable: relativeRankingAvailable,
              relativeMaeSelectedNdcgAt5: relativeMaeAvailable ? relativeMaeSelectedDcg / idealDcg : null,
              relativeRankingSelectedNdcgAt5: relativeRankingAvailable ? relativeRankingSelectedDcg / idealDcg : null,
              deltaRelativeMaeSelectionMinusBaseline: relativeMaeDelta,
              deltaRelativeRankingSelectionMinusBaseline: relativeRankingDelta,
              deltaRelativeRankingSelectionMinusRelativeMae: relativeSelectorDelta,
              idealDcgWeight: idealDcg,
              relativeMaeVsBaselineWins: relativeMaeCounts.wins,
              relativeMaeVsBaselineTies: relativeMaeCounts.ties,
              relativeMaeVsBaselineLosses: relativeMaeCounts.losses,
              relativeRankingVsBaselineWins: relativeRankingCounts.wins,
              relativeRankingVsBaselineTies: relativeRankingCounts.ties,
              relativeRankingVsBaselineLosses: relativeRankingCounts.losses,
              relativeRankingVsRelativeMaeWins: relativeSelectorCounts.wins,
              relativeRankingVsRelativeMaeTies: relativeSelectorCounts.ties,
              relativeRankingVsRelativeMaeLosses: relativeSelectorCounts.losses
            });
          });
        }
      }
      const relativeMaeFoldAvailable = Boolean(relativeMaeSelectedModel && relativeMaeFoldErrors.length === testIndices.length);
      const relativeRankingFoldAvailable = Boolean(relativeRankingSelectedModel && relativeRankingFoldErrors.length === testIndices.length);
      alphaComparisonFoldSummaries.push({
        repeat: repetitionIndex + 1,
        outerFold: outerFold + 1,
        outerTestCount: testIndices.length,
        selectedAlphaByMae: alpha,
        selectedAlphaByRanking: rankingAlpha,
        selectedLambdaByMae: relativeLambdaMae,
        selectedLambdaByRanking: relativeLambdaRanking,
        relativeLambdaAnchorAlphaByMae: relativeMaeIndex >= 0 ? ALPHAS[relativeMaeIndex] : null,
        relativeLambdaAnchorAlphaByRanking: relativeRankingIndex >= 0 ? ALPHAS[relativeRankingIndex] : null,
        effectiveAlphaByRelativeMae: relativeAlphaMae,
        effectiveAlphaByRelativeRanking: relativeAlphaRanking,
        outerKernelScale: {
          available: Boolean(outerKernelScale && outerKernelScale.available),
          count: Number(outerKernelScale && outerKernelScale.count) || 0,
          meanDiagonal: outerKernelScale ? outerKernelScale.meanDiagonal : null,
          medianDiagonal: outerKernelScale ? outerKernelScale.medianDiagonal : null,
          minDiagonal: outerKernelScale ? outerKernelScale.minDiagonal : null,
          maxDiagonal: outerKernelScale ? outerKernelScale.maxDiagonal : null,
          reason: outerKernelScale && outerKernelScale.reason ? outerKernelScale.reason : null
        },
        innerScaleReference: {
          available: Boolean(alphaSelection.innerScaleReference && alphaSelection.innerScaleReference.available),
          count: Number(alphaSelection.innerScaleReference && alphaSelection.innerScaleReference.count) || 0,
          mean: alphaSelection.innerScaleReference ? alphaSelection.innerScaleReference.mean : null,
          median: alphaSelection.innerScaleReference ? alphaSelection.innerScaleReference.median : null,
          min: alphaSelection.innerScaleReference ? alphaSelection.innerScaleReference.min : null,
          max: alphaSelection.innerScaleReference ? alphaSelection.innerScaleReference.max : null
        },
        relativeMaeAvailable: relativeMaeFoldAvailable,
        relativeRankingAvailable: relativeRankingFoldAvailable,
        relativeMaeSelectedMae: relativeMaeFoldAvailable ? meanAbsoluteError(relativeMaeFoldErrors) : null,
        relativeRankingSelectedMae: relativeRankingFoldAvailable ? meanAbsoluteError(relativeRankingFoldErrors) : null,
        relativeNumericErrors: Number(alphaSelection.relativeNumericErrors) + (relativeNumericErrors -
          (Number(alphaSelection.relativeNumericErrors) || 0)),
        maeSelectedMae: meanAbsoluteError(ridgeFoldErrors),
        baselineMae: meanAbsoluteError(baselineFoldErrors),
        rankingSelectedMae: rankingAlpha == null ? null : meanAbsoluteError(rankingSelectedFoldErrors),
        deltaRankingSelectionMinusMaeSelection: rankingAlpha == null
          ? null : meanAbsoluteError(rankingSelectedFoldErrors) - meanAbsoluteError(ridgeFoldErrors),
        rankingModes: RANKING_MODES.map(function (mode) { return foldRankingComparisons[mode]; })
      });
      control.onOuterFoldCompleted({
        completedWork: control.completedWork(),
        totalWork: control.totalWork,
        repetitionIndex: repetitionIndex,
        outerFold: outerFold
      });
      await control.yieldToBrowser();
      if (!control.shouldContinue()) return null;
    }

    return {
      repetitionIndex: repetitionIndex,
      ridgeErrors: ridgeErrors,
      baselineErrors: baselineErrors,
      hybridErrors: hybridErrors,
      foldMaeDeltas: foldMaeDeltas,
      hybridFoldMaeDeltas: hybridFoldMaeDeltas,
      selectedAlphaCounts: selectedAlphaCounts,
      rankingSelectedAlphaCounts: rankingSelectedAlphaCounts,
      alphaComparisonMaeSelectorErrors: alphaComparisonMaeSelectorErrors,
      alphaComparisonBaselineErrors: alphaComparisonBaselineErrors,
      alphaComparisonRankingErrors: alphaComparisonRankingErrors,
      alphaComparisonFoldMaeDeltas: alphaComparisonFoldMaeDeltas,
      alphaComparisonFoldSummaries: alphaComparisonFoldSummaries,
      relativeMaeSelectorErrors: relativeMaeSelectorErrors,
      relativeMaeBaselineErrors: relativeMaeBaselineErrors,
      relativeRankingSelectorErrors: relativeRankingSelectorErrors,
      relativeRankingBaselineErrors: relativeRankingBaselineErrors,
      selectedRelativeLambdaCountsByMae: selectedRelativeLambdaCountsByMae,
      selectedRelativeLambdaCountsByRanking: selectedRelativeLambdaCountsByRanking,
      relativeNumericErrors: relativeNumericErrors,
      predictionMin: predictionMin,
      predictionMax: predictionMax,
      outerFoldsEvaluated: outer.length,
      rankingTotals: rankingTotals,
      rankingSelectionTotals: rankingSelectionTotals,
      rankingQuality: canCompareRanking
        ? completeRankingQuality(rows.length, relevantCount, rankingTotals, OUTER_FOLDS)
        : unavailableRankingQuality(rows.length, relevantCount)
    };
  }

  function summarizeRepeatedValidation(foldSets, sampleCount, relevantCount) {
    const totalFolds = foldSets.reduce(function (sum, result) {
      return sum + result.outerFoldsEvaluated;
    }, 0);
    const ridgeErrors = [];
    const baselineErrors = [];
    const hybridErrors = [];
    const maeFoldDeltas = [];
    const hybridMaeFoldDeltas = [];
    const rankingTotals = Object.create(null);
    const selectedAlphaCounts = Object.create(null);
    ALPHAS.forEach(function (alpha) { selectedAlphaCounts[String(alpha)] = 0; });
    RANKING_MODES.forEach(function (mode) {
      rankingTotals[mode] = {
        baselineDcg: 0, ridgeDcg: 0, hybridDcg: 0, idealDcg: 0, foldsEvaluated: 0,
        foldsRidgeWins: 0, foldsRidgeTies: 0, foldsRidgeLosses: 0,
        foldsHybridWins: 0, foldsHybridTies: 0, foldsHybridLosses: 0
      };
    });

    foldSets.forEach(function (result) {
      result.ridgeErrors.forEach(function (value) { ridgeErrors.push(value); });
      result.baselineErrors.forEach(function (value) { baselineErrors.push(value); });
      result.hybridErrors.forEach(function (value) { hybridErrors.push(value); });
      result.foldMaeDeltas.forEach(function (value) { maeFoldDeltas.push(value); });
      result.hybridFoldMaeDeltas.forEach(function (value) { hybridMaeFoldDeltas.push(value); });
      Object.keys(result.selectedAlphaCounts).forEach(function (alpha) {
        selectedAlphaCounts[alpha] = (selectedAlphaCounts[alpha] || 0) + result.selectedAlphaCounts[alpha];
      });
      RANKING_MODES.forEach(function (mode) {
        const source = result.rankingTotals[mode];
        const target = rankingTotals[mode];
        target.baselineDcg += source.baselineDcg;
        target.ridgeDcg += source.ridgeDcg;
        target.hybridDcg += source.hybridDcg || 0;
        target.idealDcg += source.idealDcg;
        target.foldsEvaluated += source.foldsEvaluated;
        target.foldsRidgeWins += source.foldsRidgeWins;
        target.foldsRidgeTies += source.foldsRidgeTies;
        target.foldsRidgeLosses += source.foldsRidgeLosses;
        target.foldsHybridWins += source.foldsHybridWins || 0;
        target.foldsHybridTies += source.foldsHybridTies || 0;
        target.foldsHybridLosses += source.foldsHybridLosses || 0;
      });
    });

    const repeatedRanking = sampleCount >= MIN_RANKING_RECORDS && relevantCount >= MIN_RELEVANT_RECORDS
      ? completeRankingQuality(sampleCount, relevantCount, rankingTotals, totalFolds)
      : unavailableRankingQuality(sampleCount, relevantCount, null, totalFolds);
    const repeatSummaries = foldSets.map(function (result) {
      const mae = meanAbsoluteError(result.ridgeErrors);
      const baselineMae = meanAbsoluteError(result.baselineErrors);
      return {
        repeat: result.repetitionIndex + 1,
        sampleCount: sampleCount,
        foldsEvaluated: result.outerFoldsEvaluated,
        mae: mae,
        baselineMae: baselineMae,
        deltaBaseMinusRidge: baselineMae - mae,
        hybridMae: meanAbsoluteError(result.hybridErrors),
        deltaBaseMinusHybrid: baselineMae - meanAbsoluteError(result.hybridErrors),
        selectedAlphaCounts: result.selectedAlphaCounts,
        foldStability: summarizeMaeFoldStability(result.foldMaeDeltas),
        hybridFoldStability: summarizeHybridMaeFoldStability(result.hybridFoldMaeDeltas),
        rankingQuality: result.rankingQuality
      };
    });

    const mae = meanAbsoluteError(ridgeErrors);
    const baselineMae = meanAbsoluteError(baselineErrors);
    const hybridMae = meanAbsoluteError(hybridErrors);
    return {
      available: true,
      sampleCount: sampleCount,
      repeats: foldSets.length,
      foldsPerRepeat: OUTER_FOLDS,
      foldsEvaluated: totalFolds,
      innerFolds: INNER_FOLDS,
      mae: mae,
      baselineMae: baselineMae,
      deltaBaseMinusRidge: baselineMae - mae,
      hybridMae: hybridMae,
      deltaBaseMinusHybrid: baselineMae - hybridMae,
      selectedAlphaCounts: selectedAlphaCounts,
      foldStability: summarizeMaeFoldStability(maeFoldDeltas),
      hybridFoldStability: summarizeHybridMaeFoldStability(hybridMaeFoldDeltas),
      rankingQuality: repeatedRanking,
      repeatSummaries: repeatSummaries,
      unavailableReason: null
    };
  }

  function summarizeAlphaSelectionComparison(foldSets, sampleCount, relevantCount) {
    const maeCounts = Object.create(null);
    const rankingCounts = Object.create(null);
    ALPHAS.forEach(function (alpha) {
      maeCounts[String(alpha)] = 0;
      rankingCounts[String(alpha)] = 0;
    });
    const maeSelectorErrors = [];
    const baselineErrors = [];
    const rankingSelectorErrors = [];
    const foldMaeDeltas = [];
    const foldSummaries = [];
    const rankingTotals = Object.create(null);
    RANKING_MODES.forEach(function (mode) {
      rankingTotals[mode] = {
        baselineDcg: 0, maeSelectedDcg: 0, rankingSelectedDcg: 0, idealDcg: 0, foldsEvaluated: 0,
        rankingSelectorWins: 0, rankingSelectorTies: 0, rankingSelectorLosses: 0,
        maeVsBaselineWins: 0, maeVsBaselineTies: 0, maeVsBaselineLosses: 0,
        rankingVsBaselineWins: 0, rankingVsBaselineTies: 0, rankingVsBaselineLosses: 0
      };
    });
    (foldSets || []).forEach(function (result) {
      Object.keys(result.selectedAlphaCounts || {}).forEach(function (alpha) {
        maeCounts[alpha] = (maeCounts[alpha] || 0) + (Number(result.selectedAlphaCounts[alpha]) || 0);
      });
      Object.keys(result.rankingSelectedAlphaCounts || {}).forEach(function (alpha) {
        rankingCounts[alpha] = (rankingCounts[alpha] || 0) + (Number(result.rankingSelectedAlphaCounts[alpha]) || 0);
      });
      (result.alphaComparisonMaeSelectorErrors || []).forEach(function (value) { maeSelectorErrors.push(value); });
      (result.alphaComparisonBaselineErrors || []).forEach(function (value) { baselineErrors.push(value); });
      (result.alphaComparisonRankingErrors || []).forEach(function (value) { rankingSelectorErrors.push(value); });
      (result.alphaComparisonFoldMaeDeltas || []).forEach(function (value) { foldMaeDeltas.push(value); });
      (result.alphaComparisonFoldSummaries || []).forEach(function (summary) { foldSummaries.push(summary); });
      RANKING_MODES.forEach(function (mode) {
        const source = result.rankingSelectionTotals && result.rankingSelectionTotals[mode];
        if (!source) return;
        const target = rankingTotals[mode];
        target.baselineDcg += source.baselineDcg || 0;
        target.maeSelectedDcg += source.maeSelectedDcg || 0;
        target.rankingSelectedDcg += source.rankingSelectedDcg || 0;
        target.idealDcg += source.idealDcg || 0;
        target.foldsEvaluated += source.foldsEvaluated || 0;
        target.rankingSelectorWins += source.rankingSelectorWins || 0;
        target.rankingSelectorTies += source.rankingSelectorTies || 0;
        target.rankingSelectorLosses += source.rankingSelectorLosses || 0;
        target.maeVsBaselineWins += source.maeVsBaselineWins || 0;
        target.maeVsBaselineTies += source.maeVsBaselineTies || 0;
        target.maeVsBaselineLosses += source.maeVsBaselineLosses || 0;
        target.rankingVsBaselineWins += source.rankingVsBaselineWins || 0;
        target.rankingVsBaselineTies += source.rankingVsBaselineTies || 0;
        target.rankingVsBaselineLosses += source.rankingVsBaselineLosses || 0;
      });
    });
    const pairedSelectionFoldsEvaluated = foldMaeDeltas.length;
    const selectionFoldsEvaluated = foldSummaries.length;
    const rankingSelectedFolds = foldSummaries.filter(function (summary) {
      return summary.selectedAlphaByRanking != null;
    }).length;
    const lowerBoundaryByMae = summarizeAlphaBoundary(maeCounts, selectionFoldsEvaluated, ALPHAS);
    const lowerBoundaryByRanking = summarizeAlphaBoundary(rankingCounts, rankingSelectedFolds, ALPHAS);
    let rankingSelectorMaeWins = 0;
    let ties = 0;
    let maeSelectorMaeWins = 0;
    foldMaeDeltas.forEach(function (delta) {
      if (delta < -1e-10) rankingSelectorMaeWins += 1;
      else if (delta > 1e-10) maeSelectorMaeWins += 1;
      else ties += 1;
    });
    const enoughForRanking = sampleCount >= MIN_RANKING_RECORDS && relevantCount >= MIN_RELEVANT_RECORDS &&
      pairedSelectionFoldsEvaluated >= Math.ceil(REPEATED_VALIDATION_RUNS * OUTER_FOLDS * 0.6);
    const rankingModes = RANKING_MODES.map(function (mode) {
      const total = rankingTotals[mode];
      const available = enoughForRanking && total.idealDcg > 0 && total.foldsEvaluated >= Math.ceil(REPEATED_VALIDATION_RUNS * OUTER_FOLDS * 0.6);
      return {
        mode: mode,
        available: available,
        baselineNdcgAt5: available ? total.baselineDcg / total.idealDcg : null,
        maeSelectedNdcgAt5: available ? total.maeSelectedDcg / total.idealDcg : null,
        rankingSelectedNdcgAt5: available ? total.rankingSelectedDcg / total.idealDcg : null,
        deltaRankingSelectionMinusMaeSelection: available
          ? (total.rankingSelectedDcg - total.maeSelectedDcg) / total.idealDcg : null,
        deltaMaeSelectionMinusBaseline: available
          ? (total.maeSelectedDcg - total.baselineDcg) / total.idealDcg : null,
        deltaRankingSelectionMinusBaseline: available
          ? (total.rankingSelectedDcg - total.baselineDcg) / total.idealDcg : null,
        foldsEvaluated: total.foldsEvaluated,
        rankingSelectorWins: total.rankingSelectorWins,
        ties: total.rankingSelectorTies,
        rankingSelectorLosses: total.rankingSelectorLosses,
        maeVsBaselineWins: total.maeVsBaselineWins,
        maeVsBaselineTies: total.maeVsBaselineTies,
        maeVsBaselineLosses: total.maeVsBaselineLosses,
        rankingVsBaselineWins: total.rankingVsBaselineWins,
        rankingVsBaselineTies: total.rankingVsBaselineTies,
        rankingVsBaselineLosses: total.rankingVsBaselineLosses
      };
    });
    const byRepeat = (foldSets || []).map(function (result) {
      const foldCount = (result.alphaComparisonFoldMaeDeltas || []).length;
      const repeatSelectionFoldCount = (result.alphaComparisonFoldSummaries || []).length;
      return {
        repeat: nonNegativeInteger(result.repetitionIndex) + 1,
        foldsEvaluated: repeatSelectionFoldCount,
        pairedSelectionFoldsEvaluated: foldCount,
        selectedAlphaCountsByMae: result.selectedAlphaCounts || {},
        selectedAlphaCountsByRanking: result.rankingSelectedAlphaCounts || {},
        maeSelectedMae: result.alphaComparisonMaeSelectorErrors && result.alphaComparisonMaeSelectorErrors.length
          ? meanAbsoluteError(result.alphaComparisonMaeSelectorErrors) : null,
        rankingSelectedMae: result.alphaComparisonRankingErrors && result.alphaComparisonRankingErrors.length
          ? meanAbsoluteError(result.alphaComparisonRankingErrors) : null,
        deltaRankingSelectionMinusMaeSelection: result.alphaComparisonRankingErrors && result.alphaComparisonRankingErrors.length
          ? meanAbsoluteError(result.alphaComparisonRankingErrors) - meanAbsoluteError(result.alphaComparisonMaeSelectorErrors) : null,
        rankingModes: RANKING_MODES.map(function (mode) {
          const total = result.rankingSelectionTotals && result.rankingSelectionTotals[mode] || {};
          const available = foldCount > 0 && Number(total.idealDcg) > 0 && Number(total.foldsEvaluated) > 0;
          return {
            mode: mode,
            available: available,
            baselineNdcgAt5: available ? total.baselineDcg / total.idealDcg : null,
            maeSelectedNdcgAt5: available ? total.maeSelectedDcg / total.idealDcg : null,
            rankingSelectedNdcgAt5: available ? total.rankingSelectedDcg / total.idealDcg : null,
            deltaMaeSelectionMinusBaseline: available
              ? (total.maeSelectedDcg - total.baselineDcg) / total.idealDcg : null,
            deltaRankingSelectionMinusBaseline: available
              ? (total.rankingSelectedDcg - total.baselineDcg) / total.idealDcg : null,
            deltaRankingSelectionMinusMaeSelection: available
              ? (total.rankingSelectedDcg - total.maeSelectedDcg) / total.idealDcg : null,
            foldsEvaluated: Number(total.foldsEvaluated) || 0,
            rankingSelectorWins: Number(total.rankingSelectorWins) || 0,
            ties: Number(total.rankingSelectorTies) || 0,
            rankingSelectorLosses: Number(total.rankingSelectorLosses) || 0,
            maeVsBaselineWins: Number(total.maeVsBaselineWins) || 0,
            maeVsBaselineTies: Number(total.maeVsBaselineTies) || 0,
            maeVsBaselineLosses: Number(total.maeVsBaselineLosses) || 0,
            rankingVsBaselineWins: Number(total.rankingVsBaselineWins) || 0,
            rankingVsBaselineTies: Number(total.rankingVsBaselineTies) || 0,
            rankingVsBaselineLosses: Number(total.rankingVsBaselineLosses) || 0
          };
        })
      };
    });
    const comparisonAvailable = enoughForRanking && rankingSelectorErrors.length > 0 && maeSelectorErrors.length === rankingSelectorErrors.length;
    return {
      available: comparisonAvailable,
      sampleCount: sampleCount,
      selectionFoldsEvaluated: selectionFoldsEvaluated,
      pairedSelectionFoldsEvaluated: pairedSelectionFoldsEvaluated,
      outerFoldsPlanned: REPEATED_VALIDATION_RUNS * OUTER_FOLDS,
      innerFolds: INNER_FOLDS,
      alphaGrid: ALPHAS.slice(),
      selectionCriteria: {
        mae: "Menor MAE medio en validación interna del entrenamiento exterior.",
        ranking: "Mayor nDCG@5 medio en validación interna entre modos disponibles con relevancia >= 7; mínimo de 50 películas, 10 relevantes y dos pliegues internos válidos; sin acceso a notas exteriores."
      },
      selectedAlphaCountsByMae: maeCounts,
      selectedAlphaCountsByRanking: rankingCounts,
      lowerBoundary: {
        mae: lowerBoundaryByMae,
        ranking: lowerBoundaryByRanking,
        unresolved: lowerBoundaryByMae.unresolved || lowerBoundaryByRanking.unresolved
      },
      foldSummaries: foldSummaries,
      maeSelected: {
        available: comparisonAvailable,
        mae: comparisonAvailable ? meanAbsoluteError(maeSelectorErrors) : null,
        baselineMaeSameFolds: comparisonAvailable ? meanAbsoluteError(baselineErrors) : null,
        deltaBaselineMinusMaeSelected: comparisonAvailable ? meanAbsoluteError(baselineErrors) - meanAbsoluteError(maeSelectorErrors) : null
      },
      rankingSelected: {
        available: comparisonAvailable,
        mae: comparisonAvailable ? meanAbsoluteError(rankingSelectorErrors) : null,
        baselineMaeSameFolds: comparisonAvailable ? meanAbsoluteError(baselineErrors) : null,
        deltaBaselineMinusRankingSelected: comparisonAvailable ? meanAbsoluteError(baselineErrors) - meanAbsoluteError(rankingSelectorErrors) : null
      },
      pairedMaeDifference: {
        available: comparisonAvailable,
        deltaRankingSelectionMinusMaeSelection: comparisonAvailable
          ? meanAbsoluteError(rankingSelectorErrors) - meanAbsoluteError(maeSelectorErrors) : null,
        rankingSelectionMaeWins: comparisonAvailable ? rankingSelectorMaeWins : 0,
        ties: comparisonAvailable ? ties : 0,
        maeSelectionMaeWins: comparisonAvailable ? maeSelectorMaeWins : 0,
        foldsEvaluated: pairedSelectionFoldsEvaluated
      },
      rankingModes: rankingModes,
      repeatSummaries: byRepeat,
      unavailableReason: comparisonAvailable ? null :
        "La selección interna por ranking requiere al menos 50 películas únicas, 10 relevantes y suficientes pliegues con nDCG disponible; se conserva la evaluación por MAE."
    };
  }

  function completedEvaluation(rows, repeatedRuns, relevantCount) {
    const primary = repeatedRuns[0];
    const mae = meanAbsoluteError(primary.ridgeErrors);
    const baselineMae = meanAbsoluteError(primary.baselineErrors);
    const hybridMae = meanAbsoluteError(primary.hybridErrors);
    return {
      available: true,
      count: rows.length,
      mae: mae,
      baselineMae: baselineMae,
      deltaBaseMinusRidge: baselineMae - mae,
      hybridMae: hybridMae,
      deltaBaseMinusHybrid: baselineMae - hybridMae,
      outerFolds: OUTER_FOLDS,
      foldsEvaluated: primary.outerFoldsEvaluated,
      innerFolds: INNER_FOLDS,
      alphaGrid: ALPHAS.slice(),
      selectedAlphaCounts: primary.selectedAlphaCounts,
      predictionMin: primary.predictionMin,
      predictionMax: primary.predictionMax,
      foldStability: summarizeMaeFoldStability(primary.foldMaeDeltas),
      hybridFoldStability: summarizeHybridMaeFoldStability(primary.hybridFoldMaeDeltas),
      rankingQuality: primary.rankingQuality,
      repeatedValidation: summarizeRepeatedValidation(repeatedRuns, rows.length, relevantCount),
      alphaSelectionComparison: summarizeAlphaSelectionComparison(repeatedRuns, rows.length, relevantCount),
      reason: null
    };
  }

  function unavailableEvaluation(rows, relevantCount) {
    const reason = "No se pudo resolver la evaluación Ridge de forma estable con esta muestra.";
    return unavailableResult(rows.length, reason,
      unavailableRankingQuality(rows.length, relevantCount,
        "La comparación Ridge de ranking no se completó porque el ajuste no terminó."),
      relevantCount);
  }

  function evaluate() {
    const rows = mappedRows();
    const relevantCount = rows.filter(function (row) { return row.rating >= RELEVANT_RATING_THRESHOLD; }).length;
    if (rows.length < MIN_RECORDS) {
      const reason = "Se necesitan al menos " + MIN_RECORDS + " películas únicas valoradas con características.";
      return unavailableResult(rows.length, reason, unavailableRankingQuality(rows.length, relevantCount), relevantCount);
    }
    try {
      const kernel = buildKernel(rows);
      const indices = rows.map(function (_, index) { return index; });
      const repeatedRuns = [];
      for (let repetitionIndex = 0; repetitionIndex < REPEATED_VALIDATION_RUNS; repetitionIndex += 1) {
        repeatedRuns.push(evaluateFoldSet(rows, kernel, indices, repetitionIndex, relevantCount));
      }
      return completedEvaluation(rows, repeatedRuns, relevantCount);
    } catch (_) {
      return unavailableEvaluation(rows, relevantCount);
    }
  }

  async function evaluateAsync(onProgress, options) {
    const callback = typeof onProgress === "function" ? onProgress :
      (onProgress && typeof onProgress.onProgress === "function" ? onProgress.onProgress : function () {});
    const settings = options || (onProgress && typeof onProgress === "object" ? onProgress : {});
    const externalShouldContinue = typeof settings.shouldContinue === "function" ? settings.shouldContinue : function () { return true; };
    let callbackCancelled = false;
    const emitProgress = function (update) {
      const keepGoing = callback(update);
      if (keepGoing === false) callbackCancelled = true;
      return keepGoing;
    };
    const shouldContinue = function () { return !callbackCancelled && externalShouldContinue(); };
    const abortedResult = function () {
      if (!externalShouldContinue()) return null;
      if (!callbackCancelled) return null;
      const reason = "La evaluación Ridge se canceló porque se invalidó la ejecución solicitada.";
      return unavailableResult(rows.length, reason,
        unavailableRankingQuality(rows.length, relevantCount, reason), relevantCount);
    };
    const yieldToBrowser = typeof settings.yieldToBrowser === "function"
      ? settings.yieldToBrowser
      : function () { return new Promise(function (resolve) { setTimeout(resolve, 0); }); };
    const batchSize = Math.max(8, Math.min(64, Number(settings.batchSize) || 48));
    const rows = mappedRows();
    const relevantCount = rows.filter(function (row) { return row.rating >= RELEVANT_RATING_THRESHOLD; }).length;
    if (rows.length < MIN_RECORDS) {
      const reason = "Se necesitan al menos " + MIN_RECORDS + " películas únicas valoradas con características.";
      return unavailableResult(rows.length, reason, unavailableRankingQuality(rows.length, relevantCount), relevantCount);
    }
    if (!shouldContinue()) return null;
    const fitWork = REPEATED_VALIDATION_RUNS * OUTER_FOLDS * (ALPHAS.length * INNER_FOLDS + 2);
    const kernelWork = Math.max(1, rows.length);
    const totalWork = kernelWork + fitWork;
    let completedWork = 0;
    const canContinue = function () { return shouldContinue(); };
    const reportWork = function (detail) {
      emitProgress({
        completedWork: completedWork,
        totalWork: totalWork,
        completedRepeats: Math.min(REPEATED_VALIDATION_RUNS, Math.floor(Math.max(0, completedWork - kernelWork) / (OUTER_FOLDS * (ALPHAS.length * INNER_FOLDS + 1)))),
        totalRepeats: REPEATED_VALIDATION_RUNS,
        foldsPerRepeat: OUTER_FOLDS,
        phase: "fold",
        detail: detail || "Validación Ridge anidada"
      });
      return canContinue();
    };
    const control = {
      shouldContinue: canContinue,
      yieldToBrowser: yieldToBrowser,
      batchSize: batchSize,
      totalWork: totalWork,
      completedWork: function () { return completedWork; },
      onModelFit: function (detail) {
        completedWork = Math.min(totalWork, completedWork + 1);
        reportWork(detail && detail.stage === "inner" ? "Selección interna de alpha · " + detail.alpha : "Ajuste Ridge externo");
      },
      onOuterFoldCompleted: function (detail) {
        reportWork("Pliegue externo " + (detail.outerFold + 1) + " de " + OUTER_FOLDS +
          " · repetición " + (detail.repetitionIndex + 1) + " de " + REPEATED_VALIDATION_RUNS);
      }
    };
    try {
      const kernel = await buildKernelAsync(rows, {
        shouldContinue: canContinue,
        yieldToBrowser: yieldToBrowser,
        onProgress: function (update) {
          completedWork = Math.max(completedWork, Number(update.completedWork) || 0);
          emitProgress({
            completedWork: completedWork,
            totalWork: totalWork,
            completedRepeats: 0,
            totalRepeats: REPEATED_VALIDATION_RUNS,
            foldsPerRepeat: OUTER_FOLDS,
            phase: "kernel",
            detail: "Construyendo matriz de similitud " + update.completedWork + "/" + update.totalWork
          });
        }
      });
      if (!canContinue()) return abortedResult();
      const indices = rows.map(function (_, index) { return index; });
      const repeatedRuns = [];
      for (let repetitionIndex = 0; repetitionIndex < REPEATED_VALIDATION_RUNS; repetitionIndex += 1) {
        if (!canContinue()) return abortedResult();
        const run = await evaluateFoldSetAsync(rows, kernel, indices, repetitionIndex, relevantCount, control);
        if (!run || !canContinue()) return abortedResult();
        repeatedRuns.push(run);
        emitProgress({
          completedWork: completedWork,
          totalWork: totalWork,
          completedRepeats: repetitionIndex + 1,
          totalRepeats: REPEATED_VALIDATION_RUNS,
          foldsPerRepeat: OUTER_FOLDS,
          phase: "completed"
        });
        await yieldToBrowser();
      }
      return completedEvaluation(rows, repeatedRuns, relevantCount);
    } catch (error) {
      if (!canContinue()) return abortedResult();
      return unavailableEvaluation(rows, relevantCount);
    }
  }

  function collectionAddedAtProxyEnabled() {
    return typeof dependencies.getUseCollectionAddedAtProxy === "function" &&
      Boolean(dependencies.getUseCollectionAddedAtProxy());
  }

  function temporalDateSourceMode() {
    return collectionAddedAtProxyEnabled() ? "collection-added-proxy" : "watchedAt-only";
  }

  function temporalRows() {
    const baseRows = mappedRows();
    const watchedDayByIdentity = new Map();
    const useCollectionAddedAtProxy = collectionAddedAtProxyEnabled();
    const isExplicitDate = function (entry) {
      return Boolean(entry && (entry.watchedAtSource === "imported-explicit" ||
        entry.watchedAtSource === "user-confirmed") && watchedDayFor(entry));
    };
    (typeof getWatched === "function" ? getWatched() || [] : []).forEach(function (entry) {
      if (!entry || !entry.title) return;
      const movie = findMovie(entry.title, entry.tmdbId || entry.tmId, entry.year || entry.releaseYear || entry.release_year);
      const identity = identityFor(entry, movie, dependencies);
      if (!identity) return;
      const previous = watchedDayByIdentity.get(identity) || null;
      const preStreakUnverified = entry.watchDateConfidence === "pre-streak-unverified" &&
        entry.watchedAtSource !== "user-confirmed";
      if (preStreakUnverified) {
        if (!previous) {
          watchedDayByIdentity.set(identity, { day: null, explicitDay: null, preStreakUnverified: true });
        } else if (!previous.explicitDay) {
          previous.preStreakUnverified = true;
        }
        return;
      }
      const watchedDay = watchedDayFor(entry);
      const explicit = isExplicitDate(entry);
      const addedProxyDay = useCollectionAddedAtProxy && !explicit ? collectionAddedDayFor(entry) : null;
      const day = explicit ? watchedDay : (addedProxyDay || watchedDay);
      if (!day) return;
      const explicitDay = explicit ? watchedDay : null;
      if (!previous) {
        watchedDayByIdentity.set(identity, { day: day, explicitDay: explicitDay, preStreakUnverified: false });
      } else {
        if (day < previous.day || !previous.day) previous.day = day;
        if (explicitDay && (!previous.explicitDay || explicitDay < previous.explicitDay)) {
          previous.explicitDay = explicitDay;
          previous.preStreakUnverified = false;
        }
      }
    });

    const rows = [];
    let missingDateCount = 0;
    let explicitDateCount = 0;
    let unverifiedDateCount = 0;
    baseRows.forEach(function (row) {
      const entryDay = watchedDayFor(row.entry);
      const entryIsExplicit = isExplicitDate(row.entry);
      const history = watchedDayByIdentity.get(row.identity) || null;
      if (history && history.preStreakUnverified && row.entry.watchedAtSource !== "user-confirmed") {
        missingDateCount += 1;
        return;
      }
      let day = null;
      let dateProvenance = "missing";
      if (entryDay && entryIsExplicit) {
        day = entryDay;
        dateProvenance = "explicit";
      } else if (history && history.explicitDay) {
        day = history.explicitDay;
        dateProvenance = "explicit";
      } else if (useCollectionAddedAtProxy && history && history.day) {
        day = history.day;
        dateProvenance = "unverified";
      } else if (!requireExplicitTemporalDates && entryDay) {
        day = entryDay;
        dateProvenance = "unverified";
      } else if (!requireExplicitTemporalDates && history && history.day) {
        day = history.day;
        dateProvenance = "unverified";
      }
      if (!day) {
        missingDateCount += 1;
        return;
      }
      if (dateProvenance === "explicit") explicitDateCount += 1;
      else unverifiedDateCount += 1;
      rows.push(Object.assign({}, row, {
        watchedDay: day,
        dateProvenance: dateProvenance
      }));
    });
    rows.sort(function (left, right) {
      return left.watchedDay.localeCompare(right.watchedDay) ||
        left.identity.localeCompare(right.identity);
    });
    return {
      rows: rows,
      featureRowCount: baseRows.length,
      missingDateCount: missingDateCount,
      explicitDateCount: explicitDateCount,
      unverifiedDateCount: unverifiedDateCount,
      dateSourceMode: useCollectionAddedAtProxy ? "collection-added-proxy" : "watchedAt-only"
    };
  }

  function unavailableTemporalEvaluation(featureRowCount, datedRowCount, missingDateCount, reason, dayGroupCount, explicitDateCount, unverifiedDateCount) {
    const unavailableReason = reason || "La evaluación temporal no está disponible.";
    return {
      available: false,
      sampleCount: nonNegativeInteger(datedRowCount),
      featureRowCount: nonNegativeInteger(featureRowCount),
      timestampedFeatureCount: nonNegativeInteger(datedRowCount),
      explicitDateCount: nonNegativeInteger(explicitDateCount),
      unverifiedDateCount: nonNegativeInteger(unverifiedDateCount),
      dateProvenanceStatus: nonNegativeInteger(unverifiedDateCount) > 0 ? "exploratory" :
        (nonNegativeInteger(datedRowCount) > 0 ? "explicit" : "unavailable"),
      dateSourceMode: temporalDateSourceMode(),
      temporalTimezone: PANAMA_TIME_ZONE,
      missingDateCount: nonNegativeInteger(missingDateCount),
      distinctDayCount: nonNegativeInteger(dayGroupCount),
      warmupCount: 0,
      testCount: 0,
      windowsPlanned: TEMPORAL_OUTER_WINDOWS,
      windowsEvaluated: 0,
      innerWindows: INNER_FOLDS,
      alphaGrid: ALPHAS.slice(),
      selectedAlphaCounts: {},
      mae: null,
      baselineMae: null,
      deltaBaseMinusRidge: null,
      windowStability: {
        available: false, windowsEvaluated: 0, ridgeMaeWins: 0, ties: 0, baselineMaeWins: 0
      },
      rankingQuality: unavailableRankingQuality(0, 0, unavailableReason, TEMPORAL_OUTER_WINDOWS),
      windowSummaries: [],
      unavailableReason: unavailableReason
    };
  }

  function selectTemporalAlpha(rows, kernel, outerTrainingIndices) {
    const inner = forwardValidationWindows(rows, outerTrainingIndices, INNER_FOLDS, TEMPORAL_WARMUP_RATIO);
    if (!inner) throw new Error("No hay suficientes días anteriores para seleccionar alpha con validación temporal interna.");
    const candidates = [];
    ALPHAS.forEach(function (alpha) {
      const errors = [];
      inner.windows.forEach(function (window) {
        const model = trainRidge(rows, kernel, window.trainingIndices, alpha);
        window.testIndices.forEach(function (index) {
          const prediction = predictRidge(rows, model, rows[index].candidateVector);
          errors.push(Math.abs(prediction - rows[index].rating));
        });
      });
      if (!errors.length) throw new Error("No hay ventanas internas válidas para seleccionar alpha.");
      candidates.push({ alpha: alpha, score: meanAbsoluteError(errors) });
    });
    const bestAlpha = selectAlphaByMae(candidates);
    if (bestAlpha == null) throw new Error("No se pudo seleccionar alpha en el pasado del entrenamiento.");
    return bestAlpha;
  }

  async function selectTemporalAlphaAsync(rows, kernel, outerTrainingIndices, control) {
    const inner = forwardValidationWindows(rows, outerTrainingIndices, INNER_FOLDS, TEMPORAL_WARMUP_RATIO);
    if (!inner) throw new Error("No hay suficientes días anteriores para seleccionar alpha con validación temporal interna.");
    const candidates = [];
    for (let alphaIndex = 0; alphaIndex < ALPHAS.length; alphaIndex += 1) {
      if (!control.shouldContinue()) return null;
      const alpha = ALPHAS[alphaIndex];
      const errors = [];
      for (let innerIndex = 0; innerIndex < inner.windows.length; innerIndex += 1) {
        if (!control.shouldContinue()) return null;
        const innerWindow = inner.windows[innerIndex];
        const model = await trainRidgeAsync(rows, kernel, innerWindow.trainingIndices, alpha, {
          shouldContinue: control.shouldContinue,
          yieldToBrowser: control.yieldToBrowser,
          batchSize: control.batchSize
        });
        if (!model) return null;
        for (let index = 0; index < innerWindow.testIndices.length; index += 1) {
          const rowIndex = innerWindow.testIndices[index];
          const prediction = predictRidge(rows, model, rows[rowIndex].candidateVector);
          errors.push(Math.abs(prediction - rows[rowIndex].rating));
        }
        control.onModelFit({ stage: "inner", alpha: alpha, innerWindow: innerIndex });
        await control.yieldToBrowser();
      }
      if (!errors.length) throw new Error("No hay ventanas internas válidas para seleccionar alpha.");
      candidates.push({ alpha: alpha, score: meanAbsoluteError(errors) });
    }
    const bestAlpha = selectAlphaByMae(candidates);
    if (bestAlpha == null) throw new Error("No se pudo seleccionar alpha en el pasado del entrenamiento.");
    return bestAlpha;
  }

  async function evaluateTemporalAsync(onProgress, options) {
    const callback = typeof onProgress === "function" ? onProgress :
      (onProgress && typeof onProgress.onProgress === "function" ? onProgress.onProgress : function () {});
    const settings = options || (onProgress && typeof onProgress === "object" ? onProgress : {});
    const externalShouldContinue = typeof settings.shouldContinue === "function" ? settings.shouldContinue : function () { return true; };
    let callbackCancelled = false;
    const emitProgress = function (update) {
      const keepGoing = callback(update);
      if (keepGoing === false) callbackCancelled = true;
      return keepGoing;
    };
    const shouldContinue = function () { return !callbackCancelled && externalShouldContinue(); };
    const yieldToBrowser = typeof settings.yieldToBrowser === "function"
      ? settings.yieldToBrowser
      : function () { return new Promise(function (resolve) { setTimeout(resolve, 0); }); };
    const batchSize = Math.max(8, Math.min(64, Number(settings.batchSize) || 48));
    const prepared = temporalRows();
    const rows = prepared.rows;
    const allIndices = rows.map(function (_, index) { return index; });
    const groups = groupIndicesByWatchedDay(rows, allIndices);
    const abortedResult = function () {
      if (!externalShouldContinue() || !callbackCancelled) return null;
      return unavailableTemporalEvaluation(
        prepared.featureRowCount,
        rows.length,
        prepared.missingDateCount,
        "La evaluación temporal se canceló porque se detuvo el proceso durante la ejecución.",
        groups.length,
        prepared.explicitDateCount,
        prepared.unverifiedDateCount
      );
    };
    if (rows.length < TEMPORAL_MIN_RECORDS) {
      return unavailableTemporalEvaluation(prepared.featureRowCount, rows.length, prepared.missingDateCount,
        "Se necesitan al menos " + TEMPORAL_MIN_RECORDS +
          " valoraciones únicas con características y fecha de visionado válida; hay " + rows.length + ".",
        groups.length, prepared.explicitDateCount, prepared.unverifiedDateCount);
    }
    if (groups.length < TEMPORAL_MIN_DATE_GROUPS) {
      return unavailableTemporalEvaluation(prepared.featureRowCount, rows.length, prepared.missingDateCount,
        "Se necesitan al menos " + TEMPORAL_MIN_DATE_GROUPS +
          " días de visionado distintos para formar ventanas temporales fiables; hay " + groups.length + ".",
        groups.length, prepared.explicitDateCount, prepared.unverifiedDateCount);
    }

    const schedule = forwardValidationWindows(rows, allIndices, TEMPORAL_OUTER_WINDOWS, TEMPORAL_WARMUP_RATIO);
    if (!schedule) {
      return unavailableTemporalEvaluation(prepared.featureRowCount, rows.length, prepared.missingDateCount,
        "No hay suficientes bloques cronológicos para ejecutar las cinco ventanas futuras.",
        groups.length, prepared.explicitDateCount, prepared.unverifiedDateCount);
    }

    try {
      const workPerWindow = ALPHAS.length * INNER_FOLDS + 1;
      const kernelWork = Math.max(1, rows.length);
      const totalWork = kernelWork + TEMPORAL_OUTER_WINDOWS * workPerWindow;
      let completedWork = 0;
      const control = {
        shouldContinue: shouldContinue,
        yieldToBrowser: yieldToBrowser,
        batchSize: batchSize,
        onModelFit: function (detail) {
          completedWork = Math.min(totalWork, completedWork + 1);
          emitProgress({
            completedWork: completedWork,
            totalWork: totalWork,
            completedWindows: Math.min(TEMPORAL_OUTER_WINDOWS, Math.floor(Math.max(0, completedWork - kernelWork) / workPerWindow)),
            totalWindows: TEMPORAL_OUTER_WINDOWS,
            phase: "fit",
            detail: detail && detail.stage === "inner" ? "Selección interna de alpha" : "Ajuste Ridge temporal"
          });
        }
      };
      if (!shouldContinue()) return abortedResult();
      const kernel = await buildKernelAsync(rows, {
        shouldContinue: shouldContinue,
        yieldToBrowser: yieldToBrowser,
        onProgress: function (update) {
          completedWork = Math.max(completedWork, Number(update.completedWork) || 0);
          emitProgress({
            completedWork: completedWork,
            totalWork: totalWork,
            completedWindows: 0,
            totalWindows: TEMPORAL_OUTER_WINDOWS,
            phase: "kernel",
            detail: "Matriz temporal " + update.completedWork + "/" + update.totalWork
          });
        }
      });
      if (!shouldContinue()) return abortedResult();
      const ridgeErrors = [];
      const baselineErrors = [];
      const windowMaeDeltas = [];
      const selectedAlphaCounts = Object.create(null);
      ALPHAS.forEach(function (alpha) { selectedAlphaCounts[String(alpha)] = 0; });
      const rankingTotals = Object.create(null);
      RANKING_MODES.forEach(function (mode) {
        rankingTotals[mode] = {
          baselineDcg: 0, ridgeDcg: 0, idealDcg: 0, foldsEvaluated: 0,
          foldsRidgeWins: 0, foldsRidgeTies: 0, foldsRidgeLosses: 0
        };
      });
      const windowSummaries = [];
      let predictionMin = Infinity;
      let predictionMax = -Infinity;
      const testIndicesAll = [];

      for (let windowIndex = 0; windowIndex < schedule.windows.length; windowIndex += 1) {
        const window = schedule.windows[windowIndex];
        const starting = {
          completedWindows: windowIndex,
          totalWindows: TEMPORAL_OUTER_WINDOWS,
          windowsPlanned: TEMPORAL_OUTER_WINDOWS,
          phase: "starting"
        };
        starting.completedWork = completedWork;
        starting.totalWork = totalWork;
        if (emitProgress(starting) === false || !shouldContinue()) return abortedResult();

        const alpha = await selectTemporalAlphaAsync(rows, kernel, window.trainingIndices, control);
        if (alpha == null || !shouldContinue()) return abortedResult();
        selectedAlphaCounts[String(alpha)] += 1;
        const ridgeModel = await trainRidgeAsync(rows, kernel, window.trainingIndices, alpha, {
          shouldContinue: shouldContinue,
          yieldToBrowser: yieldToBrowser,
          batchSize: batchSize
        });
        if (!ridgeModel || !shouldContinue()) return abortedResult();
        control.onModelFit({ stage: "outer", windowIndex: windowIndex });
        const trainingRatings = window.trainingIndices.map(function (index) { return rows[index].entry; });
        const additiveProfile = buildProfile(trainingRatings);
        const baselineCandidates = [];
        const ridgeCandidates = [];
        const gains = new Map();
        const ridgeWindowErrors = [];
        const baselineWindowErrors = [];

        window.testIndices.forEach(function (index, position) {
          const row = rows[index];
          const ridgePrediction = predictRidge(rows, ridgeModel, row.trainingVector);
          const additiveResult = predictRating(row.candidate, additiveProfile);
          const baselinePrediction = clampRating(Number.isFinite(additiveResult && additiveResult.score)
            ? additiveResult.score : additiveProfile.average);
          const ridgeError = Math.abs(ridgePrediction - row.rating);
          const baselineError = Math.abs(baselinePrediction - row.rating);
          ridgeErrors.push(ridgeError);
          baselineErrors.push(baselineError);
          ridgeWindowErrors.push(ridgeError);
          baselineWindowErrors.push(baselineError);
          testIndicesAll.push(index);
          predictionMin = Math.min(predictionMin, ridgePrediction);
          predictionMax = Math.max(predictionMax, ridgePrediction);
          const token = "window-" + windowIndex + "-candidate-" + position;
          const baselineCandidate = Object.assign({}, additiveResult || {}, { score: baselinePrediction });
          const ridgeCandidate = Object.assign({}, additiveResult || {}, { score: ridgePrediction });
          baselineCandidates.push(rankingCandidate(row, baselineCandidate, baselinePrediction, token));
          ridgeCandidates.push(rankingCandidate(row, ridgeCandidate, ridgePrediction, token));
          gains.set(token, relevanceGain(row.rating));
        });

        const ridgeMae = meanAbsoluteError(ridgeWindowErrors);
        const baselineMae = meanAbsoluteError(baselineWindowErrors);
        const deltaBaseMinusRidge = baselineMae - ridgeMae;
        windowMaeDeltas.push(deltaBaseMinusRidge);
        let windowRankingAvailable = false;
        const ideal = window.testIndices.map(function (_, position) {
          const token = "window-" + windowIndex + "-candidate-" + position;
          return { gain: gains.get(token) || 0, token: token };
        }).sort(function (left, right) {
          return right.gain - left.gain || left.token.localeCompare(right.token);
        });
        const idealDcg = dcgAt5(ideal);
        if (idealDcg > 0) {
          windowRankingAvailable = true;
          RANKING_MODES.forEach(function (mode) {
            const baselineTop = rankRows(baselineCandidates, mode);
            const ridgeTop = rankRows(ridgeCandidates, mode);
            const baselineDcg = dcgAt5(baselineTop.map(function (candidate) {
              return { gain: gains.get(candidate.evaluationToken) || 0 };
            }));
            const ridgeDcg = dcgAt5(ridgeTop.map(function (candidate) {
              return { gain: gains.get(candidate.evaluationToken) || 0 };
            }));
            const foldDelta = (ridgeDcg - baselineDcg) / idealDcg;
            if (foldDelta > 1e-10) rankingTotals[mode].foldsRidgeWins += 1;
            else if (foldDelta < -1e-10) rankingTotals[mode].foldsRidgeLosses += 1;
            else rankingTotals[mode].foldsRidgeTies += 1;
            rankingTotals[mode].baselineDcg += baselineDcg;
            rankingTotals[mode].ridgeDcg += ridgeDcg;
            rankingTotals[mode].idealDcg += idealDcg;
            rankingTotals[mode].foldsEvaluated += 1;
          });
        }
        windowSummaries.push({
          window: windowIndex + 1,
          trainingCount: window.trainingIndices.length,
          testCount: window.testIndices.length,
          selectedAlpha: alpha,
          mae: ridgeMae,
          baselineMae: baselineMae,
          deltaBaseMinusRidge: deltaBaseMinusRidge,
          rankingAvailable: windowRankingAvailable
        });
        const shouldKeepGoing = emitProgress({
          completedWindows: windowIndex + 1,
          totalWindows: TEMPORAL_OUTER_WINDOWS,
          windowsPlanned: TEMPORAL_OUTER_WINDOWS,
          completedWork: completedWork,
          totalWork: totalWork,
          phase: "completed"
        });
        if (shouldKeepGoing === false || !shouldContinue()) return abortedResult();
        if (windowIndex + 1 < schedule.windows.length) await yieldToBrowser();
      }

      const testCount = testIndicesAll.length;
      const relevantTestCount = testIndicesAll.filter(function (index) {
        return rows[index].rating >= RELEVANT_RATING_THRESHOLD;
      }).length;
      const rankingQuality = testCount >= MIN_RANKING_RECORDS && relevantTestCount >= MIN_RELEVANT_RECORDS
        ? completeRankingQuality(testCount, relevantTestCount, rankingTotals, TEMPORAL_OUTER_WINDOWS)
        : unavailableRankingQuality(testCount, relevantTestCount,
          null, TEMPORAL_OUTER_WINDOWS);
      const stability = summarizeMaeFoldStability(windowMaeDeltas);
      return {
        available: true,
        sampleCount: rows.length,
        featureRowCount: prepared.featureRowCount,
        timestampedFeatureCount: rows.length,
        explicitDateCount: prepared.explicitDateCount,
        unverifiedDateCount: prepared.unverifiedDateCount,
        dateProvenanceStatus: prepared.unverifiedDateCount > 0 ? "exploratory" : "explicit",
        dateSourceMode: prepared.dateSourceMode,
        temporalTimezone: PANAMA_TIME_ZONE,
        missingDateCount: prepared.missingDateCount,
        distinctDayCount: groups.length,
        warmupCount: schedule.warmupIndices.length,
        testCount: testCount,
        windowsPlanned: TEMPORAL_OUTER_WINDOWS,
        windowsEvaluated: windowSummaries.length,
        innerWindows: INNER_FOLDS,
        alphaGrid: ALPHAS.slice(),
        selectedAlphaCounts: selectedAlphaCounts,
        mae: meanAbsoluteError(ridgeErrors),
        baselineMae: meanAbsoluteError(baselineErrors),
        deltaBaseMinusRidge: meanAbsoluteError(baselineErrors) - meanAbsoluteError(ridgeErrors),
        predictionMin: predictionMin,
        predictionMax: predictionMax,
        windowStability: {
          available: stability.available,
          windowsEvaluated: stability.foldsEvaluated,
          ridgeMaeWins: stability.ridgeMaeWins,
          ties: stability.ties,
          baselineMaeWins: stability.baselineMaeWins
        },
        rankingQuality: rankingQuality,
        windowSummaries: windowSummaries,
        unavailableReason: null
      };
    } catch (_) {
      return unavailableTemporalEvaluation(prepared.featureRowCount, rows.length, prepared.missingDateCount,
        "No se pudo resolver la evaluación temporal de forma estable con estas fechas y esta muestra.",
        groups.length, prepared.explicitDateCount, prepared.unverifiedDateCount);
    }
  }

  return { evaluate: evaluate, evaluateAsync: evaluateAsync, evaluateTemporalAsync: evaluateTemporalAsync };
}
