export type DiscoverSort =
  | "spectro"
  | "popularity.desc"
  | "vote_average.desc"
  | "primary_release_date.desc"
  | "primary_release_date.asc"
  | "revenue.desc"
  | "original_title.asc";

export interface DiscoverFilters {
  genreId: string;
  runtimeMin: string;
  runtimeMax: string;
  yearFrom: string;
  yearTo: string;
  minVoteAverage: string;
  minVoteCount: string;
  originalLanguage: string;
  /** Excluir estados personales; son filtros locales, nunca parámetros de TMDB. */
  hideWatched: boolean;
  hidePending: boolean;
  sortBy: DiscoverSort;
}

export const DEFAULT_DISCOVER_FILTERS: DiscoverFilters = {
  genreId: "",
  runtimeMin: "",
  runtimeMax: "",
  yearFrom: "",
  yearTo: "",
  minVoteAverage: "",
  minVoteCount: "",
  originalLanguage: "",
  hideWatched: true,
  hidePending: true,
  sortBy: "spectro"
};

export const DISCOVER_GENRES = [
  { id: 28, label: "Acción" },
  { id: 12, label: "Aventura" },
  { id: 16, label: "Animación" },
  { id: 35, label: "Comedia" },
  { id: 80, label: "Crimen" },
  { id: 99, label: "Documental" },
  { id: 18, label: "Drama" },
  { id: 10751, label: "Familia" },
  { id: 14, label: "Fantasía" },
  { id: 36, label: "Historia" },
  { id: 27, label: "Terror" },
  { id: 10402, label: "Música" },
  { id: 9648, label: "Misterio" },
  { id: 10749, label: "Romance" },
  { id: 878, label: "Ciencia ficción" },
  { id: 53, label: "Suspenso" },
  { id: 10752, label: "Bélica" },
  { id: 37, label: "Western" }
] as const;

export const DISCOVER_LANGUAGES = [
  { id: "en", label: "Inglés" },
  { id: "es", label: "Español" },
  { id: "ja", label: "Japonés" },
  { id: "ko", label: "Coreano" },
  { id: "fr", label: "Francés" },
  { id: "it", label: "Italiano" },
  { id: "de", label: "Alemán" },
  { id: "pt", label: "Portugués" },
  { id: "hi", label: "Hindi" },
  { id: "zh", label: "Chino" },
  { id: "ru", label: "Ruso" },
  { id: "tr", label: "Turco" },
  { id: "th", label: "Tailandés" },
  { id: "sv", label: "Sueco" },
  { id: "no", label: "Noruego" },
  { id: "da", label: "Danés" },
  { id: "nl", label: "Neerlandés" },
  { id: "pl", label: "Polaco" },
  { id: "cs", label: "Checo" },
  { id: "ro", label: "Rumano" },
  { id: "he", label: "Hebreo" },
  { id: "ar", label: "Árabe" },
  { id: "id", label: "Indonesio" },
  { id: "tl", label: "Filipino" },
  { id: "bn", label: "Bengalí" },
  { id: "bg", label: "Búlgaro" },
  { id: "ca", label: "Catalán" },
  { id: "hr", label: "Croata" },
  { id: "el", label: "Griego" },
  { id: "eu", label: "Euskera" },
  { id: "fa", label: "Persa" },
  { id: "fi", label: "Finés" },
  { id: "hu", label: "Húngaro" },
  { id: "hy", label: "Armenio" },
  { id: "ka", label: "Georgiano" },
  { id: "kk", label: "Kazajo" },
  { id: "ml", label: "Malayalam" },
  { id: "sk", label: "Eslovaco" },
  { id: "sl", label: "Esloveno" },
  { id: "sq", label: "Albanés" },
  { id: "sr", label: "Serbio" },
  { id: "sw", label: "Suajili" },
  { id: "ta", label: "Tamil" },
  { id: "te", label: "Telugu" },
  { id: "uk", label: "Ucraniano" },
  { id: "ur", label: "Urdu" },
  { id: "vi", label: "Vietnamita" }
] as const;

