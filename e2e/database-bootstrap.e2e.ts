import { expect, test } from "@playwright/test";

test("muestra recuperación si IndexedDB falla al iniciar y permite reintentar", async ({ page }) => {
  await page.addInitScript(() => {
    const factory = window.indexedDB;
    const originalOpen = factory.open.bind(factory);
    let failFirstAttempt = true;

    Object.defineProperty(factory, "open", {
      configurable: true,
      value: (...args: Parameters<IDBFactory["open"]>) => {
        if (failFirstAttempt) {
          failFirstAttempt = false;
          throw new DOMException("Storage is unavailable", "SecurityError");
        }
        return originalOpen(...args);
      }
    });
  });

  await page.goto("#/discover");

  await expect(page.getByRole("heading", {
    name: "No se pudo abrir el almacenamiento local"
  })).toBeVisible();
  await expect(page.getByText(/no ha borrado ni reconstruido/i)).toBeVisible();

  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.locator("#discover-search")).toBeVisible();
});
