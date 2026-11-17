export interface SpectroInteractionFeature {
  key: string;
  label: string;
}

export interface SpectroInteractionGroup {
  category: string;
  features: SpectroInteractionFeature[];
}

export interface SpectroInteractionMovie {
  id: string;
  title: string;
  rating: number;
  groups: SpectroInteractionGroup[];
}

export interface SpectroInteractionEvidence {
  title: string;
  rating: number;
  residual: number;
}

export interface SpectroInteractionPattern {
  key: string;
  category: string;
  label: string;
  averageRating: number;
  expectedRating: number;
  difference: number;
  adjustedDifference: number;
  dispersion: number;
  sampleSize: number;
  pValue: number;
  qValue: number;
  foldCount: number;
  foldConsistency: number;
  confidence: "inicial" | "moderada" | "sólida" | "variable";
  supportingMovies: SpectroInteractionEvidence[];
}

interface ResidualObservation {
  id: string;
  title: string;
  rating: number;
  expected: number;
  residual: number;
  fold: number;
}

interface PairAccumulator {
  key: string;
  category: string;
  label: string;
  observations: ResidualObservation[];
}

interface FeatureStatistic {
  ratings: number[];
}

interface AdditiveProfile {
  average: number;
  effects: Map<string, number>;
}

const CROSS_FIT_FOLDS = 5;
const MINIMUM_PAIR_SUPPORT = 4;
const MAXIMUM_RESULTS = 8;
const FALSE_DISCOVERY_RATE = 0.05;

function mean(values: readonly number[]): number {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function standardDeviation(values: readonly number[], average: number): number {
  if (values.length < 2) return 0;
  const sumSquares = values.reduce((sum, value) => sum + (value - average) ** 2, 0);
  return Math.sqrt(sumSquares / (values.length - 1));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function stableFold(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % CROSS_FIT_FOLDS;
}

function fitAdditiveProfile(movies: readonly SpectroInteractionMovie[]): AdditiveProfile {
  const average = mean(movies.map((movie) => movie.rating));
  const categories = new Map<string, Map<string, FeatureStatistic>>();

  for (const movie of movies) {
    for (const group of movie.groups) {
      const category = categories.get(group.category) ?? new Map<string, FeatureStatistic>();
      const seen = new Set<string>();
      for (const feature of group.features) {
        if (seen.has(feature.key)) continue;
        seen.add(feature.key);
        const statistic = category.get(feature.key) ?? { ratings: [] };
        statistic.ratings.push(movie.rating);
        category.set(feature.key, statistic);
      }
      categories.set(group.category, category);
    }
  }

  const effects = new Map<string, number>();
  for (const [categoryName, features] of categories) {
    const means = [...features.entries()].map(([key, statistic]) => ({
      key,
      count: statistic.ratings.length,
      average: mean(statistic.ratings),
      ratings: statistic.ratings
    }));
    if (means.length < 2) continue;

    let withinSquares = 0;
    let withinDegreesOfFreedom = 0;
    let totalOccurrences = 0;
    for (const feature of means) {
      const featureAverage = feature.average;
      withinSquares += feature.ratings.reduce(
        (sum, rating) => sum + (rating - featureAverage) ** 2,
        0
      );
      withinDegreesOfFreedom += Math.max(0, feature.count - 1);
      totalOccurrences += feature.count;
    }

    const withinVariance = withinDegreesOfFreedom > 0
      ? withinSquares / withinDegreesOfFreedom
      : 0;
    const weightedFeatureAverage = means.reduce(
      (sum, feature) => sum + feature.average * feature.count,
      0
    ) / Math.max(1, totalOccurrences);
    const observedBetweenVariance = means.reduce(
      (sum, feature) => sum + feature.count * (feature.average - weightedFeatureAverage) ** 2,
      0
    ) / Math.max(1, totalOccurrences);
    const samplingVariance = withinVariance * means.length / Math.max(1, totalOccurrences);
    const betweenVariance = Math.max(0, observedBetweenVariance - samplingVariance);

    for (const feature of means) {
      const samplingError = withinVariance / Math.max(1, feature.count);
      const reliability = betweenVariance > 0
        ? betweenVariance / (betweenVariance + samplingError)
        : 0;
      const effect = (feature.average - average) * reliability;
      effects.set(categoryName + "\u0000" + feature.key, effect);
    }
  }

  return { average, effects };
}

function predictAdditive(
  profile: AdditiveProfile,
  groups: readonly SpectroInteractionGroup[]
): number {
  let prediction = profile.average;
  for (const group of groups) {
    const effects: number[] = [];
    const seen = new Set<string>();
    for (const feature of group.features) {
      if (seen.has(feature.key)) continue;
      seen.add(feature.key);
      const effect = profile.effects.get(group.category + "\u0000" + feature.key);
      if (effect !== undefined) effects.push(effect);
    }
    // Una familia aporta un efecto medio, aunque tenga muchos actores o términos.
    prediction += mean(effects);
  }
  return clamp(prediction, 0, 10);
}

function crossFittedResiduals(
  movies: readonly SpectroInteractionMovie[]
): ResidualObservation[] {
  const observations: ResidualObservation[] = [];
  for (let fold = 0; fold < CROSS_FIT_FOLDS; fold += 1) {
    const training = movies.filter((movie) => stableFold(movie.id) !== fold);
    const validation = movies.filter((movie) => stableFold(movie.id) === fold);
    if (training.length < 3 || validation.length === 0) continue;

    const profile = fitAdditiveProfile(training);
    for (const movie of validation) {
      const expected = predictAdditive(profile, movie.groups);
      observations.push({
        id: movie.id,
        title: movie.title,
        rating: movie.rating,
        expected,
        residual: movie.rating - expected,
        fold
      });
    }
  }
  return observations;
}

function logGamma(value: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7
  ];
  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  }
  const shifted = value - 1;
  let series = 0.9999999999998099;
  for (let index = 0; index < coefficients.length; index += 1) {
    series += coefficients[index] / (shifted + index + 1);
  }
  const t = shifted + coefficients.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(series);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const maximumIterations = 200;
  const epsilon = 3e-14;
  const tiny = 1e-300;
  const sum = a + b;
  const aPlusOne = a + 1;
  const aMinusOne = a - 1;
  let c = 1;
  let d = 1 - (sum * x) / aPlusOne;
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let result = d;

  for (let iteration = 1; iteration <= maximumIterations; iteration += 1) {
    const twice = 2 * iteration;
    let coefficient = iteration * (b - iteration) * x
      / ((aMinusOne + twice) * (a + twice));
    d = 1 + coefficient * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + coefficient / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    result *= d * c;

    coefficient = -(a + iteration) * (sum + iteration) * x
      / ((a + twice) * (aPlusOne + twice));
    d = 1 + coefficient * d;
    if (Math.abs(d) < tiny) d = tiny;
    c = 1 + coefficient / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const delta = d * c;
    result *= delta;
    if (Math.abs(delta - 1) < epsilon) break;
  }
  return result;
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const factor = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b)
      + a * Math.log(x) + b * Math.log1p(-x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return clamp(factor * betaContinuedFraction(a, b, x) / a, 0, 1);
  }
  return clamp(
    1 - factor * betaContinuedFraction(b, a, 1 - x) / b,
    0,
    1
  );
}

