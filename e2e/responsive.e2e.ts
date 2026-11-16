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

    for (const [path, heading] of [
      ["#/personal", "Personal"],
      ["#/personal/library", "Biblioteca"],
      ["#/personal/collections", "Colecciones"],
      ["#/settings", "Ajustes"]
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();

      const dimensions = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth
      }));
      expect(
        dimensions.documentWidth,
        "La página " + path + " desborda el ancho de " + viewport.width + " px."
      ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    }
  });
}
