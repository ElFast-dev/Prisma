import type { MovieRecord, Viewing } from "./types";
import {
  applySpectroMetadataSnapshot,
  createSpectroMetadataSnapshot,
  isSpectroMetadataSnapshot,
  selectSpectroMetadataSnapshot,
  type SpectroMetadataSnapshot
} from "./spectroMetadataHistory";
import {
  predictSpectroMovies,
  type SpectroPredictionTrainingMovie
} from "./spectroPrediction";

export interface SpectroTemporalEvaluationOptions {
  /** Minimum number of distinct titles available before each test window. */
  minimumTrainingMovies?: number;
  /** Target number of distinct titles per future test window. */
  testWindowMovies?: number;
  /** Ignore final windows smaller than this number of distinct titles. */
  minimumTestMovies?: number;
  /** Maximum number of expanding-window validation folds to evaluate. */
  maximumFolds?: number;
  /** Number of final, most recent distinct titles held out exactly once. */
  finalTestMovies?: number;
  /** A future rating at or above this value counts as relevant for ranking. */
  relevantRatingThreshold?: number;
  /** Number of top-ranked candidates used by ranking metrics. */
  rankingCutoff?: number;
}

export interface SpectroTemporalMetrics {
  mae: number;
  rmse: number;
  meanBaselineMae: number;
  meanBaselineRmse: number;
  medianBaselineMae: number;
  medianBaselineRmse: number;
  neighborBaselineMae: number;
  neighborBaselineRmse: number;
  ndcgAtK: number;
  precisionAtK: number;
  recallAtK: number;
  hitRateAtK: number;
}

export interface SpectroTemporalFold {
  index: number;
  trainingMovieCount: number;
  testMovieCount: number;
  predictionCoverage: number;
  metadataCoverage: number;
  metadataExcludedMovieCount: number;
  metrics: SpectroTemporalMetrics;
}

export interface SpectroTemporalEvaluationReport {
  status: "evaluated" | "insufficient-data";
  reason?:
    | "not-enough-distinct-rated-movies"
    | "no-valid-temporal-windows"
    | "no-historical-metadata-before-cutoff"
    | "no-valid-final-test";
  uniqueRatedMovies: number;
  foldCount: number;
  options: Required<SpectroTemporalEvaluationOptions>;
  metadataScope: "observed-before-cutoff";
  /** Expanding validation folds; the final test is never included here. */
  folds: SpectroTemporalFold[];
  /** Most recent reserved window, evaluated exactly once after validation. */
  finalTest: SpectroTemporalFold | null;
  aggregate?: SpectroTemporalMetrics & {
    rbfWinRateAgainstMeanBaseline: number;
  };
  limitations: string[];
}

interface RatedViewing {
  day: string;
  rating: number;
  sequenceNumber: number;
  id: string;
}

interface RatedTitle {
  movie: MovieRecord;
  firstRatedOn: string;
  viewings: RatedViewing[];
}

interface DateGroup {
  day: string;
  titles: RatedTitle[];
}

interface EvaluationTarget {
  id: string;
  movie: MovieRecord;
  rating: number;
}

interface ScoredTarget extends EvaluationTarget {
  predictedRating: number;
  neighborRating: number;
}

const DEFAULT_OPTIONS: Required<SpectroTemporalEvaluationOptions> = {
  minimumTrainingMovies: 12,
  testWindowMovies: 5,
  minimumTestMovies: 3,
  maximumFolds: 6,
  finalTestMovies: 4,
  relevantRatingThreshold: 7,
  rankingCutoff: 5
};

const LIMITATIONS = [
  "La evaluación separa cronológicamente las valoraciones y agrega los revisionados por título.",
  "Cada corte usa la última observación local de metadatos conocida antes del primer día de prueba; las observaciones del mismo día se excluyen porque watchedOn no conserva hora.",
  "Los registros anteriores al historial de observaciones usan updatedAt como límite conservador de disponibilidad. Nunca se retrotraen a createdAt ni a la fecha del visionado.",
  "Los títulos sin una observación anterior al corte se excluyen de esa ventana. La cobertura de metadatos se informa por fold.",
  "La validación expansiva y el test final reservado son conjuntos separados; el test final no interviene en las métricas agregadas de validación."
];

