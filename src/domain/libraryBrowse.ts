import type { LibraryBrowsePreferences, LibraryEntry, MovieRecord } from "./types";

export type LibraryStatusFilter = LibraryBrowsePreferences["status"];
export type LibrarySort = LibraryBrowsePreferences["sort"];
export type LibraryBrowseOptions = LibraryBrowsePreferences;
export type MovieReleaseStatus = "upcoming" | "released";

export interface LibraryBrowseItem {
  movie: MovieRecord;
  entry: LibraryEntry;
  /** Promedio de las calificaciones personales de todos sus visionados. */
  userRating?: number;
}

export interface LibraryFacets {
  genres: string[];
  years: number[];
}

const UPCOMING_TMDB_STATUSES = new Set(["Planned", "Rumored", "In Production", "Post Production"]);

function normalizeSearchText(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

export function getMovieReleaseStatus(
  movie: MovieRecord,
  today = new Date().toISOString().slice(0, 10)
): MovieReleaseStatus | null {
  const tmdbStatus = movie.status?.trim();

  if (tmdbStatus === "Canceled") return null;
  if (tmdbStatus === "Released") return "released";
  if (tmdbStatus && UPCOMING_TMDB_STATUSES.has(tmdbStatus)) return "upcoming";

  const releaseDate = movie.releaseDate;
  if (!releaseDate || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) return null;
  return releaseDate > today ? "upcoming" : "released";
}

function compareTitles(left: LibraryBrowseItem, right: LibraryBrowseItem): number {
  return left.movie.title.localeCompare(right.movie.title, "es", {
    sensitivity: "base",
    numeric: true
  });
}

function compareOptionalNumber(
  left: number | undefined,
  right: number | undefined,
  direction: "asc" | "desc"
): number {
  if (left === undefined && right === undefined) return 0;
  if (left === undefined) return 1;
  if (right === undefined) return -1;
  return (left - right) * (direction === "asc" ? 1 : -1);
}

function compareOptionalDate(
  left: string | undefined,
  right: string | undefined,
  direction: "asc" | "desc"
): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  const comparison = left.localeCompare(right);
  return direction === "asc" ? comparison : -comparison;
}

function createSeededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithSeed<T>(items: T[], seed: number): T[] {
  const result = [...items];
  const random = createSeededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function filterLibraryItems(
  items: readonly LibraryBrowseItem[],
  options: LibraryBrowseOptions,
  today = new Date().toISOString().slice(0, 10)
): LibraryBrowseItem[] {
  const query = normalizeSearchText(options.query.trim());
  const selectedGenre = normalizeSearchText(options.genre);

  const filtered = items.filter(({ movie, entry }) => {
    const matchesLibraryStatus = options.status === "all"
      || (options.status === "favorites" ? entry.isFavorite : entry.status === options.status);
    if (!matchesLibraryStatus) return false;

    if (options.releaseStatus !== "all"
      && getMovieReleaseStatus(movie, today) !== options.releaseStatus) return false;

    const searchableText = normalizeSearchText([
      movie.title,
      movie.originalTitle,
      movie.genres.join(" "),
      movie.directors?.join(" ")
    ].filter(Boolean).join(" "));
    if (query && !searchableText.includes(query)) return false;

    if (selectedGenre && !movie.genres.some((genre) => normalizeSearchText(genre) === selectedGenre)) {
      return false;
    }

    const minimumYear = options.yearFrom ? Number(options.yearFrom) : undefined;
    const maximumYear = options.yearTo ? Number(options.yearTo) : undefined;
    if (minimumYear !== undefined && (movie.releaseYear === undefined || movie.releaseYear < minimumYear)) {
      return false;
    }
    if (maximumYear !== undefined && (movie.releaseYear === undefined || movie.releaseYear > maximumYear)) {
      return false;
    }
    return true;
  });

  if (options.sort === "random") return shuffleWithSeed(filtered, options.shuffleSeed);

  const direction = options.sortDirection;
  return filtered.sort((left, right) => {
    let result = 0;
    switch (options.sort) {
      case "title":
        result = compareTitles(left, right) * (direction === "asc" ? 1 : -1);
        break;
      case "rating":
        result = compareOptionalNumber(
          left.movie.voteAverage && left.movie.voteAverage > 0 ? left.movie.voteAverage : undefined,
          right.movie.voteAverage && right.movie.voteAverage > 0 ? right.movie.voteAverage : undefined,
          direction
        );
        break;
      case "my-rating":
        result = compareOptionalNumber(left.userRating, right.userRating, direction);
        break;
      case "runtime":
        result = compareOptionalNumber(left.movie.runtimeMinutes, right.movie.runtimeMinutes, direction);
        break;
      case "release-date":
        result = compareOptionalDate(left.movie.releaseDate, right.movie.releaseDate, direction);
        break;
      case "added":
      default:
        result = direction === "asc"
          ? left.entry.addedAt.localeCompare(right.entry.addedAt)
          : right.entry.addedAt.localeCompare(left.entry.addedAt);
        break;
    }

    return result || compareTitles(left, right);
  });
}

export function getLibraryFacets(items: readonly LibraryBrowseItem[]): LibraryFacets {
  const genresByKey = new Map<string, string>();
  const years = new Set<number>();

  for (const { movie } of items) {
    for (const genre of movie.genres) {
      const label = genre.trim();
      const key = normalizeSearchText(label);
      if (key && !genresByKey.has(key)) genresByKey.set(key, label);
    }
    if (Number.isInteger(movie.releaseYear) && movie.releaseYear) {
      years.add(movie.releaseYear);
    }
  }

  return {
    genres: [...genresByKey.values()].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    years: [...years].sort((a, b) => b - a)
  };
}
