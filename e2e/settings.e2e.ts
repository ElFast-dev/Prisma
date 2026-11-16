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
  await expect(page.getByRole("heading", { name: "Enriquecer Biblioteca" })).toBeVisible();

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
