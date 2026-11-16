import type { MovieRecord, Viewing } from "./types";

export const SPECTRO_ALGORITHM_VERSION = "2.0.0";
export const SPECTRO_MINIMUM_MOVIES = 3;
export const SPECTRO_MINIMUM_AFFINITY_MOVIES = 2;
export const SPECTRO_MINIMUM_TREND_MOVIES = 3;

export type SpectroConfidence = "inicial" | "moderada" | "sólida" | "variable";
export type SpectroTrendDirection = "sube" | "baja" | "estable";

export interface SpectroAffinity {
  key: string;
  label: string;
  averageRating: number;
  difference: number;
  adjustedDifference: number;
  dispersion: number;
  sampleSize: number;
  confidence: SpectroConfidence;
}

export interface SpectroMonth {
  month: string;
  averageRating: number;
  viewingCount: number;
}

export interface SpectroAffinityTrend {
  key: string;
  category: string;
  label: string;
  previousDifference: number;
  recentDifference: number;
  change: number;
  previousSampleSize: number;
  recentSampleSize: number;
  direction: SpectroTrendDirection;
}

export interface SpectroRecommendationReason {
  category: string;
  label: string;
  difference: number;
  sampleSize: number;
  confidence: SpectroConfidence;
}

export interface SpectroRecommendation {
  movie: MovieRecord;
  score: number;
  confidence: SpectroConfidence;
  reasons: SpectroRecommendationReason[];
}

export interface SpectroAnalysis {
  algorithmVersion: string;
  inputFingerprint: string;
  computedAt: string;
  movieCount: number;
  totalViewings: number;
  averageRating: number | null;
  hasEnoughData: boolean;
  genreAffinities: SpectroAffinity[];
  directorAffinities: SpectroAffinity[];
  castAffinities: SpectroAffinity[];
  countryAffinities: SpectroAffinity[];
  decadeAffinities: SpectroAffinity[];
  languageAffinities: SpectroAffinity[];
  durationAffinities: SpectroAffinity[];
  evolution: SpectroMonth[];
  affinityTrends: SpectroAffinityTrend[];
  recommendations: SpectroRecommendation[];
}

export interface SpectroInput {
  viewings: Viewing[];
  movies: MovieRecord[];
  candidates: MovieRecord[];
  computedAt?: string;
}

interface RatedMovie {
  movie: MovieRecord;
  averageRating: number;
}

interface Feature {
  key: string;
  label: string;
}

interface FeatureGroup {
  category: string;
  weight: number;
  features: Feature[];
}

interface GroupedFeature {
  key: string;
  label: string;
  category: string;
  weight: number;
  ratings: number[];
}

type FeatureSelector = (movie: MovieRecord) => Feature[];

const genreNames: Record<number, string> = {
  28: "Acción", 12: "Aventura", 16: "Animación", 35: "Comedia", 80: "Crimen",
  99: "Documental", 18: "Drama", 10751: "Familia", 14: "Fantasía", 36: "Historia",
  27: "Terror", 10402: "Música", 9648: "Misterio", 10749: "Romance",
  878: "Ciencia ficción", 10770: "Película de TV", 53: "Suspenso", 10752: "Bélica", 37: "Western"
};

