import type { AppMetadata, MovieRecord } from "../../domain/types";
import {
  createMovieMetadataPatch,
  hasCompleteMovieMetadata
} from "../../domain/movieMetadata";
import { prismaDb } from "./database";
import { TmdbHttpError } from "../tmdb/TmdbClient";
import { getMovieDetailsForEnrichment } from "../tmdb/TmdbService";
import { getTmdbAccessToken } from "../tmdb/settings";

const QUEUE_KEY = "library-enrichment:queue:v1";
const ITEM_PREFIX = "library-enrichment:movie:";
const REQUEST_INTERVAL_MS = 1100;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1500, 4000];

export type EnrichmentQueueStatus =
  | "idle"
  | "running"
  | "paused"
  | "waiting-connection"
  | "completed";

type EnrichmentItemStatus = "pending" | "complete" | "not-found" | "error";

interface EnrichmentItemState {
  tmdbId: number;
  status: EnrichmentItemStatus;
  attempts: number;
  updatedAt: string;
  lastError?: string;
}

interface PersistedQueueState {
  version: 1;
  status: EnrichmentQueueStatus;
  total: number;
  processed: number;
  currentTmdbId?: number;
  lastError?: string;
  updatedAt: string;
}

export interface EnrichmentSnapshot {
  status: EnrichmentQueueStatus;
  totalMovies: number;
  completedMovies: number;
  pendingMovies: number;
  errorMovies: number;
  notFoundMovies: number;
  progressPercent: number;
  currentTitle?: string;
  lastError?: string;
  isOnline: boolean;
}

const emptyQueue = (): PersistedQueueState => ({
  version: 1,
  status: "idle",
  total: 0,
  processed: 0,
  updatedAt: new Date().toISOString()
});

let runner: Promise<void> | null = null;
let starting: Promise<void> | null = null;
let pauseRequested = false;
let pauseReason: "paused" | "waiting-connection" = "paused";
let activeController: AbortController | null = null;
const listeners = new Set<(snapshot: EnrichmentSnapshot) => void>();

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

function parseQueueState(record?: AppMetadata): PersistedQueueState {
  if (!record) return emptyQueue();
  try {
    const value = JSON.parse(record.value) as Partial<PersistedQueueState>;
    const validStatuses: EnrichmentQueueStatus[] = [
      "idle", "running", "paused", "waiting-connection", "completed"
    ];
    return {
      version: 1,
      status: validStatuses.includes(value.status as EnrichmentQueueStatus)
        ? value.status as EnrichmentQueueStatus
        : "idle",
      total: Number.isFinite(value.total) ? Math.max(0, Number(value.total)) : 0,
      processed: Number.isFinite(value.processed) ? Math.max(0, Number(value.processed)) : 0,
      currentTmdbId: Number.isSafeInteger(value.currentTmdbId) ? Number(value.currentTmdbId) : undefined,
      lastError: typeof value.lastError === "string" ? value.lastError : undefined,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString()
    };
  } catch {
    return emptyQueue();
  }
}

function parseItemState(record: AppMetadata): EnrichmentItemState | undefined {
  try {
    const value = JSON.parse(record.value) as Partial<EnrichmentItemState>;
    const validStatuses: EnrichmentItemStatus[] = ["pending", "complete", "not-found", "error"];
    if (!Number.isSafeInteger(value.tmdbId) || !validStatuses.includes(value.status as EnrichmentItemStatus)) {
      return undefined;
    }
    return {
      tmdbId: Number(value.tmdbId),
      status: value.status as EnrichmentItemStatus,
      attempts: Number.isFinite(value.attempts) ? Math.max(0, Number(value.attempts)) : 0,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
      lastError: typeof value.lastError === "string" ? value.lastError : undefined
    };
  } catch {
    return undefined;
  }
}

async function readQueueState(): Promise<PersistedQueueState> {
  return parseQueueState(await prismaDb.appMetadata.get(QUEUE_KEY));
}

