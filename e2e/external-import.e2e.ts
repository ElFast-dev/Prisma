import { expect, test } from "@playwright/test";

const externalBackup = {
  version: 2,
  platform: "android",
  createdAt: "2026-11-15T06:34:55.463Z",
  movies: {
    cH: [
      { id: 91001, tmId: 990001, t: "Película importada sin nota", a: "2025-11-06T00:22:23.302Z" },
      { id: 91002, tmId: 990002, t: "Película importada con nota", a: "2025-11-07T00:22:23.302Z" }
    ],
    cW: [
      { id: 91003, tmId: 990003, t: "Película importada pendiente", a: "2025-11-08T08:22:00.252Z" }
    ],
    rM: [
      { id: 91002, tmId: 990002, r: 8, rA: "2026-11-15T06:33:31.920Z" }
    ]
  }
};

async function importBackup(page: import("@playwright/test").Page) {
  await page.goto("#/settings/data");
  await page.locator("#external-movie-backup-file").setInputFiles({
    name: "respaldo-android.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(externalBackup))
  });

  const dialog = page.getByRole("dialog", { name: "Prioridad de importación" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Película importada sin nota")).toHaveCount(0);
  await expect(dialog.getByText("2")).toBeVisible();
  await dialog.getByRole("button", { name: "Priorizar archivo JSON" }).click();
  await expect(page.getByRole("status").getByText(/Importación completada/)).toBeVisible();
}

test("importa experiencias sin calificación, permite eliminarlas y evita duplicados al reimportar", async ({ page }) => {
  await importBackup(page);
  await page.goto("#/personal/history");

  await expect(page.getByText("Sin calificar")).toBeVisible();
  await expect(page.getByText("8/10")).toBeVisible();
  await expect(page.getByText("Película importada pendiente")).toHaveCount(0);

  await importBackup(page);
  await expect(page.getByRole("status").getByText(/0 experiencias nuevas/)).toBeVisible();

  await page.goto("#/personal/history");
  await expect(page.getByText("Sin calificar")).toHaveCount(1);
  await expect(page.getByText("8/10")).toHaveCount(1);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", {
    name: "Eliminar visionado 1 de Película importada sin nota"
  }).click();
  await expect(page.getByText("Sin calificar")).toHaveCount(0);
  await expect(page.getByText("8/10")).toHaveCount(1);
});
