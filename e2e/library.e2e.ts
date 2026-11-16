import { expect, test } from "@playwright/test";
import { e2eMovie, seedLibraryMovie } from "./support/fixtures";

test("busca y filtra una película local sin consultar TMDB", async ({ page }) => {
  await page.goto("#/personal/library");
  await expect(page.getByRole("heading", { name: "Biblioteca", exact: true })).toBeVisible();
  await expect(page.getByText("Tu biblioteca está esperando sus primeras películas")).toBeVisible();

  await seedLibraryMovie(page);
  await page.reload();

  const movieLink = page.locator(".library-list-item").filter({
    hasText: e2eMovie.title
  });
  await expect(movieLink).toBeVisible();
  await expect(movieLink).toContainText("Pendiente");
  await expect(movieLink).toContainText("Favorita");

  await page.locator("#library-search").fill("ficticia de prisma");
  await expect(movieLink).toBeVisible();
  await expect(page.getByText("1 de 1 películas")).toBeVisible();

  await page.locator("#library-search").fill("título que no existe");
  await expect(page.getByText("No hay películas con estos filtros")).toBeVisible();

  await page.locator("#library-search").fill("");
  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros de Biblioteca" });
  await expect(dialog).toBeVisible();
  const pending = dialog.getByRole("group", {
    name: "Estado personal en Biblioteca"
  }).getByRole("button", { name: "Pendientes" });
  await pending.click();
  await expect(pending).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();

  await expect(page.locator(".library-list-item")).toHaveCount(1);
  await expect(page.getByText("1 de 1 películas")).toBeVisible();

  await page.locator(".library-list-item").click();
  await expect(page).toHaveURL(/#\/movie\/987654$/);
  await expect(page.getByText("Conecta TMDB para consultar esta película")).toBeVisible();
});
