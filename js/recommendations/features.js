import { uniqueStrings } from "../core/movie-utils.js";

const MIN_RELEASE_YEAR = 1888;
const MAX_RELEASE_YEAR = 2100;

function validYear(value) {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  if (!/^\d{4}$/.test(text)) return null;
  const year = Number(text);
  return Number.isInteger(year) && year >= MIN_RELEASE_YEAR && year <= MAX_RELEASE_YEAR ? year : null;
}

function releaseYear(record) {
  if (!record || typeof record !== "object") return null;
  const candidates = [record.year, record.releaseYear, record.release_year];
  for (const candidate of candidates) {
    const year = validYear(candidate);
    if (year != null) return year;
  }
  const releaseDate = record.releaseDate || record.release_date;
  const match = String(releaseDate || "").trim().match(/^(\d{4})(?:-\d{2}(?:-\d{2})?)?$/);
  return match ? validYear(match[1]) : null;
}

export function movieFeatures(movie, ratingEntry, options) {
  const entry = ratingEntry || {};
  const genres = entry.genres && entry.genres.length ? entry.genres : (movie && movie.genres) || [];
  const tags = entry.tags && entry.tags.length ? entry.tags : (movie && movie.tags) || [];
  const features = genres.map(function (genre) { return "género: " + String(genre).toLowerCase(); })
    .concat(tags.map(function (tag) { return "tema: " + String(tag).toLowerCase(); }));

  if (!options || options.includeDecade !== false) {
    // A view date is not a release date: only use year/releaseDate fields.
    const year = releaseYear(entry) || releaseYear(movie);
    if (year != null) features.push("década: " + String(Math.floor(year / 10) * 10));
  }
  return uniqueStrings(features);
}
