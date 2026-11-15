import { expect, test } from "@playwright/test";

test("crea una colección ficticia y la conserva al recargar", async ({ page }) => {
  // El contexto es temporal; ningún dato del navegador personal se utiliza.
  await page.goto("#/personal/collections");
  await expect(page.getByRole("heading", { name: "Colecciones" })).toBeVisible();

  await page.locator('button[aria-label="Crear colección"]').click();
  const createForm = page.locator("form.collection-create-panel");
  await expect(createForm).toBeVisible();
  await page.getByRole("textbox", { name: "Nombre de la colección" })
    .fill("Prisma E2E: colección ficticia");

  await createForm.getByRole("button", { name: "Crear colección" }).click();

  await expect(page).toHaveURL(/#\/personal\/collections\/[^/]+$/);
  await expect(page.getByRole("heading", { name: "Prisma E2E: colección ficticia" })).toBeVisible();
  await expect(page.getByText("Esta colección está vacía")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Prisma E2E: colección ficticia" })).toBeVisible();
  await expect(page.getByText("Esta colección está vacía")).toBeVisible();
});
