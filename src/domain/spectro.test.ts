import { describe, expect, it } from "vitest";
import type { MovieRecord, Viewing } from "./types";
import { analyzeSpectro, SPECTRO_ALGORITHM_VERSION } from "./spectro";

const movie = (
  id: string,
  genre: string,
  genreId: number,
  year: number,
  overrides: Partial<MovieRecord> = {}
): MovieRecord => ({
  id,
  tmdbId: Number(id.replace("movie-", "")),
  title: id,
  genres: [genre],
  genreIds: [genreId],
  countries: ["Japón"],
  releaseYear: year,
  directors: ["Directora A"],
  castMembers: ["Actor A"],
  originalLanguage: "ja",
  runtimeMinutes: 110,
  lastViewingSequence: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const viewing = (
  id: string,
  movieId: string,
  watchedOn: string,
  rating: number
): Viewing => ({
  id,
  movieId,
  sequenceNumber: 1,
  watchedOn,
  rating,
  createdAt: watchedOn + "T12:00:00.000Z",
  updatedAt: watchedOn + "T12:00:00.000Z",
  operationId: "op-" + id
});

describe("analyzeSpectro 2.0", () => {
  it("identifica la versión que separa las instantáneas anteriores", () => {
    expect(SPECTRO_ALGORITHM_VERSION).toBe("2.0.0");
  });

  it("no infiere afinidades antes de tres películas distintas calificadas", () => {
    const result = analyzeSpectro({
      movies: [movie("movie-1", "Drama", 18, 1995), movie("movie-2", "Drama", 18, 2005)],
      viewings: [viewing("v1", "movie-1", "2026-01-01", 10), viewing("v2", "movie-2", "2026-01-02", 9)],
      candidates: []
    });

    expect(result.hasEnoughData).toBe(false);
    expect(result.genreAffinities).toEqual([]);
    expect(result.recommendations).toEqual([]);
  });

  it("calcula afinidades con títulos distintos y reduce el peso de muestras pequeñas", () => {
    const movies = [
      movie("movie-1", "Drama", 18, 1995),
      movie("movie-2", "Drama", 18, 2005),
      movie("movie-3", "Comedia", 35, 2015)
    ];
    const result = analyzeSpectro({
      movies,
      viewings: [
        viewing("v1", "movie-1", "2026-01-01", 10),
        viewing("v2", "movie-1", "2026-01-08", 8),
        viewing("v3", "movie-2", "2026-01-12", 9),
        viewing("v4", "movie-3", "2026-02-01", 6)
      ],
      candidates: []
    });

    const drama = result.genreAffinities.find((item) => item.label === "Drama");
    expect(result.totalViewings).toBe(4);
    expect(result.movieCount).toBe(3);
    expect(result.averageRating).toBe(8);
    expect(drama?.sampleSize).toBe(2);
    expect(drama?.averageRating).toBe(9);
    expect(drama?.confidence).toBe("inicial");
    expect(drama?.adjustedDifference).toBe(0.4);
  });

  it("recomienda candidatas por varias señales locales y explica el respaldo", () => {
    const movies = [
      movie("movie-1", "Drama", 18, 2015),
      movie("movie-2", "Drama", 18, 2016),
      movie("movie-3", "Drama", 18, 2017),
      movie("movie-4", "Comedia", 35, 2005, {
        countries: ["México"], directors: ["Director B"], castMembers: ["Actor B"],
        originalLanguage: "es", runtimeMinutes: 85
      }),
      movie("movie-5", "Comedia", 35, 2006, {
        countries: ["México"], directors: ["Director B"], castMembers: ["Actor B"],
        originalLanguage: "es", runtimeMinutes: 88
      }),
      movie("movie-6", "Comedia", 35, 2007, {
        countries: ["México"], directors: ["Director B"], castMembers: ["Actor B"],
        originalLanguage: "es", runtimeMinutes: 90
      })
    ];
    const ratings = [10, 9, 10, 5, 6, 5];
    const viewings = movies.map((item, index) => viewing(
      "v" + (index + 1),
      item.id,
      "2026-01-" + String(index + 1).padStart(2, "0"),
      ratings[index]
    ));
    const candidate = movie("movie-7", "Drama", 18, 2024);
    const result = analyzeSpectro({ movies, viewings, candidates: [candidate] });

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].movie.id).toBe(candidate.id);
    expect(result.recommendations[0].reasons.map((reason) => reason.category)).toEqual(
      expect.arrayContaining(["Género", "Dirección", "Reparto", "País", "Idioma original", "Duración"])
    );
    expect(result.languageAffinities.find((item) => item.key === "language:ja")?.sampleSize).toBe(3);
    expect(result.durationAffinities.find((item) => item.key === "duration:medium")?.sampleSize).toBe(3);
    expect(result.recommendations[0].confidence).toBe("moderada");
    expect(result.recommendations[0].reasons.every((reason) => reason.sampleSize === 3)).toBe(true);
  });

  it("no recomienda una afinidad respaldada solo por dos películas", () => {
    const movies = [
      movie("movie-1", "Drama", 18, 1995),
      movie("movie-2", "Drama", 18, 2005),
      movie("movie-3", "Comedia", 35, 2015)
    ];
    const result = analyzeSpectro({
      movies,
      viewings: [
        viewing("v1", "movie-1", "2026-01-01", 10),
        viewing("v2", "movie-2", "2026-01-02", 9),
        viewing("v3", "movie-3", "2026-01-03", 5)
      ],
      candidates: [movie("movie-4", "Drama", 18, 2022)]
    });

    expect(result.genreAffinities.find((item) => item.label === "Drama")?.sampleSize).toBe(2);
    expect(result.recommendations).toEqual([]);
  });

  it("mantiene la evolución mensual basada en visionados con calificación", () => {
    const result = analyzeSpectro({
      movies: [movie("movie-1", "Drama", 18, 1995), movie("movie-2", "Drama", 18, 2005), movie("movie-3", "Comedia", 35, 2015)],
      viewings: [
        viewing("v1", "movie-1", "2026-01-12", 8),
        viewing("v2", "movie-2", "2026-03-01", 10),
        viewing("v3", "movie-3", "2026-03-18", 6)
      ],
      candidates: []
    });

    expect(result.evolution).toEqual([
      { month: "2026-01", averageRating: 8, viewingCount: 1 },
      { month: "2026-03", averageRating: 8, viewingCount: 2 }
    ]);
  });

  it("compara afinidades entre periodos solo con tres títulos distintos por rasgo", () => {
    const movies: MovieRecord[] = [];
    const viewings: Viewing[] = [];
    const addPeriod = (prefix: string, date: string, dramaRatings: number[], comedyRatings: number[]) => {
      dramaRatings.forEach((rating, index) => {
        const item = movie(prefix + "-drama-" + index, "Drama", 18, 2010 + index * 10, {
          countries: [], directors: [], castMembers: [], originalLanguage: "", runtimeMinutes: 0
        });
        movies.push(item);
        viewings.push(viewing(prefix + "-drama-view-" + index, item.id, date, rating));
      });
      comedyRatings.forEach((rating, index) => {
        const item = movie(prefix + "-comedy-" + index, "Comedia", 35, 1980 + index * 10, {
          countries: [], directors: [], castMembers: [], originalLanguage: "", runtimeMinutes: 0
        });
        movies.push(item);
        viewings.push(viewing(prefix + "-comedy-view-" + index, item.id, date, rating));
      });
    };

    addPeriod("previous", "2025-01-30", [6, 6, 6], [9, 9, 9]);
    addPeriod("recent", "2026-02-02", [10, 10, 10], [5, 5, 5]);

    const result = analyzeSpectro({ movies, viewings, candidates: [] });
    const dramaTrend = result.affinityTrends.find((item) => item.key === "genre:18");

    expect(dramaTrend).toBeDefined();
    expect(dramaTrend?.previousSampleSize).toBe(3);
    expect(dramaTrend?.recentSampleSize).toBe(3);
    expect(dramaTrend?.direction).toBe("sube");
    expect(dramaTrend?.change).toBeGreaterThan(2);
  });

  it("no presenta tendencias con menos de tres títulos distintos en cada periodo", () => {
    const movies = [
      movie("movie-1", "Drama", 18, 1995),
      movie("movie-2", "Drama", 18, 2005),
      movie("movie-3", "Comedia", 35, 2015)
    ];
    const result = analyzeSpectro({
      movies,
      viewings: [
        viewing("v1", "movie-1", "2025-01-01", 8),
        viewing("v2", "movie-2", "2026-01-01", 9),
        viewing("v3", "movie-3", "2026-02-01", 6)
      ],
      candidates: []
    });

    expect(result.affinityTrends).toEqual([]);
  });

  it("incluye idioma y duración en la huella que invalida instantáneas", () => {
    const movies = [
      movie("movie-1", "Drama", 18, 1995),
      movie("movie-2", "Drama", 18, 2005),
      movie("movie-3", "Comedia", 35, 2015)
    ];
    const viewings = [
      viewing("v1", "movie-1", "2026-01-01", 8),
      viewing("v2", "movie-2", "2026-01-02", 9),
      viewing("v3", "movie-3", "2026-01-03", 6)
    ];
    const before = analyzeSpectro({ movies, viewings, candidates: [] });
    const after = analyzeSpectro({
      movies: movies.map((item) => item.id === "movie-1"
        ? { ...item, originalLanguage: "fr", runtimeMinutes: 145 }
        : item),
      viewings,
      candidates: []
    });

    expect(after.inputFingerprint).not.toBe(before.inputFingerprint);
  });
});
