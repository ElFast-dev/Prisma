import type { SpectroSnapshot } from "../../domain/types";
import { analyzeSpectro, type SpectroAnalysis } from "../../domain/spectro";
import { prismaDb } from "./database";

export async function getSpectroAnalysis(): Promise<SpectroAnalysis> {
  const [viewings, movies, libraryEntries] = await Promise.all([
    prismaDb.viewings.toArray(),
    prismaDb.movies.toArray(),
    prismaDb.libraryEntries.toArray()
  ]);
  const ratedIds = new Set(viewings.map((viewing) => viewing.movieId));
  const libraryByMovie = new Map(libraryEntries.map((entry) => [entry.movieId, entry]));
  const candidates = movies.filter((movie) => (
    !ratedIds.has(movie.id)
    && libraryByMovie.get(movie.id)?.status !== "watched"
    && Boolean(movie.genreIds?.length || movie.genres.length)
  ));
  const analysis = analyzeSpectro({ viewings, movies, candidates });
  const snapshotId = analysis.algorithmVersion + ":" + analysis.inputFingerprint;
  const cached = await prismaDb.spectroSnapshots.get(snapshotId);
  if (cached) return cached.analysisPayload as SpectroAnalysis;
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
