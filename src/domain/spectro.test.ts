import { describe, expect, it } from "vitest";
import type { MovieRecord, Viewing } from "./types";
import { analyzeSpectro } from "./spectro";

const movie = (id: string, genre: string, genreId: number, year: number): MovieRecord => ({
  id, tmdbId: Number(id.replace("movie-", "")), title: id,
  genres: [genre], genreIds: [genreId], countries: ["Japón"], releaseYear: year,
  directors: ["Directora A"], castMembers: ["Actor A"], lastViewingSequence: 0,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"
});
const viewing = (id: string, movieId: string, watchedOn: string, rating: number): Viewing => ({
  id, movieId, sequenceNumber: 1, watchedOn, rating,
  createdAt: watchedOn + "T12:00:00.000Z", updatedAt: watchedOn + "T12:00:00.000Z", operationId: "op-" + id
});

describe("analyzeSpectro", () => {
  it("does not infer affinities before three distinct rated movies", () => {
    const result = analyzeSpectro({
      movies: [movie("movie-1", "Drama", 18, 1995), movie("movie-2", "Drama", 18, 2005)],
      viewings: [viewing("v1", "movie-1", "2026-01-01", 10), viewing("v2", "movie-2", "2026-01-02", 9)],
      candidates: []
    });
    expect(result.hasEnoughData).toBe(false);
    expect(result.genreAffinities).toEqual([]);
    expect(result.recommendations).toEqual([]);
  });

  it("calculates genre affinity and explains matching unseen candidates", () => {
    const movies = [movie("movie-1", "Drama", 18, 1995), movie("movie-2", "Drama", 18, 2005), movie("movie-3", "Comedia", 35, 2015)];
    const result = analyzeSpectro({
      movies,
      viewings: [
        viewing("v1", "movie-1", "2026-01-01", 10),
        viewing("v2", "movie-2", "2026-01-02", 9),
        viewing("v3", "movie-3", "2026-02-01", 6)
      ],
      candidates: [movie("movie-4", "Drama", 18, 2022), movie("movie-5", "Comedia", 35, 2024), movie("movie-1", "Drama", 18, 1995)],
      computedAt: "2026-03-01T00:00:00.000Z"
    });
    expect(result.hasEnoughData).toBe(true);
    expect(result.genreAffinities[0].label).toBe("Drama");
    expect(result.recommendations.map((item) => item.movie.id)).toEqual(["movie-4"]);
    expect(result.recommendations[0].reasons).toContain("Conecta con tu afinidad por Drama");
  });

  it("counts repeated viewings in the personal average and aggregates them per movie for affinities", () => {
    const movies = [movie("movie-1", "Drama", 18, 1995), movie("movie-2", "Drama", 18, 2005), movie("movie-3", "Comedia", 35, 2015)];
    const result = analyzeSpectro({
      movies,
      viewings: [
        viewing("v1", "movie-1", "2026-01-01", 10), viewing("v2", "movie-1", "2026-01-02", 8),
        viewing("v3", "movie-2", "2026-01-03", 9), viewing("v4", "movie-3", "2026-02-01", 6)
      ],
      candidates: []
    });
    expect(result.totalViewings).toBe(4);
    expect(result.movieCount).toBe(3);
    expect(result.averageRating).toBe(8.25);
    expect(result.genreAffinities.find((item) => item.label === "Drama")?.sampleSize).toBe(2);
  });

  it("builds monthly evolution only from months with actual viewings", () => {
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
});
