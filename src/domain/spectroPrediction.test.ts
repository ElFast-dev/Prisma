import { describe, expect, it } from "vitest";
import type { MovieRecord } from "./types";
import { predictSpectroMovies, type SpectroPredictionTrainingMovie } from "./spectroPrediction";

function movie(
  id: string,
  title: string,
  group: "memoria" | "acción" | "desconocido",
  index = 0
): MovieRecord {
  const common = {
    id,
    tmdbId: 700000 + index,
    title,
    genres: [] as string[],
    countries: [] as string[],
    lastViewingSequence: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };

  if (group === "memoria") {
    return {
      ...common,
      genres: ["Drama"],
      genreIds: [18],
      countries: ["Francia"],
      directors: ["Directora de memoria"],
      castMembers: ["Intérprete sereno " + index],
      keywords: ["memoria", "familia", "identidad"],
      originalLanguage: "fr",
      releaseYear: 2017 + index % 5,
      runtimeMinutes: 105 + index % 15,
      overview: "Una familia reconstruye su memoria y sus vínculos después de una pérdida. " +
        "La identidad y la reconciliación transforman sus relaciones."
    };
  }

  if (group === "acción") {
    return {
      ...common,
      genres: ["Acción"],
      genreIds: [28],
      countries: ["Estados Unidos"],
      directors: ["Director de acción"],
      castMembers: ["Intérprete intenso " + index],
      keywords: ["persecución", "crimen", "explosión"],
      originalLanguage: "en",
      releaseYear: 2017 + index % 5,
      runtimeMinutes: 125 + index % 20,
      overview: "Un equipo persigue a una organización criminal en una operación explosiva. " +
        "La persecución y el peligro dominan el enfrentamiento."
    };
  }

  return common;
}

function trainingMovies(): SpectroPredictionTrainingMovie[] {
  const training: SpectroPredictionTrainingMovie[] = [];
  for (let index = 0; index < 12; index += 1) {
    training.push({
      movie: movie("rated-memory-" + index, "Película de memoria " + index, "memoria", index),
      rating: index % 2 === 0 ? 9 : 8
    });
    training.push({
      movie: movie("rated-action-" + index, "Película de acción " + index, "acción", index),
      rating: index % 2 === 0 ? 5 : 4
    });
  }
  return training;
}

