import assert from "node:assert/strict";
import {
  findMovieRecordMatch, movieIdentityKey, movieTmdbId, normalizeMovie,
  ratingValue, sameDiscoveryMovie, sameMovieRecord, titleKey, uniqueDiscoveryMovies,
  uniqueStrings
} from "../js/core/movie-utils.js";
import { parseCatalogCSV } from "../js/catalog/csv-parser.js";
import { createCatalogModel } from "../js/catalog/catalog-model.js";
import { mergeMovieListByTitle } from "../js/import-export/personal-data.js";
import { createImportExportActions } from "../js/import-export/actions.js";
import { createRecommendationEngine } from "../js/recommendations/engine.js";
import { createRecommendationEvaluation } from "../js/recommendations/evaluation.js";
import { createRecommendationNormalizationEvaluation } from "../js/recommendations/normalization-evaluation.js";
import { createRidgeRecommendationExperiment } from "../js/recommendations/ridge-evaluation.js";

assert.notEqual(
  movieIdentityKey({ title: "Prisma Identity Fixture", year: 1998 }),
  movieIdentityKey({ title: "Prisma Identity Fixture", year: 2024 }),
  "La identidad de fallback debe distinguir años cuando no hay ID TMDB."
);
assert.equal(
  sameMovieRecord(
    { title: "Prisma Identity Fixture", year: 1998 },
    { title: "Prisma Identity Fixture", year: 2024, tmdbId: "990001" }
  ),
  false,
  "Un registro sin ID de otra década no debe confundirse con un remake de TMDB."
);
assert.equal(
  sameMovieRecord(
    { title: "Prisma Identity Fixture", year: 1998, tmdbId: "990001" },
    { title: "Prisma Identity Fixture", year: 2024, tmdbId: "990002" }
  ),
  false,
  "IDs TMDB diferentes representan identidades distintas aunque compartan título."
);
assert.equal(
  sameMovieRecord(
    { title: "Prisma Identity Fixture", year: 1998 },
    { title: "Prisma Identity Fixture", year: 1998, tmdbId: "990001" }
  ),
  false,
  "La comparación par a par no debe ignorar que una de las identidades tiene ID TMDB."
);
assert.equal(
  findMovieRecordMatch(
    { title: "Prisma Identity Fixture", year: 1998 },
    [{ title: "Prisma Identity Fixture", year: 1998, tmdbId: "990001" }]
  ).tmdbId,
  "990001",
  "La asociación de un registro legado solo debe ocurrir con el contexto que prueba que es la única candidata."
);
assert.equal(sameDiscoveryMovie(
  { title: "Prisma Discovery Fixture", year: 1998 },
  { title: "Prisma Discovery Fixture", year: 2024 }
), false);

const singleTMDB = { title: "About Time", year: 2013, tmdbId: "122906" };
assert.equal(
  findMovieRecordMatch({ title: "About Time" }, [singleTMDB]),
  singleTMDB,
  "Un registro legado ambiguo solo por falta de datos puede asociarse si existe una única candidata."
);
const alternateTitleBySameId = { title: "Original Movie Title", year: 2012, tmdbId: "990099" };
assert.equal(
  findMovieRecordMatch({ title: "Título localizado alternativo", tmdbId: "990099" }, [alternateTitleBySameId]),
  alternateTitleBySameId,
  "El ID TMDB debe prevalecer aunque el título cambie entre fuentes."
);
const remakes = [
  { title: "Same Name Fixture", year: 1998, tmdbId: "990101" },
  { title: "Same Name Fixture", year: 2024, tmdbId: "990102" }
];
assert.equal(
  findMovieRecordMatch({ title: "Same Name Fixture" }, remakes),
  null,
  "Un título sin ID ni año no debe elegir arbitrariamente entre remakes."
);

assert.equal(
  findMovieRecordMatch(
    { title: "Uncertain Year Fixture", year: 2024, tmdbId: "990123" },
    [
      { title: "Uncertain Year Fixture", year: 1998, tmdbId: "990122" },
      { title: "Uncertain Year Fixture" }
    ]
  ),
  null,
  "Un registro legado sin año no se debe asignar cuando podría corresponder a otro ID TMDB."
);

const discoveryUnique = uniqueDiscoveryMovies([
  { title: "About Time", year: 2013, overview: "", genres: [] },
  { title: "About Time", year: 2013, tmdbId: "122906", overview: "Sinopsis con metadatos TMDB", genres: ["Drama"] },
  { title: "Same Name Fixture", year: 1998, tmdbId: "990101" },
  { title: "Same Name Fixture", year: 2024, tmdbId: "990102" },
  { title: "Same Name Fixture" }
]);
assert.equal(discoveryUnique.length, 4,
  "Se unifica la fila vacía con el único registro TMDB posible y se conservan los homónimos ambiguos.");
assert.equal(discoveryUnique.find(movie => movie.title === "About Time").tmdbId, "122906");
assert.equal(discoveryUnique.find(movie => movie.title === "About Time").overview, "Sinopsis con metadatos TMDB");
assert.equal(discoveryUnique.filter(movie => movie.title === "Same Name Fixture").length, 3,
  "Dos remakes y un registro sin año ambiguo permanecen separados.");

