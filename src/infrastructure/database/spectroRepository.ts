import type { SpectroSnapshot } from "../../domain/types";
import {
  analyzeSpectro,
  getSpectroInputFingerprint,
  selectSpectroCandidates,
  SPECTRO_ALGORITHM_VERSION,
  type SpectroAnalysis
} from "../../domain/spectro";
import { prismaDb } from "./database";

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

  const analysis = analyzeSpectro(input);
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
