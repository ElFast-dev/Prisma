const MODES = Object.freeze(["balanced", "affinity", "variety"]);
const NORMALIZATIONS = Object.freeze(["mean", "coverage-sqrt", "matched-only"]);
const FOLDS = 5;
const CUTOFF = 5;
const MIN_RECORDS = 50;
const MIN_RELEVANT = 10;
const RELEVANT_THRESHOLD = 7;

function stableHash(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function identityFor(entry, movie, dependencies) {
  const id = dependencies.movieTmdbId(entry) || dependencies.movieTmdbId(movie);
  if (id) return "tmdb:" + id;
  const year = (entry && (entry.year || entry.releaseYear || entry.release_year)) ||
    (movie && (movie.year || movie.releaseYear || movie.release_year)) || "";
  return "title:" + dependencies.titleKey(entry && entry.title) + ":" + String(year);
}

function candidateFor(row) {
  const movie = row.movie || {};
  const entry = row.entry || {};
  const candidate = Object.assign({}, movie, {
    title: movie.title || entry.title || "",
    tmdbId: movie.tmdbId || movie.tmId || entry.tmdbId || entry.tmId || "",
    genres: movie.genres && movie.genres.length ? movie.genres : (entry.genres || []),
    tags: movie.tags && movie.tags.length ? movie.tags : (entry.tags || []),
    year: movie.year || entry.year || entry.releaseYear || entry.release_year || null,
    releaseDate: movie.releaseDate || movie.release_date || entry.releaseDate || entry.release_date || null
  });
  delete candidate.rating;
  delete candidate.r;
  delete candidate.score;
  delete candidate.userRating;
  delete candidate.personalRating;
  delete candidate.emotion;
  delete candidate.note;
  return candidate;
}

function relevanceGain(rating) {
  return rating >= RELEVANT_THRESHOLD ? rating - (RELEVANT_THRESHOLD - 1) : 0;
}

function dcgAtCutoff(rows) {
  return rows.slice(0, CUTOFF).reduce(function (sum, row, index) {
    return sum + row.gain / Math.log2(index + 2);
  }, 0);
}

function mean(values) {
  return values.length ? values.reduce(function (sum, value) { return sum + value; }, 0) / values.length : null;
}

function emptyResult(reason, count, relevantCount) {
  return {
    executionStatus: "unavailable",
    available: false,
    sampleCount: count || 0,
    relevantRatingsCount: relevantCount || 0,
    folds: FOLDS,
    foldsEvaluated: 0,
    cutoff: CUTOFF,
    relevantRatingThreshold: RELEVANT_THRESHOLD,
    baselineMethod: "mean",
    methods: NORMALIZATIONS.map(function (method) {
      return {
        method: method,
        available: false,
        mae: null,
        deltaMaeVsMean: null,
        maeFoldStability: { available: false, foldsEvaluated: 0, variantWins: 0, ties: 0, meanWins: 0 },
        rankingModes: MODES.map(function (mode) {
          return {
            mode: mode,
            available: false,
            ndcgAt5: null,
            deltaNdcgVsMean: null,
            foldsEvaluated: 0,
            foldsWins: 0,
            foldsTies: 0,
            foldsLosses: 0
          };
        })
      };
    }),
    unavailableReason: reason
  };
}

export function createRecommendationNormalizationEvaluation(dependencies) {
  const getRatings = dependencies.getRatings;
  const findMovie = dependencies.findMovie;
  const movieFeatures = dependencies.movieFeatures;
  const ratingValue = dependencies.ratingValue;
  const buildProfile = dependencies.buildProfile;
  const predictRating = dependencies.predictRating;
  const rankCandidates = dependencies.rankCandidates;

  function mappedRatings() {
    const seen = new Set();
    const rows = [];
    (getRatings() || []).forEach(function (entry) {
      const rating = ratingValue(entry);
      if (rating == null) return;
      const movie = findMovie(entry.title, entry.tmdbId || entry.tmId, entry.year || entry.releaseYear || entry.release_year);
      if (!movieFeatures(movie, entry).length) return;
      const identity = identityFor(entry, movie, dependencies);
      if (!identity || seen.has(identity)) return;
      seen.add(identity);
      rows.push({ entry: entry, movie: movie, identity: identity, rating: rating });
    });
    return rows;
  }

  async function mappedRatingsAsync(shouldContinue, yieldToBrowser) {
    const rows = [];
    const seen = new Set();
    const sourceRatings = getRatings() || [];
    for (let index = 0; index < sourceRatings.length; index += 1) {
      if (!shouldContinue()) return null;
      const entry = sourceRatings[index];
      const rating = ratingValue(entry);
      if (rating != null) {
        const movie = findMovie(entry.title, entry.tmdbId || entry.tmId, entry.year || entry.releaseYear || entry.release_year);
        if (movieFeatures(movie, entry).length) {
          const identity = identityFor(entry, movie, dependencies);
          if (identity && !seen.has(identity)) {
            seen.add(identity);
            rows.push({ entry: entry, movie: movie, identity: identity, rating: rating });
          }
        }
      }
      if ((index + 1) % 16 === 0) {
        await yieldToBrowser();
        if (!shouldContinue()) return null;
      }
    }
    return rows;
  }

  function evaluate() {
    const rows = mappedRatings();
    const relevantCount = rows.filter(function (row) {
      return row.rating >= RELEVANT_THRESHOLD;
    }).length;
    if (rows.length < 5) {
      return emptyResult("Se necesitan al menos cinco valoraciones únicas con características enlazadas.", rows.length, relevantCount);
    }

    const ordered = rows.slice().sort(function (left, right) {
      return stableHash(left.identity) - stableHash(right.identity) ||
        left.identity.localeCompare(right.identity);
    });
    const folds = Array.from({ length: FOLDS }, function () { return []; });
    ordered.forEach(function (row, index) { folds[index % FOLDS].push(row); });

    const accumulators = Object.create(null);
    NORMALIZATIONS.forEach(function (method) {
      accumulators[method] = {
        errors: [],
        foldMae: [],
        ranking: Object.create(null)
      };
      MODES.forEach(function (mode) {
        accumulators[method].ranking[mode] = {
          dcg: 0,
          idealDcg: 0,
          foldNdcg: [],
          foldsEvaluated: 0
        };
      });
    });

    folds.forEach(function (testRows) {
      if (!testRows.length) return;
      const testIdentities = new Set(testRows.map(function (row) { return row.identity; }));
      const trainingRows = rows.filter(function (row) { return !testIdentities.has(row.identity); });
      const profile = buildProfile(trainingRows.map(function (row) { return row.entry; }));
      const gains = new Map(testRows.map(function (row) {
        return [row.identity, relevanceGain(row.rating)];
      }));
      const ideal = testRows.map(function (row) {
        return { identity: row.identity, gain: gains.get(row.identity) || 0 };
      }).sort(function (left, right) {
        return right.gain - left.gain || left.identity.localeCompare(right.identity);
      });
      const idealDcg = dcgAtCutoff(ideal);

      NORMALIZATIONS.forEach(function (method) {
        const accumulator = accumulators[method];
        const candidates = [];
        let foldErrorSum = 0;
        testRows.forEach(function (row) {
          const candidate = candidateFor(row);
          const prediction = predictRating(candidate, profile, { influenceNormalization: method });
          const score = Number.isFinite(prediction && prediction.score) ? prediction.score : profile.average;
          accumulator.errors.push(Math.abs(score - row.rating));
          foldErrorSum += Math.abs(score - row.rating);
          candidates.push(Object.assign(candidate, {
            evaluationIdentity: row.identity,
            prediction: Object.assign({}, prediction || {}, { score: score })
          }));
        });
        accumulator.foldMae.push(foldErrorSum / testRows.length);

        if (idealDcg <= 0) return;
        MODES.forEach(function (mode) {
          const rankedCandidates = rankCandidates(candidates, CUTOFF, mode) || [];
          const ranked = rankedCandidates.slice(0, CUTOFF).map(function (candidate) {
            return {
              identity: candidate.evaluationIdentity,
              gain: gains.get(candidate.evaluationIdentity) || 0
            };
          });
          const dcg = dcgAtCutoff(ranked);
          const ndcg = Math.max(0, Math.min(1, dcg / idealDcg));
          const ranking = accumulator.ranking[mode];
          ranking.dcg += dcg;
          ranking.idealDcg += idealDcg;
          ranking.foldNdcg.push(ndcg);
          ranking.foldsEvaluated += 1;
        });
      });
    });

    const baseline = accumulators.mean;
    const baselineMae = mean(baseline.errors);
    const rankingAvailable = rows.length >= MIN_RECORDS && relevantCount >= MIN_RELEVANT;
    const methods = NORMALIZATIONS.map(function (method) {
      const accumulator = accumulators[method];
      const methodMae = mean(accumulator.errors);
      const baselineFoldMae = baseline.foldMae;
      let variantWins = 0;
      let ties = 0;
      let meanWins = 0;
      if (method === "mean") {
        ties = baselineFoldMae.length;
      } else {
        accumulator.foldMae.forEach(function (value, index) {
          const base = baselineFoldMae[index];
          if (value < base - 1e-12) variantWins += 1;
          else if (value > base + 1e-12) meanWins += 1;
          else ties += 1;
        });
      }
      const rankingModes = MODES.map(function (mode) {
        const current = accumulator.ranking[mode];
        const base = baseline.ranking[mode];
        const available = rankingAvailable && current.idealDcg > 0 && current.foldsEvaluated > 0;
        let wins = 0;
        let rankingTies = 0;
        let losses = 0;
        if (available && method === "mean") {
          rankingTies = current.foldsEvaluated;
        } else if (available) {
          current.foldNdcg.forEach(function (value, index) {
            const baseValue = base.foldNdcg[index];
            if (value > baseValue + 1e-12) wins += 1;
            else if (value < baseValue - 1e-12) losses += 1;
            else rankingTies += 1;
          });
        }
        const ndcg = current.idealDcg > 0 && current.foldsEvaluated > 0
          ? current.dcg / current.idealDcg : null;
        const baselineNdcg = base.idealDcg > 0 && base.foldsEvaluated > 0
          ? base.dcg / base.idealDcg : null;
        return {
          mode: mode,
          available: available,
          ndcgAt5: available ? ndcg : null,
          deltaNdcgVsMean: available && baselineNdcg != null ? ndcg - baselineNdcg : null,
          foldsEvaluated: available ? current.foldsEvaluated : 0,
          foldsWins: available ? wins : 0,
          foldsTies: available ? rankingTies : 0,
          foldsLosses: available ? losses : 0
        };
      });
      return {
        method: method,
        available: true,
        mae: methodMae,
        deltaMaeVsMean: baselineMae - methodMae,
        maeFoldStability: {
          available: true,
          foldsEvaluated: method === "mean" ? baseline.foldMae.length : accumulator.foldMae.length,
          variantWins: variantWins,
          ties: ties,
          meanWins: meanWins
        },
        rankingModes: rankingModes
      };
    });

    return {
      executionStatus: "completed",
      available: true,
      sampleCount: rows.length,
      relevantRatingsCount: relevantCount,
      folds: FOLDS,
      foldsEvaluated: folds.filter(function (fold) { return fold.length > 0; }).length,
      cutoff: CUTOFF,
      relevantRatingThreshold: RELEVANT_THRESHOLD,
      baselineMethod: "mean",
      methods: methods,
      unavailableReason: null,
      interpretationLimits: [
        "Mean reproduce el denominador actual: todas las características de la candidata.",
        "Coverage-sqrt usa la raíz de características totales por características coincidentes; atenúa menos la señal pero conserva una penalización explícita de cobertura.",
        "Matched-only divide solo por señales conocidas y es un control superior exploratorio; no penaliza metadatos sin respaldo.",
        "Todos los métodos usan las mismas valoraciones retenidas, perfiles de entrenamiento y pliegues. La evaluación no cambia las recomendaciones activas.",
        "Los resultados son descriptivos y no demuestran satisfacción futura ni significación estadística."
      ]
    };
  }

  async function evaluateAsync(control) {
    const settings = control || {};
    const shouldContinue = typeof settings.shouldContinue === "function" ? settings.shouldContinue : function () { return true; };
    const onMeasure = typeof settings.onMeasure === "function" ? settings.onMeasure : function () {};
    const startedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const yieldToBrowser = function () { return new Promise(function (resolve) { setTimeout(resolve, 0); }); };
    const rows = await mappedRatingsAsync(shouldContinue, yieldToBrowser);
    if (!rows || !shouldContinue()) return null;
    const relevantCount = rows.filter(function (row) {
      return row.rating >= RELEVANT_THRESHOLD;
    }).length;
    if (rows.length < 5) {
      return emptyResult("Se necesitan al menos cinco valoraciones únicas con características enlazadas.", rows.length, relevantCount);
    }

    const ordered = rows.slice().sort(function (left, right) {
      return stableHash(left.identity) - stableHash(right.identity) ||
        left.identity.localeCompare(right.identity);
    });
    const folds = Array.from({ length: FOLDS }, function () { return []; });
    ordered.forEach(function (row, index) { folds[index % FOLDS].push(row); });

    const accumulators = Object.create(null);
    NORMALIZATIONS.forEach(function (method) {
      accumulators[method] = {
        errors: [],
        foldMae: [],
        ranking: Object.create(null)
      };
      MODES.forEach(function (mode) {
        accumulators[method].ranking[mode] = {
          dcg: 0,
          idealDcg: 0,
          foldNdcg: [],
          foldsEvaluated: 0
        };
      });
    });

    for (let foldIndex = 0; foldIndex < folds.length; foldIndex += 1) {
      if (!shouldContinue()) return null;
      const testRows = folds[foldIndex];
      if (!testRows.length) continue;
      const testIdentities = new Set(testRows.map(function (row) { return row.identity; }));
      const trainingRows = rows.filter(function (row) { return !testIdentities.has(row.identity); });
      const profile = buildProfile(trainingRows.map(function (row) { return row.entry; }));
      const gains = new Map(testRows.map(function (row) {
        return [row.identity, relevanceGain(row.rating)];
      }));
      const ideal = testRows.map(function (row) {
        return { identity: row.identity, gain: gains.get(row.identity) || 0 };
      }).sort(function (left, right) {
        return right.gain - left.gain || left.identity.localeCompare(right.identity);
      });
      const idealDcg = dcgAtCutoff(ideal);

      for (const method of NORMALIZATIONS) {
        if (!shouldContinue()) return null;
        const accumulator = accumulators[method];
        const candidates = [];
        let foldErrorSum = 0;
        for (let rowIndex = 0; rowIndex < testRows.length; rowIndex += 1) {
          if (!shouldContinue()) return null;
          const row = testRows[rowIndex];
          const candidate = candidateFor(row);
          const prediction = predictRating(candidate, profile, { influenceNormalization: method });
          const score = Number.isFinite(prediction && prediction.score) ? prediction.score : profile.average;
          accumulator.errors.push(Math.abs(score - row.rating));
          foldErrorSum += Math.abs(score - row.rating);
          candidates.push(Object.assign(candidate, {
            evaluationIdentity: row.identity,
            prediction: Object.assign({}, prediction || {}, { score: score })
          }));
          if ((rowIndex + 1) % 8 === 0) {
            await yieldToBrowser();
            if (!shouldContinue()) return null;
          }
        }
        accumulator.foldMae.push(foldErrorSum / testRows.length);

        if (idealDcg <= 0) continue;
        MODES.forEach(function (mode) {
          const rankedCandidates = rankCandidates(candidates, CUTOFF, mode) || [];
          const ranked = rankedCandidates.slice(0, CUTOFF).map(function (candidate) {
            return {
              identity: candidate.evaluationIdentity,
              gain: gains.get(candidate.evaluationIdentity) || 0
            };
          });
          const dcg = dcgAtCutoff(ranked);
          const ndcg = Math.max(0, Math.min(1, dcg / idealDcg));
          const ranking = accumulator.ranking[mode];
          ranking.dcg += dcg;
          ranking.idealDcg += idealDcg;
          ranking.foldNdcg.push(ndcg);
          ranking.foldsEvaluated += 1;
        });
      }
      await yieldToBrowser();
      if (!shouldContinue()) return null;
    }

    const baseline = accumulators.mean;
    const baselineMae = mean(baseline.errors);
    const rankingAvailable = rows.length >= MIN_RECORDS && relevantCount >= MIN_RELEVANT;
    const methods = NORMALIZATIONS.map(function (method) {
      const accumulator = accumulators[method];
      const methodMae = mean(accumulator.errors);
      const baselineFoldMae = baseline.foldMae;
      let variantWins = 0;
      let ties = 0;
      let meanWins = 0;
      if (method === "mean") {
        ties = baselineFoldMae.length;
      } else {
        accumulator.foldMae.forEach(function (value, index) {
          const base = baselineFoldMae[index];
          if (value < base - 1e-12) variantWins += 1;
          else if (value > base + 1e-12) meanWins += 1;
          else ties += 1;
        });
      }
      const rankingModes = MODES.map(function (mode) {
        const current = accumulator.ranking[mode];
        const base = baseline.ranking[mode];
        const available = rankingAvailable && current.idealDcg > 0 && current.foldsEvaluated > 0;
        let wins = 0;
        let rankingTies = 0;
        let losses = 0;
        if (available && method === "mean") {
          rankingTies = current.foldsEvaluated;
        } else if (available) {
          current.foldNdcg.forEach(function (value, index) {
            const baseValue = base.foldNdcg[index];
            if (value > baseValue + 1e-12) wins += 1;
            else if (value < baseValue - 1e-12) losses += 1;
            else rankingTies += 1;
          });
        }
        const ndcg = current.idealDcg > 0 && current.foldsEvaluated > 0
          ? current.dcg / current.idealDcg : null;
        const baselineNdcg = base.idealDcg > 0 && base.foldsEvaluated > 0
          ? base.dcg / base.idealDcg : null;
        return {
          mode: mode,
          available: available,
          ndcgAt5: available ? ndcg : null,
          deltaNdcgVsMean: available && baselineNdcg != null ? ndcg - baselineNdcg : null,
          foldsEvaluated: available ? current.foldsEvaluated : 0,
          foldsWins: available ? wins : 0,
          foldsTies: available ? rankingTies : 0,
          foldsLosses: available ? losses : 0
        };
      });
      return {
        method: method,
        available: true,
        mae: methodMae,
        deltaMaeVsMean: baselineMae - methodMae,
        maeFoldStability: {
          available: true,
          foldsEvaluated: method === "mean" ? baseline.foldMae.length : accumulator.foldMae.length,
          variantWins: variantWins,
          ties: ties,
          meanWins: meanWins
        },
        rankingModes: rankingModes
      };
    });

    const result = {
      executionStatus: "completed",
      available: true,
      sampleCount: rows.length,
      relevantRatingsCount: relevantCount,
      folds: FOLDS,
      foldsEvaluated: folds.filter(function (fold) { return fold.length > 0; }).length,
      cutoff: CUTOFF,
      relevantRatingThreshold: RELEVANT_THRESHOLD,
      baselineMethod: "mean",
      methods: methods,
      unavailableReason: null,
      interpretationLimits: [
        "Mean reproduce el denominador actual: todas las características de la candidata.",
        "Coverage-sqrt usa la raíz de características totales por características coincidentes; atenúa menos la señal pero conserva una penalización explícita de cobertura.",
        "Matched-only divide solo por señales conocidas y es un control superior exploratorio; no penaliza metadatos sin respaldo.",
        "Todos los métodos usan las mismas valoraciones retenidas, perfiles de entrenamiento y pliegues. La evaluación no cambia las recomendaciones activas.",
        "Los resultados son descriptivos y no demuestran satisfacción futura ni significación estadística."
      ]
    };
    const finishedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    onMeasure("influence-normalization", Math.max(0, finishedAt - startedAt), rows.length, "completed");
    return result;
  }

  return { evaluate: evaluate, evaluateAsync: evaluateAsync };
}
