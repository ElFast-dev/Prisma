export function createRecommendationRanking(ctx) {
  const validModes = ["balanced", "affinity", "variety"];

  function requestedMode(mode) {
    return validModes.includes(mode) ? mode : "balanced";
  }

  function compareAffinity(a, b) {
    return b.prediction.score - a.prediction.score ||
      ((b.prediction.matches || []).length - (a.prediction.matches || []).length) ||
      a.title.localeCompare(b.title);
  }

  function mainGenre(movie) {
    return movie.genres && movie.genres.length ? String(movie.genres[0]) : "Otros";
  }

  function getBalancedRecommendations(results, limit) {
    const ordered = results.slice().sort(function (a, b) {
      const aScore = a.prediction.score + Math.min(a.prediction.freshFeatures || 0, 3) * 0.025;
      const bScore = b.prediction.score + Math.min(b.prediction.freshFeatures || 0, 3) * 0.025;
      return bScore - aScore || ((b.prediction.matches || []).length - (a.prediction.matches || []).length) || a.title.localeCompare(b.title);
    });
    const selected = [];
    const genreCounts = new Map();
    ordered.forEach(function (movie) {
      if (selected.length >= limit) return;
      const genre = mainGenre(movie);
      if ((genreCounts.get(genre) || 0) >= 2 && ordered.length > limit * 1.4) return;
      selected.push(movie);
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    });
    return selected;
  }

  function getVariedRecommendations(results, limit) {
    const remaining = results.slice();
    const selected = [];
    const genreCounts = new Map();

    while (selected.length < limit && remaining.length) {
      let bestIndex = 0;
      let bestScore = -Infinity;
      remaining.forEach(function (movie, index) {
        const genres = Array.from(new Set((movie.genres || []).slice(0, 3).map(function (genre) {
          return String(genre || "").trim() || "Otros";
        })));
        const knownGenres = genres.length ? genres : ["Otros"];
        const averageRepresentation = knownGenres.reduce(function (sum, genre) {
          return sum + (genreCounts.get(genre) || 0);
        }, 0) / knownGenres.length;
        const unseenShare = knownGenres.filter(function (genre) {
          return !genreCounts.has(genre);
        }).length / knownGenres.length;
        const freshBonus = Math.min(movie.prediction.freshFeatures || 0, 3) * 0.025;
        // Diversity is a modest tie-breaker, not a substitute for predicted affinity.
        const score = movie.prediction.score + freshBonus +
          unseenShare * 0.45 - averageRepresentation * 0.25;

        if (score > bestScore || (score === bestScore && compareAffinity(movie, remaining[bestIndex]) < 0)) {
          bestScore = score;
          bestIndex = index;
        }
      });

      const [movie] = remaining.splice(bestIndex, 1);
      selected.push(movie);
      const genres = Array.from(new Set((movie.genres || []).slice(0, 3).map(function (genre) {
        return String(genre || "").trim() || "Otros";
      })));
      (genres.length ? genres : ["Otros"]).forEach(function (genre) {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      });
    }

    return selected;
  }

  // Pure ranking function shared by Discover and offline evaluation.
  function rankCandidates(results, limit, mode) {
    const requestedLimit = Math.max(1, Number(limit) || 8);
    const activeMode = requestedMode(mode);
    const candidates = Array.isArray(results) ? results.slice() : [];
    if (activeMode === "affinity") {
      return candidates.sort(compareAffinity).slice(0, requestedLimit);
    }
    if (activeMode === "variety") {
      return getVariedRecommendations(candidates, requestedLimit);
    }
    return getBalancedRecommendations(candidates, requestedLimit);
  }

  function eligibleCandidates(source) {
    const rows = Array.isArray(source) ? source : [];
    return ctx.uniqueDiscoveryMovies(rows).filter(function (movie) {
      return !ctx.isMovieInCollection(movie.title,movie.tmdbId,movie.year) && movie.source !== "history";
    });
  }

  // Aggregate-only pool accounting for diagnostics. This deliberately does not alter active ranking.
  function getCandidatePoolCounts(limit, mode, profileOverride) {
    const requestedResultLimit = Math.max(1, Number(limit) || 8);
    const localSource = Array.isArray(ctx.catalog) ? ctx.catalog : [];
    const remoteSource = Array.isArray(ctx.recommendationCandidates) ? ctx.recommendationCandidates : [];
    const localCandidatesEligible = eligibleCandidates(localSource).length;
    const eligibleCandidatePool = eligibleCandidates(localSource.concat(remoteSource)).length;
    const profile = profileOverride || ctx.buildProfile();
    const profileAvailable = Boolean(profile && profile.count > 0);
    const rankedResultsAvailable = profileAvailable ? eligibleCandidatePool : 0;
    let shortfallReason = null;
    if (!profileAvailable) shortfallReason = "empty-personal-profile";
    else if (eligibleCandidatePool < requestedResultLimit) shortfallReason = "eligible-pool-too-small";
    return {
      mode: requestedMode(mode),
      remoteCandidatesReceived: remoteSource.length,
      localCatalogEntries: localSource.length,
      localCandidatesEligible: localCandidatesEligible,
      eligibleCandidatePool: eligibleCandidatePool,
      rankedResultsAvailable: rankedResultsAvailable,
      requestedResultLimit: requestedResultLimit,
      returnedResultCount: 0,
      profileAvailable: profileAvailable,
      shortfallReason: shortfallReason
    };
  }

  function getRecommendations(limit, mode, profileOverride) {
    const requestedLimit = Math.max(1, Number(limit) || 8);
    const profile = profileOverride || ctx.buildProfile();

    // A profile with no valid personal ratings must not receive fabricated
    // personalized recommendations. Discovery remains available elsewhere.
    // Keep this guard here (rather than in rankCandidates) so offline evaluation
    // can still rank explicit, already-scored synthetic candidates.
    if (profile && profile.count === 0) return [];

    const results = eligibleCandidates((ctx.catalog || []).concat(ctx.recommendationCandidates || []))
      .map(function (movie) {
        const prediction = ctx.predictRating(movie, profile);
        return Object.assign({}, movie, { prediction: prediction });
      });
    return rankCandidates(results, requestedLimit, mode);
  }

  function genreStats() {
    const stats = new Map();
    ctx.state.rated.forEach(function (entry) {
      const movie = ctx.findMovie(entry.title,entry.tmdbId || entry.tmId,entry.year || entry.releaseYear || entry.release_year);
      const rating = ctx.ratingValue(entry);
      if (rating == null) return;
      const genres = (entry.genres && entry.genres.length ? entry.genres : (movie && movie.genres)) || [];
      genres.forEach(function (genre) {
        const current = stats.get(genre) || { sum: 0, count: 0 };
        current.sum += rating;
        current.count += 1;
        stats.set(genre, current);
      });
    });
    return Array.from(stats.entries()).map(function (entry) {
      return { name: entry[0], average: entry[1].sum / entry[1].count, count: entry[1].count };
    }).filter(function (item) { return item.count >= 2; }).sort(function (a, b) { return b.average - a.average; });
  }

  return { getRecommendations, genreStats, rankCandidates, getCandidatePoolCounts };
}
