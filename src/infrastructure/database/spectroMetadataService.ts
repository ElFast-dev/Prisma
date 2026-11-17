import type { AppMetadata, MovieRecord } from "../../domain/types";
import { createMovieMetadataPatch } from "../../domain/movieMetadata";
import { TmdbHttpError } from "../tmdb/TmdbClient";
import {
  getMovieAnalysisMetadata,
  type TmdbMovieAnalysisMetadata
} from "../tmdb/TmdbService";
import { getTmdbAccessToken } from "../tmdb/settings";
import { prismaDb } from "./database";

const ITEM_PREFIX = "spectro:metadata:v1:";
const REQUEST_GAP_MS = 450;
const RETRY_DELAYS_MS = [1500, 4000];
const ERROR_RETRY_AFTER_MS = 12 * 60 * 60 * 1000;

type ItemStatus = "complete" | "not-found" | "error";

type SpectroMetadataStatus =
  | "idle"
  | "running"
  | "completed"
  | "unconfigured"
  | "waiting-connection"
  | "error";

interface SpectroMetadataItem {
  tmdbId: number;
  status: ItemStatus;
  attempts: number;
  updatedAt: string;
  lastError?: string;
}

interface SpectroMetadataTarget {
  movie: MovieRecord;
  previous?: SpectroMetadataItem;
}

export interface SpectroMetadataSnapshot {
  status: SpectroMetadataStatus;
  totalMovies: number;
  processedMovies: number;
  updatedMovies: number;
  pendingMovies: number;
  failedMovies: number;
  notFoundMovies: number;
  progressPercent: number;
  currentTitle?: string;
  lastError?: string;
}

const EMPTY_SNAPSHOT: SpectroMetadataSnapshot = {
  status: "idle",
  totalMovies: 0,
  processedMovies: 0,
  updatedMovies: 0,
  pendingMovies: 0,
  failedMovies: 0,
  notFoundMovies: 0,
  progressPercent: 100
};

let snapshot = EMPTY_SNAPSHOT;
let runner: Promise<void> | null = null;
let automaticRetryTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<(value: SpectroMetadataSnapshot) => void>();

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

function parseItem(record?: AppMetadata): SpectroMetadataItem | undefined {
  if (!record) return undefined;
  try {
    const value = JSON.parse(record.value) as Partial<SpectroMetadataItem>;
    if (
      !Number.isSafeInteger(value.tmdbId)
      || !["complete", "not-found", "error"].includes(String(value.status))
    ) return undefined;
    return {
      tmdbId: Number(value.tmdbId),
      status: value.status as ItemStatus,
      attempts: Number.isFinite(value.attempts) ? Math.max(0, Number(value.attempts)) : 0,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
      lastError: typeof value.lastError === "string" ? value.lastError : undefined
    };
  } catch {
    return undefined;
  }
}

function itemKey(tmdbId: number): string {
  return ITEM_PREFIX + tmdbId;
}

async function readItemStates(): Promise<Map<number, SpectroMetadataItem>> {
  const records = await prismaDb.appMetadata.where("key").startsWith(ITEM_PREFIX).toArray();
  const states = new Map<number, SpectroMetadataItem>();
  for (const record of records) {
    const item = parseItem(record);
    if (item) states.set(item.tmdbId, item);
  }
  return states;
}

/**
 * Decide si falta información que Espectro realmente utiliza.
 * Un resultado vacío de TMDB se registra como consultado para no repetir llamadas.
 */
export function isSpectroMetadataIncomplete(movie: MovieRecord): boolean {
  return Boolean(
    !movie.originalTitle?.trim()
    || !movie.overview?.trim()
    || !movie.releaseDate?.trim()
    || !movie.releaseYear
    || !movie.runtimeMinutes
    || !movie.originalLanguage?.trim()
    || !movie.genres.length
    || !(movie.genreIds?.length)
    || !movie.countries.length
    || !movie.directors?.length
    || !movie.castMembers?.length
    || movie.keywords === undefined
    || !movie.posterPath
    || !movie.backdropPath
  );
}

