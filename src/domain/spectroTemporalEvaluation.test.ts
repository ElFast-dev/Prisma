import { describe, expect, it } from "vitest";
import type { MovieRecord, Viewing } from "./types";
import { evaluateSpectroTemporally } from "./spectroTemporalEvaluation";

function ratedMovie(index: number): MovieRecord {
  const preferred = index % 2 === 0;
  return {
    id: "temporal-movie-" + index,
    tmdbId: 990000 + index,
    title: (preferred ? "Historia de memoria " : "Relato de acción ") + index,
    overview: preferred
      ? "Una familia reconstruye su memoria e identidad después de una pérdida. Sus vínculos cambian."
      : "Una unidad militar persigue una organización criminal durante una guerra urbana. La persecución continúa.",
    genres: [preferred ? "Drama" : "Acción"],
    genreIds: [preferred ? 18 : 28],
    countries: [preferred ? "Japón" : "Estados Unidos"],
    directors: [preferred ? "Directora de memoria" : "Director de acción"],
    castMembers: [preferred ? "Reparto de memoria" : "Reparto de acción"],
    keywords: [preferred ? "familia" : "persecución"],
    originalLanguage: preferred ? "ja" : "en",
    releaseYear: preferred ? 2000 + index % 8 : 1980 + index % 8,
    runtimeMinutes: preferred ? 105 : 145,
    lastViewingSequence: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function viewedOn(index: number): string {
  return "2026-01-" + String(index + 1).padStart(2, "0");
}

function viewing(index: number): Viewing {
  return {
    id: "temporal-viewing-" + index,
    movieId: "temporal-movie-" + index,
    sequenceNumber: 1,
    watchedOn: viewedOn(index),
    rating: index % 2 === 0 ? 9 : 3,
    createdAt: viewedOn(index) + "T12:00:00.000Z",
    updatedAt: viewedOn(index) + "T12:00:00.000Z",
    operationId: "temporal-operation-" + index
  };
}

function fixture(count = 24): { movies: MovieRecord[]; viewings: Viewing[] } {
  return {
    movies: Array.from({ length: count }, (_, index) => ratedMovie(index)),
    viewings: Array.from({ length: count }, (_, index) => viewing(index))
  };
}

const options = {
  minimumTrainingMovies: 12,
  testWindowMovies: 4,
  minimumTestMovies: 4,
  maximumFolds: 3,
  relevantRatingThreshold: 7,
  rankingCutoff: 3
};

describe("evaluación temporal reproducible de Espectro", () => {
  it("usa ventanas cronológicas expansivas y cuenta películas distintas", () => {
    const data = fixture();
    const report = evaluateSpectroTemporally(data.movies, data.viewings, options);

    expect(report.status).toBe("evaluated");
    expect(report.uniqueRatedMovies).toBe(24);
    expect(report.foldCount).toBe(3);
    expect(report.folds.map((fold) => [
      fold.trainingMovieCount,
      fold.testMovieCount
    ])).toEqual([
      [12, 4],
      [16, 4],
      [20, 4]
    ]);
    expect(report.folds.every((fold) => fold.predictionCoverage === 1)).toBe(true);
    expect(report.aggregate?.rbfWinRateAgainstMeanBaseline).toBeGreaterThanOrEqual(0);
    expect(report.aggregate?.ndcgAtK).toBeGreaterThanOrEqual(0);
    expect(report.aggregate?.ndcgAtK).toBeLessThanOrEqual(1);
  });

  it("agrega revisionados antes del corte y descarta notas o fechas inválidas", () => {
    const data = fixture();
    data.viewings.push({
      ...data.viewings[0],
      id: "temporal-rewatch-before-cut",
      sequenceNumber: 2,
      rating: 7
    });
    data.viewings.push({
      ...data.viewings[1],
      id: "temporal-invalid-rating",
      sequenceNumber: 2,
      rating: 11
    });
    data.viewings.push({
      ...data.viewings[2],
      id: "temporal-invalid-date",
      sequenceNumber: 2,
      watchedOn: "2026-02-30",
      rating: 8
    });

    const report = evaluateSpectroTemporally(data.movies, data.viewings, options);

    expect(report.status).toBe("evaluated");
    expect(report.uniqueRatedMovies).toBe(24);
    expect(report.folds[0].trainingMovieCount).toBe(12);
    expect(report.folds[0].testMovieCount).toBe(4);
    expect(report.folds[0].metrics.mae).toBeGreaterThanOrEqual(0);
  });

  it("no inventa una evaluación cuando no hay suficientes títulos distintos", () => {
    const data = fixture(14);
    const repeatedOnly = Array.from({ length: 20 }, (_, index) => ({
      ...data.viewings[0],
      id: "same-title-rewatch-" + index,
      sequenceNumber: index + 1
    }));
    const report = evaluateSpectroTemporally(
      data.movies.slice(0, 1),
      repeatedOnly,
      options
    );

    expect(report.status).toBe("insufficient-data");
    expect(report.reason).toBe("not-enough-distinct-rated-movies");
    expect(report.uniqueRatedMovies).toBe(1);
    expect(report.folds).toEqual([]);
  });

  it("produce métricas deterministas y un informe sin títulos, identificadores ni notas", () => {
    const data = fixture();
    const first = evaluateSpectroTemporally(data.movies, data.viewings, options);
    const second = evaluateSpectroTemporally(data.movies, data.viewings, options);
    const serialized = JSON.stringify(first);

    expect(second).toEqual(first);
    expect(serialized).not.toContain("temporal-movie-");
    expect(serialized).not.toContain("Historia de memoria");
    expect(serialized).not.toContain("Relato de acción");
    expect(serialized).not.toContain('"rating"');
    expect(first.metadataScope).toBe("current-catalog-snapshot");
    expect(first.limitations.length).toBeGreaterThan(0);
  });
});