async function saveQueueState(
  patch: Partial<PersistedQueueState>
): Promise<PersistedQueueState> {
  const current = await readQueueState();
  const next: PersistedQueueState = {
    ...current,
    ...patch,
    version: 1,
    updatedAt: new Date().toISOString()
  };
  await prismaDb.appMetadata.put({ key: QUEUE_KEY, value: JSON.stringify(next) });
  return next;
}

async function readItemStates(): Promise<Map<number, EnrichmentItemState>> {
  const records = await prismaDb.appMetadata.where("key").startsWith(ITEM_PREFIX).toArray();
  const states = new Map<number, EnrichmentItemState>();
  for (const record of records) {
    const state = parseItemState(record);
    if (state) states.set(state.tmdbId, state);
  }
  return states;
}

async function saveItemState(state: EnrichmentItemState): Promise<void> {
  await prismaDb.appMetadata.put({
    key: ITEM_PREFIX + state.tmdbId,
    value: JSON.stringify(state)
  });
}

async function getLibraryMovies(): Promise<MovieRecord[]> {
  const entries = await prismaDb.libraryEntries.toArray();
  const movies = await prismaDb.movies.bulkGet(entries.map((entry) => entry.movieId));
  return movies.filter((movie): movie is MovieRecord => Boolean(movie));
}

async function collectCandidates(): Promise<MovieRecord[]> {
  const [movies, states] = await Promise.all([getLibraryMovies(), readItemStates()]);
  return movies.filter((movie) => {
    const state = states.get(movie.tmdbId);
    if (state?.status === "complete" || state?.status === "not-found") return false;
    return !hasCompleteMovieMetadata(movie);
  });
}

