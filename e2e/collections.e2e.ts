import { expect, test, type Page } from "@playwright/test";

async function seedCollectionWithMovies(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const now = "2026-01-01T12:00:00.000Z";
    const movies = [
      {
        id: "collection-movie-alpha",
        tmdbId: 990001,
        title: "Película Alfa E2E",
        originalTitle: "Prisma Collection Alpha",
        releaseYear: 2022,
        runtimeMinutes: 104,
        genres: ["Drama"],
        countries: ["Panamá"],
        lastViewingSequence: 0,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "collection-movie-beta",
        tmdbId: 990002,
        title: "Película Beta E2E",
        originalTitle: "Prisma Collection Beta",
        releaseYear: 2024,
        runtimeMinutes: 116,
        genres: ["Ciencia ficción"],
        countries: ["Panamá"],
        lastViewingSequence: 0,
        createdAt: now,
        updatedAt: now
      }
    ];
    const collection = {
      id: "collection-e2e-editorial",
      name: "Selección E2E",
      description: "Dos películas ficticias para probar portada y orden.",
      coverMovieId: "collection-movie-alpha",
      createdAt: now,
      updatedAt: now
    };
    const memberships = [
      {
        id: "collection-membership-alpha",
        collectionId: collection.id,
        movieId: movies[0].id,
        position: 0,
        addedAt: now
      },
      {
        id: "collection-membership-beta",
        collectionId: collection.id,
        movieId: movies[1].id,
        position: 1,
        addedAt: now
      }
    ];

    try {
      const transaction = db.transaction(["movies", "collections", "collectionMovies"], "readwrite");
      const movieStore = transaction.objectStore("movies");
      movies.forEach((movie) => movieStore.put(movie));
      transaction.objectStore("collections").put(collection);
      const membershipStore = transaction.objectStore("collectionMovies");
      memberships.forEach((membership) => membershipStore.put(membership));

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error("No se pudieron preparar los datos ficticios."));
      });
    } finally {
      db.close();
    }
  });
}

async function readCollectionFixture(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    try {
      return await new Promise<{
        collection: Record<string, unknown> | undefined;
        movies: Record<string, unknown>[];
        memberships: Record<string, unknown>[];
      }>((resolve, reject) => {
        const transaction = db.transaction(["movies", "collections", "collectionMovies"], "readonly");
        const collectionRequest = transaction.objectStore("collections").get("collection-e2e-editorial");
        const moviesRequest = transaction.objectStore("movies").getAll();
        const membershipsRequest = transaction.objectStore("collectionMovies").getAll();

        transaction.oncomplete = () => resolve({
          collection: collectionRequest.result as Record<string, unknown> | undefined,
          movies: moviesRequest.result as Record<string, unknown>[],
          memberships: (membershipsRequest.result as Record<string, unknown>[])
            .filter((membership) => membership.collectionId === "collection-e2e-editorial")
            .sort((a, b) => Number(a.position) - Number(b.position))
        });
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      db.close();
    }
  });
}

test("crea una colección ficticia y conserva su descripción al recargar", async ({ page }) => {
  // El contexto es temporal; ningún dato del navegador personal se utiliza.
  await page.goto("#/personal/collections");
  await expect(page.getByRole("heading", { name: "Colecciones" })).toBeVisible();

  await page.locator('button[aria-label="Crear colección"]').click();
  const createForm = page.locator("form.collection-create-panel");
  await expect(createForm).toBeVisible();
  await page.getByRole("textbox", { name: "Nombre de la colección" })
    .fill("Prisma E2E: colección ficticia");
  await page.getByRole("textbox", { name: "Descripción de la colección" })
    .fill("Una selección de prueba con identidad propia.");

  await createForm.getByRole("button", { name: "Crear colección" }).click();

  await expect(page).toHaveURL(/#\/personal\/collections\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Prisma E2E: colección ficticia" })).toBeVisible();
  await expect(page.getByText("Una selección de prueba con identidad propia.")).toBeVisible();
  await expect(page.getByText("Esta colección está vacía")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Prisma E2E: colección ficticia" })).toBeVisible();
  await expect(page.getByText("Una selección de prueba con identidad propia.")).toBeVisible();
  await expect(page.getByText("Esta colección está vacía")).toBeVisible();
});

test("edita la selección, cambia portada y ordena películas sin alterar el catálogo", async ({ page }) => {
  await page.goto("#/personal");
  await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();
  await seedCollectionWithMovies(page);

  await page.goto("#/personal/collections/collection-e2e-editorial");
  await expect(page.getByRole("heading", { name: "Selección E2E" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mover Película Beta E2E hacia arriba" })).toBeVisible();

  await page.getByRole("button", { name: "Usar Película Beta E2E como portada" }).click();
  const betaCard = page.locator(".collection-movie-card").filter({
    has: page.getByRole("button", { name: "Abrir ficha de Película Beta E2E" })
  });
  await expect(betaCard.getByText("PORTADA")).toBeVisible();

  await page.getByRole("button", { name: "Mover Película Beta E2E hacia arriba" }).click();
  const movieCards = page.locator(".collection-movie-card");
  await expect(movieCards.first().getByRole("button", { name: "Abrir ficha de Película Beta E2E" })).toBeVisible();
  await expect(movieCards.nth(1).getByRole("button", { name: "Abrir ficha de Película Alfa E2E" })).toBeVisible();

  await page.getByRole("button", { name: "Editar colección" }).click();
  await page.locator("#collection-edit-name").fill("Cine de medianoche E2E");
  await page.locator("#collection-edit-description").fill("Un recorrido ficticio por historias nocturnas.");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByRole("heading", { name: "Cine de medianoche E2E" })).toBeVisible();
  await expect(page.getByText("Un recorrido ficticio por historias nocturnas.")).toBeVisible();

  const stored = await readCollectionFixture(page);
  expect(stored.collection).toMatchObject({
    name: "Cine de medianoche E2E",
    description: "Un recorrido ficticio por historias nocturnas.",
    coverMovieId: "collection-movie-beta"
  });
  expect(stored.memberships.map((item) => item.movieId)).toEqual([
    "collection-movie-beta",
    "collection-movie-alpha"
  ]);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Cine de medianoche E2E" })).toBeVisible();
  await expect(page.getByText("Un recorrido ficticio por historias nocturnas.")).toBeVisible();
  await expect(page.locator(".collection-movie-card").first()
    .getByRole("button", { name: "Abrir ficha de Película Beta E2E" })).toBeVisible();

  await page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Eliminar colección" }).click();
  await expect(page).toHaveURL(/#\/personal\/collections$/);
  const afterDelete = await readCollectionFixture(page);
  expect(afterDelete.collection).toBeUndefined();
  expect(afterDelete.movies.map((movie) => movie.id)).toEqual([
    "collection-movie-alpha",
    "collection-movie-beta"
  ]);
});