const genreIdsByName = new Map(
  Object.entries(genreNames).map(([id, name]) => [normalize(name), Number(id)])
);

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function mean(values: number[]): number {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function standardDeviation(values: number[], average: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, value) => sum + ((value - average) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function hashFingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function movieGenreFeatures(movie: MovieRecord): Feature[] {
  if (movie.genreIds?.length) {
    return [...new Set(movie.genreIds)]
      .filter((id) => Number.isSafeInteger(id) && id > 0)
      .map((id) => ({
        key: "genre:" + id,
        label: genreNames[id]
          ?? movie.genres.find((name) => genreIdsByName.get(normalize(name)) === id)
          ?? "Género " + id
      }));
  }

  return [...new Set(movie.genres.map((name) => name.trim()).filter(Boolean))].map((name) => {
    const knownId = genreIdsByName.get(normalize(name));
    return {
      key: knownId ? "genre:" + knownId : "genre-name:" + normalize(name),
      label: name
    };
  });
}

function textFeatures(values: string[] | undefined, prefix: string): Feature[] {
  const features = new Map<string, Feature>();
  for (const value of values ?? []) {
    const label = value.trim().replace(/\s+/g, " ");
    const normalized = normalize(label);
    if (!normalized) continue;
    const key = prefix + normalized;
    if (!features.has(key)) features.set(key, { key, label });
  }
  return [...features.values()];
}

function decadeFeatures(movie: MovieRecord): Feature[] {
  if (!Number.isInteger(movie.releaseYear) || !movie.releaseYear || movie.releaseYear < 1880) return [];
  const decade = Math.floor(movie.releaseYear / 10) * 10;
  return [{ key: "decade:" + decade, label: decade + "s" }];
}

function languageFeatures(movie: MovieRecord): Feature[] {
  const code = movie.originalLanguage?.trim().toLocaleLowerCase();
  if (!code || !/^[a-z]{2,3}$/.test(code)) return [];
  let label = code.toUpperCase();
  try {
    label = new Intl.DisplayNames(["es"], { type: "language" }).of(code) ?? label;
  } catch {
    // El código ISO sigue siendo una señal verificable si el navegador no lo traduce.
  }
  return [{ key: "language:" + code, label }];
}

function durationFeatures(movie: MovieRecord): Feature[] {
  const minutes = movie.runtimeMinutes;
  if (!Number.isFinite(minutes) || !minutes || minutes < 1) return [];
  if (minutes <= 90) return [{ key: "duration:short", label: "Hasta 90 min" }];
  if (minutes <= 120) return [{ key: "duration:medium", label: "91–120 min" }];
  if (minutes <= 150) return [{ key: "duration:long", label: "121–150 min" }];
  return [{ key: "duration:extended", label: "Más de 150 min" }];
}

function movieFeatureGroups(movie: MovieRecord): FeatureGroup[] {
  return [
    { category: "Género", weight: 1.3, features: movieGenreFeatures(movie) },
    { category: "Dirección", weight: 1.15, features: textFeatures(movie.directors, "director:") },
    { category: "Reparto", weight: 0.85, features: textFeatures(movie.castMembers, "cast:") },
    { category: "País", weight: 0.7, features: textFeatures(movie.countries, "country:") },
    { category: "Época", weight: 0.6, features: decadeFeatures(movie) },
    { category: "Idioma original", weight: 0.5, features: languageFeatures(movie) },
    { category: "Duración", weight: 0.45, features: durationFeatures(movie) }
  ];
}

function fingerprintInput(input: SpectroInput): string {
  const viewings = [...input.viewings]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((viewing) => [
      viewing.id,
      viewing.movieId,
      viewing.watchedOn,
      viewing.rating ?? null,
      viewing.sequenceNumber
    ]);

  const movies = [...input.movies, ...input.candidates]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((movie) => [
      movie.id,
      movie.title,
      movie.genres,
      movie.genreIds,
      movie.countries,
      movie.directors,
      movie.castMembers,
      movie.releaseYear,
      movie.originalLanguage,
      movie.runtimeMinutes
    ]);

  return hashFingerprint(JSON.stringify({ viewings, movies }));
}

function groupFeatureRatings(
  ratedMovies: RatedMovie[],
  selectGroups: (movie: MovieRecord) => FeatureGroup[] = movieFeatureGroups
): Map<string, GroupedFeature> {
  const grouped = new Map<string, GroupedFeature>();

  for (const item of ratedMovies) {
    const seen = new Set<string>();
    for (const group of selectGroups(item.movie)) {
      for (const feature of group.features) {
        if (seen.has(feature.key)) continue;
        seen.add(feature.key);
        const existing = grouped.get(feature.key) ?? {
          key: feature.key,
          label: feature.label,
          category: group.category,
          weight: group.weight,
          ratings: []
        };
        existing.ratings.push(item.averageRating);
        grouped.set(feature.key, existing);
      }
    }
  }

  return grouped;
}

function confidenceFor(sampleSize: number, dispersion: number): SpectroConfidence {
  if (sampleSize < 3) return "inicial";
  if (sampleSize >= 5 && dispersion <= 1.75) return "sólida";
  if (dispersion <= 2.75) return "moderada";
  return "variable";
}

function buildAffinities(
  ratedMovies: RatedMovie[],
  overallAverage: number,
  selector: FeatureSelector,
  category: string,
  weight: number
): SpectroAffinity[] {
  const groups = groupFeatureRatings(ratedMovies, (movie) => [{
    category,
    weight,
    features: selector(movie)
  }]);

  return [...groups.values()]
    .filter((group) => group.ratings.length >= SPECTRO_MINIMUM_AFFINITY_MOVIES)
    .map((group) => {
      const averageRating = mean(group.ratings);
      const difference = averageRating - overallAverage;
      const dispersion = standardDeviation(group.ratings, averageRating);
      // Encogimiento conservador hacia el promedio personal: las muestras pequeñas
      // aportan una señal, pero no pueden dominar por tener un promedio extremo.
      const adjustedDifference = difference * group.ratings.length / (group.ratings.length + 3);

      return {
        key: group.key,
        label: group.label,
        averageRating: round(averageRating),
        difference: round(difference),
        adjustedDifference: round(adjustedDifference),
        dispersion: round(dispersion),
        sampleSize: group.ratings.length,
        confidence: confidenceFor(group.ratings.length, dispersion)
      };
    })
    .sort((a, b) => (
      b.adjustedDifference - a.adjustedDifference
      || b.sampleSize - a.sampleSize
      || a.label.localeCompare(b.label)
    ));
}

function buildEvolution(viewings: Viewing[]): SpectroMonth[] {
  const groups = new Map<string, number[]>();
  for (const viewing of viewings) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(viewing.watchedOn)) continue;
    const month = viewing.watchedOn.slice(0, 7);
    if (viewing.rating === undefined) continue;
    const ratings = groups.get(month) ?? [];
    ratings.push(viewing.rating);
    groups.set(month, ratings);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, ratings]) => ({
      month,
      averageRating: round(mean(ratings)),
      viewingCount: ratings.length
    }));
}

