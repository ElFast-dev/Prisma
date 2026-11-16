import { expect, test, type Route } from "@playwright/test";

const movieId = 512345;
const movieTitle = "Película ficticia de integración";

const details = {
  id: movieId,
  title: movieTitle,
  original_title: "Prisma Integration Test",
  overview: "Una historia ficticia para comprobar la ficha cinematográfica, el registro de experiencias y las colecciones.",
  release_date: "2024-05-01",
  poster_path: null,
  backdrop_path: null,
  runtime: 120,
  status: "Released",
  genres: [{ id: 18, name: "Drama" }],
  production_countries: [{ iso_3166_1: "PA", name: "Panamá" }],
  original_language: "es",
  vote_average: 7.4
};

async function mockTmdb(route: Route): Promise<void> {
  const pathname = new URL(route.request().url()).pathname;
  let payload: unknown;

  if (pathname.endsWith("/configuration")) {
    payload = {
      images: {
        secure_base_url: "https://image.tmdb.org/t/p/",
        poster_sizes: ["w185", "w342"],
        backdrop_sizes: ["w780", "w1280"],
        profile_sizes: ["w185"]
      }
    };
  } else if (pathname.endsWith("/movie/" + movieId + "/credits")) {
    payload = {
      cast: [],
      crew: [{
        id: 765,
        name: "Directora ficticia",
        job: "Director",
        department: "Directing",
        profile_path: null
      }]
    };
  } else if (pathname.endsWith("/movie/" + movieId + "/recommendations")) {
    payload = { page: 1, results: [], total_pages: 1, total_results: 0 };
  } else if (pathname.endsWith("/movie/" + movieId + "/watch/providers")) {
    payload = { id: movieId, results: {} };
  } else if (pathname.endsWith("/movie/" + movieId)) {
    payload = details;
  } else {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ status_message: "No existe una ruta TMDB simulada para esta prueba." })
    });
    return;
  }

  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload)
  });
}

test("abre una ficha, registra un visionado y crea una colección local", async ({ page }) => {
  await page.addInitScript(() => {
    // Credencial ficticia: todas las llamadas externas quedan interceptadas.
    window.localStorage.setItem("prisma.tmdb.accessToken", "playwright-fake-token");
  });
  await page.route("https://api.themoviedb.org/3/**", mockTmdb);

  await page.goto("#/movie/" + movieId);

  await expect(page.getByRole("heading", { name: movieTitle })).toBeVisible();
  await expect(page.getByText("2024 · Drama · 2h 00m")).toBeVisible();
  await expect(page.getByText(details.overview)).toBeVisible();

  await page.getByRole("button", { name: "Agregar a Vistas" }).click();
  const viewingDialog = page.getByRole("dialog", { name: "Registrar visionado" });
  await expect(viewingDialog).toBeVisible();
  await viewingDialog.getByRole("button", { name: "8 de 10 estrellas" }).click();
  await viewingDialog.locator("#viewing-review").fill("Comentario ficticio de la prueba automatizada.");
  await viewingDialog.getByRole("button", { name: "Guardar visionado" }).click();

  await expect(page.getByText("Visionado #1")).toBeVisible();
  await expect(page.getByText("8/10")).toBeVisible();

  await page.getByRole("button", { name: "Agregar a Pendientes" }).click();
  const pendingDialog = page.getByRole("dialog", { name: "¿Mover a Pendientes?" });
  await pendingDialog.getByRole("button", { name: "Confirmar" }).click();
  const pendingButton = page.getByRole("button", { name: "En Pendientes ✓" });
  await expect(pendingButton).toBeVisible();
  await pendingButton.click();
  await expect(page.getByRole("button", { name: "Agregar a Pendientes" })).toBeVisible();
  await expect(page.getByRole("button", { name: "En Pendientes ✓" })).toHaveCount(0);

  await page.getByRole("button", { name: "Agregar visionado #2" }).click();
  const unRatedDialog = page.getByRole("dialog", { name: "Registrar visionado" });
  await unRatedDialog.getByLabel("Fecha del visionado").fill("2024-05-02");
  await unRatedDialog.getByRole("button", { name: "Guardar visionado" }).click();
  await expect(page.getByText("Sin calificar")).toBeVisible();

  await page.getByRole("button", { name: "Más opciones" }).click();
  const optionsDialog = page.getByRole("dialog", { name: "Más opciones" });
  await optionsDialog.getByRole("button", { name: "Agregar a colección" }).click();

  const collectionDialog = page.getByRole("dialog", { name: "Agregar a colección" });
  await expect(collectionDialog).toBeVisible();
  await collectionDialog.getByRole("button", { name: "Crear colección" }).click();
  await collectionDialog.getByRole("textbox", { name: "Nombre de la colección" })
    .fill("Prisma E2E: películas favoritas");
  await collectionDialog.getByRole("button", { name: "Crear y agregar" }).click();

  const membership = collectionDialog.getByRole("button", {
    name: "Quitar de Prisma E2E: películas favoritas"
  });
  await expect(membership).toHaveAttribute("aria-pressed", "true");
});
