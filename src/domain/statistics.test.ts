import { describe, expect, it } from "vitest";
import type { MovieRecord, Viewing } from "./types";
import { calculatePersonalStats, calculateStreaks } from "./statistics";

const viewing = (id: string, movieId: string, watchedOn: string, rating: number): Viewing => ({
  id,
  movieId,
  sequenceNumber: Number(id),
  watchedOn,
  rating,
  createdAt: watchedOn + "T12:00:00.000Z",
  updatedAt: watchedOn + "T12:00:00.000Z",
  operationId: "op-" + id
});

const movie = (id: string, runtimeMinutes: number): MovieRecord => ({
  id,
  tmdbId: Number(id.replace("movie-", "")),
  title: "Película " + id,
  genres: [],
  countries: [],
  runtimeMinutes,
  lastViewingSequence: 0,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
});

describe("statistics", () => {
  it("counts consecutive calendar days only once", () => {
    expect(calculateStreaks([
      "2026-11-12",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14"
    ], "2026-11-15")).toEqual({ current: 3, longest: 3, activeDays: 3 });
  });

  it("keeps yesterday's streak alive until today ends", () => {
    expect(calculateStreaks(["2026-11-13", "2026-11-14"], "2026-11-15").current).toBe(2);
  });

  it("resets the current streak after a missed day", () => {
    expect(calculateStreaks(["2026-11-11", "2026-11-12"], "2026-11-15").current).toBe(0);
  });

  it("counts rewatches separately for time and ratings, but movies uniquely", () => {
    const viewings = [
      viewing("1", "movie-1", "2026-11-13", 8),
      viewing("2", "movie-1", "2026-11-13", 10),
      viewing("3", "movie-2", "2026-11-14", 7)
    ];
    const stats = calculatePersonalStats(viewings, [movie("movie-1", 100), movie("movie-2", 90)], "2026-11-15");

    expect(stats.uniqueMoviesWatched).toBe(2);
    expect(stats.totalViewings).toBe(3);
    expect(stats.watchedMinutes).toBe(290);
    expect(stats.averageRating).toBe(8.33);
    expect(stats.activeDays).toBe(2);
  });
});
