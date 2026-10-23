import assert from "node:assert/strict";
import { createModalViews } from "../js/ui/modal-views.js?v=ui-20261023-1";
import { createUtilitySheetView } from "../js/ui/utility-sheet-view.js?v=ui-20261023-1";
import { createMovieDetailView } from "../js/ui/movie-detail-view.js?v=ui-20261023-1";
import { createPersonDetailView } from "../js/ui/person-detail-view.js?v=ui-20261023-1";
import { createRatingSheetView } from "../js/ui/rating-sheet-view.js?v=ui-20261023-1";

const apiNames = [
  ["utility sheet", createUtilitySheetView, "renderUtilitySheet"],
  ["movie detail", createMovieDetailView, "renderMovieDetails"],
  ["person detail", createPersonDetailView, "renderPersonDetails"],
  ["rating sheet", createRatingSheetView, "renderRatingSheet"]
];
for (const [label, factory, method] of apiNames) {
  const api = factory({});
  assert.equal(typeof api[method], "function", label + " debe exponer su renderizador público.");
}

const root = { innerHTML: "" };
function escapeHTML(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
const ctx = {
  $() { return root; },
  escapeHTML,
  utilitySheet: { type: "info", key: "privacy" },
  modalDraft: { movie: { title: "Película sintética", tmdbId: "991", year: "2024" }, rating: 8 },
  movieDetail: null,
  personDetail: null,
  personListFilter: "all",
  state: { watched: [] },
  ratingFor() { return null; },
  ratingValue() { return 8; },
  isInHistory() { return false; },
  isInWatchlist() { return false; },
  isHidden() { return false; },
  sameMovieRecord() { return false; },
  displayGenre(value) { return String(value); },
  dateLabel(value) { return String(value || "Fecha desconocida"); },
  formatWatchedDate(value) { return String(value); },
  niceRuntime(value) { return value ? String(value) + " min" : "—"; },
  displayMovieStatus(value) { return value || "Estado desconocido"; },
  buildRatingMetrics() { return ""; },
  uniqueDiscoveryMovies() { return []; },
  isMovieInCollection() { return false; },
  infoButton() { return ""; },
  externalMovieUrl() { return "https://example.invalid/movie"; },
  personImage() { return ""; },
  personAge() { return "Edad no disponible"; },
  fromTMDB() { throw new Error("No se esperaba convertir créditos vacíos."); }
};
const views = createModalViews(ctx);
for (const method of ["renderUtilitySheet", "renderMovieDetails", "renderPersonDetails", "renderRatingSheet"]) {
  assert.equal(typeof views[method], "function", "La fachada debe conservar " + method + ".");
}

views.renderUtilitySheet();
assert.match(root.innerHTML, /Privacidad/);
assert.match(root.innerHTML, /No publiques tu JSON en GitHub/);
ctx.utilitySheet = { type: "sort", sort: "title", direction: "asc" };
views.renderUtilitySheet();
assert.match(root.innerHTML, /Ordenar por/);
assert.match(root.innerHTML, /Dirección del orden/);

ctx.movieDetail = {
  movie: {
    title: "Película sintética",
    tmdbId: "991",
    year: "2024",
    genres: ["Drama"],
    productionCountries: [],
    releaseDate: "2024-03-01",
    runtime: 100,
    overview: "Sinopsis de prueba",
    status: "Released",
    posterUrl: "",
    backdropUrl: "",
    originalTitle: "",
    tagline: ""
  },
  data: null,
  loading: false,
  error: null
};
views.renderMovieDetails();
assert.match(root.innerHTML, /Película sintética/);
assert.match(root.innerHTML, /Sinopsis de prueba/);
assert.match(root.innerHTML, /data-action="rate"/);

ctx.personDetail = {
  person: { name: "Persona sintética", biography: "Biografía sintética" },
  credits: { cast: [], crew: [] },
  character: "",
  id: 42,
  name: "Persona sintética",
  loading: false,
  error: null
};
views.renderPersonDetails();
assert.match(root.innerHTML, /Persona sintética/);
assert.match(root.innerHTML, /Biografía/);
assert.match(root.innerHTML, /Filmografía/);

views.renderRatingSheet();
assert.match(root.innerHTML, /Guardar nota/);
assert.equal((root.innerHTML.match(/class="rating-star/g) || []).length, 10);
assert.match(root.innerHTML, /data-action="save-rating"/);

console.log("Vistas modales correctas: cuatro APIs separadas, fachada compatible y marcado sintético verificado.");