function twoSidedStudentP(value: number, degreesOfFreedom: number): number {
  if (!Number.isFinite(value)) return value === Number.POSITIVE_INFINITY ? 0 : 1;
  const square = value * value;
  const x = degreesOfFreedom / (degreesOfFreedom + square);
  return regularizedBeta(x, degreesOfFreedom / 2, 0.5);
}

function interactionPValue(residuals: readonly number[]): number {
  if (residuals.length < 2) return 1;
  const average = mean(residuals);
  const deviation = standardDeviation(residuals, average);
  if (deviation === 0) return average === 0 ? 1 : 0;
  const statistic = Math.abs(average) / (deviation / Math.sqrt(residuals.length));
  return twoSidedStudentP(statistic, residuals.length - 1);
}

/**
 * Benjamini–Yekutieli controla la tasa de falsos descubrimientos incluso bajo
 * dependencias arbitrarias entre hipótesis. Es más conservador que BH.
 */
function benjaminiYekutieli(
  values: readonly { key: string; pValue: number }[]
): Map<string, number> {
  const ordered = [...values].sort((a, b) => a.pValue - b.pValue || a.key.localeCompare(b.key));
  const count = ordered.length;
  if (count === 0) return new Map();

  let harmonic = 0;
  for (let rank = 1; rank <= count; rank += 1) harmonic += 1 / rank;

  const adjusted = new Array<number>(count);
  let next = 1;
  for (let index = count - 1; index >= 0; index -= 1) {
    const rank = index + 1;
    const raw = ordered[index].pValue * count * harmonic / rank;
    next = Math.min(next, raw, 1);
    adjusted[index] = next;
  }
  return new Map(ordered.map((item, index) => [item.key, adjusted[index]]));
}

