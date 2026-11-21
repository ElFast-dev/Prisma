import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 740, label: "móvil compacto" },
  { width: 375, height: 812, label: "móvil estándar" },
  { width: 768, height: 1024, label: "tableta" },
  { width: 1280, height: 800, label: "escritorio" }
];

for (const viewport of viewports) {
  test("no genera desbordamiento horizontal en " + viewport.label, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const routes: { path: string; heading?: string; activeNavigation?: string }[] = [
      { path: "#/personal", activeNavigation: "Personal" },
      { path: "#/spectro", activeNavigation: "Espectro" },
      { path: "#/personal/library", heading: "Biblioteca" },
      { path: "#/personal/collections", heading: "Colecciones" },
      { path: "#/settings", heading: "Ajustes" },
      { path: "#/settings/catalog", heading: "Catálogo" },
      { path: "#/settings/library", heading: "Biblioteca" },
      { path: "#/settings/data", heading: "Datos" },
      { path: "#/settings/privacy", heading: "Privacidad" }
    ];

    for (const route of routes) {
      await page.goto(route.path);

      if (route.activeNavigation) {
        const navigation = page.getByRole("navigation", { name: "Navegación principal" });
        await expect(navigation.getByRole("link", { name: route.activeNavigation, exact: true }))
          .toHaveAttribute("aria-current", "page");
        await expect(page.locator(".section-heading")).toHaveCount(0);
      } else if (route.heading) {
        await expect(page.getByRole("heading", { name: route.heading, exact: true })).toBeVisible();
      }

      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth
      }));
      expect(
        dimensions.documentWidth,
        "La página " + route.path + " desborda el ancho de " + viewport.width + " px."
      ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    }
  });
}


test("adapta la navegación principal a un rail lateral en escritorio", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("#/personal");
  const navigation = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(navigation).toBeVisible();
  const rail = await navigation.boundingBox();
  const main = await page.locator("main.main-content").boundingBox();
  const direction = await page.locator(".bottom-nav-pill").evaluate((element) => getComputedStyle(element).flexDirection);
  expect(rail).not.toBeNull();
  expect(main).not.toBeNull();
  expect(rail!.x).toBe(0);
  expect(rail!.y).toBe(0);
  expect(rail!.height).toBeGreaterThanOrEqual(799);
  expect(direction).toBe("column");
  expect(main!.x).toBeGreaterThan(rail!.width);
});
