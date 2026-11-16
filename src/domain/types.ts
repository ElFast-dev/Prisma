export type LibraryStatus = "watched" | "pending";

export interface MovieRecord {
  id: string;
  tmdbId: number;
  title: string;
  originalTitle?: string;
  overview?: string;
  releaseDate?: string;
  releaseYear?: number;
  runtimeMinutes?: number;
  voteAverage?: number;
  status?: string;
  genres: string[];
  genreIds?: number[];
  countries: string[];
  directors?: string[];
  castMembers?: string[];
  originalLanguage?: string;
  posterPath?: string;
  backdropPath?: string;
  lastViewingSequence: number;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryEntry {
  movieId: string;
  status: LibraryStatus;
  isFavorite: boolean;
  addedAt: string;
  updatedAt: string;
}

export interface Viewing {
  id: string;
  movieId: string;
  sequenceNumber: number;
  watchedOn: string;
  watchedAtLocalTime?: string;
  timeZone?: string;
  rating: number;
  review?: string;
  createdAt: string;
  updatedAt: string;
  operationId: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  coverMovieId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionMovie {
  id: string;
  collectionId: string;
  movieId: string;
  position: number;
  addedAt: string;
}

export interface LocalProfile {
  id: "local";
  name?: string;
  avatarDataUrl?: string;
  description?: string;
  personalPhrase?: string;
  updatedAt: string;
}

export type LibrarySort =
  | "title"
  | "rating"
  | "my-rating"
  | "runtime"
  | "release-date"
  | "added"
  | "random";

export type LibrarySortDirection = "asc" | "desc";

export interface LibraryBrowsePreferences {
  status: "all" | "watched" | "pending" | "favorites";
  releaseStatus: "all" | "upcoming" | "released";
  query: string;
  genre: string;
  yearFrom: string;
  yearTo: string;
  sort: LibrarySort;
  sortDirection: LibrarySortDirection;
  shuffleSeed: number;
}

export interface UserPreferences {
  id: "local";
  theme: "dark";
  reducedMotion: boolean;
  language: "es";
  region: string;
  libraryView: "grid" | "list";
  /** Filtros activos de Biblioteca, separados de la presentación y los ajustes generales. */
  libraryFilters?: LibraryBrowsePreferences;
  updatedAt: string;
}

export interface CatalogCacheEntry {
  cacheKey: string;
  resourceType: string;
  payload: unknown;
  fetchedAt: string;
  lastValidatedAt?: string;
}

export interface AvailabilityCacheEntry {
  id: string;
  movieId: string;
  region: string;
  providers: unknown;
  tmdbLink?: string;
  lastFetchedAt: string;
}

export interface PeopleCacheEntry {
  tmdbPersonId: number;
  name: string;
  biography?: string;
  profilePath?: string;
  knownFor?: unknown;
  fetchedAt: string;
}

export interface SpectroSnapshot {
  id: string;
  algorithmVersion: string;
  inputFingerprint: string;
  computedAt: string;
  analysisPayload: unknown;
}

export interface AppMetadata {
  key: string;
  value: string;
}
