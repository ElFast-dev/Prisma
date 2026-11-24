import { expect, test } from "@playwright/test";

async function configureTmdbMock(
  page: import("@playwright/test").Page,
  options: { multiPageSearch?: boolean; duplicatePageResult?: boolean } = {}
): Promise<{ discoverRequests: URL[]; searchRequests: URL[] }> {
  const discoverRequests: URL[] = [];
  const searchRequests: URL[] = [];
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
    if (url.pathname === "/3/movie/101") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 101,
          title: "Prisma: una historia",
          original_title: "Prisma Story",
          overview: "Sinopsis de prueba para comprobar la navegación a la ficha.",
          release_date: "2020-01-01",
          poster_path: null,
          backdrop_path: null,
          runtime: 110,
          revenue: 100,
          status: "Released",
          genres: [{ id: 18, name: "Drama" }],
          original_language: "es"
        })
      });
      return;
    }
    if (url.pathname === "/3/movie/103") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 103,
          title: "Prisma: la otra historia",
          original_title: "Prisma: the other story",
          release_date: "2020-02-01",
          runtime: 105,
          revenue: 300
        })
      });
      return;
    }
    if (url.pathname === "/3/movie/104") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 104,
          title: "Prisma: tercera historia",
          original_title: "Prisma: third story",
          release_date: "2021-01-01",
          runtime: 105,
          revenue: 1000
        })
      });
      return;
    }
    if (url.pathname === "/3/movie/105") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: 105,
          title: "Prisma: película fuera del rango",
          original_title: "Prisma: outside filter range",
          release_date: "2005-01-01",
          runtime: 100,
          revenue: 5000
        })
      });
      return;
    }
    if (url.pathname === "/3/movie/101/credits") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ cast: [], crew: [] })
      });
      return;
    }
    if (url.pathname === "/3/movie/101/recommendations") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ page: 1, total_pages: 1, total_results: 0, results: [] })
      });
      return;
    }
    if (url.pathname === "/3/movie/101/watch/providers") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: 101, results: {} })
      });
      return;
    }
    if (url.pathname === "/3/search/movie") {
      searchRequests.push(url);
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          page: Number(url.searchParams.get("page") ?? "1"),
          total_pages: options.multiPageSearch ? 2 : 1,
          total_results: options.multiPageSearch ? 4 : 2,
          results: options.multiPageSearch && url.searchParams.get("page") === "2"
            ? options.duplicatePageResult
              ? [{
                id: 103,
                title: "Prisma: la otra historia actualizada",
                original_title: "Prisma: the other story",
                overview: "Metadatos más recientes para una película ya mostrada.",
                release_date: "2020-02-01",
                poster_path: null,
                genre_ids: [18],
                vote_average: 7.9,
                vote_count: 900,
                original_language: "en",
                popularity: 22
              }, {
                id: 104,
                title: "Prisma: tercera historia",
                original_title: "Prisma: third story",
                overview: "Resultado nuevo de la segunda página.",
                release_date: "2021-01-01",
                poster_path: null,
                genre_ids: [18],
                vote_average: 7.6,
                vote_count: 700,
                original_language: "es",
                popularity: 16
              }]
              : [{
              id: 104,
              title: "Prisma: tercera historia",
              original_title: "Prisma: third story",
              overview: "Resultado de la segunda página.",
              release_date: "2021-01-01",
              poster_path: null,
              genre_ids: [18],
              vote_average: 7.6,
              vote_count: 700,
              original_language: "es",
              popularity: 16
            }, {
              id: 105,
              title: "Prisma: película fuera del rango",
              original_title: "Prisma: outside filter range",
              overview: "Este resultado debe quedar excluido por el año.",
              release_date: "2005-01-01",
              poster_path: null,
              genre_ids: [18],
              vote_average: 7.9,
              vote_count: 750,
              original_language: "es",
              popularity: 17
            }]
            : [{
              id: 101,
              title: "Prisma: una historia",
              original_title: "Prisma Story",
              overview: "Sinopsis de prueba.",
              release_date: "2020-01-01",
              poster_path: null,
              genre_ids: [18],
              vote_average: 8,
              vote_count: 900,
              original_language: "ja",
              popularity: 20
            }, {
              id: 103,
              title: "Prisma: la otra historia",
              original_title: "Prisma: the other story",
              overview: "Otra sinopsis de prueba.",
              release_date: "2020-02-01",
              poster_path: null,
              genre_ids: [18],
              vote_average: 7.8,
              vote_count: 850,
              original_language: "en",
              popularity: 18
            }]
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
  return { discoverRequests, searchRequests };
}

