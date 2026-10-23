import assert from "node:assert/strict";
import { createRecommendationRanking } from "../js/recommendations/ranking.js";
import { createRecommendationEvaluation } from "../js/recommendations/evaluation.js";
import { uniqueDiscoveryMovies, movieTmdbId } from "../js/core/movie-utils.js";

function fixture({ localCount = 4, remoteCount = 2, sameGenre = false, emptyProfile = false } = {}) {
  const catalog = Array.from({ length: localCount }, (_, index) => ({
    tmdbId: String(3000 + index), title: "Local " + index,
    year: 2000 + index, genres: [sameGenre ? "Drama" : ["Drama", "Comedy", "Action"][index % 3]],
    source: "local"
  }));
  const candidates = Array.from({ length: remoteCount }, (_, index) => ({
    tmdbId: String(index === 0 && catalog.length ? catalog[0].tmdbId : 4000 + index),
    title: index === 0 && catalog.length ? catalog[0].title : "Remote " + index,
    year: 2022, genres: [sameGenre ? "Drama" : ["Drama", "Mystery", "Animation"][index % 3]],
    source: "tmdb"
  }));
  const excludedId = catalog.length ? catalog[catalog.length - 1].tmdbId : "";
  const ctx = {
    catalog,
    recommendationCandidates: candidates,
    state: { rated: [] },
    buildProfile: () => ({ count: emptyProfile ? 0 : 3, average: 7, personalAverage: 7, features: new Map(), withMetadata: 3 }),
    predictRating: movie => ({ score: 8.5, matches: [], freshFeatures: 0 }),
    uniqueDiscoveryMovies,
    isMovieInCollection: (_title, id) => String(id) === String(excludedId),
    ratingValue: entry => Number(entry && entry.rating),
    findMovie: () => null
  };
  const ranking = createRecommendationRanking(ctx);
  const evaluation = createRecommendationEvaluation({
    getRatings: () => [],
    findMovie: () => null,
    movieFeatures: () => [],
    ratingValue: () => null,
    buildProfile: ctx.buildProfile,
    predictRating: ctx.predictRating,
    getRecommendations: ranking.getRecommendations,
    rankCandidates: ranking.rankCandidates,
    getCandidatePoolCounts: ranking.getCandidatePoolCounts,
    movieTmdbId,
    titleKey: value => String(value || "").toLowerCase()
  });
  return { ctx, ranking, evaluation, excludedId };
}

const four = fixture({ localCount: 5, remoteCount: 1 });
const counts = four.ranking.getCandidatePoolCounts(5, "variety", four.ctx.buildProfile());
assert.equal(counts.remoteCandidatesReceived, 1,
  "The legacy candidatesAvailable count is explicitly the remote, temporary TMDB pool");
assert.equal(counts.localCatalogEntries, 5);
assert.equal(counts.localCandidatesEligible, 4,
  "Local candidates in the personal collection must be excluded from eligible local count");
assert.equal(counts.eligibleCandidatePool, 4,
  "A remote row duplicating a local TMDB identity must not increase the eligible pool");
assert.equal(counts.rankedResultsAvailable, 4);
const fourMode = await four.evaluation.evaluateRecommendationQualityAsync();
const fourVariety = fourMode.candidateAvailability.find(item => item.mode === "variety");
assert.equal(fourVariety.requestedResultLimit, 5);
assert.equal(fourVariety.returnedResultCount, 4);
assert.equal(fourVariety.shortfallReason, "eligible-pool-too-small",
  "Four results out of five are explained by only four eligible unique candidates.");

const diverse = fixture({ localCount: 8, remoteCount: 0, sameGenre: true });
const balanced = await diverse.evaluation.evaluateRecommendationQualityAsync();
const balancedCounts = balanced.candidateAvailability.find(item => item.mode === "balanced");
assert.equal(balancedCounts.eligibleCandidatePool, 7,
  "The in-collection local entry is excluded, but seven candidates remain");
assert.equal(balancedCounts.returnedResultCount, 2,
  "When a large same-genre pool is present, the balanced two-per-main-genre policy can intentionally return fewer than requested");
assert.equal(balancedCounts.shortfallReason, "balanced-genre-cap");
assert.equal(balanced.diversity.find(item => item.mode === "balanced").titles, 2,
  "The diversity list count and recommendation result count must agree.");

const empty = fixture({ localCount: 5, remoteCount: 5, emptyProfile: true });
const emptyMetrics = await empty.evaluation.evaluateRecommendationQualityAsync();
assert.equal(emptyMetrics.candidateAvailability.find(item => item.mode === "affinity").eligibleCandidatePool, 8);
assert.equal(emptyMetrics.candidateAvailability.find(item => item.mode === "affinity").rankedResultsAvailable, 0);
assert.equal(emptyMetrics.candidateAvailability.find(item => item.mode === "affinity").returnedResultCount, 0);
assert.equal(emptyMetrics.candidateAvailability.find(item => item.mode === "affinity").shortfallReason, "empty-personal-profile");

console.log("Candidate-pool accounting passed: remote TMDB versus local eligible counts, identity deduplication, collection exclusion, empty profile, and diversity shortfall reasons.");
