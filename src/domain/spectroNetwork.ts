import type { MovieRecord, Viewing } from "./types";
import type {
  SpectroAffinity,
  SpectroFavoriteSignal,
  SpectroRecommendation
} from "./spectro";

export type SpectroNetworkMovieState = "explored" | "unexplored";
export type SpectroNetworkNodeKind = "movie" | "genre" | "director" | "actor" | "theme";
export type SpectroNetworkPolarity = "positive" | "negative" | "explicit" | "neutral";

export interface SpectroNetworkNode {
  id: string;
  kind: SpectroNetworkNodeKind;
  label: string;
  detail: string;
  x: number;
  y: number;
  influence: number;
  connections: number;
  exploredConnections: number;
  recommendationCount: number;
  movieId?: string;
  tmdbId?: number;
  state?: SpectroNetworkMovieState;
  rating?: number;
  fitPercentage?: number;
  predictedRating?: number;
  favorite?: boolean;
  posterPath?: string;
  releaseYear?: number;
  clusterId?: string;
}

export interface SpectroNetworkEdge {
  id: string;
  source: string;
  target: string;
  strength: number;
  polarity: SpectroNetworkPolarity;
  value: number;
  category: SpectroNetworkNodeKind;
}

export interface SpectroNetworkCluster {
  id: string;
  label: string;
  movieIds: string[];
  x: number;
  y: number;
  radius: number;
  similarity: number;
  exploredCount: number;
  unexploredCount: number;
}

export interface SpectroNetworkGraph {
  width: number;
  height: number;
  nodes: SpectroNetworkNode[];
  edges: SpectroNetworkEdge[];
  clusters: SpectroNetworkCluster[];
  stats: {
    movies: number;
    explored: number;
    unexplored: number;
    features: number;
    themes: number;
    connections: number;
    clusters: number;
  };
}

export interface SpectroNetworkInput {
  movies: MovieRecord[];
  viewings: Viewing[];
  favoriteMovieIds: string[];
  affinities: SpectroAffinity[];
  favoriteSignals: SpectroFavoriteSignal[];
  recommendations: SpectroRecommendation[];
}

interface MovieFeature {
  key: string;
  label: string;
  kind: Exclude<SpectroNetworkNodeKind, "movie">;
  weight: number;
}

interface MovieFeatures {
  genres: Set<string>;
  directors: Set<string>;
  actors: Set<string>;
  themes: Set<string>;
  all: MovieFeature[];
}

interface FeatureRecord {
  key: string;
  label: string;
  kind: Exclude<SpectroNetworkNodeKind, "movie">;
  weight: number;
  movieIndexes: number[];
}

interface PairOverlap {
  left: number;
  right: number;
  shared: number;
  familyCounts: [number, number, number, number];
}

interface CandidatePair {
  left: number;
  right: number;
  similarity: number;
}

const FAMILY_WEIGHTS = {
  genre: 0.3,
  director: 0.2,
  actor: 0.18,
  theme: 0.32
} as const;

const FAMILY_ORDER = ["genre", "director", "actor", "theme"] as const;
const MAX_SIMILAR_CLUSTER_SIZE = 24;
const MIN_CLUSTER_SIMILARITY = 0.31;

const GENRE_IDS_BY_NAME = new Map([
  ["acción", 28], ["aventura", 12], ["animación", 16], ["comedia", 35],
  ["crimen", 80], ["documental", 99], ["drama", 18], ["familia", 10751],
  ["fantasía", 14], ["historia", 36], ["terror", 27], ["música", 10402],
  ["misterio", 9648], ["romance", 10749], ["ciencia ficción", 878],
  ["película de tv", 10770], ["suspenso", 53], ["bélica", 10752], ["western", 37]
]);

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function textFeatures(
  values: string[] | undefined,
  kind: Exclude<SpectroNetworkNodeKind, "movie">,
  prefix: string,
  weight: number,
  maximum = 12
): MovieFeature[] {
  const unique = new Map<string, MovieFeature>();
  for (const raw of (values ?? []).slice(0, maximum)) {
    const label = raw.trim().replace(/\s+/g, " ");
    const normalized = normalize(label);
    if (!normalized) continue;
    const key = prefix + normalized;
    if (!unique.has(key)) unique.set(key, { key, label, kind, weight });
  }
  return [...unique.values()];
}