const reverseOrder = uniqueDiscoveryMovies([
  { title: "Order Fixture" },
  { title: "Order Fixture", year: 1998, tmdbId: "990111" },
  { title: "Order Fixture", year: 2024, tmdbId: "990112" }
]);
assert.equal(reverseOrder.length, 3,
  "La deduplicación debe conservar una fila ambigua aunque llegue antes que las identidades TMDB.");
assert.equal(reverseOrder.filter(movie => movie.title === "Order Fixture" && !movieTmdbId(movie)).length, 1,
  "La fila sin ID no debe asignarse al primer remake por el orden de entrada.");

const csv = parseCatalogCSV([
  "title,year,genres",
  "Prisma CSV Identity Fixture,1998,Drama",
  "Prisma CSV Identity Fixture,2024,Action",
  "Prisma CSV Identity Fixture,1998,Comedy"
].join("\n"));
assert.equal(csv.length, 2, "CSV debe deduplicar el mismo título/año sin fusionar años distintos.");
assert.deepEqual(csv.map(movie => movie.year).sort(), [1998, 2024]);

const mergedSameYear = mergeMovieListByTitle([], [
  { title: "Prisma Import Identity Fixture", year: 1998, genres: ["Drama"] },
  { title: "Prisma Import Identity Fixture", year: 2024, genres: ["Action"] },
  { title: "Prisma Import Identity Fixture", year: 1998, tmdbId: "990201", overview: "Metadatos" }
]);
assert.equal(mergedSameYear.length, 2, "La importación combina la fila del mismo año pero mantiene el remake.");
assert.ok(mergedSameYear.some(movie => movie.tmdbId === "990201" && movie.year === 1998));
assert.ok(mergedSameYear.some(movie => movie.year === 2024));

const batchAmbiguous = mergeMovieListByTitle([], [
  { title: "Batch Ambiguous Fixture" },
  { title: "Batch Ambiguous Fixture", year: 1998, tmdbId: "990211" },
  { title: "Batch Ambiguous Fixture", year: 2024, tmdbId: "990212" }
]);
assert.equal(batchAmbiguous.length, 3,
  "La reconciliación por lotes debe conservar una fila sin año cuando hay varios remakes, aunque aparezca primero.");
assert.equal(batchAmbiguous.filter(movie => !movieTmdbId(movie)).length, 1);

