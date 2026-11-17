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
    const libraryEntries: Array<Record<string, unknown>> = [];

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
    libraryEntries.push({
      movieId: "e2e-spectro-previous-drama-0",
      status: "watched",
      isFavorite: true,
      addedAt: now,
      updatedAt: now
    });

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
      const transaction = db.transaction(["movies", "viewings", "libraryEntries"], "readwrite");
      const movieStore = transaction.objectStore("movies");
      const viewingStore = transaction.objectStore("viewings");
      const libraryStore = transaction.objectStore("libraryEntries");
      for (const movie of movies) movieStore.put(movie);
      for (const viewing of viewings) viewingStore.put(viewing);
      for (const entry of libraryEntries) libraryStore.put(entry);

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

test("presenta Espectro como un centro de analítica visual por secciones", async ({ page }) => {
  await page.goto("#/personal");
  await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();
  await seedSpectroHistory(page);

  await page.goto("#/spectro");
  await expect(page.getByRole("heading", { name: "Tu cine, en datos" })).toBeVisible();
  await expect(page.getByText("Datos locales")).toBeVisible();
  await expect(page.locator(".spectro-data-metric")).toHaveCount(6);
  await expect(page.getByRole("tab", { name: /Resumen/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Tu actividad a lo largo del tiempo" })).toBeVisible();
  await expect(page.locator(".spectro-chart-card")).toHaveCount(4);

  await page.getByRole("tab", { name: /Actividad/ }).click();
  await expect(page.getByRole("heading", { name: "Ritmo de visionado" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mapa de horarios" })).toBeVisible();

  await page.getByRole("tab", { name: /Calificaciones/ }).click();
  await expect(page.getByRole("heading", { name: "La forma de tus calificaciones" })).toBeVisible();
  await expect(page.locator(".spectro-rating-column")).toHaveCount(10);
  await expect(page.getByRole("heading", { name: "Películas que vuelves a ver" })).toBeVisible();

  await page.getByRole("tab", { name: /Universo/ }).click();
  await expect(page.getByRole("heading", { name: "Géneros" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Países de producción" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Duración de las películas" })).toBeVisible();

  await page.getByRole("tab", { name: /Perfil/ }).click();
  await expect(page.getByRole("heading", { name: "Rasgos que inclinan tus notas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Combinaciones que destacan" })).toBeVisible();

  await page.getByRole("tab", { name: /Biblioteca/ }).click();
  await expect(page.getByRole("heading", { name: "Distribución del catálogo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tus colecciones" })).toBeVisible();

  // Las secciones antiguas no reaparecen como destinos separados.
  await expect(page.locator('a[href^="#/spectro/"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Mapa cinematográfico", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Afinidades", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Evolución", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Recomendaciones", exact: true })).toHaveCount(0);
  await expect(page.getByText("Espectro 2.6.0")).toBeVisible();
});
test("redirige enlaces guardados de las antiguas vistas de Espectro", async ({ page }) => {
  await page.goto("#/spectro/map");
  await expect(page.getByRole("heading", { name: "Tu cine, en datos" })).toBeVisible();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/spectro");
  await expect(page.locator('a[href^="#/spectro/"]')).toHaveCount(0);
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
        rating: index < 2 ? 9 : 5,
        createdAt: now,
        updatedAt: now,
        operationId: id + "-operation"
      });
    }
    const pendingId = "tmdb-987103";
    movies.push({
      id: pendingId,
      tmdbId: 987103,
      title: "Película pendiente sin completar",
      genres: [],
      genreIds: [],
      countries: [],
      directors: [],
      castMembers: [],
      releaseYear: 2022,
      lastViewingSequence: 0,
      createdAt: now,
      updatedAt: now
    });

    try {
      const transaction = db.transaction(["movies", "viewings", "libraryEntries"], "readwrite");
      const movieStore = transaction.objectStore("movies");
      const viewingStore = transaction.objectStore("viewings");
      for (const movie of movies) movieStore.put(movie);
      for (const viewing of viewings) viewingStore.put(viewing);
      transaction.objectStore("libraryEntries").put({
        movieId: pendingId,
        status: "pending",
        isFavorite: false,
        addedAt: now,
        updatedAt: now
      });
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


test("completa metadatos y temas de Espectro desde TMDB sin abrir fichas", async ({ page }) => {
  const requestedPaths: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem("prisma.tmdb.accessToken", "fixture-token");
  });
  await page.route("https://api.themoviedb.org/3/movie/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    requestedPaths.push(pathname);
    const segments = pathname.split("/");
    const idOffset = pathname.endsWith("/credits") || pathname.endsWith("/keywords") ? 2 : 1;
    const tmdbId = Number(segments[segments.length - idOffset]);
    if (pathname.endsWith("/credits")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: tmdbId,
          cast: [{
            id: 8001,
            name: tmdbId === 987102 ? "Otro reparto" : "Reparto automático",
            character: "Protagonista"
          }],
          crew: [{
            id: 8002,
            name: tmdbId === 987102 ? "Otra dirección" : "Dirección automática",
            job: "Director",
            department: "Directing"
          }]
        })
      });
      return;
    }
    if (pathname.endsWith("/keywords")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: tmdbId,
          keywords: tmdbId === 987102
            ? [{ id: 9002, name: "aventura espacial" }]
            : [{ id: 9001, name: "memoria" }, { id: 9003, name: "identidad" }]
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
  await expect(page.getByRole("heading", { name: "Tu cine, en datos" })).toBeVisible();
  await expect(page.getByText("Espectro está completando información")).toBeVisible();
  await expect.poll(() => requestedPaths.filter((path) => path.endsWith("/keywords")).length).toBe(4);
  await expect(page.getByText("Espectro incorporó metadatos de 4 películas.")).toBeVisible();

  await page.goto("#/spectro/affinities");
  await expect(page.getByRole("heading", { name: "Tu cine, en datos" })).toBeVisible();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/spectro");
  await page.getByRole("tab", { name: /Perfil/ }).click();
  await expect(page.getByRole("heading", { name: "Rasgos que inclinan tus notas" })).toBeVisible();

  const storedKeywords = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = db.transaction("movies", "readonly");
      const store = transaction.objectStore("movies");
      const records = await new Promise<Array<{ tmdbId: number; keywords?: string[] }>>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return records.filter((movie) => movie.tmdbId >= 987100 && movie.tmdbId <= 987103)
        .map((movie) => movie.keywords ?? []);
    } finally {
      db.close();
    }
  });
  expect(storedKeywords).toContainEqual(["memoria", "identidad"]);
  expect(storedKeywords).toContainEqual(["aventura espacial"]);
  expect(storedKeywords).toHaveLength(4);
  expect(requestedPaths).toContain("/3/movie/987100/keywords");
  expect(requestedPaths).toContain("/3/movie/987103/keywords");
  expect(requestedPaths.slice(0, 3).every((path) => path.includes("/987103"))).toBe(true);

  const preservedPersonalState = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const transaction = db.transaction(["libraryEntries", "viewings"], "readonly");
      const pendingRequest = transaction.objectStore("libraryEntries").get("tmdb-987103");
      const viewingsRequest = transaction.objectStore("viewings").getAll();
      const [pending, viewings] = await Promise.all([
        new Promise<{ status?: string } | undefined>((resolve, reject) => {
          pendingRequest.onsuccess = () => resolve(pendingRequest.result);
          pendingRequest.onerror = () => reject(pendingRequest.error);
        }),
        new Promise<Array<{ movieId: string; rating?: number }>>((resolve, reject) => {
          viewingsRequest.onsuccess = () => resolve(viewingsRequest.result);
          viewingsRequest.onerror = () => reject(viewingsRequest.error);
        })
      ]);
      return {
        pendingStatus: pending?.status,
        viewingRatings: viewings
          .filter((viewing) => viewing.movieId.startsWith("tmdb-98710"))
          .map((viewing) => viewing.rating)
      };
    } finally {
      db.close();
    }
  });
  expect(preservedPersonalState.pendingStatus).toBe("pending");
  expect(preservedPersonalState.viewingRatings).toEqual([9, 9, 5]);
});