function genreFeatures(movie: MovieRecord): MovieFeature[] {
  if (movie.genreIds?.length) {
    const unique = [...new Set(movie.genreIds)]
      .filter((id) => Number.isSafeInteger(id) && id > 0);
    return unique.map((id) => ({
      key: "genre:" + id,
      label: movie.genres.find((name, index) => movie.genreIds?.[index] === id) ?? "Género " + id,
      kind: "genre",
      weight: FAMILY_WEIGHTS.genre
    }));
  }

  return textFeatures(movie.genres, "genre", "genre-name:", FAMILY_WEIGHTS.genre, 8)
    .map((feature) => ({
      ...feature,
      key: GENRE_IDS_BY_NAME.has(normalize(feature.label))
        ? "genre:" + GENRE_IDS_BY_NAME.get(normalize(feature.label))
        : feature.key
    }));
}

function featuresForMovie(movie: MovieRecord): MovieFeatures {
  const genres = genreFeatures(movie);
  const directors = textFeatures(movie.directors, "director", "director:", FAMILY_WEIGHTS.director, 5);
  const actors = textFeatures(movie.castMembers, "actor", "cast:", FAMILY_WEIGHTS.actor, 12);
  const themes = textFeatures(movie.keywords, "theme", "theme:", FAMILY_WEIGHTS.theme, 12);
  const all = [...genres, ...directors, ...actors, ...themes];
  return {
    genres: new Set(genres.map((item) => item.key)),
    directors: new Set(directors.map((item) => item.key)),
    actors: new Set(actors.map((item) => item.key)),
    themes: new Set(themes.map((item) => item.key)),
    all
  };
}

class UnionFind {
  private readonly parent: number[];
  private readonly sizes: number[];

  constructor(length: number) {
    this.parent = Array.from({ length }, (_, index) => index);
    this.sizes = Array.from({ length }, () => 1);
  }

  find(value: number): number {
    let root = value;
    while (this.parent[root] !== root) root = this.parent[root];
    let current = value;
    while (this.parent[current] !== current) {
      const next = this.parent[current];
      this.parent[current] = root;
      current = next;
    }
    return root;
  }

  union(left: number, right: number, maximumSize: number): boolean {
    let a = this.find(left);
    let b = this.find(right);
    if (a === b) return true;
    if (this.sizes[a] + this.sizes[b] > maximumSize) return false;
    if (this.sizes[a] < this.sizes[b]) [a, b] = [b, a];
    this.parent[b] = a;
    this.sizes[a] += this.sizes[b];
    return true;
  }
}

function pairKey(left: number, right: number): string {
  return left < right ? left + ":" + right : right + ":" + left;
}

function movieSimilarity(
  overlap: PairOverlap,
  left: MovieFeatures,
  right: MovieFeatures
): number {
  const setsLeft = [left.genres, left.directors, left.actors, left.themes];
  const setsRight = [right.genres, right.directors, right.actors, right.themes];
  return FAMILY_ORDER.reduce((total, family, index) => {
    const intersection = overlap.familyCounts[index];
    const union = setsLeft[index].size + setsRight[index].size - intersection;
    const jaccard = union > 0 ? intersection / union : 0;
    return total + FAMILY_WEIGHTS[family] * jaccard;
  }, 0);
}

