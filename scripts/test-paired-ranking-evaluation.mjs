import assert from "node:assert/strict";
import { createPairedRankingEvaluation } from "../js/recommendations/paired-ranking-evaluation.js";
import { createRecommendationEngine } from "../js/recommendations/engine.js";
import { createRecommendationRanking } from "../js/recommendations/ranking.js";
import { movieFeatures } from "../js/recommendations/features.js";
import { movieTmdbId, titleKey, ratingValue } from "../js/core/movie-utils.js";

function makeFixture(count) {
  const movies = [];
  const ratings = [];
  for (let index = 0; index < count; index += 1) {
    const movie = {
      tmdbId: String(910000 + index),
      title: index < 2 ? "The Remake" : "Synthetic Film " + String(index).padStart(3, "0"),
      year: index < 2 ? 2001 : 1980 + index % 40,
      genres: ["Genre " + (index % 7), "Genre " + ((index + 3) % 7)],
      tags: ["tag " + (index % 11), "signal " + (index % 13)].concat(index === 17 ? ["one-off narrative tag"] : []),
      overview: "mystery discovery emotion future memory time travel friendship and hope " + (index % 17),
      cast: ["Synthetic Actor " + (index % 13)],
      directors: ["Synthetic Director " + (index % 9)],
      writers: ["Synthetic Writer " + (index % 8)],
      composers: ["Synthetic Composer " + (index % 5)],
      productionCompanies: ["Synthetic Studio " + (index % 6)],
      productionCountries: ["Synthetic Country " + (index % 4)],
      spokenLanguages: ["Synthetic Language " + (index % 3)],
      originalLanguage: "lang" + (index % 3),
      collectionName: index % 6 === 0 ? "Synthetic Saga " + (index % 10) : "",
      runtime: 80 + index % 100
    };
    movies.push(movie);
    ratings.push({
      title: movie.title, tmdbId: movie.tmdbId, year: movie.year,
      rating: [6, 7, 8, 9, 10][index % 5],
      genres: movie.genres.slice(), tags: movie.tags.slice()
    });
  }
  return { movies, ratings };
}

function createEvaluator(movies, ratings, audit) {
  const byId = new Map(movies.map(movie => [String(movie.tmdbId), movie]));
  const findMovie = (title, id) => byId.get(String(id)) ||
    movies.find(movie => movie.title === title) || null;
  const ranker = createRecommendationRanking({});
  return createPairedRankingEvaluation({
    getRatings: () => ratings,
    findMovie,
    movieFeatures,
    ratingValue,
    movieTmdbId,
    titleKey,
    createRecommendationEngine: config => createRecommendationEngine(config),
    rankCandidates: ranker.rankCandidates,
    yieldToBrowser: () => Promise.resolve()
  });
}

const fullFixture = makeFixture(351);
const duplicateRatings = fullFixture.ratings.concat([{ ...fullFixture.ratings[0], rating: 10 }]);
const audit = [];
const progress = [];
const evaluator = createEvaluator(fullFixture.movies, duplicateRatings, audit);
const result = await evaluator.evaluateAsync({
  shouldContinue: () => true,
  onAudit: event => audit.push(event),
  onProgress: event => progress.push({ ...event })
});

assert.equal(result.executionStatus, "completed");
assert.equal(result.available, true);
assert.equal(result.sampleCount, 351, "TMDB identity must deduplicate duplicate rating rows");
assert.equal(result.repeats, 3);
assert.equal(result.foldsPerRepeat, 5);
assert.equal(result.foldsEvaluated, 15);
assert.equal(result.sharedPartitions, true);
assert.deepEqual(result.relevanceThresholds, [7, 9]);
assert.equal(result.families.length, 4);
assert.deepEqual(result.families.map(item => item.id), [
  "genres-only", "genres-tags", "genres-tags-synopsis", "full-current"
]);
assert.equal(result.repeatSummaries.length, 3);
assert.equal(audit.length, 15);
for (const event of audit) {
  assert.equal(event.trainingIdentities.length + event.heldOutIdentities.length, 351);
  assert.equal(event.trainingIdentities.some(id => event.heldOutIdentities.includes(id)), false,
    "Held-out identities must never enter the outer training partition");
}
for (const family of result.families) {
  assert.equal(family.available, true, family.id);
  assert.equal(family.foldsEvaluated, 15);
  assert.equal(family.foldMae.length, 15);
  assert.ok(Number.isFinite(family.mae));
  assert.equal(family.rankingModes.balanced.foldsEvaluated, 15);
  assert.equal(family.rankingByThreshold["7"].balanced.foldsEvaluated, 15);
  assert.equal(family.rankingByThreshold["9"].balanced.foldsEvaluated, 15,
    "Synthetic fixture should make threshold-9 ranking available for all common folds");
  assert.equal(family.rankingByThreshold["9"].balanced.foldNdcgAt5.length, 15,
    "Per-fold NDCG output must preserve the shared outer-fold positions");
  assert.equal(family.rankingByThreshold["9"].balanced.pairedFoldsEvaluated, family.id === "genres-only" ? 0 : 15,
    "Wins/ties/losses must compare only the exact same available held-out folds");
  assert.equal(family.rankingByThreshold["9"].balanced.wins +
    family.rankingByThreshold["9"].balanced.ties +
    family.rankingByThreshold["9"].balanced.losses,
    family.id === "genres-only" ? 0 : family.rankingByThreshold["9"].balanced.pairedFoldsEvaluated);
  assert.equal(family.maeWins + family.ties + family.maeLosses, family.id === "genres-only" ? 0 : 15);
}
for (const repeat of result.repeatSummaries) {
  assert.equal(repeat.folds.length, 5);
  for (const fold of repeat.folds) {
    assert.equal(fold.testCount + fold.trainCount, 351);
    assert.deepEqual(Object.keys(fold.families), [
      "genres-only", "genres-tags", "genres-tags-synopsis", "full-current"
    ]);
  }
}