export function classifySpectroMetadataError(
  error: unknown
): "not-found" | "authentication" | "retryable" | "permanent" {
  if (!(error instanceof TmdbHttpError)) return "retryable";
  if (error.status === 404) return "not-found";
  if (error.status === 401 || error.status === 403) return "authentication";
  if (error.status === 408 || error.status === 429 || error.status >= 500) return "retryable";
  return "permanent";
}

export function getSpectroMetadataRetryDelay(
  previous: Pick<SpectroMetadataItem, "status" | "updatedAt"> | undefined,
  now = Date.now()
): number | null {
  if (previous?.status !== "error") return null;
  const updatedAt = Date.parse(previous.updatedAt);
  if (!Number.isFinite(updatedAt)) return null;
  return Math.max(0, updatedAt + ERROR_RETRY_AFTER_MS - now);
}

export function isSpectroMetadataRetryDeferred(
  previous: Pick<SpectroMetadataItem, "status" | "updatedAt"> | undefined,
  now = Date.now()
): boolean {
  return (getSpectroMetadataRetryDelay(previous, now) ?? 0) > 0;
}

/** Prioriza títulos elegidos para ver antes que otros registros locales. */
export function getSpectroMetadataPriority(
  movieId: string,
  pendingIds: ReadonlySet<string>,
  favoriteIds: ReadonlySet<string>,
  viewedIds: ReadonlySet<string>
): number {
  if (pendingIds.has(movieId)) return 0;
  if (favoriteIds.has(movieId)) return 1;
  if (viewedIds.has(movieId)) return 2;
  return 3;
}

interface SpectroMetadataQueue {
  targets: SpectroMetadataTarget[];
  deferredMovies: number;
  nextRetryDelayMs?: number;
}

async function collectTargets(forceRetry = false): Promise<SpectroMetadataQueue> {
  const [movies, viewings, libraryEntries, collectionMovies, states] = await Promise.all([
    prismaDb.movies.toArray(),
    prismaDb.viewings.toArray(),
    prismaDb.libraryEntries.toArray(),
    prismaDb.collectionMovies.toArray(),
    readItemStates()
  ]);

  const movieById = new Map(movies.map((movie) => [movie.id, movie]));
  const viewedIds = new Set(viewings.map((viewing) => viewing.movieId));
  const savedIds = new Set(libraryEntries.map((entry) => entry.movieId));
  const collectedIds = new Set(collectionMovies.map((entry) => entry.movieId));
  const favoriteIds = new Set(libraryEntries.filter((entry) => entry.isFavorite).map((entry) => entry.movieId));
  const pendingIds = new Set(
    libraryEntries.filter((entry) => entry.status === "pending").map((entry) => entry.movieId)
  );
  const relevantIds = new Set<string>([
    ...pendingIds,
    ...viewedIds,
    ...favoriteIds
  ]);

  for (const movie of movies) {
    if (
      !viewedIds.has(movie.id)
      && !savedIds.has(movie.id)
      && !collectedIds.has(movie.id)
      && Boolean(movie.genreIds?.length || movie.genres.length)
    ) {
      relevantIds.add(movie.id);
    }
  }

  let deferredMovies = 0;
  let nextRetryDelayMs: number | undefined;
  const targets = [...relevantIds]
    .flatMap((movieId) => {
      const movie = movieById.get(movieId);
      if (!movie || !Number.isSafeInteger(movie.tmdbId) || movie.tmdbId <= 0) return [];
      if (!isSpectroMetadataIncomplete(movie)) return [];
      const previous = states.get(movie.tmdbId);
      if (previous?.status === "complete" || previous?.status === "not-found") return [];
      if (!forceRetry && isSpectroMetadataRetryDeferred(previous)) {
        deferredMovies += 1;
        const retryDelay = getSpectroMetadataRetryDelay(previous);
        if (retryDelay !== null) {
          nextRetryDelayMs = nextRetryDelayMs === undefined ? retryDelay : Math.min(nextRetryDelayMs, retryDelay);
        }
        return [];
      }
      return [{ movie, previous }];
    })
    .sort((a, b) => (
      getSpectroMetadataPriority(a.movie.id, pendingIds, favoriteIds, viewedIds)
        - getSpectroMetadataPriority(b.movie.id, pendingIds, favoriteIds, viewedIds)
      || a.movie.title.localeCompare(b.movie.title)
    ));

  return { targets, deferredMovies, nextRetryDelayMs };
}

