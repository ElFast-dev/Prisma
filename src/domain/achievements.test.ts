import { describe, expect, it } from "vitest";
import { calculateAchievements } from "./achievements";
import type { PersonalStats } from "./statistics";

const emptyStats: PersonalStats = {
  uniqueMoviesWatched: 0,
  totalViewings: 0,
  additionalViewings: 0,
  activeDays: 0,
  watchedMinutes: 0,
  currentStreak: 0,
  longestStreak: 0,
  averageRating: null,
  genreHighlights: [],
  decadeHighlights: [],
  directorHighlights: [],
  countryHighlights: [],
  recentActivity: []
};

describe("calculateAchievements", () => {
  it("keeps achievements locked when there is no activity", () => {
    const achievements = calculateAchievements(emptyStats, 0);
    expect(achievements).toHaveLength(13);
    expect(achievements.every((achievement) => !achievement.unlocked)).toBe(true);
  });

  it("unlocks the original milestones using real local statistics", () => {
    const stats: PersonalStats = {
      ...emptyStats,
      uniqueMoviesWatched: 5,
      totalViewings: 6,
      activeDays: 7,
      watchedMinutes: 600,
      currentStreak: 2,
      longestStreak: 3,
      averageRating: 8.5
    };
    const achievements = calculateAchievements(stats, 3);
    expect(achievements.filter((achievement) => achievement.unlocked).map((achievement) => achievement.id)).toEqual([
      "first-movie",
      "five-movies",
      "five-viewings",
      "three-day-streak",
      "seven-active-days",
      "ten-hours",
      "three-collections"
    ]);
  });

  it("unlocks the extended milestones only after reaching each threshold", () => {
    const stats: PersonalStats = {
      ...emptyStats,
      uniqueMoviesWatched: 20,
      totalViewings: 20,
      activeDays: 30,
      watchedMinutes: 3_000,
      longestStreak: 7
    };
    const achievements = calculateAchievements(stats, 5);
    expect(achievements.every((achievement) => achievement.unlocked)).toBe(true);
  });

  it("clamps negative progress and does not unlock below a target", () => {
    const stats = { ...emptyStats, uniqueMoviesWatched: -2 };
    const first = calculateAchievements(stats, 0)[0];
    expect(first.progress).toBe(0);
    expect(first.unlocked).toBe(false);
  });
});
