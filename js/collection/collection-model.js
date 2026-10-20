export function createCollectionModel(dependencies) {
  const getState = dependencies.getState;
  const getCollectionTab = dependencies.getCollectionTab;
  const getCollectionQuery = dependencies.getCollectionQuery;
  const getCollectionGenres = dependencies.getCollectionGenres;
  const getOnlyReleased = dependencies.getOnlyReleased;
  const getCollectionSort = dependencies.getCollectionSort;
  const getCollectionDirection = dependencies.getCollectionDirection;
  const findMovie = dependencies.findMovie;
  const titleKey = dependencies.titleKey;
  const displayGenre = dependencies.displayGenre;
  const movieIdentityKey = dependencies.movieIdentityKey;
  const movieTmdbId = dependencies.movieTmdbId;
  const ratingValue = dependencies.ratingValue;
  const sameMovieRecord = dependencies.sameMovieRecord;
  const hasTrustedTMDBScore = dependencies.hasTrustedTMDBScore;

function dateScore(value) {
    if (!value) return 0;
    const number = new Date(value).getTime();
    return Number.isFinite(number) ? number : 0;
  }

  function latestRecordDate(entry) {
    return entry && (entry.watchedAt || entry.addedAt || entry.rA || entry.date || entry.updatedAt || null);
  }

  function enrichCollectionMovie(entry) {
    const stored = entry || {};
    const known = findMovie(stored.title,stored.tmdbId || stored.tmId) || {};
    const result = Object.assign({},known,stored);
    ["posterUrl","posterPath","overview","releaseDate","backdropUrl","runtime","voteAverage","voteCount","tmdbId","status","imdbId"].forEach(function (key) {
      if (!result[key]) result[key] = known[key] || (key === "posterUrl" ? "" : null);
    });
    if (!Array.isArray(result.genres) || !result.genres.length) result.genres = known.genres || [];
    if (!Array.isArray(result.tags) || !result.tags.length) result.tags = known.tags || [];
    result.watchedAt = result.watchedAt || latestRecordDate(stored);
    return result;
  }

  function getCollectionItems(tab) {
    const state = getState();
    const collectionTab = getCollectionTab();
    const collectionQuery = getCollectionQuery();
    const collectionGenres = getCollectionGenres();
    const onlyReleased = getOnlyReleased();
    const collectionSort = getCollectionSort();
    const collectionDirection = getCollectionDirection();
    const key = tab || collectionTab;
    let items = [];
    if (key === "history") {
      const map = new Map();
      (state.watched || []).forEach(function (entry) {
        if (entry && entry.title) map.set(movieIdentityKey(entry),enrichCollectionMovie(entry));
      });
      state.rated.forEach(function (entry) {
        if (!entry || !entry.title) return;
        const identity = movieIdentityKey(entry);
        const prior = map.get(identity) || {};
        map.set(identity,enrichCollectionMovie(Object.assign({},prior,entry,{
          rating:ratingValue(entry),
          watchedAt:prior.watchedAt || latestRecordDate(entry)
        })));
      });
      items = Array.from(map.values()).filter(function (item) {
        return !(state.hidden || []).some(function (hidden) { return sameMovieRecord(hidden,item); });
      });
    } else if (key === "pending") {
      items = (state.watchlist || []).map(enrichCollectionMovie).filter(function (item) {
        return !(state.hidden || []).some(function (hidden) { return sameMovieRecord(hidden,item); });
      });
    } else {
      items = (state.hidden || []).map(enrichCollectionMovie);
    }
    const query = titleKey(collectionQuery);
    if (query) {
      items = items.filter(function (item) {
        return titleKey([item.title,item.year,item.overview,(item.genres || []).join(" ")].join(" ")).indexOf(query) >= 0;
      });
    }
    if (collectionGenres.length) {
      items = items.filter(function (item) {
        const genres = (item.genres || []).map(function (genre) { return titleKey(displayGenre(genre)); });
        return collectionGenres.some(function (genre) { return genres.indexOf(titleKey(genre)) >= 0; });
      });
    }
    if (key === "pending" && onlyReleased) {
      const now = new Date();
      const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
      items = items.filter(function (item) {
        if (item.releaseDate) return item.releaseDate <= today;
        return item.year && Number(item.year) <= now.getFullYear();
      });
    }
    const multiplier = collectionDirection === "asc" ? 1 : -1;
    if (collectionSort === "random") items.sort(function () { return Math.random() - .5; });
    else items.sort(function (a,b) {
      let result = 0;
      if (collectionSort === "title") result = String(a.title || "").localeCompare(String(b.title || ""),"es");
      else if (collectionSort === "rating") result = (ratingValue(a) || 0) - (ratingValue(b) || 0);
      else if (collectionSort === "public") result = (hasTrustedTMDBScore(a) ? Number(a.voteAverage) : 0) - (hasTrustedTMDBScore(b) ? Number(b.voteAverage) : 0);
      else if (collectionSort === "runtime") result = (Number(a.runtime) || 0) - (Number(b.runtime) || 0);
      else if (collectionSort === "release") result = dateScore(a.releaseDate) - dateScore(b.releaseDate) || (Number(a.year) || 0) - (Number(b.year) || 0);
      else result = dateScore(latestRecordDate(a)) - dateScore(latestRecordDate(b));
      return result * multiplier || String(a.title || "").localeCompare(String(b.title || ""),"es") || String(movieTmdbId(a)).localeCompare(String(movieTmdbId(b)));
    });
    return items;
  }

  function isInHistory(title, tmdbId) {
    const state = getState();
    const target = {title:title,tmdbId:tmdbId};
    return state.rated.some(function (entry) { return sameMovieRecord(entry,target); }) ||
      (state.watched || []).some(function (entry) { return sameMovieRecord(entry,target); });
  }

  function isHidden(title, tmdbId) {
    const state = getState();
    const target = {title:title,tmdbId:tmdbId};
    return (state.hidden || []).some(function (entry) { return sameMovieRecord(entry,target); });
  }

  function isInWatchlist(title, tmdbId) {
    const state = getState();
    const target = {title:title,tmdbId:tmdbId};
    return (state.watchlist || []).some(function (entry) { return sameMovieRecord(entry,target); });
  }

  function isMovieInCollection(title, tmdbId) {
    return isInHistory(title,tmdbId) || isInWatchlist(title,tmdbId) || isHidden(title,tmdbId);
  }

  return {
    dateScore,
    latestRecordDate,
    enrichCollectionMovie,
    getCollectionItems,
    isInHistory,
    isHidden,
    isInWatchlist,
    isMovieInCollection
  };
}