test("filtra Descubrir por género, duración, año, valoración, idioma y orden", async ({ page }) => {
  const { discoverRequests, searchRequests } = await configureTmdbMock(page);
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

  // La búsqueda textual consulta TMDB y combina después los filtros avanzados.
  await page.locator("#discover-search").fill("prisma");
  await expect.poll(() => searchRequests.length).toBe(1);
  expect(searchRequests[0].searchParams.get("query")).toBe("prisma");
  await expect(page.locator(".poster-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Abrir ficha de Prisma: una historia" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir ficha de Otra historia" })).toHaveCount(0);
});

test("permite cargar más resultados de una búsqueda con filtros activos", async ({ page }) => {
  const { searchRequests } = await configureTmdbMock(page, { multiPageSearch: true });
  await page.goto("#/discover");

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros" });
  await dialog.locator("#discover-genre").selectOption("18");
  await dialog.locator("#discover-year-from").fill("2010");
  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();

  await page.locator("#discover-search").fill("prisma");
  await expect(page.getByRole("button", { name: "Abrir ficha de Prisma: una historia" })).toBeVisible();
  await expect.poll(() => searchRequests.length).toBe(1);

  const moreResults = page.getByRole("button", { name: "Cargar más películas" });
  await expect(moreResults).toBeVisible();
  await moreResults.click();

  await expect.poll(() => searchRequests.length).toBe(2);
  expect(searchRequests[1].searchParams.get("page")).toBe("2");
  await expect(page.getByRole("button", { name: "Abrir ficha de Prisma: tercera historia" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Abrir ficha de Prisma: película fuera del rango" })).toHaveCount(0);
  await expect(moreResults).toHaveCount(0);
  await expect(page.locator(".poster-card")).toHaveCount(3);
});

test("conserva el orden visible al añadir otra página con orden de recaudación", async ({ page }) => {
  await configureTmdbMock(page, { multiPageSearch: true });
  await page.goto("#/discover");

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros" });
  await dialog.locator("#discover-genre").selectOption("18");
  await dialog.locator("#discover-year-from").fill("2010");
  await dialog.locator("#discover-sort").selectOption("revenue.desc");
  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();

  await page.locator("#discover-search").fill("prisma");
  const posters = page.locator(".poster-card");
  await expect(posters).toHaveCount(2);
  await expect(posters.nth(0)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: la otra historia");
  await expect(posters.nth(1)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: una historia");

  await page.getByRole("button", { name: "Cargar más películas" }).click();
  await expect(posters).toHaveCount(3);
  // El nuevo título se añade abajo: no desplaza las películas que ya estaban visibles.
  await expect(posters.nth(0)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: la otra historia");
  await expect(posters.nth(1)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: una historia");
  await expect(posters.nth(2)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: tercera historia");
  await expect(page.getByRole("button", { name: "Abrir ficha de Prisma: película fuera del rango" })).toHaveCount(0);
});

test("ordena los resultados de búsqueda por recaudación real", async ({ page }) => {
  await configureTmdbMock(page);
  await page.goto("#/discover");

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros" });
  await dialog.locator("#discover-sort").selectOption("revenue.desc");
  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();

  await page.locator("#discover-search").fill("prisma");
  const posters = page.locator(".poster-card");
  await expect(posters).toHaveCount(2);
  await expect(posters.first()).toHaveAttribute("aria-label", "Abrir ficha de Prisma: la otra historia");
  await expect(posters.nth(1)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: una historia");
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

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros" });
  await dialog.locator("#discover-genre").selectOption("18");
  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();

  const posters = page.locator(".poster-card");
  await expect(posters).toHaveCount(2);
  const first = await posters.nth(0).boundingBox();
  const second = await posters.nth(1).boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(Math.abs(first!.y - second!.y)).toBeLessThan(1);
  expect(second!.x).toBeGreaterThan(first!.x);
});


test("permite ocultar por separado las películas vistas y pendientes", async ({ page }) => {
  await configureTmdbMock(page);
  await page.goto("#/discover");
  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros" });
  const watched = dialog.getByLabel("Ocultar películas que ya vi");
  const pending = dialog.getByLabel("Ocultar películas pendientes");
  await expect(watched).toBeChecked();
  await expect(pending).toBeChecked();
  await watched.uncheck();
  await expect(watched).not.toBeChecked();
  await expect(pending).toBeChecked();
  await pending.uncheck();
  await expect(pending).not.toBeChecked();
});

test("mantiene el foco dentro de los filtros y lo devuelve al cerrarlos", async ({ page }) => {
  await configureTmdbMock(page);
  await page.goto("#/discover");

  const trigger = page.getByRole("button", { name: "Abrir filtros" });
  await trigger.focus();
  await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Filtros" });
  const close = dialog.getByRole("button", { name: "Cerrar filtros" });
  const apply = dialog.getByRole("button", { name: "Aplicar filtros" });
  await expect(dialog).toBeVisible();
  await expect(close).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(apply).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});


test("conserva filtros, búsqueda y resultados al regresar de una ficha", async ({ page }) => {
  const { discoverRequests } = await configureTmdbMock(page);
  await page.goto("#/discover");

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros" });
  await dialog.locator("#discover-genre").selectOption("18");
  await dialog.locator("#discover-year-from").fill("2015");
  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();
  await page.locator("#discover-search").fill("prisma");

  const movie = page.getByRole("button", { name: "Abrir ficha de Prisma: una historia" });
  await expect(movie).toBeVisible();
  await expect(page.locator(".discover-filter-chip")).toHaveCount(4);
  await expect(page.locator(".discover-filter-chip")).toContainText([
    "Género: Drama",
    "Año: 2015–actualidad",
    "Ocultar vistas",
    "Ocultar pendientes"
  ]);
  await expect.poll(() => discoverRequests.length).toBe(1);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("prisma:discover-session:v1"))).toContain('"query":"prisma"');

  await movie.click();
  await expect(page).toHaveURL(/#\/movie\/101$/);
  await expect(page.getByRole("heading", { name: "Prisma: una historia" })).toBeVisible();
  const backButton = page.getByRole("link", { name: "Volver a la pantalla anterior" });
  await expect(backButton).toBeVisible();
  await backButton.click();

  await expect(page).toHaveURL(/#\/discover$/);
  await expect(page.locator("#discover-search")).toHaveValue("prisma");
  await expect(page.getByRole("button", { name: "Abrir filtros" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".discover-filter-chip")).toHaveCount(4);
  await expect(page.locator(".discover-filter-chip")).toContainText([
    "Género: Drama",
    "Año: 2015–actualidad",
    "Ocultar vistas",
    "Ocultar pendientes"
  ]);
  await expect(page.getByRole("button", { name: "Abrir ficha de Prisma: una historia" })).toBeVisible();
  await expect.poll(() => discoverRequests.length).toBe(1);
});

test("no carga páginas al deslizar; espera a que la persona toque Cargar más", async ({ page }) => {
  const { searchRequests } = await configureTmdbMock(page, { multiPageSearch: true });
  await page.goto("#/discover");
  await page.locator("#discover-search").fill("prisma");

  const posters = page.locator(".poster-card");
  await expect(posters).toHaveCount(2);
  await expect.poll(() => searchRequests.length).toBe(1);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  expect(searchRequests).toHaveLength(1);
  await expect(posters).toHaveCount(2);

  await page.getByRole("button", { name: "Cargar más películas" }).click();
  await expect.poll(() => searchRequests.length).toBe(2);
  await expect(posters).toHaveCount(3);
  await expect(posters.nth(0)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: una historia");
  await expect(posters.nth(1)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: la otra historia");
  await expect(posters.nth(2)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: tercera historia");
});

test("actualiza una película repetida en su lugar sin crear otra tarjeta", async ({ page }) => {
  const { searchRequests } = await configureTmdbMock(page, {
    multiPageSearch: true,
    duplicatePageResult: true
  });
  await page.goto("#/discover");
  await page.locator("#discover-search").fill("prisma");

  const posters = page.locator(".poster-card");
  await expect(posters).toHaveCount(2);
  await expect(posters.nth(1)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: la otra historia");

  await page.getByRole("button", { name: "Cargar más películas" }).click();
  await expect.poll(() => searchRequests.length).toBe(2);
  await expect(posters).toHaveCount(3);
  await expect(posters.nth(0)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: una historia");
  await expect(posters.nth(1)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: la otra historia actualizada");
  await expect(posters.nth(2)).toHaveAttribute("aria-label", "Abrir ficha de Prisma: tercera historia");
});

test("combina atajos de género y duración sin obligar a configurar campos manualmente", async ({ page }) => {
  const { discoverRequests } = await configureTmdbMock(page);
  await page.goto("#/discover");
  await page.getByRole("button", { name: "Abrir filtros" }).click();

  const dialog = page.getByRole("dialog", { name: "Filtros" });
  const genres = dialog.getByRole("group", { name: "Géneros populares" });
  await genres.getByRole("button", { name: "Drama" }).click();
  await expect(dialog.locator("#discover-genre")).toHaveValue("18");

  const duration = dialog.getByRole("group", { name: "Atajos de duración" });
  await duration.getByRole("button", { name: "100–140 min" }).click();
  await expect(dialog.locator("#discover-runtime-min")).toHaveValue("100");
  await expect(dialog.locator("#discover-runtime-max")).toHaveValue("140");

  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect.poll(() => discoverRequests.length).toBe(1);
  expect(discoverRequests[0].searchParams.get("with_genres")).toBe("18");
  expect(discoverRequests[0].searchParams.get("with_runtime.gte")).toBe("100");
  expect(discoverRequests[0].searchParams.get("with_runtime.lte")).toBe("140");
});

test("combina los atajos con los criterios elegidos y permite quitar solo un filtro", async ({ page }) => {
  const { discoverRequests } = await configureTmdbMock(page);
  await page.goto("#/discover");

  await page.getByRole("button", { name: "Abrir filtros" }).click();
  const dialog = page.getByRole("dialog", { name: "Filtros" });
  await dialog.getByRole("group", { name: "Géneros populares" }).getByRole("button", { name: "Drama" }).click();
  await dialog.locator("#discover-language").selectOption("ja");
  await dialog.getByRole("button", { name: "Bien valoradas" }).click();
  await expect(dialog.locator("#discover-genre")).toHaveValue("18");
  await expect(dialog.locator("#discover-language")).toHaveValue("ja");
  await expect(dialog.locator("#discover-min-rating")).toHaveValue("7.5");
  await expect(dialog.locator("#discover-min-votes")).toHaveValue("500");
  await expect(dialog.locator("#discover-sort")).toHaveValue("vote_average.desc");
  await dialog.getByRole("button", { name: "Aplicar filtros" }).click();

  await expect.poll(() => discoverRequests.length).toBe(1);
  expect(discoverRequests[0].searchParams.get("with_genres")).toBe("18");
  expect(discoverRequests[0].searchParams.get("with_original_language")).toBe("ja");
  expect(discoverRequests[0].searchParams.get("vote_average.gte")).toBe("7.5");
  expect(discoverRequests[0].searchParams.get("vote_count.gte")).toBe("500");
  expect(discoverRequests[0].searchParams.get("sort_by")).toBe("vote_average.desc");

  await page.getByRole("button", { name: "Quitar filtro Valoración: ≥ 7.5" }).click();
  await expect.poll(() => discoverRequests.length).toBe(2);
  expect(discoverRequests[1].searchParams.get("with_genres")).toBe("18");
  expect(discoverRequests[1].searchParams.get("with_original_language")).toBe("ja");
  expect(discoverRequests[1].searchParams.get("vote_average.gte")).toBeNull();
  expect(discoverRequests[1].searchParams.get("vote_count.gte")).toBe("500");
  expect(discoverRequests[1].searchParams.get("sort_by")).toBe("vote_average.desc");
  await expect(page.locator(".discover-filter-chip")).toContainText(["Votos: ≥ 500", "Orden: Mejor valoradas"]);
});


test("ofrece actualizar al reconectar sin reemplazar el feed hasta confirmarlo", async ({ page, context }) => {
  const { searchRequests } = await configureTmdbMock(page, { multiPageSearch: true });
  await page.goto("#/discover");
  await page.locator("#discover-search").fill("prisma");

  const posters = page.locator(".poster-card");
  await expect(posters).toHaveCount(2);
  await expect.poll(() => searchRequests.length).toBe(1);
  const firstCards = await posters.evaluateAll((nodes) => (
    nodes.map((node) => node.getAttribute("aria-label"))
  ));

  await context.setOffline(true);
  await expect.poll(() => page.evaluate(() => navigator.onLine)).toBe(false);
  await context.setOffline(false);

  const refresh = page.getByRole("button", { name: "Actualizar" });
  await expect(refresh).toBeVisible();
  expect(searchRequests).toHaveLength(1);
  await expect(posters).toHaveCount(2);
  expect(await posters.evaluateAll((nodes) => (
    nodes.map((node) => node.getAttribute("aria-label"))
  ))).toEqual(firstCards);

  await refresh.click();
  await expect.poll(() => searchRequests.length).toBe(2);
  expect(searchRequests[1].searchParams.get("page")).toBe("1");
  await expect(posters).toHaveCount(2);
});
