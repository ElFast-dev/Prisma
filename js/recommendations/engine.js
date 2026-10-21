export const THEME_SUPPORT_SHRINKAGE_PRIOR = 2;

export const RECOMMENDATION_SIGNAL_WEIGHTS = Object.freeze({
  genre: 1,
  theme: 0.35,
  decade: 0.2
});

function signalWeightForFeature(feature) {
  if (feature.indexOf("tema: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.theme;
  if (feature.indexOf("década: ") === 0) return RECOMMENDATION_SIGNAL_WEIGHTS.decade;
  return RECOMMENDATION_SIGNAL_WEIGHTS.genre;
}

function featureLabel(feature) {
  return feature.replace(/^género: /, "")
    .replace(/^tema: /, "")
    .replace(/^década: /, "década de ");
}

export function createRecommendationEngine(dependencies) {
  const getRatings = dependencies.getRatings;
  const findMovie = dependencies.findMovie;
  const movieFeatures = dependencies.movieFeatures;
  const ratingValue = dependencies.ratingValue;

  function buildProfile(trainingRatings, options) {
    const ratings = trainingRatings || getRatings();
    const valid = ratings.filter(function (entry) { return ratingValue(entry) != null; });
    const average = valid.length ? valid.reduce(function (sum, entry) { return sum + ratingValue(entry); }, 0) / valid.length : 6.5;
    const features = new Map();
    let withMetadata = 0;
    valid.forEach(function (entry) {
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId);
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
    return { average: average, features: features, count: valid.length, withMetadata: withMetadata };
  }

  function predictRating(movie, profile, options) {
    const features = movieFeatures(movie, null, options);
    const matches = features.map(function (feature) {
      const item = profile.features.get(feature);
      if (!item) return null;
      const signalWeight = signalWeightForFeature(feature);
      return {
        name: featureLabel(feature),
        weight: item.weight,
        influence: item.weight * signalWeight / Math.max(1, features.length),
        signalWeight: signalWeight,
        count: item.count,
        mean: item.mean,
        raw: feature
      };
    }).filter(Boolean);
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
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId);
      return ratingValue(entry) != null && movieFeatures(movie, entry).length > 0;
    });
    const decadeExamples = mapped.filter(function (entry) {
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId);
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
      const movie = findMovie(heldOut.title,heldOut.tmdbId || heldOut.tmId);
      const candidate = movie || heldOut;
      const predicted = predictRating(candidate, profile).score;
      errors.push(Math.abs(predicted - ratingValue(heldOut)));
      baselineErrors.push(Math.abs(profile.average - ratingValue(heldOut)));

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

  return { buildProfile, predictRating, evaluateModel };
}
