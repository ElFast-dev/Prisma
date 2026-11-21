import { expect, test } from "@playwright/test";

async function configureTmdbMock(page: import("@playwright/test").Page): Promise<{ discoverRequests: URL[] }> {
  const discoverRequests: URL[] = [];
  await page.addInitScript(() => {
    localStorage.setItem("prisma.tmdb.accessToken", "test-discover-token");
  });
  await page.route("https://api.themoviedb.org/3/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/3/configuration") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          images: {
            secure_base_url: "https://image.tmdb.org/t/p/",
            poster_sizes: ["w342"],
            backdrop_sizes: [],
            profile_sizes: []
          }
        })
      });
      return;
    }
    if (url.pathname === "/3/trending/movie/week") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          page: 1,
          total_pages: 1,
          total_results: 1,
          results: [{ id: 1, title: "Tendencia de prueba", poster_path: null, genre_ids: [18] }]
        })
      });
      return;
    }
    if (url.pathname === "/3/discover/movie") {
      discoverRequests.push(url);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          page: Number(url.searchParams.get("page") ?? "1"),
          total_pages: 1,
          total_results: 2,
          results: [
            { id: 101, title: "Prisma: una historia", original_title: "Prisma Story", poster_path: null, genre_ids: [18], vote_average: 8 },
            { id: 102, title: "Otra historia", original_title: "Another Story", poster_path: null, genre_ids: [18], vote_average: 7.7 }
          ]
        })
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ status_message: "Unexpected test endpoint" }) });
  });
  return { discoverRequests };
}

test("filtra Descubrir por género, duración, año, valoración, idioma y orden", async ({ page }) => {
  const { discoverRequests } = await configureTmdbMock(page);
  await page.goto("#/discover");
  await expect(page.locator("#discover-search")).toBeVisible();

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros" });
  await expect(dialog).toBeVisible();

  await dialog.locator("#discover-genre").selectOption("18");
  await dialog.locator("#discover-runtime-min").fill("90");
  await dialog.locator("#discover-runtime-max").fill("120");
  await dialog.locator("#discover-year-from").fill("2010");
  await dialog.locator("#discover-year-to").fill("2024");
  await dialog.locator("#discover-min-rating").selectOption("7.5");
  await dialog.locator("#discover-min-votes").selectOption("500");
  await dialog.locator("#discover-language").selectOption("ja");
  await dialog.locator("#discover-sort").selectOption("vote_average.desc");
  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();

  await expect(page.locator(".poster-card")).toHaveCount(2);
  await expect.poll(() => discoverRequests.length).toBe(1);
  const params = discoverRequests[0].searchParams;
  expect(params.get("with_genres")).toBe("18");
  expect(params.get("with_runtime.gte")).toBe("90");
  expect(params.get("with_runtime.lte")).toBe("120");
  expect(params.get("primary_release_date.gte")).toBe("2010-01-01");
  expect(params.get("primary_release_date.lte")).toBe("2024-12-31");
  expect(params.get("vote_average.gte")).toBe("7.5");
  expect(params.get("vote_count.gte")).toBe("500");
  expect(params.get("with_original_language")).toBe("ja");
  expect(params.get("sort_by")).toBe("vote_average.desc");
  await expect(page.getByRole("button", { name: "Abrir filtros" })).toHaveAttribute("aria-pressed", "true");

  // Cuando hay filtros activos, el texto reduce los resultados de esa búsqueda filtrada.
  await page.locator("#discover-search").fill("prisma");
  await expect(page.locator(".poster-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Abrir ficha de Prisma: una historia" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir ficha de Otra historia" })).toHaveCount(0);
});

test("impide aplicar rangos de duración y año invertidos", async ({ page }) => {
  await configureTmdbMock(page);
  await page.goto("#/discover");
  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros" });
  await dialog.locator("#discover-runtime-min").fill("180");
  await dialog.locator("#discover-runtime-max").fill("90");
  await expect(dialog.getByRole("alert")).toContainText("La duración mínima no puede superar la máxima.");
  await expect(dialog.getByRole("button", { name: "Aplicar filtros" })).toBeDisabled();

  await dialog.getByRole("button", { name: "Restablecer" }).click();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".poster-card")).toHaveCount(1);
});


test("muestra dos columnas de pósteres en móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await configureTmdbMock(page);
  await page.goto("#/discover");
  const grid = page.locator(".poster-grid");
  await expect(grid).toBeVisible();
  const columnCount = await grid.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").length
  );
  expect(columnCount).toBe(2);
});
