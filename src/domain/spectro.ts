import type { MovieRecord, Viewing } from "./types";

export const SPECTRO_ALGORITHM_VERSION = "1.1.0";
export const SPECTRO_MINIMUM_MOVIES = 3;

export interface SpectroAffinity { key: string; label: string; averageRating: number; difference: number; sampleSize: number; }
export interface SpectroMonth { month: string; averageRating: number; viewingCount: number; }
export interface SpectroRecommendation { movie: MovieRecord; score: number; reasons: string[]; }
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
  evolution: SpectroMonth[];
  recommendations: SpectroRecommendation[];
}
export interface SpectroInput { viewings: Viewing[]; movies: MovieRecord[]; candidates: MovieRecord[]; computedAt?: string; }

const genreNames: Record<number, string> = {
  28: "Acción", 12: "Aventura", 16: "Animación", 35: "Comedia", 80: "Crimen",
  99: "Documental", 18: "Drama", 10751: "Familia", 14: "Fantasía", 36: "Historia",
  27: "Terror", 10402: "Música", 9648: "Misterio", 10749: "Romance",
  878: "Ciencia ficción", 10770: "Película de TV", 53: "Suspenso", 10752: "Bélica", 37: "Western"
};
function normalize(value: string): string { return value.trim().toLocaleLowerCase(); }
const genreIdsByName = new Map(Object.entries(genreNames).map(([id, name]) => [normalize(name), Number(id)]));
function round(value: number): number { return Math.round(value * 100) / 100; }

function hashFingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function movieGenreFeatures(movie: MovieRecord): { key: string; label: string }[] {
  if (movie.genreIds?.length) {
    return [...new Set(movie.genreIds)].map((id) => ({
      key: "genre:" + id,
      label: genreNames[id] ?? movie.genres.find((name) => genreIdsByName.get(normalize(name)) === id) ?? "Género " + id
    }));
  }
  return [...new Set(movie.genres.map((name) => name.trim()).filter(Boolean))].map((name) => {
    const knownId = genreIdsByName.get(normalize(name));
    return { key: knownId ? "genre:" + knownId : "genre-name:" + normalize(name), label: name };
  });
}

function decadeFeature(movie: MovieRecord): { key: string; label: string }[] {
  if (!movie.releaseYear || movie.releaseYear < 1880) return [];
  const decade = Math.floor(movie.releaseYear / 10) * 10;
  return [{ key: "decade:" + decade, label: decade + "s" }];
}
interface RatedMovie { movie: MovieRecord; averageRating: number; }

function buildAffinities(
  ratedMovies: RatedMovie[],
  selectFeatures: (movie: MovieRecord) => { key: string; label: string }[]
): SpectroAffinity[] {
  const grouped = new Map<string, { label: string; ratings: number[] }>();
  for (const item of ratedMovies) {
    const seen = new Set<string>();
    for (const feature of selectFeatures(item.movie)) {
      if (seen.has(feature.key)) continue;
      seen.add(feature.key);
      const group = grouped.get(feature.key) ?? { label: feature.label, ratings: [] };
      group.ratings.push(item.averageRating);
      grouped.set(feature.key, group);
    }
  }
  return [...grouped.entries()]
    .filter(([, group]) => group.ratings.length >= 2)
    .map(([key, group]) => ({
      key, label: group.label,
      averageRating: round(group.ratings.reduce((sum, rating) => sum + rating, 0) / group.ratings.length),
      difference: 0, sampleSize: group.ratings.length
    }));
}

function fingerprintInput(input: SpectroInput): string {
  const viewings = [...input.viewings].sort((a, b) => a.id.localeCompare(b.id))
    .map((v) => [v.id, v.movieId, v.watchedOn, v.rating ?? null, v.sequenceNumber]);
  const movies = [...input.movies, ...input.candidates].sort((a, b) => a.id.localeCompare(b.id))
    .map((m) => [m.id, m.title, m.genres, m.genreIds, m.countries, m.directors, m.castMembers, m.releaseYear]);
  return hashFingerprint(JSON.stringify({ viewings, movies }));
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
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, ratings]) => ({
    month,
    averageRating: round(ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length),
    viewingCount: ratings.length
  }));
}

function buildRecommendations(candidates: MovieRecord[], genreAffinities: SpectroAffinity[], watchedMovieIds: Set<string>): SpectroRecommendation[] {
  const positive = new Map(genreAffinities.filter((a) => a.difference >= 0.25).map((a) => [a.key, a]));
  if (!positive.size) return [];
  const ranked = candidates.filter((movie) => !watchedMovieIds.has(movie.id)).map((movie) => {
    const matched = movieGenreFeatures(movie).map((feature) => positive.get(feature.key))
      .filter((a): a is SpectroAffinity => Boolean(a));
    const reasons = matched.sort((a, b) => b.difference - a.difference).slice(0, 3)
      .map((a) => "Conecta con tu afinidad por " + a.label);
    return {
      movie,
      score: matched.length ? round(matched.reduce((sum, a) => sum + a.difference, 0) / matched.length) : 0,
      reasons
    };
  }).filter((item) => item.reasons.length > 0)
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
  const ratedMovies: RatedMovie[] = [...ratingsByMovie.entries()].map(([movieId, ratings]) => {
    const movie = movieById.get(movieId);
    return movie && ratings.length ? {
      movie, averageRating: ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    } : undefined;
  }).filter((item): item is RatedMovie => Boolean(item));

  const ratedViewings = input.viewings.filter((viewing) => viewing.rating !== undefined);
  const overall = ratedViewings.length
    ? ratedViewings.reduce((sum, viewing) => sum + (viewing.rating ?? 0), 0) / ratedViewings.length
    : null;
  const enough = ratedMovies.length >= SPECTRO_MINIMUM_MOVIES;
  const affinities = (selector: (movie: MovieRecord) => { key: string; label: string }[]) => {
    if (!enough || overall === null) return [];
    return buildAffinities(ratedMovies, selector)
      .map((item) => ({ ...item, difference: round(item.averageRating - overall) }))
      .sort((a, b) => b.difference - a.difference || b.sampleSize - a.sampleSize);
  };
  const genreAffinities = affinities(movieGenreFeatures);
  const directorAffinities = affinities((movie) => [...new Set(movie.directors ?? [])]
    .map((name) => ({ key: "director:" + normalize(name), label: name })));
  const castAffinities = affinities((movie) => [...new Set(movie.castMembers ?? [])]
    .map((name) => ({ key: "cast:" + normalize(name), label: name })));
  const countryAffinities = affinities((movie) => [...new Set(movie.countries)]
    .map((name) => ({ key: "country:" + normalize(name), label: name })));
  const decadeAffinities = affinities(decadeFeature);
  const watchedIds = new Set(input.viewings.map((viewing) => viewing.movieId));
  return {
    algorithmVersion: SPECTRO_ALGORITHM_VERSION,
    inputFingerprint: fingerprintInput(input),
    computedAt: input.computedAt ?? new Date().toISOString(),
    movieCount: ratedMovies.length,
    totalViewings: input.viewings.length,
    averageRating: overall === null ? null : round(overall),
    hasEnoughData: enough,
    genreAffinities, directorAffinities, castAffinities, countryAffinities, decadeAffinities,
    evolution: buildEvolution(input.viewings),
    recommendations: enough ? buildRecommendations(input.candidates, genreAffinities, watchedIds) : []
  };
}
