import { movieIdentityKey, movieTmdbId, normalizeMovie, ratingValue, splitList, titleKey, uniqueStrings } from "../core/movie-utils.js";

export function movieMetadataFromJSON(root) {
  const scope = root && root.movies && typeof root.movies === "object" ? root.movies : root;
  const metaById = new Map();
  const metaByTmdb = new Map();
  const arrays = Object.entries(scope || {}).filter(function (entry) { return Array.isArray(entry[1]); });
  arrays.forEach(function (entry) {
    const name = entry[0].toLowerCase();
    if (/rating|rated|calif|^rm$|^rw$|episode|season|^pep$/.test(name)) return;
    entry[1].forEach(function (raw) {
      if (!raw || typeof raw !== "object") return;
      const mediaType = String(raw.media_type || raw.mediaType || raw.type || "").toLowerCase();
      if (mediaType === "tv" || mediaType === "series" || mediaType === "show") return;
      const title = raw.t || raw.title || raw.name || raw.original_title;
      if (!title) return;
      const record = normalizeMovie(raw);
      if (!record) return;
      if (raw.id != null) metaById.set(String(raw.id), record);
      if (raw.tmId != null) metaByTmdb.set(String(raw.tmId), record);
      if (raw.tmdb_id != null) metaByTmdb.set(String(raw.tmdb_id), record);
    });
  });
  return { scope: scope, metaById: metaById, metaByTmdb: metaByTmdb };
}

export function extractPersonalCollections(root) {
  const scope = root && root.movies && typeof root.movies === "object" ? root.movies : root;
  const info = movieMetadataFromJSON(root);
  function findArray(names) {
    for (let i = 0; i < names.length; i += 1) {
      const key = Object.keys(scope || {}).find(function (candidate) { return candidate.toLowerCase() === names[i].toLowerCase(); });
      if (key && Array.isArray(scope[key])) return scope[key];
    }
    return [];
  }
  function convert(raw, type) {
    if (!raw || typeof raw !== "object") return null;
    const rawTmdb = raw.tmId != null ? raw.tmId : (raw.tmdbId != null ? raw.tmdbId : raw.tmdb_id);
    const numericId = Number(rawTmdb);
    const tmdbId = Number.isSafeInteger(numericId) && numericId > 0 ? String(numericId) : null;
    const localId = raw.id != null ? String(raw.id) : "";
    const matched = (tmdbId && info.metaByTmdb.get(tmdbId)) || info.metaById.get(localId) || null;
    const title = raw.t || raw.title || raw.name || (matched && matched.title);
    if (!title) return null;
    const forNormalization = Object.assign({}, matched || {}, raw, {
      id: localId || (matched && matched.id) || tmdbId || titleKey(title),
      title: String(title),
      tmId: tmdbId,
      tmdbId: tmdbId,
      year: (matched && matched.year) || raw.year || null,
      source: "imported-json"
    });
    const movie = normalizeMovie(forNormalization);
    if (!movie) return null;
    if (!tmdbId) movie.tmdbId = null;
    movie.source = "imported-json";
    movie.addedAt = raw.a || raw.addedAt || raw.createdAt || null;
    if (type === "watched") {
      const explicitWatchedAt = raw.watchedAt != null ? raw.watchedAt : raw.watched_at;
      if (explicitWatchedAt != null && explicitWatchedAt !== "") {
        movie.watchedAt = explicitWatchedAt;
        movie.watchedAtSource = "imported-explicit";
      } else {
        delete movie.watchedAt;
        delete movie.watchedAtSource;
      }
    }
    if (type === "pending") movie.addedAt = raw.a || raw.addedAt || raw.createdAt || null;
    if (type === "hidden") movie.hiddenAt = raw.a || raw.hiddenAt || null;
    return movie;
  }
  const watchedRaw = findArray(["cH","watched","history","watched_movies","watchedmovies"]);
  const pendingRaw = findArray(["cW","watchlist","pending","watch_later","watchlater"]);
  const hiddenRaw = findArray(["cHid","hidden","hidden_movies","hiddenmovies"]);
  const watched = watchedRaw.map(function (raw) { return convert(raw, "watched"); }).filter(Boolean);
  const watchlist = pendingRaw.map(function (raw) { return convert(raw, "pending"); }).filter(Boolean);
  const hidden = hiddenRaw.map(function (raw) { return convert(raw, "hidden"); }).filter(Boolean);
  const records = mergeMovieListByTitle([], watched.concat(watchlist, hidden));
  return { watched:watched, watchlist:watchlist, hidden:hidden, records:records };
}

export function hasImportedCollection(collection) {
  return Boolean(collection && ((collection.watched && collection.watched.length) || (collection.watchlist && collection.watchlist.length) || (collection.hidden && collection.hidden.length)));
}

export function isEmptyMovieValue(value) {
  return value == null || value === "" || (Array.isArray(value) && value.length === 0);
}

