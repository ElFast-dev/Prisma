import assert from "node:assert/strict";
import { createRecommendationEvaluation } from "../js/recommendations/evaluation.js";
import { createRecommendationRanking } from "../js/recommendations/ranking.js";

function createDataset({ count = 60, reverse = false, lowRatings = false } = {}) {
  const ratings = [];
  const movies = new Map();
  for (let index = 0; index < count; index += 1) {
    const group = index % 5;
    const genre = ["Drama", "Comedia", "Terror", "Acción", "Misterio"][group];
    const rating = lowRatings ? 6 : ([10, 9, 4, 3, 2][group]);
    const entry = {
      title: "Película " + String(index).padStart(3, "0"),
      tmdbId: String(1000 + index),
      rating,
      genres: [genre]
    };
    ratings.push(entry);
    movies.set(entry.tmdbId, Object.assign({}, entry));
  }

  function movieFeatures(movie, entry) {
    const candidate = movie || entry;
    return candidate && candidate.genres && candidate.genres.length
      ? candidate.genres.map(genre => "género: " + genre.toLowerCase())
      : [];
  }
  function findMovie(title, id) {
    return id ? (movies.get(String(id)) || null) : (ratings.find(entry => entry.title === title) || null);
  }
  function buildProfile(trainingRatings) {
    const seenIds = new Set(trainingRatings.map(entry => String(entry.tmdbId)));
    const sums = new Map();
    const counts = new Map();
    trainingRatings.forEach(entry => {
      const genre = entry.genres[0];
      sums.set(genre, (sums.get(genre) || 0) + entry.rating);
      counts.set(genre, (counts.get(genre) || 0) + 1);
    });
    const genreMeans = new Map();
    sums.forEach((sum, genre) => genreMeans.set(genre, sum / counts.get(genre)));
    const average = trainingRatings.reduce((sum, entry) => sum + entry.rating, 0) / trainingRatings.length;
    return { seenIds, genreMeans, average };
  }
  function predictRating(movie, profile) {
    assert.ok(!profile.seenIds.has(String(movie.tmdbId)),
      "La nota del candidato retenido nunca puede formar parte del perfil de entrenamiento.");
    const learned = profile.genreMeans.get(movie.genres[0]) || profile.average;
    return { score: reverse ? 11 - learned : learned };
  }

  const productionRanking = createRecommendationRanking({});
  const rankingCalls = [];
  function rankCandidates(candidates, limit, mode) {
    rankingCalls.push({ mode, identities: candidates.map(candidate => candidate.evaluationIdentity) });
    return productionRanking.rankCandidates(candidates, limit, mode);
  }

  const diversityLists = {
    balanced: [
      { title: "D1", genres: ["Drama"] }, { title: "D2", genres: ["Drama"] },
      { title: "C1", genres: ["Comedia"] }, { title: "A1", genres: ["Acción"] },
      { title: "T1", genres: ["Terror"] }
    ],
    affinity: [
      { title: "D1", genres: ["Drama"] }, { title: "D2", genres: ["Drama"] },
      { title: "D3", genres: ["Drama"] }, { title: "D4", genres: ["Drama"] },
      { title: "C1", genres: ["Comedia"] }
    ],
    variety: [
      { title: "D1", genres: ["Drama"] }, { title: "C1", genres: ["Comedia"] },
      { title: "A1", genres: ["Acción"] }, { title: "T1", genres: ["Terror"] },
      { title: "M1", genres: ["Misterio"] }
    ]
  };
  const evaluation = createRecommendationEvaluation({
    getRatings: () => ratings,
    findMovie,
    movieFeatures,
    ratingValue: entry => Number.isFinite(entry && entry.rating) && entry.rating >= 1 && entry.rating <= 10 ? entry.rating : null,
    buildProfile,
    predictRating,
    getRecommendations: (limit, mode) => (diversityLists[mode] || []).slice(0, limit),
    rankCandidates,
    movieTmdbId: entry => entry && entry.tmdbId && Number(entry.tmdbId) > 0 ? String(entry.tmdbId) : "",
    titleKey: value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  });
  return { evaluation, ratings, movies, rankingCalls };
}

const ideal = createDataset();
const idealResult = ideal.evaluation.evaluateRankingQuality();
assert.equal(idealResult.available, true);
assert.equal(idealResult.count, 60);
assert.equal(idealResult.relevantCount, 24);
assert.equal(idealResult.folds, 5);
assert.equal(idealResult.foldsEvaluated, 5);
assert.equal(idealResult.modes.length, 3);
assert.deepEqual(idealResult.modes.map(item => item.mode), ["balanced", "affinity", "variety"]);
assert.ok(idealResult.modes.every(item => item.available && item.ndcgAt5 >= 0 && item.ndcgAt5 <= 1));
const idealAffinity = idealResult.modes.find(item => item.mode === "affinity");
assert.ok(Math.abs(idealAffinity.ndcgAt5 - 1) < 1e-12,
  "El modo por afinidad que prioriza las notas relevantes debe alcanzar nDCG@5 = 1 en este conjunto sintético.");
