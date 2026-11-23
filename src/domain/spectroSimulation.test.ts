import { describe, expect, it } from "vitest";
import type { MovieRecord, Viewing } from "./types";
import { analyzeSpectro } from "./spectro";
import { predictSpectroMovies } from "./spectroPrediction";

const FIXTURE_TIME = "2026-11-23T12:00:00.000Z";

function ratedMovie(index: number, group: "preferred" | "rejected"): MovieRecord {
  const preferred = group === "preferred";
  return {
    id: "simulation-" + group + "-" + index,
    tmdbId: 880000 + index + (preferred ? 0 : 100),
    title: (preferred ? "Cine de memoria " : "Cine de guerra ") + index,
    overview: preferred
      ? "Una familia reconstruye su memoria, cultura e identidad tras una pérdida. Un viaje por sus vínculos y recuerdos."
      : "Una unidad militar persigue una conspiración violenta, venganza y crimen durante una guerra urbana.",
    genres: [preferred ? "Drama" : "Acción"],
    genreIds: [preferred ? 18 : 28],
    countries: [preferred ? "Japón" : "Estados Unidos"],
    directors: [(preferred ? "Dirección íntima " : "Dirección bélica ") + index],
    castMembers: [(preferred ? "Reparto sereno " : "Reparto de acción ") + index],
    keywords: [],
    originalLanguage: preferred ? "ja" : "en",
    releaseYear: preferred ? 2002 + index % 6 : 1982 + index % 6,
    runtimeMinutes: preferred ? 105 : 145,
    lastViewingSequence: 1,
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME
  };
}

function candidate(
  id: string,
  title: string,
  story: "preferred" | "rejected" | "unknown",
  metadata: "complete" | "sparse" | "unrepresented"
): MovieRecord {
  const common: MovieRecord = {
    id,
    tmdbId: 881000 + id.length,
    title,
    overview: story === "preferred"
      ? "Una familia reconstruye su memoria, cultura e identidad tras una pérdida. Un viaje por sus vínculos y recuerdos."
      : story === "rejected"
        ? "Una unidad militar persigue una conspiración violenta, venganza y crimen durante una guerra urbana."
        : "Un observatorio remoto descubre señales inesperadas en el océano profundo.",
    genres: [],
    genreIds: [],
    countries: [],
    directors: [],
    castMembers: [],
    keywords: [],
    lastViewingSequence: 0,
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME
  };

  if (metadata === "complete") {
    return {
      ...common,
      genres: ["Drama"],
      genreIds: [18],
      countries: ["Japón"],
      originalLanguage: "ja",
      releaseYear: 2024,
      runtimeMinutes: 110
    };
  }
  if (metadata === "sparse") {
    return {
      ...common,
      genres: ["Drama"],
      genreIds: [18],
      originalLanguage: "bn"
    };
  }
  return {
    ...common,
    genres: ["Misterio"],
    genreIds: [9648],
    countries: ["India"],
    originalLanguage: "hi"
  };
}

function viewing(movie: MovieRecord, index: number, rating: number): Viewing {
  const date = "2026-09-" + String(index + 1).padStart(2, "0");
  return {
    id: "simulation-viewing-" + movie.id,
    movieId: movie.id,
    sequenceNumber: 1,
    watchedOn: date,
    rating,
    createdAt: date + "T12:00:00.000Z",
    updatedAt: date + "T12:00:00.000Z",
    operationId: "simulation-operation-" + movie.id
  };
}

function runRecommendationSimulation() {
  const training = [
    ...Array.from({ length: 8 }, (_, index) => ({
      movie: ratedMovie(index, "preferred"),
      rating: 9
    })),
    ...Array.from({ length: 8 }, (_, index) => ({
      movie: ratedMovie(index, "rejected"),
      rating: 3
    }))
  ];
  const candidates = [
    candidate("simulation-preferred-complete", "Memoria entre generaciones", "preferred", "complete"),
    candidate("simulation-rejected-story", "Una guerra sin descanso", "rejected", "complete"),
    candidate("simulation-preferred-sparse", "La memoria de una comunidad", "preferred", "sparse"),
    candidate("simulation-rejected-metadata", "Acción y venganza", "rejected", "unrepresented"),
    candidate("simulation-unrepresented", "El observatorio remoto", "unknown", "unrepresented")
  ];
  const viewings = training.map((item, index) => viewing(item.movie, index, item.rating));
  const analysis = analyzeSpectro({
    movies: training.map((item) => item.movie),
    viewings,
    candidates,
    computedAt: FIXTURE_TIME
  });
  const predictions = predictSpectroMovies(training, candidates);
  const recommendationIds = analysis.recommendations.map((item) => item.movie.id);
  const preferred = analysis.recommendations.find(
    (item) => item.movie.id === "simulation-preferred-complete"
  );
  const rejectedStoryPrediction = predictions.get("simulation-rejected-story");
  const sparse = analysis.recommendations.find(
    (item) => item.movie.id === "simulation-preferred-sparse"
  );

  return {
    algorithmVersion: analysis.algorithmVersion,
    ratedMovies: analysis.movieCount,
    candidateCount: candidates.length,
    recommendations: analysis.recommendations.map((item) => ({
      title: item.movie.title,
      predictedRating: item.predictedRating,
      fitPercentage: item.fitPercentage,
      confidence: item.confidence
    })),
    checks: {
      likedSynopsisRanksAboveRejectedSynopsis: Boolean(
        preferred
        && rejectedStoryPrediction
        && preferred.predictedRating > rejectedStoryPrediction.predictedRating
      ),
      rejectedNarrativeExcluded: !recommendationIds.includes("simulation-rejected-story"),
      sparseInternationalCandidateCanBeRecommended: Boolean(sparse),
      rejectedMetadataCandidateExcluded: !recommendationIds.includes("simulation-rejected-metadata"),
      unrepresentedCandidateExcluded: !recommendationIds.includes("simulation-unrepresented"),
      synopsisPredictionGap: Number((
        (predictions.get("simulation-preferred-complete")?.predictedRating ?? 0)
        - (rejectedStoryPrediction?.predictedRating ?? 0)
      ).toFixed(2)),
      rejectedStoryPrediction: rejectedStoryPrediction?.predictedRating ?? null,
      rejectedStoryMaximumSimilarity: rejectedStoryPrediction?.maximumSimilarity ?? null
    }
  };
}

describe("simulación reproducible de calidad de Espectro", () => {
  it("prioriza narrativas afines, respeta señales negativas y tolera metadatos escasos", () => {
    const report = runRecommendationSimulation();
    console.info("[Simulación de Espectro]", JSON.stringify(report, null, 2));

    expect(report.algorithmVersion).toBe("2.8.0");
    expect(report.ratedMovies).toBe(16);
    expect(report.candidateCount).toBe(5);
    expect(report.checks.likedSynopsisRanksAboveRejectedSynopsis).toBe(true);
    expect(report.checks.synopsisPredictionGap).toBeGreaterThan(1.5);
    expect(report.checks.rejectedNarrativeExcluded).toBe(true);
    expect(report.checks.sparseInternationalCandidateCanBeRecommended).toBe(true);
    expect(report.checks.rejectedMetadataCandidateExcluded).toBe(true);
    expect(report.checks.unrepresentedCandidateExcluded).toBe(true);
  });
});
