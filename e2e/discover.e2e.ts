import { expect, test } from "@playwright/test";

test("Descubrir aplica filtros reales de género, fecha, duración, país e idioma a TMDB", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("prisma.tmdb.accessToken", "fixture-discover-token");
  });

  const discoverRequests: URL[] = [];
  await page.route("https://api.themoviedb.org/3/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/3/configuration") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          images: {
            secure_base_url: "https://image.tmdb.org/t/p/",
            poster_sizes: ["w342"],
            backdrop_sizes: ["w780"],
            profile_sizes: ["w185"]
          }
        })
      });
      return;
    }
    if (path === "/3/genre/movie/list") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ genres: [{ id: 18, name: "Drama" }, { id: 878, name: "Ciencia ficción" }] })
      });
      return;
    }
    if (path === "/3/configuration/countries") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { iso_3166_1: "PA", english_name: "Panamá", native_name: "Panamá" },
          { iso_3166_1: "JP", english_name: "Japón", native_name: "日本" }
        ])
      });
      return;
    }
    if (path === "/3/configuration/languages") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { iso_639_1: "es", english_name: "Spanish", name: "Español" },
          { iso_639_1: "ja", english_name: "Japanese", name: "日本語" }
        ])
      });
      return;
    }
    if (path === "/3/trending/movie/week") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ page: 1, results: [], total_pages: 1, total_results: 0 })
      });
      return;
    }
    if (path === "/3/discover/movie") {
      discoverRequests.push(url);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          page: Number(url.searchParams.get("page") ?? "1"),
          results: [{
            id: 990001,
            title: "Película filtrada ficticia",
            original_title: "Filtered Prisma Fixture",
            release_date: "2015-04-01",
            genre_ids: [18, 878],
            poster_path: null,
            backdrop_path: null,
            vote_average: 7.8
          }],
          total_pages: 1,
          total_results: 1
        })
      });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ status_message: "Not found" }) });
  });

  await page.goto("#/discover");
  await expect(page.getByRole("searchbox", { name: "Buscar películas en TMDB" })).toBeVisible();
  await page.getByRole("button", { name: "Abrir filtros" }).click();

  const dialog = page.getByRole("dialog", { name: "Explorar por criterios" });
  await expect(dialog.getByRole("checkbox", { name: "Drama" })).toBeVisible();
  await dialog.getByRole("checkbox", { name: "Drama" }).click();
  await dialog.getByRole("checkbox", { name: "Ciencia ficción" }).click();
  await dialog.getByLabel("Desde el año").fill("1990");
  await dialog.getByLabel("Hasta el año").fill("2020");
  await dialog.getByLabel("Duración mínima · minutos").fill("90");
  await dialog.getByLabel("Duración máxima · minutos").fill("160");
  await dialog.getByLabel("País de origen de la producción").selectOption("PA");
  await dialog.getByLabel("Idioma original").selectOption("ja");
  await dialog.getByLabel("Ordenar resultados").selectOption("rating");
  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();

  await expect(page.getByText("Película filtrada ficticia")).toBeVisible();
  await expect.poll(() => discoverRequests.length).toBeGreaterThan(0);
  const params = discoverRequests[0].searchParams;
  expect(params.get("with_genres")).toBe("18|878");
  expect(params.get("primary_release_date.gte")).toBe("1990-01-01");
  expect(params.get("primary_release_date.lte")).toBe("2020-12-31");
  expect(params.get("with_runtime.gte")).toBe("90");
  expect(params.get("with_runtime.lte")).toBe("160");
  expect(params.get("with_origin_country")).toBe("PA");
  expect(params.get("with_original_language")).toBe("ja");
  expect(params.get("sort_by")).toBe("vote_average.desc");
  await expect(page.getByText(/Géneros: Drama \/ Ciencia ficción/)).toBeVisible();
});

test("la búsqueda por título sustituye los filtros avanzados con un aviso visible", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("prisma.tmdb.accessToken", "fixture-discover-token");
  });
  await page.route("https://api.themoviedb.org/3/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/3/configuration") {
      await route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ images: { secure_base_url: "https://image.tmdb.org/t/p/", poster_sizes: [], backdrop_sizes: [], profile_sizes: [] } })
      });
      return;
    }
    if (path === "/3/genre/movie/list") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ genres: [{ id: 18, name: "Drama" }] }) });
      return;
    }
    if (path === "/3/configuration/countries") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      return;
    }
    if (path === "/3/configuration/languages") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
      return;
    }
    if (path === "/3/trending/movie/week" || path === "/3/search/movie") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ page: 1, results: [], total_pages: 1, total_results: 0 }) });
      return;
    }
    await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
  await page.goto("#/discover");
  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Explorar por criterios" });
  await dialog.getByRole("checkbox", { name: "Drama" }).click();
  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByRole("button", { name: "Abrir filtros" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("searchbox", { name: "Buscar películas en TMDB" }).fill("Amélie");
  await expect(page.getByText("La búsqueda por título sustituye a los filtros avanzados.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir filtros" })).toHaveAttribute("aria-pressed", "false");
});