function scheduleSpectroMetadataRetry(delayMs?: number): void {
  if (automaticRetryTimer) clearTimeout(automaticRetryTimer);
  automaticRetryTimer = undefined;
  if (delayMs === undefined || !Number.isFinite(delayMs)) return;
  automaticRetryTimer = setTimeout(() => {
    automaticRetryTimer = undefined;
    if (isOnline() && getTmdbAccessToken()) void startSpectroMetadataEnrichment();
  }, Math.max(1000, delayMs));
}

function publish(next: SpectroMetadataSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener(next);
}

export function subscribeSpectroMetadata(
  listener: (value: SpectroMetadataSnapshot) => void
): () => void {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
}

export async function getSpectroMetadataSnapshot(): Promise<SpectroMetadataSnapshot> {
  if (snapshot.status === "running") return snapshot;
  const { targets, deferredMovies } = await collectTargets();
  const outstandingMovies = targets.length + deferredMovies;
  const token = getTmdbAccessToken();
  if (!token) {
    const next = {
      ...EMPTY_SNAPSHOT,
      status: "unconfigured" as const,
      totalMovies: outstandingMovies,
      pendingMovies: outstandingMovies,
      failedMovies: deferredMovies,
      progressPercent: outstandingMovies ? 0 : 100
    };
    publish(next);
    return next;
  }
  if (!isOnline() && outstandingMovies > 0) {
    const next = {
      ...EMPTY_SNAPSHOT,
      status: "waiting-connection" as const,
      totalMovies: outstandingMovies,
      pendingMovies: outstandingMovies,
      failedMovies: deferredMovies,
      progressPercent: 0
    };
    publish(next);
    return next;
  }
  if (targets.length === 0) {
    const next = {
      ...EMPTY_SNAPSHOT,
      status: "completed" as const,
      failedMovies: deferredMovies,
      lastError: deferredMovies
        ? "Hay consultas de metadatos temporalmente pendientes. Prisma las volverá a consultar automáticamente."
        : undefined
    };
    publish(next);
    return next;
  }
  return snapshot;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, milliseconds)));
}

async function persistItem(
  movie: MovieRecord,
  metadata: TmdbMovieAnalysisMetadata,
  attempts: number
): Promise<boolean> {
  const now = new Date().toISOString();
  let complete = true;
  await prismaDb.transaction("rw", [prismaDb.movies, prismaDb.appMetadata], async () => {
    const current = await prismaDb.movies.get(movie.id);
    if (current) {
      const patch = createMovieMetadataPatch(current, {
        ...metadata.details,
        keywords: metadata.keywords
      }, now);
      const directors = [...new Set(
        metadata.credits.crew
          .filter((person) => person.job === "Director" || person.department === "Directing")
          .map((person) => person.name.trim())
          .filter(Boolean)
      )];
      const castMembers = [...new Set(
        metadata.credits.cast.slice(0, 12).map((person) => person.name.trim()).filter(Boolean)
      )];
      if (directors.length) patch.directors = directors;
      if (castMembers.length) patch.castMembers = castMembers;
      const enriched = { ...current, ...patch };
      complete = !isSpectroMetadataIncomplete(enriched);
      // Este parche solo contiene metadatos cinematográficos. No escribe visionados,
      // calificaciones, favoritos, colecciones, perfil ni preferencias.
      await prismaDb.movies.update(movie.id, patch);
    }
    await prismaDb.appMetadata.put({
      key: itemKey(movie.tmdbId),
      value: JSON.stringify({
        tmdbId: movie.tmdbId,
        status: complete ? "complete" : "error",
        attempts,
        updatedAt: now,
        lastError: complete ? undefined : "TMDB no devolvió todos los metadatos requeridos. Se reintentará más adelante."
      } satisfies SpectroMetadataItem)
    });
  });
  return complete;
}

