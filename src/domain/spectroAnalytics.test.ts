import { describe, expect, it } from "vitest";
import type { Collection, CollectionMovie, LibraryEntry, MovieRecord, Viewing } from "./types";
import { calculateSpectroAnalytics } from "./spectroAnalytics";

function movie(id: string, values: Partial<MovieRecord> = {}): MovieRecord {
  return {
    id,
    tmdbId: Number(id.replace(/\D/g, "")) || 1,
    title: id,
    genres: [],
    countries: [],
    lastViewingSequence: 1,
    createdAt: "2026-01-01T12:00:00.000Z",
    updatedAt: "2026-01-01T12:00:00.000Z",
    ...values
  };
}

function viewing(
  id: string,
  movieId: string,
  watchedOn: string,
  sequenceNumber: number,
  rating?: number,
  values: Partial<Viewing> = {}
): Viewing {
  return {
    id,
    movieId,
    watchedOn,
    sequenceNumber,
    rating,
    createdAt: "2026-01-01T12:00:00.000Z",
    updatedAt: "2026-01-01T12:00:00.000Z",
    operationId: id + "-operation",
    ...values
  };
}

describe("calculateSpectroAnalytics", () => {
  it("separa sesiones de películas únicas y promedia los revisionados por título", () => {
    const movies = [
      movie("m1", { title: "Primera película", genres: ["Drama", "Drama"], runtimeMinutes: 100 }),
      movie("m2", { title: "Segunda película", genres: ["Comedia"], runtimeMinutes: 90 })
    ];
    const viewings = [
      viewing("v1", "m1", "2026-01-05", 1, 8),
      viewing("v2", "m1", "2026-02-02", 2, 10),
      viewing("v3", "m2", "2026-03-03", 1, 4)
    ];

    const result = calculateSpectroAnalytics({
      movies,
      viewings,
      libraryEntries: [],
      collections: [],
      collectionMovies: []
    });

    expect(result.summary).toMatchObject({
      totalViewings: 3,
      uniqueMoviesWatched: 2,
      ratedMovies: 2,
      averageMovieRating: 6.5,
      additionalViewings: 1,
      moviesWithRewatches: 1,
      estimatedMinutes: 290,
      viewingsWithoutRuntime: 0
    });
    expect(result.ratingDistribution).toEqual([
      { rating: 1, count: 0, percentage: 0 },
      { rating: 2, count: 0, percentage: 0 },
      { rating: 3, count: 0, percentage: 0 },
      { rating: 4, count: 1, percentage: 33.3 },
      { rating: 5, count: 0, percentage: 0 },
      { rating: 6, count: 0, percentage: 0 },
      { rating: 7, count: 0, percentage: 0 },
      { rating: 8, count: 1, percentage: 33.3 },
      { rating: 9, count: 0, percentage: 0 },
      { rating: 10, count: 1, percentage: 33.3 }
    ]);
    expect(result.topRatedMovies[0]).toMatchObject({ title: "Primera película", averageRating: 9 });
    expect(result.lowestRatedMovies[0]).toMatchObject({ title: "Segunda película", averageRating: 4 });
    expect(result.rewatchTitles[0]).toMatchObject({
      title: "Primera película",
      viewings: 2,
      firstRating: 8,
      latestRating: 10
    });
    expect(result.averageRewatchChange).toBe(2);
    expect(result.genreCounts.map((item) => [item.label, item.count])).toEqual([
      ["Comedia", 1],
      ["Drama", 1]
    ]);
  });

  it("rellena los meses vacíos y calcula actividad por día de semana", () => {
    const result = calculateSpectroAnalytics({
      movies: [movie("m1")],
      viewings: [
        viewing("v1", "m1", "2026-01-05", 1, 7),
        viewing("v2", "m1", "2026-03-03", 2, 9)
      ],
      libraryEntries: [],
      collections: [],
      collectionMovies: []
    });

    expect(result.monthly.map((item) => item.key)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(result.monthly.map((item) => item.viewings)).toEqual([1, 0, 1]);
    expect(result.weekdays.find((item) => item.label === "Lunes")?.count).toBe(1);
    expect(result.weekdays.find((item) => item.label === "Martes")?.count).toBe(1);
    expect(result.summary.activeDays).toBe(2);
  });

  it("agrupa el mapa de horas solo cuando existe una hora local válida", () => {
    const result = calculateSpectroAnalytics({
      movies: [movie("m1")],
      viewings: [
        viewing("v1", "m1", "2026-01-05", 1, 7, { watchedAtLocalTime: "20:45" }),
        viewing("v2", "m1", "2026-01-05", 2, 8, { watchedAtLocalTime: "21:10" }),
        viewing("v3", "m1", "2026-01-06", 3, 9, { watchedAtLocalTime: "25:10" }),
        viewing("v4", "m1", "2026-01-06", 4, 6)
      ],
      libraryEntries: [],
      collections: [],
      collectionMovies: []
    });

    expect(result.timedViewings).toBe(2);
    expect(result.hourHeatmap[1][20]).toBe(1);
    expect(result.hourHeatmap[1][21]).toBe(1);
    expect(result.summary.totalViewings).toBe(4);
  });

  it("distingue favoritos, pendientes y colecciones sin convertir favoritos en notas", () => {
    const collections: Collection[] = [{
      id: "c1",
      name: "Cine favorito",
      createdAt: "2026-01-01T12:00:00.000Z",
      updatedAt: "2026-01-01T12:00:00.000Z"
    }];
    const collectionMovies: CollectionMovie[] = [{
      id: "cm1",
      collectionId: "c1",
      movieId: "m1",
      position: 0,
      addedAt: "2026-01-01T12:00:00.000Z"
    }];
    const libraryEntries: LibraryEntry[] = [
      { movieId: "m1", status: "watched", isFavorite: true, addedAt: "2026-01-01", updatedAt: "2026-01-01" },
      { movieId: "m2", status: "pending", isFavorite: false, addedAt: "2026-01-01", updatedAt: "2026-01-01" }
    ];

    const result = calculateSpectroAnalytics({
      movies: [movie("m1"), movie("m2"), movie("m3")],
      viewings: [viewing("v1", "m1", "2026-01-05", 1, 9)],
      libraryEntries,
      collections,
      collectionMovies
    });

    expect(result.summary.favorites).toBe(1);
    expect(result.summary.pending).toBe(1);
    expect(result.libraryBreakdown.map((item) => [item.label, item.count])).toEqual([
      ["Vistas", 1],
      ["Pendientes", 1],
      ["Otras del catálogo", 1]
    ]);
    expect(result.collectionCounts).toEqual([{ id: "c1", name: "Cine favorito", movieCount: 1 }]);
    expect(result.summary.ratedMovies).toBe(1);
  });

  it("no inventa fechas, promedios ni coberturas cuando faltan datos", () => {
    const result = calculateSpectroAnalytics({
      movies: [movie("m1", { genres: [], countries: [], runtimeMinutes: undefined })],
      viewings: [viewing("v1", "m1", "fecha-inválida", 1)],
      libraryEntries: [],
      collections: [],
      collectionMovies: []
    });

    expect(result.monthly).toEqual([]);
    expect(result.summary.averageMovieRating).toBeNull();
    expect(result.summary.estimatedMinutes).toBe(0);
    expect(result.summary.viewingsWithoutRuntime).toBe(1);
    expect(result.summary.unratedViewings).toBe(1);
    expect(result.summary.activeDays).toBe(0);
    expect(result.ratingDistribution.every((item) => item.count === 0)).toBe(true);
  });
});
