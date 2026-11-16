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

const movie = (
  id: string,
  runtimeMinutes: number,
  genres: string[] = [],
  releaseYear?: number,
  directors: string[] = [],
  countries: string[] = []
): MovieRecord => ({
  id,
  tmdbId: Number(id.replace("movie-", "")),
  title: "Película " + id,
  genres,
  countries,
  directors,
  runtimeMinutes,
  ...(releaseYear ? { releaseYear } : {}),
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
    const stats = calculatePersonalStats(
      viewings,
      [
        movie("movie-1", 100, ["Drama"], 1994),
        movie("movie-2", 90, ["Drama", "Ciencia ficción"], 2008)
      ],
      "2026-11-15"
    );

    expect(stats.uniqueMoviesWatched).toBe(2);
    expect(stats.totalViewings).toBe(3);
    expect(stats.additionalViewings).toBe(1);
    expect(stats.watchedMinutes).toBe(290);
    expect(stats.averageRating).toBe(8.33);
    expect(stats.activeDays).toBe(2);
    expect(stats.genreHighlights[0]).toEqual({ label: "Drama", count: 2, percentage: 100 });
    expect(stats.decadeHighlights.map((item) => item.label)).toEqual(["Años 1990", "Años 2000"]);
    expect(stats.recentActivity).toHaveLength(6);
    expect(stats.recentActivity.at(-1)).toMatchObject({ key: "2026-11", viewings: 3, uniqueMovies: 2 });
  });

  it("excludes unrated experiences from the average without excluding them from total activity", () => {
    const unrated = {
      ...viewing("2", "movie-2", "2026-11-14", 0),
      rating: undefined
    };
    const stats = calculatePersonalStats(
      [viewing("1", "movie-1", "2026-11-13", 8), unrated],
      [movie("movie-1", 100), movie("movie-2", 90)],
      "2026-11-15"
    );
    expect(stats.totalViewings).toBe(2);
    expect(stats.uniqueMoviesWatched).toBe(2);
    expect(stats.averageRating).toBe(8);
  });

  it("counts each genre and film once when deriving the cinematic signature", () => {
    const stats = calculatePersonalStats(
      [
        viewing("1", "movie-1", "2026-11-10", 9),
        viewing("2", "movie-1", "2026-11-10", 10),
        viewing("3", "movie-2", "2026-10-05", 8),
        viewing("4", "movie-3", "2026-07-02", 7)
      ],
      [
        movie("movie-1", 100, ["Drama", "Drama", " Thriller "], 1988, ["Directora A", " Directora A "], ["Panamá", "Panamá"]),
        movie("movie-2", 110, ["Drama", "Comedia"], 2005, ["Directora A", "Director B"], ["Panamá", "México"]),
        movie("movie-3", 90, [], undefined, [], [])
      ],
      "2026-11-15"
    );

    expect(stats.genreHighlights.map(({ label, count }) => [label, count])).toEqual([
      ["Drama", 2],
      ["Comedia", 1],
      ["Thriller", 1]
    ]);
    expect(stats.decadeHighlights.map(({ label, count }) => [label, count])).toEqual([
      ["Años 1980", 1],
      ["Años 2000", 1]
    ]);
    expect(stats.directorHighlights.map(({ label, count }) => [label, count])).toEqual([
      ["Directora A", 2],
      ["Director B", 1]
    ]);
    expect(stats.countryHighlights.map(({ label, count }) => [label, count])).toEqual([
      ["Panamá", 2],
      ["México", 1]
    ]);
    expect(stats.recentActivity.map(({ key, viewings, uniqueMovies }) => [key, viewings, uniqueMovies])).toEqual([
      ["2026-06", 0, 0],
      ["2026-07", 1, 1],
      ["2026-08", 0, 0],
      ["2026-09", 0, 0],
      ["2026-10", 1, 1],
      ["2026-11", 2, 1]
    ]);
  });
});
