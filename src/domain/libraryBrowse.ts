import type { LibraryBrowsePreferences, LibraryEntry, MovieRecord } from "./types";

export type LibraryStatusFilter = LibraryBrowsePreferences["status"];
export type LibrarySort = LibraryBrowsePreferences["sort"];
export type LibraryBrowseOptions = LibraryBrowsePreferences;

export interface LibraryBrowseItem {
  movie: MovieRecord;
  entry: LibraryEntry;
}

export interface LibraryFacets {
  genres: string[];
  years: number[];
}

function normalizeSearchText(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function compareTitles(left: LibraryBrowseItem, right: LibraryBrowseItem): number {
  return left.movie.title.localeCompare(right.movie.title, "es", {
    sensitivity: "base",
    numeric: true
  });
}

function compareReleaseYears(
  left: LibraryBrowseItem,
  right: LibraryBrowseItem,
  direction: "asc" | "desc"
): number {
  const leftYear = left.movie.releaseYear;
  const rightYear = right.movie.releaseYear;

  if (leftYear === undefined && rightYear === undefined) return compareTitles(left, right);
  if (leftYear === undefined) return 1;
  if (rightYear === undefined) return -1;

  const yearDifference = direction === "desc"
    ? rightYear - leftYear
    : leftYear - rightYear;

  return yearDifference || compareTitles(left, right);
}

export function filterLibraryItems(
  items: readonly LibraryBrowseItem[],
  options: LibraryBrowseOptions
): LibraryBrowseItem[] {
  const query = normalizeSearchText(options.query.trim());
  const selectedGenre = normalizeSearchText(options.genre);
  const minimumYear = options.yearFrom ? Number(options.yearFrom) : undefined;
  const maximumYear = options.yearTo ? Number(options.yearTo) : undefined;

  const filtered = items.filter(({ movie, entry }) => {
    const matchesStatus = options.status === "all"
      || (options.status === "favorites" ? entry.isFavorite : entry.status === options.status);
    if (!matchesStatus) return false;

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

    if (minimumYear !== undefined && (movie.releaseYear === undefined || movie.releaseYear < minimumYear)) {
      return false;
    }
    if (maximumYear !== undefined && (movie.releaseYear === undefined || movie.releaseYear > maximumYear)) {
      return false;
    }
    return true;
  });

  return filtered.sort((left, right) => {
    switch (options.sort) {
      case "title-asc":
        return compareTitles(left, right);
      case "year-desc":
        return compareReleaseYears(left, right, "desc");
      case "year-asc":
        return compareReleaseYears(left, right, "asc");
      case "added-desc":
      default:
        return right.entry.addedAt.localeCompare(left.entry.addedAt) || compareTitles(left, right);
    }
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
