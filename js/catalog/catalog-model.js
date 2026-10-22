import { findMovieRecordMatch } from "../core/movie-utils.js";

export function createCatalogModel(dependencies) {
  const getCustomCatalog = dependencies.getCustomCatalog;
  const getState = dependencies.getState;
  const getCatalog = dependencies.getCatalog;
  const getCatalogByTitle = dependencies.getCatalogByTitle;
  const setCatalog = dependencies.setCatalog;
  const setCatalogByTitle = dependencies.setCatalogByTitle;
  const normalizeMovie = dependencies.normalizeMovie;
  const titleKey = dependencies.titleKey;
  const movieTmdbId = dependencies.movieTmdbId;
  const movieIdentityKey = dependencies.movieIdentityKey;
  const uniqueStrings = dependencies.uniqueStrings;
  const ratingValue = dependencies.ratingValue;
  const movieFeatures = dependencies.movieFeatures;

function mergeCatalogFields(target, source) {
    ["genres","tags","productionCountries","spokenLanguages","productionCompanies","cast","directors","writers","composers"].forEach(function (field) {
      target[field] = uniqueStrings((target[field] || []).concat(source[field] || []));
    });
    ["year","overview","posterPath","posterUrl","voteAverage","voteCount","runtime","releaseDate","backdropPath","backdropUrl","tagline","status","originalLanguage","collectionName","imdbId","tmdbCreditsFetchedAt","tmdbKeywordsFetchedAt","tmdbFetchedAt","metadataSource"].forEach(function (field) {
      const current = target[field];
      const empty = current == null || current === "" || (Array.isArray(current) && current.length === 0);
      const incoming = source[field];
      const incomingEmpty = incoming == null || incoming === "" || (Array.isArray(incoming) && incoming.length === 0);
      if (empty && !incomingEmpty) target[field] = incoming;
    });
    if (!target.tmdbId && source.tmdbId) target.tmdbId = source.tmdbId;
    if (!target.id && source.id) target.id = source.id;
    return target;
  }

  function combineMovies() {
    const grouped = new Map();
    const state = getState();
    const baseRecords = getCustomCatalog().concat(state.watched || [], state.watchlist || [], state.hidden || []);
    const baseIdentities = new Set();
    function collect(raw, isBase) {
      const movie = normalizeMovie(raw);
      if (!movie) return;
      const title = titleKey(movie.title);
      if (!title) return;
      if (!grouped.has(title)) grouped.set(title, []);
      grouped.get(title).push({movie:movie,isBase:Boolean(isBase)});
      if (isBase) baseIdentities.add(movieIdentityKey(movie));
    }
    baseRecords.forEach(function (movie) { collect(movie,true); });
    (state.rated || []).forEach(function (movie) { collect(movie,false); });

    const combined = [];
    grouped.forEach(function (items) {
      const byTmdb = new Map();
      const noIdGroups = new Map();
      const knownYears = new Set(items.map(function (record) {
        return Number(record.movie.year) || 0;
      }).filter(Boolean));

      items.forEach(function (record) {
        const movie = record.movie;
        const tmdbId = movieTmdbId(movie);
        if (!tmdbId) {
          const year = Number(movie.year) || 0;
          const key = year ? "year:" + year : "unknown-year";
          const prior = noIdGroups.get(key);
          if (prior) {
            mergeCatalogFields(prior.movie,movie);
            prior.isBase = prior.isBase || record.isBase;
          } else {
            noIdGroups.set(key,{movie:Object.assign({},movie),isBase:record.isBase});
          }
          return;
        }
        if (byTmdb.has(tmdbId)) {
          const prior = byTmdb.get(tmdbId);
          mergeCatalogFields(prior.movie,movie);
          prior.isBase = prior.isBase || record.isBase;
        } else {
          byTmdb.set(tmdbId,{movie:Object.assign({},movie),isBase:record.isBase});
        }
      });

      noIdGroups.forEach(function (noIdRecord) {
        const noId = noIdRecord.movie;
        const noIdYear = Number(noId.year) || 0;
        const candidates = Array.from(byTmdb.values()).filter(function (record) {
          const candidateYear = Number(record.movie.year) || 0;
          if (noIdYear && candidateYear) return noIdYear === candidateYear;
          // An unknown year may be reconciled only if the title has no competing
          // known year and only one TMDB identity; otherwise it may be a remake.
          if (byTmdb.size !== 1 || knownYears.size > 1) return false;
          return true;
        });

        if (candidates.length === 1) {
          mergeCatalogFields(candidates[0].movie,noId);
          candidates[0].isBase = candidates[0].isBase || noIdRecord.isBase;
        } else {
          noId.key = movieIdentityKey(noId);
          if (!noIdRecord.isBase) noId.source = "history";
          combined.push(noId);
        }
      });

      byTmdb.forEach(function (record) {
        const movie = record.movie;
        movie.key = movieIdentityKey(movie);
        if (!record.isBase && !baseIdentities.has(movie.key)) movie.source = "history";
        combined.push(movie);
      });
    });
    const nextCatalog = combined.sort(function (a,b) {
      return a.title.localeCompare(b.title,"es") ||
        (Number(a.year) || 0) - (Number(b.year) || 0) ||
        String(movieTmdbId(a)).localeCompare(String(movieTmdbId(b)));
    });
    const nextCatalogByTitle = new Map();
    nextCatalog.forEach(function (movie) {
      const title = titleKey(movie.title);
      if (!nextCatalogByTitle.has(title)) nextCatalogByTitle.set(title,movie);
    });
    setCatalog(nextCatalog);
    setCatalogByTitle(nextCatalogByTitle);
  }

  function findMovie(title, tmdbId, year) {
    const target = {title:title,tmdbId:tmdbId,year:year};
    const catalog = getCatalog();
    const id = movieTmdbId(target);
    if (id) {
      const exact = catalog.find(function (movie) { return movieTmdbId(movie) === id; });
      if (exact) return exact;
    }
    return findMovieRecordMatch(target,catalog);
  }

  function ratingFor(title, tmdbId, year) {
    const state = getState();
    return findMovieRecordMatch({title:title,tmdbId:tmdbId,year:year},state.rated || []);
  }


  function allGenres() {
    return uniqueStrings(getCatalog().reduce(function (all, movie) { return all.concat(movie.genres || []); }, []))
      .sort(function (a, b) { return a.localeCompare(b, "es"); });
  }

   function summaryStats() {
    const state = getState();
    const catalog = getCatalog();
    const ratings = state.rated.map(ratingValue).filter(function (value) { return value != null; });
    const average = ratings.length ? ratings.reduce(function (sum, value) { return sum + value; }, 0) / ratings.length : null;
    const matched = state.rated.filter(function (entry) {
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId,entry.year);
      return movieFeatures(movie, entry).length > 0;
    }).length;
    return {
      total: ratings.length,
      average: average,
      high: ratings.filter(function (value) { return value >= 8; }).length,
      tens: ratings.filter(function (value) { return value === 10; }).length,
      matched: matched,
      watchlist: state.watchlist.length,
      catalog: catalog.length
    };
  }

  return { mergeCatalogFields, combineMovies, findMovie, ratingFor, allGenres, summaryStats };
}
