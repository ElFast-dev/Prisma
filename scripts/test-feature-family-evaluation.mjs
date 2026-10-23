import assert from "node:assert/strict";
import { createFeatureFamilyEvaluation } from "../js/recommendations/feature-family-evaluation.js";
import { createRecommendationEngine } from "../js/recommendations/engine.js";
import { createRecommendationRanking } from "../js/recommendations/ranking.js";
import { movieFeatures } from "../js/recommendations/features.js";

function makeFixture(count) {
  const movies = [];
  const ratings = [];
  for (let index = 0; index < count; index += 1) {
    const id = 820000 + index;
    const movie = {
      tmdbId: id,
      title: "Synthetic Film " + String(index).padStart(3, "0"),
      year: 1980 + (index % 40),
      genres: ["Genre " + (index % 7), "Genre " + ((index + 2) % 7)],
      tags: ["tag " + (index % 11), "signal " + ((index + 3) % 13)],
      overview: "voyage discovery mystery transformation friendship tomorrow galaxy journey " +
        "character choice memory future " + (index % 17) + " cosmic narrative",
      cast: ["Synthetic Actor " + (index % 13)],
      directors: ["Synthetic Director " + (index % 9)],
      writers: ["Synthetic Writer " + (index % 8)],
      composers: ["Synthetic Composer " + (index % 5)],
      productionCompanies: ["Synthetic Studio " + (index % 6)],
      productionCountries: ["Synthetic Country " + (index % 4)],
      spokenLanguages: ["Synthetic Language " + (index % 3)],
      originalLanguage: "lang" + (index % 3),
      collectionName: index % 6 === 0 ? "Synthetic Saga " + (index % 10) : "",
      runtime: 80 + (index % 100)
    };
    movies.push(movie);
    ratings.push({
      title: movie.title,
      tmdbId: id,
      year: movie.year,
      rating: 7 + (index % 4),
      genres: movie.genres.slice(),
      tags: movie.tags.slice()
    });
  }
  return { movies, ratings };
}

function makeEvaluator(movies, ratings, auditEvents) {
  const byId = new Map(movies.map(movie => [String(movie.tmdbId), movie]));
  const byTitle = new Map(movies.map(movie => [movie.title.toLocaleLowerCase("es"), movie]));
  const findMovie = (title, id) => byId.get(String(id)) || byTitle.get(String(title || "").toLocaleLowerCase("es")) || null;
  const titleKey = title => String(title || "").toLocaleLowerCase("es").trim();
  const ratingValue = entry => Number.isFinite(Number(entry && entry.rating)) ? Number(entry.rating) : null;
  const rankCandidates = createRecommendationRanking({}).rankCandidates;
  return createFeatureFamilyEvaluation({
    getRatings: () => ratings,
    findMovie,
    movieFeatures,
    ratingValue,
    movieTmdbId: value => value && (value.tmdbId || value.tmId),
    titleKey,
    createRecommendationEngine: settings => createRecommendationEngine({
      getRatings: settings.getRatings,
      findMovie: settings.findMovie,
      movieFeatures: settings.movieFeatures,
      ratingValue: settings.ratingValue
    }),
    rankCandidates,
    onAudit: event => auditEvents.push(event),
    yieldToBrowser: () => Promise.resolve()
  });
}

