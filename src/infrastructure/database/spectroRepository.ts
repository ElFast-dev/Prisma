import type { MovieRecord, SpectroSnapshot } from "../../domain/types";
import type { TmdbMovieSummary } from "../tmdb/TmdbService";
import {
  getSpectroInputFingerprint,
  selectSpectroCandidates,
  rankSpectroCandidates,
  SPECTRO_ALGORITHM_VERSION,
  type SpectroAnalysis
} from "../../domain/spectro";
import type {
  SpectroAnalysisWorkerResponse,
  SpectroAnalysisWorkerRequest
} from "../../domain/spectroWorkerProtocol";
import {
  calculateSpectroWorkspace,
  type SpectroWorkspaceInput,
  type SpectroWorkspaceCalculation,
  type SpectroWorkspaceResult
} from "../../domain/spectroWorkspace";
import { prismaDb } from "./database";

function isValidCachedAnalysis(
  value: unknown,
  inputFingerprint: string
): value is SpectroAnalysis {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<SpectroAnalysis>;
  return payload.algorithmVersion === SPECTRO_ALGORITHM_VERSION
    && payload.inputFingerprint === inputFingerprint
    && Array.isArray(payload.decisionGraph?.nodes)
    && Array.isArray(payload.decisionGraph?.edges)
    && Array.isArray(payload.patterns)
    && Array.isArray(payload.networkGraph?.nodes)
    && Array.isArray(payload.networkGraph?.edges)
    && Array.isArray(payload.networkGraph?.clusters);
}

function calculateWorkspaceWithoutBlocking(
  input: SpectroWorkspaceInput
): Promise<SpectroWorkspaceCalculation> {
  const calculateFallback = () => calculateSpectroWorkspace(input);

  if (typeof Worker === "undefined") {
    try {
      return Promise.resolve(calculateFallback());
    } catch (cause) {
      return Promise.reject(cause);
    }
  }

  let worker: Worker;
  try {
    worker = new Worker(
      new URL("../../domain/spectroAnalysis.worker.ts", import.meta.url),
      { type: "module" }
    );
  } catch {
    // Una política CSP o un navegador sin soporte no debe dejar Espectro inutilizable.
    try {
      return Promise.resolve(calculateFallback());
    } catch (cause) {
      return Promise.reject(cause);
    }
  }

  return new Promise((resolve, reject) => {
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      callback();
    };

    const fallback = () => {
      finish(() => {
        try {
          resolve(calculateFallback());
        } catch (cause) {
          reject(cause);
        }
      });
    };

    worker.onmessage = (event: MessageEvent<SpectroAnalysisWorkerResponse>) => {
      const response = event.data;
      if (response?.ok) {
        finish(() => resolve(response.result));
      } else {
        finish(() => reject(new Error(
          response && "error" in response
            ? response.error
            : "El trabajador de Espectro devolvió una respuesta no válida."
        )));
      }
    };

    worker.onerror = (event) => {
      event.preventDefault();
      fallback();
    };

    worker.onmessageerror = fallback;

    try {
      worker.postMessage(input satisfies SpectroAnalysisWorkerRequest);
    } catch {
      // Si el navegador no puede clonar la entrada, se conserva el cálculo alternativo.
      fallback();
    }
  });
}

/**
 * Lee una sola instantánea local y calcula Espectro y sus seis paneles de
 * analítica en el mismo Web Worker. Las tablas personales son solo lectura.
 */
