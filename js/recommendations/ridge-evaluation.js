const OUTER_FOLDS = 5;
const INNER_FOLDS = 3;
const REPEATED_VALIDATION_RUNS = 3;
const MIN_RECORDS = 30;
const MIN_RANKING_RECORDS = 50;
const MIN_RELEVANT_RECORDS = 10;
const RELEVANT_RATING_THRESHOLD = 7;
const RANKING_CUTOFF = 5;
const RANKING_MODES = Object.freeze(["balanced", "affinity", "variety"]);
const ALPHAS = Object.freeze([0.1, 1, 10, 100]);
const FAMILY_SCALES = Object.freeze({ genre: 1, theme: 0.35, decade: 0.2 });

function clampRating(value) {
  return Math.max(1, Math.min(10, value));
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

function featureScale(feature) {
  if (feature.indexOf("tema: ") === 0) return FAMILY_SCALES.theme;
  if (feature.indexOf("década: ") === 0) return FAMILY_SCALES.decade;
  return FAMILY_SCALES.genre;
}

function vectorize(features) {
  const vector = new Map();
  (features || []).forEach(function (feature) {
    const name = String(feature || "");
    if (!name) return;
    vector.set(name, featureScale(name));
  });
  return vector;
}

function dot(left, right) {
  let sum = 0;
  const [small, large] = left.size <= right.size ? [left, right] : [right, left];
  small.forEach(function (value, name) {
    const other = large.get(name);
    if (other != null) sum += value * other;
  });
  return sum;
}

function buildKernel(rows) {
  const kernel = Array.from({ length: rows.length }, function () {
    return new Float64Array(rows.length);
  });
  for (let left = 0; left < rows.length; left += 1) {
    for (let right = 0; right <= left; right += 1) {
      const value = dot(rows[left].trainingVector, rows[right].trainingVector);
      kernel[left][right] = value;
      kernel[right][left] = value;
    }
  }
  return kernel;
}

function solveCholesky(matrix, target) {
  const size = target.length;
  const lower = Array.from({ length: size }, function () { return new Float64Array(size); });
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let value = matrix[row][column];
      for (let previous = 0; previous < column; previous += 1) {
        value -= lower[row][previous] * lower[column][previous];
      }
      if (row === column) {
        if (!Number.isFinite(value) || value <= 1e-12) {
          throw new Error("Matriz no definida positiva");
        }
        lower[row][column] = Math.sqrt(value);
      } else {
        const diagonal = lower[column][column];
        if (!diagonal || !Number.isFinite(diagonal)) throw new Error("Factorización inestable");
        lower[row][column] = value / diagonal;
      }
    }
  }

  const intermediate = new Float64Array(size);
  for (let row = 0; row < size; row += 1) {
    let value = target[row];
    for (let column = 0; column < row; column += 1) {
      value -= lower[row][column] * intermediate[column];
    }
    intermediate[row] = value / lower[row][row];
  }

  const solution = new Float64Array(size);
  for (let row = size - 1; row >= 0; row -= 1) {
    let value = intermediate[row];
    for (let column = row + 1; column < size; column += 1) {
      value -= lower[column][row] * solution[column];
    }
    solution[row] = value / lower[row][row];
    if (!Number.isFinite(solution[row])) throw new Error("Solución no finita");
  }
  return solution;
}

function trainRidge(rows, kernel, trainIndices, alpha) {
  if (!trainIndices.length || !Number.isFinite(alpha) || alpha <= 0) {
    throw new Error("Parámetros de entrenamiento inválidos");
  }
  const size = trainIndices.length;
  const rowMeans = new Float64Array(size);
  let grandMean = 0;
  let targetMean = 0;

  for (let i = 0; i < size; i += 1) {
    const index = trainIndices[i];
    let rowSum = 0;
    for (let j = 0; j < size; j += 1) {
      rowSum += kernel[index][trainIndices[j]];
    }
    rowMeans[i] = rowSum / size;
    grandMean += rowMeans[i];
    targetMean += rows[index].rating;
  }
  grandMean /= size;
  targetMean /= size;

  const centered = Array.from({ length: size }, function () { return new Float64Array(size); });
  const target = new Float64Array(size);
  for (let i = 0; i < size; i += 1) {
    target[i] = rows[trainIndices[i]].rating - targetMean;
    for (let j = 0; j < size; j += 1) {
      centered[i][j] = kernel[trainIndices[i]][trainIndices[j]] -
        rowMeans[i] - rowMeans[j] + grandMean;
    }
    centered[i][i] += alpha;
  }
  return {
    trainIndices: trainIndices.slice(),
    rowMeans: rowMeans,
    grandMean: grandMean,
    targetMean: targetMean,
    coefficients: solveCholesky(centered, target)
  };
}