describe("predicción personal no lineal de Espectro", () => {
  it("aprende diferencias de valoración a partir de metadatos y sinopsis", () => {
    const training = trainingMovies();
    const candidates = [
      movie("candidate-memory", "Candidata de memoria", "memoria", 30),
      movie("candidate-action", "Candidata de acción", "acción", 31)
    ];

    const predictions = predictSpectroMovies(training, candidates);
    const memory = predictions.get("candidate-memory");
    const action = predictions.get("candidate-action");

    expect(memory).toBeDefined();
    expect(action).toBeDefined();
    expect(memory?.predictedRating).toBeGreaterThan(action?.predictedRating ?? 10);
    expect(memory?.predictedRating).toBeGreaterThan(7);
    expect(action?.predictedRating).toBeLessThan(6);
    expect(memory?.neighbors.length).toBe(3);
    expect(memory?.neighbors[0].title).toContain("memoria");
    expect(memory?.maximumSimilarity).toBeGreaterThan(0);
    expect(memory?.featureCount).toBeGreaterThan(0);
  });

  it("devuelve el promedio personal cuando una candidata no tiene rasgos comparables", () => {
    const training = trainingMovies();
    const unknown = movie("candidate-unknown", "Candidata sin metadatos", "desconocido");
    const predictions = predictSpectroMovies(training, [unknown]);
    const result = predictions.get(unknown.id);

    expect(result).toBeDefined();
    expect(result?.predictedRating).toBeCloseTo(6.5, 2);
    expect(result?.neighbors).toEqual([]);
    expect(result?.maximumSimilarity).toBe(0);
    expect(result?.featureCount).toBe(0);
  });

  it("promedia revisionados y excluye puntuaciones inválidas del entrenamiento", () => {
    const training = trainingMovies();
    const duplicated = [
      ...training,
      { movie: training[0].movie, rating: 1 },
      { movie: movie("invalid-rating", "Nota inválida", "acción"), rating: 99 }
    ];
    const averaged = training.map((item, index) => (
      index === 0 ? { ...item, rating: (item.rating + 1) / 2 } : item
    ));
    const candidate = movie("candidate-memory", "Candidata de memoria", "memoria");
    const expected = predictSpectroMovies(averaged, [candidate]).get(candidate.id);
    const actual = predictSpectroMovies(duplicated, [candidate]).get(candidate.id);

    expect(actual?.predictedRating).toBeCloseTo(expected?.predictedRating ?? 0, 8);
    expect(actual?.neighbors.map((item) => item.title)).toEqual(
      expected?.neighbors.map((item) => item.title)
    );
  });

  it("usa el promedio como fallback con menos de tres películas calificadas", () => {
    const training = trainingMovies().slice(0, 2);
    const candidate = movie("candidate-memory", "Candidata de memoria", "memoria");
    const result = predictSpectroMovies(training, [candidate]).get(candidate.id);

    expect(result?.predictedRating).toBeCloseTo(7, 2);
    expect(result?.neighbors.length).toBe(2);
  });

  it("produce resultados deterministas para la misma entrada", () => {
    const training = trainingMovies();
    const candidate = movie("candidate-memory", "Candidata de memoria", "memoria");
    const first = predictSpectroMovies(training, [candidate]).get(candidate.id);
    const second = predictSpectroMovies(training, [candidate]).get(candidate.id);

    expect(first).toEqual(second);
  });

  it("conserva las predicciones al consultar candidatas en páginas separadas", () => {
    const training = trainingMovies();
    const memory = movie("candidate-memory-page", "Candidata de memoria", "memoria", 30);
    const action = movie("candidate-action-page", "Candidata de acción", "acción", 31);

    const memoryPage = predictSpectroMovies(training, [memory]).get(memory.id);
    const actionPage = predictSpectroMovies(training, [action]).get(action.id);
    const combinedPages = predictSpectroMovies(training, [memory, action]);

    expect(memoryPage).toEqual(combinedPages.get(memory.id));
    expect(actionPage).toEqual(combinedPages.get(action.id));
  });

  it("reentrena el modelo cuando cambian las valoraciones locales", () => {
    const training = trainingMovies();
    const candidate = movie("candidate-memory-updated", "Candidata de memoria", "memoria", 32);
    const initial = predictSpectroMovies(training, [candidate]).get(candidate.id);
    const updatedTraining = training.map((item) => ({
      ...item,
      rating: item.movie.id.startsWith("rated-memory-")
        ? 10
        : item.movie.id.startsWith("rated-action-") ? 1 : item.rating
    }));
    const updated = predictSpectroMovies(updatedTraining, [candidate]).get(candidate.id);

    expect(initial).toBeDefined();
    expect(updated).toBeDefined();
    expect(updated?.predictedRating).not.toBe(initial?.predictedRating);
  });

  it("reentrena el modelo cuando cambian los metadatos cinematográficos", () => {
    const training = trainingMovies();
    const candidate = movie("candidate-memory-metadata", "Candidata de memoria", "memoria", 33);
    const initial = predictSpectroMovies(training, [candidate]).get(candidate.id);
    const updatedTraining = training.map((item) => ({
      ...item,
      movie: item.movie.id.startsWith("rated-memory-")
        ? {
          ...item.movie,
          genres: ["Ciencia ficción"],
          genreIds: [878],
          countries: ["Canadá"],
          directors: ["Nueva directora"],
          castMembers: ["Nuevo reparto"],
          keywords: ["espacio", "nave", "extraterrestres"],
          originalLanguage: "en",
          runtimeMinutes: 170,
          overview: "Una tripulación explora una estación espacial y descubre vida extraterrestre."
        }
        : item.movie
    }));
    const updated = predictSpectroMovies(updatedTraining, [candidate]).get(candidate.id);

    expect(initial).toBeDefined();
    expect(updated).toBeDefined();
    expect(updated?.predictedRating).not.toBe(initial?.predictedRating);
  });

  it("no entrena un modelo cuando no hay candidatas que clasificar", () => {
    expect(predictSpectroMovies(trainingMovies(), [])).toEqual(new Map());
  });
});
