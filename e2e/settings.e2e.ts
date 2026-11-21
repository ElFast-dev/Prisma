import { expect, test } from "@playwright/test";

test("Ajustes organiza sus opciones en secciones independientes", async ({ page }) => {
  await page.goto("#/settings");

  await expect(page.getByRole("heading", { name: "Ajustes", exact: true })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Secciones de Ajustes" });
  await expect(navigation.getByRole("link", { name: /Catálogo/ })).toBeVisible();
  await expect(navigation.getByRole("link", { name: /Biblioteca/ })).toBeVisible();
  await expect(navigation.getByRole("link", { name: /Datos/ })).toBeVisible();
  await expect(navigation.getByRole("link", { name: /Privacidad/ })).toBeVisible();
  await expect(page.getByLabel("API Read Access Token")).toHaveCount(0);

  await navigation.getByRole("link", { name: /Catálogo/ }).click();
  await expect(page.getByRole("heading", { name: "Catálogo", exact: true })).toBeVisible();
  await expect(page.getByLabel("API Read Access Token")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Metadatos de Biblioteca" })).toBeVisible();
  await expect(page.getByText(/Prisma iniciará las actualizaciones automáticamente/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar enriquecimiento" })).toHaveCount(0);

  await page.getByRole("button", { name: "Volver a Ajustes" }).click();
  await navigation.getByRole("link", { name: /Biblioteca/ }).click();
  await expect(page.getByRole("heading", { name: "Biblioteca", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Modo de presentación de Biblioteca" })).toBeVisible();
  await expect(page.getByLabel("API Read Access Token")).toHaveCount(0);

  await page.getByRole("button", { name: "Volver a Ajustes" }).click();
  await navigation.getByRole("link", { name: /Datos/ }).click();
  await expect(page.getByRole("heading", { name: "Datos", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Crear copia de seguridad Prisma" })).toBeVisible();
  await expect(page.getByText("Importar desde otra aplicación")).toBeVisible();

  await page.getByRole("button", { name: "Volver a Ajustes" }).click();
  await navigation.getByRole("link", { name: /Privacidad/ }).click();
  await expect(page.getByRole("heading", { name: "Privacidad", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Credencial TMDB" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Datos locales" })).toBeVisible();
});

test("la vista de Biblioteca se puede cambiar desde sus ajustes", async ({ page }) => {
  await page.goto("#/settings/library");
  await expect(page.getByRole("heading", { name: "Biblioteca", exact: true })).toBeVisible();

  const grid = page.getByRole("button", { name: /Cuadrícula/ });
  await expect(grid).toBeEnabled();
  await grid.click();
  await expect(grid).toHaveAttribute("aria-pressed", "true");
});


test("restablecer Prisma borra los datos locales y conserva TMDB por defecto", async ({ page }) => {
  let tmdbRequests = 0;
  await page.route("https://api.themoviedb.org/3/**", async (route) => {
    tmdbRequests += 1;
    await route.abort();
  });
  await page.goto("#/settings/data");
  await expect(page.getByRole("heading", { name: "Datos", exact: true })).toBeVisible();
  // Añade la credencial tras el arranque para no iniciar enriquecimientos sobre los datos del test.
  await page.evaluate(() => localStorage.setItem("prisma.tmdb.accessToken", "token-ficticio-de-prueba"));

  await page.evaluate(async () => {
    const request = indexedDB.open("prisma_database");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const stores = [
      "movies", "libraryEntries", "viewings", "collections", "collectionMovies",
      "profile", "preferences", "catalogCache", "availabilityCache", "peopleCache",
      "spectroSnapshots", "appMetadata"
    ];
    const transaction = db.transaction(stores, "readwrite");
    const now = new Date().toISOString();
    transaction.objectStore("movies").put({
      id: "tmdb-987654", tmdbId: 987654, title: "Película ficticia",
      genres: [], countries: [], lastViewingSequence: 1, createdAt: now, updatedAt: now
    });
    transaction.objectStore("libraryEntries").put({
      movieId: "tmdb-987654", status: "watched", isFavorite: true, addedAt: now, updatedAt: now
    });
    transaction.objectStore("viewings").put({
      id: "viewing-test", movieId: "tmdb-987654", sequenceNumber: 1, watchedOn: "2026-01-01",
      rating: 8, createdAt: now, updatedAt: now, operationId: "manual-test"
    });
    transaction.objectStore("collections").put({ id: "collection-test", name: "Prueba", createdAt: now, updatedAt: now });
    transaction.objectStore("collectionMovies").put({
      id: "membership-test", collectionId: "collection-test", movieId: "tmdb-987654", position: 0, addedAt: now
    });
    transaction.objectStore("profile").put({ id: "local", name: "Perfil de prueba", updatedAt: now });
    transaction.objectStore("preferences").put({ id: "local", theme: "dark", language: "es", region: "PA", libraryView: "grid", updatedAt: now });
    transaction.objectStore("catalogCache").put({ cacheKey: "test-cache", resourceType: "movie", payload: {}, fetchedAt: now });
    transaction.objectStore("availabilityCache").put({ id: "availability-test", movieId: "tmdb-987654", region: "PA", providers: [], lastFetchedAt: now });
    transaction.objectStore("peopleCache").put({ tmdbPersonId: 654321, name: "Persona ficticia", fetchedAt: now });
    transaction.objectStore("spectroSnapshots").put({ id: "snapshot-test", algorithmVersion: "test", inputFingerprint: "test", computedAt: now, analysisPayload: {} });
    transaction.objectStore("appMetadata").put({ key: "internal-test", value: "preserve" });
    transaction.objectStore("appMetadata").put({
      key: "library-enrichment:queue:v1",
      value: JSON.stringify({ version: 1, status: "completed", total: 1, processed: 1, updatedAt: now })
    });
    transaction.objectStore("appMetadata").put({
      key: "library-enrichment:movie:987654",
      value: JSON.stringify({ tmdbId: 987654, status: "complete", attempts: 1, updatedAt: now })
    });
    transaction.objectStore("appMetadata").put({
      key: "spectro:metadata:v1:987654",
      value: JSON.stringify({ tmdbId: 987654, status: "complete", attempts: 1, updatedAt: now })
    });

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("La preparación de prueba se canceló."));
    });
    db.close();
  });

  await page.getByRole("button", { name: "Empezar de cero" }).click();
  const dialog = page.getByRole("dialog", { name: "Restablecer Prisma" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("1");
  await expect(dialog.getByRole("button", { name: "Borrar definitivamente" })).toBeDisabled();

  await dialog.getByLabel("Escribe BORRAR para confirmar").fill("BORRAR");
  await dialog.getByRole("button", { name: "Borrar definitivamente" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Prisma está limpio");

  const state = await page.evaluate(async () => {
    const request = indexedDB.open("prisma_database");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const stores = [
      "movies", "libraryEntries", "viewings", "collections", "collectionMovies",
      "profile", "preferences", "catalogCache", "availabilityCache", "peopleCache", "spectroSnapshots"
    ];
    const transaction = db.transaction([...stores, "appMetadata"], "readonly");
    const counts = await Promise.all(stores.map((name) => new Promise<number>((resolve, reject) => {
      const count = transaction.objectStore(name).count();
      count.onsuccess = () => resolve(count.result);
      count.onerror = () => reject(count.error);
    })));
    const metadataStore = transaction.objectStore("appMetadata");
    const metadataKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = metadataStore.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const metadataCount = metadataKeys.length;
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
    return { counts, metadataCount, metadataKeys: metadataKeys.map(String), tmdbToken: localStorage.getItem("prisma.tmdb.accessToken") };
  });

  expect(state.counts.every((count) => count === 0)).toBe(true);
  expect(state.metadataKeys).toContain("internal-test");
  expect(state.metadataKeys.filter((key) => key.startsWith("library-enrichment:"))).toEqual([
    "library-enrichment:queue:v1"
  ]);
  expect(state.metadataKeys.some((key) => key.startsWith("spectro:metadata:v1:"))).toBe(false);
  expect(state.metadataCount).toBe(2);
  expect(state.tmdbToken).toBe("token-ficticio-de-prueba");
  expect(tmdbRequests).toBe(0);
});

test("el restablecimiento permite eliminar también la credencial TMDB", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("prisma.tmdb.accessToken", "token-ficticio-de-prueba");
  });
  await page.goto("#/settings/data");
  await page.getByRole("button", { name: "Empezar de cero" }).click();

  const dialog = page.getByRole("dialog", { name: "Restablecer Prisma" });
  await expect(dialog.getByLabel("Eliminar también la credencial TMDB guardada en este navegador.")).toBeVisible();
  await dialog.getByLabel("Eliminar también la credencial TMDB guardada en este navegador.").check();
  await dialog.getByLabel("Escribe BORRAR para confirmar").fill("BORRAR");
  await dialog.getByRole("button", { name: "Borrar definitivamente" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("También se eliminó la credencial TMDB");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("prisma.tmdb.accessToken"))).toBeNull();
});


test("permite solicitar persistencia del almacenamiento cuando hay datos locales", async ({ page }) => {
  await page.addInitScript(() => {
    let persisted = false;
    Object.defineProperty(navigator, "storage", {
      configurable: true,
      value: {
        persisted: async () => persisted,
        estimate: async () => ({ usage: 512000, quota: 10485760 }),
        persist: async () => {
          persisted = true;
          return true;
        }
      }
    });
  });

  await page.goto("#/settings/data");
  await page.evaluate(async () => {
    const request = indexedDB.open("prisma_database");
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const now = new Date().toISOString();
    const transaction = db.transaction(["movies", "libraryEntries"], "readwrite");
    transaction.objectStore("movies").put({
      id: "tmdb-storage-fixture", tmdbId: 987650, title: "Película local de prueba",
      genres: [], countries: [], lastViewingSequence: 0, createdAt: now, updatedAt: now
    });
    transaction.objectStore("libraryEntries").put({
      movieId: "tmdb-storage-fixture", status: "pending", isFavorite: false, addedAt: now, updatedAt: now
    });
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error("No se pudieron preparar los datos locales."));
    });
    db.close();
  });

  await page.goto("#/settings/privacy");
  const section = page.getByRole("region", { name: "Protección de datos locales" });
  await expect(section).toBeVisible();
  await expect(section.getByText(/almacenamiento todavía no tiene protección persistente/i)).toBeVisible();
  await expect(section.getByText(/Uso estimado: 500 KB de 10 MB/)).toBeVisible();

  await section.getByRole("button", { name: "Solicitar protección del almacenamiento" }).click();
  await expect(section.locator(".storage-protection-feedback")).toContainText("El navegador concedió almacenamiento persistente");
  await expect(section.getByRole("button", { name: "Solicitar protección del almacenamiento" })).toHaveCount(0);
});
