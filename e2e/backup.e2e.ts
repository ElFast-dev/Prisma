import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { e2eMovie, removeLibraryMovieFixture, seedLibraryMovie } from "./support/fixtures";

test("exporta y restaura una copia Prisma ficticia en el navegador aislado", async ({ page }) => {
  await page.goto("#/personal");
  await expect(page.getByRole("heading", { name: "Personal" })).toBeVisible();
  await seedLibraryMovie(page);

  await page.goto("#/settings");
  await expect(page.getByRole("heading", { name: "Ajustes" })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Crear copia de seguridad Prisma" }).click()
  ]);
  expect(download.suggestedFilename()).toMatch(/^prisma-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const backupContent = await readFile(downloadPath!, "utf8");
  const backup = JSON.parse(backupContent) as {
    format: string;
    formatVersion: number;
    data: { movies: Array<{ id: string; title: string }>; libraryEntries: unknown[] };
  };

  expect(backup.format).toBe("prisma-local-backup");
  expect(backup.formatVersion).toBe(1);
  expect(backup.data.movies).toContainEqual(expect.objectContaining({
    id: e2eMovie.id,
    title: e2eMovie.title
  }));
  expect(backup.data.libraryEntries).toHaveLength(1);
  await expect(page.getByRole("status").getByText(/Copia Prisma creada/)).toBeVisible();

  // Simula pérdida de los datos dentro de esta IndexedDB desechable.
  await removeLibraryMovieFixture(page);
  await page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("1 películas");
    await dialog.accept();
  });
  await page.locator("#prisma-backup-file").setInputFiles(downloadPath!);

  await expect(page.getByRole("status").getByText(/Restauración Prisma completada/)).toBeVisible();
  await page.goto("#/personal/library");
  await expect(page.locator(".library-list-item").filter({ hasText: e2eMovie.title })).toBeVisible();
});
