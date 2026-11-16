import { expect, test } from "@playwright/test";

test("Ajustes se presenta como una sola página sin botones de salto superiores", async ({ page }) => {
  await page.goto("#/settings");

  await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Subsecciones de Ajustes" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Catálogo cinematográfico" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Presentación de Biblioteca" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Copias de seguridad y migración" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Privacidad de la credencial" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tu historia permanece contigo" })).toBeVisible();
});
