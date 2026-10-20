import { uniqueStrings } from "../core/movie-utils.js";

export function movieFeatures(movie, ratingEntry) {
  const entry = ratingEntry || {};
  const genres = entry.genres && entry.genres.length ? entry.genres : (movie && movie.genres) || [];
  const tags = entry.tags && entry.tags.length ? entry.tags : (movie && movie.tags) || [];
  return uniqueStrings(genres.map(function (g) { return "género: " + String(g).toLowerCase(); })
    .concat(tags.map(function (t) { return "tema: " + String(t).toLowerCase(); })));
}
