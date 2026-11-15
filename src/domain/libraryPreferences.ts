import { z } from "zod";
import type { LibraryBrowsePreferences } from "./types";

export const DEFAULT_LIBRARY_FILTERS: LibraryBrowsePreferences = {
  status: "all",
  query: "",
  genre: "",
  yearFrom: "",
  yearTo: "",
  sort: "added-desc"
};

const yearPreference = z.string()
  .refine((value) => value === "" || (
    /^\d{4}$/.test(value) && Number(value) >= 1880 && Number(value) <= 3000
  ))
  .catch("");

const libraryFiltersSchema = z.object({
  status: z.enum(["all", "watched", "pending", "favorites"]).catch("all"),
  query: z.string().max(200).catch(""),
  genre: z.string().max(100).catch(""),
  yearFrom: yearPreference,
  yearTo: yearPreference,
  sort: z.enum(["added-desc", "title-asc", "year-desc", "year-asc"]).catch("added-desc")
});

export function normalizeLibraryFilters(value: unknown): LibraryBrowsePreferences {
  const parsed = libraryFiltersSchema.safeParse(value);
  if (!parsed.success) return { ...DEFAULT_LIBRARY_FILTERS };

  const filters = parsed.data;
  if (filters.yearFrom && filters.yearTo && Number(filters.yearFrom) > Number(filters.yearTo)) {
    return { ...filters, yearFrom: "", yearTo: "" };
  }

  return filters;
}