test("muestra errores de metadatos al volver y permite forzar el reintento sin abrir la ficha", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("prisma.tmdb.accessToken", "fixture-token");
  });

  const requestedPaths: string[] = [];
  await page.route("https://api.themoviedb.org/3/movie/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    requestedPaths.push(pathname);
    if (pathname.endsWith("/keywords")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 987401, keywords: [{ id: 9004, name: "memoria" }] })
      });
      return;
    }
    if (pathname.endsWith("/credits")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 987401,
          cast: [{ id: 8101, name: "Reparto reintentado", character: "Protagonista" }],
          crew: [{ id: 8102, name: "Dirección reintentada", job: "Director", department: "Directing" }]
        })
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: 987401,
        title: "Error diferido Prisma",
        original_title: "Deferred Prisma",
        overview: "Metadatos ficticios recuperados mediante reintento.",
        release_date: "2021-05-01",
        runtime: 108,
        status: "Released",
        genres: [{ id: 18, name: "Drama" }],
        production_countries: [{ iso_3166_1: "JP", name: "Japón" }],
        original_language: "ja",
        poster_path: "/retry-poster.jpg",
        backdrop_path: "/retry-backdrop.jpg"
      })
    });
  });

  await page.goto("#/personal");
  await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tmdbId = 987401;
    const now = new Date().toISOString();
    try {
      const transaction = db.transaction(["movies", "viewings", "appMetadata"], "readwrite");
      transaction.objectStore("movies").put({
        id: "tmdb-" + tmdbId,
        tmdbId,
        title: "Error diferido Prisma",
        genres: ["Drama"],
        genreIds: [18],
        countries: [],
        directors: [],
        castMembers: [],
        lastViewingSequence: 1,
        createdAt: now,
        updatedAt: now
      });
      transaction.objectStore("viewings").put({
        id: "tmdb-" + tmdbId + "-view",
        movieId: "tmdb-" + tmdbId,
        sequenceNumber: 1,
        watchedOn: "2026-11-15",
        rating: 8,
        createdAt: now,
        updatedAt: now,
        operationId: "retry-fixture-operation"
      });
      transaction.objectStore("appMetadata").put({
        key: "spectro:metadata:v1:" + tmdbId,
        value: JSON.stringify({
          tmdbId,
          status: "error",
          attempts: 1,
          updatedAt: now,
          lastError: "Error temporal simulado."
        })
      });
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error("No se pudo preparar el fallo diferido de metadatos."));
      });
    } finally {
      db.close();
    }
  });

  await page.goto("#/spectro");
  await expect(page.getByText("Quedaron 1 películas con datos incompletos")).toBeVisible();
  await expect(page.getByText(/pausa temporal/)).toBeVisible();
  await page.getByRole("button", { name: "Reintentar metadatos" }).click();
  await expect(page.getByText("Espectro está completando información")).toBeVisible();
  await expect(page.getByText("Espectro incorporó metadatos de 1 películas.")).toBeVisible();
  expect(requestedPaths).toContain("/3/movie/987401");
  expect(requestedPaths).toContain("/3/movie/987401/credits");
  expect(requestedPaths).toContain("/3/movie/987401/keywords");
});

