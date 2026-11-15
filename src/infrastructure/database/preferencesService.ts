import type { LibraryBrowsePreferences, UserPreferences } from "../../domain/types";
import { normalizeLibraryFilters } from "../../domain/libraryPreferences";
import { prismaDb } from "./database";

function normalizePreferences(current?: Partial<UserPreferences> | null): UserPreferences {
  const region = typeof current?.region === "string" && /^[A-Z]{2}$/.test(current.region)
    ? current.region
    : "PA";

  return {
    ...current,
    id: "local",
    theme: "dark",
    reducedMotion: typeof current?.reducedMotion === "boolean" ? current.reducedMotion : false,
    language: "es",
    region,
    libraryView: current?.libraryView === "grid" ? "grid" : "list",
    libraryFilters: normalizeLibraryFilters(current?.libraryFilters),
    updatedAt: typeof current?.updatedAt === "string" && current.updatedAt
      ? current.updatedAt
      : new Date().toISOString()
  };
}

/**
 * Lee y normaliza la única fila de preferencias ya existente en Dexie.
 * Los registros antiguos reciben filtros predeterminados sin tocar otros datos.
 */
export async function getUserPreferences(): Promise<UserPreferences> {
  return prismaDb.transaction("rw", prismaDb.preferences, async () => {
    const stored = await prismaDb.preferences.get("local");
    const normalized = normalizePreferences(stored);

    if (!stored) {
      await prismaDb.preferences.put(normalized);
      return normalized;
    }

    const storedFilters = JSON.stringify(stored.libraryFilters);
    const normalizedFilters = JSON.stringify(normalized.libraryFilters);
    const normalizedView = stored.libraryView === "grid" ? "grid" : "list";

    if (storedFilters !== normalizedFilters || stored.libraryView !== normalizedView) {
      await prismaDb.preferences.update("local", {
        libraryFilters: normalized.libraryFilters,
        libraryView: normalized.libraryView
      });
    }

    return normalized;
  });
}

async function updatePreferences(
  patch: Partial<Pick<UserPreferences, "libraryFilters" | "libraryView">>
): Promise<UserPreferences> {
  return prismaDb.transaction("rw", prismaDb.preferences, async () => {
    const stored = await prismaDb.preferences.get("local");
    const current = normalizePreferences(stored);
    const next: UserPreferences = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };

    if (patch.libraryFilters) {
      next.libraryFilters = normalizeLibraryFilters(patch.libraryFilters);
    }

    await prismaDb.preferences.put(next);
    return next;
  });
}

export function saveLibraryBrowseFilters(filters: LibraryBrowsePreferences): Promise<UserPreferences> {
  return updatePreferences({ libraryFilters: normalizeLibraryFilters(filters) });
}

export function saveLibraryView(view: UserPreferences["libraryView"]): Promise<UserPreferences> {
  return updatePreferences({ libraryView: view });
}
