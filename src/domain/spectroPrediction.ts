import type { MovieRecord } from "./types";

export interface SpectroPredictionTrainingMovie {
  movie: MovieRecord;
  rating: number;
}

export interface SpectroPredictionNeighbor {
  title: string;
  rating: number;
  similarity: number;
}

export interface SpectroMoviePrediction {
  predictedRating: number;
  neighbors: SpectroPredictionNeighbor[];
  maximumSimilarity: number;
  featureCount: number;
}

interface TextFeature {
  key: string;
  documentFrequency: number;
  totalFrequency: number;
  index: number;
  inverseDocumentFrequency: number;
}

interface PredictionVocabulary {
  structured: Map<string, number>;
  text: Map<string, TextFeature>;
  runtimeIndex: number | null;
  dimension: number;
}

type SparseVector = Map<number, number>;

const KERNEL_GAMMA = 0.5;
const RIDGE_REGULARIZATION = 0.25;
const MINIMUM_TEXT_DOCUMENT_FREQUENCY = 2;
const MAXIMUM_TEXT_FEATURES = 1200;
const MAXIMUM_NEIGHBORS = 3;
const STOPWORDS = new Set([
  "a", "al", "algo", "algunas", "algunos", "ante", "antes", "como", "con", "contra",
  "cual", "cuando", "de", "del", "desde", "donde", "durante", "e", "el", "ella",
  "ellas", "ello", "ellos", "en", "entre", "era", "es", "esa", "esas", "ese", "eso",
  "esos", "esta", "estaba", "estaban", "estas", "este", "esto", "estos", "fue",
  "fueron", "ha", "habia", "han", "hasta", "hay", "la", "las", "le", "les", "lo",
  "los", "mas", "me", "mi", "mis", "mientras", "muy", "no", "nos", "nuestra",
  "nuestro", "o", "para", "pero", "por", "porque", "que", "quien", "se", "sin",
  "sobre", "su", "sus", "tambien", "te", "tiene", "tienen", "todo", "tras", "tu",
  "tus", "un", "una", "uno", "unos", "unas", "y", "ya", "the", "and", "for",
  "from", "with", "into", "that", "this", "their", "they", "them", "when", "where",
  "who", "what", "which", "while", "after", "before", "over", "under", "about",
  "through", "his", "her", "its", "are", "was", "were", "has", "have", "had",
  "not", "but", "you", "your", "our", "out", "all", "any", "can", "will",
  "dans", "avec", "pour", "par", "une", "des", "les", "sur", "son", "ses",
  "est", "sont", "qui", "que", "aux", "leur", "leurs", "elle", "elles", "ils",
  "ont", "ete", "etre", "avoir", "mais", "pas", "plus", "apres", "avant"
]);

const normalizeText = (value: string): string => value
  .trim()
  .replace(/\s+/g, " ")
  .toLocaleLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");

const structuredFeatures = (movie: MovieRecord): Set<string> => {
  const features = new Set<string>();
  const add = (prefix: string, values: readonly string[] | undefined) => {
    for (const value of values ?? []) {
      const normalized = normalizeText(value);
      if (normalized) features.add(prefix + normalized);
    }
  };

  if (movie.genreIds?.length) {
    for (const id of movie.genreIds) {
      if (Number.isSafeInteger(id) && id > 0) features.add("genre:" + id);
    }
  } else {
    add("genre:", movie.genres);
  }

  add("country:", movie.countries);
  add("director:", movie.directors);
  add("cast:", movie.castMembers);
  add("keyword:", movie.keywords);

  if (movie.originalLanguage) {
    const language = normalizeText(movie.originalLanguage);
    if (language) features.add("language:" + language);
  }

  if (Number.isInteger(movie.releaseYear) && movie.releaseYear && movie.releaseYear >= 1880) {
    features.add("decade:" + Math.floor(movie.releaseYear / 10) * 10);
  }

  return features;
};

const overviewTerms = (overview: string | undefined): Map<string, number> => {
  const normalized = normalizeText(overview ?? "");
  const tokens = (normalized.match(/[\\p{L}\\p{N}_]{2,}/gu) ?? [])
    .filter((token) => !STOPWORDS.has(token));
  const terms = new Map<string, number>();

  for (const token of tokens) {
    const key = "term:" + token;
    terms.set(key, (terms.get(key) ?? 0) + 1);
  }
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const key = "phrase:" + tokens[index] + " " + tokens[index + 1];
    terms.set(key, (terms.get(key) ?? 0) + 1);
  }
  return terms;
};