assert.deepEqual(idealResult, ideal.evaluation.evaluateRankingQuality(),
  "Los pliegues y resultados deben repetirse de forma determinista.");

const evaluatedFoldCount = idealResult.foldsEvaluated;
assert.equal(ideal.rankingCalls.length, evaluatedFoldCount * 3 * 2,
  "Cada pasada debe puntuar tres modos por pliegue con señal relevante.");
for (let i = 0; i < evaluatedFoldCount * 3; i += 3) {
  assert.deepEqual(ideal.rankingCalls[i].identities.slice().sort(), ideal.rankingCalls[i + 1].identities.slice().sort(),
    "Afinidad debe recibir las mismas candidatas retenidas que Equilibrado.");
  assert.deepEqual(ideal.rankingCalls[i].identities.slice().sort(), ideal.rankingCalls[i + 2].identities.slice().sort(),
    "Variedad debe recibir las mismas candidatas retenidas que Equilibrado.");
  assert.deepEqual(ideal.rankingCalls.slice(i, i + 3).map(call => call.mode), ["balanced", "affinity", "variety"]);
}

const reversed = createDataset({ reverse: true });
const reversedResult = reversed.evaluation.evaluateRankingQuality();
assert.equal(reversedResult.available, true);
const reversedAffinity = reversedResult.modes.find(item => item.mode === "affinity");
assert.ok(reversedAffinity.ndcgAt5 < idealAffinity.ndcgAt5,
  "El nDCG por afinidad debe distinguir un orden degradado de un orden ideal.");

const tooSmall = createDataset({ count: 49 });
const smallResult = tooSmall.evaluation.evaluateRankingQuality();
assert.equal(smallResult.available, false);
assert.ok(smallResult.modes.every(item => item.ndcgAt5 === null));
assert.equal(smallResult.count, 49);
assert.ok(smallResult.reason.includes("50"));

const noRelevant = createDataset({ lowRatings: true });
const noRelevantResult = noRelevant.evaluation.evaluateRankingQuality();
assert.equal(noRelevantResult.available, false);
assert.ok(noRelevantResult.modes.every(item => item.ndcgAt5 === null));
assert.equal(noRelevantResult.relevantCount, 0);
assert.ok(noRelevantResult.reason.includes("10 valoraciones"));

const diversity = ideal.evaluation.evaluateDiversityModes();
const affinity = diversity.find(item => item.mode === "affinity");
const variety = diversity.find(item => item.mode === "variety");
const balanced = diversity.find(item => item.mode === "balanced");
assert.equal(affinity.score, 0.4);
assert.equal(affinity.uniqueGenres, 2);
assert.equal(variety.score, 1);
assert.equal(variety.uniqueGenres, 5);
assert.ok(balanced.score > affinity.score && balanced.score < variety.score);

const noGenres = createRecommendationEvaluation({
  getRatings: () => [],
  findMovie: () => null,
  movieFeatures: () => [],
  ratingValue: () => null,
  buildProfile: () => ({ average: 6.5 }),
  predictRating: () => ({ score: 6.5 }),
  getRecommendations: () => [{ title: "Sin géneros" }],
  movieTmdbId: () => "",
  titleKey: value => String(value || "").toLowerCase()
});
const noGenreMode = noGenres.evaluateDiversityModes()[0];
assert.equal(noGenreMode.score, null);
assert.equal(noGenreMode.pairs, 0);
assert.equal(noGenreMode.titlesWithGenres, 0);

const shortList = createRecommendationEvaluation({
  getRatings: () => [],
  findMovie: () => null,
  movieFeatures: () => [],
  ratingValue: () => null,
  buildProfile: () => ({ average: 6.5 }),
  predictRating: () => ({ score: 6.5 }),
  getRecommendations: () => [{ title: "Uno", genres: ["Drama"] }],
  movieTmdbId: () => "",
  titleKey: value => String(value || "").toLowerCase()
});
assert.equal(shortList.evaluateDiversityModes()[0].score, null,
  "Una lista de un solo título no tiene pares con los que medir diversidad.");

console.log("Evaluación de recomendaciones correcta: nDCG@5 por modo con las mismas candidatas, pliegues sin fuga de notas, umbrales, determinismo y diversidad Jaccard.");