function collectSimilarPairs(
  features: MovieFeatures[],
  featureRecords: Map<string, FeatureRecord>
): CandidatePair[] {
  const overlaps = new Map<string, PairOverlap>();

  for (const feature of featureRecords.values()) {
    const familyIndex = FAMILY_ORDER.indexOf(feature.kind as typeof FAMILY_ORDER[number]);
    const movieIndexes = feature.movieIndexes;
    for (let leftIndex = 0; leftIndex < movieIndexes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < movieIndexes.length; rightIndex += 1) {
        const left = movieIndexes[leftIndex];
        const right = movieIndexes[rightIndex];
        const key = pairKey(left, right);
        const overlap = overlaps.get(key) ?? {
          left: Math.min(left, right),
          right: Math.max(left, right),
          shared: 0,
          familyCounts: [0, 0, 0, 0]
        };
        overlap.shared += 1;
        overlap.familyCounts[familyIndex] += 1;
        overlaps.set(key, overlap);
      }
    }
  }

  const pairs: CandidatePair[] = [];
  for (const overlap of overlaps.values()) {
    const similarity = movieSimilarity(
      overlap,
      features[overlap.left],
      features[overlap.right]
    );
    const connected = (
      similarity >= MIN_CLUSTER_SIMILARITY && overlap.shared >= 2
    ) || (
      similarity >= 0.55 && overlap.shared >= 1
    );
    if (connected) {
      pairs.push({ left: overlap.left, right: overlap.right, similarity });
    }
  }
  return pairs.sort((a, b) => b.similarity - a.similarity || a.left - b.left || a.right - b.right);
}

function shortClusterLabel(
  movieIndexes: number[],
  movies: MovieRecord[],
  features: MovieFeatures[]
): string {
  const counts = new Map<string, { label: string; kind: string; count: number; weight: number }>();
  for (const index of movieIndexes) {
    for (const feature of features[index].all) {
      const current = counts.get(feature.key) ?? {
        label: feature.label,
        kind: feature.kind,
        count: 0,
        weight: feature.weight
      };
      current.count += 1;
      counts.set(feature.key, current);
    }
  }
  const shared = [...counts.values()]
    .filter((item) => item.count >= 2)
    .sort((a, b) => (
      b.count * b.weight - a.count * a.weight
      || a.kind.localeCompare(b.kind)
      || a.label.localeCompare(b.label)
    ))
    .slice(0, 2)
    .map((item) => item.label);
  if (shared.length) return shared.join(" · ");
  return movieIndexes.length === 1
    ? "Sin grupo similar"
    : movies[movieIndexes[0]]?.title ?? "Grupo cinematográfico";
}

function buildClusters(
  movies: MovieRecord[],
  movieFeatures: MovieFeatures[],
  featureRecords: Map<string, FeatureRecord>
): SpectroNetworkCluster[] {
  if (!movies.length) return [];

  const pairs = collectSimilarPairs(movieFeatures, featureRecords);
  const unionFind = new UnionFind(movies.length);
  const acceptedPairs: CandidatePair[] = [];
  for (const pair of pairs) {
    if (unionFind.union(pair.left, pair.right, MAX_SIMILAR_CLUSTER_SIZE)) {
      acceptedPairs.push(pair);
    }
  }

  const components = new Map<number, number[]>();
  for (let index = 0; index < movies.length; index += 1) {
    const root = unionFind.find(index);
    const members = components.get(root) ?? [];
    members.push(index);
    components.set(root, members);
  }

  const groups = [...components.values()].filter((members) => members.length >= 2);
  const isolated = [...components.values()].filter((members) => members.length === 1).flat();
  const ordered = [
    ...groups.map((members) => ({
      members,
      similarity: mean(acceptedPairs
        .filter((pair) => members.includes(pair.left) && members.includes(pair.right))
        .map((pair) => pair.similarity))
    })).sort((a, b) => b.members.length - a.members.length),
    ...(isolated.length ? [{ members: isolated, similarity: 0 }] : [])
  ];

  const cellSize = 380;
  const margin = 55;
  const columns = Math.max(1, Math.ceil(Math.sqrt(ordered.length)));
  const rows = Math.ceil(ordered.length / columns);
  const clusters: SpectroNetworkCluster[] = [];

  ordered.forEach((group, clusterIndex) => {
    const members = [...group.members].sort((a, b) => (
      movies[a].title.localeCompare(movies[b].title) || movies[a].id.localeCompare(movies[b].id)
    ));
    const row = Math.floor(clusterIndex / columns);
    const column = clusterIndex % columns;
    const x = margin + column * cellSize + cellSize / 2;
    const y = margin + row * cellSize + cellSize / 2;
    const isIsolatedZone = group.similarity === 0 && members.length > 1;
    const radius = isIsolatedZone
      ? Math.min(222, 35 + Math.sqrt(members.length) * 19)
      : Math.min(145, 28 + Math.sqrt(members.length) * 22);

    clusters.push({
      id: isIsolatedZone
        ? "cluster:unconnected"
        : "cluster:" + movies[members[0]]?.id,
      label: isIsolatedZone
        ? "Sin conexiones similares suficientes"
        : shortClusterLabel(members, movies, movieFeatures),
      movieIds: members.map((index) => movies[index].id),
      x,
      y,
      radius,
      similarity: round(group.similarity),
      exploredCount: 0,
      unexploredCount: members.length
    });
  });

  return clusters;
}