export async function getSpectroWorkspace(): Promise<SpectroWorkspaceResult> {
  const [movies, viewings, libraryEntries, collections, collectionMovies] = await Promise.all([
    prismaDb.movies.toArray(),
    prismaDb.viewings.toArray(),
    prismaDb.libraryEntries.toArray(),
    prismaDb.collections.toArray(),
    prismaDb.collectionMovies.toArray()
  ]);

  const candidates = selectSpectroCandidates(movies, viewings, libraryEntries, collectionMovies);
  const favoriteMovieIds = libraryEntries
    .filter((entry) => entry.isFavorite)
    .map((entry) => entry.movieId);
  const analysisInput = { viewings, movies, candidates, favoriteMovieIds };
  const inputFingerprint = getSpectroInputFingerprint(analysisInput);
  const snapshotId = SPECTRO_ALGORITHM_VERSION + ":" + inputFingerprint;
  const cached = await prismaDb.spectroSnapshots.get(snapshotId);
  const cachedAnalysis = cached
    && cached.algorithmVersion === SPECTRO_ALGORITHM_VERSION
    && cached.inputFingerprint === inputFingerprint
    && isValidCachedAnalysis(cached.analysisPayload, inputFingerprint)
    ? cached.analysisPayload
    : undefined;

  const input: SpectroWorkspaceInput = {
    ...(!cachedAnalysis ? { analysisInput } : {}),
    analyticsInput: { movies, viewings, libraryEntries, collections, collectionMovies }
  };
  const calculated = await calculateWorkspaceWithoutBlocking(input);
  const analysis = cachedAnalysis ?? calculated.analysis;

  if (!analysis) {
    throw new Error("Prisma no recibió un resultado válido del análisis de Espectro.");
  }

  const result: SpectroWorkspaceResult = {
    analysis,
    analytics: calculated.analytics
  };

  if (!cachedAnalysis) {
    const snapshot: SpectroSnapshot = {
      id: snapshotId,
      algorithmVersion: analysis.algorithmVersion,
      inputFingerprint: analysis.inputFingerprint,
      computedAt: analysis.computedAt,
      analysisPayload: analysis
    };
    await prismaDb.spectroSnapshots.put(snapshot);
  }

  return result;
}


/**
 * Clasifica resultados externos con el perfil local ya calculado por Espectro.
 * No guarda candidatas ni transmite señales personales a TMDB.
 */
export async function getSpectroDiscoverRecommendations(
  summaries: readonly TmdbMovieSummary[]
): Promise<{ movieCount: number; recommendations: ReturnType<typeof rankSpectroCandidates> }> {
  if (summaries.length === 0) {
    return { movieCount: 0, recommendations: [] };
  }

  const [workspace, movies, viewings, libraryEntries] = await Promise.all([
    getSpectroWorkspace(),
    prismaDb.movies.toArray(),
    prismaDb.viewings.toArray(),
    prismaDb.libraryEntries.toArray()
  ]);
  const localMovies = new Map(movies.map((movie) => [movie.tmdbId, movie]));
  const now = new Date().toISOString();

  const candidates: MovieRecord[] = summaries.map((summary) => {
    const current = localMovies.get(summary.id);
    const releaseYear = summary.release_date && /^\\d{4}/.test(summary.release_date)
      ? Number(summary.release_date.slice(0, 4))
      : current?.releaseYear;

    return {
      ...(current ?? {
        id: "tmdb-" + summary.id,
        tmdbId: summary.id,
        title: summary.title,
        genres: [],
        countries: [],
        lastViewingSequence: 0,
        createdAt: now,
        updatedAt: now
      }),
      id: current?.id ?? "tmdb-" + summary.id,
      tmdbId: summary.id,
      title: summary.title,
      originalTitle: summary.original_title ?? current?.originalTitle,
      overview: summary.overview ?? current?.overview,
      releaseDate: summary.release_date ?? current?.releaseDate,
      releaseYear,
      voteAverage: summary.vote_average ?? current?.voteAverage,
      genreIds: summary.genre_ids?.length ? summary.genre_ids : current?.genreIds,
      originalLanguage: summary.original_language ?? current?.originalLanguage,
      posterPath: summary.poster_path ?? current?.posterPath,
      backdropPath: summary.backdrop_path ?? current?.backdropPath
    };
  });

  const favoriteMovieIds = libraryEntries
    .filter((entry) => entry.isFavorite)
    .map((entry) => entry.movieId);
  const recommendations = rankSpectroCandidates(
    { movies, viewings, favoriteMovieIds },
    candidates,
    workspace.analysis,
    { includeWatched: true }
  );

  return { movieCount: workspace.analysis.movieCount, recommendations };
}

/** Conserva la API previa para consumidores que solo necesitan el análisis. */
export async function getSpectroAnalysis(): Promise<SpectroAnalysis> {
  return (await getSpectroWorkspace()).analysis;
}
