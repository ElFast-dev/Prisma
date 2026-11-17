import type { CollectionMovie, LibraryEntry, MovieRecord, Viewing } from "./types";
import { predictSpectroMovies, type SpectroMoviePrediction } from "./spectroPrediction";
import { buildSpectroInteractions } from "./spectroInteractions";
import {
  buildSpectroNetworkGraph,
  type SpectroNetworkGraph
} from "./spectroNetwork";
export type {
  SpectroNetworkGraph,
  SpectroNetworkNode,
  SpectroNetworkEdge,
  SpectroNetworkCluster
} from "./spectroNetwork";

export const SPECTRO_ALGORITHM_VERSION = "2.6.0";
export const SPECTRO_MINIMUM_MOVIES = 3;
export const SPECTRO_MINIMUM_AFFINITY_MOVIES = 2;
export const SPECTRO_MINIMUM_TREND_MOVIES = 3;
export const SPECTRO_MAX_PATTERNS = 8;
export const SPECTRO_MAX_GRAPH_RECOMMENDATIONS = 5;

export type SpectroConfidence = "inicial" | "moderada" | "sólida" | "variable" | "declarada";
export type SpectroTrendDirection = "sube" | "baja" | "estable";
export type SpectroSignalSource = "valoraciones" | "favoritos";

export interface SpectroAffinity {
  key: string;
  label: string;
  category: string;
  averageRating: number;
  difference: number;
  adjustedDifference: number;
  dispersion: number;
  sampleSize: number;
  confidence: SpectroConfidence;
}

