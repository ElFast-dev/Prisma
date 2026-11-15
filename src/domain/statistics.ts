import type { MovieRecord, Viewing } from "./types";

export interface StreakStats {
  current: number;
  longest: number;
  activeDays: number;
}

export interface PersonalStats {
  uniqueMoviesWatched: number;
  totalViewings: number;
  activeDays: number;
  watchedMinutes: number;
  currentStreak: number;
  longestStreak: number;
  averageRating: number | null;
}

function dayOrdinal(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function calculateStreaks(watchedDates: string[], today: string): StreakStats {
  const dates = [...new Set(watchedDates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)))];
  if (dates.length === 0) return { current: 0, longest: 0, activeDays: 0 };

  const ordinals = [...new Set(dates.map(dayOrdinal))].sort((a, b) => a - b);
  let longest = 1;
  let run = 1;

  for (let index = 1; index < ordinals.length; index += 1) {
    if (ordinals[index] === ordinals[index - 1] + 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const todayOrdinal = dayOrdinal(today);
  let current = 0;
  let cursor = ordinals[ordinals.length - 1];

  if (cursor === todayOrdinal || cursor === todayOrdinal - 1) {
    current = 1;
    for (let index = ordinals.length - 2; index >= 0; index -= 1) {
      if (ordinals[index] === cursor - 1) {
        current += 1;
        cursor = ordinals[index];
      } else {
        break;
      }
    }
  }

  return { current, longest, activeDays: ordinals.length };
}

export function calculatePersonalStats(
  viewings: Viewing[],
  movies: MovieRecord[],
  today: string
): PersonalStats {
  const movieById = new Map(movies.map((movie) => [movie.id, movie]));
  const uniqueMoviesWatched = new Set(viewings.map((viewing) => viewing.movieId)).size;
  const watchedMinutes = viewings.reduce((total, viewing) => {
    return total + (movieById.get(viewing.movieId)?.runtimeMinutes ?? 0);
  }, 0);
  const ratings = viewings.map((viewing) => viewing.rating);
  const averageRating = ratings.length
    ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 100) / 100
    : null;
  const streaks = calculateStreaks(viewings.map((viewing) => viewing.watchedOn), today);

  return {
    uniqueMoviesWatched,
    totalViewings: viewings.length,
    activeDays: streaks.activeDays,
    watchedMinutes,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    averageRating
  };
}
