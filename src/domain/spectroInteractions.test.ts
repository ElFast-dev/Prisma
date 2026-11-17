import { describe, expect, it } from "vitest";
import { buildSpectroInteractions, type SpectroInteractionMovie } from "./spectroInteractions";

function interactionMovies(): SpectroInteractionMovie[] {
  const movies: SpectroInteractionMovie[] = [];
  const combinations = [
    { genre: "Drama", genreId: 18, narrative: "Memoria", rating: 10 },
    { genre: "Drama", genreId: 18, narrative: "Amistad", rating: 6 },
    { genre: "Comedia", genreId: 35, narrative: "Memoria", rating: 6 },
    { genre: "Comedia", genreId: 35, narrative: "Amistad", rating: 10 }
  ];

  for (const combination of combinations) {
    for (let index = 0; index < 20; index += 1) {
      const id = "interaction-" + combination.genreId + "-" + combination.narrative + "-" + index;
      movies.push({
        id,
        title: id,
        rating: combination.rating,
        groups: [
          {
            category: "Género",
            features: [{ key: "genre:" + combination.genreId, label: combination.genre }]
          },
          {
            category: "Narrativa",
            features: [{ key: "narrative:" + combination.narrative.toLocaleLowerCase(), label: combination.narrative }]
          },
          {
            category: "Idioma",
            features: [{ key: "language:es", label: "Español" }]
          }
        ]
      });
    }
  }
  return movies;
}

describe("aprendizaje general de interacciones", () => {
  it("descubre combinaciones entre familias no predefinidas y controla falsos descubrimientos", () => {
    const patterns = buildSpectroInteractions(interactionMovies());
    const positive = patterns.find((pattern) => (
      pattern.key === "genre:18::narrative:memoria"
    ));
    const negative = patterns.find((pattern) => (
      pattern.key === "genre:18::narrative:amistad"
    ));

    expect(positive).toBeDefined();
    expect(positive?.difference).toBeGreaterThan(1);
    expect(positive?.sampleSize).toBe(20);
    expect(positive?.qValue).toBeLessThanOrEqual(0.05);
    expect(positive?.foldCount).toBeGreaterThanOrEqual(3);
    expect(positive?.foldConsistency).toBeGreaterThanOrEqual(0.75);
    expect(positive?.supportingMovies).toHaveLength(3);

    expect(negative).toBeDefined();
    expect(negative?.difference).toBeLessThan(-1);
    expect(negative?.qValue).toBeLessThanOrEqual(0.05);
  });

  it("no produce hallazgos con una muestra demasiado pequeña", () => {
    const movies = interactionMovies().slice(0, 7);
    expect(buildSpectroInteractions(movies)).toEqual([]);
  });

  it("no cuenta dos veces la misma película dentro de la muestra", () => {
    const movies = interactionMovies();
    const duplicated = [...movies.slice(0, 7), { ...movies[0], rating: 1 }];
    expect(buildSpectroInteractions(duplicated)).toEqual([]);
  });
});