export interface SpectroFavoriteSignal {
  key: string;
  label: string;
  category: string;
  sampleSize: number;
  supportingTitles: string[];
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

export interface SpectroPatternEvidence {
  title: string;
  rating: number;
  residual: number;
}

/**
 * Interacción entre dos rasgos estimada desde residuos fuera de muestra.
 * La evidencia estadística se corrige por comparaciones múltiples; no implica causalidad.
 */
export interface SpectroPattern {
  key: string;
  category: string;
  label: string;
  averageRating: number;
  expectedRating: number;
  difference: number;
  adjustedDifference: number;
  dispersion: number;
  sampleSize: number;
  pValue: number;
  qValue: number;
  foldCount: number;
  foldConsistency: number;
  confidence: SpectroConfidence;
  supportingMovies: SpectroPatternEvidence[];
}

export interface SpectroRecommendationReason {
  key: string;
  category: string;
  label: string;
  source: SpectroSignalSource;
  difference: number;
  contribution: number;
  sampleSize: number;
  confidence: SpectroConfidence;
}

export interface SpectroRecommendation {
  movie: MovieRecord;
  fitPercentage: number;
  predictedRating: number;
  confidence: SpectroConfidence;
  reasons: SpectroRecommendationReason[];
  similarMovies: SpectroMoviePrediction["neighbors"];
}

/**
 * Ordena candidatas por la estimación personal de nota; el encaje relativo
 * complementa y desempata, pero no sustituye la predicción del modelo.
 */
export function rankSpectroRecommendations<T extends {
  movie: Pick<MovieRecord, "title">;
  fitPercentage: number;
  predictedRating: number;
}>(recommendations: readonly T[]): T[] {
  return [...recommendations].sort((a, b) => (
    b.predictedRating - a.predictedRating
    || b.fitPercentage - a.fitPercentage
    || a.movie.title.localeCompare(b.movie.title)
  ));
}

export interface SpectroGraphEvidence {
  title: string;
  rating: number | null;
}

export type SpectroGraphNodeKind = "profile" | "signal" | "candidate";

export interface SpectroGraphNode {
  id: string;
  kind: SpectroGraphNodeKind;
  label: string;
  detail: string;
  source?: SpectroSignalSource;
  adjustedDifference?: number;
  sampleSize?: number;
  confidence?: SpectroConfidence;
  fitPercentage?: number;
  predictedRating?: number;
  evidence?: SpectroGraphEvidence[];
}

export interface SpectroGraphEdge {
  id: string;
  source: string;
  target: string;
  kind: "preference" | "contribution";
  polarity: "positive" | "negative";
  value: number;
}

export interface SpectroDecisionGraph {
  nodes: SpectroGraphNode[];
  edges: SpectroGraphEdge[];
  signalCount: number;
  candidateCount: number;
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
  themeAffinities: SpectroAffinity[];
  favoriteSignals: SpectroFavoriteSignal[];
  evolution: SpectroMonth[];
  affinityTrends: SpectroAffinityTrend[];
  patterns: SpectroPattern[];
  recommendations: SpectroRecommendation[];
  decisionGraph: SpectroDecisionGraph;
  networkGraph: SpectroNetworkGraph;
}

export interface SpectroInput {
  viewings: Viewing[];
  movies: MovieRecord[];
  candidates: MovieRecord[];
  favoriteMovieIds?: string[];
  computedAt?: string;
}

interface RatedMovie {
  movie: MovieRecord;
  averageRating: number;
}

/**
 * Selecciona títulos locales válidos para recomendaciones.
 * Pendientes sí son candidatas; Vistas, visionados previos y títulos guardados
 * solo en colecciones quedan excluidos. No exige que los datos personales cambien.
 */
export function selectSpectroCandidates(
  movies: MovieRecord[],
  viewings: Viewing[],
  libraryEntries: LibraryEntry[],
  collectionMovies: CollectionMovie[]
): MovieRecord[] {
  const viewedIds = new Set(viewings.map((viewing) => viewing.movieId));
  const pendingIds = new Set(
    libraryEntries.filter((entry) => entry.status === "pending").map((entry) => entry.movieId)
  );
  const savedIds = new Set(libraryEntries.map((entry) => entry.movieId));
  const collectedIds = new Set(collectionMovies.map((entry) => entry.movieId));

  return movies.filter((movie) => (
    !viewedIds.has(movie.id)
    && (
      pendingIds.has(movie.id)
      || (!savedIds.has(movie.id) && !collectedIds.has(movie.id))
    )
    && Boolean(movie.genreIds?.length || movie.genres.length)
  ));
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

interface RecommendationAccumulator {
  reason: SpectroRecommendationReason;
  rawContribution: number;
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
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

function fnvHash(value: string, seed: number): string {
  let hash = seed;
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

function themeFeatures(movie: MovieRecord): Feature[] {
  return textFeatures(movie.keywords, "theme:");
}

function movieFeatureGroups(movie: MovieRecord): FeatureGroup[] {
  return [
    { category: "Género", weight: 1.3, features: movieGenreFeatures(movie) },
    { category: "Dirección", weight: 1.15, features: textFeatures(movie.directors, "director:") },
    { category: "Reparto", weight: 0.85, features: textFeatures(movie.castMembers, "cast:") },
    { category: "País", weight: 0.7, features: textFeatures(movie.countries, "country:") },
    { category: "Época", weight: 0.6, features: decadeFeatures(movie) },
    { category: "Idioma original", weight: 0.5, features: languageFeatures(movie) },
    { category: "Duración", weight: 0.45, features: durationFeatures(movie) },
    { category: "Temas", weight: 0.65, features: themeFeatures(movie) }
  ];
}

export function getSpectroInputFingerprint(input: SpectroInput): string {
  const viewings = [...input.viewings]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((viewing) => [
      viewing.id,
      viewing.movieId,
      viewing.watchedOn,
      viewing.rating ?? null,
      viewing.sequenceNumber
    ]);

  const moviesById = new Map<string, MovieRecord>();
  for (const movie of [...input.movies, ...input.candidates]) moviesById.set(movie.id, movie);
  const movies = [...moviesById.values()]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((movie) => [
      movie.id,
      movie.tmdbId,
      movie.title,
      movie.originalTitle,
      movie.overview,
      movie.genres,
      movie.genreIds,
      movie.countries,
      movie.directors,
      movie.castMembers,
      movie.releaseYear,
      movie.originalLanguage,
      movie.runtimeMinutes,
      movie.keywords,
      movie.posterPath,
      movie.backdropPath
    ]);

  const favoriteMovieIds = [...new Set(input.favoriteMovieIds ?? [])].sort();
  const candidateMovieIds = [...new Set(input.candidates.map((movie) => movie.id))].sort();
  const serialized = JSON.stringify({ viewings, movies, favoriteMovieIds, candidateMovieIds });
  // Dos hashes independientes amplían a 64 bits el identificador ligero de caché.
  return fnvHash(serialized, 2166136261) + fnvHash(serialized, 2246822519);
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

const SYNOPSIS_STOPWORDS = new Set([
  "a", "al", "algo", "algunas", "algunos", "ante", "antes", "como", "con", "contra",
  "cual", "cuando", "de", "del", "desde", "donde", "durante", "e", "el", "ella",
  "ellas", "ello", "ellos", "en", "entre", "era", "es", "esa", "esas", "ese", "eso",
  "esos", "esta", "estaba", "estaban", "estas", "este", "esto", "estos", "fue",
  "fueron", "ha", "había", "han", "hasta", "hay", "la", "las", "le", "les", "lo",
  "los", "más", "me", "mi", "mis", "mientras", "muy", "no", "nos", "nuestra",
  "nuestro", "o", "para", "pero", "por", "porque", "que", "quien", "se", "sin",
  "sobre", "su", "sus", "también", "te", "tiene", "tienen", "todo", "tras", "tu",
  "tus", "un", "una", "uno", "unos", "unas", "y", "ya", "the", "and", "for",
  "from", "with", "into", "that", "this", "their", "they", "them", "when", "where",
  "who", "what", "which", "while", "after", "before", "over", "under", "about",
  "into", "through", "his", "her", "its", "are", "was", "were", "has", "have",
  "had", "not", "but", "you", "your", "our", "out", "all", "any", "can", "will"
]);

function synopsisFeatures(movie: MovieRecord): Feature[] {
  const words = (movie.overview ?? "")
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .match(/[\\p{L}\\p{N}]{3,}/gu) ?? [];
  const tokens = words.filter((word) => !SYNOPSIS_STOPWORDS.has(word));
  const features = new Map<string, Feature>();

  for (const token of tokens) {
    const key = "synopsis:term:" + token;
    if (!features.has(key)) features.set(key, { key, label: token });
  }
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const phrase = tokens[index] + " " + tokens[index + 1];
    const key = "synopsis:phrase:" + phrase;
    if (!features.has(key)) features.set(key, { key, label: phrase });
  }
  return [...features.values()];
}

function buildSpectroPatterns(ratedMovies: RatedMovie[]): SpectroPattern[] {
  const interactionInput = ratedMovies.map((item) => ({
    id: item.movie.id,
    title: item.movie.title,
    rating: item.averageRating,
    groups: [
      ...movieFeatureGroups(item.movie).map((group) => ({
        category: group.category,
        features: group.features
      })),
      {
        category: "Sinopsis",
        features: synopsisFeatures(item.movie)
      }
    ]
  }));

  return buildSpectroInteractions(interactionInput, SPECTRO_MAX_PATTERNS);
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
        category: group.category,
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

function buildFavoriteSignals(
  movies: MovieRecord[],
  favoriteMovieIds: string[]
): SpectroFavoriteSignal[] {
  const favoriteIds = new Set(favoriteMovieIds);
  const grouped = new Map<string, {
    key: string;
    label: string;
    category: string;
    titles: string[];
  }>();

  for (const movie of movies) {
    if (!favoriteIds.has(movie.id)) continue;
    const seen = new Set<string>();
    for (const group of movieFeatureGroups(movie)) {
      for (const feature of group.features) {
        if (seen.has(feature.key)) continue;
        seen.add(feature.key);
        const existing = grouped.get(feature.key) ?? {
          key: feature.key,
          label: feature.label,
          category: group.category,
          titles: []
        };
        if (!existing.titles.includes(movie.title)) existing.titles.push(movie.title);
        grouped.set(feature.key, existing);
      }
    }
  }

  return [...grouped.values()]
    .map((group) => ({
      key: group.key,
      label: group.label,
      category: group.category,
      sampleSize: group.titles.length,
      supportingTitles: group.titles
    }))
    .sort((a, b) => b.sampleSize - a.sampleSize || a.category.localeCompare(b.category) || a.label.localeCompare(b.label));
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
  const previousEnd = shiftDate(recentStart, -1);
  const previousMovies = ratedMoviesInPeriod(viewings, movieById, previousStart, previousEnd);
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
  const ratedReasons = reasons.filter((reason) => reason.source === "valoraciones");
  if (ratedReasons.length === 0) return "declarada";
  const ratedFamilies = new Set(ratedReasons.map((reason) => reason.category));
  const minimumSupport = Math.min(...ratedReasons.map((reason) => reason.sampleSize));
  if (
    ratedFamilies.size >= 3
    && minimumSupport >= 5
    && ratedReasons.every((reason) => reason.confidence === "sólida")
  ) return "sólida";
  if (
    ratedFamilies.size >= 2
    && minimumSupport >= 3
    && ratedReasons.every((reason) => reason.confidence === "moderada" || reason.confidence === "sólida")
  ) return "moderada";
  return "inicial";
}

function graphFromRecommendations(
  recommendations: SpectroRecommendation[],
  affinities: SpectroAffinity[],
  favoriteSignals: SpectroFavoriteSignal[],
  ratedMovies: RatedMovie[],
  overallAverage: number,
  movieCount: number
): SpectroDecisionGraph {
  const nodes = new Map<string, SpectroGraphNode>();
  const edges = new Map<string, SpectroGraphEdge>();
  const affinityByKey = new Map(affinities.map((item) => [item.key, item]));
  const favoriteByKey = new Map(favoriteSignals.map((item) => [item.key, item]));
  const evidenceByKey = new Map<string, SpectroGraphEvidence[]>();

  for (const item of ratedMovies) {
    const seen = new Set<string>();
    for (const group of movieFeatureGroups(item.movie)) {
      for (const feature of group.features) {
        if (seen.has(feature.key)) continue;
        seen.add(feature.key);
        const evidence = evidenceByKey.get(feature.key) ?? [];
        evidence.push({ title: item.movie.title, rating: item.averageRating });
        evidenceByKey.set(feature.key, evidence);
      }
    }
  }

  nodes.set("profile", {
    id: "profile",
    kind: "profile",
    label: "Tu perfil",
    detail: movieCount + " películas · promedio " + round(overallAverage).toFixed(1) + "/10"
  });

  const visibleRecommendations = recommendations.slice(0, SPECTRO_MAX_GRAPH_RECOMMENDATIONS);
  for (const recommendation of visibleRecommendations) {
    const candidateId = "candidate:" + recommendation.movie.id;
    nodes.set(candidateId, {
      id: candidateId,
      kind: "candidate",
      label: recommendation.movie.title,
      detail: "Encaje " + recommendation.fitPercentage + "% · Nota " + recommendation.predictedRating.toFixed(1) + "/10",
      fitPercentage: recommendation.fitPercentage,
      predictedRating: recommendation.predictedRating,
      confidence: recommendation.confidence
    });

    for (const reason of recommendation.reasons) {
      const signalId = "signal:" + reason.source + ":" + reason.key;
      if (!nodes.has(signalId)) {
        if (reason.source === "favoritos") {
          const favorite = favoriteByKey.get(reason.key);
          if (!favorite) continue;
          nodes.set(signalId, {
            id: signalId,
            kind: "signal",
            label: reason.category + ": " + reason.label,
            detail: "Favorito declarado · " + favorite.sampleSize + " títulos · no es una nota",
            source: "favoritos",
            adjustedDifference: 0.35,
            sampleSize: favorite.sampleSize,
            confidence: "declarada",
            evidence: favorite.supportingTitles.map((title) => ({ title, rating: null }))
          });
        } else {
          const affinity = affinityByKey.get(reason.key);
          if (!affinity) continue;
          const supportingEvidence = (evidenceByKey.get(reason.key) ?? [])
            .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
          nodes.set(signalId, {
            id: signalId,
            kind: "signal",
            label: reason.category + ": " + reason.label,
            detail: (affinity.adjustedDifference > 0 ? "+" : "") + affinity.adjustedDifference.toFixed(2)
              + " ajustado · " + affinity.sampleSize + " títulos · " + affinity.confidence,
            source: "valoraciones",
            adjustedDifference: affinity.adjustedDifference,
            sampleSize: affinity.sampleSize,
            confidence: affinity.confidence,
            evidence: supportingEvidence
          });
        }

        const signalNode = nodes.get(signalId);
        if (signalNode) {
          const preferenceEdgeId = "preference:" + signalId;
          edges.set(preferenceEdgeId, {
            id: preferenceEdgeId,
            source: "profile",
            target: signalId,
            kind: "preference",
            polarity: (signalNode.adjustedDifference ?? 0) >= 0 ? "positive" : "negative",
            value: signalNode.adjustedDifference ?? 0
          });
        }
      }

      const contributionEdgeId = "contribution:" + signalId + ":" + candidateId;
      edges.set(contributionEdgeId, {
        id: contributionEdgeId,
        source: signalId,
        target: candidateId,
        kind: "contribution",
        polarity: reason.contribution >= 0 ? "positive" : "negative",
        value: reason.contribution
      });
    }
  }

  // Cuando todavía no hay candidatas, el grafo sigue mostrando las señales
  // respaldadas disponibles, sin inventar conexiones con películas no evaluadas.
  if (visibleRecommendations.length === 0) {
    const reliable = affinities
      .filter((item) => item.sampleSize >= 3 && (item.confidence === "moderada" || item.confidence === "sólida"))
      .sort((a, b) => Math.abs(b.adjustedDifference) - Math.abs(a.adjustedDifference))
      .slice(0, 12);
    for (const affinity of reliable) {
      const signalId = "signal:valoraciones:" + affinity.key;
      const evidence = (evidenceByKey.get(affinity.key) ?? [])
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      nodes.set(signalId, {
        id: signalId,
        kind: "signal",
        label: affinity.category + ": " + affinity.label,
        detail: (affinity.adjustedDifference > 0 ? "+" : "") + affinity.adjustedDifference.toFixed(2)
          + " ajustado · " + affinity.sampleSize + " títulos · " + affinity.confidence,
        source: "valoraciones",
        adjustedDifference: affinity.adjustedDifference,
        sampleSize: affinity.sampleSize,
        confidence: affinity.confidence,
        evidence
      });
      edges.set("preference:" + signalId, {
        id: "preference:" + signalId,
        source: "profile",
        target: signalId,
        kind: "preference",
        polarity: affinity.adjustedDifference >= 0 ? "positive" : "negative",
        value: affinity.adjustedDifference
      });
    }

    for (const favorite of favoriteSignals.slice(0, 8)) {
      const signalId = "signal:favoritos:" + favorite.key;
      nodes.set(signalId, {
        id: signalId,
        kind: "signal",
        label: favorite.category + ": " + favorite.label,
        detail: "Favorito declarado · " + favorite.sampleSize + " títulos · no es una nota",
        source: "favoritos",
        adjustedDifference: 0.35,
        sampleSize: favorite.sampleSize,
        confidence: "declarada",
        evidence: favorite.supportingTitles.map((title) => ({ title, rating: null }))
      });
      edges.set("preference:" + signalId, {
        id: "preference:" + signalId,
        source: "profile",
        target: signalId,
        kind: "preference",
        polarity: "positive",
        value: 0.35
      });
    }
  }

  const graphNodes = [...nodes.values()];
  return {
    nodes: graphNodes,
    edges: [...edges.values()],
    signalCount: graphNodes.filter((node) => node.kind === "signal").length,
    candidateCount: graphNodes.filter((node) => node.kind === "candidate").length
  };
}

function buildRecommendations(
  candidates: MovieRecord[],
  affinities: SpectroAffinity[],
  favoriteSignals: SpectroFavoriteSignal[],
  watchedMovieIds: Set<string>,
  overallAverage: number,
  ratedMovies: RatedMovie[]
): { recommendations: SpectroRecommendation[]; graph: SpectroDecisionGraph } {
  const reliable = new Map(
    affinities
      .filter((affinity) => (
        affinity.sampleSize >= 3
        && Math.abs(affinity.adjustedDifference) >= 0.25
        && (affinity.confidence === "moderada" || affinity.confidence === "sólida")
      ))
      .map((affinity) => [affinity.key, affinity])
  );
  const explicit = new Map(favoriteSignals.map((signal) => [signal.key, signal]));
  const modelPredictions = predictSpectroMovies(
    ratedMovies.map((item) => ({ movie: item.movie, rating: item.averageRating })),
    candidates
  );
  const ranked: SpectroRecommendation[] = [];

  for (const movie of candidates) {
    if (watchedMovieIds.has(movie.id)) continue;

    let totalFitWeight = 0;
    let totalFitDifference = 0;
    let totalRatingWeight = 0;
    let totalRatingDifference = 0;
    let positiveRatingEvidence = false;
    const accumulators: RecommendationAccumulator[] = [];

    for (const group of movieFeatureGroups(movie)) {
      const seen = new Set<string>();
      const matchedRatings = group.features
        .filter((feature) => {
          if (seen.has(feature.key)) return false;
          seen.add(feature.key);
          return reliable.has(feature.key);
        })
        .flatMap((feature) => {
          const affinity = reliable.get(feature.key);
          return affinity ? [{ feature, affinity }] : [];
        });
      const matchedFavorites = group.features
        .filter((feature) => explicit.has(feature.key));

      if (matchedRatings.length === 0 && matchedFavorites.length === 0) continue;

      const familyRatingDifference = mean(matchedRatings.map((item) => item.affinity.adjustedDifference));
      const familyFavoriteBoost = matchedFavorites.length ? 0.35 : 0;
      const familyFitDifference = familyRatingDifference + familyFavoriteBoost;

      totalFitWeight += group.weight;
      totalFitDifference += familyFitDifference * group.weight;

      if (matchedRatings.length > 0) {
        totalRatingWeight += group.weight;
        totalRatingDifference += familyRatingDifference * group.weight;
      }
      if (familyRatingDifference > 0) positiveRatingEvidence = true;

      for (const item of matchedRatings) {
        accumulators.push({
          rawContribution: item.affinity.adjustedDifference * group.weight / matchedRatings.length,
          reason: {
            key: item.feature.key,
            category: group.category,
            label: item.feature.label,
            source: "valoraciones",
            difference: item.affinity.adjustedDifference,
            contribution: 0,
            sampleSize: item.affinity.sampleSize,
            confidence: item.affinity.confidence
          }
        });
      }

      for (const feature of matchedFavorites) {
        const favorite = explicit.get(feature.key);
        if (!favorite) continue;
        accumulators.push({
          rawContribution: familyFavoriteBoost * group.weight / matchedFavorites.length,
          reason: {
            key: feature.key,
            category: group.category,
            label: feature.label,
            source: "favoritos",
            difference: 0,
            contribution: 0,
            sampleSize: favorite.sampleSize,
            confidence: "declarada"
          }
        });
      }
    }

    if (totalFitWeight === 0) continue;

    const netFitDifference = totalFitDifference / totalFitWeight;
    const netRatingDifference = totalRatingWeight > 0
      ? totalRatingDifference / totalRatingWeight
      : 0;
    const fitPercentage = Math.round(clamp(50 + netFitDifference * 12.5, 0, 100));
    if (fitPercentage <= 50 || (!positiveRatingEvidence && accumulators.every((item) => item.reason.source !== "favoritos"))) {
      continue;
    }

    const reasons = accumulators
      .map((item) => ({
        ...item.reason,
        contribution: round((item.rawContribution / totalFitWeight) * 12.5)
      }))
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    const modelPrediction = modelPredictions.get(movie.id);
    ranked.push({
      movie,
      fitPercentage,
      predictedRating: modelPrediction?.predictedRating
        ?? round(clamp(overallAverage + netRatingDifference, 0, 10)),
      confidence: recommendationConfidence(reasons),
      reasons,
      similarMovies: modelPrediction?.neighbors ?? []
    });
  }

  const seen = new Set<string>();
  const recommendations = rankSpectroRecommendations(ranked)
    .filter((item) => {
      if (seen.has(item.movie.id)) return false;
      seen.add(item.movie.id);
      return true;
    })
    .slice(0, 12);

  return {
    recommendations,
    graph: graphFromRecommendations(
      recommendations,
      affinities,
      favoriteSignals,
      ratedMovies,
      overallAverage,
      ratedMovies.length
    )
  };
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
  const themeAffinities = affinities(themeFeatures, "Temas", 0.65);

  const allAffinities = [
    ...genreAffinities,
    ...directorAffinities,
    ...castAffinities,
    ...countryAffinities,
    ...decadeAffinities,
    ...languageAffinities,
    ...durationAffinities,
    ...themeAffinities
  ];
  const favoriteSignals = buildFavoriteSignals(input.movies, input.favoriteMovieIds ?? []);
  const watchedIds = new Set(input.viewings.map((viewing) => viewing.movieId));

  const recommendationResult = enough && overall !== null
    ? buildRecommendations(
      input.candidates,
      allAffinities,
      favoriteSignals,
      watchedIds,
      overall,
      ratedMovies
    )
    : {
      recommendations: [] as SpectroRecommendation[],
      graph: graphFromRecommendations(
        [],
        allAffinities,
        favoriteSignals,
        ratedMovies,
        overall ?? 0,
        ratedMovies.length
      )
    };

  return {
    algorithmVersion: SPECTRO_ALGORITHM_VERSION,
    inputFingerprint: getSpectroInputFingerprint(input),
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
    themeAffinities,
    favoriteSignals,
    evolution: buildEvolution(input.viewings),
    affinityTrends: buildAffinityTrends(input.viewings, movieById),
    patterns: enough && overall !== null ? buildSpectroPatterns(ratedMovies) : [],
    recommendations: recommendationResult.recommendations,
    decisionGraph: recommendationResult.graph,
    networkGraph: buildSpectroNetworkGraph({
      movies: input.movies,
      viewings: input.viewings,
      favoriteMovieIds: input.favoriteMovieIds ?? [],
      affinities: allAffinities,
      favoriteSignals,
      recommendations: recommendationResult.recommendations
    })
  };
}