function shiftDate(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    String(date.getUTCFullYear()).padStart(4, "0"),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function ratedMoviesInPeriod(
  viewings: Viewing[],
  movieById: Map<string, MovieRecord>,
  start: string,
  end: string
): RatedMovie[] {
  const ratingsByMovie = new Map<string, number[]>();
  for (const viewing of viewings) {
    if (
      viewing.rating === undefined
      || !/^\d{4}-\d{2}-\d{2}$/.test(viewing.watchedOn)
      || viewing.watchedOn < start
      || viewing.watchedOn > end
    ) continue;

    const ratings = ratingsByMovie.get(viewing.movieId) ?? [];
    ratings.push(viewing.rating);
    ratingsByMovie.set(viewing.movieId, ratings);
  }

  return [...ratingsByMovie.entries()]
    .flatMap(([movieId, ratings]) => {
      const movie = movieById.get(movieId);
      return movie ? [{ movie, averageRating: mean(ratings) }] : [];
    });
}

function buildAffinityTrends(
  viewings: Viewing[],
  movieById: Map<string, MovieRecord>
): SpectroAffinityTrend[] {
  const ratedDates = viewings
    .filter((viewing) => viewing.rating !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(viewing.watchedOn))
    .map((viewing) => viewing.watchedOn)
    .sort();

  const lastDate = ratedDates.at(-1);
  if (!lastDate) return [];

  const recentStart = shiftDate(lastDate, -365);
  const previousStart = shiftDate(lastDate, -730);
  const previousMovies = ratedMoviesInPeriod(viewings, movieById, previousStart, shiftDate(recentStart, -1));
  const recentMovies = ratedMoviesInPeriod(viewings, movieById, recentStart, lastDate);

  if (
    previousMovies.length < SPECTRO_MINIMUM_TREND_MOVIES
    || recentMovies.length < SPECTRO_MINIMUM_TREND_MOVIES
  ) return [];

  const previousAverage = mean(previousMovies.map((item) => item.averageRating));
  const recentAverage = mean(recentMovies.map((item) => item.averageRating));
  const previousFeatures = groupFeatureRatings(previousMovies);
  const recentFeatures = groupFeatureRatings(recentMovies);
  const trends: SpectroAffinityTrend[] = [];

  for (const [key, recent] of recentFeatures.entries()) {
    const previous = previousFeatures.get(key);
    if (
      !previous
      || previous.ratings.length < SPECTRO_MINIMUM_TREND_MOVIES
      || recent.ratings.length < SPECTRO_MINIMUM_TREND_MOVIES
    ) continue;

    const previousDifference = mean(previous.ratings) - previousAverage;
    const recentDifference = mean(recent.ratings) - recentAverage;
    const change = recentDifference - previousDifference;

    trends.push({
      key,
      category: recent.category,
      label: recent.label,
      previousDifference: round(previousDifference),
      recentDifference: round(recentDifference),
      change: round(change),
      previousSampleSize: previous.ratings.length,
      recentSampleSize: recent.ratings.length,
      direction: change >= 0.35 ? "sube" : change <= -0.35 ? "baja" : "estable"
    });
  }

  return trends
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change) || a.label.localeCompare(b.label))
    .slice(0, 8);
}

