import type { SpectroSnapshot } from "../../domain/types";
import {
  analyzeSpectro,
  getSpectroInputFingerprint,
  selectSpectroCandidates,
  SPECTRO_ALGORITHM_VERSION,
  type SpectroAnalysis,
  type SpectroInput
} from "../../domain/spectro";
import type { SpectroAnalysisWorkerResponse } from "../../domain/spectroWorkerProtocol";
import { prismaDb } from "./database";

function analyzeSpectroWithoutBlocking(input: SpectroInput): Promise<SpectroAnalysis> {
  // Los navegadores sin Web Workers mantienen compatibilidad usando el cálculo local.
  if (typeof Worker === "undefined") {
    return Promise.resolve(analyzeSpectro(input));
  }

  let worker: Worker;
  try {
    worker = new Worker(
      new URL("../../domain/spectroAnalysis.worker.ts", import.meta.url),
      { type: "module" }
    );
  } catch {
    // Si el navegador no permite crear el worker (por ejemplo, una política CSP),
    // Prisma sigue funcionando con el método síncrono anterior.
    return Promise.resolve(analyzeSpectro(input));
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

    worker.onmessage = (event: MessageEvent<SpectroAnalysisWorkerResponse>) => {
      const response = event.data;
      if (response.ok) {
        finish(() => resolve(response.analysis));
      } else {
        finish(() => reject(new Error(response.error)));
      }
    };

    worker.onerror = (event) => {
      event.preventDefault();
      finish(() => reject(new Error(
        event.message || "No se pudo completar el análisis de Espectro en segundo plano."
      )));
    };

    worker.onmessageerror = () => {
      finish(() => reject(new Error(
        "Prisma no pudo leer el resultado del análisis de Espectro."
      )));
    };

    try {
      worker.postMessage(input);
    } catch (cause) {
      finish(() => reject(cause instanceof Error
        ? cause
        : new Error("No se pudo enviar el historial al análisis de Espectro.")));
    }
  });
}

export async function getSpectroAnalysis(): Promise<SpectroAnalysis> {
  const [viewings, movies, libraryEntries, collectionMovies] = await Promise.all([
    prismaDb.viewings.toArray(),
    prismaDb.movies.toArray(),
    prismaDb.libraryEntries.toArray(),
    prismaDb.collectionMovies.toArray()
  ]);

  const candidates = selectSpectroCandidates(movies, viewings, libraryEntries, collectionMovies);
  const favoriteMovieIds = libraryEntries
    .filter((entry) => entry.isFavorite)
    .map((entry) => entry.movieId);

  const input = { viewings, movies, candidates, favoriteMovieIds };
  const inputFingerprint = getSpectroInputFingerprint(input);
  const snapshotId = SPECTRO_ALGORITHM_VERSION + ":" + inputFingerprint;
  const cached = await prismaDb.spectroSnapshots.get(snapshotId);

  if (
    cached
    && cached.algorithmVersion === SPECTRO_ALGORITHM_VERSION
    && cached.inputFingerprint === inputFingerprint
  ) {
    const payload = cached.analysisPayload as Partial<SpectroAnalysis>;
    if (
      payload.algorithmVersion === SPECTRO_ALGORITHM_VERSION
      && payload.inputFingerprint === inputFingerprint
      && Array.isArray(payload.decisionGraph?.nodes)
      && Array.isArray(payload.decisionGraph?.edges)
      && Array.isArray(payload.patterns)
      && Array.isArray(payload.networkGraph?.nodes)
      && Array.isArray(payload.networkGraph?.edges)
      && Array.isArray(payload.networkGraph?.clusters)
    ) {
      return payload as SpectroAnalysis;
    }
  }

  const analysis = await analyzeSpectroWithoutBlocking(input);
  const snapshot: SpectroSnapshot = {
    id: snapshotId,
    algorithmVersion: analysis.algorithmVersion,
    inputFingerprint: analysis.inputFingerprint,
    computedAt: analysis.computedAt,
    analysisPayload: analysis
  };
  await prismaDb.spectroSnapshots.put(snapshot);
  return analysis;
}
