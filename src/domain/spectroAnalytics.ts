import type {
  Collection,
  CollectionMovie,
  LibraryEntry,
  MovieRecord,
  Viewing
} from "./types";

export interface SpectroAnalyticsInput {
  movies: MovieRecord[];
  viewings: Viewing[];
  libraryEntries: LibraryEntry[];
  collections: Collection[];
  collectionMovies: CollectionMovie[];
}

export interface SpectroMonthlyPoint {
  key: string;
  label: string;
  viewings: number;
  uniqueMovies: number;
  ratedViewings: number;
  averageRating: number | null;
}

export interface SpectroCategoryPoint {
  label: string;
  count: number;
  percentage: number;
}

export interface SpectroRatingPoint {
  rating: number;
  count: number;
  percentage: number;
}

export interface SpectroRewatchTitle {
  movieId: string;
  title: string;
  viewings: number;
  averageRating: number | null;
  firstRating: number | null;
  latestRating: number | null;
}

export interface SpectroCollectionPoint {
  id: string;
  name: string;
  movieCount: number;
}

export interface SpectroAnalytics {
  summary: {
    totalViewings: number;
    uniqueMoviesWatched: number;
    ratedMovies: number;
    unratedViewings: number;
    averageMovieRating: number | null;
    activeDays: number;
    estimatedMinutes: number;
    viewingsWithoutRuntime: number;
    additionalViewings: number;
    moviesWithRewatches: number;
    favorites: number;
    pending: number;
    notesWritten: number;
  };
  monthly: SpectroMonthlyPoint[];
  weekdays: SpectroCategoryPoint[];
  hourHeatmap: number[][];
  timedViewings: number;
  ratingDistribution: SpectroRatingPoint[];
  topRatedMovies: SpectroRewatchTitle[];
  lowestRatedMovies: SpectroRewatchTitle[];
  genreCounts: SpectroCategoryPoint[];
  decadeCounts: SpectroCategoryPoint[];
  countryCounts: SpectroCategoryPoint[];
  languageCounts: SpectroCategoryPoint[];
  directorCounts: SpectroCategoryPoint[];
  castCounts: SpectroCategoryPoint[];
  themeCounts: SpectroCategoryPoint[];
  runtimeCounts: SpectroCategoryPoint[];
  rewatchTitles: SpectroRewatchTitle[];
  averageRewatchChange: number | null;
  libraryBreakdown: SpectroCategoryPoint[];
  favoriteGenreCounts: SpectroCategoryPoint[];
  collectionCounts: SpectroCollectionPoint[];
  coverage: {
    viewedMovies: number;
    withGenres: number;
    withCountries: number;
    withDirectors: number;
    withReleaseYear: number;
    withRuntime: number;
    withLanguage: number;
    withKeywords: number;
    ratedViewings: number;
    unratedViewings: number;
    viewingsWithNotes: number;
    timedViewings: number;
  };
}

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function dateOrdinal(value: string): number {
  const [year, month, day] = value.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function uniqueLabels(values: string[] | undefined): string[] {
  const labels = new Map<string, string>();
  for (const raw of values ?? []) {
    const label = raw.trim().replace(/\s+/g, " ");
    if (!label) continue;
    const key = label.toLocaleLowerCase("es");
    if (!labels.has(key)) labels.set(key, label);
  }
  return [...labels.values()];
}

function languageLabel(code?: string): string[] {
  const value = code?.trim().toLocaleLowerCase();
  if (!value || !/^[a-z]{2,3}$/.test(value)) return [];
  try {
    return [new Intl.DisplayNames(["es"], { type: "language" }).of(value) ?? value.toUpperCase()];
  } catch {
    return [value.toUpperCase()];
  }
}

function categoryPoints(counts: Map<string, Set<string>>, denominator: number): SpectroCategoryPoint[] {
  return [...counts.entries()]
    .map(([label, ids]) => ({
      label,
      count: ids.size,
      percentage: denominator ? Math.round((ids.size / denominator) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "es"))
    .slice(0, 12);
}

function buildCategories(
  viewedMovies: MovieRecord[],
  selector: (movie: MovieRecord) => string[]
): SpectroCategoryPoint[] {
  const counts = new Map<string, Set<string>>();
  for (const movie of viewedMovies) {
    for (const label of selector(movie)) {
      const key = label.toLocaleLowerCase("es");
      const ids = counts.get(key) ?? new Set<string>();
      ids.add(movie.id);
      counts.set(key, ids);
    }
  }
  return categoryPoints(counts, viewedMovies.length);
}

function buildMonthly(viewings: Viewing[]): SpectroMonthlyPoint[] {
  const buckets = new Map<string, {
    viewings: number;
    movies: Set<string>;
    ratings: number[];
  }>();

  for (const viewing of viewings) {
    if (!validDate(viewing.watchedOn)) continue;
    const key = viewing.watchedOn.slice(0, 7);
    const bucket = buckets.get(key) ?? { viewings: 0, movies: new Set<string>(), ratings: [] };
    bucket.viewings += 1;
    bucket.movies.add(viewing.movieId);
    if (viewing.rating !== undefined) bucket.ratings.push(viewing.rating);
    buckets.set(key, bucket);
  }

  const keys = [...buckets.keys()].sort();
  if (!keys.length) return [];
  const [firstYear, firstMonth] = keys[0].split("-").map(Number);
  const [lastYear, lastMonth] = keys[keys.length - 1].split("-").map(Number);
  const firstIndex = firstYear * 12 + firstMonth - 1;
  const lastIndex = lastYear * 12 + lastMonth - 1;
  const result: SpectroMonthlyPoint[] = [];

  for (let index = firstIndex; index <= lastIndex; index += 1) {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    const key = year + "-" + String(month).padStart(2, "0");
    const bucket = buckets.get(key);
    const date = new Date(Date.UTC(year, month - 1, 1));
    const label = new Intl.DateTimeFormat("es-PA", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC"
    }).format(date).replace(/\.$/, "");

    result.push({
      key,
      label,
      viewings: bucket?.viewings ?? 0,
      uniqueMovies: bucket?.movies.size ?? 0,
      ratedViewings: bucket?.ratings.length ?? 0,
      averageRating: bucket ? mean(bucket.ratings) : null
    });
  }

  return result;
}

function buildRatingDistribution(viewings: Viewing[]): SpectroRatingPoint[] {
  const ratings = viewings.flatMap((viewing) => (
    viewing.rating === undefined ? [] : [viewing.rating]
  ));
  return Array.from({ length: 10 }, (_, index) => {
    const rating = index + 1;
    const count = ratings.filter((value) => value === rating).length;
    return {
      rating,
      count,
      percentage: ratings.length ? Math.round((count / ratings.length) * 1000) / 10 : 0
    };
  });
}

function buildWeekdays(viewings: Viewing[]): SpectroCategoryPoint[] {
  const counts = WEEKDAYS.map((label) => ({ label, count: 0, percentage: 0 }));
  for (const viewing of viewings) {
    if (!validDate(viewing.watchedOn)) continue;
    const [year, month, day] = viewing.watchedOn.split("-").map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    counts[weekday].count += 1;
  }
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  return counts.map((item) => ({
    ...item,
    percentage: total ? Math.round((item.count / total) * 1000) / 10 : 0
  }));
}

function buildHourHeatmap(viewings: Viewing[]): { cells: number[][]; count: number } {
  const cells = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  let count = 0;
  for (const viewing of viewings) {
    if (!validDate(viewing.watchedOn) || !viewing.watchedAtLocalTime) continue;
    const match = /^([01]\d|2[0-3]):[0-5]\d$/.exec(viewing.watchedAtLocalTime);
    if (!match) continue;
    const [year, month, day] = viewing.watchedOn.split("-").map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    const hour = Number(match[1]);
    cells[weekday][hour] += 1;
    count += 1;
  }
  return { cells, count };
}

function titleRatings(viewings: Viewing[], movieById: Map<string, MovieRecord>): SpectroRewatchTitle[] {
  const grouped = new Map<string, Viewing[]>();
  for (const viewing of viewings) {
    const current = grouped.get(viewing.movieId) ?? [];
    current.push(viewing);
    grouped.set(viewing.movieId, current);
  }

  return [...grouped.entries()].flatMap(([movieId, entries]) => {
    const movie = movieById.get(movieId);
    const rated = entries
      .filter((entry) => entry.rating !== undefined)
      .sort((a, b) => (
        a.watchedOn.localeCompare(b.watchedOn)
        || a.sequenceNumber - b.sequenceNumber
      ));
    if (!movie) return [];
    return [{
      movieId,
      title: movie.title,
      viewings: entries.length,
      averageRating: mean(rated.map((entry) => entry.rating as number)),
      firstRating: rated[0]?.rating ?? null,
      latestRating: rated[rated.length - 1]?.rating ?? null
    }];
  });
}

function buildRuntimeCounts(movies: MovieRecord[]): SpectroCategoryPoint[] {
  const buckets = [
    { label: "Hasta 90 min", min: 1, max: 90, count: 0 },
    { label: "91–120 min", min: 91, max: 120, count: 0 },
    { label: "121–150 min", min: 121, max: 150, count: 0 },
    { label: "Más de 150 min", min: 151, max: Number.POSITIVE_INFINITY, count: 0 }
  ];
  for (const movie of movies) {
    const runtime = movie.runtimeMinutes;
    if (!Number.isFinite(runtime) || !runtime || runtime < 1) continue;
    const bucket = buckets.find((item) => runtime >= item.min && runtime <= item.max);
    if (bucket) bucket.count += 1;
  }
  const total = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  return buckets.map(({ label, count }) => ({
    label,
    count,
    percentage: total ? Math.round((count / total) * 1000) / 10 : 0
  }));
}

export function calculateSpectroAnalytics(input: SpectroAnalyticsInput): SpectroAnalytics {
  const movieById = new Map(input.movies.map((movie) => [movie.id, movie]));
  const viewedIds = new Set(input.viewings.map((viewing) => viewing.movieId));
  const viewedMovies = [...viewedIds].flatMap((id) => {
    const movie = movieById.get(id);
    return movie ? [movie] : [];
  });
  const titleRatingsList = titleRatings(input.viewings, movieById);
  const ratedMovies = titleRatingsList.filter((item) => item.averageRating !== null);
  const averageMovieRating = mean(ratedMovies.flatMap((item) => (
    item.averageRating === null ? [] : [item.averageRating]
  )));
  const validDates = input.viewings.map((viewing) => viewing.watchedOn).filter(validDate);
  const activeDays = new Set(validDates).size;
  const viewingsWithRuntime = input.viewings.filter((viewing) => {
    const runtime = movieById.get(viewing.movieId)?.runtimeMinutes;
    return Number.isFinite(runtime) && Boolean(runtime) && (runtime ?? 0) > 0;
  });
  const estimatedMinutes = viewingsWithRuntime.reduce((sum, viewing) => (
    sum + (movieById.get(viewing.movieId)?.runtimeMinutes ?? 0)
  ), 0);
  const weekdays = buildWeekdays(input.viewings);
  const hourHeatmap = buildHourHeatmap(input.viewings);
  const favoriteIds = new Set(input.libraryEntries.filter((entry) => entry.isFavorite).map((entry) => entry.movieId));
  const favoriteMovies = [...favoriteIds].flatMap((id) => {
    const movie = movieById.get(id);
    return movie ? [movie] : [];
  });
  const pendingIds = new Set(input.libraryEntries
    .filter((entry) => entry.status === "pending" && !viewedIds.has(entry.movieId))
    .map((entry) => entry.movieId));
  const classifiedIds = new Set([...viewedIds, ...pendingIds]);
  const otherCatalogCount = input.movies.filter((movie) => !classifiedIds.has(movie.id)).length;
  const libraryBreakdownRaw = [
    { label: "Vistas", count: viewedIds.size },
    { label: "Pendientes", count: pendingIds.size },
    { label: "Otras del catálogo", count: otherCatalogCount }
  ];
  const libraryTotal = libraryBreakdownRaw.reduce((sum, item) => sum + item.count, 0);
  const libraryBreakdown = libraryBreakdownRaw.map((item) => ({
    ...item,
    percentage: libraryTotal ? Math.round((item.count / libraryTotal) * 1000) / 10 : 0
  }));
  const collectionCounts = input.collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    movieCount: new Set(input.collectionMovies
      .filter((entry) => entry.collectionId === collection.id)
      .map((entry) => entry.movieId)).size
  })).sort((a, b) => b.movieCount - a.movieCount || a.name.localeCompare(b.name, "es"));
  const rewatchTitles = titleRatingsList
    .filter((item) => item.viewings > 1)
    .sort((a, b) => b.viewings - a.viewings || a.title.localeCompare(b.title, "es"));
  const rewatchChanges = rewatchTitles.flatMap((item) => (
    item.firstRating !== null && item.latestRating !== null
      ? [item.latestRating - item.firstRating]
      : []
  ));
  const topRatedMovies = [...titleRatingsList]
    .filter((item) => item.averageRating !== null)
    .sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0) || a.title.localeCompare(b.title, "es"))
    .slice(0, 8);
  const lowestRatedMovies = [...titleRatingsList]
    .filter((item) => item.averageRating !== null)
    .sort((a, b) => (a.averageRating ?? 0) - (b.averageRating ?? 0) || a.title.localeCompare(b.title, "es"))
    .slice(0, 8);
  const genreCounts = buildCategories(viewedMovies, (movie) => uniqueLabels(movie.genres));
  const decadeCounts = buildCategories(viewedMovies, (movie) => (
    Number.isInteger(movie.releaseYear) && movie.releaseYear && movie.releaseYear >= 1888
      ? [String(Math.floor(movie.releaseYear / 10) * 10) + "s"]
      : []
  ));
  const countryCounts = buildCategories(viewedMovies, (movie) => uniqueLabels(movie.countries));
  const languageCounts = buildCategories(viewedMovies, (movie) => languageLabel(movie.originalLanguage));
  const directorCounts = buildCategories(viewedMovies, (movie) => uniqueLabels(movie.directors));
  const castCounts = buildCategories(viewedMovies, (movie) => uniqueLabels(movie.castMembers).slice(0, 12));
  const themeCounts = buildCategories(viewedMovies, (movie) => uniqueLabels(movie.keywords));
  const favoriteGenreCounts = buildCategories(favoriteMovies, (movie) => uniqueLabels(movie.genres));
  const runtimeCounts = buildRuntimeCounts(viewedMovies);
  const ratedCount = input.viewings.filter((viewing) => viewing.rating !== undefined).length;
  const notesWritten = input.viewings.filter((viewing) => Boolean(viewing.review?.trim())).length;
  const timedViewings = hourHeatmap.count;

  return {
    summary: {
      totalViewings: input.viewings.length,
      uniqueMoviesWatched: viewedIds.size,
      ratedMovies: ratedMovies.length,
      unratedViewings: input.viewings.length - ratedCount,
      averageMovieRating,
      activeDays,
      estimatedMinutes,
      viewingsWithoutRuntime: input.viewings.length - viewingsWithRuntime.length,
      additionalViewings: Math.max(0, input.viewings.length - viewedIds.size),
      moviesWithRewatches: rewatchTitles.length,
      favorites: favoriteIds.size,
      pending: pendingIds.size,
      notesWritten
    },
    monthly: buildMonthly(input.viewings),
    weekdays,
    hourHeatmap: hourHeatmap.cells,
    timedViewings,
    ratingDistribution: buildRatingDistribution(input.viewings),
    topRatedMovies,
    lowestRatedMovies,
    genreCounts,
    decadeCounts,
    countryCounts,
    languageCounts,
    directorCounts,
    castCounts,
    themeCounts,
    runtimeCounts,
    rewatchTitles: rewatchTitles.slice(0, 10),
    averageRewatchChange: mean(rewatchChanges),
    libraryBreakdown,
    favoriteGenreCounts,
    collectionCounts,
    coverage: {
      viewedMovies: viewedMovies.length,
      withGenres: viewedMovies.filter((movie) => movie.genres.length > 0).length,
      withCountries: viewedMovies.filter((movie) => movie.countries.length > 0).length,
      withDirectors: viewedMovies.filter((movie) => Boolean(movie.directors?.length)).length,
      withReleaseYear: viewedMovies.filter((movie) => Boolean(movie.releaseYear)).length,
      withRuntime: viewedMovies.filter((movie) => Boolean(movie.runtimeMinutes)).length,
      withLanguage: viewedMovies.filter((movie) => Boolean(movie.originalLanguage)).length,
      withKeywords: viewedMovies.filter((movie) => Boolean(movie.keywords?.length)).length,
      ratedViewings: ratedCount,
      unratedViewings: input.viewings.length - ratedCount,
      viewingsWithNotes: notesWritten,
      timedViewings
    }
  };
}
