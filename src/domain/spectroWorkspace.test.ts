import { describe, expect, it } from "vitest";
import type { MovieRecord, Viewing } from "./types";
import { calculateSpectroWorkspace } from "./spectroWorkspace";

const timestamp = "2026-01-01T12:00:00.000Z";

const movie: MovieRecord = {
  id: "local-movie-1",
  tmdbId: 101,
  title: "Película de prueba",
  genres: ["Drama"],
  countries: [],
  lastViewingSequence: 1,
  createdAt: timestamp,
  updatedAt: timestamp
};

const viewing: Viewing = {
  id: "viewing-1",
  movieId: movie.id,
  watchedOn: "2026-01-01",
  sequenceNumber: 1,
  rating: 9,
  createdAt: timestamp,
  updatedAt: timestamp,
  operationId: "operation-1"
};

describe("calculateSpectroWorkspace", () => {
  it("calcula analítica y análisis desde una única entrada compartida", () => {
    const result = calculateSpectroWorkspace({
      analysisInput: { movies: [movie], viewings: [viewing], candidates: [] },
      analyticsInput: {
        movies: [movie],
        viewings: [viewing],
        libraryEntries: [],
        collections: [],
        collectionMovies: []
      }
    });

    expect(result.analysis.movieCount).toBe(1);
    expect(result.analytics.summary.totalViewings).toBe(1);
    expect(result.analytics.summary.uniqueMoviesWatched).toBe(1);
    expect(result.analytics.summary.averageMovieRating).toBe(9);
  });

  it("permite omitir el análisis cuando la capa local ya tiene una instantánea válida", () => {
    const result = calculateSpectroWorkspace({
      analyticsInput: {
        movies: [movie],
        viewings: [viewing],
        libraryEntries: [],
        collections: [],
        collectionMovies: []
      }
    });

    expect(result.analysis).toBeUndefined();
    expect(result.analytics.summary.totalViewings).toBe(1);
  });
});