function normalizeOptions(
  options: SpectroTemporalEvaluationOptions
): Required<SpectroTemporalEvaluationOptions> {
  const positiveInteger = (value: number | undefined, fallback: number, minimum: number) => (
    Number.isFinite(value) ? Math.max(minimum, Math.floor(value as number)) : fallback
  );
  const threshold = options.relevantRatingThreshold;
  const rankingCutoff = options.rankingCutoff;

  return {
    minimumTrainingMovies: positiveInteger(
      options.minimumTrainingMovies,
      DEFAULT_OPTIONS.minimumTrainingMovies,
      3
    ),
    testWindowMovies: positiveInteger(
      options.testWindowMovies,
      DEFAULT_OPTIONS.testWindowMovies,
      1
    ),
    minimumTestMovies: positiveInteger(
      options.minimumTestMovies,
      DEFAULT_OPTIONS.minimumTestMovies,
      1
    ),
    maximumFolds: positiveInteger(
      options.maximumFolds,
      DEFAULT_OPTIONS.maximumFolds,
      1
    ),
    finalTestMovies: positiveInteger(
      options.finalTestMovies,
      DEFAULT_OPTIONS.finalTestMovies,
      1
    ),
    relevantRatingThreshold: Number.isFinite(threshold)
      ? Math.max(0, Math.min(10, threshold as number))
      : DEFAULT_OPTIONS.relevantRatingThreshold,
    rankingCutoff: positiveInteger(
      rankingCutoff,
      DEFAULT_OPTIONS.rankingCutoff,
      1
    )
  };
}

function normalizeDay(value: string): string | null {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const timestamp = Date.parse(day + "T00:00:00.000Z");
  if (!Number.isFinite(timestamp)) return null;
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== Number(day.slice(0, 4))
    || date.getUTCMonth() + 1 !== Number(day.slice(5, 7))
    || date.getUTCDate() !== Number(day.slice(8, 10))
  ) return null;
  return day;
}

function isValidRating(value: number | undefined): value is number {
  return Number.isFinite(value) && value !== undefined && value >= 0 && value <= 10;
}

function average(values: readonly number[]): number {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function errorMetrics(
  predictions: readonly number[],
  actual: readonly number[]
): { mae: number; rmse: number } {
  if (predictions.length === 0 || predictions.length !== actual.length) {
    return { mae: 0, rmse: 0 };
  }
  const absoluteErrors = predictions.map((prediction, index) => (
    Math.abs(prediction - actual[index])
  ));
  const squaredErrors = predictions.map((prediction, index) => (
    (prediction - actual[index]) ** 2
  ));
  return {
    mae: average(absoluteErrors),
    rmse: Math.sqrt(average(squaredErrors))
  };
}

function neighborWeightedRating(
  neighbors: readonly { rating: number; similarity: number }[],
  fallback: number
): number {
  const weighted = neighbors.reduce((result, neighbor) => ({
    numerator: result.numerator + neighbor.rating * neighbor.similarity,
    denominator: result.denominator + neighbor.similarity
  }), { numerator: 0, denominator: 0 });

  return weighted.denominator > 0
    ? weighted.numerator / weighted.denominator
    : fallback;
}

function rankingMetrics(
  targets: readonly ScoredTarget[],
  relevantThreshold: number,
  cutoff: number
): Pick<SpectroTemporalMetrics, "ndcgAtK" | "precisionAtK" | "recallAtK" | "hitRateAtK"> {
  const ranked = [...targets].sort((left, right) => (
    right.predictedRating - left.predictedRating
    || left.id.localeCompare(right.id)
  ));
  const top = ranked.slice(0, cutoff);
  const relevantCount = targets.filter((target) => target.rating >= relevantThreshold).length;
  const hits = top.filter((target) => target.rating >= relevantThreshold).length;
  const gain = (rating: number) => (2 ** rating) - 1;
  const discount = (position: number) => Math.log2(position + 2);

  const dcg = top.reduce((sum, target, index) => (
    sum + gain(target.rating) / discount(index)
  ), 0);
  const ideal = [...targets]
    .sort((left, right) => right.rating - left.rating || left.id.localeCompare(right.id))
    .slice(0, cutoff);
  const idealDcg = ideal.reduce((sum, target, index) => (
    sum + gain(target.rating) / discount(index)
  ), 0);

  return {
    ndcgAtK: idealDcg > 0 ? dcg / idealDcg : 0,
    precisionAtK: top.length > 0 ? hits / top.length : 0,
    recallAtK: relevantCount > 0 ? hits / relevantCount : 0,
    hitRateAtK: hits > 0 ? 1 : 0
  };
}

function groupRatedTitles(
  movies: readonly MovieRecord[],
  viewings: readonly Viewing[]
): RatedTitle[] {
  const moviesById = new Map(movies.map((movie) => [movie.id, movie]));
  const viewingsByMovie = new Map<string, RatedViewing[]>();

  for (const viewing of viewings) {
    if (!isValidRating(viewing.rating)) continue;
    const movie = moviesById.get(viewing.movieId);
    const day = normalizeDay(viewing.watchedOn);
    if (!movie || !day) continue;

    const rows = viewingsByMovie.get(viewing.movieId) ?? [];
    rows.push({
      day,
      rating: viewing.rating,
      sequenceNumber: Number.isFinite(viewing.sequenceNumber)
        ? viewing.sequenceNumber
        : 0,
      id: viewing.id
    });
    viewingsByMovie.set(viewing.movieId, rows);
  }

  return [...viewingsByMovie.entries()]
    .map(([movieId, rows]) => {
      rows.sort((left, right) => (
        left.day.localeCompare(right.day)
        || left.sequenceNumber - right.sequenceNumber
        || left.id.localeCompare(right.id)
      ));
      return {
        movie: moviesById.get(movieId) as MovieRecord,
        firstRatedOn: rows[0].day,
        viewings: rows
      };
    })
    .sort((left, right) => (
      left.firstRatedOn.localeCompare(right.firstRatedOn)
      || left.movie.id.localeCompare(right.movie.id)
    ));
}

function groupByFirstRatingDay(titles: readonly RatedTitle[]): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const title of titles) {
    const current = groups[groups.length - 1];
    if (!current || current.day !== title.firstRatedOn) {
      groups.push({ day: title.firstRatedOn, titles: [title] });
    } else {
      current.titles.push(title);
    }
  }
  return groups;
}

