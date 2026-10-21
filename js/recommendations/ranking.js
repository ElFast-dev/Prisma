export function createRecommendationRanking(ctx) {
  const validModes = ["balanced", "affinity", "variety"];

  function requestedMode(mode) {
    return validModes.includes(mode) ? mode : "balanced";
  }

  function compareAffinity(a, b) {
    return b.prediction.score - a.prediction.score ||
      b.prediction.matches.length - a.prediction.matches.length ||
      a.title.localeCompare(b.title);
  }

  function mainGenre(movie) {
    return movie.genres && movie.genres.length ? String(movie.genres[0]) : "Otros";
  }

  function getBalancedRecommendations(results, limit) {
    const ordered = results.slice().sort(function (a, b) {
      const aScore = a.prediction.score + Math.min(a.prediction.freshFeatures || 0, 3) * 0.025;
      const bScore = b.prediction.score + Math.min(b.prediction.freshFeatures || 0, 3) * 0.025;
      return bScore - aScore || b.prediction.matches.length - a.prediction.matches.length || a.title.localeCompare(b.title);
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

  function getRecommendations(limit, mode) {
    const requestedLimit = Math.max(1, Number(limit) || 8);
    const activeMode = requestedMode(mode);
    const profile = ctx.buildProfile();
    const results = ctx.uniqueDiscoveryMovies(ctx.catalog).filter(function (movie) {
      return !ctx.isMovieInCollection(movie.title, movie.tmdbId) && movie.source !== "history";
    }).map(function (movie) {
      const prediction = ctx.predictRating(movie, profile);
      return Object.assign({}, movie, { prediction: prediction });
    });

    if (activeMode === "affinity") {
      return results.sort(compareAffinity).slice(0, requestedLimit);
    }
    if (activeMode === "variety") {
      return getVariedRecommendations(results, requestedLimit);
    }
    return getBalancedRecommendations(results, requestedLimit);
  }

  function genreStats() {
    const stats = new Map();
    ctx.state.rated.forEach(function (entry) {
      const movie = ctx.findMovie(entry.title,entry.tmdbId || entry.tmId);
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

  return { getRecommendations, genreStats };
}