test("Espectro pregunta por una calificación pendiente sin abrir la ficha", async ({ page }) => {
  await page.goto("#/personal");
  await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = "2026-11-16T12:00:00.000Z";
    try {
      const transaction = db.transaction(["movies", "viewings"], "readwrite");
      transaction.objectStore("movies").put({
        id: "tmdb-987300",
        tmdbId: 987300,
        title: "Una película sin nota",
        genres: ["Drama"],
        genreIds: [18],
        countries: ["Panamá"],
        lastViewingSequence: 1,
        createdAt: now,
        updatedAt: now
      });
      transaction.objectStore("viewings").put({
        id: "spectro-unrated-viewing",
        movieId: "tmdb-987300",
        sequenceNumber: 1,
        watchedOn: "2026-11-01",
        review: "Una experiencia que quiero conservar.",
        watchedAtLocalTime: "20:15",
        timeZone: "America/Panama",
        createdAt: now,
        updatedAt: now,
        operationId: "spectro-unrated-operation"
      });
      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error("No se pudo preparar el visionado sin calificación."));
      });
    } finally {
      db.close();
    }
  });

  await page.goto("#/spectro");
  await expect(page.getByRole("heading", { name: "¿Qué nota le darías a Una película sin nota?" })).toBeVisible();
  await page.getByRole("button", { name: "Calificar con 8 de 10" }).click();
  await page.getByRole("button", { name: "Guardar nota" }).click();
  await expect(page.getByRole("heading", { name: "¿Qué nota le darías a Una película sin nota?" })).toHaveCount(0);

  const saved = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
        const transaction = db.transaction("viewings", "readonly");
        const request = transaction.objectStore("viewings").get("spectro-unrated-viewing");
        request.onsuccess = () => resolve(request.result as Record<string, unknown> | undefined);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
  expect(saved).toMatchObject({
    id: "spectro-unrated-viewing",
    watchedOn: "2026-11-01",
    rating: 8,
    review: "Una experiencia que quiero conservar.",
    watchedAtLocalTime: "20:15",
    timeZone: "America/Panama"
  });
});