async function persistItemState(
  movie: MovieRecord,
  status: ItemStatus,
  attempts: number,
  lastError?: string
): Promise<void> {
  const item: SpectroMetadataItem = {
    tmdbId: movie.tmdbId,
    status,
    attempts,
    updatedAt: new Date().toISOString(),
    lastError
  };
  await prismaDb.appMetadata.put({
    key: itemKey(movie.tmdbId),
    value: JSON.stringify(item)
  });
}

async function enrichOne(target: SpectroMetadataTarget): Promise<"updated" | "incomplete" | "not-found" | "failed" | "authentication" | "interrupted"> {
  let attempts = target.previous?.attempts ?? 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!isOnline()) return "interrupted";
    attempts += 1;
    try {
      const metadata = await getMovieAnalysisMetadata(
        getTmdbAccessToken(),
        target.movie.tmdbId
      );
      const complete = await persistItem(target.movie, metadata, attempts);
      return complete ? "updated" : "incomplete";
    } catch (error) {
      if (!isOnline()) return "interrupted";
      const classification = classifySpectroMetadataError(error);
      const message = error instanceof Error ? error.message : "No se pudo consultar TMDB.";

      if (classification === "not-found") {
        await persistItemState(target.movie, "not-found", attempts, "TMDB no encontró esta película (404).");
        return "not-found";
      }
      if (classification === "authentication") {
        await persistItemState(target.movie, "error", attempts, message);
        return "authentication";
      }
      if (classification === "permanent") {
        await persistItemState(target.movie, "error", attempts, message);
        return "failed";
      }
      if (attempt < 2) {
        const delay = error instanceof TmdbHttpError && error.status === 429
          ? Math.max(error.retryAfterMs ?? 2000, 1500)
          : RETRY_DELAYS_MS[attempt];
        await wait(delay);
      } else {
        await persistItemState(target.movie, "error", attempts, message);
        return "failed";
      }
    }
  }
  return "failed";
}

/**
 * Completa en segundo plano únicamente los metadatos que faltan para el perfil
 * y las candidatas locales. Continúa desde los títulos ya procesados.
 */
