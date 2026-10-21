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
      const movie = findMovie(entry.title, entry.tmdbId || entry.tmId);
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
    return {
      ranking: evaluateRankingQuality(),
      diversity: evaluateDiversityModes()
    };
  }

  return {
    evaluateRankingQuality: evaluateRankingQuality,
    evaluateDiversityModes: evaluateDiversityModes,
    evaluateRecommendationQuality: evaluateRecommendationQuality
  };
}
