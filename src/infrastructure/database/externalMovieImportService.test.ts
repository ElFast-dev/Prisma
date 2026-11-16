import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExternalMovieImportPlan } from "../../domain/externalMovieImport";

const { database, state } = vi.hoisted(() => {
  const state = {
    movies: new Map<string, any>(),
    entries: new Map<string, any>(),
    viewings: [] as any[],
    preferences: new Map<string, any>(),
    snapshotsCleared: 0
  };
  const database = {
    transaction: async (...args: any[]) => args[args.length - 1](),
    movies: {
      toArray: async () => [...state.movies.values()],
      bulkPut: async (records: any[]) => {
        for (const record of records) state.movies.set(record.id, { ...record });
      }
    },
    libraryEntries: {
      toArray: async () => [...state.entries.values()],
      bulkPut: async (records: any[]) => {
        for (const record of records) state.entries.set(record.movieId, { ...record });
      }
    },
    viewings: {
      toArray: async () => [...state.viewings],
      bulkPut: async (records: any[]) => {
        for (const record of records) {
          const index = state.viewings.findIndex((item: any) => item.id === record.id);
          if (index >= 0) state.viewings[index] = { ...record };
          else state.viewings.push({ ...record });
        }
      }
    },
    preferences: {
      get: async (id: string) => state.preferences.get(id),
      update: async (id: string, changes: Record<string, unknown>) => {
        const current = state.preferences.get(id);
        if (!current) return 0;
        state.preferences.set(id, { ...current, ...changes });
        return 1;
      }
    },
    spectroSnapshots: {
      clear: async () => { state.snapshotsCleared += 1; }
    }
  };
  return { database, state };
});

vi.mock("./database", () => ({ prismaDb: database }));

import { importExternalMovies } from "./externalMovieImportService";

const sourceDate = "2025-11-05";

function plan(movies: ExternalMovieImportPlan["movies"]): ExternalMovieImportPlan {
  return {
    sourceCreatedAt: "2026-11-15T06:34:55.463Z",
    movies,
    summary: {
      watchedMovies: movies.filter((movie) => movie.status === "watched").length,
      pendingMovies: movies.filter((movie) => movie.status === "pending").length,
      matchedRatings: movies.filter((movie) => movie.rating !== undefined).length,
      orphanRatings: 0,
      skippedWithoutTmdb: 0,
      watchedWithoutRating: movies.filter((movie) => movie.status === "watched" && movie.rating === undefined).length
    }
  };
}

function watched(traktId: number, tmdbId: number, rating?: number, watchedOn = sourceDate) {
  return {
    traktId,
    tmdbId,
    title: "Película " + tmdbId,
    addedAt: "2025-11-06T00:22:23.302Z",
    status: "watched" as const,
    watchedOn,
    rating,
    ratingAt: rating === undefined ? undefined : "2026-11-15T06:33:31.920Z"
  };
}

function localMovie(tmdbId: number) {
  return {
    id: "tmdb-" + tmdbId,
    tmdbId,
    title: "Película " + tmdbId,
    genres: [],
    countries: [],
    lastViewingSequence: 1,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
  };
}