const SORT_OPTIONS = new Set<DiscoverSort>([
  "spectro",
  "popularity.desc",
  "vote_average.desc",
  "primary_release_date.desc",
  "primary_release_date.asc",
  "revenue.desc",
  "original_title.asc"
]);

function normalizeNumber(
  value: string,
  minimum: number,
  maximum: number,
  decimals = false
): string {
  if (!value.trim()) return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return "";
  const bounded = Math.min(maximum, Math.max(minimum, number));
  return String(decimals ? Math.round(bounded * 10) / 10 : Math.round(bounded));
}

export function normalizeDiscoverFilters(
  filters?: Partial<DiscoverFilters> | null
): DiscoverFilters {
  const normalized: DiscoverFilters = {
    genreId: DISCOVER_GENRES.some((genre) => String(genre.id) === filters?.genreId)
      ? filters?.genreId ?? ""
      : "",
    runtimeMin: normalizeNumber(filters?.runtimeMin ?? "", 1, 600),
    runtimeMax: normalizeNumber(filters?.runtimeMax ?? "", 1, 600),
    yearFrom: normalizeNumber(filters?.yearFrom ?? "", 1888, 2100),
    yearTo: normalizeNumber(filters?.yearTo ?? "", 1888, 2100),
    minVoteAverage: normalizeNumber(filters?.minVoteAverage ?? "", 0, 10, true),
    minVoteCount: normalizeNumber(filters?.minVoteCount ?? "", 1, 100000),
    originalLanguage: DISCOVER_LANGUAGES.some((language) => language.id === filters?.originalLanguage)
      ? filters?.originalLanguage ?? ""
      : "",
    hideWatched: filters?.hideWatched !== false,
    hidePending: filters?.hidePending !== false,
    sortBy: SORT_OPTIONS.has(filters?.sortBy as DiscoverSort)
      ? filters?.sortBy as DiscoverSort
      : "spectro"
  };

  if (normalized.runtimeMin && normalized.runtimeMax
    && Number(normalized.runtimeMin) > Number(normalized.runtimeMax)) {
    normalized.runtimeMax = "";
  }
  if (normalized.yearFrom && normalized.yearTo
    && Number(normalized.yearFrom) > Number(normalized.yearTo)) {
    normalized.yearTo = "";
  }

  return normalized;
}

export function getDiscoverFilterErrors(filters: DiscoverFilters): string[] {
  const errors: string[] = [];
  if (filters.runtimeMin && filters.runtimeMax
    && Number(filters.runtimeMin) > Number(filters.runtimeMax)) {
    errors.push("La duración mínima no puede superar la máxima.");
  }
  if (filters.yearFrom && filters.yearTo
    && Number(filters.yearFrom) > Number(filters.yearTo)) {
    errors.push("El año inicial no puede ser posterior al año final.");
  }
  return errors;
}

export function hasActiveDiscoverFilters(filters: DiscoverFilters): boolean {
  return Boolean(
    filters.genreId
    || filters.runtimeMin
    || filters.runtimeMax
    || filters.yearFrom
    || filters.yearTo
    || filters.minVoteAverage
    || filters.minVoteCount
    || filters.originalLanguage
    || filters.sortBy !== "spectro"
  );
}

export function countActiveDiscoverFilters(filters: DiscoverFilters): number {
  return [
    filters.genreId,
    filters.runtimeMin || filters.runtimeMax,
    filters.yearFrom || filters.yearTo,
    filters.minVoteAverage,
    filters.minVoteCount,
    filters.originalLanguage,
    filters.hideWatched ? "hide-watched" : "",
    filters.hidePending ? "hide-pending" : "",
    filters.sortBy !== "spectro" ? filters.sortBy : ""
  ].filter(Boolean).length;
}

/**
 * Aplica las exclusiones de Biblioteca sobre el catálogo ya descargado.
 * No modifica la consulta TMDB ni comparte datos personales con servicios externos.
 */
