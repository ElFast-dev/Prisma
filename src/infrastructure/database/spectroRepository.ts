import type { SpectroSnapshot } from "../../domain/types";
import {
  getSpectroInputFingerprint,
  selectSpectroCandidates,
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

/** Conserva la API previa para consumidores que solo necesitan el análisis. */
export async function getSpectroAnalysis(): Promise<SpectroAnalysis> {
  return (await getSpectroWorkspace()).analysis;
}
