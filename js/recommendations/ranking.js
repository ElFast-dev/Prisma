export function createRecommendationRanking(ctx) {
  function getRecommendations(limit) {
    const profile = ctx.buildProfile();
    const results = ctx.uniqueDiscoveryMovies(ctx.catalog).filter(function (movie) {
      return !ctx.isMovieInCollection(movie.title,movie.tmdbId) && movie.source !== "history";
    }).map(function (movie) {
      const prediction = ctx.predictRating(movie, profile);
      return Object.assign({}, movie, { prediction: prediction });
    });
    results.sort(function (a, b) {
      const aScore = a.prediction.score + Math.min(a.prediction.freshFeatures, 3) * 0.025;
      const bScore = b.prediction.score + Math.min(b.prediction.freshFeatures, 3) * 0.025;
      return bScore - aScore || b.prediction.matches.length - a.prediction.matches.length || a.title.localeCompare(b.title);
    });
    const selected = [];
    const genreCounts = new Map();
    results.forEach(function (movie) {
      if (selected.length >= (limit || 8)) return;
      const mainGenre = (movie.genres && movie.genres[0]) || "Otros";
      if ((genreCounts.get(mainGenre) || 0) >= 2 && results.length > (limit || 8) * 1.4) return;
      selected.push(movie);
      genreCounts.set(mainGenre, (genreCounts.get(mainGenre) || 0) + 1);
    });
    return selected;
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
