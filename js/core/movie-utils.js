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

export function movieIdentityKey(entry) {
  const id = movieTmdbId(entry);
  return id ? "tmdb:" + id : "title:" + titleKey(entry && entry.title);
}

export function sameMovieRecord(left, right) {
  if (!left || !right) return false;
  const leftId = movieTmdbId(left);
  const rightId = movieTmdbId(right);
  if (leftId && rightId) return leftId === rightId;
  return titleKey(left.title) === titleKey(right.title);
}

export function sameDiscoveryMovie(left, right) {
  if (!left || !right) return false;
  const leftId = movieTmdbId(left);
  const rightId = movieTmdbId(right);
  if (leftId && rightId) return leftId === rightId;
  const leftTitle = titleKey(left.title);
  const rightTitle = titleKey(right.title);
  if (!leftTitle || leftTitle !== rightTitle) return false;
  const leftYear = Number(left.year) || 0;
  const rightYear = Number(right.year) || 0;
  return !leftYear || !rightYear || leftYear === rightYear;
}

export function uniqueDiscoveryMovies(movies) {
  const unique = [];
  (movies || []).forEach(function (movie) {
    if (!movie || !titleKey(movie.title)) return;
    if (!unique.some(function (existing) { return sameDiscoveryMovie(existing,movie); })) unique.push(movie);
  });
  return unique;
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