const audit = [];
const fullFixture = makeFixture(351);
const duplicatedRatings = fullFixture.ratings.concat([{ ...fullFixture.ratings[0], rating: 10 }]);
const fullEvaluator = makeEvaluator(fullFixture.movies, duplicatedRatings, audit);
const progress = [];
const full = await fullEvaluator.evaluateAsync({
  shouldContinue: () => true,
  onProgress: update => progress.push({ ...update })
});
assert.equal(full.available, true, "A synthetic 351-film profile must run the full paired comparison");
assert.equal(full.executionStatus, "completed");
assert.equal(full.sampleCount, 351, "Duplicate rating rows must not duplicate a movie in the evaluation sample");
assert.equal(full.foldsPlanned, 5);
assert.equal(full.foldsEvaluated, 5);
assert.equal(full.sharedPartition, true);
assert.equal(full.trainingLeakageChecked, true);
assert.equal(full.families.length, 4);
assert.deepEqual(full.families.map(item => item.id), [
  "genres-only", "genres-tags", "genres-tags-synopsis", "full-current"
]);
for (const family of full.families) {
  assert.equal(family.available, true, family.id + " should have a measurable MAE");
  assert.equal(family.foldsEvaluated, 5);
  assert.equal(family.foldMae.length, 5);
  assert.ok(Number.isFinite(family.mae));
  assert.ok(Number.isFinite(family.baselineMae));
  assert.equal(family.rankingModes.length, 3);
  for (const mode of family.rankingModes) {
    assert.equal(mode.mode === "balanced" || mode.mode === "affinity" || mode.mode === "variety", true);
    assert.equal(mode.foldsEvaluated, 5);
    assert.ok(Number.isFinite(mode.ndcgAt5));
    assert.ok(mode.wins + mode.ties + mode.losses === 5,
      family.id + "/" + mode.mode + " must report paired fold stability");
  }
}
assert.equal(full.families[0].deltaMaeVsGenres, null, "The genre family is the paired reference, not its own claimed improvement");
for (const family of full.families.slice(1)) {
  assert.ok(Number.isFinite(family.deltaMaeVsGenres));
  assert.equal(family.maeWins + family.ties + family.maeLosses, 5);
}
assert.ok(audit.length > 0);
const foldIdentities = new Map();
for (const event of audit) {
  assert.equal(event.candidateHasPersonalRating, false, "A held-out candidate must not carry its personal score into prediction");
  assert.ok(!event.trainingIdentities.includes(event.heldOutIdentity),
    "A held-out movie identity must not appear in its training fold");
  assert.ok(event.trainingCount < full.sampleCount);
  const key = event.family + "/" + event.foldIndex;
  if (!foldIdentities.has(key)) foldIdentities.set(key, new Set());
  foldIdentities.get(key).add(event.heldOutIdentity);
}
for (let fold = 0; fold < 5; fold += 1) {
  const reference = foldIdentities.get("genres-only/" + fold);
  assert.ok(reference && reference.size > 0);
  for (const family of full.families.slice(1)) {
    assert.deepEqual([...foldIdentities.get(family.id + "/" + fold)].sort(), [...reference].sort(),
      "Every feature family must share exactly the same held-out identities in fold " + fold);
  }
}
assert.ok(progress.length > 1);
assert.ok(progress.every(update => Number.isFinite(update.completedWork) &&
  Number.isFinite(update.totalWork) && update.totalWork > 0 && update.completedWork <= update.totalWork),
  "Progress must use bounded, verifiable work units");
const workDenominators = [...new Set(progress.map(update => update.totalWork))];
assert.ok(workDenominators.length <= 2,
  "The denominator may be refined once the deduplicated sample has been measured, then must remain stable");
for (let index = 1; index < progress.length; index += 1) {
  assert.ok(progress[index].completedWork >= progress[index - 1].completedWork,
    "Completed feature-family work units must not move backwards");
}
assert.equal(progress.at(-1).completedWork, progress.at(-1).totalWork,
  "The final feature-family progress event must correspond to the completed work");
const safeJson = JSON.stringify(full).toLowerCase();
for (const forbidden of ["synthetic film", "820000", "tmdbid", "heldoutidentity", "trainingidentities", "rating"]) {
  assert.equal(safeJson.includes(forbidden), false,
    "Shareable results must contain aggregates only, never individual data: " + forbidden);
}

const empty = makeEvaluator([], [], []).evaluateAsync
  ? await makeEvaluator([], [], []).evaluateAsync()
  : null;
assert.equal(empty.available, false);
assert.equal(empty.executionStatus, "unavailable");
assert.equal(empty.sampleCount, 0);
assert.match(empty.unavailableReason, /género|películas/i);

const smallFixture = makeFixture(4);
const few = await makeEvaluator(smallFixture.movies, smallFixture.ratings, []).evaluateAsync();
assert.equal(few.available, false);
assert.equal(few.executionStatus, "unavailable");
assert.equal(few.sampleCount, 4);
assert.match(few.unavailableReason, /cinco/i);
assert.equal(few.families.every(item => item.mae === null && item.foldsEvaluated === 0), true);

let cancelled = true;
const cancelEvaluator = makeEvaluator(fullFixture.movies.slice(0, 12), fullFixture.ratings.slice(0, 12), []);
const cancelledResult = await cancelEvaluator.evaluateAsync({ shouldContinue: () => !cancelled, onProgress: () => {} });
assert.equal(cancelledResult, null, "An invalidated feature-family evaluation must return no stale result");
console.log("Feature-family diagnostics: empty, few-rating and 351-film profiles; duplicate identity, shared folds, holdout isolation, ranking modes, progress and privacy passed.");
