const OUTER_FOLDS = 5;
const INNER_FOLDS = 3;
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
function unavailableRankingQuality(count, relevantCount, reason) {
  let unavailableReason = reason || "";
  if (!unavailableReason && count < MIN_RANKING_RECORDS) unavailableReason = "Se necesitan al menos " + MIN_RANKING_RECORDS + " películas únicas con características para comparar nDCG@5.";
  if (!unavailableReason && relevantCount < MIN_RELEVANT_RECORDS) unavailableReason = "Se necesitan al menos " + MIN_RELEVANT_RECORDS + " valoraciones de 7 o más para comparar nDCG@5.";
  if (!unavailableReason) unavailableReason = "No se pudo calcular una comparación de ranking estable.";
  return {
    available: false, count: count, relevantCount: relevantCount, folds: OUTER_FOLDS,
    foldsEvaluated: 0, cutoff: RANKING_CUTOFF, relevantThreshold: RELEVANT_RATING_THRESHOLD,
    reason: unavailableReason,
    modes: RANKING_MODES.map(function (mode) {
      return { mode: mode, available: false, baselineNdcgAt5: null, ridgeNdcgAt5: null,
        deltaRidgeMinusBaseline: null, foldsEvaluated: 0 };
    })
  };
}
function completeRankingQuality(count, relevantCount, totals) {
  if (count < MIN_RANKING_RECORDS || relevantCount < MIN_RELEVANT_RECORDS) {
    return unavailableRankingQuality(count, relevantCount);
  }
  const modes = RANKING_MODES.map(function (mode) {
    const total = totals[mode];
    const available = Boolean(total && total.idealDcg > 0 && total.foldsEvaluated > 0);
    const baselineNdcgAt5 = available ? total.baselineDcg / total.idealDcg : null;
    const ridgeNdcgAt5 = available ? total.ridgeDcg / total.idealDcg : null;
    return { mode: mode, available: available, baselineNdcgAt5: baselineNdcgAt5,
      ridgeNdcgAt5: ridgeNdcgAt5,
      deltaRidgeMinusBaseline: available ? ridgeNdcgAt5 - baselineNdcgAt5 : null,
      foldsEvaluated: total ? total.foldsEvaluated : 0 };
  });
  const usable = modes.filter(function (mode) { return mode.available; });
  if (!usable.length) return unavailableRankingQuality(count, relevantCount,
    "No hubo suficientes valoraciones relevantes distribuidas en los pliegues externos.");
  return { available: true, count: count, relevantCount: relevantCount, folds: OUTER_FOLDS,
    foldsEvaluated: Math.min.apply(null, usable.map(function (mode) { return mode.foldsEvaluated; })),
    cutoff: RANKING_CUTOFF, relevantThreshold: RELEVANT_RATING_THRESHOLD, reason: null, modes: modes };
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

function unavailableResult(count, reason, rankingQuality) {
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

  function selectAlpha(rows, kernel, outerTraining, outerFold) {
    const folds = foldIndices(outerTraining, rows, INNER_FOLDS, "ridge-inner-" + outerFold);
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

  function evaluate() {
    const rows = mappedRows();
    const relevantCount = rows.filter(function (row) { return row.rating >= RELEVANT_RATING_THRESHOLD; }).length;
    if (rows.length < MIN_RECORDS) {
      const reason = "Se necesitan al menos " + MIN_RECORDS + " películas únicas valoradas con características.";
      return unavailableResult(rows.length, reason, unavailableRankingQuality(rows.length, relevantCount));
    }
    try {
      const kernel = buildKernel(rows);
      const indices = rows.map(function (_, index) { return index; });
      const outer = foldIndices(indices, rows, OUTER_FOLDS, "ridge-outer");
      const ridgeErrors = [];
      const baselineErrors = [];
      const selectedAlphaCounts = Object.create(null);
      ALPHAS.forEach(function (alpha) { selectedAlphaCounts[String(alpha)] = 0; });
      const rankingTotals = Object.create(null);
      RANKING_MODES.forEach(function (mode) {
        rankingTotals[mode] = { baselineDcg: 0, ridgeDcg: 0, idealDcg: 0, foldsEvaluated: 0 };
      });
      const canCompareRanking = rows.length >= MIN_RANKING_RECORDS && relevantCount >= MIN_RELEVANT_RECORDS;
      let predictionMin = Infinity;
      let predictionMax = -Infinity;

      outer.forEach(function (testIndices, outerFold) {
        const testSet = new Set(testIndices);
        const trainingIndices = indices.filter(function (index) { return !testSet.has(index); });
        const alpha = selectAlpha(rows, kernel, trainingIndices, outerFold);
        selectedAlphaCounts[String(alpha)] += 1;
        const ridgeModel = trainRidge(rows, kernel, trainingIndices, alpha);
        const trainingRatings = trainingIndices.map(function (index) { return rows[index].entry; });
        const additiveProfile = buildProfile(trainingRatings);
        const baselineCandidates = [];
        const ridgeCandidates = [];
        const gains = new Map();
        testIndices.forEach(function (index, position) {
          const row = rows[index];
          const ridgePrediction = predictRidge(rows, ridgeModel, row.trainingVector);
          const additiveResult = predictRating(row.candidate, additiveProfile);
          const additivePrediction = clampRating(Number.isFinite(additiveResult && additiveResult.score)
            ? additiveResult.score : additiveProfile.average);
          ridgeErrors.push(Math.abs(ridgePrediction - row.rating));
          baselineErrors.push(Math.abs(additivePrediction - row.rating));
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
              rankingTotals[mode].baselineDcg += baselineDcg;
              rankingTotals[mode].ridgeDcg += ridgeDcg;
              rankingTotals[mode].idealDcg += idealDcg;
              rankingTotals[mode].foldsEvaluated += 1;
            });
          }
        }
      });

      const mae = meanAbsoluteError(ridgeErrors);
      const baselineMae = meanAbsoluteError(baselineErrors);
      return {
        available: true,
        count: rows.length,
        mae: mae,
        baselineMae: baselineMae,
        deltaBaseMinusRidge: baselineMae - mae,
        outerFolds: OUTER_FOLDS,
        foldsEvaluated: outer.length,
        innerFolds: INNER_FOLDS,
        alphaGrid: ALPHAS.slice(),
        selectedAlphaCounts: selectedAlphaCounts,
        predictionMin: predictionMin,
        predictionMax: predictionMax,
        rankingQuality: canCompareRanking ? completeRankingQuality(rows.length, relevantCount, rankingTotals) :
          unavailableRankingQuality(rows.length, relevantCount),
        reason: null
      };
    } catch (_) {
      const reason = "No se pudo resolver la evaluación Ridge de forma estable con esta muestra.";
      return unavailableResult(rows.length, reason,
        unavailableRankingQuality(rows.length, relevantCount, "La comparación Ridge de ranking no se completó porque el ajuste no terminó."));
    }
  }

  return { evaluate: evaluate };
}