describe("external movie import reconciliation", () => {
  beforeEach(() => {
    state.movies.clear();
    state.entries.clear();
    state.viewings.length = 0;
    state.preferences.clear();
    state.snapshotsCleared = 0;
    state.preferences.set("local", {
      id: "local",
      theme: "dark",
      reducedMotion: false,
      language: "es",
      region: "PA",
      libraryView: "list",
      historyBrowse: {
        viewMode: "calendar",
        sortOrder: "oldest",
        month: "2026-11",
        selectedDate: "2026-11-01"
      },
      updatedAt: "2026-11-01T00:00:00.000Z"
    });
  });

  it("creates visible History entries for watched movies even without a rating", async () => {
    const result = await importExternalMovies(plan([
      watched(101, 1001),
      watched(102, 1002, 8),
      {
        traktId: 103,
        tmdbId: 1003,
        title: "Película pendiente",
        addedAt: "2025-11-08T08:22:00.252Z",
        status: "pending"
      }
    ]));

    expect(result.viewingsAdded).toBe(2);
    expect(state.viewings).toHaveLength(2);
    expect(state.viewings.find((item: any) => item.movieId === "tmdb-1001")).toMatchObject({
      watchedOn: sourceDate,
      rating: undefined,
      operationId: "external-import-trakt-101"
    });
    expect(state.viewings.find((item: any) => item.movieId === "tmdb-1002")).toMatchObject({ rating: 8 });
    expect(state.entries.get("tmdb-1001").status).toBe("watched");
    expect(state.entries.get("tmdb-1003").status).toBe("pending");
    expect(state.viewings.some((item: any) => item.movieId === "tmdb-1003")).toBe(false);
  });

  it("abre Historial en cronología después de importar experiencias antiguas", async () => {
    await importExternalMovies(plan([watched(151, 1501)]), "external");
    expect(state.preferences.get("local").historyBrowse).toMatchObject({
      viewMode: "timeline",
      sortOrder: "oldest",
      selectedDate: null,
      month: "2025-11"
    });
  });

  it("is idempotent and updates the same imported experience on a later import", async () => {
    await importExternalMovies(plan([watched(201, 2001, 7)]));
    const first = state.viewings[0];
    const changedPlan = plan([watched(201, 2001, 9, "2025-11-08")]);

    const result = await importExternalMovies(changedPlan);

    expect(result.viewingsAdded).toBe(0);
    expect(result.updatedImportedViewings).toBe(1);
    expect(result.correctedImportedDates).toBe(1);
    expect(state.viewings).toHaveLength(1);
    expect(state.viewings[0]).toMatchObject({
      id: first.id,
      sequenceNumber: 1,
      watchedOn: "2025-11-08",
      rating: 9,
      operationId: "external-import-trakt-201"
    });
  });

  it("keeps the local classification and rating when Prisma has priority", async () => {
    state.movies.set("tmdb-3001", localMovie(3001));
    state.entries.set("tmdb-3001", {
      movieId: "tmdb-3001", status: "pending", isFavorite: true,
      addedAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z"
    });
    state.viewings.push({
      id: "local-viewing-1", movieId: "tmdb-3001", sequenceNumber: 1,
      watchedOn: sourceDate, rating: 5, createdAt: "2025-11-05T20:00:00.000Z",
      updatedAt: "2025-11-05T20:00:00.000Z", operationId: "manual-operation-1"
    });

    const result = await importExternalMovies(plan([watched(301, 3001, 9)]), "local");

    expect(result.matchedExistingViewings).toBe(1);
    expect(result.viewingsAdded).toBe(0);
    expect(state.entries.get("tmdb-3001").status).toBe("pending");
    expect(state.entries.get("tmdb-3001").isFavorite).toBe(true);
    expect(state.viewings).toHaveLength(1);
    expect(state.viewings[0].rating).toBe(5);
    expect(state.viewings[0].operationId).toBe("external-import-trakt-301");
  });

  it("lets the external file win for the classification and rating when requested", async () => {
    state.movies.set("tmdb-4001", localMovie(4001));
    state.entries.set("tmdb-4001", {
      movieId: "tmdb-4001", status: "pending", isFavorite: true,
      addedAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z"
    });
    state.viewings.push({
      id: "local-viewing-1", movieId: "tmdb-4001", sequenceNumber: 1,
      watchedOn: sourceDate, rating: 5, review: "Comentario personal",
      createdAt: "2025-11-05T20:00:00.000Z",
      updatedAt: "2025-11-05T20:00:00.000Z", operationId: "manual-operation-1"
    });

    const result = await importExternalMovies(plan([watched(401, 4001, 9)]), "external");

    expect(result.matchedExistingViewings).toBe(1);
    expect(result.viewingsAdded).toBe(0);
    expect(state.entries.get("tmdb-4001")).toMatchObject({ status: "watched", isFavorite: true });
    expect(state.viewings).toHaveLength(1);
    expect(state.viewings[0]).toMatchObject({
      rating: 9,
      review: "Comentario personal",
      operationId: "external-import-trakt-401"
    });
  });

  it("appends a different-date imported experience without replacing a manual viewing", async () => {
    state.movies.set("tmdb-5001", localMovie(5001));
    state.entries.set("tmdb-5001", {
      movieId: "tmdb-5001", status: "watched", isFavorite: false,
      addedAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z"
    });
    state.viewings.push({
      id: "local-viewing-1", movieId: "tmdb-5001", sequenceNumber: 1,
      watchedOn: "2024-01-01", rating: 8, review: "No borrar",
      createdAt: "2024-01-01T20:00:00.000Z", updatedAt: "2024-01-01T20:00:00.000Z",
      operationId: "manual-operation-1"
    });

    const result = await importExternalMovies(plan([watched(501, 5001, 7)]), "external");

    expect(result.viewingsAdded).toBe(1);
    expect(state.viewings).toHaveLength(2);
    expect(state.viewings.find((item: any) => item.id === "local-viewing-1").review).toBe("No borrar");
    expect(state.viewings.find((item: any) => item.operationId === "external-import-trakt-501")).toMatchObject({
      sequenceNumber: 2, watchedOn: sourceDate, rating: 7
    });
  });

  it("allows the external file to remove an explicit local status without deleting viewing history", async () => {
    state.movies.set("tmdb-6001", localMovie(6001));
    state.entries.set("tmdb-6001", {
      movieId: "tmdb-6001", status: "watched", isFavorite: false,
      addedAt: "2024-01-01T00:00:00.000Z", updatedAt: "2024-01-01T00:00:00.000Z"
    });
    state.viewings.push({
      id: "local-viewing-1", movieId: "tmdb-6001", sequenceNumber: 1,
      watchedOn: sourceDate, rating: 8, createdAt: "2025-11-05T20:00:00.000Z",
      updatedAt: "2025-11-05T20:00:00.000Z", operationId: "manual-operation-1"
    });

    const pendingPlan = plan([{
      traktId: 601,
      tmdbId: 6001,
      title: "Película 6001",
      addedAt: "2025-11-08T08:22:00.252Z",
      status: "pending"
    }]);
    await importExternalMovies(pendingPlan, "external");

    expect(state.entries.get("tmdb-6001").status).toBe("pending");
    expect(state.viewings).toHaveLength(1);
    expect(state.viewings[0].rating).toBe(8);
  });
});
