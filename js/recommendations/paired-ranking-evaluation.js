const FAMILY_DEFINITIONS = Object.freeze([
  { id: "genres-only", label: "Solo géneros", accepts: feature => feature.indexOf("género: ") === 0 },
  { id: "genres-tags", label: "Géneros + etiquetas", accepts: feature => feature.indexOf("género: ") === 0 || feature.indexOf("tema: ") === 0 },
  { id: "genres-tags-synopsis", label: "Géneros + etiquetas + sinopsis", accepts: feature => feature.indexOf("género: ") === 0 || feature.indexOf("tema: ") === 0 || feature.indexOf("trama: ") === 0 },
  { id: "full-current", label: "Conjunto completo actual", accepts: () => true }
]);
const REPEATS = 3;
const OUTER_FOLDS = 5;
const INNER_FOLDS = 3;
const CUTOFF = 5;
const THRESHOLDS = Object.freeze([7, 9]);
const LAMBDAS = Object.freeze([0, 0.5, 1, 2, 4, 8]);
const MODES = Object.freeze(["balanced", "affinity", "variety"]);
const MIN_TUNING_RELEVANT = 10;
const EPSILON = 1e-10;

function stableHash(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
function mean(values) {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}
function ratingNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 10 ? parsed : null;
}
function signalType(feature) {
  const prefixes = [
    ["genre", "género: "], ["theme", "tema: "], ["synopsis", "trama: "],
    ["actor", "actor: "], ["director", "director: "], ["writer", "guionista: "],
    ["composer", "compositor: "], ["company", "productora: "], ["country", "país: "],
    ["language", "idioma original: "], ["spokenLanguage", "idioma hablado: "],
    ["collection", "saga: "], ["runtime", "duración: "], ["decade", "década: "]
  ];
  for (const [type, prefix] of prefixes) if (String(feature).startsWith(prefix)) return type;
  return "other";
}
function gainFor(rating, threshold) {
  return rating >= threshold ? rating - (threshold - 1) : 0;
}
function dcgAt5(items) {
  return items.slice(0, CUTOFF).reduce((sum, item, index) => sum + item.gain / Math.log2(index + 2), 0);
}
function emptyThresholds() {
  return Object.fromEntries(THRESHOLDS.map(threshold => [String(threshold), Object.fromEntries(
    MODES.map(mode => [mode, { scores: [], gains: [], foldsEvaluated: 0 }])
  )]));
}
function identityOf(entry, movie, deps) {
  const candidateId = (typeof deps.movieTmdbId === "function" ? deps.movieTmdbId(entry) : null) ||
    (typeof deps.movieTmdbId === "function" ? deps.movieTmdbId(movie) : null) ||
    (entry && (entry.tmdbId || entry.tmId)) || (movie && (movie.tmdbId || movie.tmId));
  if (candidateId != null && String(candidateId).trim() && String(candidateId) !== "0") {
    return "tmdb:" + String(candidateId).trim();
  }
  const rawTitle = entry && entry.title || movie && movie.title || "";
  const titleKey = typeof deps.titleKey === "function" ? deps.titleKey(rawTitle) : String(rawTitle).trim().toLocaleLowerCase();
  const year = entry && (entry.year || entry.releaseYear || entry.release_year) ||
    movie && (movie.year || movie.releaseYear || movie.release_year) || "";
  return titleKey ? "title:" + titleKey + ":" + String(year) : "";
}
function foldSet(rows, indices, count, salt) {
  const ordered = indices.slice().sort((a, b) => {
    const left = stableHash(rows[a].identity + "|" + salt);
    const right = stableHash(rows[b].identity + "|" + salt);
    return left - right || rows[a].identity.localeCompare(rows[b].identity);
  });
  const folds = Array.from({ length: count }, () => []);
  ordered.forEach((index, position) => folds[position % count].push(index));
  return folds;
}
function emptyFamilyFold() {
  return { mae: null, ranking: { "7": {}, "9": {} } };
}
function initMetricAccumulator() {
  return {
    errors: [], foldMae: [],
    ranking: Object.fromEntries(THRESHOLDS.map(threshold => [String(threshold), Object.fromEntries(
      MODES.map(mode => [mode, { scores: [], foldScores: [], wins: 0, ties: 0, losses: 0 }])
    )]))
  };
}
function cloneAndShrink(profile, lambda) {
  const features = new Map();
  if (profile && profile.features && typeof profile.features.forEach === "function") {
    profile.features.forEach((item, name) => {
      const support = Math.max(0, Number(item && item.count) || 0);
      const factor = lambda === 0 ? 1 : support / (support + lambda);
      features.set(name, Object.assign({}, item, {
        weight: (Number(item && item.weight) || 0) * factor
      }));
    });
  }
  return Object.assign({}, profile, { features });
}
function candidateFor(row, prediction, identity) {
  const source = row.movie || row.entry || {};
  const candidate = Object.assign({}, source, {
    title: source.title || row.entry.title || "",
    genres: Array.isArray(source.genres) && source.genres.length ? source.genres.slice() :
      (Array.isArray(row.entry.genres) ? row.entry.genres.slice() : []),
    tags: Array.isArray(source.tags) && source.tags.length ? source.tags.slice() :
      (Array.isArray(row.entry.tags) ? row.entry.tags.slice() : []),
    evaluationIdentity: identity,
    prediction: Object.assign({}, prediction || {}, {
      score: Number.isFinite(prediction && prediction.score) ? prediction.score : 6.5
    })
  });
  for (const key of ["rating", "userRating", "personalRating", "personal_rating", "note", "notes",
    "comment", "comments", "emotions", "emotion", "tmdbId", "tmdb_id", "tmId", "id"]) delete candidate[key];
  return candidate;
}
function metricsForFold(testRows, scored, rankCandidates, threshold) {
  const gains = new Map(testRows.map(row => [row.identity, gainFor(row.rating, threshold)]));
  const ideal = testRows.map(row => ({ identity: row.identity, gain: gains.get(row.identity) || 0 }))
    .sort((a, b) => b.gain - a.gain || a.identity.localeCompare(b.identity));
  const idealDcg = dcgAt5(ideal);
  const modes = {};
  for (const mode of MODES) {
    if (idealDcg <= 0) {
      modes[mode] = null;
      continue;
    }
    const ranked = (rankCandidates(scored.slice(), CUTOFF, mode) || []).slice(0, CUTOFF);
    const dcg = dcgAt5(ranked.map(candidate => ({
      gain: gains.get(candidate.evaluationIdentity) || 0
    })));
    modes[mode] = Math.max(0, Math.min(1, dcg / idealDcg));
  }
  return modes;
}
function summariseRanking(accumulator, threshold, reference) {
  const modes = {};
  for (const mode of MODES) {
    const scores = accumulator.ranking[String(threshold)][mode].scores;
    const referenceScores = reference ? reference.ranking[String(threshold)][mode].scores : [];
    let wins = 0, ties = 0, losses = 0;
    if (reference) scores.forEach((score, index) => {
      const delta = score - referenceScores[index];
      if (delta > EPSILON) wins += 1;
      else if (delta < -EPSILON) losses += 1;
      else ties += 1;
    });
    modes[mode] = {
      available: scores.length > 0,
      ndcgAt5: mean(scores),
      foldsEvaluated: scores.length,
      wins: reference ? wins : 0,
      ties: reference ? ties : 0,
      losses: reference ? losses : 0,
      foldNdcgAt5: scores.slice()
    };
  }
  return modes;
}
function supportSignalSummary(featureObservations) {
  const result = {};
  for (const type of ["genre", "theme", "synopsis", "actor", "director", "writer", "composer", "company", "country", "language", "spokenLanguage", "collection", "runtime", "decade", "other"]) {
    const values = featureObservations[type] || [];
    result[type] = {
      featureObservations: values.length,
      supportOneFeatures: values.filter(item => item.support === 1).length,
      meanSupport: mean(values.map(item => item.support)),
      meanAbsoluteWeight: mean(values.map(item => Math.abs(item.weight)))
    };
  }
  return result;
}