function buildExpandingWindows(
  groups: readonly DateGroup[],
  options: Required<SpectroTemporalEvaluationOptions>
): Array<{ trainingGroupCount: number; testEndGroup: number }> {
  const windows: Array<{ trainingGroupCount: number; testEndGroup: number }> = [];
  let trainingGroupCount = 0;
  let trainingMovies = 0;

  while (
    trainingGroupCount < groups.length
    && trainingMovies < options.minimumTrainingMovies
  ) {
    trainingMovies += groups[trainingGroupCount].titles.length;
    trainingGroupCount += 1;
  }

  while (
    trainingGroupCount < groups.length
    && windows.length < options.maximumFolds
  ) {
    let testEndGroup = trainingGroupCount;
    let testMovies = 0;
    while (
      testEndGroup < groups.length
      && testMovies < options.testWindowMovies
    ) {
      testMovies += groups[testEndGroup].titles.length;
      testEndGroup += 1;
    }

    if (testMovies < options.minimumTestMovies) break;
    windows.push({ trainingGroupCount, testEndGroup });
    trainingGroupCount = testEndGroup;
  }

  return windows;
}

function evaluateFold(
  titlesByDate: readonly DateGroup[],
  window: { trainingGroupCount: number; testEndGroup: number },
  index: number,
  options: Required<SpectroTemporalEvaluationOptions>,
  metadataSnapshots: readonly SpectroMetadataSnapshot[]
): SpectroTemporalFold | null {
  const trainingGroups = titlesByDate.slice(0, window.trainingGroupCount);
  const testingGroups = titlesByDate.slice(
    window.trainingGroupCount,
    window.testEndGroup
  );
  const cutoffDay = testingGroups[0]?.day;
  const endExclusive = titlesByDate[window.testEndGroup]?.day;
  if (!cutoffDay || testingGroups.length === 0) return null;

  const allTrainingTitles = trainingGroups.flatMap((group) => group.titles);
  const allTestingTitles = testingGroups.flatMap((group) => group.titles);
  const knownMovie = (title: RatedTitle): MovieRecord | null => {
    const snapshot = selectSpectroMetadataSnapshot(
      metadataSnapshots,
      title.movie.id,
      cutoffDay
    );
    return snapshot ? applySpectroMetadataSnapshot(title.movie, snapshot) : null;
  };

  const historicalTraining = allTrainingTitles.flatMap((title) => {
    const movie = knownMovie(title);
    return movie ? [{ title, movie }] : [];
  });
  const historicalTesting = allTestingTitles.flatMap((title) => {
    const movie = knownMovie(title);
    return movie ? [{ title, movie }] : [];
  });
  const totalTitlesAtCut = allTrainingTitles.length + allTestingTitles.length;
  const metadataAvailable = historicalTraining.length + historicalTesting.length;
  const metadataExcludedMovieCount = totalTitlesAtCut - metadataAvailable;
  const metadataCoverage = totalTitlesAtCut > 0
    ? metadataAvailable / totalTitlesAtCut
    : 0;

  const training: SpectroPredictionTrainingMovie[] = [];
  for (const { title, movie } of historicalTraining) {
    const knownRatings = title.viewings
      .filter((viewing) => viewing.day < cutoffDay)
      .map((viewing) => viewing.rating);
    if (knownRatings.length > 0) {
      training.push({
        movie,
        rating: average(knownRatings)
      });
    }
  }

  const targets: EvaluationTarget[] = [];
  for (const { title, movie } of historicalTesting) {
    const futureRatings = title.viewings
      .filter((viewing) => (
        viewing.day >= cutoffDay
        && (endExclusive === undefined || viewing.day < endExclusive)
      ))
      .map((viewing) => viewing.rating);
    if (futureRatings.length > 0) {
      targets.push({
        id: title.movie.id,
        movie,
        rating: average(futureRatings)
      });
    }
  }

  if (
    training.length < options.minimumTrainingMovies
    || targets.length < options.minimumTestMovies
  ) return null;

  const trainingIds = new Set(training.map((item) => item.movie.id));
  if (targets.some((target) => trainingIds.has(target.id))) return null;

  const predictions = predictSpectroMovies(
    training,
    targets.map((target) => target.movie)
  );
  const personalMean = average(training.map((item) => item.rating));
  const personalMedian = median(training.map((item) => item.rating));
  const scored: ScoredTarget[] = [];

  for (const target of targets) {
    const prediction = predictions.get(target.id);
    if (!prediction || !Number.isFinite(prediction.predictedRating)) continue;
    scored.push({
      ...target,
      predictedRating: prediction.predictedRating,
      neighborRating: neighborWeightedRating(prediction.neighbors, personalMean)
    });
  }

  if (scored.length === 0) return null;

  const actual = scored.map((target) => target.rating);
  const rbf = errorMetrics(scored.map((target) => target.predictedRating), actual);
  const meanBaseline = errorMetrics(scored.map(() => personalMean), actual);
  const medianBaseline = errorMetrics(scored.map(() => personalMedian), actual);
  const neighborBaseline = errorMetrics(scored.map((target) => target.neighborRating), actual);
  const ranking = rankingMetrics(
    scored,
    options.relevantRatingThreshold,
    options.rankingCutoff
  );

  return {
    index,
    trainingMovieCount: training.length,
    testMovieCount: targets.length,
    predictionCoverage: scored.length / targets.length,
    metadataCoverage,
    metadataExcludedMovieCount,
    metrics: {
      mae: rbf.mae,
      rmse: rbf.rmse,
      meanBaselineMae: meanBaseline.mae,
      meanBaselineRmse: meanBaseline.rmse,
      medianBaselineMae: medianBaseline.mae,
      medianBaselineRmse: medianBaseline.rmse,
      neighborBaselineMae: neighborBaseline.mae,
      neighborBaselineRmse: neighborBaseline.rmse,
      ...ranking
    }
  };
}

