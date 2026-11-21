import { expect, test } from "@playwright/test";

test("carga cada experiencia principal bajo demanda al navegar", async ({ page }) => {
  const featureModules = new Set<string>();
  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.includes("/src/features/")) featureModules.add(pathname);
  });

  await page.goto("#/personal");
  await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();
  expect([...featureModules].some((path) => path.endsWith("/features/personal/PersonalPages.tsx"))).toBe(true);
  expect([...featureModules].some((path) => path.endsWith("/features/spectro/SpectroPage.tsx"))).toBe(false);

  await page.getByRole("link", { name: "Espectro", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Espectro", exact: true })).toBeVisible();
  expect([...featureModules].some((path) => path.endsWith("/features/spectro/SpectroPage.tsx"))).toBe(true);

  await page.getByRole("link", { name: "Descubrir", exact: true }).click();
  await expect(page.locator("#discover-search")).toBeVisible();
  expect([...featureModules].some((path) => path.endsWith("/features/discover/DiscoverPage.tsx"))).toBe(true);
});

test("muestra un estado accesible al descargar una sección diferida", async ({ page }) => {
  await page.goto("#/personal");
  await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();

  await page.route("**/src/features/spectro/SpectroPage.tsx*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });

  await page.getByRole("link", { name: "Espectro", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Abriendo Espectro" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Espectro", exact: true })).toBeVisible();
});
