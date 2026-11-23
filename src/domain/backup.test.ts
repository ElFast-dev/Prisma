import { describe, expect, it } from "vitest";
import { parsePrismaBackup } from "./backup";

const validBackup = () => ({
  format: "prisma-local-backup",
  formatVersion: 1,
  exportedAt: "2026-11-15T00:00:00.000Z",
  catalogRegion: "PA",
  data: {
    movies: [{
      id: "tmdb-1", tmdbId: 1, title: "Película de prueba", genres: ["Drama"], countries: ["Japón"],
      keywords: ["memoria", "identidad"],
      lastViewingSequence: 1, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z"
    }],
    libraryEntries: [{
      movieId: "tmdb-1", status: "watched", isFavorite: false,
      addedAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z"
    }],
    viewings: [{
      id: "viewing-1", movieId: "tmdb-1", sequenceNumber: 1, watchedOn: "2026-11-01",
      rating: 9, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z",
      operationId: "operation-1"
    }],
    collections: [{ id: "collection-1", name: "Favoritas", createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z" }],
    collectionMovies: [{ id: "membership-1", collectionId: "collection-1", movieId: "tmdb-1", position: 0, addedAt: "2026-11-01T00:00:00.000Z" }],
    profile: [],
    preferences: []
  }
});

describe("parsePrismaBackup", () => {
  it("accepts a valid, referentially complete local backup", () => {
    const result = parsePrismaBackup(JSON.stringify(validBackup()));
    expect(result.formatVersion).toBe(1);
    expect(result.data.movies).toHaveLength(1);
    expect(result.data.movies[0].keywords).toEqual(["memoria", "identidad"]);
    expect(result.data.collectionMovies).toHaveLength(1);
  });

  it("accepts legacy personal filters without the new optional ranges", () => {
    const backup = validBackup();
    const legacyPreferences = {
      id: "local",
      theme: "dark",
      reducedMotion: false,
      language: "es",
      region: "PA",
      libraryView: "list",
      historyFilters: {
        query: "Alien",
        notes: "all",
        rating: "all",
        fromDate: "",
        toDate: ""
      },
      libraryFilters: {
        status: "all",
        releaseStatus: "all",
        query: "",
        genre: "",
        yearFrom: "",
        yearTo: "",
        sort: "added",
        sortDirection: "desc",
        shuffleSeed: 1
      },
      updatedAt: "2026-10-01T00:00:00.000Z"
    };
    backup.data.preferences = [legacyPreferences];
    const parsed = parsePrismaBackup(JSON.stringify(backup));
    expect(parsed.data.preferences[0].historyFilters?.ratingMin).toBeUndefined();
    expect(parsed.data.preferences[0].libraryFilters?.runtimeMin).toBeUndefined();
  });

  it("rejects unsupported formats and versions", () => {
    const backup = { ...validBackup(), formatVersion: 2 };
    expect(() => parsePrismaBackup(JSON.stringify(backup))).toThrow("no es una copia Prisma válida");
  });

  it("rejects relationships to missing movies", () => {
    const backup = validBackup();
    backup.data.viewings[0].movieId = "missing";
    expect(() => parsePrismaBackup(JSON.stringify(backup))).toThrow("sin su película correspondiente");
  });

  it("rejects private or unknown fields such as TMDB credentials", () => {
    const backup = validBackup() as ReturnType<typeof validBackup> & { tmdbAccessToken?: string };
    backup.tmdbAccessToken = "not-allowed";
    expect(() => parsePrismaBackup(JSON.stringify(backup))).toThrow("no es una copia Prisma válida");
  });

  it("rejects duplicate viewing sequence numbers for the same movie", () => {
    const backup = validBackup();
    backup.data.viewings.push({ ...backup.data.viewings[0], id: "viewing-2", operationId: "operation-2" });
    expect(() => parsePrismaBackup(JSON.stringify(backup))).toThrow("secuencias de visionado");
  });

  it("incluye preferencias de Historial y acepta preferencias antiguas", () => {
    const preferences = {
      id: "local",
      theme: "dark",
      reducedMotion: false,
      language: "es",
      region: "PA",
      libraryView: "list",
      historyBrowse: {
        viewMode: "calendar",
        sortOrder: "oldest",
        month: "2025-08",
        selectedDate: "2025-08-13"
      },
      historyFilters: {
        query: "Amélie",
        notes: "with-notes",
        rating: "9-10",
        fromDate: "2024-01-01",
        toDate: "2025-12-31"
      },
      updatedAt: "2026-11-15T00:00:00.000Z"
    };
    const backup = validBackup();
    const withHistory = { ...backup, data: { ...backup.data, preferences: [preferences] } };
    expect(parsePrismaBackup(JSON.stringify(withHistory)).data.preferences[0]).toMatchObject(preferences);

    const legacyPreferences = {
      id: "local",
      theme: "dark",
      reducedMotion: true,
      language: "es",
      region: "MX",
      libraryView: "grid",
      updatedAt: "2026-10-01T00:00:00.000Z"
    };
    const legacy = { ...backup, data: { ...backup.data, preferences: [legacyPreferences] } };
    expect(parsePrismaBackup(JSON.stringify(legacy)).data.preferences[0]).toMatchObject(legacyPreferences);
  });
});
