import type { SpectroAnalyticsInput } from "../../domain/spectroAnalytics";
import { prismaDb } from "./database";

export async function getSpectroAnalyticsData(): Promise<SpectroAnalyticsInput> {
  const [movies, viewings, libraryEntries, collections, collectionMovies] = await Promise.all([
    prismaDb.movies.toArray(),
    prismaDb.viewings.toArray(),
    prismaDb.libraryEntries.toArray(),
    prismaDb.collections.toArray(),
    prismaDb.collectionMovies.toArray()
  ]);

  return { movies, viewings, libraryEntries, collections, collectionMovies };
}
