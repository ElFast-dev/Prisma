import type { HomePick } from "../../domain/homeSelection";
import { selectHomePicks } from "../../domain/homeSelection";
import { rankSpectroCandidates } from "../../domain/spectro";
import type { MovieRecord } from "../../domain/types";
import { prismaDb } from "./database";
import { getSpectroAnalysis } from "./spectroRepository";

export interface HomeRecommendationResult {
  picks: HomePick[];
  ratedMovieCount: number;
  candidateCount: number;
  hasEnoughData: boolean;
}

export async function getHomeRecommendations(): Promise<HomeRecommendationResult> {
  const [analysis, movies, viewings, libraryEntries] = await Promise.all([
    getSpectroAnalysis(),
    prismaDb.movies.toArray(),
    prismaDb.viewings.toArray(),
    prismaDb.libraryEntries.toArray()
  ]);

  const entriesByMovie = new Map(libraryEntries.map((entry) => [entry.movieId, entry]));
  const viewedMovieIds = new Set(viewings.map((viewing) => viewing.movieId));
  const candidates: MovieRecord[] = movies.filter((movie) => {
    const entry = entriesByMovie.get(movie.id);
    if (entry?.status === "watched") return false;
    return !viewedMovieIds.has(movie.id);
  });
  const pendingMovieIds = libraryEntries
    .filter((entry) => entry.status === "pending")
    .map((entry) => entry.movieId);
  const ranking = rankSpectroCandidates(analysis, movies, viewings, candidates);
  const knownFeatureKeys = [
    ...[
      ...analysis.genreAffinities,
      ...analysis.directorAffinities,
      ...analysis.castAffinities,
      ...analysis.countryAffinities,
      ...analysis.decadeAffinities,
      ...analysis.languageAffinities,
      ...analysis.durationAffinities,
      ...analysis.themeAffinities
    ]
      .filter((affinity) => (
        affinity.sampleSize >= 3
        && (affinity.confidence === "moderada" || affinity.confidence === "sólida")
      ))
      .map((affinity) => affinity.key),
    ...analysis.favoriteSignals.map((signal) => signal.key)
  ];

  return {
    picks: selectHomePicks({
      candidates,
      recommendations: ranking.recommendations,
      pendingMovieIds,
      knownFeatureKeys
    }),
    ratedMovieCount: analysis.movieCount,
    candidateCount: candidates.length,
    hasEnoughData: analysis.hasEnoughData
  };
}
