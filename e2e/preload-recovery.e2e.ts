import { expect, test } from "@playwright/test";

test("recarga una vez ante un error de importación dinámica de Vite", async ({ page }) => {
  await page.goto("#/discover");
  await expect(page.locator("#discover-search")).toBeVisible();

  const reload = page.waitForEvent("framenavigated", (frame) => frame === page.mainFrame());
  void page.evaluate(() => {
    const event = new Event("vite:preloadError", { cancelable: true });
    window.dispatchEvent(event);
  }).catch(() => {
    // La navegación puede destruir el contexto de evaluación, que es lo esperado.
  });

  await reload;
  await expect(page.locator("#discover-search")).toBeVisible();
});
