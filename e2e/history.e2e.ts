import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Cada prueba usa un contexto de navegador nuevo y una IndexedDB vacía.
  await page.goto("#/personal");
  await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();
});

async function openHistory(page: import("@playwright/test").Page) {
  await page.getByRole("link", { name: /Historial/ }).click();
  await expect(page.getByRole("heading", { name: "Historial" })).toBeVisible();
}

test("permite entrar a Historial y consultar su estado inicial", async ({ page }) => {
  await openHistory(page);

  await expect(page).toHaveURL(/#\/personal\/history$/);
  await expect(page.getByRole("heading", { name: "Historial" })).toBeVisible();
  await expect(page.getByText("Todavía no hay visionados")).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir filtros" })).toBeVisible();
  await expect(page.locator(".section-heading .eyebrow")).toHaveCount(0);
  await expect(page.getByText("CRONOLOGÍA COMPLETA")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tus experiencias" })).toHaveCount(0);

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros del historial" });
  await expect(dialog.getByRole("group", { name: "Vista del historial" }).getByRole("button", { name: "Cronología" })).toBeVisible();
  await expect(dialog.getByRole("group", { name: "Vista del historial" }).getByRole("button", { name: "Calendario" })).toBeVisible();
  await expect(dialog.getByRole("group", { name: "Orden cronológico" }).getByRole("button", { name: "Más recientes primero" })).toBeVisible();
  await expect(dialog.getByRole("group", { name: "Orden cronológico" }).getByRole("button", { name: "Más antiguos primero" })).toBeVisible();
});

test("abre, cambia y restablece los filtros del Historial", async ({ page }) => {
  await openHistory(page);

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros del historial" });
  await expect(dialog).toBeVisible();

  const withNotes = dialog.getByRole("button", { name: "Con nota" });
  await withNotes.click();
  await expect(withNotes).toHaveAttribute("aria-pressed", "true");
  const oldest = dialog.getByRole("group", { name: "Orden cronológico" }).getByRole("button", { name: "Más antiguos primero" });
  await oldest.click();
  await expect(oldest).toHaveAttribute("aria-pressed", "true");

  await dialog.getByRole("button", { name: "Restablecer" }).click();
  await expect(dialog.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByRole("group", { name: "Vista del historial" }).getByRole("button", { name: "Cronología" })).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByRole("group", { name: "Orden cronológico" }).getByRole("button", { name: "Más recientes primero" })).toHaveAttribute("aria-pressed", "true");

  await dialog.getByRole("button", { name: "Ver 0 resultados" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Todavía no hay visionados")).toBeVisible();
});

test("permite cambiar a Calendario y seleccionar un día", async ({ page }) => {
  await openHistory(page);

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros del historial" });
  await dialog.getByRole("group", { name: "Vista del historial" }).getByRole("button", { name: "Calendario" }).click();
  await dialog.getByRole("button", { name: /Ver \d+ resultados/ }).click();

  const calendar = page.getByRole("grid", { name: /Calendario de/ });
  await expect(calendar).toBeVisible();

  const firstDay = calendar.getByRole("button").first();
  await firstDay.click();
  await expect(firstDay).toHaveAttribute("aria-pressed", "true");
});

async function readTemporaryPreferences(page: import("@playwright/test").Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("prisma_database");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    try {
      return await new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
        const transaction = db.transaction("preferences", "readonly");
        const request = transaction.objectStore("preferences").get("local");
        request.onsuccess = () => resolve(request.result as Record<string, unknown> | undefined);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  });
}

test("restaura modo, orden, fecha y filtros del Historial después de recargar", async ({ page }) => {
  await openHistory(page);

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const preferencesDialog = page.getByRole("dialog", { name: "Filtros del historial" });
  await preferencesDialog.getByRole("group", { name: "Vista del historial" }).getByRole("button", { name: "Calendario" }).click();
  await preferencesDialog.getByRole("group", { name: "Orden cronológico" }).getByRole("button", { name: "Más antiguos primero" }).click();
  await preferencesDialog.getByRole("button", { name: /Ver \d+ resultados/ }).click();
  await page.getByRole("button", { name: "Mes anterior" }).click();

  const calendar = page.getByRole("grid", { name: /Calendario de/ });
  const calendarLabel = await calendar.getAttribute("aria-label");
  const selectedDay = calendar.getByRole("button").first();
  const selectedDayLabel = await selectedDay.getAttribute("aria-label");
  const selectedDate = selectedDayLabel?.split(",")[0];
  await selectedDay.click();
  await expect(selectedDay).toHaveAttribute("aria-pressed", "true");

  await page.locator("#history-search").fill("Prueba de persistencia");
  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros del historial" });
  const withNotes = dialog.getByRole("button", { name: "Con nota" });
  await withNotes.click();
  await expect(withNotes).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Ver 0 resultados" }).click();
  await expect(dialog).toBeHidden();

  await expect.poll(async () => {
    const preferences = await readTemporaryPreferences(page);
    const browse = preferences?.historyBrowse as Record<string, unknown> | undefined;
    const filters = preferences?.historyFilters as Record<string, unknown> | undefined;
    return {
      viewMode: browse?.viewMode,
      sortOrder: browse?.sortOrder,
      month: browse?.month,
      selectedDate: browse?.selectedDate,
      query: filters?.query,
      notes: filters?.notes
    };
  }).toEqual({
    viewMode: "calendar",
    sortOrder: "oldest",
    month: selectedDayLabel?.slice(0, 7),
    selectedDate,
    query: "Prueba de persistencia",
    notes: "with-notes"
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: "Historial" })).toBeVisible();
  await expect(page.locator("#history-search")).toHaveValue("Prueba de persistencia");
  await expect(page.getByRole("grid", { name: calendarLabel ?? "" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const restoredViewDialog = page.getByRole("dialog", { name: "Filtros del historial" });
  await expect(restoredViewDialog.getByRole("group", { name: "Vista del historial" }).getByRole("button", { name: "Calendario" })).toHaveAttribute("aria-pressed", "true");
  await expect(restoredViewDialog.getByRole("group", { name: "Orden cronológico" }).getByRole("button", { name: "Más antiguos primero" })).toHaveAttribute("aria-pressed", "true");
  await restoredViewDialog.getByRole("button", { name: /Ver \d+ resultados/ }).click();

  const restoredDay = page.getByRole("grid", { name: calendarLabel ?? "" })
    .getByRole("button", { name: selectedDayLabel ?? "" });
  await expect(restoredDay).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const restoredDialog = page.getByRole("dialog", { name: "Filtros del historial" });
  await expect(restoredDialog.getByRole("button", { name: "Con nota" })).toHaveAttribute("aria-pressed", "true");
});
