import type { AppMetadata, MovieRecord } from "../../domain/types";
import {
  createMovieMetadataPatch,
  hasCompleteMovieMetadata
} from "../../domain/movieMetadata";
import { runWithConcurrency } from "../../domain/asyncPool";
import { prismaDb } from "./database";
import { TmdbHttpError } from "../tmdb/TmdbClient";
import { getMovieDetailsForEnrichment } from "../tmdb/TmdbService";
import { getTmdbAccessToken } from "../tmdb/settings";

const QUEUE_KEY = "library-enrichment:queue:v1";
const ITEM_PREFIX = "library-enrichment:movie:";

// Dieciséis trabajos simultáneos con un máximo inicial de 20 solicitudes/s.
// Se deja margen frente al límite superior aproximado de TMDB y se reduce el
// ritmo automáticamente cuando el servicio responde HTTP 429.
export const ENRICHMENT_CONCURRENCY = 16;
export const ENRICHMENT_REQUEST_INTERVAL_MS = 50;
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1500, 4000];
const RATE_LIMIT_FALLBACK_MS = 2000;

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

interface EnrichmentCandidate {
  movie: MovieRecord;
  previousState?: EnrichmentItemState;
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
  activeCount: number;
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
let fatalQueueError: string | undefined;
const activeControllers = new Set<AbortController>();
const activeTmdbIds = new Set<number>();
const listeners = new Set<(snapshot: EnrichmentSnapshot) => void>();

// Serializa las escrituras del resumen para que cuatro workers no sobrescriban
// entre sí los contadores persistidos en IndexedDB.
let queueWriteChain: Promise<void> = Promise.resolve();
function persistQueuePatch(patch: Partial<PersistedQueueState>): Promise<void> {
  const operation = queueWriteChain.then(async () => {
    await saveQueueState(patch);
  });
  queueWriteChain = operation.catch(() => undefined);
  return operation;
}

// Puerta global de solicitudes: separa su inicio y aplica una pausa común
// cuando TMDB responde HTTP 429.
let requestGateTail: Promise<void> = Promise.resolve();
let nextRequestAt = 0;
let retryNotBefore = 0;
let currentRequestIntervalMs = ENRICHMENT_REQUEST_INTERVAL_MS;

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

async function collectCandidates(): Promise<EnrichmentCandidate[]> {
  const [movies, states] = await Promise.all([getLibraryMovies(), readItemStates()]);
  return movies.flatMap((movie) => {
    const previousState = states.get(movie.tmdbId);
    if (previousState?.status === "complete" || previousState?.status === "not-found") return [];
    if (hasCompleteMovieMetadata(movie)) return [];
    return [{ movie, previousState }];
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
  if (milliseconds <= 0) {
    if (signal.aborted) return Promise.reject(new DOMException("Operación pausada.", "AbortError"));
    return Promise.resolve();
  }

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

function abortAllRequests(): void {
  for (const controller of activeControllers) controller.abort();
}

function extendRetryCooldown(milliseconds?: number): void {
  const waitMs = Math.max(1000, milliseconds ?? RATE_LIMIT_FALLBACK_MS);
  retryNotBefore = Math.max(retryNotBefore, Date.now() + waitMs);
  // Retrocede exponencialmente el ritmo de nuevas solicitudes ante un 429.
  currentRequestIntervalMs = Math.min(
    Math.max(ENRICHMENT_REQUEST_INTERVAL_MS, currentRequestIntervalMs * 2),
    1000
  );
}

async function acquireRequestSlot(signal: AbortSignal): Promise<void> {
  const previous = requestGateTail;
  let release!: () => void;
  requestGateTail = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    while (true) {
      const scheduledAt = Math.max(nextRequestAt, retryNotBefore);
      await wait(scheduledAt - Date.now(), signal);

      if (pauseRequested) {
        throw new DOMException("Operación pausada.", "AbortError");
      }
      if (!isOnline()) {
        throw new TypeError("La conexión se perdió durante el enriquecimiento.");
      }

      const now = Date.now();
      if (now < nextRequestAt || now < retryNotBefore) continue;
      nextRequestAt = now + currentRequestIntervalMs;
      return;
    }
  } finally {
    release();
  }
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
      // Solo se actualizan metadatos cinematográficos. Los datos personales
      // viven en tablas separadas y no se reescriben durante este proceso.
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

type MovieOutcome = "complete" | "not-found" | "error" | "interrupted";

async function enrichMovie(
  movie: MovieRecord,
  token: string,
  previous?: EnrichmentItemState
): Promise<MovieOutcome> {
  let attempts = previous?.attempts ?? 0;
  let retryDelay = 0;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (pauseRequested) return "interrupted";

    const controller = new AbortController();
    activeControllers.add(controller);

    try {
      if (retryDelay > 0) {
        await wait(retryDelay, controller.signal);
      }
      await acquireRequestSlot(controller.signal);

      if (pauseRequested) return "interrupted";
      if (!isOnline()) throw new TypeError("La conexión se perdió durante el enriquecimiento.");

      attempts += 1;
      await saveItemState({
        tmdbId: movie.tmdbId,
        status: "pending",
        attempts,
        updatedAt: new Date().toISOString()
      });

      const details = await getMovieDetailsForEnrichment(token, movie.tmdbId, controller.signal);
      await persistMovieMetadata(movie.id, movie.tmdbId, attempts, details);
      return "complete";
    } catch (error) {
      if (pauseRequested || isAbortError(error)) {
        await saveItemState({
          tmdbId: movie.tmdbId,
          status: "pending",
          attempts,
          updatedAt: new Date().toISOString(),
          lastError: previous?.lastError
        });
        return "interrupted";
      }

      if (!isOnline()) {
        pauseReason = "waiting-connection";
        pauseRequested = true;
        abortAllRequests();
        await saveItemState({
          tmdbId: movie.tmdbId,
          status: "pending",
          attempts,
          updatedAt: new Date().toISOString()
        });
        return "interrupted";
      }

      const classification = classifyEnrichmentError(error);
      const message = error instanceof Error ? error.message : "No se pudo consultar TMDB.";

      if (classification === "not-found") {
        await saveItemState({
          tmdbId: movie.tmdbId,
          status: "not-found",
          attempts,
          updatedAt: new Date().toISOString(),
          lastError: "TMDB no encontró esta película (404)."
        });
        return "not-found";
      }

      if (classification === "authentication") {
        await saveItemState({
          tmdbId: movie.tmdbId,
          status: "error",
          attempts,
          updatedAt: new Date().toISOString(),
          lastError: message
        });
        fatalQueueError = "Revisa la credencial TMDB en Ajustes. " + message;
        pauseReason = "paused";
        pauseRequested = true;
        abortAllRequests();
        return "interrupted";
      }

      if (classification === "retryable" && attempt < MAX_ATTEMPTS) {
        if (error instanceof TmdbHttpError && error.status === 429) {
          extendRetryCooldown(error.retryAfterMs);
          retryDelay = 0;
        } else {
          retryDelay = RETRY_DELAYS_MS[attempt - 1] ?? 4000;
        }

        await saveItemState({
          tmdbId: movie.tmdbId,
          status: "pending",
          attempts,
          updatedAt: new Date().toISOString(),
          lastError: message
        });
        continue;
      }

      await saveItemState({
        tmdbId: movie.tmdbId,
        status: "error",
        attempts,
        updatedAt: new Date().toISOString(),
        lastError: message
      });
      return "error";
    } finally {
      activeControllers.delete(controller);
    }
  }

  return "error";
}

async function runQueue(token: string, candidates: EnrichmentCandidate[]): Promise<void> {
  let processed = 0;
  let outcomesSinceSnapshot = 0;
  const initialWorkerCount = Math.min(candidates.length, ENRICHMENT_CONCURRENCY);
  let initialSnapshotSent = false;

  requestGateTail = Promise.resolve();
  nextRequestAt = 0;
  retryNotBefore = 0;
  currentRequestIntervalMs = ENRICHMENT_REQUEST_INTERVAL_MS;
  activeControllers.clear();
  activeTmdbIds.clear();
  fatalQueueError = undefined;

  await runWithConcurrency(
    candidates,
    ENRICHMENT_CONCURRENCY,
    async (candidate) => {
      if (pauseRequested) return;

      const { movie, previousState } = candidate;
      activeTmdbIds.add(movie.tmdbId);

      // Notifica una vez cuando el grupo inicial de trabajadores está ocupado.
      if (!initialSnapshotSent && activeTmdbIds.size >= initialWorkerCount) {
        initialSnapshotSent = true;
        await emitSnapshot();
      }

      const outcome = await enrichMovie(movie, token, previousState);
      activeTmdbIds.delete(movie.tmdbId);

      if (outcome !== "interrupted") processed += 1;
      outcomesSinceSnapshot += 1;

      // Agrupa escrituras y lecturas del catálogo para no escanear la Biblioteca
      // dos veces por película cuando se procesan cientos de elementos.
      if (outcomesSinceSnapshot >= 4 || outcome === "interrupted") {
        outcomesSinceSnapshot = 0;
        await persistQueuePatch({
          status: pauseRequested ? pauseReason : "running",
          total: candidates.length,
          processed,
          currentTmdbId: activeTmdbIds.values().next().value,
          lastError: fatalQueueError ?? (outcome === "error"
            ? "Una o más películas requieren un nuevo intento."
            : undefined)
        });
        await emitSnapshot();
      }
    },
    () => pauseRequested
  );

  const finalStatus = fatalQueueError ? "paused" : pauseRequested ? pauseReason : "completed";
  await persistQueuePatch({
    status: finalStatus,
    total: candidates.length,
    processed,
    currentTmdbId: undefined,
    lastError: fatalQueueError
  });
  activeControllers.clear();
  activeTmdbIds.clear();
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
  fatalQueueError = undefined;

  const operation = (async () => {
    const candidates = await collectCandidates();

    if (pauseRequested) {
      await persistQueuePatch({
        status: pauseReason,
        total: candidates.length,
        processed: 0,
        currentTmdbId: undefined
      });
      await emitSnapshot();
      return;
    }

    if (!isOnline()) {
      await persistQueuePatch({
        status: "waiting-connection",
        total: candidates.length,
        processed: 0,
        currentTmdbId: undefined
      });
      await emitSnapshot();
      return;
    }

    if (candidates.length === 0) {
      await persistQueuePatch({
        status: "completed",
        total: 0,
        processed: 0,
        currentTmdbId: undefined,
        lastError: undefined
      });
      await emitSnapshot();
      return;
    }

    await persistQueuePatch({
      status: "running",
      total: candidates.length,
      processed: 0,
      currentTmdbId: candidates[0]?.movie.tmdbId,
      lastError: undefined
    });
    await emitSnapshot();

    runner = runQueue(normalizedToken, candidates)
      .catch(async (error: unknown) => {
        const message = error instanceof Error ? error.message : "La cola se detuvo inesperadamente.";
        await persistQueuePatch({
          status: "paused",
          currentTmdbId: undefined,
          lastError: message
        });
        await emitSnapshot();
      })
      .finally(() => {
        runner = null;
        activeControllers.clear();
        activeTmdbIds.clear();
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
  abortAllRequests();

  if (!runner && !starting) {
    const state = await readQueueState();
    if (state.status === "running") {
      await persistQueuePatch({
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
  const firstActiveId = activeTmdbIds.values().next().value;
  const currentMovie = firstActiveId !== undefined
    ? movies.find((movie) => movie.tmdbId === firstActiveId)
    : queue.currentTmdbId
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
    activeCount: activeTmdbIds.size,
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
async function resumeQueueAfterConnection(): Promise<void> {
  if (!isOnline()) return;

  const active = runner ?? starting;
  if (active) await active.catch(() => undefined);

  if (!isOnline()) return;
  const state = await readQueueState();
  if (state.status !== "waiting-connection" && state.status !== "running") return;

  const token = getTmdbAccessToken();
  if (token) await startEnrichmentQueue(token);
}

if (typeof window !== "undefined") {
  window.addEventListener("offline", () => {
    if (runner || starting) void pauseEnrichmentQueue(true).catch(() => undefined);
  });

  window.addEventListener("online", () => {
    void resumeQueueAfterConnection().catch(() => undefined);
  });
}
