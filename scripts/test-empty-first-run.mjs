import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAppLifecycle } from "../js/app/lifecycle.js";
import { createCatalogModel } from "../js/catalog/catalog-model.js";
import { emptyState, ensureState } from "../js/core/state-model.js";
import {
  escapeHTML, movieIdentityKey, movieTmdbId, normalizeMovie, ratingValue,
  titleKey, uniqueStrings
} from "../js/core/movie-utils.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
await assert.rejects(
  access(resolve(root, "data/catalog.json")),
  error => error && error.code === "ENOENT",
  "El catálogo empaquetado de películas de muestra ya no debe existir."
);

const lifecycleSource = await readFile(resolve(root, "js/app/lifecycle.js"), "utf8");
const appSource = await readFile(resolve(root, "app.js"), "utf8");
const pageViewsSource = await readFile(resolve(root, "js/ui/page-views.js"), "utf8");
assert.doesNotMatch(lifecycleSource, /data\/catalog\.json|seedCatalog|catálogo de muestra/i);
assert.doesNotMatch(appSource, /seedCatalog|getSeedCatalog/);
assert.match(pageViewsSource, /Tu catálogo personal está vacío/);
assert.match(pageViewsSource, /Tu espacio empieza vacío/);
assert.match(pageViewsSource, /Conecta TMDB desde Ajustes \/ Datos/);

async function initializeWithStorage(storageValues) {
  let state = emptyState();
  let customCatalog = [];
  let catalog = [];
  let catalogByTitle = new Map();
  let tmdbCredential = null;
  let rendered = 0;
  const reads = [];
  const fetchedUrls = [];
  const catalogModel = createCatalogModel({
    getCustomCatalog: () => customCatalog,
    getState: () => state,
    getCatalog: () => catalog,
    getCatalogByTitle: () => catalogByTitle,
    setCatalog: value => { catalog = value; },
    setCatalogByTitle: value => { catalogByTitle = value; },
    normalizeMovie,
    titleKey,
    movieTmdbId,
    movieIdentityKey,
    uniqueStrings,
    ratingValue,
    movieFeatures: () => []
  });
  const lifecycle = createAppLifecycle({
    get state() { return state; },
    set state(value) { state = value; },
    get customCatalog() { return customCatalog; },
    set customCatalog(value) { customCatalog = value; },
    get tmdbCredential() { return tmdbCredential; },
    set tmdbCredential(value) { tmdbCredential = value; },
    get currentPage() { return "home"; },
    set currentPage(_) {},
    get modalDraft() { return null; },
    set modalDraft(_) {},
    get movieDetail() { return null; },
    set movieDetail(_) {},
    get personDetail() { return null; },
    set personDetail(_) {},
    get utilitySheet() { return null; },
    set utilitySheet(_) {},
    get ratingReturnDetail() { return false; },
    set ratingReturnDetail(_) {},
    $: () => ({ innerHTML: "" }),
    window: { isSecureContext: false, scrollTo() {}, setTimeout() {} },
    navigator: {},
    fetch: async url => {
      fetchedUrls.push(url);
      throw new Error("La inicialización no debe descargar recursos de catálogo predefinidos.");
    },
    dbGet: async key => {
      reads.push(key);
      return Object.prototype.hasOwnProperty.call(storageValues, key) ? storageValues[key] : null;
    },
    STATE_KEY: "state",
    CATALOG_KEY: "catalogCustom",
    TMDB_CREDENTIAL_KEY: "tmdbCredential",
    normalizeMovie,
    ensureState,
    pruneTMDBCache() {},
    combineMovies: () => catalogModel.combineMovies(),
    renderApp() { rendered += 1; },
    escapeHTML
  });

  await lifecycle.init();
  return { state, customCatalog, catalog, catalogByTitle, tmdbCredential, rendered, reads, fetchedUrls, catalogModel };
}

const fresh = await initializeWithStorage({});
assert.deepEqual(fresh.reads.sort(), ["catalogCustom", "state", "tmdbCredential"]);
assert.deepEqual(fresh.fetchedUrls, [], "No se debe solicitar un archivo estático con películas de muestra.");
assert.deepEqual(fresh.state, emptyState(), "Una instalación nueva debe conservar el perfil personal vacío.");
assert.equal(fresh.customCatalog.length, 0);
assert.equal(fresh.catalog.length, 0, "Sin datos personales ni importaciones, el catálogo combinado debe estar vacío.");
assert.equal(fresh.rendered, 1, "La aplicación debe renderizarse normalmente con un catálogo vacío.");

const savedCatalog = [
  { title: "Película añadida por la persona", year: 2021, tmdbId: "990901", genres: ["Drama"], source: "csv" }
];
const existing = await initializeWithStorage({
  catalogCustom: savedCatalog,
  state: {
    version: 2,
    rated: [{ title: "Película valorada", rating: 8, tmdbId: "990902", genres: ["Drama"] }],
    watched: [],
    watchlist: [],
    hidden: [],
    events: [],
    updatedAt: "2026-10-20T12:00:00.000Z",
    importedAt: null
  }
});
assert.equal(existing.catalog.length, 2, "Los registros personales guardados deben conservarse al retirar el catálogo de muestra.");
assert.ok(existing.catalog.some(movie => movie.tmdbId === "990901"), "El catálogo importado guardado debe mantenerse.");
assert.ok(existing.catalog.some(movie => movie.tmdbId === "990902"), "Las valoraciones existentes deben seguir disponibles.");
assert.deepEqual(existing.fetchedUrls, [], "Tampoco deben descargarse películas predeterminadas para un perfil existente.");

console.log("Inicio vacío correcto: sin películas predeterminadas, sin petición al catálogo estático y con datos personales existentes preservados.");
