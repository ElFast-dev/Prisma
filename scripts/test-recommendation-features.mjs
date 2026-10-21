import assert from "node:assert/strict";
import { movieFeatures } from "../js/recommendations/features.js";

const ordinary = movieFeatures({
  title: "Drama reciente",
  year: 2018,
  genres: ["Drama", "Drama"],
  tags: ["Viaje en el tiempo"]
});
assert.deepEqual(ordinary, ["género: drama", "tema: viaje en el tiempo", "década: 2010"]);

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
  movieFeatures({ title: "Fecha de visionado", watchedAt: "2020-01-02" })
];
for (const features of invalidOrMissing) {
  assert.ok(!features.some(feature => feature.startsWith("década: ")),
    "Nunca se debe inventar la década a partir de un año o una fecha no fiable.");
}

assert.deepEqual(movieFeatures({ title: "Solo década", year: 1987 }, null, { includeDecade: false }), [],
  "La variante de evaluación debe poder excluir completamente la década.");
assert.deepEqual(movieFeatures({ title: "Fecha aislada", year: 1887 }), [],
  "Un año anterior al límite de datos cinematográficos plausibles se trata como ausente.");
console.log("Características de recomendación correctas: décadas válidas, prioridad de registro, fechas ISO, ausencia y ablación.");
