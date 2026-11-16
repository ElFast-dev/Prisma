import type { Page } from "@playwright/test";

export const e2eMovie = {
  id: "tmdb-987654",
  tmdbId: 987654,
  title: "Película ficticia de Prisma E2E",
  originalTitle: "Prisma E2E Test Film",
  overview: "Película de prueba creada exclusivamente para validar recorridos automatizados.",
  releaseDate: "2024-08-14",
  releaseYear: 2024,
  runtimeMinutes: 109,
  voteAverage: 7.5,
  status: "Released",
  genres: ["Drama"],
  genreIds: [18],
  countries: ["Panamá"],
  directors: ["Directora de pruebas"],
  castMembers: ["Actor de pruebas"],
  originalLanguage: "es",
  lastViewingSequence: 0,
  createdAt: "2026-01-01T12:00:00.000Z",
  updatedAt: "2026-01-01T12:00:00.000Z"
};

export const e2eLibraryEntry = {
  movieId: e2eMovie.id,
  status: "pending" as const,
  isFavorite: true,
  addedAt: "2026-01-01T12:00:00.000Z",
  updatedAt: "2026-01-01T12:00:00.000Z"
};

/**
 * Inserta datos ficticios en la IndexedDB temporal del contexto Playwright.
 * La página debe haber inicializado Prisma antes de llamar a esta función.
 */
export async function seedLibraryMovie(page: Page): Promise<void> {
  await page.evaluate(async ({ movie, entry }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const transaction = db.transaction(["movies", "libraryEntries"], "readwrite");
    transaction.objectStore("movies").put(movie);
    transaction.objectStore("libraryEntries").put(entry);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("La transacción de prueba fue cancelada."));
    });
    db.close();
  }, { movie: e2eMovie, entry: e2eLibraryEntry });
}

export async function removeLibraryMovieFixture(page: Page): Promise<void> {
  await page.evaluate(async (movieId) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const transaction = db.transaction(["movies", "libraryEntries"], "readwrite");
    transaction.objectStore("movies").delete(movieId);
    transaction.objectStore("libraryEntries").delete(movieId);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("La transacción de prueba fue cancelada."));
    });
    db.close();
  }, e2eMovie.id);
}
