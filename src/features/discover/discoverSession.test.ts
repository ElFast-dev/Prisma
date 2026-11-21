import { describe, expect, it } from "vitest";
import { DEFAULT_DISCOVER_FILTERS } from "../../domain/discoverFilters";
import type { TmdbMovieSummary } from "../../infrastructure/tmdb/TmdbService";
import { getDiscoverFeedKey, readDiscoverSession, writeDiscoverSession } from "./discoverSession";

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("Discover session", () => {
  it("reuses filtered catalog pages when only the local title search changes", () => {
    const filters = { ...DEFAULT_DISCOVER_FILTERS, genreId: "18" };
    expect(getDiscoverFeedKey("prisma", filters)).toBe(getDiscoverFeedKey("otra", filters));
    expect(getDiscoverFeedKey("prisma", DEFAULT_DISCOVER_FILTERS))
      .not.toBe(getDiscoverFeedKey("otra", DEFAULT_DISCOVER_FILTERS));
  });

  it("restores applied filters, search text, pagination and loaded titles", () => {
    const storage = new MemoryStorage();
    const movies: TmdbMovieSummary[] = [
      { id: 101, title: "Prisma: una historia", original_title: "Prisma Story", poster_path: "/prisma.jpg" },
      { id: 102, title: "Otra historia", poster_path: null }
    ];

    writeDiscoverSession({
      query: "prisma",
      appliedFilters: {
        ...DEFAULT_DISCOVER_FILTERS,
        genreId: "18",
        yearFrom: "2010",
        yearTo: "2024"
      },
      movies,
      page: 2,
      totalPages: 8,
      totalResults: 146,
      imageBase: "https://image.tmdb.org/t/p/",
      showingCachedData: true,
      cachedFetchedAt: "2026-11-21T10:00:00.000Z"
    }, storage);

    expect(readDiscoverSession(storage)).toEqual({
      query: "prisma",
      appliedFilters: {
        ...DEFAULT_DISCOVER_FILTERS,
        genreId: "18",
        yearFrom: "2010",
        yearTo: "2024"
      },
      movies,
      page: 2,
      totalPages: 8,
      totalResults: 146,
      imageBase: "https://image.tmdb.org/t/p/",
      showingCachedData: true,
      cachedFetchedAt: "2026-11-21T10:00:00.000Z"
    });
  });

  it("discards invalid movie entries and normalizes unsafe stored filters", () => {
    const storage = new MemoryStorage();
    storage.setItem("prisma:discover-session:v1", JSON.stringify({
      version: 1,
      query: "  cine  ",
      appliedFilters: { genreId: "no-existe", runtimeMin: "180", runtimeMax: "90" },
      movies: [{ id: -1, title: "Inválida" }, { id: 22, title: "Película válida" }, { id: 23 }],
      page: 0,
      totalPages: 0,
      totalResults: 0,
      imageBase: "javascript:alert(1)",
      showingCachedData: false
    }));

    const restored = readDiscoverSession(storage);
    expect(restored?.query).toBe("  cine  ");
    expect(restored?.appliedFilters.genreId).toBe("");
    expect(restored?.appliedFilters.runtimeMax).toBe("");
    expect(restored?.movies).toEqual([{ id: 22, title: "Película válida" }]);
    expect(restored?.page).toBe(1);
    expect(restored?.totalPages).toBe(1);
    expect(restored?.imageBase).toBe("https://image.tmdb.org/t/p/");
  });

  it("ignores malformed or unsupported session data", () => {
    const storage = new MemoryStorage();
    storage.setItem("prisma:discover-session:v1", "{no es json");
    expect(readDiscoverSession(storage)).toBeNull();

    storage.setItem("prisma:discover-session:v1", JSON.stringify({ version: 2 }));
    expect(readDiscoverSession(storage)).toBeNull();
  });
});