function featureNodeId(key: string): string {
  return "feature:" + key;
}

export function buildSpectroNetworkGraph(input: SpectroNetworkInput): SpectroNetworkGraph {
  const movies = [...input.movies].sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  const viewingsByMovie = new Map<string, number[]>();
  const viewedIds = new Set<string>();
  for (const viewing of input.viewings) {
    viewedIds.add(viewing.movieId);
    if (viewing.rating === undefined) continue;
    const ratings = viewingsByMovie.get(viewing.movieId) ?? [];
    ratings.push(viewing.rating);
    viewingsByMovie.set(viewing.movieId, ratings);
  }

  const movieFeatures = movies.map(featuresForMovie);
  const movieIndexById = new Map(movies.map((movie, index) => [movie.id, index]));
  const featureRecords = new Map<string, FeatureRecord>();
  movieFeatures.forEach((features, movieIndex) => {
    for (const feature of features.all) {
      const current = featureRecords.get(feature.key) ?? {
        key: feature.key,
        label: feature.label,
        kind: feature.kind,
        weight: feature.weight,
        movieIndexes: []
      };
      current.movieIndexes.push(movieIndex);
      featureRecords.set(feature.key, current);
    }
  });

  const affinities = new Map(input.affinities.map((item) => [item.key, item]));
  const favoriteSignals = new Map(input.favoriteSignals.map((item) => [item.key, item]));
  const recommendationsByMovie = new Map(input.recommendations.map((item) => [item.movie.id, item]));
  const recommendationIdsByFeature = new Map<string, Set<string>>();
  for (const recommendation of input.recommendations) {
    for (const reason of recommendation.reasons) {
      const related = recommendationIdsByFeature.get(reason.key) ?? new Set<string>();
      related.add(recommendation.movie.id);
      recommendationIdsByFeature.set(reason.key, related);
    }
  }

  const clusters = buildClusters(movies, movieFeatures, featureRecords);
  const clusterByMovie = new Map<string, SpectroNetworkCluster>();
  const moviePositions = new Map<string, { x: number; y: number }>();
  for (const cluster of clusters) {
    const members = cluster.movieIds
      .map((movieId) => movieIndexById.get(movieId))
      .filter((index): index is number => index !== undefined);
    members.forEach((movieIndex, index) => {
      const movie = movies[movieIndex];
      clusterByMovie.set(movie.id, cluster);
      const angle = index * 2.399963229728653;
      const radius = members.length === 1
        ? 0
        : Math.min(cluster.radius * 0.72, 12 + Math.sqrt(index + 1) * 20);
      moviePositions.set(movie.id, {
        x: cluster.x + Math.cos(angle) * radius,
        y: cluster.y + Math.sin(angle) * radius
      });
    });
  }

  const movieEdges: SpectroNetworkEdge[] = [];
  const movieRawInfluence = new Map<string, number>();
  const featureRawInfluence = new Map<string, number>();
  const featureExploredCount = new Map<string, number>();
  const featurePositions = new Map<string, { x: number; y: number; count: number }>();
  const movieRecommendationReach = new Map<string, number>();

  movies.forEach((movie, movieIndex) => {
    const movieId = "movie:" + movie.id;
    const recommendation = recommendationsByMovie.get(movie.id);
    const reasonsByKey = new Map(recommendation?.reasons.map((reason) => [reason.key, reason]) ?? []);
    const position = moviePositions.get(movie.id) ?? { x: 0, y: 0 };
    const isExplored = viewedIds.has(movie.id);
    const recommendationReach = new Set<string>();

    for (const feature of movieFeatures[movieIndex].all) {
      const affinity = affinities.get(feature.key);
      const favorite = favoriteSignals.get(feature.key);
      const reason = reasonsByKey.get(feature.key);
      let strength = 0.13;
      let polarity: SpectroNetworkPolarity = "neutral";
      let value = 0;

      if (reason) {
        strength = clamp(0.22 + Math.abs(reason.contribution) * 0.95, 0.2, 1);
        polarity = reason.source === "favoritos"
          ? "explicit"
          : reason.contribution > 0.02 ? "positive" : reason.contribution < -0.02 ? "negative" : "neutral";
        value = reason.contribution;
      } else if (affinity) {
        const lift = Math.abs(affinity.adjustedDifference) / 4;
        const support = Math.min(1, affinity.sampleSize / 6);
        strength = clamp(0.13 + lift * 0.55 + support * 0.26, 0.12, 0.94);
        polarity = affinity.adjustedDifference > 0.05
          ? "positive"
          : affinity.adjustedDifference < -0.05 ? "negative" : "neutral";
        value = affinity.adjustedDifference;
      } else if (favorite) {
        strength = 0.58;
        polarity = "explicit";
        value = 0.35;
      }

      const featureId = featureNodeId(feature.key);
      const edgeId = movieId + "->" + featureId;
      movieEdges.push({
        id: edgeId,
        source: movieId,
        target: featureId,
        strength: round(strength),
        polarity,
        value: round(value),
        category: feature.kind
      });

      movieRawInfluence.set(
        movie.id,
        (movieRawInfluence.get(movie.id) ?? 0) + strength * feature.weight
      );
      featureRawInfluence.set(
        feature.key,
        (featureRawInfluence.get(feature.key) ?? 0) + strength * feature.weight
      );
      if (isExplored) {
        featureExploredCount.set(
          feature.key,
          (featureExploredCount.get(feature.key) ?? 0) + 1
        );
      }

      const featurePosition = featurePositions.get(feature.key) ?? { x: 0, y: 0, count: 0 };
      featurePosition.x += position.x;
      featurePosition.y += position.y;
      featurePosition.count += 1;
      featurePositions.set(feature.key, featurePosition);

      for (const recommendationId of recommendationIdsByFeature.get(feature.key) ?? []) {
        recommendationReach.add(recommendationId);
      }
    }

    movieRecommendationReach.set(movie.id, recommendationReach.size);
    movieRawInfluence.set(
      movie.id,
      (movieRawInfluence.get(movie.id) ?? 0) + recommendationReach.size * 0.12
    );
  });

  const maxMovieInfluence = Math.max(0, ...movieRawInfluence.values());
  const maxFeatureInfluence = Math.max(0, ...featureRawInfluence.values());
  const favoriteMovieIdSet = new Set(input.favoriteMovieIds);
  const movieNodes: SpectroNetworkNode[] = movies.map((movie, movieIndex) => {
    const id = "movie:" + movie.id;
    const averageRating = viewingsByMovie.get(movie.id);
    const rating = averageRating?.length
      ? averageRating.reduce((sum, value) => sum + value, 0) / averageRating.length
      : undefined;
    const recommendation = recommendationsByMovie.get(movie.id);
    const influence = maxMovieInfluence > 0
      ? clamp((movieRawInfluence.get(movie.id) ?? 0) / maxMovieInfluence, 0.06, 1)
      : 0.08;
    const cluster = clusterByMovie.get(movie.id);
    const connectionCount = movieFeatures[movieIndex].all.length;
    const reach = movieRecommendationReach.get(movie.id) ?? 0;
    const state: SpectroNetworkMovieState = viewedIds.has(movie.id) ? "explored" : "unexplored";
    const status = state === "explored" ? "Explorada" : "Por explorar";
    const detail = [
      status,
      rating === undefined ? "Sin calificación" : "Tu nota " + round(rating).toFixed(1) + "/10",
      recommendation ? "Encaje " + recommendation.fitPercentage + "%" : "",
      reach ? "Conecta con " + reach + " recomendaciones" : connectionCount + " conexiones"
    ].filter(Boolean).join(" · ");

    return {
      id,
      kind: "movie",
      label: movie.title,
      detail,
      x: moviePositions.get(movie.id)?.x ?? 0,
      y: moviePositions.get(movie.id)?.y ?? 0,
      influence: round(influence),
      connections: connectionCount,
      exploredConnections: state === "explored" ? connectionCount : 0,
      recommendationCount: reach,
      movieId: movie.id,
      tmdbId: movie.tmdbId,
      state,
      rating: rating === undefined ? undefined : round(rating),
      fitPercentage: recommendation?.fitPercentage,
      predictedRating: recommendation?.predictedRating,
      favorite: favoriteMovieIdSet.has(movie.id),
      posterPath: movie.posterPath,
      releaseYear: movie.releaseYear,
      clusterId: cluster?.id
    };
  });

  const featureNodes: SpectroNetworkNode[] = [...featureRecords.values()].map((feature) => {
    const position = featurePositions.get(feature.key);
    const count = position?.count ?? 0;
    const angle = (feature.key.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360) * Math.PI / 180;
    const offset = 34 + Math.min(20, Math.sqrt(count) * 4);
    const x = count ? position!.x / count + Math.cos(angle) * offset : 0;
    const y = count ? position!.y / count + Math.sin(angle) * offset : 0;
    const connectedMovies = feature.movieIndexes.length;
    const exploredConnections = featureExploredCount.get(feature.key) ?? 0;
    const recommendationCount = recommendationIdsByFeature.get(feature.key)?.size ?? 0;
    const influence = maxFeatureInfluence > 0
      ? clamp((featureRawInfluence.get(feature.key) ?? 0) / maxFeatureInfluence, 0.05, 1)
      : 0.05;
    const kindLabel = feature.kind === "genre" ? "Género"
      : feature.kind === "director" ? "Director"
        : feature.kind === "actor" ? "Actor" : "Tema";
    const detail = [
      kindLabel,
      connectedMovies + (connectedMovies === 1 ? " película" : " películas"),
      recommendationCount
        ? recommendationCount + (recommendationCount === 1 ? " recomendación" : " recomendaciones")
        : "Sin impacto directo en recomendaciones todavía"
    ].join(" · ");
    return {
      id: featureNodeId(feature.key),
      kind: feature.kind,
      label: feature.label,
      detail,
      x,
      y,
      influence: round(influence),
      connections: connectedMovies,
      exploredConnections,
      recommendationCount
    };
  });

  const clusterCounted = clusters.map((cluster) => {
    const exploredCount = cluster.movieIds.filter((movieId) => viewedIds.has(movieId)).length;
    return {
      ...cluster,
      exploredCount,
      unexploredCount: cluster.movieIds.length - exploredCount
    };
  });
  const maxX = Math.max(900, ...movieNodes.map((node) => node.x), ...featureNodes.map((node) => node.x));
  const maxY = Math.max(640, ...movieNodes.map((node) => node.y), ...featureNodes.map((node) => node.y));
  const width = Math.ceil(maxX + 100);
  const height = Math.ceil(maxY + 100);

  return {
    width,
    height,
    nodes: [...movieNodes, ...featureNodes],
    edges: movieEdges,
    clusters: clusterCounted,
    stats: {
      movies: movies.length,
      explored: movieNodes.filter((node) => node.state === "explored").length,
      unexplored: movieNodes.filter((node) => node.state === "unexplored").length,
      features: featureNodes.length,
      themes: featureNodes.filter((node) => node.kind === "theme").length,
      connections: movieEdges.length,
      clusters: clusterCounted.filter((cluster) => cluster.similarity > 0).length
    }
  };
}
