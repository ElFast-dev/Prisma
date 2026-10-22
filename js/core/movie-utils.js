const GENRE_LABELS = {
  "science fiction": "Ciencia ficción", "sci-fi": "Ciencia ficción", "sci fi": "Ciencia ficción",
  "thriller": "Suspenso", "suspense": "Suspenso", "mystery": "Misterio", "crime": "Crimen", "drama": "Drama",
  "action": "Acción", "adventure": "Aventura", "fantasy": "Fantasía", "romance": "Romance",
  "comedy": "Comedia", "horror": "Terror", "animation": "Animación", "anime": "Anime",
  "war": "Bélica", "sport": "Deportes", "sports": "Deportes", "family": "Familiar",
  "biography": "Biografía", "music": "Música", "history": "Historia", "documentary": "Documental"
};

function genreLookupKey(value) {
  return String(value || "").trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const NORMALIZED_GENRE_LABELS = Object.create(null);
Object.keys(GENRE_LABELS).forEach(function (alias) {
  const label = GENRE_LABELS[alias];
  NORMALIZED_GENRE_LABELS[genreLookupKey(alias)] = label;
  NORMALIZED_GENRE_LABELS[genreLookupKey(label)] = label;
});

export function escapeHTML(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

export function titleKey(value) {
  return String(value || "")
    .replace(/\s*\((19|20)\d{2}\)\s*$/, "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

export function movieTmdbId(entry) {
  const raw = entry && (entry.tmdbId || entry.tmId || entry.tmdb_id);
  const numeric = Number(raw);
  return Number.isSafeInteger(numeric) && numeric > 0 ? String(numeric) : "";
}

export function movieYear(entry) {
  const values = [entry && entry.year, entry && entry.releaseYear, entry && entry.release_year];
  for (const value of values) {
    const year = Number(value);
    if (Number.isSafeInteger(year) && year >= 1870 && year <= 2200) return year;
  }
  const match = String(entry && entry.title || "").match(/\(((?:19|20)\d{2})\)\s*$/);
  return match ? Number(match[1]) : 0;
}

export function movieIdentityKey(entry) {
  const id = movieTmdbId(entry);
  if (id) return "tmdb:" + id;
  const title = titleKey(entry && entry.title);
  const year = movieYear(entry);
  return "title:" + title + ":year:" + (year || "unknown");
}

/**
 * Compare records conservatively: a positive TMDB ID is authoritative, while
 * title fallback requires matching years whenever either record has one.
 * Two legacy title-only rows without any year still share the old fallback.
 */
export function sameMovieRecord(left, right) {
  if (!left || !right) return false;
  const leftId = movieTmdbId(left);
  const rightId = movieTmdbId(right);
  // Pairwise equality is strict: a missing ID can only be reconciled contextually.
  if (leftId || rightId) return Boolean(leftId && rightId && leftId === rightId);
  const leftTitle = titleKey(left.title);
  const rightTitle = titleKey(right.title);
  if (!leftTitle || leftTitle !== rightTitle) return false;
  const leftYear = movieYear(left);
  const rightYear = movieYear(right);
  if (leftYear || rightYear) return Boolean(leftYear && rightYear && leftYear === rightYear);
  return true;
}

/** Discovery can merge a legacy row with another identity only when this pair is unambiguous. */
export function sameDiscoveryMovie(left, right) {
  return Boolean(findMovieRecordMatch(left, [right]));
}

/**
 * Resolve a record against a collection. IDs are authoritative; records missing
 * an ID/year are reconciled only when title, known year, and the full candidate
 * set leave a single non-conflicting match.
 */
export function findMovieRecordMatch(entry, records) {
  if (!entry || !titleKey(entry.title)) return null;
  const title = titleKey(entry.title);
  const sameTitle = (records || []).filter(function (record) {
    return record && titleKey(record.title) === title;
  });
  if (!sameTitle.length) return null;

  const entryId = movieTmdbId(entry);
  const entryYear = movieYear(entry);

  if (entryId) {
    const exactId = sameTitle.find(function (record) { return movieTmdbId(record) === entryId; });
    if (exactId) return exactId;

    const untagged = sameTitle.filter(function (record) {
      if (movieTmdbId(record)) return false;
      const year = movieYear(record);
      return !(entryYear && year && entryYear !== year);
    });
    if (untagged.length !== 1) return null;
    const candidate = untagged[0];
    const candidateYear = movieYear(candidate);
    const conflictingIdentity = sameTitle.some(function (record) {
      const id = movieTmdbId(record);
      if (!id || id === entryId) return false;
      const year = movieYear(record);
      // Another known identity at the same or unknown year makes the legacy row ambiguous.
      return !(entryYear && year && entryYear !== year) &&
        !(candidateYear && year && candidateYear !== year);
    });
    return conflictingIdentity ? null : candidate;
  }

  if (entryYear) {
    const compatible = sameTitle.filter(function (record) {
      const year = movieYear(record);
      return !year || year === entryYear;
    });
    return compatible.length === 1 ? compatible[0] : null;
  }

  // Without ID or year, only a single title candidate is safe to resolve.
  return sameTitle.length === 1 ? sameTitle[0] : null;
}

function discoveryMetadataScore(movie) {
  return ["year","posterPath","posterUrl","overview","genres","tags","cast","directors","writers","composers",
    "productionCountries","productionCompanies","originalLanguage","collectionName","runtime"].reduce(function (score, field) {
      const value = movie && movie[field];
      return score + (Array.isArray(value) ? (value.length ? 1 : 0) : (value != null && value !== "" ? 1 : 0));
    }, 0);
}

function mergeDiscoveryRecord(existing, incoming) {
  const existingId = movieTmdbId(existing);
  const incomingId = movieTmdbId(incoming);
  const preferred = (incomingId && !existingId) ||
    (Boolean(incomingId) === Boolean(existingId) && discoveryMetadataScore(incoming) > discoveryMetadataScore(existing))
    ? incoming : existing;
  const secondary = preferred === incoming ? existing : incoming;
  const merged = Object.assign({}, secondary, preferred);
  Object.keys(preferred || {}).forEach(function (key) {
    const value = preferred[key];
    if (value == null || value === "" || (Array.isArray(value) && !value.length)) merged[key] = secondary[key] || value;
  });
  ["genres","tags","cast","directors","writers","composers","productionCountries","productionCompanies","spokenLanguages"].forEach(function (field) {
    merged[field] = uniqueStrings((existing[field] || []).concat(incoming[field] || []));
  });
  return merged;
}

export function uniqueDiscoveryMovies(movies) {
  // First collapse only identities that are already exact. Reconciliation is
  // a second pass so a title-only row cannot be attached to whichever remake
  // happened to appear first in the input list.
  const unique = [];
  (movies || []).forEach(function (movie) {
    if (!movie || !titleKey(movie.title)) return;
    const exactIndex = unique.findIndex(function (existing) {
      return sameMovieRecord(existing,movie);
    });
    if (exactIndex < 0) unique.push(movie);
    else unique[exactIndex] = mergeDiscoveryRecord(unique[exactIndex],movie);
  });

  const removed = new Set();
  unique.forEach(function (movie) {
    if (removed.has(movie) || movieTmdbId(movie)) return;
    const otherRecords = unique.filter(function (candidate) {
      return candidate !== movie && !removed.has(candidate);
    });
    const matched = findMovieRecordMatch(movie,otherRecords);
    if (!matched || removed.has(matched)) return;
    // Only merge a title-only row into a TMDB identity; two separate local
    // records should not be coalesced by this discovery-only enrichment pass.
    if (!movieTmdbId(matched)) return;
    const index = unique.indexOf(matched);
    if (index < 0) return;
    unique[index] = mergeDiscoveryRecord(matched,movie);
    removed.add(movie);
  });

  return unique.filter(function (movie) { return !removed.has(movie); });
}

export function splitList(value) {
  if (Array.isArray(value)) return value.map(function (v) { return String(v).trim(); }).filter(Boolean);
  return String(value || "").split(/[|;,]/).map(function (v) { return v.trim(); }).filter(Boolean);
}

export function displayGenre(value) {
  const raw = String(value || "").trim().normalize("NFC");
  return NORMALIZED_GENRE_LABELS[genreLookupKey(raw)] || raw;
}

export function normalizeGenreKey(value) {
  return displayGenre(value).toLowerCase();
}

export function normalizeMovie(movie) {
  const title = movie && (movie.title || movie.t || movie.name || movie.original_title || movie.originalTitle);
  if (!title) return null;
  let year = Number(movie.year || movie.releaseYear || movie.release_year || 0) || null;
  if (!year) {
    const match = String(title).match(/\(((?:19|20)\d{2})\)\s*$/);
    if (match) year = Number(match[1]);
  }
  const cleanTitle = String(title).replace(/\s*\(((?:19|20)\d{2})\)\s*$/, "").trim();
  const genres = splitList(movie.genres || movie.genre || movie.g);
  const tags = splitList(movie.tags || movie.keywords || movie.keywordsText || movie.labels);
  const overview = movie.overview || movie.plot || movie.description || movie.synopsis || "";
  const posterPath = movie.posterPath || movie.poster_path || "";
  const tmdbId = movie.tmdbId || movie.tmId || movie.tmdb_id || (movie.source === "tmdb" ? movie.id : null);
  return {
    id: String(movie.id || movie.tmdbId || movie.tmId || movie.tmdb_id || movie.movieId || titleKey(cleanTitle)),
    tmdbId: tmdbId && Number(tmdbId) > 0 ? String(tmdbId) : null,
    title: cleanTitle,
    year: year,
    genres: uniqueStrings(genres.map(displayGenre)),
    tags: tags,
    overview: String(overview || ""),
    posterPath: posterPath,
    posterUrl: movie.posterUrl || (posterPath ? "https://image.tmdb.org/t/p/w500" + posterPath : ""),
    voteAverage: Number(movie.voteAverage || movie.vote_average || 0) || null,
    voteCount: Number(movie.voteCount || movie.vote_count || 0) || null,
    runtime: Number(movie.runtime || 0) || null,
    releaseDate: movie.releaseDate || movie.release_date || null,
    backdropPath: movie.backdropPath || movie.backdrop_path || "",
    backdropUrl: movie.backdropUrl || (movie.backdropPath || movie.backdrop_path ? "https://image.tmdb.org/t/p/w1280" + (movie.backdropPath || movie.backdrop_path) : ""),
    tagline: movie.tagline || "",
    status: movie.status || "",
    productionCountries: Array.isArray(movie.productionCountries) ? movie.productionCountries : (Array.isArray(movie.production_countries) ? movie.production_countries.map(function (country) { return country.name || country.iso_3166_1; }) : []),
    productionCompanies: uniqueStrings(Array.isArray(movie.productionCompanies) ? movie.productionCompanies : (Array.isArray(movie.production_companies) ? movie.production_companies.map(function (company) { return company && company.name; }) : [])),
    originalLanguage: movie.originalLanguage || movie.original_language || "",
    spokenLanguages: uniqueStrings(Array.isArray(movie.spokenLanguages) ? movie.spokenLanguages : (Array.isArray(movie.spoken_languages) ? movie.spoken_languages.map(function (language) { return language && (language.english_name || language.name || language.iso_639_1); }) : [])),
    collectionName: movie.collectionName || (movie.belongs_to_collection && movie.belongs_to_collection.name) || "",
    cast: uniqueStrings(Array.isArray(movie.cast) ? movie.cast : (movie.credits && Array.isArray(movie.credits.cast) ? movie.credits.cast.slice(0, 8).map(function (person) { return person && person.name; }) : [])),
    directors: uniqueStrings(Array.isArray(movie.directors) ? movie.directors : (movie.credits && Array.isArray(movie.credits.crew) ? movie.credits.crew.filter(function (person) { return person && person.job === "Director"; }).slice(0, 2).map(function (person) { return person.name; }) : [])),
    writers: uniqueStrings(Array.isArray(movie.writers) ? movie.writers : (movie.credits && Array.isArray(movie.credits.crew) ? movie.credits.crew.filter(function (person) { return person && /writer|screenplay|story|novel|adaptation/i.test(String(person.job || "")); }).slice(0, 4).map(function (person) { return person.name; }) : [])),
    composers: uniqueStrings(Array.isArray(movie.composers) ? movie.composers : (movie.credits && Array.isArray(movie.credits.crew) ? movie.credits.crew.filter(function (person) { return person && /composer|music/i.test(String(person.job || "")); }).slice(0, 3).map(function (person) { return person.name; }) : [])),
    imdbId: movie.imdbId || movie.imdb_id || "",
    tmdbCreditsFetchedAt: movie.tmdbCreditsFetchedAt || null,
    tmdbKeywordsFetchedAt: movie.tmdbKeywordsFetchedAt || null,
    tmdbFetchedAt: movie.tmdbFetchedAt || null,
    metadataSource: movie.metadataSource || null,
    source: movie.source || "catalog"
  };
}

export function uniqueStrings(items) {
  const seen = new Set();
  return (items || []).map(function (item) { return String(item).trim(); }).filter(function (item) {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}


export function ratingValue(entry) {
  const value = Number(entry && (entry.rating != null ? entry.rating : (entry.r != null ? entry.r : entry.score)));
  return Number.isFinite(value) && value >= 1 && value <= 10 ? value : null;
}

export { GENRE_LABELS };
