import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { movieFeatures } from "../js/recommendations/features.js";
import { createTMDBClient } from "../js/tmdb/client.js";

const [ratingUi, controller, actions, historySync, browserActions] = await Promise.all([
  readFile(new URL("../js/ui/modal-views.js", import.meta.url), "utf8"),
  readFile(new URL("../js/ui/modal-controller.js", import.meta.url), "utf8"),
  readFile(new URL("../js/app/movie-actions.js", import.meta.url), "utf8"),
  readFile(new URL("../js/tmdb/history-sync.js", import.meta.url), "utf8"),
  readFile(new URL("../js/tmdb/browser-actions.js", import.meta.url), "utf8")
]);
assert.doesNotMatch(ratingUi, /¿Qué emociones recuerdas\?|emotion-chip|rating-memories|Añadir recuerdos/);
assert.doesNotMatch(controller, /modalDraft\.emotions|memoriesExpanded/);
assert.doesNotMatch(actions, /ctx\.modalDraft\.emotions|ratingNote|emociones registradas/);
assert.match(actions, /rating:rating/);
assert.match(controller, /ratingFor\(movie\.title, movie\.tmdbId\)/,
  "La valoración debe asociarse al ID TMDB correcto cuando está disponible.");
assert.match(historySync, /append_to_response: "credits,keywords"/);
assert.match(browserActions, /enrichRecommendationCandidates/);
assert.match(browserActions, /slice\(0, 6\)/,
  "La obtención de metadatos debe limitarse a una cantidad acotada de candidatas.");

const client = createTMDBClient({
  getCredential: () => null,
  displayGenre: value => value,
  uniqueStrings: values => [...new Set(values.filter(Boolean))]
});
const movie = client.fromTMDB({
  id: 321,
  title: "La película de prueba",
  release_date: "2022-04-05",
  genres: [{ name: "Misterio" }, { name: "Ciencia ficción" }],
  overview: "A detective investigates a mystery and travels through time. The mystery transforms her investigation.",
  original_language: "en",
  spoken_languages: [{ english_name: "English", iso_639_1: "en" }],
  production_countries: [{ name: "Canadá" }],
  production_companies: [{ name: "Estudio Norte" }],
  belongs_to_collection: { name: "Crónicas" },
  runtime: 111,
  keywords: { keywords: [{ name: "Bucle temporal" }] },
  credits: {
    cast: [{ name: "Actriz Principal" }, { name: "Actor Secundario" }],
    crew: [
      { name: "Directora Principal", job: "Director" },
      { name: "Guionista Uno", job: "Screenplay" },
      { name: "Compositor Uno", job: "Original Music Composer" }
    ]
  }
});
assert.deepEqual(movie.cast, ["Actriz Principal", "Actor Secundario"]);
assert.deepEqual(movie.directors, ["Directora Principal"]);
assert.deepEqual(movie.writers, ["Guionista Uno"]);
assert.deepEqual(movie.composers, ["Compositor Uno"]);
assert.deepEqual(movie.productionCompanies, ["Estudio Norte"]);
assert.deepEqual(movie.productionCountries, ["Canadá"]);
assert.deepEqual(movie.spokenLanguages, ["English"]);
assert.equal(movie.originalLanguage, "en");
assert.equal(movie.collectionName, "Crónicas");

const features = movieFeatures(movie);
for (const prefix of [
  "género: ", "tema: ", "trama: ", "actor: ", "director: ", "guionista: ",
  "compositor: ", "productora: ", "país: ", "idioma original: ",
  "idioma hablado: ", "saga: ", "duración: ", "década: "
]) {
  assert.ok(features.some(feature => feature.startsWith(prefix)), "Falta señal cinematográfica " + prefix);
}
assert.equal(
  movieFeatures({ title: "Película sin metadatos" }, { rating: 10, emotions: ["Asombro"], note: "Asombro" }).length,
  0,
  "Los registros emocionales antiguos no se convierten en características."
);
console.log("Flujo de nota numérica y metadatos ricos de TMDB validado con datos sintéticos.");
