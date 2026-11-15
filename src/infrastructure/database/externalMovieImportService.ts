import type { ExternalMovieImportPlan } from "../../domain/externalMovieImport";
import type { LibraryEntry, MovieRecord, Viewing } from "../../domain/types";
import { prismaDb } from "./database";

export interface ExternalMovieImportResult {
  newCatalogMovies: number;
  newLibraryEntries: number;
  newWatchedEntries: number;
  newPendingEntries: number;
  viewingsAdded: number;
  alreadyKnownMovies: number;
  alreadyHadViewings: number;
}

export async function importExternalMovies(plan: ExternalMovieImportPlan): Promise<ExternalMovieImportResult> {
  if (plan.movies.length === 0) {
    throw new Error("El archivo no contiene películas con un identificador TMDB válido para importar.");
  }

  const result: ExternalMovieImportResult = {
    newCatalogMovies: 0,
    newLibraryEntries: 0,
    newWatchedEntries: 0,
    newPendingEntries: 0,
    viewingsAdded: 0,
    alreadyKnownMovies: 0,
    alreadyHadViewings: 0
  };

  await prismaDb.transaction(
    "rw",
    [
      prismaDb.movies,
      prismaDb.libraryEntries,
      prismaDb.viewings,
      prismaDb.spectroSnapshots
    ],
    async () => {
      const [storedMovies, storedEntries, storedViewings] = await Promise.all([
        prismaDb.movies.toArray(),
        prismaDb.libraryEntries.toArray(),
        prismaDb.viewings.toArray()
      ]);

      const moviesByTmdbId = new Map<number, MovieRecord>(storedMovies.map((movie) => [movie.tmdbId, movie]));
      const entriesByMovieId = new Map<string, LibraryEntry>(storedEntries.map((entry) => [entry.movieId, entry]));
      const viewingCounts = new Map<string, number>();
      const maxSequences = new Map<string, number>();

      for (const viewing of storedViewings) {
        viewingCounts.set(viewing.movieId, (viewingCounts.get(viewing.movieId) ?? 0) + 1);
        maxSequences.set(
          viewing.movieId,
          Math.max(maxSequences.get(viewing.movieId) ?? 0, viewing.sequenceNumber)
        );
      }

      const moviesToWrite = new Map<string, MovieRecord>();
      const entriesToWrite = new Map<string, LibraryEntry>();
      const viewingsToWrite: Viewing[] = [];
      const now = new Date().toISOString();

      for (const source of plan.movies) {
        let movie = moviesByTmdbId.get(source.tmdbId);
        if (movie) {
          result.alreadyKnownMovies += 1;
        } else {
          movie = {
            id: "tmdb-" + source.tmdbId,
            tmdbId: source.tmdbId,
            title: source.title,
            genres: [],
            countries: [],
            lastViewingSequence: 0,
            createdAt: source.addedAt,
            updatedAt: source.addedAt
          };
          moviesByTmdbId.set(source.tmdbId, movie);
          moviesToWrite.set(movie.id, movie);
          result.newCatalogMovies += 1;
        }

        const currentEntry = entriesByMovieId.get(movie.id);
        const existingViewingCount = viewingCounts.get(movie.id) ?? 0;
        const shouldBeWatched = source.status === "watched" || currentEntry?.status === "watched";
        const nextStatus = shouldBeWatched ? "watched" : "pending";

        if (source.status === "watched" && existingViewingCount > 0) {
          result.alreadyHadViewings += 1;
        } else if (source.status === "watched" && source.rating !== undefined && source.watchedOn) {
          const sequenceNumber = Math.max(
            movie.lastViewingSequence,
            maxSequences.get(movie.id) ?? 0
          ) + 1;
          const viewing: Viewing = {
            id: crypto.randomUUID(),
            movieId: movie.id,
            sequenceNumber,
            watchedOn: source.watchedOn,
            rating: source.rating,
            createdAt: source.ratingAt ?? source.addedAt,
            updatedAt: source.ratingAt ?? source.addedAt,
            operationId: "external-import-" + crypto.randomUUID()
          };
          viewingsToWrite.push(viewing);
          viewingCounts.set(movie.id, existingViewingCount + 1);
          maxSequences.set(movie.id, sequenceNumber);
          moviesToWrite.set(movie.id, {
            ...movie,
            lastViewingSequence: sequenceNumber,
            updatedAt: now
          });
          result.viewingsAdded += 1;
        }

        if (!currentEntry) {
          const entry: LibraryEntry = {
            movieId: movie.id,
            status: nextStatus,
            isFavorite: false,
            addedAt: source.addedAt,
            updatedAt: now
          };
          entriesByMovieId.set(movie.id, entry);
          entriesToWrite.set(movie.id, entry);
          result.newLibraryEntries += 1;
          if (nextStatus === "watched") result.newWatchedEntries += 1;
          else result.newPendingEntries += 1;
        } else if (currentEntry.status !== nextStatus) {
          const updatedEntry: LibraryEntry = {
            ...currentEntry,
            status: nextStatus,
            updatedAt: now
          };
          entriesByMovieId.set(movie.id, updatedEntry);
          entriesToWrite.set(movie.id, updatedEntry);
        }
      }

      if (moviesToWrite.size) await prismaDb.movies.bulkPut([...moviesToWrite.values()]);
      if (entriesToWrite.size) await prismaDb.libraryEntries.bulkPut([...entriesToWrite.values()]);
      if (viewingsToWrite.length) await prismaDb.viewings.bulkAdd(viewingsToWrite);
      if (moviesToWrite.size || entriesToWrite.size || viewingsToWrite.length) {
        await prismaDb.spectroSnapshots.clear();
      }
    }
  );

  return result;
}
