import { prismaDb } from "./database";

export interface LocalDataSummary {
  movies: number;
  libraryEntries: number;
  viewings: number;
  collections: number;
  profile: number;
}

/**
 * Cuenta los datos locales que desaparecerán al reiniciar Prisma.
 * Las cachés técnicas también se borran, pero no se muestran como datos personales.
 */
export async function getLocalDataSummary(): Promise<LocalDataSummary> {
  const [movies, libraryEntries, viewings, collections, profile] = await Promise.all([
    prismaDb.movies.count(),
    prismaDb.libraryEntries.count(),
    prismaDb.viewings.count(),
    prismaDb.collections.count(),
    prismaDb.profile.count()
  ]);

  return { movies, libraryEntries, viewings, collections, profile };
}

/**
 * Elimina la información personal, el catálogo local y las cachés en una sola
 * transacción. Conserva appMetadata (metadatos internos de Prisma) y no toca
 * localStorage, por lo que la credencial y la región de TMDB se mantienen.
 */
export async function resetLocalData(): Promise<void> {
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
      prismaDb.spectroSnapshots
    ],
    async () => {
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
    }
  );
}