function buildVocabulary(training: readonly SpectroPredictionTrainingMovie[]): PredictionVocabulary {
  const structured = new Map<string, number>();
  const documentFrequency = new Map<string, number>();
  const totalFrequency = new Map<string, number>();
  let hasRuntime = false;

  for (const item of training) {
    for (const key of structuredFeatures(item.movie)) {
      if (!structured.has(key)) structured.set(key, structured.size);
    }

    const runtime = item.movie.runtimeMinutes;
    if (Number.isFinite(runtime) && runtime !== undefined && runtime > 0) {
      hasRuntime = true;
    }

    for (const [key, count] of overviewTerms(item.movie.overview)) {
      documentFrequency.set(key, (documentFrequency.get(key) ?? 0) + 1);
      totalFrequency.set(key, (totalFrequency.get(key) ?? 0) + count);
    }
  }

  const selected = [...documentFrequency.entries()]
    .filter(([, frequency]) => frequency >= MINIMUM_TEXT_DOCUMENT_FREQUENCY)
    .sort((a, b) => (
      (totalFrequency.get(b[0]) ?? 0) - (totalFrequency.get(a[0]) ?? 0)
      || a[0].localeCompare(b[0])
    ))
    .slice(0, MAXIMUM_TEXT_FEATURES);

  const text = new Map<string, TextFeature>();
  let dimension = structured.size;
  for (const [key, frequency] of selected) {
    const idf = Math.log((training.length + 1) / (frequency + 1)) + 1;
    text.set(key, {
      key,
      documentFrequency: frequency,
      totalFrequency: totalFrequency.get(key) ?? 0,
      index: dimension,
      inverseDocumentFrequency: idf
    });
    dimension += 1;
  }

  const runtimeIndex = hasRuntime ? dimension++ : null;
  return { structured, text, runtimeIndex, dimension };
}

function normalizeChannel(vector: Map<number, number>): void {
  let squaredNorm = 0;
  for (const value of vector.values()) squaredNorm += value * value;
  if (squaredNorm === 0) return;
  const inverseNorm = 1 / Math.sqrt(squaredNorm);
  for (const [index, value] of vector) vector.set(index, value * inverseNorm);
}

function vectorize(movie: MovieRecord, vocabulary: PredictionVocabulary): SparseVector {
  const structured = new Map<number, number>();
  const text = new Map<number, number>();

  for (const key of structuredFeatures(movie)) {
    const index = vocabulary.structured.get(key);
    if (index !== undefined) structured.set(index, 1);
  }

  for (const [key, count] of overviewTerms(movie.overview)) {
    const feature = vocabulary.text.get(key);
    if (!feature) continue;
    const sublinearTermFrequency = 1 + Math.log(count);
    text.set(
      feature.index,
      sublinearTermFrequency * feature.inverseDocumentFrequency
    );
  }

  if (vocabulary.runtimeIndex !== null) {
    const runtime = movie.runtimeMinutes;
    if (Number.isFinite(runtime) && runtime !== undefined && runtime > 0) {
      structured.set(vocabulary.runtimeIndex, runtime / 180);
    }
  }

  // Equilibra metadatos estructurados y sinopsis. El reparto o una sinopsis larga
  // no ganan peso por aportar simplemente más elementos al vector.
  normalizeChannel(structured);
  normalizeChannel(text);
  const hasStructured = structured.size > 0;
  const hasText = text.size > 0;
  const channelWeight = hasStructured && hasText ? Math.SQRT1_2 : 1;
  const vector = new Map<number, number>();

  for (const [index, value] of structured) {
    vector.set(index, value * channelWeight);
  }
  for (const [index, value] of text) {
    vector.set(index, value * channelWeight);
  }

  return vector;
}

function cosineSimilarity(left: SparseVector, right: SparseVector): number {
  if (left.size === 0 || right.size === 0) return 0;
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  let dot = 0;
  for (const [index, value] of smaller) {
    dot += value * (larger.get(index) ?? 0);
  }
  return Math.max(0, Math.min(1, dot));
}

function rbfKernel(similarity: number, hasFeatures = true): number {
  if (!hasFeatures) return 0;
  const squaredDistance = Math.max(0, 2 - 2 * similarity);
  return Math.exp(-KERNEL_GAMMA * squaredDistance);
}

/**
 * Resuelve (K + λI)α = y usando Cholesky.
 * El kernel RBF es semidefinido positivo y λ > 0 estabiliza la diagonal.
 */