function recommendationConfidence(reasons: SpectroRecommendationReason[]): SpectroConfidence {
  const minimumSupport = Math.min(...reasons.map((reason) => reason.sampleSize));
  if (reasons.length >= 3 && minimumSupport >= 5 && reasons.every((reason) => reason.confidence === "sólida")) {
    return "sólida";
  }
  if (
    reasons.length >= 2
    && minimumSupport >= 3
    && reasons.every((reason) => reason.confidence === "moderada" || reason.confidence === "sólida")
  ) return "moderada";
  return "inicial";
}

function buildRecommendations(
  candidates: MovieRecord[],
  affinities: SpectroAffinity[],
  watchedMovieIds: Set<string>
): SpectroRecommendation[] {
  const positive = new Map(
    affinities
      .filter((affinity) => (
        affinity.adjustedDifference >= 0.25
        && (affinity.confidence === "moderada" || affinity.confidence === "sólida")
      ))
      .map((affinity) => [affinity.key, affinity])
  );
  if (!positive.size) return [];

  const ranked = candidates
    .filter((movie) => !watchedMovieIds.has(movie.id))
    .map((movie) => {
      const reasonsWithWeight: Array<{ reason: SpectroRecommendationReason; weight: number }> = [];

      for (const group of movieFeatureGroups(movie)) {
        const matched = group.features
          .map((feature) => positive.get(feature.key))
          .filter((affinity): affinity is SpectroAffinity => Boolean(affinity))
          .sort((a, b) => b.adjustedDifference - a.adjustedDifference);

        const strongest = matched[0];
        if (!strongest) continue;

        reasonsWithWeight.push({
          weight: group.weight,
          reason: {
            category: group.category,
            label: strongest.label,
            difference: strongest.adjustedDifference,
            sampleSize: strongest.sampleSize,
            confidence: strongest.confidence
          }
        });
      }

      if (!reasonsWithWeight.length) return undefined;

      const totalWeight = reasonsWithWeight.reduce((sum, item) => sum + item.weight, 0);
      const score = reasonsWithWeight.reduce(
        (sum, item) => sum + item.reason.difference * item.weight,
        0
      ) / totalWeight;
      const reasons = reasonsWithWeight
        .sort((a, b) => (
          b.reason.difference * b.weight - a.reason.difference * a.weight
        ))
        .slice(0, 4)
        .map((item) => item.reason);

      return {
        movie,
        score: round(score),
        confidence: recommendationConfidence(reasonsWithWeight.map((item) => item.reason)),
        reasons
      };
    })
    .filter((item): item is SpectroRecommendation => item !== undefined && item.score > 0)
    .sort((a, b) => b.score - a.score || a.movie.title.localeCompare(b.movie.title));

  const seen = new Set<string>();
  return ranked.filter((item) => {
    if (seen.has(item.movie.id)) return false;
    seen.add(item.movie.id);
    return true;
  }).slice(0, 12);
}

