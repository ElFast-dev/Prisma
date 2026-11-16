import type {
  HistoryBrowsePreferences,
  HistoryFiltersPreferences,
  LibraryBrowsePreferences,
  UserPreferences
} from "../../domain/types";
import { normalizeLibraryFilters } from "../../domain/libraryPreferences";
import { prismaDb } from "./database";

function currentLocalMonth(): string {
  const date = new Date();
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function normalizeHistoryBrowse(
  current?: Partial<HistoryBrowsePreferences> | null
): HistoryBrowsePreferences {
  const candidateMonth = typeof current?.month === "string" ? current.month : "";
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(candidateMonth)
    ? candidateMonth
    : currentLocalMonth();
  const candidateDate = typeof current?.selectedDate === "string" ? current.selectedDate : "";
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(candidateDate)
    && candidateDate.startsWith(month + "-")
    ? candidateDate
    : null;

  return {
    viewMode: current?.viewMode === "calendar" ? "calendar" : "timeline",
    sortOrder: current?.sortOrder === "oldest" ? "oldest" : "newest",
    month,
    selectedDate
  };
}

function normalizeHistoryFilters(
  current?: Partial<HistoryFiltersPreferences> | null
): HistoryFiltersPreferences {
  const fromDate = typeof current?.fromDate === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(current.fromDate) ? current.fromDate : "";
  let toDate = typeof current?.toDate === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(current.toDate) ? current.toDate : "";
  if (fromDate && toDate && fromDate > toDate) toDate = "";

  return {
    query: typeof current?.query === "string" ? current.query : "",
    notes: current?.notes === "with-notes" || current?.notes === "without-notes"
      ? current.notes
      : "all",
    rating: current?.rating === "9-10" || current?.rating === "7-8" || current?.rating === "1-6"
      ? current.rating
      : "all",
    fromDate,
    toDate
  };
}

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
    historyBrowse: normalizeHistoryBrowse(current?.historyBrowse),
    historyFilters: normalizeHistoryFilters(current?.historyFilters),
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
    const historyBrowseChanged = JSON.stringify(stored.historyBrowse) !== JSON.stringify(normalized.historyBrowse);
    const historyFiltersChanged = JSON.stringify(stored.historyFilters) !== JSON.stringify(normalized.historyFilters);

    if (
      storedFilters !== normalizedFilters
      || stored.libraryView !== normalizedView
      || historyBrowseChanged
      || historyFiltersChanged
    ) {
      await prismaDb.preferences.update("local", {
        libraryFilters: normalized.libraryFilters,
        libraryView: normalized.libraryView,
        historyBrowse: normalized.historyBrowse,
        historyFilters: normalized.historyFilters
      });
    }

    return normalized;
  });
}

async function updatePreferences(
  patch: Partial<Pick<UserPreferences,
    "libraryFilters" | "libraryView" | "historyBrowse" | "historyFilters"
  >>
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
    if (patch.historyBrowse) {
      next.historyBrowse = normalizeHistoryBrowse(patch.historyBrowse);
    }
    if (patch.historyFilters) {
      next.historyFilters = normalizeHistoryFilters(patch.historyFilters);
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


export function saveHistoryBrowsePreferences(
  preferences: HistoryBrowsePreferences
): Promise<UserPreferences> {
  return updatePreferences({ historyBrowse: normalizeHistoryBrowse(preferences) });
}

export function saveHistoryFilters(
  filters: HistoryFiltersPreferences
): Promise<UserPreferences> {
  return updatePreferences({ historyFilters: normalizeHistoryFilters(filters) });
}
