import { expect, test } from "@playwright/test";

async function seedSpectroHistory(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const now = "2026-11-16T12:00:00.000Z";
    const movies: Array<Record<string, unknown>> = [];
    const viewings: Array<Record<string, unknown>> = [];

    const addGroup = (
      prefix: string,
      date: string,
      genre: string,
      genreId: number,
      rating: number,
      director: string,
      country: string,
      language: string,
      runtime: number
    ) => {
      for (let index = 0; index < 3; index += 1) {
        const id = "e2e-spectro-" + prefix + "-" + index;
        movies.push({
          id,
          tmdbId: 986100 + movies.length,
          title: prefix + " ficticia " + (index + 1),
          genres: [genre],
          genreIds: [genreId],
          countries: [country],
          directors: [director],
          castMembers: [director + " reparto"],
          originalLanguage: language,
          runtimeMinutes: runtime,
          releaseYear: 2010 + index,
          lastViewingSequence: 1,
          createdAt: now,
          updatedAt: now
        });
        viewings.push({
          id: id + "-view",
          movieId: id,
          sequenceNumber: 1,
          watchedOn: date,
          rating,
          createdAt: now,
          updatedAt: now,
          operationId: id + "-operation"
        });
      }
    };

    addGroup("previous-drama", "2025-01-25", "Drama", 18, 7, "Directora Prisma", "Japón", "ja", 115);
    addGroup("previous-comedy", "2025-01-26", "Comedia", 35, 9, "Director Alterno", "México", "es", 85);
    addGroup("recent-drama", "2026-02-01", "Drama", 18, 10, "Directora Prisma", "Japón", "ja", 115);
    addGroup("recent-comedy", "2026-02-02", "Comedia", 35, 5, "Director Alterno", "México", "es", 85);

    movies.push({
      id: "e2e-spectro-candidate",
      tmdbId: 986199,
      title: "Candidata Prisma ficticia",
      genres: ["Drama"],
      genreIds: [18],
      countries: ["Japón"],
      directors: ["Directora Prisma"],
      castMembers: ["Directora Prisma reparto"],
      originalLanguage: "ja",
      runtimeMinutes: 115,
      releaseYear: 2024,
      lastViewingSequence: 0,
      createdAt: now,
      updatedAt: now
    });

    try {
      const transaction = db.transaction(["movies", "viewings"], "readwrite");
      const movieStore = transaction.objectStore("movies");
      const viewingStore = transaction.objectStore("viewings");
      for (const movie of movies) movieStore.put(movie);
      for (const viewing of viewings) viewingStore.put(viewing);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error("No se pudieron preparar datos ficticios de Espectro."));
      });
    } finally {
      db.close();
    }
  });
}

test("presenta afinidades respaldadas, cambios temporales y recomendaciones explicables", async ({ page }) => {
  // Cada prueba usa un navegador temporal e IndexedDB aislada.
  await page.goto("#/personal");
  await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();
  await seedSpectroHistory(page);

  await page.goto("#/spectro");
  await expect(page.getByRole("heading", { name: "Espectro" })).toBeAttached();
  await expect(page.getByText("Versión 2.0.0")).toBeVisible();

  await expect(page.getByRole("heading", { name: "Afinidades" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Idioma original" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Duración" })).toBeVisible();
  await expect(page.getByText("Cambios recientes")).toBeVisible();
  await expect(page.locator(".spectro-trend-row").first()).toBeVisible();
  await expect(page.getByText("Drama", { exact: true }).first()).toBeVisible();

  await expect(page.getByRole("heading", { name: "Podrían gustarte" })).toBeVisible();
  await expect(page.getByText("Candidata Prisma ficticia")).toBeVisible();
  await expect(page.getByText("Género: Drama")).toBeVisible();
  await expect(page.getByText("Dirección: Directora Prisma")).toBeVisible();

  await expect(page.getByRole("navigation", { name: "Navegación principal" })
    .getByRole("link", { name: "Espectro", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".section-heading")).toHaveCount(0);
});

async function seedIncompleteSpectroHistory(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = "2026-11-16T12:00:00.000Z";
    const movies: Array<Record<string, unknown>> = [];
    const viewings: Array<Record<string, unknown>> = [];

    for (let index = 0; index < 3; index += 1) {
      const tmdbId = 987100 + index;
      const id = "tmdb-" + tmdbId;
      movies.push({
        id,
        tmdbId,
        title: "Drama sin completar " + (index + 1),
        genres: ["Drama"],
        genreIds: [18],
        countries: [],
        directors: [],
        castMembers: [],
        releaseYear: 2016 + index,
        lastViewingSequence: 1,
        createdAt: now,
        updatedAt: now
      });
      viewings.push({
        id: id + "-view",
        movieId: id,
        sequenceNumber: 1,
        watchedOn: "2026-01-0" + (index + 1),
        rating: 8 + (index % 2),
        createdAt: now,
        updatedAt: now,
        operationId: id + "-operation"
      });
    }

    try {
      const transaction = db.transaction(["movies", "viewings"], "readwrite");
      const movieStore = transaction.objectStore("movies");
      const viewingStore = transaction.objectStore("viewings");
      for (const movie of movies) movieStore.put(movie);
      for (const viewing of viewings) viewingStore.put(viewing);
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error("No se pudieron preparar películas incompletas ficticias."));
      });
    } finally {
      db.close();
    }
  });
}

test("completa metadatos de Espectro desde TMDB sin abrir fichas", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("prisma.tmdb.accessToken", "fixture-token");
  });
  await page.route("https://api.themoviedb.org/3/movie/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const segments = pathname.split("/");
    const tmdbId = Number(segments[segments.length - (pathname.endsWith("/credits") ? 2 : 1)]);
    if (pathname.endsWith("/credits")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: tmdbId,
          cast: [{ id: 8001, name: "Reparto automático", character: "Protagonista" }],
          crew: [{ id: 8002, name: "Dirección automática", job: "Director", department: "Directing" }]
        })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: tmdbId,
        title: "Drama sin completar " + (tmdbId - 987099),
        original_title: "Incomplete Drama",
        overview: "Metadatos ficticios para la prueba automática.",
        release_date: "2016-05-01",
        runtime: 112,
        status: "Released",
        genres: [{ id: 18, name: "Drama" }],
        production_countries: [{ iso_3166_1: "JP", name: "Japón" }],
        original_language: "ja",
        poster_path: "/fixture-poster.jpg",
        backdrop_path: "/fixture-backdrop.jpg"
      })
    });
  });

  await page.goto("#/personal");
  await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();
  await seedIncompleteSpectroHistory(page);

  await page.goto("#/spectro");
  await expect(page.getByRole("heading", { name: "Espectro" })).toBeAttached();
  await expect(page.getByText("Espectro está completando información")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dirección" })).toBeVisible();
  await expect(page.getByText("Dirección automática", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Reparto automático", { exact: true }).first()).toBeVisible();
});