export function mergeMovieEntries(existing, incoming) {
  const old = existing || {};
  const fresh = incoming || {};
  const merged = Object.assign({}, fresh, old);
  Object.keys(fresh).forEach(function (key) {
    if (isEmptyMovieValue(merged[key]) && !isEmptyMovieValue(fresh[key])) merged[key] = fresh[key];
  });
  merged.genres = uniqueStrings((old.genres || []).concat(fresh.genres || []));
  merged.tags = uniqueStrings((old.tags || []).concat(fresh.tags || []));
  const isExplicitDate = function (record) {
    return Boolean(record && record.watchedAt &&
      (record.watchedAtSource === "imported-explicit" || record.watchedAtSource === "user-confirmed") &&
      Number.isFinite(Date.parse(record.watchedAt)));
  };
  if (isExplicitDate(fresh) && !isExplicitDate(old)) {
    merged.watchedAt = fresh.watchedAt;
    merged.watchedAtSource = fresh.watchedAtSource;
  } else if (isExplicitDate(old)) {
    merged.watchedAt = old.watchedAt;
    merged.watchedAtSource = old.watchedAtSource;
  } else if (fresh.watchedAtSource && !old.watchedAtSource) {
    merged.watchedAt = fresh.watchedAt;
    merged.watchedAtSource = fresh.watchedAtSource;
  }
  return merged;
}

export function mergeMovieListByTitle(existing, incoming) {
  const map = new Map();
  (existing || []).forEach(function (entry) {
    if (entry && entry.title) map.set(movieIdentityKey(entry),entry);
  });
  (incoming || []).forEach(function (entry) {
    if (!entry || !entry.title) return;
    let key = movieIdentityKey(entry);
    let previous = map.get(key);
    if (!previous) {
      const sameTitleWithoutIdentity = Array.from(map.entries()).filter(function (pair) {
        return titleKey(pair[1].title) === titleKey(entry.title) &&
          (!movieTmdbId(pair[1]) || !movieTmdbId(entry));
      });
      if (sameTitleWithoutIdentity.length === 1) {
        const pair = sameTitleWithoutIdentity[0];
        map.delete(pair[0]);
        key = movieTmdbId(entry) ? movieIdentityKey(entry) : pair[0];
        previous = pair[1];
      }
    }
    map.set(key,mergeMovieEntries(previous,entry));
  });
  return Array.from(map.values());
}


export function findRatingArrays(scope) {
  const arrays = Object.entries(scope || {}).filter(function (entry) {
    return Array.isArray(entry[1]) && /^(rm|ratings|ratedmovies|rated_movies|valoraciones|calificaciones|ratingsmovies)$/i.test(entry[0]);
  });
  return arrays.sort(function (a, b) {
    return (/^rm$/i.test(a[0]) ? 0 : 1) - (/^rm$/i.test(b[0]) ? 0 : 1);
  });
}


export function extractPersonalRatings(root) {
  const info = movieMetadataFromJSON(root);
  const scope = info.scope;
  let arrays = findRatingArrays(scope);
  if (!arrays.length) arrays = findRatingArrays(root);
  let rawRatings = [];
  arrays.forEach(function (entry) { rawRatings = rawRatings.concat(entry[1]); });
  const imported = [];
  const seen = new Set();
  rawRatings.forEach(function (raw) {
    if (!raw || typeof raw !== "object") return;
    const rating = ratingValue({ rating: raw.r != null ? raw.r : (raw.rating != null ? raw.rating : raw.score) });
    if (rating == null) return;
    const id = raw.id != null ? String(raw.id) : "";
    const tmId = raw.tmId != null ? String(raw.tmId) : String(raw.tmdb_id || "");
    const meta = info.metaById.get(id) || info.metaByTmdb.get(tmId);
    const title = raw.t || raw.title || raw.name || (meta && meta.title);
    if (!title) return;
    const key = tmId && Number(tmId) > 0 ? "tmdb:" + tmId : "title:" + titleKey(title);
    if (!titleKey(title) || seen.has(key)) return;
    seen.add(key);
    imported.push({
      id: raw.id || (meta && meta.id) || key,
      tmId: raw.tmId || raw.tmdb_id || (meta && meta.tmId) || null,
      title: String(title).replace(/\s*\(((?:19|20)\d{2})\)\s*$/, ""),
      year: (meta && meta.year) || raw.year || null,
      rating: rating,
      genres: meta ? meta.genres : splitList(raw.genres || raw.genre),
      tags: meta ? meta.tags : splitList(raw.tags || raw.keywords),
      emotions: [],
      note: "",
      rA: raw.rA || raw.createdAt || null,
      updatedAt: raw.rA || raw.updatedAt || null,
      source: "imported"
    });
  });
  if (!imported.length && root && Array.isArray(root.rated)) {
    root.rated.forEach(function (raw) {
      const rating = ratingValue(raw);
      if (rating != null && (raw.title || raw.name)) imported.push(Object.assign({}, normalizeMovie(raw), { rating: rating, emotions: raw.emotions || [], note: raw.note || "", updatedAt: raw.updatedAt || null, source: "imported" }));
    });
  }
  return { ratings: imported, metadataRecords: info.metaById.size, ratingArrays: arrays.map(function (item) { return item[0]; }), rawRatingCount: rawRatings.length, skippedRatings: Math.max(0, rawRatings.length - imported.length) };
}
