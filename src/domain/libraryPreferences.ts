import { z } from "zod";
import type { LibraryBrowsePreferences, LibrarySort } from "./types";

export const DEFAULT_LIBRARY_FILTERS: LibraryBrowsePreferences = {
  status: "all",
  releaseStatus: "all",
  query: "",
  genre: "",
  yearFrom: "",
  yearTo: "",
  runtimeMin: "",
  runtimeMax: "",
  myRatingMin: "",
  myRatingMax: "",
  sort: "added",
  sortDirection: "desc",
  shuffleSeed: 1
};

const yearPreference = z.string()
  .refine((value) => value === "" || (
    /^\d{4}$/.test(value) && Number(value) >= 1880 && Number(value) <= 3000
  ))
  .catch("");

const runtimePreference = z.string()
  .refine((value) => value === "" || (/^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= 600))
  .catch("");
const ratingPreference = z.string()
  .refine((value) => value === "" || (/^\d{1,2}(?:\.\d)?$/.test(value) && Number(value) >= 1 && Number(value) <= 10))
  .catch("");

const libraryFiltersSchema = z.object({
  status: z.enum(["all", "watched", "pending", "favorites"]).catch("all"),
  releaseStatus: z.enum(["all", "upcoming", "released"]).catch("all"),
  query: z.string().max(200).catch(""),
  genre: z.string().max(100).catch(""),
  yearFrom: yearPreference,
  yearTo: yearPreference,
  runtimeMin: runtimePreference,
  runtimeMax: runtimePreference,
  myRatingMin: ratingPreference,
  myRatingMax: ratingPreference,
  sort: z.enum(["title", "rating", "my-rating", "runtime", "release-date", "added", "random",
    "added-desc", "title-asc", "year-desc", "year-asc"]).catch("added"),
  sortDirection: z.enum(["asc", "desc"]).catch("desc"),
  shuffleSeed: z.number().int().nonnegative().catch(1)
});

const LEGACY_SORT: Record<string, { sort: LibrarySort; direction: "asc" | "desc" }> = {
  "added-desc": { sort: "added", direction: "desc" },
  "title-asc": { sort: "title", direction: "asc" },
  "year-desc": { sort: "release-date", direction: "desc" },
  "year-asc": { sort: "release-date", direction: "asc" }
};

export const DEFAULT_SORT_DIRECTION: Record<LibrarySort, "asc" | "desc"> = {
  title: "asc",
  rating: "desc",
  "my-rating": "desc",
  runtime: "asc",
  "release-date": "desc",
  added: "desc",
  random: "desc"
};

export function normalizeLibraryFilters(value: unknown): LibraryBrowsePreferences {
  const parsed = libraryFiltersSchema.safeParse(value);
  if (!parsed.success) return { ...DEFAULT_LIBRARY_FILTERS };

  const filters = parsed.data;
  const legacy = LEGACY_SORT[filters.sort];
  const normalized: LibraryBrowsePreferences = {
    ...filters,
    sort: legacy?.sort ?? filters.sort as LibrarySort,
    sortDirection: legacy?.direction ?? filters.sortDirection
  };

  if (normalized.yearFrom && normalized.yearTo && Number(normalized.yearFrom) > Number(normalized.yearTo)) {
    normalized.yearFrom = "";
    normalized.yearTo = "";
  }
  if (normalized.runtimeMin && normalized.runtimeMax && Number(normalized.runtimeMin) > Number(normalized.runtimeMax)) {
    normalized.runtimeMin = "";
    normalized.runtimeMax = "";
  }
  if (normalized.myRatingMin && normalized.myRatingMax && Number(normalized.myRatingMin) > Number(normalized.myRatingMax)) {
    normalized.myRatingMin = "";
    normalized.myRatingMax = "";
  }

  return normalized;
}

/**
 * Seleccionar otra opción aplica su dirección predeterminada.
 * Volver a pulsar la opción activa invierte la dirección; Aleatorio
 * genera una nueva semilla para obtener otra permutación.
 */
export function selectLibrarySort(
  current: LibraryBrowsePreferences,
  sort: LibrarySort,
  nextShuffleSeed: number
): LibraryBrowsePreferences {
  if (current.sort === sort) {
    if (sort === "random") {
      return { ...current, shuffleSeed: normalizeShuffleSeed(nextShuffleSeed) };
    }
    return {
      ...current,
      sortDirection: current.sortDirection === "asc" ? "desc" : "asc"
    };
  }

  return {
    ...current,
    sort,
    sortDirection: DEFAULT_SORT_DIRECTION[sort],
    shuffleSeed: sort === "random"
      ? normalizeShuffleSeed(nextShuffleSeed)
      : current.shuffleSeed
  };
}

function normalizeShuffleSeed(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) return 1;
  return value >>> 0;
}