export function classifyEnrichmentError(
  error: unknown
): "not-found" | "authentication" | "retryable" | "permanent" {
  if (!(error instanceof TmdbHttpError)) return "retryable";
  if (error.status === 404) return "not-found";
  if (error.status === 401 || error.status === 403) return "authentication";
  if (error.status === 408 || error.status === 429 || error.status >= 500) return "retryable";
  return "permanent";
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      reject(new DOMException("Operación pausada.", "AbortError"));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

async function persistMovieMetadata(
  movieId: string,
  tmdbId: number,
  attempts: number,
  details: Awaited<ReturnType<typeof getMovieDetailsForEnrichment>>
): Promise<void> {
  const now = new Date().toISOString();
  await prismaDb.transaction("rw", prismaDb.movies, prismaDb.appMetadata, async () => {
    const current = await prismaDb.movies.get(movieId);
    if (current) {
      const patch = createMovieMetadataPatch(current, details, now);
      // Actualiza solo propiedades cinematográficas: los datos personales viven
      // en tablas separadas y no se reescriben durante este proceso.
      await prismaDb.movies.update(movieId, patch);
    }
    await prismaDb.appMetadata.put({
      key: ITEM_PREFIX + tmdbId,
      value: JSON.stringify({
        tmdbId,
        status: "complete",
        attempts,
        updatedAt: now
      } satisfies EnrichmentItemState)
    });
  });
}

async function emitSnapshot(): Promise<void> {
  const snapshot = await getEnrichmentSnapshot();
  for (const listener of listeners) listener(snapshot);
}

async function runQueue(token: string, candidates: MovieRecord[]): Promise<void> {
  let processed = 0;
  let lastRequestAt = 0;

  for (const movie of candidates) {
    if (pauseRequested) break;
    if (!isOnline()) {
      pauseReason = "waiting-connection";
      await saveQueueState({ status: "waiting-connection", processed, currentTmdbId: undefined });
      await emitSnapshot();
      return;
    }

    await saveQueueState({
      status: "running",
      total: candidates.length,
      processed,
      currentTmdbId: movie.tmdbId,
      lastError: undefined
    });
    await emitSnapshot();

    const previous = (await readItemStates()).get(movie.tmdbId);
    let outcome: "complete" | "not-found" | "error" | "interrupted" = "error";
    let attempts = previous?.attempts ?? 0;
    let retryDelay = 0;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      if (pauseRequested) {
        outcome = "interrupted";
        break;
      }

      const controller = new AbortController();
      activeController = controller;
      try {
        const rateLimitWait = Math.max(0, REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
        await wait(Math.max(rateLimitWait, retryDelay), controller.signal);
        if (!isOnline()) {
          pauseReason = "waiting-connection";
          throw new Error("La conexión se perdió durante el enriquecimiento.");
        }

        attempts += 1;
        await saveItemState({
          tmdbId: movie.tmdbId,
          status: "pending",
          attempts,
          updatedAt: new Date().toISOString()
        });

        lastRequestAt = Date.now();
        const details = await getMovieDetailsForEnrichment(token, movie.tmdbId, controller.signal);
        await persistMovieMetadata(movie.id, movie.tmdbId, attempts, details);
        outcome = "complete";
        break;
      } catch (error) {
        if (pauseRequested || isAbortError(error)) {
          outcome = "interrupted";
          await saveItemState({
            tmdbId: movie.tmdbId,
            status: "pending",
            attempts,
            updatedAt: new Date().toISOString()
          });
          break;
        }

        if (!isOnline()) {
          pauseReason = "waiting-connection";
          outcome = "interrupted";
          await saveItemState({
            tmdbId: movie.tmdbId,
            status: "pending",
            attempts,
            updatedAt: new Date().toISOString()
          });
          break;
        }

        const classification = classifyEnrichmentError(error);
        const message = error instanceof Error ? error.message : "No se pudo consultar TMDB.";

        if (classification === "not-found") {
          outcome = "not-found";
          await saveItemState({
            tmdbId: movie.tmdbId,
            status: "not-found",
            attempts,
            updatedAt: new Date().toISOString(),
            lastError: "TMDB no encontró esta película (404)."
          });
          break;
        }

        if (classification === "authentication") {
          outcome = "error";
          await saveItemState({
            tmdbId: movie.tmdbId,
            status: "error",
            attempts,
            updatedAt: new Date().toISOString(),
            lastError: message
          });
          await saveQueueState({
            status: "paused",
            total: candidates.length,
            processed,
            currentTmdbId: undefined,
            lastError: "Revisa la credencial TMDB en Ajustes. " + message
          });
          await emitSnapshot();
          return;
        }

        if (classification === "retryable" && attempt < MAX_ATTEMPTS) {
          const retryAfter = error instanceof TmdbHttpError ? error.retryAfterMs : undefined;
          retryDelay = retryAfter ?? RETRY_DELAYS_MS[attempt - 1] ?? 4000;
          await saveItemState({
            tmdbId: movie.tmdbId,
            status: "pending",
            attempts,
            updatedAt: new Date().toISOString(),
            lastError: message
          });
          continue;
        }

        outcome = "error";
        await saveItemState({
          tmdbId: movie.tmdbId,
          status: "error",
          attempts,
          updatedAt: new Date().toISOString(),
          lastError: message
        });
        break;
      } finally {
        activeController = null;
      }
    }

    if (outcome === "interrupted" || pauseRequested) {
      await saveQueueState({
        status: pauseReason,
        total: candidates.length,
        processed,
        currentTmdbId: undefined
      });
      await emitSnapshot();
      return;
    }

    processed += 1;
    await saveQueueState({
      status: "running",
      total: candidates.length,
      processed,
      currentTmdbId: undefined,
      lastError: outcome === "error" ? "Una o más películas requieren un nuevo intento." : undefined
    });
    await emitSnapshot();
  }

  if (pauseRequested) {
    await saveQueueState({
      status: pauseReason,
      total: candidates.length,
      processed,
      currentTmdbId: undefined
    });
  } else {
    await saveQueueState({
      status: "completed",
      total: candidates.length,
      processed,
      currentTmdbId: undefined
    });
  }
  await emitSnapshot();
}

export function startEnrichmentQueue(token: string): Promise<void> {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return Promise.reject(new Error("Configura tu credencial TMDB antes de enriquecer la Biblioteca."));
  }
  if (runner) return runner;
  if (starting) return starting;

  pauseRequested = false;
  pauseReason = "paused";

  const operation = (async () => {
    const candidates = await collectCandidates();

    if (pauseRequested) {
      await saveQueueState({
        status: pauseReason,
        total: candidates.length,
        processed: 0,
        currentTmdbId: undefined
      });
      await emitSnapshot();
      return;
    }

    if (!isOnline()) {
      await saveQueueState({
        status: "waiting-connection",
        total: candidates.length,
        processed: 0,
        currentTmdbId: undefined
      });
      await emitSnapshot();
      return;
    }

    if (candidates.length === 0) {
      await saveQueueState({
        status: "completed",
        total: 0,
        processed: 0,
        currentTmdbId: undefined,
        lastError: undefined
      });
      await emitSnapshot();
      return;
    }

    await saveQueueState({
      status: "running",
      total: candidates.length,
      processed: 0,
      currentTmdbId: candidates[0]?.tmdbId,
      lastError: undefined
    });
    await emitSnapshot();

    runner = runQueue(normalizedToken, candidates)
      .catch(async (error: unknown) => {
        const message = error instanceof Error ? error.message : "La cola se detuvo inesperadamente.";
        await saveQueueState({
          status: "paused",
          currentTmdbId: undefined,
          lastError: message
        });
        await emitSnapshot();
      })
      .finally(() => {
        runner = null;
        activeController = null;
      });

    await runner;
  })();

  starting = operation.finally(() => {
    starting = null;
  });
  return starting;
}

