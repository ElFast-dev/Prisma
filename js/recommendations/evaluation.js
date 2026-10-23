const RECOMMENDATION_MODES = Object.freeze(["balanced", "affinity", "variety"]);
const RANKING_FOLDS = 5;
const RANKING_CUTOFF = 5;
const MIN_RANKING_RECORDS = 50;
const MIN_RELEVANT_RECORDS = 10;
const RELEVANT_RATING_THRESHOLD = 7;

export function createRecommendationEvaluation(dependencies) {
  const getRatings = dependencies.getRatings;
  const findMovie = dependencies.findMovie;
  const movieFeatures = dependencies.movieFeatures;
  const ratingValue = dependencies.ratingValue;
  const buildProfile = dependencies.buildProfile;
  const predictRating = dependencies.predictRating;
  const getRecommendations = dependencies.getRecommendations;
  const rankCandidates = dependencies.rankCandidates;
  const getCandidatePoolCounts = dependencies.getCandidatePoolCounts;
  const movieTmdbId = dependencies.movieTmdbId;
  const titleKey = dependencies.titleKey;

  function identityFor(entry, movie) {
    const id = movieTmdbId(entry) || movieTmdbId(movie);
    if (id) return "tmdb:" + id;
    const year = entry && (entry.year || entry.releaseYear || entry.release_year) || (movie && movie.year) || "";
    return "title:" + titleKey(entry && entry.title) + ":" + String(year);
  }

  function mappedRatings() {
    const seen = new Set();
    const mapped = [];
    getRatings().forEach(function (entry) {
      const rating = ratingValue(entry);
      if (rating == null) return;
      const movie = findMovie(entry.title, entry.tmdbId || entry.tmId, entry.year || entry.releaseYear || entry.release_year);
      const features = movieFeatures(movie, entry);
      if (!features.length) return;
      const identity = identityFor(entry, movie);
      if (!identity || seen.has(identity)) return;
      seen.add(identity);
      mapped.push({ entry: entry, movie: movie, identity: identity, rating: rating });
    });
    return mapped;
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

  function unavailableRanking(reason, count, relevantCount) {
    return {
      available: false,
      reason: reason,
      modes: RECOMMENDATION_MODES.map(function (mode) {
        return { mode: mode, available: false, ndcgAt5: null, foldsEvaluated: 0 };
      }),
      count: count,
      relevantCount: relevantCount,
      folds: RANKING_FOLDS,
      foldsEvaluated: 0,
      cutoff: RANKING_CUTOFF,
      relevantThreshold: RELEVANT_RATING_THRESHOLD
    };
  }

  function relevanceGain(rating) {
    return rating >= RELEVANT_RATING_THRESHOLD ? rating - (RELEVANT_RATING_THRESHOLD - 1) : 0;
  }

  function dcgAt5(rows) {
    return rows.slice(0, RANKING_CUTOFF).reduce(function (sum, row, index) {
      return sum + row.gain / Math.log2(index + 2);
    }, 0);
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
    // Personal ratings/labels are evaluation targets, not predictor or ranker inputs.
    delete candidate.rating;
    delete candidate.userRating;
    delete candidate.personalRating;
    return candidate;
  }

  function evaluateRankingQuality() {
    const rows = mappedRatings();
    const relevantCount = rows.filter(function (row) {
      return row.rating >= RELEVANT_RATING_THRESHOLD;
    }).length;
    if (rows.length < MIN_RANKING_RECORDS) {
      return unavailableRanking(
        "Se necesitan al menos " + MIN_RANKING_RECORDS + " películas únicas valoradas con características para comparar el nDCG@5 de los modos.",
        rows.length,
        relevantCount
      );
    }
    if (relevantCount < MIN_RELEVANT_RECORDS) {
      return unavailableRanking(
        "Se necesitan al menos " + MIN_RELEVANT_RECORDS + " valoraciones de " + RELEVANT_RATING_THRESHOLD + " o más para comparar el orden.",
        rows.length,
        relevantCount
      );
    }

    // Every mode shares fixed folds, test candidates and its fold's training profile.
    const ordered = rows.slice().sort(function (a, b) {
      return stableHash(a.identity) - stableHash(b.identity) || a.identity.localeCompare(b.identity);
    });
    const folds = Array.from({ length: RANKING_FOLDS }, function () { return []; });
    ordered.forEach(function (row, index) { folds[index % RANKING_FOLDS].push(row); });

    const totals = Object.create(null);
    RECOMMENDATION_MODES.forEach(function (mode) {
      totals[mode] = { dcg: 0, idealDcg: 0, foldsEvaluated: 0 };
    });

    folds.forEach(function (testRows) {
      const testIdentities = new Set(testRows.map(function (row) { return row.identity; }));
      const trainingRatings = rows.filter(function (row) {
        return !testIdentities.has(row.identity);
      }).map(function (row) { return row.entry; });
      const profile = buildProfile(trainingRatings);
      const gainsByIdentity = new Map(testRows.map(function (row) {
        return [row.identity, relevanceGain(row.rating)];
      }));
      const candidates = testRows.map(function (row) {
        const candidate = candidateFor(row);
        const prediction = predictRating(candidate, profile);
        const score = Number.isFinite(prediction && prediction.score) ? prediction.score : profile.average;
        return Object.assign(candidate, {
          evaluationIdentity: row.identity,
          prediction: Object.assign({}, prediction || {}, { score: score })
        });
      });
      const ideal = candidates.map(function (candidate) {
        return { identity: candidate.evaluationIdentity, gain: gainsByIdentity.get(candidate.evaluationIdentity) || 0 };
      }).sort(function (a, b) {
        return b.gain - a.gain || a.identity.localeCompare(b.identity);
      });
      const idealDcg = dcgAt5(ideal);
      if (idealDcg <= 0) return;

      RECOMMENDATION_MODES.forEach(function (mode) {
        const rankedCandidates = rankCandidates(candidates, RANKING_CUTOFF, mode) || [];
        const ranked = rankedCandidates.slice(0, RANKING_CUTOFF).map(function (candidate) {
          return { identity: candidate.evaluationIdentity, gain: gainsByIdentity.get(candidate.evaluationIdentity) || 0 };
        });
        totals[mode].dcg += dcgAt5(ranked);
        totals[mode].idealDcg += idealDcg;
        totals[mode].foldsEvaluated += 1;
      });
    });

    const modes = RECOMMENDATION_MODES.map(function (mode) {
      const total = totals[mode];
      const available = total.idealDcg > 0 && total.foldsEvaluated > 0;
      return {
        mode: mode,
        available: available,
        ndcgAt5: available ? Math.max(0, Math.min(1, total.dcg / total.idealDcg)) : null,
        foldsEvaluated: total.foldsEvaluated
      };
    });
    if (!modes.some(function (mode) { return mode.available; })) {
      return unavailableRanking(
        "No hay suficientes valoraciones relevantes distribuidas en los pliegues de prueba.",
        rows.length,
        relevantCount
      );
    }
    return {
      available: true,
      reason: "",
      modes: modes,
      count: rows.length,
      relevantCount: relevantCount,
      folds: RANKING_FOLDS,
      foldsEvaluated: Math.min.apply(null, modes.map(function (mode) { return mode.foldsEvaluated; })),
      cutoff: RANKING_CUTOFF,
      relevantThreshold: RELEVANT_RATING_THRESHOLD
    };
  }


  async function evaluateRankingQualityAsync(control) {
    const settings = control || {};
    const shouldContinue = typeof settings.shouldContinue === "function" ? settings.shouldContinue : function () { return true; };
    const onMeasure = typeof settings.onMeasure === "function" ? settings.onMeasure : function () {};
    const onProgress = typeof settings.onProgress === "function" ? settings.onProgress : function () {};
    const yieldToBrowser = function () { return new Promise(function (resolve) { setTimeout(resolve, 0); }); };
    const startedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const seen = new Set();
    const rows = [];
    const sourceRatings = getRatings() || [];
    const progressTotal = Math.max(1, sourceRatings.length * 2 + RANKING_FOLDS + RECOMMENDATION_MODES.length);
    let progressWork = 0;

    for (let index = 0; index < sourceRatings.length; index += 1) {
      if (!shouldContinue()) return null;
      const entry = sourceRatings[index];
      const rating = ratingValue(entry);
      if (rating != null) {
        const movie = findMovie(entry.title, entry.tmdbId || entry.tmId, entry.year || entry.releaseYear || entry.release_year);
        const features = movieFeatures(movie, entry);
        const identity = identityFor(entry, movie);
        if (features.length && identity && !seen.has(identity)) {
          seen.add(identity);
          rows.push({ entry: entry, movie: movie, identity: identity, rating: rating });
        }
      }
      if ((index + 1) % 16 === 0 || index + 1 === sourceRatings.length) {
        progressWork = index + 1;
        onProgress({
          completedWork: progressWork,
          totalWork: progressTotal,
          detail: "Enlazando valoraciones y características"
        });
        await yieldToBrowser();
      }
    }

    progressWork = sourceRatings.length;
    const relevantCount = rows.filter(function (row) { return row.rating >= RELEVANT_RATING_THRESHOLD; }).length;
    if (rows.length < MIN_RANKING_RECORDS) {
      const result = unavailableRanking(
        "Se necesitan al menos " + MIN_RANKING_RECORDS + " películas únicas valoradas con características para comparar el nDCG@5 de los modos.",
        rows.length, relevantCount
      );
      onMeasure("ranking-cross-validation", elapsedSince(startedAt), rows.length, "unavailable");
      return result;
    }
    if (relevantCount < MIN_RELEVANT_RECORDS) {
      const result = unavailableRanking(
        "Se necesitan al menos " + MIN_RELEVANT_RECORDS + " valoraciones de " + RELEVANT_RATING_THRESHOLD + " o más para comparar el orden.",
        rows.length, relevantCount
      );
      onMeasure("ranking-cross-validation", elapsedSince(startedAt), rows.length, "unavailable");
      return result;
    }

    const ordered = rows.slice().sort(function (a, b) {
      return stableHash(a.identity) - stableHash(b.identity) || a.identity.localeCompare(b.identity);
    });
    const folds = Array.from({ length: RANKING_FOLDS }, function () { return []; });
    ordered.forEach(function (row, index) { folds[index % RANKING_FOLDS].push(row); });
    const totals = Object.create(null);
    RECOMMENDATION_MODES.forEach(function (mode) { totals[mode] = { dcg: 0, idealDcg: 0, foldsEvaluated: 0 }; });

    for (let foldIndex = 0; foldIndex < folds.length; foldIndex += 1) {
      if (!shouldContinue()) return null;
      const testRows = folds[foldIndex];
      const testIdentities = new Set(testRows.map(function (row) { return row.identity; }));
      const trainingRatings = rows.filter(function (row) {
        return !testIdentities.has(row.identity);
      }).map(function (row) { return row.entry; });
      const profile = buildProfile(trainingRatings);
      const gainsByIdentity = new Map(testRows.map(function (row) {
        return [row.identity, relevanceGain(row.rating)];
      }));
      const candidates = testRows.map(function (row) {
        const candidate = candidateFor(row);
        const prediction = predictRating(candidate, profile);
        const score = Number.isFinite(prediction && prediction.score) ? prediction.score : profile.average;
        return Object.assign(candidate, {
          evaluationIdentity: row.identity,
          prediction: Object.assign({}, prediction || {}, { score: score })
        });
      });
      const ideal = candidates.map(function (candidate) {
        return { identity: candidate.evaluationIdentity, gain: gainsByIdentity.get(candidate.evaluationIdentity) || 0 };
      }).sort(function (a, b) { return b.gain - a.gain || a.identity.localeCompare(b.identity); });
      const idealDcg = dcgAt5(ideal);

      if (idealDcg > 0) {
        for (const mode of RECOMMENDATION_MODES) {
          if (!shouldContinue()) return null;
          const rankedCandidates = rankCandidates(candidates, RANKING_CUTOFF, mode) || [];
          const ranked = rankedCandidates.slice(0, RANKING_CUTOFF).map(function (candidate) {
            return { identity: candidate.evaluationIdentity, gain: gainsByIdentity.get(candidate.evaluationIdentity) || 0 };
          });
          totals[mode].dcg += dcgAt5(ranked);
          totals[mode].idealDcg += idealDcg;
          totals[mode].foldsEvaluated += 1;
        }
      }
      progressWork += testRows.length + 1;
      onProgress({
        completedWork: Math.min(progressTotal, progressWork),
        totalWork: progressTotal,
        detail: "Pliegue de ranking " + (foldIndex + 1) + " de " + folds.length
      });
      await yieldToBrowser();
    }

    const modes = RECOMMENDATION_MODES.map(function (mode) {
      const total = totals[mode];
      const available = total.idealDcg > 0 && total.foldsEvaluated > 0;
      return {
        mode: mode,
        available: available,
        ndcgAt5: available ? Math.max(0, Math.min(1, total.dcg / total.idealDcg)) : null,
        foldsEvaluated: total.foldsEvaluated
      };
    });
    if (!modes.some(function (mode) { return mode.available; })) {
      const unavailable = unavailableRanking(
        "No hay suficientes valoraciones relevantes distribuidas en los pliegues de prueba.",
        rows.length, relevantCount
      );
      onMeasure("ranking-cross-validation", elapsedSince(startedAt), rows.length, "unavailable");
      return unavailable;
    }
    const result = {
      available: true,
      reason: "",
      modes: modes,
      count: rows.length,
      relevantCount: relevantCount,
      folds: RANKING_FOLDS,
      foldsEvaluated: Math.min.apply(null, modes.map(function (mode) { return mode.foldsEvaluated; })),
      cutoff: RANKING_CUTOFF,
      relevantThreshold: RELEVANT_RATING_THRESHOLD
    };
    onMeasure("ranking-cross-validation", elapsedSince(startedAt), rows.length, "completed");
    return result;
  }

  function elapsedSince(startedAt) {
    const now = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    return Math.max(0, now - startedAt);
  }

  async function evaluateRecommendationQualityAsync(control) {
    const settings = control || {};
    const shouldContinue = typeof settings.shouldContinue === "function" ? settings.shouldContinue : function () { return true; };
    const onMeasure = typeof settings.onMeasure === "function" ? settings.onMeasure : function () {};
    const onProgress = typeof settings.onProgress === "function" ? settings.onProgress : function () {};
    const sourceCount = (getRatings() || []).length;
    const totalWork = Math.max(1, sourceCount * 2 + RANKING_FOLDS + RECOMMENDATION_MODES.length);
    const yieldToBrowser = function () { return new Promise(function (resolve) { setTimeout(resolve, 0); }); };
    const ranking = await evaluateRankingQualityAsync(Object.assign({}, settings, {
      onProgress: function (update) {
        if (!update) return;
        onProgress({
          completedWork: Math.min(totalWork, Number(update.completedWork) || 0),
          totalWork: totalWork,
          detail: update.detail || "Validación del ranking"
        });
      }
    }));
    if (!ranking || !shouldContinue()) return null;

    const diversityStartedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const profile = settings.profile || buildProfile();
    const diversity = [];
    const candidateAvailability = [];
    let completedWork = sourceCount + (ranking.available ? (Number(ranking.count) || 0) : 0) + (Number(ranking.foldsEvaluated) || 0);
    for (const mode of RECOMMENDATION_MODES) {
      if (!shouldContinue()) return null;
      const movies = (getRecommendations(RANKING_CUTOFF, mode, profile) || []).slice(0, RANKING_CUTOFF);
      diversity.push(Object.assign({ mode: mode }, pairwiseGenreDiversity(movies)));
      const counts = typeof getCandidatePoolCounts === "function"
        ? getCandidatePoolCounts(RANKING_CUTOFF, mode, profile)
        : { mode: mode, remoteCandidatesReceived: 0, localCatalogEntries: 0, localCandidatesEligible: 0,
            eligibleCandidatePool: movies.length, rankedResultsAvailable: movies.length,
            requestedResultLimit: RANKING_CUTOFF, profileAvailable: Boolean(profile && profile.count > 0) };
      counts.returnedResultCount = movies.length;
      if (movies.length < RANKING_CUTOFF && counts.profileAvailable) {
        if (counts.eligibleCandidatePool < RANKING_CUTOFF) counts.shortfallReason = "eligible-pool-too-small";
        else if (mode === "balanced") counts.shortfallReason = "balanced-genre-cap";
        else counts.shortfallReason = "ranking-policy-shortfall";
      } else if (!counts.profileAvailable) counts.shortfallReason = "empty-personal-profile";
      else counts.shortfallReason = null;
      candidateAvailability.push(counts);
      completedWork += 1;
      onProgress({ completedWork: Math.min(totalWork, completedWork), totalWork: totalWork, detail: "Diversidad del modo " + mode });
      await yieldToBrowser();
    }
    onMeasure("ranking-diversity", elapsedSince(diversityStartedAt), diversity.reduce(function (sum, item) { return sum + item.titles; }, 0), "completed");
    return { ranking: ranking, diversity: diversity, candidateAvailability: candidateAvailability };
  }

  function genreSet(movie) {
    const genres = Array.isArray(movie && movie.genres) ? movie.genres : [];
    return new Set(genres.map(function (genre) {
      return titleKey(String(genre || "").trim());
    }).filter(Boolean));
  }

  function pairwiseGenreDiversity(movies) {
    const knownSets = movies.map(genreSet).filter(function (genres) { return genres.size > 0; });
    const uniqueGenres = new Set();
    knownSets.forEach(function (genres) {
      genres.forEach(function (genre) { uniqueGenres.add(genre); });
    });
    let distanceSum = 0;
    let pairs = 0;
    for (let left = 0; left < knownSets.length; left += 1) {
      for (let right = left + 1; right < knownSets.length; right += 1) {
        const a = knownSets[left];
        const b = knownSets[right];
        let intersection = 0;
        a.forEach(function (genre) { if (b.has(genre)) intersection += 1; });
        const union = a.size + b.size - intersection;
        if (!union) continue;
        distanceSum += 1 - intersection / union;
        pairs += 1;
      }
    }
    return {
      score: pairs ? distanceSum / pairs : null,
      pairs: pairs,
      titles: movies.length,
      titlesWithGenres: knownSets.length,
      uniqueGenres: uniqueGenres.size
    };
  }

  function evaluateDiversityModes() {
    return RECOMMENDATION_MODES.map(function (mode) {
      const movies = (getRecommendations(RANKING_CUTOFF, mode) || []).slice(0, RANKING_CUTOFF);
      const result = pairwiseGenreDiversity(movies);
      return Object.assign({ mode: mode }, result);
    });
  }

  function evaluateRecommendationQuality() {
    const diversity = evaluateDiversityModes();
    const profile = buildProfile();
    const candidateAvailability = diversity.map(function (item) {
      const counts = typeof getCandidatePoolCounts === "function"
        ? getCandidatePoolCounts(RANKING_CUTOFF, item.mode, profile)
        : { mode: item.mode, eligibleCandidatePool: item.titles, rankedResultsAvailable: item.titles, requestedResultLimit: RANKING_CUTOFF };
      counts.returnedResultCount = item.titles;
      counts.shortfallReason = item.titles >= RANKING_CUTOFF ? null :
        (counts.eligibleCandidatePool < RANKING_CUTOFF ? "eligible-pool-too-small" : (item.mode === "balanced" ? "balanced-genre-cap" : "ranking-policy-shortfall"));
      return counts;
    });
    return {
      ranking: evaluateRankingQuality(),
      diversity: diversity,
      candidateAvailability: candidateAvailability
    };
  }

  return {
    evaluateRankingQuality: evaluateRankingQuality,
    evaluateDiversityModes: evaluateDiversityModes,
    evaluateRecommendationQuality: evaluateRecommendationQuality,
    evaluateRankingQualityAsync: evaluateRankingQualityAsync,
    evaluateRecommendationQualityAsync: evaluateRecommendationQualityAsync
  };
}
