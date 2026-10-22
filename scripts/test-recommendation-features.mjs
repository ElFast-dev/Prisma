import assert from "node:assert/strict";
import { movieFeatures } from "../js/recommendations/features.js";
import { normalizeMovie } from "../js/core/movie-utils.js";

const ordinary = movieFeatures({
  title: "Drama reciente",
  year: 2018,
  genres: ["Drama", "Drama"],
  tags: ["Viaje en el tiempo"]
});
assert.deepEqual(ordinary, ["género: drama", "tema: viaje en el tiempo", "década: 2010"]);

const canonicalScienceFiction = ["género: ciencia ficción"];
const englishTMDBGenre = movieFeatures({ title: "TMDB en inglés", genres: ["science fiction"] });
const spanishTMDBGenre = movieFeatures({ title: "TMDB normalizado", genres: ["Ciencia ficción"] });
const sciFiAlias = movieFeatures({ title: "CSV abreviado", genres: ["sci-fi"] });
const unaccentedSpanishGenre = movieFeatures({ title: "CSV sin tilde", genres: ["ciencia ficcion"] });
assert.deepEqual(englishTMDBGenre, canonicalScienceFiction);
assert.deepEqual(spanishTMDBGenre, canonicalScienceFiction);
assert.deepEqual(sciFiAlias, canonicalScienceFiction);
assert.deepEqual(unaccentedSpanishGenre, canonicalScienceFiction);

const mixedSourceGenres = movieFeatures(
  { title: "Catálogo TMDB", genres: ["Ciencia ficción"] },
  { title: "Historial personal", genres: ["SCI-FI", "science-fiction", "ciencia ficción"] }
);
assert.deepEqual(mixedSourceGenres, canonicalScienceFiction,
  "Las variantes de un mismo género deben colapsar en una sola señal aunque las fuentes discrepen.");
assert.deepEqual(movieFeatures({ title: "Alias thriller", genres: ["thriller"] }),
  movieFeatures({ title: "Alias suspense", genres: ["Suspense"] }),
  "El género inglés thriller y su alias español deben usar la misma clave.");
assert.deepEqual(normalizeMovie({ title: "CSV ciencia ficción", genres: ["SCI-FI", "science fiction"] }).genres,
  ["Ciencia ficción"],
  "El catálogo debe deduplicar los alias después de traducirlos.");

const personalYearWins = movieFeatures(
  { title: "Registro TMDB", year: 2019, genres: ["Drama"] },
  { title: "Mi historial", year: "1998" }
);
assert.ok(personalYearWins.includes("década: 1990"));
assert.ok(!personalYearWins.includes("década: 2010"));

const releaseDateFallback = movieFeatures({
  title: "Fecha normalizada",
  year: "desconocido",
  release_date: "2022-03-04"
});
assert.deepEqual(releaseDateFallback, ["década: 2020"]);

const invalidOrMissing = [
  movieFeatures({ title: "Sin fecha", genres: ["Drama"] }),
  movieFeatures({ title: "Año imposible", year: 2201, genres: ["Drama"] }),
  movieFeatures({ title: "Texto", year: "dos mil", genres: ["Drama"] }),
  movieFeatures({ title: "Fecha incorrecta", releaseDate: "desconocida" }),
  movieFeatures({ title: "Mes imposible", releaseDate: "2020-13-02", genres: ["Drama"] }),
  movieFeatures({ title: "Día imposible", releaseDate: "2020-02-30", genres: ["Drama"] }),
  movieFeatures({ title: "Día cero", release_date: "2020-03-00", genres: ["Drama"] }),
  movieFeatures({ title: "Día bisiesto inválido", releaseDate: "2019-02-29", genres: ["Drama"] }),
  movieFeatures({ title: "Fecha de visionado", watchedAt: "2020-01-02" })
];
for (const features of invalidOrMissing) {
  assert.ok(!features.some(feature => feature.startsWith("década: ")),
    "Nunca se debe inventar la década a partir de un año o una fecha no fiable.");
}

assert.deepEqual(movieFeatures({ title: "Día bisiesto válido", release_date: "2020-02-29" }), ["década: 2020"],
  "Las fechas reales de años bisiestos deben seguir siendo válidas.");
assert.deepEqual(movieFeatures({ title: "Solo década", year: 1987 }, null, { includeDecade: false }), [],
  "La variante de evaluación debe poder excluir completamente la década.");
assert.deepEqual(movieFeatures({ title: "Fecha aislada", year: 1887 }), [],
  "Un año anterior al límite de datos cinematográficos plausibles se trata como ausente.");

const richMetadata = {
  title: "Expedición del tiempo",
  year: 2021,
  genres: ["Ciencia ficción", "Misterio"],
  tags: ["Bucle temporal", "Identidad"],
  overview: "A detective investigates a mystery and travels through time. The mystery changes her investigation.",
  cast: ["Actriz Principal", "Actor Secundario"],
  directors: ["Directora Principal"],
  writers: ["Guionista Uno"],
  composers: ["Compositor Uno"],
  productionCompanies: ["Estudio Norte"],
  productionCountries: ["Canadá"],
  originalLanguage: "en",
  spokenLanguages: ["English"],
  collectionName: "Crónicas del tiempo",
  runtime: 126
};
const normalizedRichMetadata = normalizeMovie(richMetadata);
assert.deepEqual(normalizedRichMetadata.cast, richMetadata.cast);
assert.deepEqual(normalizedRichMetadata.directors, richMetadata.directors);
assert.deepEqual(normalizedRichMetadata.writers, richMetadata.writers);
assert.deepEqual(normalizedRichMetadata.composers, richMetadata.composers);
assert.deepEqual(normalizedRichMetadata.productionCompanies, richMetadata.productionCompanies);
assert.deepEqual(normalizedRichMetadata.spokenLanguages, richMetadata.spokenLanguages);
assert.equal(normalizedRichMetadata.collectionName, richMetadata.collectionName);
assert.equal(normalizedRichMetadata.originalLanguage, richMetadata.originalLanguage);
const richFeatures = movieFeatures(normalizedRichMetadata);
for (const expected of [
  "tema: bucle temporal", "actor: actriz principal", "director: directora principal",
  "guionista: guionista uno", "compositor: compositor uno", "productora: estudio norte",
  "país: canada", "idioma original: en", "idioma hablado: english",
  "saga: cronicas del tiempo", "duración: larga", "trama: mystery", "década: 2020"
]) {
  assert.ok(richFeatures.includes(expected), "Falta la característica cinematográfica " + expected);
}
assert.deepEqual(
  movieFeatures(null, { title: "Solo datos personales", rating: 10, emotions: ["Asombro"], note: "Texto personal" }),
  [],
  "Las emociones y los comentarios personales heredados nunca se convierten en características."
);
console.log("Características correctas: señales cinematográficas ampliadas, décadas válidas y exclusión de campos emocionales.");
