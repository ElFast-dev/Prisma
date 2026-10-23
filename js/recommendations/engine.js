export const THEME_SUPPORT_SHRINKAGE_PRIOR = 2;
export const RECOMMENDATION_PRIOR_RATING = 6.5;
export const RECOMMENDATION_PRIOR_STRENGTH = 3;

export const RECOMMENDATION_SIGNAL_WEIGHTS = Object.freeze({
  genre: 1,
  theme: 0.35,
  director: 0.45,
  collection: 0.4,
  actor: 0.28,
  writer: 0.3,
  composer: 0.18,
  synopsis: 0.12,
  company: 0.14,
  country: 0.12,
  language: 0.1,
  spokenLanguage: 0.08,
  runtime: 0.12,
  decade: 0.2
});

function signalWeightForFeature(feature) {
  if (feature.indexOf("tema: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.theme;
  if (feature.indexOf("trama: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.synopsis;
  if (feature.indexOf("actor: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.actor;
  if (feature.indexOf("director: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.director;
  if (feature.indexOf("guionista: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.writer;
  if (feature.indexOf("compositor: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.composer;
  if (feature.indexOf("productora: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.company;
  if (feature.indexOf("país: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.country;
  if (feature.indexOf("idioma original: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.language;
  if (feature.indexOf("idioma hablado: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.spokenLanguage;
  if (feature.indexOf("saga: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.collection;
  if (feature.indexOf("duración: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.runtime;
  if (feature.indexOf("década: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.decade;
  return RECOMMENDATION_SIGNAL_WEIGHTS.genre;
}

function featureLabel(feature) {
  const labels = [
    ["género: ", "género "], ["tema: ", "tema "], ["trama: ", "tema narrativo "],
    ["actor: ", "reparto "], ["director: ", "dirección "], ["guionista: ", "guion "],
    ["compositor: ", "música "], ["productora: ", "productora "], ["país: ", "país "],
    ["idioma original: ", "idioma original "], ["idioma hablado: ", "idioma hablado "],
    ["saga: ", "saga "], ["duración: ", "duración "], ["década: ", "década de "]
  ];
  const match = labels.find(([prefix]) => feature.indexOf(prefix) === 0);
  return match ? match[1] + feature.slice(match[0].length) : feature;
}

export function createRecommendationEngine(dependencies) {
  const getRatings = dependencies.getRatings;
  const findMovie = dependencies.findMovie;
  const movieFeatures = dependencies.movieFeatures;
  const ratingValue = dependencies.ratingValue;

  function buildProfile(trainingRatings, options) {
    const ratings = trainingRatings || getRatings();
    const valid = ratings.filter(function (entry) { return ratingValue(entry) != null; });
    const ratingSum = valid.reduce(function (sum, entry) { return sum + ratingValue(entry); }, 0);
    const personalAverage = valid.length ? ratingSum / valid.length : RECOMMENDATION_PRIOR_RATING;
    // A smoothed prior keeps the first note informative without claiming strong confidence.
    const average = (ratingSum + RECOMMENDATION_PRIOR_RATING * RECOMMENDATION_PRIOR_STRENGTH) /
      (valid.length + RECOMMENDATION_PRIOR_STRENGTH);
    const features = new Map();
    let withMetadata = 0;
    valid.forEach(function (entry) {
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId,entry.year || entry.releaseYear || entry.release_year);
      const names = movieFeatures(movie, entry, options);
      if (!names.length) return;
      withMetadata += 1;
      const deviation = (ratingValue(entry) - average) / 4;
      names.forEach(function (name) {
        const item = features.get(name) || { sum: 0, count: 0, sumRating: 0 };
        item.sum += deviation;
        item.count += 1;
        item.sumRating += ratingValue(entry);
        features.set(name, item);
      });
    });
    features.forEach(function (item, name) {
      item.weight = item.sum / (item.count + 0.4);
      if (options && options.themeSupportShrinkage && name.indexOf("tema: ") === 0) {
        item.weight *= item.count / (item.count + THEME_SUPPORT_SHRINKAGE_PRIOR);
      }
      item.mean = item.sumRating / item.count;
    });
    return {
      average: average,
      personalAverage: personalAverage,
      priorStrength: RECOMMENDATION_PRIOR_STRENGTH,
      features: features,
      count: valid.length,
      withMetadata: withMetadata
    };
  }

  function buildProfileFromMappedRows(mappedRows, options) {
    const rows = mappedRows || [];
    const valid = rows.filter(function (row) { return row && ratingValue(row.entry) != null; });
    const ratingSum = valid.reduce(function (sum, row) { return sum + ratingValue(row.entry); }, 0);
    const personalAverage = valid.length ? ratingSum / valid.length : RECOMMENDATION_PRIOR_RATING;
    const average = (ratingSum + RECOMMENDATION_PRIOR_RATING * RECOMMENDATION_PRIOR_STRENGTH) /
      (valid.length + RECOMMENDATION_PRIOR_STRENGTH);
    const features = new Map();
    let withMetadata = 0;

    valid.forEach(function (row) {
      const names = (Array.isArray(row.features) ? row.features : []).filter(function (name) {
        return !options || options.includeDecade !== false || name.indexOf("década: ") !== 0;
      });
      if (!names.length) return;
      withMetadata += 1;
      const deviation = (ratingValue(row.entry) - average) / 4;
      names.forEach(function (name) {
        const item = features.get(name) || { sum: 0, count: 0, sumRating: 0 };
        item.sum += deviation;
        item.count += 1;
        item.sumRating += ratingValue(row.entry);
        features.set(name, item);
      });
    });
    features.forEach(function (item, name) {
      item.weight = item.sum / (item.count + 0.4);
      if (options && options.themeSupportShrinkage && name.indexOf("tema: ") === 0) {
        item.weight *= item.count / (item.count + THEME_SUPPORT_SHRINKAGE_PRIOR);
      }
      item.mean = item.sumRating / item.count;
    });
    return {
      average: average,
      personalAverage: personalAverage,
      priorStrength: RECOMMENDATION_PRIOR_STRENGTH,
      features: features,
      count: valid.length,
      withMetadata: withMetadata
    };
  }

  async function buildProfileAsync(trainingRatings, options, control) {
    const settings = control || {};
    const shouldContinue = typeof settings.shouldContinue === "function" ? settings.shouldContinue : function () { return true; };
    const onProgress = typeof settings.onProgress === "function" ? settings.onProgress : function () {};
    const batchSize = Math.max(8, Math.min(64, Number(settings.batchSize) || 32));
    const yieldToBrowser = typeof settings.yieldToBrowser === "function"
      ? settings.yieldToBrowser
      : function () { return new Promise(function (resolve) { setTimeout(resolve, 0); }); };
    const source = trainingRatings || getRatings();
    const valid = source.filter(function (entry) { return ratingValue(entry) != null; });
    const mappedRows = options == null && Array.isArray(settings.mappedRows) ? settings.mappedRows : null;
    const ratingSum = valid.reduce(function (sum, entry) { return sum + ratingValue(entry); }, 0);
    const personalAverage = valid.length ? ratingSum / valid.length : RECOMMENDATION_PRIOR_RATING;
    const average = (ratingSum + RECOMMENDATION_PRIOR_RATING * RECOMMENDATION_PRIOR_STRENGTH) /
      (valid.length + RECOMMENDATION_PRIOR_STRENGTH);
    const features = new Map();
    let withMetadata = 0;

    for (let index = 0; index < valid.length; index += 1) {
      if (!shouldContinue()) return null;
      const entry = valid[index];
      const cached = mappedRows && mappedRows[index] && mappedRows[index].entry === entry ? mappedRows[index] : null;
      const movie = cached ? cached.movie : findMovie(entry.title, entry.tmdbId || entry.tmId, entry.year || entry.releaseYear || entry.release_year);
      const names = cached && Array.isArray(cached.features) ? cached.features : movieFeatures(movie, entry, options);
      if (names.length) {
        withMetadata += 1;
        const deviation = (ratingValue(entry) - average) / 4;
        names.forEach(function (name) {
          const item = features.get(name) || { sum: 0, count: 0, sumRating: 0 };
          item.sum += deviation;
          item.count += 1;
          item.sumRating += ratingValue(entry);
          features.set(name, item);
        });
      }
      if ((index + 1) % batchSize === 0 || index + 1 === valid.length) {
        onProgress({
          completedWork: index + 1,
          totalWork: Math.max(1, valid.length),
          phase: "profile",
          detail: "Construcción cooperativa del perfil"
        });
        await yieldToBrowser();
        if (!shouldContinue()) return null;
      }
    }

    features.forEach(function (item, name) {
      item.weight = item.sum / (item.count + 0.4);
      if (options && options.themeSupportShrinkage && name.indexOf("tema: ") === 0) {
        item.weight *= item.count / (item.count + THEME_SUPPORT_SHRINKAGE_PRIOR);
      }
      item.mean = item.sumRating / item.count;
    });
    return {
      average: average,
      personalAverage: personalAverage,
      priorStrength: RECOMMENDATION_PRIOR_STRENGTH,
      features: features,
      count: valid.length,
      withMetadata: withMetadata
    };
  }

  function predictRating(movie, profile, options) {
    const features = movieFeatures(movie, null, options);
    const matchingFeatures = features.map(function (feature) {
      const item = profile.features.get(feature);
      if (!item) return null;
      const signalWeight = signalWeightForFeature(feature);
      return {
        name: featureLabel(feature),
        weight: item.weight,
        rawInfluence: item.weight * signalWeight,
        signalWeight: signalWeight,
        count: item.count,
        mean: item.mean,
        raw: feature
      };
    }).filter(Boolean);
    const normalizationMode = options && options.influenceNormalization;
    const featureCount = Math.max(1, features.length);
    const matchedCount = Math.max(1, matchingFeatures.length);
    let denominator = featureCount;
    if (normalizationMode === "coverage-sqrt") {
      // Intermediate hypothesis: attenuate less than 1/N while retaining an explicit coverage penalty.
      denominator = Math.sqrt(featureCount * matchedCount);
    } else if (normalizationMode === "matched-only") {
      // Diagnostic upper bound only: ignores unknown feature coverage and must never be the production default.
      denominator = matchedCount;
    }
    const matches = matchingFeatures.map(function (item) {
      return Object.assign({}, item, {
        influence: item.rawInfluence / denominator
      });
    });
    matches.forEach(function (item) { delete item.rawInfluence; });
    const coverage = features.length ? matches.length / features.length : 0;
    const weighted = features.length
      ? matches.reduce(function (sum, item) { return sum + item.influence; }, 0)
      : 0;
    const freshFeatures = features.filter(function (feature) { return !profile.features.has(feature); }).length;
    const score = Math.max(1, Math.min(10, profile.average + weighted * 2.3));
    const positive = matches.filter(function (item) { return item.influence > 0.08; }).sort(function (a, b) { return b.influence - a.influence; });
    const negative = matches.filter(function (item) { return item.influence < -0.08; }).sort(function (a, b) { return a.influence - b.influence; });
    const confidence = !matches.length ? "Muy baja" : (profile.withMetadata < 8 ? "Inicial" :
      (matches.length >= 2 && coverage >= 0.6 && matches.some(function (item) { return item.count >= 3; }) ? "Moderada" : "Limitada"));
    let explanation;
    if (positive.length) {
      explanation = "Coincide con señales positivas de tu historial: " + positive.slice(0, 2).map(function (item) { return item.name; }).join(" y ") + ".";
    } else if (negative.length) {
      explanation = "Coincide con señales asociadas a notas más bajas en tu historial: " + negative.slice(0, 2).map(function (item) { return item.name; }).join(" y ") + ".";
    } else if (matches.length) {
      explanation = "Comparte características que aún no han mostrado una preferencia clara en tus notas.";
    } else {
      explanation = "Todavía no hay suficientes características enlazadas para explicar esta recomendación; se usa tu nota media como referencia.";
    }
    if (negative.length && positive.length > 0 && positive.length < 2) explanation += " Señal a vigilar: " + negative[0].name + ".";
    if (matches.length && coverage < 0.5) explanation += " La mayoría de las características aún no están respaldadas por tu historial.";
    return {
      score: score,
      matches: matches,
      explanation: explanation,
      confidence: confidence,
      coverage: coverage,
      freshFeatures: freshFeatures,
      reasonFeatures: positive.slice(0, 3).map(function (item) { return item.name; })
    };
  }

  function evaluateModel() {
    const mapped = getRatings().filter(function (entry) {
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId,entry.year || entry.releaseYear || entry.release_year);
      return ratingValue(entry) != null && movieFeatures(movie, entry).length > 0;
    });
    const decadeExamples = mapped.filter(function (entry) {
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId,entry.year || entry.releaseYear || entry.release_year);
      return movieFeatures(movie, entry).some(function (feature) { return feature.indexOf("década: ") === 0; });
    }).length;
    if (mapped.length < 5) {
      return {
        available: false, count: mapped.length, mae: null, baselineMae: null,
        improvementPct: null, withoutDecadeMae: null, decadeImprovement: null,
        themeShrinkageMae: null, themeShrinkageDelta: null,
        themeShrinkagePrior: THEME_SUPPORT_SHRINKAGE_PRIOR,
        decadeExamples: decadeExamples
      };
    }
    const errors = [];
    const baselineErrors = [];
    const withoutDecadeErrors = [];
    const themeShrinkageErrors = [];
    mapped.forEach(function (heldOut, index) {
      const training = mapped.filter(function (_, i) { return i !== index; });
      const profile = buildProfile(training);
      const movie = findMovie(heldOut.title,heldOut.tmdbId || heldOut.tmId,heldOut.year || heldOut.releaseYear || heldOut.release_year);
      const candidate = movie || heldOut;
      const predicted = predictRating(candidate, profile).score;
      errors.push(Math.abs(predicted - ratingValue(heldOut)));
      // Keep the reference predictor equal to the unshrunk training mean, not the model's smoothed prior.
      baselineErrors.push(Math.abs(profile.personalAverage - ratingValue(heldOut)));

      // Paired experiment: same held-out entry and training split; only theme weights shrink.
      const shrinkageProfile = buildProfile(training, { themeSupportShrinkage: true });
      const shrinkagePrediction = predictRating(candidate, shrinkageProfile).score;
      themeShrinkageErrors.push(Math.abs(shrinkagePrediction - ratingValue(heldOut)));

      // The ablation uses the same held-out title and training split, but excludes decade
      // both while learning the profile and while calculating the candidate prediction.
      const profileWithoutDecade = buildProfile(training, { includeDecade: false });
      const predictedWithoutDecade = predictRating(candidate, profileWithoutDecade, { includeDecade: false }).score;
      withoutDecadeErrors.push(Math.abs(predictedWithoutDecade - ratingValue(heldOut)));
    });
    const mae = errors.reduce(function (sum, error) { return sum + error; }, 0) / errors.length;
    const baselineMae = baselineErrors.reduce(function (sum, error) { return sum + error; }, 0) / baselineErrors.length;
    const withoutDecadeMae = withoutDecadeErrors.reduce(function (sum, error) { return sum + error; }, 0) / withoutDecadeErrors.length;
    const themeShrinkageMae = themeShrinkageErrors.reduce(function (sum, error) { return sum + error; }, 0) / themeShrinkageErrors.length;
    const themeShrinkageDelta = mae - themeShrinkageMae;
    const improvementPct = baselineMae > 0 ? ((baselineMae - mae) / baselineMae) * 100 : null;
    const decadeImprovement = decadeExamples >= 5 ? withoutDecadeMae - mae : null;
    return {
      available: true,
      count: errors.length,
      mae: mae,
      baselineMae: baselineMae,
      improvementPct: improvementPct,
      withoutDecadeMae: withoutDecadeMae,
      decadeImprovement: decadeImprovement,
      themeShrinkageMae: themeShrinkageMae,
      themeShrinkageDelta: themeShrinkageDelta,
      themeShrinkagePrior: THEME_SUPPORT_SHRINKAGE_PRIOR,
      decadeExamples: decadeExamples
    };
  }


  async function evaluateModelAsync(control) {
    const settings = control || {};
    const batchSize = Math.max(1, Math.min(8, Number(settings.batchSize) || 3));
    const shouldContinue = typeof settings.shouldContinue === "function" ? settings.shouldContinue : function () { return true; };
    const onProgress = typeof settings.onProgress === "function" ? settings.onProgress : function () {};
    const yieldToBrowser = function () {
      return new Promise(function (resolve) { setTimeout(resolve, 0); });
    };
    const sourceRatings = getRatings() || [];
    const mapped = [];
    let decadeExamples = 0;

    for (let index = 0; index < sourceRatings.length; index += 1) {
      if (!shouldContinue()) return null;
      const entry = sourceRatings[index];
      if (ratingValue(entry) != null) {
        const movie = findMovie(entry.title, entry.tmdbId || entry.tmId, entry.year || entry.releaseYear || entry.release_year);
        const names = movieFeatures(movie, entry);
        if (names.length) {
          mapped.push({ entry: entry, movie: movie, features: names });
          if (names.some(function (feature) { return feature.indexOf("década: ") === 0; })) decadeExamples += 1;
        }
      }
      if ((index + 1) % 16 === 0 || index + 1 === sourceRatings.length) {
        onProgress({ phase: "mapping", completed: index + 1, total: sourceRatings.length });
        await yieldToBrowser();
      }
    }

    if (mapped.length < 5) {
      return {
        available: false, count: mapped.length, mae: null, baselineMae: null,
        improvementPct: null, withoutDecadeMae: null, decadeImprovement: null,
        themeShrinkageMae: null, themeShrinkageDelta: null,
        themeShrinkagePrior: THEME_SUPPORT_SHRINKAGE_PRIOR,
        decadeExamples: decadeExamples
      };
    }

    const errors = [];
    const baselineErrors = [];
    const withoutDecadeErrors = [];
    const themeShrinkageErrors = [];

    for (let index = 0; index < mapped.length; index += 1) {
      if (!shouldContinue()) return null;
      const heldOut = mapped[index];
      const training = mapped.filter(function (_, trainingIndex) { return trainingIndex !== index; });
      const profile = buildProfileFromMappedRows(training);
      const candidate = heldOut.movie || heldOut.entry;
      const predicted = predictRating(candidate, profile).score;
      errors.push(Math.abs(predicted - ratingValue(heldOut.entry)));
      baselineErrors.push(Math.abs(profile.personalAverage - ratingValue(heldOut.entry)));

      const shrinkageProfile = buildProfileFromMappedRows(training, { themeSupportShrinkage: true });
      const shrinkagePrediction = predictRating(candidate, shrinkageProfile).score;
      themeShrinkageErrors.push(Math.abs(shrinkagePrediction - ratingValue(heldOut.entry)));

      const profileWithoutDecade = buildProfileFromMappedRows(training, { includeDecade: false });
      const predictedWithoutDecade = predictRating(candidate, profileWithoutDecade, { includeDecade: false }).score;
      withoutDecadeErrors.push(Math.abs(predictedWithoutDecade - ratingValue(heldOut.entry)));

      if ((index + 1) % batchSize === 0 || index + 1 === mapped.length) {
        onProgress({ phase: "validation", completed: index + 1, total: mapped.length });
        await yieldToBrowser();
      }
    }

    const mae = errors.reduce(function (sum, error) { return sum + error; }, 0) / errors.length;
    const baselineMae = baselineErrors.reduce(function (sum, error) { return sum + error; }, 0) / baselineErrors.length;
    const withoutDecadeMae = withoutDecadeErrors.reduce(function (sum, error) { return sum + error; }, 0) / withoutDecadeErrors.length;
    const themeShrinkageMae = themeShrinkageErrors.reduce(function (sum, error) { return sum + error; }, 0) / themeShrinkageErrors.length;
    const themeShrinkageDelta = mae - themeShrinkageMae;
    const improvementPct = baselineMae > 0 ? ((baselineMae - mae) / baselineMae) * 100 : null;

    return {
      available: true,
      count: errors.length,
      mae: mae,
      baselineMae: baselineMae,
      improvementPct: improvementPct,
      withoutDecadeMae: withoutDecadeMae,
      decadeImprovement: decadeExamples >= 5 ? withoutDecadeMae - mae : null,
      themeShrinkageMae: themeShrinkageMae,
      themeShrinkageDelta: themeShrinkageDelta,
      themeShrinkagePrior: THEME_SUPPORT_SHRINKAGE_PRIOR,
      decadeExamples: decadeExamples
    };
  }

  return { buildProfile, buildProfileAsync, predictRating, evaluateModel, evaluateModelAsync };
}