export function analyzeSpectro(input: SpectroInput): SpectroAnalysis {
  const movieById = new Map(input.movies.map((movie) => [movie.id, movie]));
  const ratingsByMovie = new Map<string, number[]>();

  for (const viewing of input.viewings) {
    if (viewing.rating === undefined) continue;
    const ratings = ratingsByMovie.get(viewing.movieId) ?? [];
    ratings.push(viewing.rating);
    ratingsByMovie.set(viewing.movieId, ratings);
  }

  const ratedMovies: RatedMovie[] = [...ratingsByMovie.entries()]
    .flatMap(([movieId, ratings]) => {
      const movie = movieById.get(movieId);
      return movie && ratings.length ? [{ movie, averageRating: mean(ratings) }] : [];
    });

  // Cada película aporta una observación al perfil, aunque tenga varios revisionados.
  const overall = ratedMovies.length
    ? mean(ratedMovies.map((item) => item.averageRating))
    : null;
  const enough = ratedMovies.length >= SPECTRO_MINIMUM_MOVIES;
  const affinities = (
    selector: FeatureSelector,
    category: string,
    weight: number
  ) => (
    enough && overall !== null
      ? buildAffinities(ratedMovies, overall, selector, category, weight)
      : []
  );

  const genreAffinities = affinities(movieGenreFeatures, "Género", 1.3);
  const directorAffinities = affinities(
    (movie) => textFeatures(movie.directors, "director:"),
    "Dirección",
    1.15
  );
  const castAffinities = affinities(
    (movie) => textFeatures(movie.castMembers, "cast:"),
    "Reparto",
    0.85
  );
  const countryAffinities = affinities(
    (movie) => textFeatures(movie.countries, "country:"),
    "País",
    0.7
  );
  const decadeAffinities = affinities(decadeFeatures, "Época", 0.6);
  const languageAffinities = affinities(languageFeatures, "Idioma original", 0.5);
  const durationAffinities = affinities(durationFeatures, "Duración", 0.45);

  const allAffinities = [
    ...genreAffinities,
    ...directorAffinities,
    ...castAffinities,
    ...countryAffinities,
    ...decadeAffinities,
    ...languageAffinities,
    ...durationAffinities
  ];

  const watchedIds = new Set(input.viewings.map((viewing) => viewing.movieId));

  return {
    algorithmVersion: SPECTRO_ALGORITHM_VERSION,
    inputFingerprint: fingerprintInput(input),
    computedAt: input.computedAt ?? new Date().toISOString(),
    movieCount: ratedMovies.length,
    totalViewings: input.viewings.length,
    averageRating: overall === null ? null : round(overall),
    hasEnoughData: enough,
    genreAffinities,
    directorAffinities,
    castAffinities,
    countryAffinities,
    decadeAffinities,
    languageAffinities,
    durationAffinities,
    evolution: buildEvolution(input.viewings),
    affinityTrends: buildAffinityTrends(input.viewings, movieById),
    recommendations: enough
      ? buildRecommendations(input.candidates, allAffinities, watchedIds)
      : []
  };
}