export function createPairedRankingEvaluation(dependencies) {
  const deps = dependencies || {};
  const getRatings = deps.getRatings || (() => []);
  const findMovie = deps.findMovie || (() => null);
  const movieFeatures = deps.movieFeatures || (() => []);
  const ratingValue = deps.ratingValue || (entry => ratingNumber(entry && entry.rating));
  const createEngine = deps.createRecommendationEngine;
  const rankCandidates = deps.rankCandidates || ((candidates, cutoff) => candidates.slice().sort((a, b) =>
    b.prediction.score - a.prediction.score).slice(0, cutoff));
  const yieldToBrowser = typeof deps.yieldToBrowser === "function"
    ? deps.yieldToBrowser : () => new Promise(resolve => setTimeout(resolve, 0));

  async function createProfile(engine, entries, shouldContinue) {
    if (typeof engine.buildProfileAsync === "function") {
      return engine.buildProfileAsync(entries, undefined, {
        shouldContinue,
        batchSize: 24,
        yieldToBrowser
      });
    }
    if (!shouldContinue()) return null;
    const profile = engine.buildProfile(entries);
    await yieldToBrowser();
    return shouldContinue() ? profile : null;
  }
  function createFamilyEngine(family) {
    return createEngine({
      getRatings,
      findMovie,
      movieFeatures: (movie, entry, options) => (movieFeatures(movie, entry, options) || []).filter(family.accepts),
      ratingValue
    });
  }
  async function scoreRows(engine, profile, testRows, shouldContinue) {
    const scored = [];
    const errors = [];
    for (let index = 0; index < testRows.length; index += 1) {
      if (!shouldContinue()) return null;
      const row = testRows[index];
      const candidateForPrediction = Object.assign({}, row.movie || row.entry, {
        title: row.movie && row.movie.title || row.entry.title || "",
        genres: row.movie && row.movie.genres && row.movie.genres.length ? row.movie.genres : row.entry.genres || [],
        tags: row.movie && row.movie.tags && row.movie.tags.length ? row.movie.tags : row.entry.tags || []
      });
      const prediction = engine.predictRating(candidateForPrediction, profile);
      const score = Number.isFinite(prediction && prediction.score) ? prediction.score : profile.average;
      errors.push(Math.abs(score - row.rating));
      scored.push(candidateFor(row, Object.assign({}, prediction || {}, { score }), row.identity));
      if ((index + 1) % 24 === 0) await yieldToBrowser();
    }
    return { scored, errors, mae: mean(errors) };
  }
  async function metricAccumulatorFor(engine, trainRows, testRows, lambda, shouldContinue) {
    const profile = await createProfile(engine, trainRows.map(row => row.entry), shouldContinue);
    if (!profile) return null;
    const evaluationProfile = lambda === null ? profile : cloneAndShrink(profile, lambda);
    const scored = await scoreRows(engine, evaluationProfile, testRows, shouldContinue);
    if (!scored) return null;
    const thresholds = {};
    for (const threshold of THRESHOLDS) {
      thresholds[String(threshold)] = metricsForFold(testRows, scored.scored, rankCandidates, threshold);
    }
    return { profile, scored, thresholds };
  }

  async function evaluateAsync(control) {
    const options = control || {};
    const shouldContinue = typeof options.shouldContinue === "function" ? options.shouldContinue : () => true;
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
    const onAudit = typeof options.onAudit === "function" ? options.onAudit : null;
    const startedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const sourceRatings = getRatings() || [];
    const rows = [];
    const seen = new Set();
    const initialTotal = Math.max(1, Math.ceil(sourceRatings.length / 16) + REPEATS * OUTER_FOLDS *
      (FAMILY_DEFINITIONS.length + LAMBDAS.length + INNER_FOLDS + 1) + 1);
    let work = 0;
    const publishProgress = detail => {
      onProgress({ completedWork: Math.min(initialTotal, work), totalWork: initialTotal, detail });
    };

    for (let index = 0; index < sourceRatings.length; index += 1) {
      if (!shouldContinue()) return null;
      const entry = sourceRatings[index];
      const rating = ratingNumber(ratingValue(entry));
      if (rating !== null) {
        const movie = findMovie(entry.title, entry.tmdbId || entry.tmId,
          entry.year || entry.releaseYear || entry.release_year);
        const features = movieFeatures(movie, entry) || [];
        const identity = identityOf(entry, movie, deps);
        if (features.length && identity && !seen.has(identity)) {
          seen.add(identity);
          rows.push({ entry, movie, identity, rating });
        }
      }
      if ((index + 1) % 16 === 0 || index + 1 === sourceRatings.length) {
        work += 1;
        publishProgress("Enlazando valoraciones e identidades");
        await yieldToBrowser();
      }
    }
    const relevantCounts = Object.fromEntries(THRESHOLDS.map(threshold => [
      String(threshold), rows.filter(row => row.rating >= threshold).length
    ]));
    if (rows.length < OUTER_FOLDS) {
      return {
        executionStatus: "unavailable", available: false, sampleCount: rows.length,
        repeats: REPEATS, foldsPerRepeat: OUTER_FOLDS, foldsEvaluated: 0,
        sharedPartitions: true, families: [], supportRegularization: null,
        relevanceThresholds: THRESHOLDS.slice(), relevantCounts,
        unavailableReason: "Se necesitan al menos cinco películas únicas con características para formar cinco pliegues."
      };
    }
    if (typeof createEngine !== "function") {
      return { executionStatus: "unavailable", available: false, sampleCount: rows.length,
        repeats: REPEATS, foldsPerRepeat: OUTER_FOLDS, foldsEvaluated: 0, families: [],
        supportRegularization: null, relevanceThresholds: THRESHOLDS.slice(), relevantCounts,
        unavailableReason: "No se ha configurado la fábrica del motor experimental." };
    }
    const repetitions = [];
    const familyAccumulators = Object.fromEntries(FAMILY_DEFINITIONS.map(family => [family.id, initMetricAccumulator()]));
    const lambdaAccumulators = Object.fromEntries(LAMBDAS.map(lambda => [String(lambda), initMetricAccumulator()]));
    const lambdaFoldRows = [];
    const selectedLambdaCounts = Object.fromEntries(LAMBDAS.map(lambda => [String(lambda), 0]));
    const selectedLambdaOutcomes = initMetricAccumulator();
    const signalTotals = Object.create(null);
    for (let repeat = 0; repeat < REPEATS; repeat += 1) {
      const ordered = rows.map((row, index) => ({ row, index })).sort((a, b) => {
        const left = stableHash(a.row.identity + "|repeat-" + repeat);
        const right = stableHash(b.row.identity + "|repeat-" + repeat);
        return left - right || a.row.identity.localeCompare(b.row.identity);
      }).map(item => item.index);
      const folds = foldSet(rows, ordered, OUTER_FOLDS, "outer-repeat-" + repeat);
      const repeatSummary = { repeat: repeat + 1, folds: [] };
      for (let foldIndex = 0; foldIndex < folds.length; foldIndex += 1) {
        if (!shouldContinue()) return null;
        const testIndices = new Set(folds[foldIndex]);
        const trainRows = rows.filter((row, index) => !testIndices.has(index));
        const testRows = folds[foldIndex].map(index => rows[index]);
        const foldSummary = { fold: foldIndex + 1, testCount: testRows.length, trainCount: trainRows.length, families: {}, lambdas: {} };
        if (onAudit) onAudit({
          repeat: repeat + 1, fold: foldIndex + 1,
          trainingIdentities: trainRows.map(row => row.identity),
          heldOutIdentities: testRows.map(row => row.identity)
        });

        for (const family of FAMILY_DEFINITIONS) {
          if (!shouldContinue()) return null;
          const engine = createFamilyEngine(family);
          const evaluated = await metricAccumulatorFor(engine, trainRows, testRows, null, shouldContinue);
          if (!evaluated) return null;
          const accumulator = familyAccumulators[family.id];
          accumulator.errors.push(...evaluated.scored.errors);
          accumulator.foldMae.push(evaluated.scored.mae);
          for (const threshold of THRESHOLDS) {
            const metrics = evaluated.thresholds[String(threshold)];
            for (const mode of MODES) {
              const score = metrics[mode];
              if (score !== null) accumulator.ranking[String(threshold)][mode].scores.push(score);
              accumulator.ranking[String(threshold)][mode].foldScores.push(score);
            }
          }
          foldSummary.families[family.id] = {
            mae: evaluated.scored.mae,
            ndcgAt5: evaluated.thresholds["7"],
            ndcgAt5Threshold9: evaluated.thresholds["9"]
          };
          work += 1;
          publishProgress("Familia " + family.label + "; repetición " + (repeat + 1) + ", pliegue " + (foldIndex + 1));
          await yieldToBrowser();
        }

        const fullEngine = createFamilyEngine(FAMILY_DEFINITIONS[3]);
        const baseProfile = await createProfile(fullEngine, trainRows.map(row => row.entry), shouldContinue);
        if (!baseProfile) return null;
        const localFeatures = [];
        if (baseProfile.features && typeof baseProfile.features.forEach === "function") {
          baseProfile.features.forEach((item, name) => {
            localFeatures.push({ type: signalType(name), support: Math.max(0, Number(item.count) || 0), weight: Number(item.weight) || 0 });
          });
        }
        for (const item of localFeatures) {
          const row = signalTotals[item.type] || { count: 0, supportOne: 0, supportSum: 0, absWeightSum: 0 };
          row.count += 1;
          if (item.support === 1) row.supportOne += 1;
          row.supportSum += item.support;
          row.absWeightSum += Math.abs(item.weight);
          signalTotals[item.type] = row;
        }
        for (const lambda of LAMBDAS) {
          if (!shouldContinue()) return null;
          const evaluated = await metricAccumulatorFor(fullEngine, trainRows, testRows, lambda, shouldContinue);
          if (!evaluated) return null;
          const accumulator = lambdaAccumulators[String(lambda)];
          accumulator.errors.push(...evaluated.scored.errors);
          accumulator.foldMae.push(evaluated.scored.mae);
          for (const threshold of THRESHOLDS) {
            for (const mode of MODES) {
              const score = evaluated.thresholds[String(threshold)][mode];
              if (score !== null) accumulator.ranking[String(threshold)][mode].scores.push(score);
              accumulator.ranking[String(threshold)][mode].foldScores.push(score);
            }
          }
          foldSummary.lambdas[String(lambda)] = {
            mae: evaluated.scored.mae, ndcgAt5: evaluated.thresholds["7"], ndcgAt5Threshold9: evaluated.thresholds["9"]
          };
          work += 1;
          publishProgress("Contracción lambda=" + lambda + "; repetición " + (repeat + 1) + ", pliegue " + (foldIndex + 1));
          await yieldToBrowser();
        }

        const innerIndices = trainRows.map((_, index) => index);
        const innerRows = trainRows;
        const innerFolds = foldSet(innerRows, innerIndices, INNER_FOLDS, "inner-repeat-" + repeat + "-fold-" + foldIndex);
        const innerScores = Object.fromEntries(LAMBDAS.map(lambda => [String(lambda), []]));
        const innerRelevantCount = trainRows.filter(row => row.rating >= 7).length;
        let innerValidationRelevant = 0;
        for (let innerFold = 0; innerFold < innerFolds.length; innerFold += 1) {
          if (!shouldContinue()) return null;
          const innerTestSet = new Set(innerFolds[innerFold]);
          const innerTrain = innerRows.filter((row, index) => !innerTestSet.has(index));
          const innerTest = innerFolds[innerFold].map(index => innerRows[index]);
          innerValidationRelevant += innerTest.filter(row => row.rating >= 7).length;
          const innerEvaluation = [];
          for (const lambda of LAMBDAS) {
            const evaluated = await metricAccumulatorFor(fullEngine, innerTrain, innerTest, lambda, shouldContinue);
            if (!evaluated) return null;
            const availableScores = MODES.map(mode => evaluated.thresholds["7"][mode]).filter(Number.isFinite);
            innerScores[String(lambda)].push(...availableScores);
          }
          work += 1;
          publishProgress("Selección interna de lambda, pliegue " + (innerFold + 1));
          await yieldToBrowser();
        }
        let chosenLambda = null;
        if (innerRelevantCount >= MIN_TUNING_RELEVANT && innerValidationRelevant >= MIN_TUNING_RELEVANT) {
          let bestRanking = -Infinity;
          for (const lambda of LAMBDAS) {
            const score = mean(innerScores[String(lambda)]);
            if (score !== null && (score > bestRanking + EPSILON ||
              (Math.abs(score - bestRanking) <= EPSILON && (chosenLambda === null || lambda < chosenLambda)))) {
              bestRanking = score;
              chosenLambda = lambda;
            }
          }
        }
        if (chosenLambda !== null) {
          selectedLambdaCounts[String(chosenLambda)] += 1;
          const selected = await metricAccumulatorFor(fullEngine, trainRows, testRows, chosenLambda, shouldContinue);
          if (!selected) return null;
          selectedLambdaOutcomes.errors.push(...selected.scored.errors);
          selectedLambdaOutcomes.foldMae.push(selected.scored.mae);
          for (const threshold of THRESHOLDS) {
            for (const mode of MODES) {
              const score = selected.thresholds[String(threshold)][mode];
              if (score !== null) selectedLambdaOutcomes.ranking[String(threshold)][mode].scores.push(score);
              selectedLambdaOutcomes.ranking[String(threshold)][mode].foldScores.push(score);
            }
          }
          foldSummary.selectedLambda = {
            lambda: chosenLambda, mae: selected.scored.mae,
            ndcgAt5: selected.thresholds["7"], ndcgAt5Threshold9: selected.thresholds["9"]
          };
          work += 1;
          publishProgress("Validando lambda seleccionado en pliegue exterior");
        } else {
          foldSummary.selectedLambda = { available: false, reason: "Muestra relevante insuficiente en validación interna." };
        }
        lambdaFoldRows.push({ repeat: repeat + 1, fold: foldIndex + 1, lambdas: foldSummary.lambdas });
        repeatSummary.folds.push(foldSummary);
      }
      repetitions.push(repeatSummary);
    }

    const familySummaries = FAMILY_DEFINITIONS.map((family, familyIndex) => {
      const accumulator = familyAccumulators[family.id];
      const reference = familyAccumulators[FAMILY_DEFINITIONS[0].id];
      return {
        id: family.id, label: family.label, available: accumulator.foldMae.length === REPEATS * OUTER_FOLDS,
        mae: mean(accumulator.errors), baselineMae: mean(accumulator.errors),
        deltaMaeVsGenres: familyIndex === 0 ? null : mean(reference.errors) - mean(accumulator.errors),
        foldsEvaluated: accumulator.foldMae.length,
        foldMae: accumulator.foldMae.slice(),
        maeWins: familyIndex === 0 ? 0 : accumulator.foldMae.filter((value, index) => value < reference.foldMae[index] - EPSILON).length,
        ties: familyIndex === 0 ? 0 : accumulator.foldMae.filter((value, index) => Math.abs(value - reference.foldMae[index]) <= EPSILON).length,
        maeLosses: familyIndex === 0 ? 0 : accumulator.foldMae.filter((value, index) => value > reference.foldMae[index] + EPSILON).length,
        rankingModes: summariseRanking(accumulator, 7, familyIndex === 0 ? null : reference),
        rankingByThreshold: Object.fromEntries(THRESHOLDS.map(threshold => [
          String(threshold), summariseRanking(accumulator, threshold, familyIndex === 0 ? null : reference)
        ]))
      };
    });
    const lambdaSummaries = LAMBDAS.map(lambda => {
      const accumulator = lambdaAccumulators[String(lambda)];
      const control = lambdaAccumulators["0"];
      return {
        lambda,
        available: accumulator.foldMae.length === REPEATS * OUTER_FOLDS,
        mae: mean(accumulator.errors),
        foldMae: accumulator.foldMae.slice(),
        deltaMaeVsNoShrinkage: mean(control.errors) - mean(accumulator.errors),
        maeWins: lambda === 0 ? 0 : accumulator.foldMae.filter((value, index) => value < control.foldMae[index] - EPSILON).length,
        ties: lambda === 0 ? 0 : accumulator.foldMae.filter((value, index) => Math.abs(value - control.foldMae[index]) <= EPSILON).length,
        maeLosses: lambda === 0 ? 0 : accumulator.foldMae.filter((value, index) => value > control.foldMae[index] + EPSILON).length,
        rankingModes: summariseRanking(accumulator, 7, lambda === 0 ? null : control),
        rankingByThreshold: Object.fromEntries(THRESHOLDS.map(threshold => [
          String(threshold), summariseRanking(accumulator, threshold, lambda === 0 ? null : control)
        ])),
        repeatSummaries: repetitions.map(repeat => ({
          repeat: repeat.repeat,
          mae: mean(repeat.folds.map(fold => fold.lambdas[String(lambda)].mae)),
          foldCount: repeat.folds.length
        }))
      };
    });
    const selectedLambdaSummary = {
      available: Object.values(selectedLambdaCounts).reduce((sum, count) => sum + count, 0) > 0,
      selectionCriterion: "mean inner-validation nDCG@5 across available ranking modes at relevance threshold 7",
      outerFoldsEvaluated: Object.values(selectedLambdaCounts).reduce((sum, count) => sum + count, 0),
      selectedLambdaCounts,
      mae: mean(selectedLambdaOutcomes.errors),
      foldMae: selectedLambdaOutcomes.foldMae.slice(),
      rankingModes: summariseRanking(selectedLambdaOutcomes, 7, null),
      rankingByThreshold: Object.fromEntries(THRESHOLDS.map(threshold => [String(threshold), summariseRanking(selectedLambdaOutcomes, threshold, null)]))
    };
    const signalFeatures = Object.fromEntries(Object.keys(signalTotals).map(type => {
      const value = signalTotals[type];
      return [type, {
        featureObservations: value.count,
        supportOneFeatures: value.supportOne,
        meanSupport: value.count ? value.supportSum / value.count : null,
        meanAbsoluteWeight: value.count ? value.absWeightSum / value.count : null
      }];
    }));
    const durationMs = Math.max(0, (typeof performance !== "undefined" && performance.now ? performance.now() : Date.now()) - startedAt);
    const result = {
      executionStatus: "completed", available: true, sampleCount: rows.length,
      repeats: REPEATS, foldsPerRepeat: OUTER_FOLDS, foldsEvaluated: REPEATS * OUTER_FOLDS,
      sharedPartitions: true,
      relevanceThresholds: THRESHOLDS.slice(), relevantCounts,
      families: familySummaries, repeatSummaries: repetitions,
      supportRegularization: {
        available: true, featureSupportWeightFormula: "weight * support / (support + lambda)",
        lambdas: LAMBDAS.slice(), results: lambdaSummaries, nestedSelection: selectedLambdaSummary,
        featureSupportBySignalType: signalFeatures,
        interpretationLimits: [
          "Las repeticiones y los pliegues reutilizan el mismo historial personal y no son muestras independientes.",
          "El lambda seleccionado usa nDCG@5 de validación interna; los pliegues externos solo estiman su comportamiento.",
          "El efecto agregado por tipo describe soporte y peso aprendido, no demuestra causalidad.",
          "Las características con soporte uno se conservan y se atenúan gradualmente, nunca se descartan automáticamente."
        ]
      },
      durationMs,
      unavailableReason: null,
      interpretationLimits: [
        "Las particiones exteriores son comunes a todas las familias y todos los lambdas dentro de una repetición.",
        "Los IDs TMDB diferentes se preservan aunque haya remakes con títulos coincidentes.",
        "Las 15 observaciones son pliegues dependientes del mismo historial, no 15 historiales independientes.",
        "MAE y nDCG@5 miden objetivos distintos; un MAE menor no garantiza mejor ranking.",
        "El umbral 9 puede tener baja potencia por el reducido número de notas altas, y las dos notas 10 no bastan para evaluar excepcionales.",
        "La evaluación es diagnóstica: no modifica el motor ni las recomendaciones activas."
      ]
    };
    if (work < initialTotal) work = initialTotal;
    publishProgress("Validación repetida, familias y regularización completadas");
    return result;
  }
  return { evaluateAsync, familyDefinitions: FAMILY_DEFINITIONS.map(({ id, label }) => ({ id, label })), lambdas: LAMBDAS.slice() };
}
