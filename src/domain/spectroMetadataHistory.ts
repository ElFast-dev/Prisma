import type { MovieRecord } from "./types";

export type SpectroMetadataSnapshotSource = "tmdb-observed" | "legacy-updated-at";

export interface SpectroMetadataSnapshot {
  movieId: string;
  observedAt: string;
  source: SpectroMetadataSnapshotSource;
  overview?: string;
  genres: string[];
  genreIds?: number[];
  countries: string[];
  directors?: string[];
  castMembers?: string[];
  keywords?: string[];
  originalLanguage?: string;
  releaseYear?: number;
  runtimeMinutes?: number;
}

/** Copia únicamente los rasgos cinematográficos que aprende el predictor. */
export function createSpectroMetadataSnapshot(
  movie: MovieRecord,
  observedAt: string,
  source: SpectroMetadataSnapshotSource
): SpectroMetadataSnapshot | null {
  if (!movie.id.trim() || !Number.isFinite(Date.parse(observedAt))) return null;
  return {
    movieId: movie.id,
    observedAt: new Date(observedAt).toISOString(),
    source,
    ...(typeof movie.overview === "string" ? { overview: movie.overview } : {}),
    genres: [...movie.genres],
    ...(movie.genreIds ? { genreIds: [...movie.genreIds] } : {}),
    countries: [...movie.countries],
    ...(movie.directors ? { directors: [...movie.directors] } : {}),
    ...(movie.castMembers ? { castMembers: [...movie.castMembers] } : {}),
    ...(movie.keywords ? { keywords: [...movie.keywords] } : {}),
    ...(movie.originalLanguage ? { originalLanguage: movie.originalLanguage } : {}),
    ...(typeof movie.releaseYear === "number" ? { releaseYear: movie.releaseYear } : {}),
    ...(typeof movie.runtimeMinutes === "number" ? { runtimeMinutes: movie.runtimeMinutes } : {})
  };
}

function validUtcDay(value: string): string | null {
  if (!value || !Number.isFinite(Date.parse(value))) return null;
  return new Date(value).toISOString().slice(0, 10);
}

/** Valida los registros persistidos antes de usarlos en una evaluación. */
export function isSpectroMetadataSnapshot(value: unknown): value is SpectroMetadataSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const snapshot = value as Partial<SpectroMetadataSnapshot>;
  return typeof snapshot.movieId === "string"
    && snapshot.movieId.length > 0
    && typeof snapshot.observedAt === "string"
    && validUtcDay(snapshot.observedAt) !== null
    && (snapshot.source === "tmdb-observed" || snapshot.source === "legacy-updated-at")
    && Array.isArray(snapshot.genres)
    && snapshot.genres.every((item) => typeof item === "string")
    && Array.isArray(snapshot.countries)
    && snapshot.countries.every((item) => typeof item === "string")
    && (snapshot.genreIds === undefined || (
      Array.isArray(snapshot.genreIds) && snapshot.genreIds.every(Number.isSafeInteger)
    ))
    && (snapshot.directors === undefined || (
      Array.isArray(snapshot.directors) && snapshot.directors.every((item) => typeof item === "string")
    ))
    && (snapshot.castMembers === undefined || (
      Array.isArray(snapshot.castMembers) && snapshot.castMembers.every((item) => typeof item === "string")
    ))
    && (snapshot.keywords === undefined || (
      Array.isArray(snapshot.keywords) && snapshot.keywords.every((item) => typeof item === "string")
    ))
    && (snapshot.overview === undefined || typeof snapshot.overview === "string")
    && (snapshot.originalLanguage === undefined || typeof snapshot.originalLanguage === "string")
    && (snapshot.releaseYear === undefined || Number.isSafeInteger(snapshot.releaseYear))
    && (snapshot.runtimeMinutes === undefined || Number.isFinite(snapshot.runtimeMinutes));
}

/**
 * Devuelve la observación más reciente conocida antes del corte.
 * Las observaciones del mismo día se excluyen: watchedOn no conserva hora y
 * no permite demostrar cuál de los dos sucesos ocurrió primero.
 */
export function selectSpectroMetadataSnapshot(
  snapshots: readonly SpectroMetadataSnapshot[],
  movieId: string,
  cutoffDay: string
): SpectroMetadataSnapshot | null {
  const cutoff = validUtcDay(cutoffDay);
  if (!cutoff) return null;
  let selected: SpectroMetadataSnapshot | null = null;
  let selectedTimestamp = Number.NEGATIVE_INFINITY;

  for (const snapshot of snapshots) {
    if (snapshot.movieId !== movieId || !isSpectroMetadataSnapshot(snapshot)) continue;
    const day = validUtcDay(snapshot.observedAt);
    if (!day || day >= cutoff) continue;
    const timestamp = Date.parse(snapshot.observedAt);
    if (timestamp > selectedTimestamp) {
      selected = snapshot;
      selectedTimestamp = timestamp;
    }
  }
  return selected;
}

/**
 * Sustituye todos los rasgos aprendibles por su valor histórico.
 * No completa campos ausentes con el catálogo actual: eso reintroduciría fuga.
 */
export function applySpectroMetadataSnapshot(
  movie: MovieRecord,
  snapshot: SpectroMetadataSnapshot
): MovieRecord {
  return {
    ...movie,
    overview: snapshot.overview,
    genres: [...snapshot.genres],
    genreIds: snapshot.genreIds ? [...snapshot.genreIds] : undefined,
    countries: [...snapshot.countries],
    directors: snapshot.directors ? [...snapshot.directors] : undefined,
    castMembers: snapshot.castMembers ? [...snapshot.castMembers] : undefined,
    keywords: snapshot.keywords ? [...snapshot.keywords] : undefined,
    originalLanguage: snapshot.originalLanguage,
    releaseYear: snapshot.releaseYear,
    runtimeMinutes: snapshot.runtimeMinutes
  };
}

/** Huella estable de los campos que realmente consume el predictor. */
export function getSpectroMetadataFingerprint(snapshot: SpectroMetadataSnapshot): string {
  const normalized = {
    overview: snapshot.overview ?? null,
    genres: [...snapshot.genres].sort(),
    genreIds: [...(snapshot.genreIds ?? [])].sort((a, b) => a - b),
    countries: [...snapshot.countries].sort(),
    directors: [...(snapshot.directors ?? [])].sort(),
    castMembers: [...(snapshot.castMembers ?? [])].sort(),
    keywords: [...(snapshot.keywords ?? [])].sort(),
    originalLanguage: snapshot.originalLanguage ?? null,
    releaseYear: snapshot.releaseYear ?? null,
    runtimeMinutes: snapshot.runtimeMinutes ?? null
  };
  return JSON.stringify(normalized);
}