export function filterDiscoverLibraryVisibility<T extends { id: number }>(
  movies: readonly T[],
  watchedTmdbIds: ReadonlySet<number>,
  pendingTmdbIds: ReadonlySet<number>,
  filters: Pick<DiscoverFilters, "hideWatched" | "hidePending">
): T[] {
  return movies.filter((movie) => (
    !(filters.hideWatched && watchedTmdbIds.has(movie.id))
    && !(filters.hidePending && pendingTmdbIds.has(movie.id))
  ));
}

/**
 * En el modo «Para ti», evita mezclar recomendaciones personales con el resto
 * del catálogo de TMDB. El catálogo completo se conserva cuando no hay señales
 * positivas, para que Espectro nunca deje la pantalla vacía por falta de evidencia.
 */
/**
 * Añade una página sin cambiar el orden de las películas que ya estaban en pantalla.
 * La nueva página conserva su propio orden y los duplicados se descartan por ID.
 */
export function appendDiscoverMovies<T extends { id: number }>(
  current: readonly T[],
  nextPage: readonly T[]
): T[] {
  const seen = new Set(current.map((movie) => movie.id));
  const additions = nextPage.filter((movie) => {
    if (seen.has(movie.id)) return false;
    seen.add(movie.id);
    return true;
  });
  return [...current, ...additions];
}

/**
 * Añade recomendaciones de una página al final de las ya mostradas.
 * Nunca reordena las recomendaciones existentes al terminar otro cálculo.
 */
export function appendDiscoverSpectroRecommendations<T extends { movie: { tmdbId: number } }>(
  current: readonly T[],
  nextPage: readonly T[]
): T[] {
  const seen = new Set(current.map((item) => item.movie.tmdbId));
  const additions = nextPage.filter((item) => {
    if (seen.has(item.movie.tmdbId)) return false;
    seen.add(item.movie.tmdbId);
    return true;
  });
  return [...current, ...additions];
}

export function selectDiscoverSpectroMovies<T extends { id: number }>(
  movies: readonly T[],
  recommendations: readonly { movie: { tmdbId: number } }[],
  sortBy: DiscoverSort,
  personalizationReady = true
): T[] {
  if (sortBy !== "spectro" || !personalizationReady || recommendations.length === 0) {
    return [...movies];
  }

  const rankByTmdbId = new Map<number, number>();
  recommendations.forEach((recommendation, index) => {
    if (!rankByTmdbId.has(recommendation.movie.tmdbId)) {
      rankByTmdbId.set(recommendation.movie.tmdbId, index);
    }
  });

  return movies
    .filter((movie) => rankByTmdbId.has(movie.id))
    .sort((left, right) => (
      (rankByTmdbId.get(left.id) ?? Number.MAX_SAFE_INTEGER)
      - (rankByTmdbId.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    ));
}

export function buildDiscoverMovieParams(
  filters: DiscoverFilters,
  page: number,
  language = "es-MX"
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page: Math.max(1, Math.floor(page)),
    language,
    include_adult: false,
    include_video: false,
    sort_by: filters.sortBy === "spectro" ? "popularity.desc" : filters.sortBy
  };

  if (filters.genreId) params.with_genres = filters.genreId;
  if (filters.runtimeMin) params["with_runtime.gte"] = Number(filters.runtimeMin);
  if (filters.runtimeMax) params["with_runtime.lte"] = Number(filters.runtimeMax);
  if (filters.yearFrom) params["primary_release_date.gte"] = filters.yearFrom + "-01-01";
  if (filters.yearTo) params["primary_release_date.lte"] = filters.yearTo + "-12-31";
  if (filters.minVoteAverage) params["vote_average.gte"] = Number(filters.minVoteAverage);
  if (filters.minVoteCount) params["vote_count.gte"] = Number(filters.minVoteCount);
  if (filters.originalLanguage) params.with_original_language = filters.originalLanguage;

  return params;
}

export function discoverFilterTitleMatch(title: string, originalTitle: string | undefined, query: string): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  return normalizeSearchText(title).includes(normalizedQuery)
    || normalizeSearchText(originalTitle).includes(normalizedQuery);
}

function normalizeSearchText(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}
