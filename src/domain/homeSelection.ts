import type { MovieRecord } from "./types";
import {
  getSpectroMovieFeatureKeys,
  type SpectroConfidence,
  type SpectroRecommendation,
  type SpectroRecommendationReason
} from "./spectro";

export type HomePickKind = "safe" | "discovery" | "outside";
export type HomePickConfidence = SpectroConfidence | "insuficiente";
export type HomePickSource = "pending" | "catalog";

export interface HomePick {
  kind: HomePickKind;
  movie: MovieRecord;
  source: HomePickSource;
  fitPercentage: number | null;
  predictedRating: number | null;
  confidence: HomePickConfidence;
  explanation: string;
  reasons: SpectroRecommendationReason[];
}

export interface HomeSelectionInput {
  candidates: MovieRecord[];
  recommendations: SpectroRecommendation[];
  pendingMovieIds: string[];
  knownFeatureKeys: string[];
}

function confidenceRank(value: SpectroConfidence): number {
  if (value === "sólida") return 4;
  if (value === "moderada") return 3;
  if (value === "declarada") return 2;
  if (value === "inicial") return 1;
  return 0;
}

function noveltyOf(movie: MovieRecord, knownFeatures: Set<string>): number {
  const features = [...new Set(getSpectroMovieFeatureKeys(movie))];
  if (features.length === 0) return 0;
  return features.filter((feature) => !knownFeatures.has(feature)).length / features.length;
}

function firstPositiveReason(reasons: SpectroRecommendationReason[]): SpectroRecommendationReason | undefined {
  return [...reasons]
    .filter((reason) => reason.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)[0];
}

function explanationFor(
  kind: HomePickKind,
  recommendation: SpectroRecommendation | undefined,
  novelty: number
): string {
  if (kind === "safe") {
    const reason = recommendation ? firstPositiveReason(recommendation.reasons) : undefined;
    return reason
      ? "Se apoya en tu afinidad con " + reason.label + " (" + reason.sampleSize + " películas de referencia)."
      : "Es la opción con mayor encaje relativo entre las películas que podemos evaluar.";
  }
  if (kind === "discovery") {
    const reason = recommendation ? firstPositiveReason(recommendation.reasons) : undefined;
    const shared = reason
      ? "Conserva una conexión con " + reason.label
      : "Conserva algunas conexiones con tus gustos conocidos";
    return shared + " y combina rasgos menos habituales en tu historial.";
  }
  if (recommendation) {
    return "Tiene menos coincidencias con las señales que hoy conocemos. Es una invitación a explorar, no una predicción de rechazo.";
  }
  if (novelty > 0.65) {
    return "Comparte pocas características con tus afinidades conocidas. Prisma todavía no tiene evidencia suficiente para estimar una nota.";
  }
  return "Es una alternativa menos familiar. La información disponible no permite estimar con fiabilidad cómo la valorarías.";
}

function createPick(
  kind: HomePickKind,
  movie: MovieRecord,
  pendingIds: Set<string>,
  recommendation: SpectroRecommendation | undefined,
  novelty: number
): HomePick {
  return {
    kind,
    movie,
    source: pendingIds.has(movie.id) ? "pending" : "catalog",
    fitPercentage: recommendation?.fitPercentage ?? null,
    predictedRating: recommendation?.predictedRating ?? null,
    confidence: recommendation?.confidence ?? "insuficiente",
    explanation: explanationFor(kind, recommendation, novelty),
    reasons: recommendation?.reasons ?? []
  };
}

/**
 * Elige propuestas distintas. La exploración sin respaldo puede mostrarse,
 * pero nunca recibe un encaje ni una nota inventados.
 */
export function selectHomePicks(input: HomeSelectionInput): HomePick[] {
  const candidatesById = new Map(input.candidates.map((movie) => [movie.id, movie]));
  const pendingIds = new Set(input.pendingMovieIds);
  const knownFeatures = new Set(input.knownFeatureKeys);
  const recommendationById = new Map(
    input.recommendations.map((recommendation) => [recommendation.movie.id, recommendation])
  );
  const usedIds = new Set<string>();
  const picks: HomePick[] = [];

  const scored = input.recommendations
    .filter((recommendation) => candidatesById.has(recommendation.movie.id))
    .sort((a, b) => (
      confidenceRank(b.confidence) - confidenceRank(a.confidence)
      || b.fitPercentage - a.fitPercentage
      || b.predictedRating - a.predictedRating
      || a.movie.title.localeCompare(b.movie.title)
    ));

  const safe = scored[0];
  if (safe) {
    picks.push(createPick("safe", safe.movie, pendingIds, safe, noveltyOf(safe.movie, knownFeatures)));
    usedIds.add(safe.movie.id);
  }

  const availableScored = scored.filter((item) => !usedIds.has(item.movie.id));
  const safeGenres = new Set(
    safe ? getSpectroMovieFeatureKeys(safe.movie).filter((key) => key.startsWith("genre:")) : []
  );
  const discovery = [...availableScored].sort((a, b) => {
    const score = (item: SpectroRecommendation) => {
      const novelty = noveltyOf(item.movie, knownFeatures);
      const sharesGenre = getSpectroMovieFeatureKeys(item.movie)
        .some((key) => key.startsWith("genre:") && safeGenres.has(key));
      return item.fitPercentage + novelty * 14 - (sharesGenre ? 5 : 0);
    };
    return score(b) - score(a)
      || b.predictedRating - a.predictedRating
      || a.movie.title.localeCompare(b.movie.title);
  })[0];

  if (discovery) {
    picks.push(createPick("discovery", discovery.movie, pendingIds, discovery, noveltyOf(discovery.movie, knownFeatures)));
    usedIds.add(discovery.movie.id);
  }

  const outside = input.candidates
    .filter((movie) => !usedIds.has(movie.id) && getSpectroMovieFeatureKeys(movie).length >= 2)
    .sort((a, b) => {
      const noveltyA = noveltyOf(a, knownFeatures);
      const noveltyB = noveltyOf(b, knownFeatures);
      const recommendationA = recommendationById.get(a.id);
      const recommendationB = recommendationById.get(b.id);
      const scoreA = noveltyA * 100 + (recommendationA ? (100 - recommendationA.fitPercentage) * 0.35 + 8 : 0);
      const scoreB = noveltyB * 100 + (recommendationB ? (100 - recommendationB.fitPercentage) * 0.35 + 8 : 0);
      return scoreB - scoreA
        || (b.releaseYear ?? 0) - (a.releaseYear ?? 0)
        || a.title.localeCompare(b.title);
    })[0];

  if (outside) {
    picks.push(createPick(
      "outside",
      outside,
      pendingIds,
      recommendationById.get(outside.id),
      noveltyOf(outside, knownFeatures)
    ));
  }

  return picks;
}