export function startSpectroMetadataEnrichment(forceRetry = false): Promise<void> {
  if (runner) return runner;

  const operation = (async () => {
    const token = getTmdbAccessToken();
    const { targets, deferredMovies } = await collectTargets(forceRetry);
    const outstandingMovies = targets.length + deferredMovies;

    if (!token) {
      publish({
        ...EMPTY_SNAPSHOT,
        status: "unconfigured",
        totalMovies: outstandingMovies,
        pendingMovies: outstandingMovies,
        failedMovies: deferredMovies,
        progressPercent: outstandingMovies ? 0 : 100
      });
      return;
    }
    if (!isOnline() && outstandingMovies > 0) {
      publish({
        ...EMPTY_SNAPSHOT,
        status: "waiting-connection",
        totalMovies: outstandingMovies,
        pendingMovies: outstandingMovies,
        failedMovies: deferredMovies,
        progressPercent: 0
      });
      return;
    }
    if (targets.length === 0) {
      publish({
        ...EMPTY_SNAPSHOT,
        status: "completed",
        failedMovies: deferredMovies,
        lastError: deferredMovies
          ? "Hay consultas de metadatos temporalmente pendientes. Prisma las volverá a consultar automáticamente."
          : undefined
      });
      scheduleSpectroMetadataRetry(nextRetryDelayMs);
      return;
    }
    if (automaticRetryTimer) clearTimeout(automaticRetryTimer);
    automaticRetryTimer = undefined;

    const candidates = targets;
    let processedMovies = 0;
    let updatedMovies = 0;
    let failedMovies = deferredMovies;
    let notFoundMovies = 0;
    let lastError: string | undefined = deferredMovies
      ? "Hay consultas de metadatos temporalmente pendientes. Prisma las volverá a consultar automáticamente."
      : undefined;

    publish({
      ...EMPTY_SNAPSHOT,
      status: "running",
      totalMovies: candidates.length,
      pendingMovies: candidates.length,
      progressPercent: 0,
      currentTitle: candidates[0]?.movie.title,
      failedMovies,
      lastError: deferredMovies
        ? "Hay consultas de metadatos temporalmente pendientes. Prisma las volverá a consultar automáticamente."
        : undefined
    });

    for (const target of candidates) {
      if (!isOnline()) {
        publish({
          status: "waiting-connection",
          totalMovies: candidates.length,
          processedMovies,
          updatedMovies,
          pendingMovies: candidates.length - processedMovies,
          failedMovies,
          notFoundMovies,
          progressPercent: Math.round((processedMovies / candidates.length) * 100),
          currentTitle: target.movie.title,
          lastError
        });
        return;
      }

      publish({
        ...snapshot,
        status: "running",
        currentTitle: target.movie.title
      });

      const outcome = await enrichOne(target);
      if (outcome === "interrupted") {
        publish({
          status: "waiting-connection",
          totalMovies: candidates.length,
          processedMovies,
          updatedMovies,
          pendingMovies: candidates.length - processedMovies,
          failedMovies,
          notFoundMovies,
          progressPercent: Math.round((processedMovies / candidates.length) * 100),
          currentTitle: target.movie.title,
          lastError
        });
        return;
      }
      processedMovies += 1;
      if (outcome === "updated" || outcome === "incomplete") updatedMovies += 1;
      if (outcome === "not-found") notFoundMovies += 1;
      if (outcome === "failed" || outcome === "incomplete" || outcome === "authentication") {
        failedMovies += 1;
        lastError = outcome === "authentication"
          ? "TMDB rechazó la credencial. Revisa la conexión en Ajustes."
          : outcome === "incomplete"
            ? "TMDB no devolvió todos los campos cinematográficos. Prisma conservará lo disponible y volverá a intentarlo más adelante."
            : "Una o más películas no pudieron completar sus metadatos; se podrán reintentar más adelante.";
      }

      const progress: SpectroMetadataSnapshot = {
        status: outcome === "authentication" ? "error" : "running",
        totalMovies: candidates.length,
        processedMovies,
        updatedMovies,
        pendingMovies: candidates.length - processedMovies,
        failedMovies,
        notFoundMovies,
        progressPercent: Math.round((processedMovies / candidates.length) * 100),
        currentTitle: target.movie.title,
        lastError
      };
      publish(progress);

      if (outcome === "authentication") {
        publish({ ...snapshot, status: "error" });
        return;
      }
      await wait(REQUEST_GAP_MS);
    }

    publish({
      status: "completed",
      totalMovies: candidates.length,
      processedMovies,
      updatedMovies,
      pendingMovies: 0,
      failedMovies,
      notFoundMovies,
      progressPercent: 100,
      lastError
    });
  })();

  runner = operation.finally(() => {
    runner = null;
    void collectTargets().then((queue) => {
      if (queue.targets.length > 0) {
        void startSpectroMetadataEnrichment();
      } else {
        scheduleSpectroMetadataRetry(queue.nextRetryDelayMs);
      }
    }).catch(() => undefined);
  });
  return runner;
}

if (typeof window !== "undefined") {
  window.addEventListener("prisma:tmdb-credentials-updated", () => {
    void startSpectroMetadataEnrichment(true);
  });
}
