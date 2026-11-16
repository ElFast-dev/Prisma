import { expect, test } from "@playwright/test";

async function seedHomeMovies(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = "2026-11-16T12:00:00.000Z";
    const movies = [
      ...Array.from({ length: 3 }, (_, index) => ({
        id: "home-seen-drama-" + index, tmdbId: 988100 + index, title: "Drama de referencia " + index,
        genres: ["Drama"], genreIds: [18], countries: ["Japón"], directors: ["Dirección conocida"],
        castMembers: ["Reparto conocido"], keywords: ["memoria"], originalLanguage: "ja",
        releaseYear: 2019 + index, runtimeMinutes: 110, lastViewingSequence: 1, createdAt: now, updatedAt: now
      })),
      ...Array.from({ length: 3 }, (_, index) => ({
        id: "home-seen-comedy-" + index, tmdbId: 988110 + index, title: "Comedia de referencia " + index,
        genres: ["Comedia"], genreIds: [35], countries: ["Estados Unidos"], directors: ["Otra dirección"],
        castMembers: ["Otro reparto"], keywords: ["amistad"], originalLanguage: "en",
        releaseYear: 2019 + index, runtimeMinutes: 95, lastViewingSequence: 1, createdAt: now, updatedAt: now
      })),
      {
        id: "home-safe-pending", tmdbId: 988120, title: "Apuesta segura ficticia",
        genres: ["Drama"], genreIds: [18], countries: ["Japón"], directors: ["Dirección conocida"],
        castMembers: ["Reparto conocido"], keywords: ["memoria"], originalLanguage: "ja",
        releaseYear: 2023, runtimeMinutes: 108, posterPath: "/home-safe.jpg",
        lastViewingSequence: 0, createdAt: now, updatedAt: now
      },
      {
        id: "home-discovery", tmdbId: 988121, title: "Descubrimiento ficticio",
        genres: ["Drama", "Ciencia ficción"], genreIds: [18, 878], countries: ["Corea del Sur"],
        directors: ["Dirección emergente"], castMembers: ["Reparto nuevo"],
        keywords: ["identidad", "viajes en el tiempo"], originalLanguage: "ko",
        releaseYear: 2024, runtimeMinutes: 116, posterPath: "/home-discovery.jpg",
        lastViewingSequence: 0, createdAt: now, updatedAt: now
      },
      {
        id: "home-outside", tmdbId: 988122, title: "Exploración ficticia",
        genres: ["Terror"], genreIds: [27], countries: ["Francia"], directors: ["Dirección desconocida"],
        castMembers: ["Reparto desconocido"], keywords: ["surrealismo"], originalLanguage: "fr",
        releaseYear: 2025, runtimeMinutes: 101, posterPath: "/home-outside.jpg",
        lastViewingSequence: 0, createdAt: now, updatedAt: now
      }
    ];
    const viewings = movies.slice(0, 6).map((movie, index) => ({
      id: "home-view-" + index, movieId: movie.id, sequenceNumber: 1,
      watchedOn: "2026-01-0" + (index + 1),
      rating: index < 3 ? [10, 9, 10][index] : [5, 4, 5][index - 3],
      createdAt: now, updatedAt: now, operationId: "home-operation-" + index
    }));
    try {
      const transaction = db.transaction(["movies", "viewings", "libraryEntries"], "readwrite");
      const movieStore = transaction.objectStore("movies");
      const viewingStore = transaction.objectStore("viewings");
      for (const movie of movies) movieStore.put(movie);
      for (const viewing of viewings) viewingStore.put(viewing);
      transaction.objectStore("libraryEntries").put({
        movieId: "home-safe-pending", status: "pending", isFavorite: false, addedAt: now, updatedAt: now
      });
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error("No se pudieron insertar datos ficticios de Inicio."));
      });
    } finally {
      db.close();
    }
  });
}

test("Inicio presenta tres propuestas distintas y respeta Pendientes sin consultar TMDB", async ({ page }) => {
  const tmdbRequests: string[] = [];
  await page.route("https://api.themoviedb.org/**", async (route) => {
    tmdbRequests.push(route.request().url());
    await route.abort();
  });
  await page.goto("#/");
  await expect(page.getByRole("heading", { name: "¿Qué película vemos hoy?" })).toBeVisible();
  await seedHomeMovies(page);
  await page.reload();

  await expect(page.locator('[data-home-pick="safe"]')).toBeVisible();
  await expect(page.locator('[data-home-pick="discovery"]')).toBeVisible();
  await expect(page.locator('[data-home-pick="outside"]')).toBeVisible();
  await expect(page.locator('[data-home-pick="safe"]')).toContainText("Apuesta segura ficticia");
  await expect(page.locator('[data-home-pick="safe"]')).toContainText("De tus pendientes");
  await expect(page.locator('[data-home-pick="discovery"]')).toContainText("Descubrimiento ficticio");
  await expect(page.locator('[data-home-pick="outside"]')).toContainText("Exploración ficticia");
  await expect(page.locator('[data-home-pick="outside"]')).toContainText("Sin evidencia suficiente");
  await expect(page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Inicio" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Mi cine" })).toBeVisible();
  expect(tmdbRequests).toHaveLength(0);
});
