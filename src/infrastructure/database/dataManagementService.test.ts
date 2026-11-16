import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakeDb } = vi.hoisted(() => {
  const names = [
    "movies",
    "libraryEntries",
    "viewings",
    "collections",
    "collectionMovies",
    "profile",
    "preferences",
    "catalogCache",
    "availabilityCache",
    "peopleCache",
    "spectroSnapshots",
    "appMetadata"
  ];
  const counts: Record<string, number> = Object.fromEntries(names.map((name) => [name, 2]));
  const tables: Record<string, { count: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> }> = {};

  for (const name of names) {
    tables[name] = {
      count: vi.fn(async () => counts[name]),
      clear: vi.fn(async () => { counts[name] = 0; })
    };
  }

  const transaction = vi.fn(async (...args: unknown[]) => {
    const callback = args[args.length - 1];
    if (typeof callback === "function") {
      return (callback as () => Promise<unknown>)();
    }
    return undefined;
  });

  return { counts, tables, transaction };
});

vi.mock("./database", () => ({
  prismaDb: {
    ...fakeDb.tables,
    transaction: fakeDb.transaction
  }
}));

import { getLocalDataSummary, resetLocalData } from "./dataManagementService";

describe("gestión y restablecimiento de datos locales", () => {
  beforeEach(() => {
    for (const name of Object.keys(fakeDb.counts)) fakeDb.counts[name] = 2;
    vi.clearAllMocks();
  });

  it("resume los datos personales antes de mostrar la confirmación", async () => {
    await expect(getLocalDataSummary()).resolves.toEqual({
      movies: 2,
      libraryEntries: 2,
      viewings: 2,
      collections: 2,
      profile: 2
    });
  });

  it("borra datos personales y cachés de forma transaccional", async () => {
    await resetLocalData();

    expect(fakeDb.transaction).toHaveBeenCalledOnce();
    for (const name of [
      "movies",
      "libraryEntries",
      "viewings",
      "collections",
      "collectionMovies",
      "profile",
      "preferences",
      "catalogCache",
      "availabilityCache",
      "peopleCache",
      "spectroSnapshots"
    ]) {
      expect(fakeDb.tables[name].clear).toHaveBeenCalledOnce();
      expect(fakeDb.counts[name]).toBe(0);
    }
  });

  it("conserva los metadatos internos de Prisma", async () => {
    await resetLocalData();

    expect(fakeDb.tables.appMetadata.clear).not.toHaveBeenCalled();
    expect(fakeDb.counts.appMetadata).toBe(2);
  });
});