function collectPairs(
  movies: readonly SpectroInteractionMovie[],
  observations: readonly ResidualObservation[]
): PairAccumulator[] {
  const movieById = new Map(movies.map((movie) => [movie.id, movie]));
  const observationById = new Map(observations.map((observation) => [observation.id, observation]));
  const featureSupport = new Map<string, number>();

  for (const movie of movies) {
    const seen = new Set<string>();
    for (const group of movie.groups) {
      for (const feature of group.features) seen.add(feature.key);
    }
    for (const key of seen) featureSupport.set(key, (featureSupport.get(key) ?? 0) + 1);
  }

  const pairs = new Map<string, PairAccumulator>();
  for (const observation of observations) {
    const movie = movieById.get(observation.id);
    if (!movie) continue;
    const groups = movie.groups
      .map((group) => ({
        category: group.category,
        features: group.features.filter((feature) => (featureSupport.get(feature.key) ?? 0) >= 2)
      }))
      .filter((group) => group.features.length > 0);

    for (let leftIndex = 0; leftIndex < groups.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < groups.length; rightIndex += 1) {
        const leftGroup = groups[leftIndex];
        const rightGroup = groups[rightIndex];
        for (const leftFeature of leftGroup.features) {
          for (const rightFeature of rightGroup.features) {
            if (leftFeature.key === rightFeature.key) continue;
            const leftFirst = leftFeature.key.localeCompare(rightFeature.key) <= 0;
            const firstFeature = leftFirst ? leftFeature : rightFeature;
            const secondFeature = leftFirst ? rightFeature : leftFeature;
            const firstCategory = leftFirst ? leftGroup.category : rightGroup.category;
            const secondCategory = leftFirst ? rightGroup.category : leftGroup.category;
            const key = firstFeature.key + "::" + secondFeature.key;
            const existing = pairs.get(key) ?? {
              key,
              category: firstCategory + " + " + secondCategory,
              label: firstFeature.label + " + " + secondFeature.label,
              observations: []
            };
            existing.observations.push(observation);
            pairs.set(key, existing);
          }
        }
      }
    }
  }

  return [...pairs.values()].filter((pair) => (
    pair.observations.length >= MINIMUM_PAIR_SUPPORT
  ));
}

function summarizePair(pair: PairAccumulator): Omit<SpectroInteractionPattern, "qValue" | "confidence"> & {
  pValue: number;
} {
  const observations = pair.observations;
  const ratings = observations.map((item) => item.rating);
  const residuals = observations.map((item) => item.residual);
  const expected = observations.map((item) => item.expected);
  const difference = mean(residuals);
  const byFold = new Map<number, number[]>();
  for (const item of observations) {
    const fold = byFold.get(item.fold) ?? [];
    fold.push(item.residual);
    byFold.set(item.fold, fold);
  }
  const foldMeans = [...byFold.values()].map((items) => mean(items));
  const sameDirection = foldMeans.filter((value) => (
    difference >= 0 ? value > 0 : value < 0
  )).length;
  const foldConsistency = foldMeans.length ? sameDirection / foldMeans.length : 0;
  const supportingMovies = [...observations]
    .sort((a, b) => difference >= 0
      ? b.residual - a.residual || a.title.localeCompare(b.title)
      : a.residual - b.residual || a.title.localeCompare(b.title))
    .slice(0, 3)
    .map((item) => ({
      title: item.title,
      rating: Math.round(item.rating * 100) / 100,
      residual: Math.round(item.residual * 100) / 100
    }));

  return {
    key: pair.key,
    category: pair.category,
    label: pair.label,
    averageRating: Math.round(mean(ratings) * 100) / 100,
    expectedRating: Math.round(mean(expected) * 100) / 100,
    difference: Math.round(difference * 100) / 100,
    adjustedDifference: Math.round(difference * 100) / 100,
    dispersion: Math.round(standardDeviation(ratings, mean(ratings)) * 100) / 100,
    sampleSize: observations.length,
    pValue: interactionPValue(residuals),
    foldCount: foldMeans.length,
    foldConsistency: Math.round(foldConsistency * 1000) / 1000,
    supportingMovies
  };
}

export function buildSpectroInteractions(
  input: readonly SpectroInteractionMovie[],
  maximumResults = MAXIMUM_RESULTS
): SpectroInteractionPattern[] {
  const uniqueMovies = [...new Map(input.map((movie) => [movie.id, movie])).values()]
    .filter((movie) => Number.isFinite(movie.rating) && movie.rating >= 0 && movie.rating <= 10);
  if (uniqueMovies.length < 8) return [];

  const observations = crossFittedResiduals(uniqueMovies);
  if (observations.length < 8) return [];

  const pairs = collectPairs(uniqueMovies, observations);
  const summaries = pairs.map(summarizePair);
  const qValues = benjaminiYekutieli(summaries.map((item) => ({
    key: item.key,
    pValue: item.pValue
  })));

  return summaries
    .map((item) => {
      const qValue = qValues.get(item.key) ?? 1;
      const confidence = qValue <= 0.01 && item.foldConsistency >= 0.8
        ? "sólida"
        : qValue <= FALSE_DISCOVERY_RATE && item.foldConsistency >= 0.75
          ? "moderada"
          : "variable";
      return {
        ...item,
        qValue: Math.round(qValue * 1_000_000) / 1_000_000,
        confidence
      };
    })
    .filter((item) => (
      item.qValue <= FALSE_DISCOVERY_RATE
      && item.foldCount >= 3
      && item.foldConsistency >= 0.75
    ))
    .sort((a, b) => (
      a.qValue - b.qValue
      || Math.abs(b.adjustedDifference) - Math.abs(a.adjustedDifference)
      || b.sampleSize - a.sampleSize
      || a.label.localeCompare(b.label)
    ))
    .slice(0, Math.max(0, maximumResults));
}
