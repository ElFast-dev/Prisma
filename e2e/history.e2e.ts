import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Cada prueba usa un contexto de navegador nuevo y una IndexedDB vacía.
  await page.goto("#/personal");
  await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();
});

test("permite entrar a Historial y consultar su estado inicial", async ({ page }) => {
  await page.getByRole("link", { name: /Historial/ }).click();

  await expect(page).toHaveURL(/#\/personal\/history$/);
  await expect(page.getByRole("heading", { name: "Historial" })).toBeVisible();
  await expect(page.getByText("Todavía no hay visionados")).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir filtros" })).toBeVisible();

  // La versión 2.0 presenta estos controles en línea; la anterior los agrupaba
  // en un panel. Ambas interfaces deben seguir ofreciendo cambio de calendario.
  const inlineExplorer = page.getByRole("group", {
    name: "Modo de exploración del Historial"
  });
  if (await inlineExplorer.count()) {
    await expect(inlineExplorer.getByRole("button", { name: "Cronología" })).toBeVisible();
    await expect(inlineExplorer.getByRole("button", { name: "Calendario" })).toBeVisible();
  } else {
    await expect(page.getByRole("button", {
      name: "Abrir ajustes de visualización"
    })).toBeVisible();
  }
});

test("abre, cambia y restablece los filtros del Historial", async ({ page }) => {
  await page.getByRole("link", { name: /Historial/ }).click();

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros del historial" });
  await expect(dialog).toBeVisible();

  const withNotes = dialog.getByRole("button", { name: "Con nota" });
  await withNotes.click();
  await expect(withNotes).toHaveAttribute("aria-pressed", "true");

  await dialog.getByRole("button", { name: "Restablecer" }).click();
  await expect(dialog.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");

  await dialog.getByRole("button", { name: "Ver 0 resultados" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Todavía no hay visionados")).toBeVisible();
});

test("permite cambiar a Calendario y seleccionar un día", async ({ page }) => {
  await page.getByRole("link", { name: /Historial/ }).click();

  const inlineExplorer = page.getByRole("group", {
    name: "Modo de exploración del Historial"
  });
  if (await inlineExplorer.count()) {
    await inlineExplorer.getByRole("button", { name: "Calendario" }).click();
  } else {
    await page.getByRole("button", { name: "Abrir ajustes de visualización" }).click();
    const dialog = page.getByRole("dialog", { name: "Vista del historial" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: /Calendario/ }).click();
    await dialog.getByRole("button", { name: "Listo" }).click();
  }

  const calendar = page.getByRole("grid", { name: /Calendario de/ });
  await expect(calendar).toBeVisible();

  const firstDay = calendar.getByRole("button").first();
  await firstDay.click();
  await expect(firstDay).toHaveAttribute("aria-pressed", "true");
});