const support = result.supportRegularization;
assert.equal(support.available, true);
assert.deepEqual(support.lambdas, [0, 0.5, 1, 2, 4, 8]);
assert.equal(support.results.length, 6);
assert.equal(support.results[0].lambda, 0);
assert.equal(support.results[0].deltaMaeVsNoShrinkage, 0);
assert.equal(support.nestedSelection.outerFoldsEvaluated, 15);
assert.equal(Object.values(support.nestedSelection.selectedLambdaCounts).reduce((a, b) => a + b, 0), 15,
  "Every outer fold with sufficient inner relevance must select lambda without consulting its test fold");
for (const lambda of support.results) {
  assert.equal(lambda.foldsEvaluated, 15);
  assert.equal(lambda.foldMae.length, 15);
  assert.ok(Number.isFinite(lambda.mae));
  assert.equal(lambda.rankingModes.balanced.foldsEvaluated, 15);
  assert.equal(lambda.rankingByThreshold["9"].balanced.foldsEvaluated, 15);
  assert.equal(lambda.rankingByThreshold["9"].balanced.foldNdcgAt5.length, 15);
}
assert.ok(support.featureSupportBySignalType.genre.featureObservations > 0);
assert.ok(support.featureSupportBySignalType.actor.featureObservations > 0);
assert.ok(support.featureSupportBySignalType.theme.supportOneFeatures > 0,
  "Support-one features must be counted, not dropped");
assert.equal(support.featureSupportWeightFormula, "weight * support / (support + lambda)");
assert.equal(support.signalFamilyLambda, 2);
assert.equal(support.signalFamilyExperiments.length, 7,
  "Support must be evaluated independently for genre, theme, synopsis, cast and creative-team signal types.");
for (const family of support.signalFamilyExperiments) {
  assert.equal(family.available, true, family.id);
  assert.equal(family.lambda, 2);
  assert.equal(family.foldsEvaluated, 15);
  assert.equal(family.foldMae.length, 15);
  assert.ok(Number.isFinite(family.mae));
  assert.equal(family.rankingModes.balanced.foldsEvaluated, 15);
  assert.equal(family.rankingByThreshold["9"].balanced.foldsEvaluated, 15);
  assert.equal(family.repeatSummaries.length, 3);
  assert.ok(family.repeatSummaries.every(repeat => repeat.foldCount === 5));
}

assert.ok(progress.length > 20);
assert.ok(progress.every(item => Number.isFinite(item.completedWork) &&
  Number.isFinite(item.totalWork) && item.completedWork >= 0 && item.completedWork <= item.totalWork));
for (let i = 1; i < progress.length; i += 1) {
  assert.ok(progress[i].completedWork >= progress[i - 1].completedWork, "Progress must be monotonic");
}
assert.equal(progress.at(-1).completedWork, progress.at(-1).totalWork);
assert.ok(Number.isFinite(result.durationMs) && result.durationMs >= 0);

const serialized = JSON.stringify(result).toLowerCase();
for (const forbidden of ["synthetic film", "910000", "heldoutidentities", "trainingidentities", "evaluationidentity", '"rating":']) {
  assert.equal(serialized.includes(forbidden), false, "Shareable aggregate must not serialize row-level data: " + forbidden);
}

const sampleLimitedFixture = makeFixture(30);
const sampleLimited = await createEvaluator(sampleLimitedFixture.movies, sampleLimitedFixture.ratings).evaluateAsync();
assert.equal(sampleLimited.available, true);
assert.equal(sampleLimited.sampleCount, 30);
assert.ok(sampleLimited.families.every(family => family.rankingByThreshold["7"].balanced.available === false &&
  family.rankingByThreshold["9"].balanced.available === false),
"Both nDCG thresholds must be unavailable when the unique sample is below the minimum of 50.");
assert.ok(sampleLimited.supportRegularization.results.every(lambda =>
  lambda.rankingByThreshold["7"].balanced.available === false &&
  lambda.rankingByThreshold["9"].balanced.available === false),
"Fixed-lambda nDCG must not appear available for an under-sized profile.");
assert.equal(sampleLimited.supportRegularization.nestedSelection.available, false,
"Do not choose lambda outside the predefined inner-validation sample minimum.");
const smallFold = sampleLimited.repeatSummaries[0].folds[0];
assert.equal(smallFold.families["full-current"].ndcgAt5.balanced, null);
assert.equal(smallFold.families["full-current"].ndcgAt5Threshold9.balanced, null);
assert.equal(smallFold.lambdas["2"].ndcgAt5.balanced, null);
assert.equal(smallFold.lambdas["2"].ndcgAt5Threshold9.balanced, null);

const tooSmall = await createEvaluator([], []).evaluateAsync();
assert.equal(tooSmall.available, false);
assert.equal(tooSmall.sampleCount, 0);
assert.equal(tooSmall.supportRegularization, null);

let keepGoing = true;
const cancellable = createEvaluator(fullFixture.movies.slice(0, 30), fullFixture.ratings.slice(0, 30));
const cancelled = await cancellable.evaluateAsync({
  shouldContinue: () => keepGoing,
  onProgress: () => { keepGoing = false; }
});
assert.equal(cancelled, null, "Cancellation must suppress stale diagnostic output");

console.log("Paired ranking diagnostic: synthetic 351 ratings, shared 3x5 folds, both relevance thresholds, support grid, nested lambda selection, privacy, progress and cancellation passed.");
