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
  saveLibraryBrowseFilters,
  saveLibraryView
} from "./preferencesService";
import { DEFAULT_LIBRARY_FILTERS } from "../../domain/libraryPreferences";

describe("persistencia local de preferencias de Biblioteca", () => {
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

  it("migra en lectura los registros antiguos sin alterar otros ajustes existentes", async () => {
    fakeDatabase.seed({
      id: "local",
      theme: "dark",
      reducedMotion: true,
      language: "es",
      region: "MX",
      libraryView: "grid",
      updatedAt: "2026-10-01T00:00:00.000Z"
    });

    const migrated = await getUserPreferences();

    expect(migrated.libraryView).toBe("grid");
    expect(migrated.libraryFilters).toEqual(DEFAULT_LIBRARY_FILTERS);
    expect(migrated.region).toBe("MX");
    expect(migrated.reducedMotion).toBe(true);
    expect(fakeDatabase.read()).toMatchObject({
      region: "MX",
      reducedMotion: true,
      libraryFilters: DEFAULT_LIBRARY_FILTERS
    });
  });
});
