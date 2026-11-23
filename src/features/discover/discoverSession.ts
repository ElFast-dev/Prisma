import {
  hasActiveDiscoverFilters,
  normalizeDiscoverFilters,
  type DiscoverFilters
} from "../../domain/discoverFilters";
import type { TmdbMovieSummary } from "../../infrastructure/tmdb/TmdbService";

const STORAGE_KEY = "prisma:discover-session:v1";
const MAX_SAVED_MOVIES = 240;

export interface DiscoverSessionSnapshot {
  query: string;
  appliedFilters: DiscoverFilters;
  movies: TmdbMovieSummary[];
  page: number;
  totalPages: number;
  totalResults: number;
  imageBase: string;
  showingCachedData: boolean;
  cachedFetchedAt: string;
}

export type DiscoverSpectroState = "loading" | "insufficient" | "ready" | "no-matches" | "unavailable";

export function getDiscoverSpectroState(movieCount: number, recommendationCount: number): DiscoverSpectroState {
  if (movieCount < 3) return "insufficient";
  return recommendationCount > 0 ? "ready" : "no-matches";
}

/** Una respuesta tardía de otra página no debe degradar recomendaciones ya disponibles. */
export function preserveDiscoverSpectroReadyState(
  current: DiscoverSpectroState,
  next: DiscoverSpectroState
): DiscoverSpectroState {
  return current === "ready" && next !== "ready" ? current : next;
}

interface SessionStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function getBrowserSessionStorage(): SessionStorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown, fallback: number, maximum: number): number {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0
    ? Math.min(maximum, number)
    : fallback;
}

function validImageBase(value: unknown): string {
  if (typeof value !== "string") return "https://image.tmdb.org/t/p/";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "https://image.tmdb.org/t/p/";
  } catch {
    return "https://image.tmdb.org/t/p/";
  }
}

function restoreMovies(value: unknown): TmdbMovieSummary[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): TmdbMovieSummary[] => {
    if (!isRecord(item) || !Number.isSafeInteger(item.id) || Number(item.id) <= 0
      || typeof item.title !== "string" || !item.title.trim()) {
      return [];
    }
    return [{
      id: Number(item.id),
      title: item.title.slice(0, 500),
      ...(typeof item.original_title === "string" ? { original_title: item.original_title.slice(0, 500) } : {}),
      ...(typeof item.overview === "string" ? { overview: item.overview.slice(0, 5000) } : {}),
      ...(typeof item.release_date === "string" ? { release_date: item.release_date.slice(0, 20) } : {}),
      ...(typeof item.poster_path === "string" || item.poster_path === null ? { poster_path: item.poster_path } : {}),
      ...(typeof item.backdrop_path === "string" || item.backdrop_path === null ? { backdrop_path: item.backdrop_path } : {}),
      ...(Array.isArray(item.genre_ids) ? { genre_ids: item.genre_ids.filter((id): id is number => Number.isSafeInteger(id)) } : {}),
      ...(typeof item.vote_average === "number" && Number.isFinite(item.vote_average) ? { vote_average: item.vote_average } : {}),
      ...(typeof item.vote_count === "number" && Number.isFinite(item.vote_count) ? { vote_count: item.vote_count } : {}),
      ...(typeof item.original_language === "string" ? { original_language: item.original_language.slice(0, 8) } : {}),
      ...(typeof item.popularity === "number" && Number.isFinite(item.popularity) ? { popularity: item.popularity } : {})
    }];
  }).slice(0, MAX_SAVED_MOVIES);
}

export function getDiscoverFeedKey(query: string, filters: DiscoverFilters): string {
  const normalizedFilters = normalizeDiscoverFilters(filters);
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  const catalogFilters: Partial<DiscoverFilters> = { ...normalizedFilters };
  delete catalogFilters.hideWatched;
  delete catalogFilters.hidePending;
  const source = normalizedQuery
    ? "search:" + normalizedQuery
    : hasActiveDiscoverFilters(normalizedFilters) ? "discover" : "trending";
  return source + ":" + JSON.stringify(catalogFilters);
}

/**
 * Conserva la pantalla de Descubrir durante la navegación a una ficha.
 * Solo usa sessionStorage: no guarda datos personales ni modifica IndexedDB.
 */
export function readDiscoverSession(
  storage: SessionStorageLike | null = getBrowserSessionStorage()
): DiscoverSessionSnapshot | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || (parsed.version !== 1 && parsed.version !== 2)) return null;

    const query = typeof parsed.query === "string" ? parsed.query.slice(0, 200) : "";
    const storedFilters = isRecord(parsed.appliedFilters)
      ? parsed.appliedFilters as Partial<DiscoverFilters>
      : null;
    // La versión 1 usaba popularity.desc como valor predeterminado. Desde la
    // versión 2 el orden elegido es explícito y no debe reinterpretarse al restaurar.
    const filtersToRestore = parsed.version === 1 && storedFilters?.sortBy === "popularity.desc"
      ? { ...storedFilters, sortBy: "spectro" }
      : storedFilters;
    const appliedFilters = normalizeDiscoverFilters(filtersToRestore);
    const page = positiveInteger(parsed.page, 1, 500);
    const totalPages = Math.max(page, positiveInteger(parsed.totalPages, 1, 500));

    return {
      query,
      appliedFilters,
      movies: restoreMovies(parsed.movies),
      page,
      totalPages,
      totalResults: positiveInteger(parsed.totalResults, 0, 1_000_000),
      imageBase: validImageBase(parsed.imageBase),
      showingCachedData: parsed.showingCachedData === true,
      cachedFetchedAt: typeof parsed.cachedFetchedAt === "string" ? parsed.cachedFetchedAt.slice(0, 64) : ""
    };
  } catch {
    return null;
  }
}

export function writeDiscoverSession(
  snapshot: DiscoverSessionSnapshot,
  storage: SessionStorageLike | null = getBrowserSessionStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      version: 2,
      query: snapshot.query.slice(0, 200),
      appliedFilters: normalizeDiscoverFilters(snapshot.appliedFilters),
      movies: snapshot.movies.slice(0, MAX_SAVED_MOVIES),
      page: positiveInteger(snapshot.page, 1, 500),
      totalPages: positiveInteger(snapshot.totalPages, 1, 500),
      totalResults: positiveInteger(snapshot.totalResults, 0, 1_000_000),
      imageBase: validImageBase(snapshot.imageBase),
      showingCachedData: snapshot.showingCachedData,
      cachedFetchedAt: snapshot.cachedFetchedAt.slice(0, 64)
    }));
  } catch {
    // La navegación y la búsqueda no dependen de sessionStorage.
  }
}