/** El corte final conserva grupos de día completos y nunca parte revisionados. */
function buildFinalTestWindow(
  groups: readonly DateGroup[],
  requestedMovies: number
): { trainingGroupCount: number; testEndGroup: number } | null {
  let start = groups.length;
  let testMovies = 0;
  while (start > 0 && testMovies < requestedMovies) {
    start -= 1;
    testMovies += groups[start].titles.length;
  }
  return start > 0
    ? { trainingGroupCount: start, testEndGroup: groups.length }
    : null;
}

function effectiveMetadataSnapshots(
  movies: readonly MovieRecord[],
  provided: readonly SpectroMetadataSnapshot[]
): SpectroMetadataSnapshot[] {
  const snapshots = provided.filter(isSpectroMetadataSnapshot);
  const moviesWithRecordedHistory = new Set(snapshots.map((snapshot) => snapshot.movieId));
  for (const movie of movies) {
    // Una historia explícita (aunque solo tenga observaciones futuras) impide
    // usar el catálogo actual como fallback para ese título.
    if (moviesWithRecordedHistory.has(movie.id)) continue;
    const legacy = createSpectroMetadataSnapshot(
      movie,
      movie.updatedAt,
      "legacy-updated-at"
    );
    if (legacy) snapshots.push(legacy);
  }
  return snapshots;
}

