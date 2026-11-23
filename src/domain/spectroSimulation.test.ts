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
  const training = Array.from({ length: 8 }, (_, index) => [
    { movie: ratedMovie(index, "preferred"), rating: 9 },
    { movie: ratedMovie(index, "rejected"), rating: 3 }
  ]).flat();
  const candidates = [
    candidate("simulation-preferred-complete", "Memoria entre generaciones", "preferred", "complete"),
    candidate("simulation-rejected-story", "Una guerra sin descanso", "rejected", "complete"),
    candidate("simulation-preferred-sparse", "La memoria de una comunidad", "preferred", "sparse"),
    candidate("simulation-rejected-metadata", "Acción y venganza", "rejected", "unrepresented"),
    candidate("simulation-unrepresented", "El observatorio remoto", "unknown", "unrepresented"),
    {
      ...candidate("simulation-low-evidence", "Coincidencia mínima", "rejected", "complete"),
      overview: "guerra",
      genres: ["Drama"],
      genreIds: [18],
      countries: [],
      directors: [],
      castMembers: [],
      keywords: [],
      originalLanguage: undefined,
      releaseYear: undefined,
      runtimeMinutes: undefined
    },
    {
      ...candidate("simulation-favorite-override", "Una historia bélica favorita", "rejected", "complete"),
      genres: ["Aventura"],
      genreIds: [12],
      countries: ["México"],
      directors: ["Dirección favorita explícita"],
      castMembers: ["Reparto favorito explícito"],
      originalLanguage: "ko",
      releaseYear: 1995,
      runtimeMinutes: 160
    }
  ];
  const favoriteAnchor: MovieRecord = {
    ...candidates[candidates.length - 1],
    id: "simulation-favorite-anchor",
    tmdbId: 882000,
    title: "Favorito declarado",
    overview: "Una familia encuentra una comunidad perdida y protege su memoria."
  };
  const viewings = training.map((item, index) => viewing(item.movie, index, item.rating));
  const analysis = analyzeSpectro({
    movies: [...training.map((item) => item.movie), favoriteAnchor],
    viewings,
    candidates,
    favoriteMovieIds: [favoriteAnchor.id],
    computedAt: FIXTURE_TIME
  });
  const predictions = predictSpectroMovies(training, candidates);
  const holdoutTraining = training.slice(0, 12);
  const holdout = training.slice(12);
  const holdoutPredictions = predictSpectroMovies(
    holdoutTraining,
    holdout.map((item) => item.movie)
  );
  const holdoutAbsoluteErrors = holdout.map((item) => Math.abs(
    (holdoutPredictions.get(item.movie.id)?.predictedRating ?? 0) - item.rating
  ));
  const holdoutMae = holdoutAbsoluteErrors.reduce((sum, error) => sum + error, 0)
    / holdoutAbsoluteErrors.length;
  const holdoutBaselineRating = holdoutTraining.reduce((sum, item) => sum + item.rating, 0)
    / holdoutTraining.length;
  const holdoutBaselineMae = holdout.reduce(
    (sum, item) => sum + Math.abs(holdoutBaselineRating - item.rating),
    0
  ) / holdout.length;
  const recommendationIds = analysis.recommendations.map((item) => item.movie.id);
  const preferred = analysis.recommendations.find(
    (item) => item.movie.id === "simulation-preferred-complete"
  );
  const rejectedStoryPrediction = predictions.get("simulation-rejected-story");
  const sparse = analysis.recommendations.find(
    (item) => item.movie.id === "simulation-preferred-sparse"
  );
  const weakEvidenceCandidate = analysis.recommendations.find(\n    (item) => item.movie.id === "simulation-low-evidence"\n  );\n  const weakEvidencePrediction = predictions.get("simulation-low-evidence");\n  const favoriteOverride = analysis.recommendations.find(
    (item) => item.movie.id === "simulation-favorite-override"
  );
  const favoriteOverridePrediction = predictions.get("simulation-favorite-override");

  return {
    algorithmVersion: analysis.algorithmVersion,
    ratedMovies: analysis.movieCount,
    candidateCount: candidates.length,
    holdout: {
      trainingMovies: holdoutTraining.length,
      heldOutMovies: holdout.length,
      modelMae: Number(holdoutMae.toFixed(2)),
      meanBaselineMae: Number(holdoutBaselineMae.toFixed(2)),
      noMovieIdOverlap: holdout.every((item) => (
        !holdoutTraining.some((trainingItem) => trainingItem.movie.id === item.movie.id)
      ))
    },
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
      weakEvidenceDoesNotTriggerNegativeFilter: Boolean(
        weakEvidenceCandidate
        && weakEvidencePrediction
        && weakEvidencePrediction.maximumSimilarity < 0.4
      ),
      explicitFavoriteOverridesNegativePrediction: Boolean(
        favoriteOverride
        && favoriteOverridePrediction
        && favoriteOverridePrediction.maximumSimilarity >= 0.4
        && favoriteOverridePrediction.predictedRating < (analysis.averageRating ?? 10) - 0.25
        && favoriteOverride.confidence === "declarada"
      ),
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
    expect(report.candidateCount).toBe(7);
    expect(report.holdout.trainingMovies).toBe(12);
    expect(report.holdout.heldOutMovies).toBe(4);
    expect(report.holdout.noMovieIdOverlap).toBe(true);
    expect(report.holdout.modelMae).toBeLessThan(report.holdout.meanBaselineMae);
    expect(report.checks.likedSynopsisRanksAboveRejectedSynopsis).toBe(true);
    expect(report.checks.synopsisPredictionGap).toBeGreaterThan(1.5);
    expect(report.checks.rejectedNarrativeExcluded).toBe(true);
    expect(report.checks.weakEvidenceDoesNotTriggerNegativeFilter).toBe(true);
    expect(report.checks.explicitFavoriteOverridesNegativePrediction).toBe(true);
    expect(report.checks.sparseInternationalCandidateCanBeRecommended).toBe(true);
    expect(report.checks.rejectedMetadataCandidateExcluded).toBe(true);
    expect(report.checks.unrepresentedCandidateExcluded).toBe(true);
  });
});
