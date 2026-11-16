export type DiscoverSort = "popular" | "rating" | "newest" | "oldest";

export interface DiscoverFilters {
  genres: number[];
  yearFrom: string;
  yearTo: string;
  runtimeFrom: string;
  runtimeTo: string;
  originCountry: string;
  originalLanguage: string;
  sortBy: DiscoverSort;
}

export const EMPTY_DISCOVER_FILTERS: DiscoverFilters = {
  genres: [],
  yearFrom: "",
  yearTo: "",
  runtimeFrom: "",
  runtimeTo: "",
  originCountry: "",
  originalLanguage: "",
  sortBy: "popular"
};

function cleanInteger(value: string, minimum: number, maximum: number): string {
  if (!value.trim()) return "";
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) return "";
  return String(parsed);
}

function cleanRange(
  fromValue: string,
  toValue: string,
  minimum: number,
  maximum: number
): [string, string] {
  const from = cleanInteger(fromValue, minimum, maximum);
  const to = cleanInteger(toValue, minimum, maximum);
  if (from && to && Number(from) > Number(to)) return [from, ""];
  return [from, to];
}

export function normalizeDiscoverFilters(filters: DiscoverFilters): DiscoverFilters {
  const [yearFrom, yearTo] = cleanRange(filters.yearFrom, filters.yearTo, 1888, 2100);
  const [runtimeFrom, runtimeTo] = cleanRange(filters.runtimeFrom, filters.runtimeTo, 1, 500);
  const validSort: DiscoverSort[] = ["popular", "rating", "newest", "oldest"];

  return {
    genres: [...new Set(filters.genres.filter((id) => Number.isSafeInteger(id) && id > 0))].sort((a, b) => a - b),
    yearFrom,
    yearTo,
    runtimeFrom,
    runtimeTo,
    originCountry: /^[A-Z]{2}$/.test(filters.originCountry) ? filters.originCountry : "",
    originalLanguage: /^[a-z]{2,3}$/.test(filters.originalLanguage) ? filters.originalLanguage : "",
    sortBy: validSort.includes(filters.sortBy) ? filters.sortBy : "popular"
  };
}

/** Cuenta grupos activos para el indicador de filtros, no cada valor seleccionado. */
export function getDiscoverActiveFilterCount(filters: DiscoverFilters): number {
  const value = normalizeDiscoverFilters(filters);
  return [
    value.genres.length > 0,
    Boolean(value.yearFrom || value.yearTo),
    Boolean(value.runtimeFrom || value.runtimeTo),
    Boolean(value.originCountry),
    Boolean(value.originalLanguage),
    value.sortBy !== "popular"
  ].filter(Boolean).length;
}

/**
 * Traduce las opciones visibles al contrato de TMDB discover/movie.
 * Los géneros seleccionados se combinan como OR; el resto de parámetros se
 * combinan entre sí como AND según la semántica documentada por TMDB.
 */
export function buildDiscoverMovieParams(
  filters: DiscoverFilters,
  page = 1,
  language = "es-MX"
): Record<string, string | number | boolean> {
  const normalized = normalizeDiscoverFilters(filters);
  const params: Record<string, string | number | boolean> = {
    include_adult: false,
    language,
    page: Math.max(1, Math.floor(page)),
    sort_by: {
      popular: "popularity.desc",
      rating: "vote_average.desc",
      newest: "primary_release_date.desc",
      oldest: "primary_release_date.asc"
    }[normalized.sortBy]
  };

  if (normalized.genres.length) params.with_genres = normalized.genres.join("|");
  if (normalized.yearFrom) params["primary_release_date.gte"] = normalized.yearFrom + "-01-01";
  if (normalized.yearTo) params["primary_release_date.lte"] = normalized.yearTo + "-12-31";
  if (normalized.runtimeFrom) params["with_runtime.gte"] = Number(normalized.runtimeFrom);
  if (normalized.runtimeTo) params["with_runtime.lte"] = Number(normalized.runtimeTo);
  if (normalized.originCountry) params.with_origin_country = normalized.originCountry;
  if (normalized.originalLanguage) params.with_original_language = normalized.originalLanguage;

  return params;
}
