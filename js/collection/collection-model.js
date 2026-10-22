import { findMovieRecordMatch } from "../core/movie-utils.js";

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
    const known = findMovie(stored.title,stored.tmdbId || stored.tmId,stored.year) || {};
    const result = Object.assign({},known,stored);
    ["posterUrl","posterPath","overview","releaseDate","backdropUrl","runtime","voteAverage","voteCount","tmdbId","status","imdbId"].forEach(function (key) {
      if (!result[key]) result[key] = known[key] || (key === "posterUrl" ? "" : null);
    });
    if (!Array.isArray(result.genres) || !result.genres.length) result.genres = known.genres || [];
    if (!Array.isArray(result.tags) || !result.tags.length) result.tags = known.tags || [];
    if (stored.watchedAtSource === "action-time" ||
      (stored.watchDateConfidence === "pre-streak-unverified" &&
        stored.watchedAtSource !== "user-confirmed")) {
      delete result.watchedAt;
    } else {
      result.watchedAt = stored.watchedAt || null;
    }
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
      const historyItems = [];
      (state.watched || []).forEach(function (entry) {
        if (!entry || !entry.title) return;
        const matched = findMovieRecordMatch(entry,historyItems);
        if (matched) {
          const index = historyItems.indexOf(matched);
          historyItems[index] = enrichCollectionMovie(Object.assign({},matched,entry));
        } else {
          historyItems.push(enrichCollectionMovie(entry));
        }
      });
      (state.rated || []).forEach(function (entry) {
        if (!entry || !entry.title) return;
        const prior = findMovieRecordMatch(entry,historyItems);
        const priorIndex = prior ? historyItems.indexOf(prior) : -1;
        const combinedConfidence = entry.watchDateConfidence || (prior && prior.watchDateConfidence) || "";
        const confirmedDate = [prior, entry].some(function (record) {
          return record && record.watchedAt && record.watchedAtSource === "user-confirmed";
        });
        const combined = Object.assign({},prior || {},entry,{ rating:ratingValue(entry) });
        if (combinedConfidence) combined.watchDateConfidence = combinedConfidence;
        if (combinedConfidence === "pre-streak-unverified" && !confirmedDate) {
          delete combined.watchedAt;
        } else {
          combined.watchedAt = (prior && prior.watchedAt) || entry.watchedAt || null;
        }
        const enriched = enrichCollectionMovie(combined);
        if (priorIndex >= 0) historyItems[priorIndex] = enriched;
        else historyItems.push(enriched);
      });
      items = historyItems.filter(function (item) {
        return !findMovieRecordMatch(item,state.hidden || []);
      });
    } else if (key === "pending") {
      items = (state.watchlist || []).map(enrichCollectionMovie).filter(function (item) {
        return !findMovieRecordMatch(item,state.hidden || []);
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

  function isInHistory(title, tmdbId, year) {
    const state = getState();
    const target = {title:title,tmdbId:tmdbId,year:year};
    return Boolean(findMovieRecordMatch(target,state.rated || []) ||
      findMovieRecordMatch(target,state.watched || []));
  }

  function isHidden(title, tmdbId, year) {
    const state = getState();
    const target = {title:title,tmdbId:tmdbId,year:year};
    return Boolean(findMovieRecordMatch(target,state.hidden || []));
  }

  function isInWatchlist(title, tmdbId, year) {
    const state = getState();
    const target = {title:title,tmdbId:tmdbId,year:year};
    return Boolean(findMovieRecordMatch(target,state.watchlist || []));
  }

  function isMovieInCollection(title, tmdbId, year) {
    return isInHistory(title,tmdbId,year) ||
      isInWatchlist(title,tmdbId,year) ||
      isHidden(title,tmdbId,year);
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
