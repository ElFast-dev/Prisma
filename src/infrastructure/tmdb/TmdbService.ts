import type { CatalogCacheEntry } from "../../domain/types";
import { prismaDb } from "../database/database";
import { TmdbClient } from "./TmdbClient";

export interface TmdbMovieSummary {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  vote_average?: number;
  popularity?: number;
}

export interface TmdbMovieDetails extends TmdbMovieSummary {
  runtime?: number | null;
  status?: string;
  genres?: { id: number; name: string }[];
  production_countries?: { iso_3166_1: string; name: string }[];
  original_language?: string;
}

export interface TmdbPerson {
  id: number;
  name: string;
  profile_path?: string | null;
  character?: string;
  job?: string;
  department?: string;
}

export interface TmdbCredits {
  cast: TmdbPerson[];
  crew: TmdbPerson[];
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
  display_priority?: number;
}

export interface TmdbWatchRegion {
  link?: string;
  flatrate?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}

export interface TmdbMovieBundle {
  details: TmdbMovieDetails;
  credits: TmdbCredits;
  recommendations: TmdbMovieSummary[];
  watchProviders?: TmdbWatchRegion;
  watchFetchedAt: string;
  staleResources: string[];
}

interface TmdbListResponse {
  page: number;
  results: TmdbMovieSummary[];
  total_pages: number;
  total_results: number;
}

interface TmdbConfiguration {
  images: {
    secure_base_url: string;
    poster_sizes: string[];
    backdrop_sizes: string[];
    profile_sizes: string[];
  };
}

const LANGUAGE = "es-MX";

function client(token?: string): TmdbClient {
  if (!token?.trim()) throw new Error("Configura tu credencial de TMDB en Ajustes.");
  return new TmdbClient(token);
}

function cacheTtlMs(cacheKey: string): number {
  const hours = 60 * 60 * 1000;
  const days = 24 * hours;
  if (cacheKey.startsWith("search:") || cacheKey.startsWith("trending:")) return 6 * hours;
  if (cacheKey.startsWith("movie:details:")) return 30 * days;
  if (cacheKey.startsWith("movie:credits:")) return 90 * days;
  if (cacheKey.startsWith("movie:recommendations:")) return 7 * days;
  if (cacheKey.startsWith("movie:providers:")) return 24 * hours;
  if (cacheKey.startsWith("configuration:")) return 30 * days;
  return 24 * hours;
}

