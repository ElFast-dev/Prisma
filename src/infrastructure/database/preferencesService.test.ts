import { beforeEach, describe, expect, it, vi } from "vitest";

const fakeDatabase = vi.hoisted(() => {
  let storedRow: unknown;
  const table = {
    get: vi.fn(async (_id: string) => storedRow),
    put: vi.fn(async (value: unknown) => { storedRow = value; }),
    update: vi.fn(async (_id: string, patch: Record<string, unknown>) => {
      storedRow = { ...(storedRow as Record<string, unknown>), ...patch };
    })
  };
  const transaction = vi.fn(async (...args: unknown[]) => {
    const operation = args[args.length - 1];
    if (typeof operation === "function") return (operation as () => unknown)();
    return undefined;
  });

  return {
    table,
    transaction,
    reset() { storedRow = undefined; },
    seed(value: unknown) { storedRow = value; },
    read() { return storedRow; }
  };
});

vi.mock("./database", () => ({
  prismaDb: {
    preferences: fakeDatabase.table,
    transaction: fakeDatabase.transaction
  }
}));

import {
  getUserPreferences,
  saveHistoryBrowsePreferences,
  saveHistoryFilters,
  saveLibraryBrowseFilters,
  saveLibraryView
} from "./preferencesService";
import { DEFAULT_LIBRARY_FILTERS } from "../../domain/libraryPreferences";

describe("persistencia local de preferencias", () => {
  beforeEach(() => {
    fakeDatabase.reset();
    vi.clearAllMocks();
  });

  it("crea una preferencia local segura y usa lista de forma predeterminada", async () => {
    const preferences = await getUserPreferences();

    expect(preferences.libraryView).toBe("list");
    expect(preferences.libraryFilters).toEqual(DEFAULT_LIBRARY_FILTERS);
    expect(fakeDatabase.read()).toMatchObject({
      id: "local",
      libraryView: "list",
      libraryFilters: DEFAULT_LIBRARY_FILTERS
    });
  });

  it("conserva filtros y orden al volver a leer las preferencias", async () => {
    const filters = {
      ...DEFAULT_LIBRARY_FILTERS,
      status: "pending" as const,
      releaseStatus: "upcoming" as const,
      query: "The Thing",
      genre: "Ciencia ficción",
      yearFrom: "1980",
      yearTo: "1990",
      sort: "release-date" as const,
      sortDirection: "asc" as const,
      shuffleSeed: 42
    };

    await saveLibraryBrowseFilters(filters);
    const afterReload = await getUserPreferences();

    expect(afterReload.libraryFilters).toEqual(filters);
    expect(fakeDatabase.read()).toMatchObject({ libraryFilters: filters });
  });

  it("conserva la preferencia de cuadrícula después de volver a leer", async () => {
    await saveLibraryView("grid");
    expect((await getUserPreferences()).libraryView).toBe("grid");

    await saveLibraryView("list");
    expect((await getUserPreferences()).libraryView).toBe("list");
  });

  it("conserva Calendario, mes, día seleccionado y orden tras recargar preferencias", async () => {
    const historyBrowse = {
      viewMode: "calendar" as const,
      sortOrder: "oldest" as const,
      month: "2025-08",
      selectedDate: "2025-08-13"
    };

    await saveHistoryBrowsePreferences(historyBrowse);
    const afterReload = await getUserPreferences();

    expect(afterReload.historyBrowse).toEqual(historyBrowse);
    expect(fakeDatabase.read()).toMatchObject({ historyBrowse });
  });

  it("mantiene separados los filtros de Historial y Biblioteca", async () => {
    const libraryFilters = { ...DEFAULT_LIBRARY_FILTERS, status: "pending" as const, query: "Alien" };
    const historyFilters = {
      query: "Amélie",
      notes: "with-notes" as const,
      rating: "9-10" as const,
      fromDate: "2024-01-01",
      toDate: "2025-12-31"
    };

    await saveLibraryBrowseFilters(libraryFilters);
    await saveHistoryFilters(historyFilters);
    const afterReload = await getUserPreferences();

    expect(afterReload.libraryFilters).toEqual(libraryFilters);
    expect(afterReload.historyFilters).toEqual(historyFilters);
    expect(fakeDatabase.read()).toMatchObject({ libraryFilters, historyFilters });
  });

  it("normaliza filas antiguas sin perder región, movimiento reducido ni vista de Biblioteca", async () => {
    fakeDatabase.seed({
      id: "local", theme: "dark", reducedMotion: true, language: "es", region: "MX",
      libraryView: "grid", updatedAt: "2026-10-01T00:00:00.000Z"
    });

    const migrated = await getUserPreferences();

    expect(migrated.libraryView).toBe("grid");
    expect(migrated.libraryFilters).toEqual(DEFAULT_LIBRARY_FILTERS);
    expect(migrated.region).toBe("MX");
    expect(migrated.reducedMotion).toBe(true);
    expect(migrated.historyBrowse?.viewMode).toBe("timeline");
    expect(migrated.historyBrowse?.selectedDate).toBeNull();
    expect(migrated.historyFilters).toEqual({
      query: "", notes: "all", rating: "all", fromDate: "", toDate: ""
    });
    expect(fakeDatabase.read()).toMatchObject({
      region: "MX", reducedMotion: true, libraryFilters: DEFAULT_LIBRARY_FILTERS
    });
  });
});