function aggregateFolds(folds: readonly SpectroTemporalFold[]) {
  const aggregate: SpectroTemporalMetrics = {
    mae: average(folds.map((fold) => fold.metrics.mae)),
    rmse: average(folds.map((fold) => fold.metrics.rmse)),
    meanBaselineMae: average(folds.map((fold) => fold.metrics.meanBaselineMae)),
    meanBaselineRmse: average(folds.map((fold) => fold.metrics.meanBaselineRmse)),
    medianBaselineMae: average(folds.map((fold) => fold.metrics.medianBaselineMae)),
    medianBaselineRmse: average(folds.map((fold) => fold.metrics.medianBaselineRmse)),
    neighborBaselineMae: average(folds.map((fold) => fold.metrics.neighborBaselineMae)),
    neighborBaselineRmse: average(folds.map((fold) => fold.metrics.neighborBaselineRmse)),
    ndcgAtK: average(folds.map((fold) => fold.metrics.ndcgAtK)),
    precisionAtK: average(folds.map((fold) => fold.metrics.precisionAtK)),
    recallAtK: average(folds.map((fold) => fold.metrics.recallAtK)),
    hitRateAtK: average(folds.map((fold) => fold.metrics.hitRateAtK))
  };
  return {
    ...aggregate,
    rbfWinRateAgainstMeanBaseline: folds.filter(
      (fold) => fold.metrics.mae < fold.metrics.meanBaselineMae
    ).length / folds.length
  };
}

/**
 * Evalúa predicciones con ventanas cronológicas expansivas.
 *
 * Los revisionados se agrupan por película y solo se usan las calificaciones
 * conocidas antes del corte para entrenar. Cada título futuro aparece una vez
 * por ventana y no puede estar simultáneamente en entrenamiento y evaluación.
 * El reporte contiene métricas agregadas, nunca identificadores, títulos ni notas.
 *
 * Importante: MovieRecord no conserva la fecha de cada metadato. El protocolo
 * separa ratings temporalmente, pero usa la instantánea actual de metadatos;
 * por ello es un evaluador controlado, no una prueba prospectiva libre de fuga.
 */
export function evaluateSpectroTemporally(
  movies: readonly MovieRecord[],
  viewings: readonly Viewing[],
  requestedOptions: SpectroTemporalEvaluationOptions = {},
  providedMetadataSnapshots: readonly SpectroMetadataSnapshot[] = []
): SpectroTemporalEvaluationReport {
  const options = normalizeOptions(requestedOptions);
  const titles = groupRatedTitles(movies, viewings);
  const dateGroups = groupByFirstRatingDay(titles);
  const metadataSnapshots = effectiveMetadataSnapshots(movies, providedMetadataSnapshots);
  const insufficient = (
    reason: SpectroTemporalEvaluationReport["reason"]
  ): SpectroTemporalEvaluationReport => ({
    status: "insufficient-data",
    reason,
    uniqueRatedMovies: titles.length,
    foldCount: 0,
    options,
    metadataScope: "observed-before-cutoff",
    folds: [],
    finalTest: null,
    limitations: [...LIMITATIONS]
  });

  if (
    titles.length
    < options.minimumTrainingMovies + options.minimumTestMovies + options.finalTestMovies
  ) {
    return insufficient("not-enough-distinct-rated-movies");
  }

  const finalWindow = buildFinalTestWindow(dateGroups, options.finalTestMovies);
  if (!finalWindow) return insufficient("no-valid-final-test");

  const validationGroups = dateGroups.slice(0, finalWindow.trainingGroupCount);
  const validationWindows = buildExpandingWindows(validationGroups, options);
  if (validationWindows.length === 0) return insufficient("no-valid-temporal-windows");

  const cutoffs = [
    ...validationWindows.map((window) => validationGroups[window.trainingGroupCount]?.day)
      .filter((day): day is string => Boolean(day)),
    dateGroups[finalWindow.trainingGroupCount]?.day
  ].filter((day): day is string => Boolean(day));
  const hasAnyHistoricalMetadata = cutoffs.some((cutoff) => (
    dateGroups.some((group) => group.titles.some((title) => (
      selectSpectroMetadataSnapshot(metadataSnapshots, title.movie.id, cutoff) !== null
    )))
  ));
  if (!hasAnyHistoricalMetadata) {
    return insufficient("no-historical-metadata-before-cutoff");
  }

  const folds = validationWindows
    .map((window, index) => evaluateFold(
      validationGroups,
      window,
      index + 1,
      options,
      metadataSnapshots
    ))
    .filter((fold): fold is SpectroTemporalFold => fold !== null);

  if (folds.length === 0) return insufficient("no-valid-temporal-windows");

  const finalTest = evaluateFold(
    dateGroups,
    finalWindow,
    folds.length + 1,
    options,
    metadataSnapshots
  );
  if (!finalTest) return insufficient("no-valid-final-test");

  return {
    status: "evaluated",
    uniqueRatedMovies: titles.length,
    foldCount: folds.length,
    options,
    metadataScope: "observed-before-cutoff",
    folds,
    finalTest,
    aggregate: aggregateFolds(folds),
    limitations: [...LIMITATIONS]
  };
}
