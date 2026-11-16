import { expect, test } from "@playwright/test";
import { e2eMovie, seedLibraryMovie } from "./support/fixtures";

test("publica un manifiesto instalable y activa el Service Worker", async ({ page }) => {
  await page.goto("#/personal");

  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link?.href) throw new Error("No se encontró el manifiesto PWA.");

    const response = await fetch(link.href);
    if (!response.ok) throw new Error("El manifiesto respondió HTTP " + response.status);
    return response.json() as Promise<Record<string, unknown>>;
  });

  expect(manifest).toMatchObject({
    name: "Prisma",
    short_name: "Prisma",
    start_url: "/Prisma/#/",
    scope: "/Prisma/",
    display: "standalone"
  });

  await page.waitForFunction(
    () => navigator.serviceWorker.controller?.state === "activated",
    null,
    { timeout: 20_000 }
  );
});

test("recarga y conserva la Biblioteca local cuando no hay conexión", async ({ page }) => {
  await page.goto("#/personal/library");
  await expect(page.getByRole("heading", { name: "Biblioteca", exact: true })).toBeVisible();

  // La prueba requiere el Service Worker activo del build de producción.
  await page.waitForFunction(
    () => navigator.serviceWorker.controller?.state === "activated",
    null,
    { timeout: 20_000 }
  );

  // Semilla ficticia en la IndexedDB desechable del contexto Playwright.
  await seedLibraryMovie(page);
  await page.context().setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Biblioteca", exact: true })).toBeVisible();
  await expect(page.getByText(/Sin conexión/)).toBeVisible();
  await expect(page.getByText(e2eMovie.title, { exact: true })).toBeVisible();

  // La navegación SPA también debe continuar disponible sin red.
  await page.goto("#/personal");
  await expect(page.getByRole("heading", { name: "Personal", exact: true })).toBeVisible();
});