async function getCached<T>(
  token: string,
  cacheKey: string,
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<{ data: T; fetchedAt: string; stale: boolean }> {
  const cached = await prismaDb.catalogCache.get(cacheKey);
  const cachedTimestamp = cached ? Date.parse(cached.fetchedAt) : Number.NaN;
  const cacheIsFresh = Boolean(
    cached && Number.isFinite(cachedTimestamp)
    && Date.now() - cachedTimestamp < cacheTtlMs(cacheKey)
  );

  if (cached && cacheIsFresh) {
    return { data: cached.payload as T, fetchedAt: cached.fetchedAt, stale: false };
  }

  try {
    const data = await client(token).get<T>(endpoint, { params });
    const now = new Date().toISOString();
    const entry: CatalogCacheEntry = {
      cacheKey,
      resourceType: endpoint.split("/")[1] ?? "catalog",
      payload: data,
      fetchedAt: now,
      lastValidatedAt: now
    };

    // Una cuota local agotada no debe impedir mostrar el resultado recién obtenido.
    try {
      await prismaDb.catalogCache.put(entry);
    } catch {
      // El resultado sigue disponible en memoria para esta consulta.
    }

    return { data, fetchedAt: now, stale: false };
  } catch (error) {
    if (cached) {
      return { data: cached.payload as T, fetchedAt: cached.fetchedAt, stale: true };
    }
    throw error;
  }
}

export async function testTmdbConnection(token: string): Promise<void> {
  await client(token).get<TmdbConfiguration>("configuration");
}

export async function getImageConfiguration(token: string): Promise<TmdbConfiguration["images"]> {
  const result = await getCached<TmdbConfiguration>(token, "configuration:images", "configuration");
  return result.data.images;
}

export async function getTrendingMovies(
  token: string,
  page = 1
): Promise<{ movies: TmdbMovieSummary[]; totalPages: number; stale: boolean; fetchedAt: string }> {
  const result = await getCached<TmdbListResponse>(
    token,
    "trending:movie:week:" + page,
    "trending/movie/week",
    { page, language: LANGUAGE }
  );
  return {
    movies: result.data.results ?? [],
    totalPages: result.data.total_pages ?? 1,
    stale: result.stale,
    fetchedAt: result.fetchedAt
  };
}

export async function searchMovies(
  token: string,
  query: string,
  page = 1
): Promise<{ movies: TmdbMovieSummary[]; totalPages: number; stale: boolean; fetchedAt: string }> {
  const normalized = query.trim();
  if (!normalized) return { movies: [], totalPages: 0, stale: false, fetchedAt: new Date().toISOString() };
  const result = await getCached<TmdbListResponse>(
    token,
    "search:movie:" + normalized.toLocaleLowerCase() + ":" + page,
    "search/movie",
    { query: normalized, page, language: LANGUAGE, include_adult: false }
  );
  return {
    movies: result.data.results ?? [],
    totalPages: result.data.total_pages ?? 1,
    stale: result.stale,
    fetchedAt: result.fetchedAt
  };
}

export async function getMovieBundle(token: string, tmdbId: number, region: string): Promise<TmdbMovieBundle> {
  const [details, credits, recommendations, providers] = await Promise.allSettled([
    getCached<TmdbMovieDetails>(token, "movie:details:" + tmdbId, "movie/" + tmdbId, { language: LANGUAGE }),
    getCached<TmdbCredits>(token, "movie:credits:" + tmdbId, "movie/" + tmdbId + "/credits", { language: LANGUAGE }),
    getCached<TmdbListResponse>(token, "movie:recommendations:" + tmdbId, "movie/" + tmdbId + "/recommendations", { language: LANGUAGE, page: 1 }),
    getCached<{ results?: Record<string, TmdbWatchRegion> }>(
      token,
      "movie:providers:" + tmdbId + ":" + region,
      "movie/" + tmdbId + "/watch/providers"
    )
  ]);

  if (details.status === "rejected") throw details.reason;

  const staleResources: string[] = [];
  if (details.value.stale) staleResources.push("details");
  if (credits.status === "fulfilled" && credits.value.stale) staleResources.push("credits");
  else if (credits.status === "rejected") staleResources.push("credits");
  if (recommendations.status === "fulfilled" && recommendations.value.stale) staleResources.push("recommendations");
  else if (recommendations.status === "rejected") staleResources.push("recommendations");
  if (providers.status === "fulfilled" && providers.value.stale) staleResources.push("providers");
  else if (providers.status === "rejected") staleResources.push("providers");

  const watchProviders = providers.status === "fulfilled"
    ? providers.value.data.results?.[region]
    : undefined;
  const safeCredits = credits.status === "fulfilled" ? credits.value.data : { cast: [], crew: [] };
  const safeRecommendations = recommendations.status === "fulfilled"
    ? recommendations.value.data.results ?? []
    : [];

  return {
    details: details.value.data,
    credits: safeCredits,
    recommendations: safeRecommendations,
    watchProviders,
    watchFetchedAt: providers.status === "fulfilled" ? providers.value.fetchedAt : "",
    staleResources
  };
}

export function getTmdbImageUrl(
  baseUrl: string,
  path: string | null | undefined,
  size: "w185" | "w342" | "w500" | "w780" | "original"
): string | null {
  if (!path) return null;
  const normalizedPath = path.replace(/^\/+/, "");
  if (!normalizedPath || normalizedPath.includes("..")) return null;
  try {
    const base = new URL(baseUrl);
    if (base.protocol !== "https:") return null;
    const prefix = base.toString().endsWith("/") ? base.toString() : base.toString() + "/";
    return new URL(size + "/" + normalizedPath, prefix).toString();
  } catch {
    return null;
  }
}
