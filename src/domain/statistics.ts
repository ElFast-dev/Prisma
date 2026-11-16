import type { MovieRecord, Viewing } from "./types";

export interface StreakStats {
  current: number;
  longest: number;
  activeDays: number;
}

export interface StatisticsHighlight {
  label: string;
  count: number;
  percentage: number;
}

export interface MonthlyActivity {
  key: string;
  label: string;
  viewings: number;
  uniqueMovies: number;
}

export interface PersonalStats {
  uniqueMoviesWatched: number;
  totalViewings: number;
  additionalViewings: number;
  activeDays: number;
  watchedMinutes: number;
  currentStreak: number;
  longestStreak: number;
  averageRating: number | null;
  genreHighlights: StatisticsHighlight[];
  decadeHighlights: StatisticsHighlight[];
  recentActivity: MonthlyActivity[];
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

function rankHighlights(counts: Map<string, number>): StatisticsHighlight[] {
  const ranked = [...counts.entries()].sort((a, b) =>
    b[1] - a[1] || a[0].localeCompare(b[0], "es")
  );
  const highest = ranked[0]?.[1] ?? 0;

  return ranked.slice(0, 4).map(([label, count]) => ({
    label,
    count,
    percentage: highest > 0 ? Math.round((count / highest) * 100) : 0
  }));
}

function buildGenreHighlights(
  watchedMovieIds: Set<string>,
  movieById: Map<string, MovieRecord>
): StatisticsHighlight[] {
  const counts = new Map<string, number>();

  for (const movieId of watchedMovieIds) {
    const movie = movieById.get(movieId);
    if (!movie) continue;

    const genres = new Map<string, string>();
    for (const rawGenre of movie.genres) {
      const label = rawGenre.trim();
      if (!label) continue;
      const key = label.toLocaleLowerCase("es");
      if (!genres.has(key)) genres.set(key, label);
    }

    for (const label of genres.values()) {
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  return rankHighlights(counts);
}

function buildDecadeHighlights(
  watchedMovieIds: Set<string>,
  movieById: Map<string, MovieRecord>
): StatisticsHighlight[] {
  const counts = new Map<string, number>();

  for (const movieId of watchedMovieIds) {
    const year = movieById.get(movieId)?.releaseYear;
    if (!Number.isInteger(year) || !year || year < 1888) continue;

    const decade = Math.floor(year / 10) * 10;
    const label = "Años " + decade;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return rankHighlights(counts);
}

function buildRecentActivity(viewings: Viewing[], today: string): MonthlyActivity[] {
  const [year, month] = today.split("-").map(Number);
  const buckets: MonthlyActivity[] = [];

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, month - 1 - offset, 1));
    const key = date.getUTCFullYear() + "-" + String(date.getUTCMonth() + 1).padStart(2, "0");
    const label = new Intl.DateTimeFormat("es", {
      month: "short",
      timeZone: "UTC"
    }).format(date).replace(/\.$/, "");

    buckets.push({ key, label, viewings: 0, uniqueMovies: 0 });
  }

  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  const moviesByMonth = new Map<string, Set<string>>();

  for (const viewing of viewings) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(viewing.watchedOn)) continue;
    const key = viewing.watchedOn.slice(0, 7);
    const bucket = bucketByKey.get(key);
    if (!bucket) continue;

    bucket.viewings += 1;
    const movieIds = moviesByMonth.get(key) ?? new Set<string>();
    movieIds.add(viewing.movieId);
    moviesByMonth.set(key, movieIds);
  }

  for (const bucket of buckets) {
    bucket.uniqueMovies = moviesByMonth.get(bucket.key)?.size ?? 0;
  }

  return buckets;
}

export function calculatePersonalStats(
  viewings: Viewing[],
  movies: MovieRecord[],
  today: string
): PersonalStats {
  const movieById = new Map(movies.map((movie) => [movie.id, movie]));
  const watchedMovieIds = new Set(viewings.map((viewing) => viewing.movieId));
  const uniqueMoviesWatched = watchedMovieIds.size;
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
    additionalViewings: Math.max(0, viewings.length - uniqueMoviesWatched),
    activeDays: streaks.activeDays,
    watchedMinutes,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    averageRating,
    genreHighlights: buildGenreHighlights(watchedMovieIds, movieById),
    decadeHighlights: buildDecadeHighlights(watchedMovieIds, movieById),
    recentActivity: buildRecentActivity(viewings, today)
  };
}
