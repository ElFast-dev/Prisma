import type { ExternalMovieImportPlan } from "../../domain/externalMovieImport";
import type { LibraryEntry, MovieRecord, Viewing } from "../../domain/types";
import { prismaDb } from "./database";
import { requestAutomaticEnrichment } from "./enrichmentService";
import { startSpectroMetadataEnrichment } from "./spectroMetadataService";

export type ExternalMovieImportPriority = "local" | "external";

export interface ExternalMovieImportResult {
  newCatalogMovies: number;
  newLibraryEntries: number;
  newWatchedEntries: number;
  newPendingEntries: number;
  viewingsAdded: number;
  alreadyKnownMovies: number;
  alreadyHadViewings: number;
  correctedImportedDates: number;
  updatedImportedViewings: number;
  matchedExistingViewings: number;
}

function externalOperationId(traktId: number): string {
  return "external-import-trakt-" + traktId;
}

export async function importExternalMovies(
  plan: ExternalMovieImportPlan,
  priority: ExternalMovieImportPriority = "local"
): Promise<ExternalMovieImportResult> {
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
    alreadyHadViewings: 0,
    correctedImportedDates: 0,
    updatedImportedViewings: 0,
    matchedExistingViewings: 0
  };

  await prismaDb.transaction(
    "rw",
    [
      prismaDb.movies,
      prismaDb.libraryEntries,
      prismaDb.viewings,
      prismaDb.preferences,
      prismaDb.spectroSnapshots
    ],
    async () => {
      const [storedMovies, storedEntries, storedViewings, storedPreferences] = await Promise.all([
        prismaDb.movies.toArray(),
        prismaDb.libraryEntries.toArray(),
        prismaDb.viewings.toArray(),
        prismaDb.preferences.get("local")
      ]);

      const moviesByTmdbId = new Map<number, MovieRecord>(storedMovies.map((movie) => [movie.tmdbId, movie]));
      const entriesByMovieId = new Map<string, LibraryEntry>(storedEntries.map((entry) => [entry.movieId, entry]));
      const viewingsByMovieId = new Map<string, Viewing[]>();
      const importedViewingsByMovie = new Map<string, Viewing[]>();
      const maxSequences = new Map<string, number>();

      for (const viewing of storedViewings) {
        const movieViewings = viewingsByMovieId.get(viewing.movieId) ?? [];
        movieViewings.push(viewing);
        viewingsByMovieId.set(viewing.movieId, movieViewings);

        if (viewing.operationId.startsWith("external-import-")) {
          const imported = importedViewingsByMovie.get(viewing.movieId) ?? [];
          imported.push(viewing);
          importedViewingsByMovie.set(viewing.movieId, imported);
        }
        maxSequences.set(
          viewing.movieId,
          Math.max(maxSequences.get(viewing.movieId) ?? 0, viewing.sequenceNumber)
        );
      }

      const moviesToWrite = new Map<string, MovieRecord>();
      const entriesToWrite = new Map<string, LibraryEntry>();
      const viewingsToWrite = new Map<string, Viewing>();
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
        const nextStatus = priority === "external" || !currentEntry?.status
          ? source.status
          : currentEntry.status;

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
          const updatedEntry: LibraryEntry = { ...currentEntry, status: nextStatus, updatedAt: now };
          entriesByMovieId.set(movie.id, updatedEntry);
          entriesToWrite.set(movie.id, updatedEntry);
        }

        if (source.status !== "watched" || !source.watchedOn) continue;

        const movieViewings = viewingsByMovieId.get(movie.id) ?? [];
        const importedViewings = importedViewingsByMovie.get(movie.id) ?? [];
        if (movieViewings.length > 0) result.alreadyHadViewings += 1;

        const stableOperationId = externalOperationId(source.traktId);
        const previousImport = importedViewings.find((viewing) => viewing.operationId === stableOperationId)
          ?? importedViewings[0];

        if (previousImport) {
          const externalWins = priority === "external";
          const updated: Viewing = {
            ...previousImport,
            operationId: stableOperationId,
            watchedOn: externalWins ? source.watchedOn : previousImport.watchedOn,
            rating: externalWins && source.rating !== undefined
              ? source.rating
              : previousImport.rating,
            updatedAt: now
          };
          if (
            previousImport.operationId !== updated.operationId
            || previousImport.watchedOn !== updated.watchedOn
            || previousImport.rating !== updated.rating
          ) {
            viewingsToWrite.set(updated.id, updated);
            result.updatedImportedViewings += 1;
            if (externalWins && previousImport.watchedOn !== updated.watchedOn) {
              result.correctedImportedDates += 1;
            }
          }
          continue;
        }

        // If the same calendar day already exists locally, link that experience to
        // this external record rather than creating a duplicate row.
        const sameDayLocalViewing = movieViewings.find((viewing) =>
          !viewing.operationId.startsWith("external-import-")
          && viewing.watchedOn === source.watchedOn
        );
        if (sameDayLocalViewing) {
          const updated: Viewing = {
            ...sameDayLocalViewing,
            operationId: stableOperationId,
            rating: priority === "external" && source.rating !== undefined
              ? source.rating
              : sameDayLocalViewing.rating,
            updatedAt: now
          };
          viewingsToWrite.set(updated.id, updated);
          result.matchedExistingViewings += 1;
          continue;
        }

        // A cH record is a real watched experience even when the source app
        // has no rating for it. Unrated experiences still belong in History.
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
          updatedAt: now,
          operationId: stableOperationId
        };
        viewingsToWrite.set(viewing.id, viewing);
        movieViewings.push(viewing);
        viewingsByMovieId.set(movie.id, movieViewings);
        const movieImported = importedViewingsByMovie.get(movie.id) ?? [];
        movieImported.push(viewing);
        importedViewingsByMovie.set(movie.id, movieImported);
        maxSequences.set(movie.id, sequenceNumber);
        moviesToWrite.set(movie.id, { ...movie, lastViewingSequence: sequenceNumber, updatedAt: now });
        result.viewingsAdded += 1;
      }

      if (moviesToWrite.size) await prismaDb.movies.bulkPut([...moviesToWrite.values()]);
      if (entriesToWrite.size) await prismaDb.libraryEntries.bulkPut([...entriesToWrite.values()]);
      if (viewingsToWrite.size) await prismaDb.viewings.bulkPut([...viewingsToWrite.values()]);
      if (moviesToWrite.size || entriesToWrite.size || viewingsToWrite.size) {
        await prismaDb.spectroSnapshots.clear();
      }

      const importedExperienceChanges = result.viewingsAdded
        + result.updatedImportedViewings
        + result.matchedExistingViewings;
      if (storedPreferences && importedExperienceChanges > 0) {
        const latestImportedMonth = plan.movies
          .filter((item) => item.status === "watched" && item.watchedOn)
          .map((item) => item.watchedOn!.slice(0, 7))
          .sort()
          .at(-1);
        const previousBrowse = storedPreferences.historyBrowse;
        await prismaDb.preferences.update("local", {
          historyBrowse: {
            viewMode: "timeline",
            sortOrder: previousBrowse?.sortOrder ?? "newest",
            month: latestImportedMonth ?? previousBrowse?.month ?? now.slice(0, 7),
            selectedDate: null
          },
          updatedAt: now
        });
      }
    }
  );

  if (result.newLibraryEntries > 0) {
    requestAutomaticEnrichment();
    void startSpectroMetadataEnrichment();
  }
  return result;
}