function predictRidge(rows, model, candidateVector) {
  const size = model.trainIndices.length;
  const raw = new Float64Array(size);
  let testMean = 0;
  for (let i = 0; i < size; i += 1) {
    raw[i] = dot(candidateVector, rows[model.trainIndices[i]].trainingVector);
    testMean += raw[i];
  }
  testMean /= size;
  let adjustment = 0;
  for (let i = 0; i < size; i += 1) {
    const centeredKernel = raw[i] - testMean - model.rowMeans[i] + model.grandMean;
    adjustment += centeredKernel * model.coefficients[i];
  }
  const prediction = model.targetMean + adjustment;
  if (!Number.isFinite(prediction)) throw new Error("Predicción no finita");
  return clampRating(prediction);
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
        deltaRidgeMinusBaseline: null, foldsEvaluated: 0, foldsRidgeWins: 0, foldsRidgeTies: 0, foldsRidgeLosses: 0 };
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
function completeRankingQuality(count, relevantCount, totals, foldCount) {
  if (count < MIN_RANKING_RECORDS || relevantCount < MIN_RELEVANT_RECORDS) {
    return unavailableRankingQuality(count, relevantCount, null, foldCount);
  }
  const modes = RANKING_MODES.map(function (mode) {
    const total = totals[mode];
    const available = Boolean(total && total.idealDcg > 0 && total.foldsEvaluated > 0);
    const baselineNdcgAt5 = available ? total.baselineDcg / total.idealDcg : null;
    const ridgeNdcgAt5 = available ? total.ridgeDcg / total.idealDcg : null;
    return {
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
    foldStability: { available: false, foldsEvaluated: 0, ridgeMaeWins: 0, ties: 0, baselineMaeWins: 0 },
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
    outerFolds: OUTER_FOLDS,
    foldsEvaluated: 0,
    innerFolds: INNER_FOLDS,
    alphaGrid: ALPHAS.slice(),
    selectedAlphaCounts: {},
    predictionMin: null,
    predictionMax: null,
    foldStability: { available: false, foldsEvaluated: 0, ridgeMaeWins: 0, ties: 0, baselineMaeWins: 0 },
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
      const movie = findMovie(entry.title, entry.tmdbId || entry.tmId);
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
    let bestAlpha = null;
    let bestMae = Infinity;
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
      const mae = meanAbsoluteError(errors);
      if (mae < bestMae - 1e-10 || (Math.abs(mae - bestMae) <= 1e-10 && alpha > bestAlpha)) {
        bestMae = mae;
        bestAlpha = alpha;
      }
    });
    if (bestAlpha == null) throw new Error("No se pudo seleccionar alpha");
    return bestAlpha;
  }

  function evaluateFoldSet(rows, kernel, indices, repetitionIndex, relevantCount) {
    const repeatSalt = repetitionIndex === 0 ? "" : "-repeat-" + repetitionIndex;
    const outerSalt = repetitionIndex === 0 ? "ridge-outer" : "ridge-outer" + repeatSalt;
    const outer = foldIndices(indices, rows, OUTER_FOLDS, outerSalt);
    const ridgeErrors = [];
    const baselineErrors = [];
    const foldMaeDeltas = [];
    const selectedAlphaCounts = Object.create(null);
    ALPHAS.forEach(function (alpha) { selectedAlphaCounts[String(alpha)] = 0; });
    const rankingTotals = Object.create(null);
    RANKING_MODES.forEach(function (mode) {
      rankingTotals[mode] = {
        baselineDcg: 0, ridgeDcg: 0, idealDcg: 0, foldsEvaluated: 0,
        foldsRidgeWins: 0, foldsRidgeTies: 0, foldsRidgeLosses: 0
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
      const gains = new Map();
      const ridgeFoldErrors = [];
      const baselineFoldErrors = [];

      testIndices.forEach(function (index, position) {
        const row = rows[index];
        const ridgePrediction = predictRidge(rows, ridgeModel, row.trainingVector);
        const additiveResult = predictRating(row.candidate, additiveProfile);
        const additivePrediction = clampRating(Number.isFinite(additiveResult && additiveResult.score)
          ? additiveResult.score : additiveProfile.average);
        const ridgeError = Math.abs(ridgePrediction - row.rating);
        const baselineError = Math.abs(additivePrediction - row.rating);
        ridgeErrors.push(ridgeError);
        baselineErrors.push(baselineError);
        ridgeFoldErrors.push(ridgeError);
        baselineFoldErrors.push(baselineError);
        predictionMin = Math.min(predictionMin, ridgePrediction);
        predictionMax = Math.max(predictionMax, ridgePrediction);
        if (canCompareRanking) {
          const token = "candidate-" + position;
          const baselinePrediction = Object.assign({}, additiveResult || {}, { score: additivePrediction });
          const ridgePredictionExplained = Object.assign({}, additiveResult || {}, { score: ridgePrediction });
          baselineCandidates.push(rankingCandidate(row, baselinePrediction, additivePrediction, token));
          ridgeCandidates.push(rankingCandidate(row, ridgePredictionExplained, ridgePrediction, token));
          gains.set(token, relevanceGain(row.rating));
        }
      });

      foldMaeDeltas.push(meanAbsoluteError(baselineFoldErrors) - meanAbsoluteError(ridgeFoldErrors));
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
      }
    });

    return {
      repetitionIndex: repetitionIndex,
      ridgeErrors: ridgeErrors,
      baselineErrors: baselineErrors,
      foldMaeDeltas: foldMaeDeltas,
      selectedAlphaCounts: selectedAlphaCounts,
      predictionMin: predictionMin,
      predictionMax: predictionMax,
      outerFoldsEvaluated: outer.length,
      rankingTotals: rankingTotals,
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
    const maeFoldDeltas = [];
    const rankingTotals = Object.create(null);
    RANKING_MODES.forEach(function (mode) {
      rankingTotals[mode] = {
        baselineDcg: 0, ridgeDcg: 0, idealDcg: 0, foldsEvaluated: 0,
        foldsRidgeWins: 0, foldsRidgeTies: 0, foldsRidgeLosses: 0
      };
    });

    foldSets.forEach(function (result) {
      result.ridgeErrors.forEach(function (value) { ridgeErrors.push(value); });
      result.baselineErrors.forEach(function (value) { baselineErrors.push(value); });
      result.foldMaeDeltas.forEach(function (value) { maeFoldDeltas.push(value); });
      RANKING_MODES.forEach(function (mode) {
        const source = result.rankingTotals[mode];
        const target = rankingTotals[mode];
        target.baselineDcg += source.baselineDcg;
        target.ridgeDcg += source.ridgeDcg;
        target.idealDcg += source.idealDcg;
        target.foldsEvaluated += source.foldsEvaluated;
        target.foldsRidgeWins += source.foldsRidgeWins;
        target.foldsRidgeTies += source.foldsRidgeTies;
        target.foldsRidgeLosses += source.foldsRidgeLosses;
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
        foldStability: summarizeMaeFoldStability(result.foldMaeDeltas),
        rankingQuality: result.rankingQuality
      };
    });

    const mae = meanAbsoluteError(ridgeErrors);
    const baselineMae = meanAbsoluteError(baselineErrors);
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
      foldStability: summarizeMaeFoldStability(maeFoldDeltas),
      rankingQuality: repeatedRanking,
      repeatSummaries: repeatSummaries,
      unavailableReason: null
    };
  }

  function completedEvaluation(rows, repeatedRuns, relevantCount) {
    const primary = repeatedRuns[0];
    const mae = meanAbsoluteError(primary.ridgeErrors);
    const baselineMae = meanAbsoluteError(primary.baselineErrors);
    return {
      available: true,
      count: rows.length,
      mae: mae,
      baselineMae: baselineMae,
      deltaBaseMinusRidge: baselineMae - mae,
      outerFolds: OUTER_FOLDS,
      foldsEvaluated: primary.outerFoldsEvaluated,
      innerFolds: INNER_FOLDS,
      alphaGrid: ALPHAS.slice(),
      selectedAlphaCounts: primary.selectedAlphaCounts,
      predictionMin: primary.predictionMin,
      predictionMax: primary.predictionMax,
      foldStability: summarizeMaeFoldStability(primary.foldMaeDeltas),
      rankingQuality: primary.rankingQuality,
      repeatedValidation: summarizeRepeatedValidation(repeatedRuns, rows.length, relevantCount),
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

  async function evaluateAsync(onProgress) {
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
        if (typeof onProgress === "function") {
          const shouldContinue = onProgress({
            completedRepeats: repetitionIndex + 1,
            totalRepeats: REPEATED_VALIDATION_RUNS,
            foldsPerRepeat: OUTER_FOLDS
          });
          if (shouldContinue === false) {
            const reason = "La validación Ridge repetida se canceló porque cambiaron los datos personales durante el cálculo.";
            return unavailableResult(rows.length, reason,
              unavailableRankingQuality(rows.length, relevantCount, reason, REPEATED_VALIDATION_RUNS * OUTER_FOLDS),
              relevantCount);
          }
        }
        if (repetitionIndex + 1 < REPEATED_VALIDATION_RUNS) {
          await new Promise(function (resolve) { setTimeout(resolve, 0); });
        }
      }
      return completedEvaluation(rows, repeatedRuns, relevantCount);
    } catch (_) {
      return unavailableEvaluation(rows, relevantCount);
    }
  }

  return { evaluate: evaluate, evaluateAsync: evaluateAsync };
}