function solvePositiveDefinite(
  source: Float64Array,
  target: Float64Array,
  size: number
): Float64Array | null {
  const lower = new Float64Array(size * size);

  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column <= row; column += 1) {
      let value = source[row * size + column];
      for (let index = 0; index < column; index += 1) {
        value -= lower[row * size + index] * lower[column * size + index];
      }

      if (row === column) {
        if (!Number.isFinite(value) || value <= 1e-12) return null;
        lower[row * size + column] = Math.sqrt(value);
      } else {
        const diagonal = lower[column * size + column];
        if (!Number.isFinite(diagonal) || diagonal <= 0) return null;
        lower[row * size + column] = value / diagonal;
      }
    }
  }

  const intermediate = new Float64Array(size);
  for (let row = 0; row < size; row += 1) {
    let value = target[row];
    for (let column = 0; column < row; column += 1) {
      value -= lower[row * size + column] * intermediate[column];
    }
    intermediate[row] = value / lower[row * size + row];
  }

  const solution = new Float64Array(size);
  for (let row = size - 1; row >= 0; row -= 1) {
    let value = intermediate[row];
    for (let column = row + 1; column < size; column += 1) {
      value -= lower[column * size + row] * solution[column];
    }
    solution[row] = value / lower[row * size + row];
  }

  for (const value of solution) {
    if (!Number.isFinite(value)) return null;
  }
  return solution;
}

const mean = (values: readonly number[]): number => (
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
);

function nearestNeighbors(
  vector: SparseVector,
  training: readonly SpectroPredictionTrainingMovie[],
  trainingVectors: readonly SparseVector[]
): SpectroPredictionNeighbor[] {
  if (vector.size === 0) return [];
  return training
    .map((item, index) => ({
      title: item.movie.title,
      rating: item.rating,
      similarity: cosineSimilarity(vector, trainingVectors[index])
    }))
    .filter((item) => item.similarity > 0)
    .sort((a, b) => (
      b.similarity - a.similarity
      || b.rating - a.rating
      || a.title.localeCompare(b.title)
    ))
    .slice(0, MAXIMUM_NEIGHBORS)
    .map((item) => ({
      ...item,
      similarity: Math.round(item.similarity * 1000) / 1000
    }));
}

/**
 * Entrena un Kernel Ridge RBF con características estructuradas y TF-IDF local.
 *
 * El vocabulario se ajusta exclusivamente con películas calificadas. Los
 * candidatos no pueden introducir términos ni estadísticas de entrenamiento.
 */
export function predictSpectroMovies(
  trainingInput: readonly SpectroPredictionTrainingMovie[],
  candidates: readonly MovieRecord[]
): Map<string, SpectroMoviePrediction> {
  const ratingsByMovie = new Map<string, {
    movie: MovieRecord;
    ratings: number[];
  }>();
  for (const item of trainingInput) {
    if (!Number.isFinite(item.rating) || item.rating < 0 || item.rating > 10) continue;
    const existing = ratingsByMovie.get(item.movie.id) ?? {
      movie: item.movie,
      ratings: []
    };
    existing.ratings.push(item.rating);
    ratingsByMovie.set(item.movie.id, existing);
  }
  const training = [...ratingsByMovie.values()].map((item) => ({
    movie: item.movie,
    rating: item.ratings.reduce((sum, rating) => sum + rating, 0) / item.ratings.length
  }));

  const predictions = new Map<string, SpectroMoviePrediction>();
  if (training.length === 0) return predictions;

  const fallbackRating = mean(training.map((item) => item.rating));
  const vocabulary = buildVocabulary(training);
  const trainingVectors = training.map((item) => vectorize(item.movie, vocabulary));
  const size = training.length;
  const coefficients = size >= 3
    ? (() => {
      const matrix = new Float64Array(size * size);
      for (let row = 0; row < size; row += 1) {
        for (let column = 0; column <= row; column += 1) {
          const kernel = rbfKernel(
            cosineSimilarity(trainingVectors[row], trainingVectors[column]),
            trainingVectors[row].size > 0 && trainingVectors[column].size > 0
          );
          matrix[row * size + column] = kernel;
          matrix[column * size + row] = kernel;
        }
        matrix[row * size + row] += RIDGE_REGULARIZATION;
      }

      const centeredRatings = Float64Array.from(
        training,
        (item) => item.rating - fallbackRating
      );
      return solvePositiveDefinite(matrix, centeredRatings, size);
    })()
    : null;

  for (const movie of candidates) {
    const vector = vectorize(movie, vocabulary);
    const neighbors = nearestNeighbors(vector, training, trainingVectors);
    const maximumSimilarity = neighbors[0]?.similarity ?? 0;
    let predictedRating = fallbackRating;

    if (coefficients && vector.size > 0) {
      let adjustment = 0;
      for (let index = 0; index < size; index += 1) {
        const similarity = cosineSimilarity(vector, trainingVectors[index]);
        adjustment += rbfKernel(similarity, vector.size > 0 && trainingVectors[index].size > 0) * coefficients[index];
      }
      predictedRating = Math.max(1, Math.min(10, fallbackRating + adjustment));
    }

    predictions.set(movie.id, {
      predictedRating: Math.round(predictedRating * 100) / 100,
      neighbors,
      maximumSimilarity: Math.round(maximumSimilarity * 1000) / 1000,
      featureCount: vector.size
    });
  }

  return predictions;
}
