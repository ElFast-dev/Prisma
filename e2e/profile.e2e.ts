import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Cada prueba usa un contexto nuevo con IndexedDB aislada.
  await page.goto("#/personal");
  const navigation = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(navigation.getByRole("link", { name: "Mi cine", exact: true }))
    .toHaveAttribute("aria-current", "page");
  await expect(page.locator(".section-heading")).toHaveCount(0);
});

async function seedCinematicHistory(page: import("@playwright/test").Page) {
  const dates = await page.evaluate(() => {
    const toLocalDate = (date: Date) => {
      const year = String(date.getFullYear()).padStart(4, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return year + "-" + month + "-" + day;
    };
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    return { today: toLocalDate(today), yesterday: toLocalDate(yesterday) };
  });

  await page.evaluate(async ({ today, yesterday }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const now = "2026-11-15T12:00:00.000Z";
    const movies = [
      {
        id: "e2e-profile-movie-1",
        tmdbId: 987651,
        title: "Historia ficticia uno",
        releaseYear: 1994,
        genres: ["Drama", "Thriller"],
        countries: ["Panamá"],
        directors: ["Directora ficticia"],
        runtimeMinutes: 110,
        lastViewingSequence: 2,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "e2e-profile-movie-2",
        tmdbId: 987652,
        title: "Historia ficticia dos",
        releaseYear: 2008,
        genres: ["Drama", "Ciencia ficción"],
        countries: ["Panamá", "México"],
        directors: ["Directora ficticia", "Director ficticio dos"],
        runtimeMinutes: 95,
        lastViewingSequence: 1,
        createdAt: now,
        updatedAt: now
      }
    ];
    const viewings = [
      { id: "e2e-profile-view-1", movieId: movies[0].id, sequenceNumber: 1, watchedOn: today, rating: 9, createdAt: now, updatedAt: now, operationId: "e2e-profile-op-1" },
      { id: "e2e-profile-view-2", movieId: movies[0].id, sequenceNumber: 2, watchedOn: today, rating: 10, createdAt: now, updatedAt: now, operationId: "e2e-profile-op-2" },
      { id: "e2e-profile-view-3", movieId: movies[1].id, sequenceNumber: 1, watchedOn: yesterday, rating: 8, createdAt: now, updatedAt: now, operationId: "e2e-profile-op-3" }
    ];
    const collection = {
      id: "e2e-profile-collection",
      name: "Selección de prueba",
      createdAt: now,
      updatedAt: now
    };

    const transaction = db.transaction(["movies", "viewings", "collections"], "readwrite");
    for (const movie of movies) transaction.objectStore("movies").put(movie);
    for (const viewing of viewings) transaction.objectStore("viewings").put(viewing);
    transaction.objectStore("collections").put(collection);

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("No se pudieron preparar los datos ficticios."));
    });
    db.close();
  }, dates);
}

test("presenta la huella cinematográfica a partir de visionados y películas locales", async ({ page }) => {
  await seedCinematicHistory(page);
  await page.goto("#/personal/profile");

  await expect(page.getByRole("heading", { name: "Mi perfil" })).toBeVisible();
  await expect(page.locator(".metric-card").first()).toContainText("2");
  await expect(page.getByRole("heading", { name: "Afinidades" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Géneros más vistos" })).toBeVisible();
  await expect(page.getByText("Drama", { exact: true })).toBeVisible();
  await expect(page.getByText("Años 1990", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Directores más vistos" })).toBeVisible();
  await expect(page.getByText("Directora ficticia", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Países de producción" })).toBeVisible();
  await expect(page.getByText("Panamá", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Actividad reciente" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Actividad de los últimos seis meses/ })).toBeVisible();
  await expect(page.locator(".achievement-count")).toHaveText("1/13 desbloqueados");
});

test("permite editar la identidad local y conservarla al recargar", async ({ page }) => {
  await page.goto("#/personal/profile");
  await page.getByRole("button", { name: "Editar perfil" }).click();

  await page.locator("#profile-name").fill("Cinéfilo de Prisma");
  await page.locator("#profile-description").fill("Una vida entre historias y grandes películas.");
  await page.locator("#profile-phrase").fill("Cada película deja una huella.");
  await page.getByRole("button", { name: "Guardar perfil" }).click();

  await expect(page.getByRole("heading", { name: "Cinéfilo de Prisma" })).toBeVisible();
  await expect(page.getByText("Cada película deja una huella.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Cinéfilo de Prisma" })).toBeVisible();
  await expect(page.getByText("Una vida entre historias y grandes películas.")).toBeVisible();
});


test("separa el resumen de perfil de los accesos de Biblioteca", async ({ page }) => {
  const profile = await page.locator(".profile-summary").boundingBox();
  const firstNavigationCard = await page.locator(".navigation-cards .navigation-card").first().boundingBox();

  expect(profile).not.toBeNull();
  expect(firstNavigationCard).not.toBeNull();
  expect(firstNavigationCard!.y - (profile!.y + profile!.height)).toBeGreaterThanOrEqual(18);
});

test("Mi cine y Espectro se identifican desde la navegación inferior sin cabeceras duplicadas", async ({ page }) => {
  for (const [path, activeLabel] of [["#/personal", "Mi cine"], ["#/spectro", "Espectro"]]) {
    await page.goto(path);
    const navigation = page.getByRole("navigation", { name: "Navegación principal" });
    await expect(navigation.getByRole("link", { name: activeLabel, exact: true }))
      .toHaveAttribute("aria-current", "page");
    await expect(page.locator(".section-heading")).toHaveCount(0);
  }
});
