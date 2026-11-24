import type { PrismaBackup } from "../../domain/backup";
import { parsePrismaBackup } from "../../domain/backup";
import { getCatalogRegion, saveCatalogRegion } from "../tmdb/settings";
import { prismaDb } from "./database";
import { normalizeLibraryFilters } from "../../domain/libraryPreferences";
import { SPECTRO_METADATA_HISTORY_PREFIX } from "./spectroMetadataHistoryRepository";

export async function createLocalBackup(): Promise<string> {
  const [movies, libraryEntries, viewings, collections, collectionMovies, profile, preferences] = await Promise.all([
    prismaDb.movies.toArray(),
    prismaDb.libraryEntries.toArray(),
    prismaDb.viewings.toArray(),
    prismaDb.collections.toArray(),
    prismaDb.collectionMovies.toArray(),
    prismaDb.profile.toArray(),
    prismaDb.preferences.toArray()
  ]);

  const backup = {
    format: "prisma-local-backup" as const,
    formatVersion: 1 as const,
    exportedAt: new Date().toISOString(),
    catalogRegion: getCatalogRegion(),
    data: { movies, libraryEntries, viewings, collections, collectionMovies, profile, preferences }
  };
  return JSON.stringify(backup, null, 2);
}

export async function restoreLocalBackup(backup: PrismaBackup): Promise<void> {
  const validated = parsePrismaBackup(JSON.stringify(backup));
  const data = validated.data;

  await prismaDb.transaction(
    "rw",
    [
      prismaDb.movies,
      prismaDb.libraryEntries,
      prismaDb.viewings,
      prismaDb.collections,
      prismaDb.collectionMovies,
      prismaDb.profile,
      prismaDb.preferences,
      prismaDb.catalogCache,
      prismaDb.availabilityCache,
      prismaDb.peopleCache,
      prismaDb.spectroSnapshots,
      prismaDb.appMetadata
    ],
    async () => {
      // Las observaciones derivadas pertenecen al catálogo anterior. Al
      // restaurar otro catálogo se descartan sin tocar colas ni preferencias.
      await prismaDb.appMetadata
        .toCollection()
        .filter((entry) => entry.key.startsWith(SPECTRO_METADATA_HISTORY_PREFIX))
        .delete();

      await Promise.all([
        prismaDb.movies.clear(),
        prismaDb.libraryEntries.clear(),
        prismaDb.viewings.clear(),
        prismaDb.collections.clear(),
        prismaDb.collectionMovies.clear(),
        prismaDb.profile.clear(),
        prismaDb.preferences.clear(),
        prismaDb.catalogCache.clear(),
        prismaDb.availabilityCache.clear(),
        prismaDb.peopleCache.clear(),
        prismaDb.spectroSnapshots.clear()
      ]);

      if (data.movies.length) await prismaDb.movies.bulkPut(data.movies);
      if (data.libraryEntries.length) await prismaDb.libraryEntries.bulkPut(data.libraryEntries);
      if (data.viewings.length) await prismaDb.viewings.bulkPut(data.viewings);
      if (data.collections.length) await prismaDb.collections.bulkPut(data.collections);
      if (data.collectionMovies.length) await prismaDb.collectionMovies.bulkPut(data.collectionMovies);
      if (data.profile.length) await prismaDb.profile.bulkPut(data.profile);
      if (data.preferences.length) {
        const preferences = data.preferences.map((preference) => ({
          ...preference,
          historyFilters: preference.historyFilters
            ? {
              ...preference.historyFilters,
              ratingMin: preference.historyFilters.ratingMin ?? "",
              ratingMax: preference.historyFilters.ratingMax ?? ""
            }
            : undefined,
          libraryFilters: normalizeLibraryFilters(preference.libraryFilters)
        }));
        await prismaDb.preferences.bulkPut(preferences);
      }
    }
  );

  saveCatalogRegion(validated.catalogRegion);
}