function combinedCatalog(customCatalog, rated = []) {
  let catalog = [];
  let catalogByTitle = new Map();
  const state = { watched: [], watchlist: [], hidden: [], rated };
  const model = createCatalogModel({
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
  model.combineMovies();
  return catalog;
}

const catalogRemakes = combinedCatalog([
  { title: "Prisma Catalog Identity Fixture", year: 1998, genres: ["Drama"] },
  { title: "Prisma Catalog Identity Fixture", year: 2024, tmdbId: "990301", genres: ["Action"] }
]);
assert.equal(catalogRemakes.length, 2,
  "El catálogo combinado debe preservar un registro sin ID del año 1998 frente al remake TMDB de 2024.");

const ambiguousCatalog = combinedCatalog([
  { title: "Prisma Ambiguous Catalog Fixture", year: 1998, tmdbId: "990401" },
  { title: "Prisma Ambiguous Catalog Fixture", year: 2024, tmdbId: "990402" },
  { title: "Prisma Ambiguous Catalog Fixture" }
]);
assert.equal(ambiguousCatalog.length, 3,
  "El catálogo no debe asignar una fila sin año al primer remake arbitrariamente.");

const importRows = [];
const importEffects = [];
const csvActions = createImportExportActions({
  customCatalog: importRows,
  set customCatalog(value) { this._catalog = value; },
  get customCatalog() { return this._catalog || importRows; },
  parseCatalogCSV,
  mergeMovieListByTitle,
  movieIdentityKey,
  movieTmdbId,
  uniqueStrings,
  async dbSet(key,value) { importEffects.push({key,value}); },
  logEvent() {},
  combineMovies() {},
  renderApp() {},
  toast() {}
});
await csvActions.importCatalogCSV({
  name: "ambiguous-remakes.csv",
  text: async () => [
    "title,year,tmdb_id,genres",
    "Prisma CSV Ambiguous Fixture,,,Drama",
    "Prisma CSV Ambiguous Fixture,1998,990411,Drama",
    "Prisma CSV Ambiguous Fixture,2024,990412,Action"
  ].join("\n")
});
assert.equal(csvActions ? importEffects.length : 0, 1);
const importedAmbiguous = importEffects[0].value.filter(movie => movie.title === "Prisma CSV Ambiguous Fixture");
assert.equal(importedAmbiguous.length, 3,
  "La acción de importación CSV no debe asociar un título sin año al primer remake importado.");
assert.equal(importedAmbiguous.filter(movie => !movieTmdbId(movie)).length, 1);

let lookupCatalog = [
  { title: "Prisma Lookup Identity Fixture", year: 1998, tmdbId: "990501", genres: ["Drama"] },
  { title: "Prisma Lookup Identity Fixture", year: 2024, tmdbId: "990502", genres: ["Action"] }
];
const lookupRatings = [
  { title: "Prisma Lookup Identity Fixture", year: 1998, rating: 4 },
  { title: "Prisma Lookup Identity Fixture", year: 2024, tmdbId: "990502", rating: 9 }
];
const lookupModel = createCatalogModel({
  getCustomCatalog: () => lookupCatalog,
  getState: () => ({ watched: [], watchlist: [], hidden: [], rated: lookupRatings }),
  getCatalog: () => lookupCatalog,
  getCatalogByTitle: () => new Map(),
  setCatalog: value => { lookupCatalog = value; },
  setCatalogByTitle() {},
  normalizeMovie,
  titleKey,
  movieTmdbId,
  movieIdentityKey,
  uniqueStrings,
  ratingValue,
  movieFeatures: () => []
});
assert.equal(lookupModel.findMovie("Prisma Lookup Identity Fixture", null, 2024).tmdbId, "990502",
  "La búsqueda con año debe seleccionar el remake correcto.");
assert.equal(lookupModel.findMovie("Prisma Lookup Identity Fixture", null, null), null,
  "La búsqueda sin año no debe escoger entre dos remakes.");
assert.equal(lookupModel.ratingFor("Prisma Lookup Identity Fixture", null, 1998).rating, 4,
  "La nota personal debe resolverse usando el año correcto.");
assert.equal(lookupModel.ratingFor("Prisma Lookup Identity Fixture", null, null), null,
  "No se debe atribuir una nota a un título ambiguo sin ID ni año.");

const yearLookupCalls = [];
const yearAwareFindMovie = function (title, id, year) {
  yearLookupCalls.push({ title, id, year });
  return lookupModel.findMovie(title,id,year);
};
const syntheticFeatures = movie => movie
  ? (movie.genres || []).map(genre => "género: " + String(genre).toLowerCase())
  : [];
const lookupEngine = createRecommendationEngine({
  getRatings: () => lookupRatings,
  findMovie: yearAwareFindMovie,
  movieFeatures: syntheticFeatures,
  ratingValue
});
const yearAwareProfile = lookupEngine.buildProfile();
assert.equal(yearAwareProfile.withMetadata, 2,
  "El perfil debe enlazar los metadatos de ambas películas homónimas mediante el año.");
assert.ok(yearAwareProfile.features.get("género: drama").weight < 0,
  "La nota de la película de 1998 debe aprender del género que realmente le corresponde.");
assert.ok(yearAwareProfile.features.get("género: action").weight > 0,
  "La nota de la película de 2024 debe aprender del género que realmente le corresponde.");
assert.ok(yearLookupCalls.some(call => call.year === 1998) && yearLookupCalls.some(call => call.year === 2024),
  "El motor activo debe pasar el año de cada valoración a la búsqueda de metadatos.");

const evaluatorDependencies = {
  getRatings: () => lookupRatings,
  getWatched: () => [],
  findMovie: yearAwareFindMovie,
  movieFeatures: syntheticFeatures,
  ratingValue,
  movieTmdbId,
  titleKey,
  buildProfile: ratings => lookupEngine.buildProfile(ratings),
  predictRating: (movie, profile) => lookupEngine.predictRating(movie,profile),
  getRecommendations: () => [],
  rankCandidates: rows => rows.slice()
};

yearLookupCalls.length = 0;
const classicEvaluation = createRecommendationEvaluation(evaluatorDependencies);
assert.equal(classicEvaluation.evaluateRankingQuality().available, false);
assert.ok(yearLookupCalls.some(call => call.year === 1998) && yearLookupCalls.some(call => call.year === 2024),
  "La evaluación nDCG debe pasar el año disponible a la búsqueda de metadatos.");

yearLookupCalls.length = 0;
const normalizationEvaluation = createRecommendationNormalizationEvaluation(evaluatorDependencies);
assert.equal(normalizationEvaluation.evaluate().available, false);
assert.ok(yearLookupCalls.some(call => call.year === 1998) && yearLookupCalls.some(call => call.year === 2024),
  "El experimento de normalización debe resolver por título/año.");

yearLookupCalls.length = 0;
const ridgeEvaluation = createRidgeRecommendationExperiment(evaluatorDependencies);
assert.equal(ridgeEvaluation.evaluate().available, false);
assert.ok(yearLookupCalls.some(call => call.year === 1998) && yearLookupCalls.some(call => call.year === 2024),
  "El experimento Ridge debe resolver por título/año.");

yearLookupCalls.length = 0;
assert.equal(lookupEngine.evaluateModel().available, false);
assert.ok(yearLookupCalls.some(call => call.year === 1998) && yearLookupCalls.some(call => call.year === 2024),
  "La evaluación MAE del motor activo debe resolver por título/año.");

console.log("Identidad cinematográfica correcta: ID TMDB prioritario, año en fallback, remakes conservados, aprendizaje y evaluación conscientes del año.");