export async function pauseEnrichmentQueue(waitingForConnection = false): Promise<void> {
  pauseRequested = true;
  pauseReason = waitingForConnection ? "waiting-connection" : "paused";
  activeController?.abort();

  if (!runner && !starting) {
    const state = await readQueueState();
    if (state.status === "running") {
      await saveQueueState({
        status: pauseReason,
        currentTmdbId: undefined
      });
      await emitSnapshot();
    }
  }
}

export async function getEnrichmentSnapshot(): Promise<EnrichmentSnapshot> {
  const [movies, states, queue] = await Promise.all([
    getLibraryMovies(),
    readItemStates(),
    readQueueState()
  ]);

  let completedMovies = 0;
  let pendingMovies = 0;
  let errorMovies = 0;
  let notFoundMovies = 0;

  for (const movie of movies) {
    const state = states.get(movie.tmdbId);
    if (state?.status === "complete" || hasCompleteMovieMetadata(movie)) {
      completedMovies += 1;
    } else if (state?.status === "not-found") {
      notFoundMovies += 1;
    } else if (state?.status === "error") {
      errorMovies += 1;
    } else {
      pendingMovies += 1;
    }
  }

  const processedMovies = completedMovies + notFoundMovies;
  const progressPercent = movies.length === 0
    ? 100
    : Math.round((processedMovies / movies.length) * 100);
  const currentMovie = queue.currentTmdbId
    ? movies.find((movie) => movie.tmdbId === queue.currentTmdbId)
    : undefined;

  return {
    status: queue.status === "running" && !isOnline() ? "waiting-connection" : queue.status,
    totalMovies: movies.length,
    completedMovies,
    pendingMovies,
    errorMovies,
    notFoundMovies,
    progressPercent,
    currentTitle: currentMovie?.title,
    lastError: queue.lastError,
    isOnline: isOnline()
  };
}

export function subscribeEnrichmentQueue(
  listener: (snapshot: EnrichmentSnapshot) => void
): () => void {
  listeners.add(listener);
  void getEnrichmentSnapshot().then(listener).catch(() => undefined);
  return () => listeners.delete(listener);
}

// La cola no depende de que Ajustes permanezca abierta: los eventos de red
// se observan desde el servicio mientras la aplicación esté cargada.
if (typeof window !== "undefined") {
  window.addEventListener("offline", () => {
    if (runner || starting) void pauseEnrichmentQueue(true).catch(() => undefined);
  });

  window.addEventListener("online", () => {
    void readQueueState().then((state) => {
      if (state.status !== "waiting-connection") return;
      const token = getTmdbAccessToken();
      if (token) void startEnrichmentQueue(token).catch(() => undefined);
    }).catch(() => undefined);
  });
}

