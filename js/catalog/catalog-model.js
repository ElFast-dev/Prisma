export function createCatalogModel(dependencies) {
  const getSeedCatalog = dependencies.getSeedCatalog;
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
    target.genres = uniqueStrings((target.genres || []).concat(source.genres || []));
    target.tags = uniqueStrings((target.tags || []).concat(source.tags || []));
    ["year","overview","posterPath","posterUrl","voteAverage","voteCount","runtime","releaseDate","backdropPath","backdropUrl","tagline","status","productionCountries","imdbId","tmdbFetchedAt","metadataSource"].forEach(function (field) {
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
    const baseRecords = getSeedCatalog().concat(getCustomCatalog(), state.watched || [], state.watchlist || [], state.hidden || []);
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
      let noId = null;
      let noIdHasBase = false;
      items.forEach(function (record) {
        const movie = record.movie;
        const tmdbId = movieTmdbId(movie);
        if (!tmdbId) {
          noId = noId ? mergeCatalogFields(noId,movie) : Object.assign({},movie);
          noIdHasBase = noIdHasBase || record.isBase;
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

      if (!byTmdb.size) {
        if (noId) {
          noId.key = movieIdentityKey(noId);
          if (!noIdHasBase) noId.source = "history";
          combined.push(noId);
        }
        return;
      }
      if (byTmdb.size === 1 && noId) {
        const only = Array.from(byTmdb.values())[0];
        mergeCatalogFields(only.movie,noId);
        only.isBase = only.isBase || noIdHasBase;
      }
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

  function findMovie(title, tmdbId) {
    const id = movieTmdbId({tmdbId:tmdbId});
    const catalog = getCatalog();
    if (id) return catalog.find(function (movie) { return movieTmdbId(movie) === id; }) || null;
    return getCatalogByTitle().get(titleKey(title)) || null;
  }

  function ratingFor(title, tmdbId) {
    const state = getState();
    const id = movieTmdbId({tmdbId:tmdbId});
    const key = titleKey(title);
    if (id) {
      const exactMatch = state.rated.find(function (entry) { return movieTmdbId(entry) === id; });
      if (exactMatch) return exactMatch;
      const sameTitle = state.rated.filter(function (entry) { return titleKey(entry.title) === key; });
      const noIdMatches = sameTitle.filter(function (entry) { return !movieTmdbId(entry); });
      return sameTitle.length === 1 && noIdMatches.length === 1 ? noIdMatches[0] : null;
    }
    return state.rated.find(function (entry) { return titleKey(entry.title) === key; }) || null;
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
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId);
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
