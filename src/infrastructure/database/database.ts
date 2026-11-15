import Dexie, { type Table } from "dexie";
import type {
  AppMetadata,
  AvailabilityCacheEntry,
  CatalogCacheEntry,
  Collection,
  CollectionMovie,
  LibraryEntry,
  LocalProfile,
  MovieRecord,
  PeopleCacheEntry,
  SpectroSnapshot,
  UserPreferences,
  Viewing
} from "../../domain/types";

export class PrismaDatabase extends Dexie {
  movies!: Table<MovieRecord, string>;
  libraryEntries!: Table<LibraryEntry, string>;
  viewings!: Table<Viewing, string>;
  collections!: Table<Collection, string>;
  collectionMovies!: Table<CollectionMovie, string>;
  profile!: Table<LocalProfile, string>;
  preferences!: Table<UserPreferences, string>;
  catalogCache!: Table<CatalogCacheEntry, string>;
  availabilityCache!: Table<AvailabilityCacheEntry, string>;
  peopleCache!: Table<PeopleCacheEntry, number>;
  spectroSnapshots!: Table<SpectroSnapshot, string>;
  appMetadata!: Table<AppMetadata, string>;

  constructor() {
    super("prisma_database");

    this.version(1).stores({
      movies: "id,&tmdbId,title,releaseYear,updatedAt",
      libraryEntries: "&movieId,status,isFavorite,addedAt,updatedAt",
      viewings: "id,&[movieId+sequenceNumber],&operationId,movieId,watchedOn,createdAt",
      collections: "id,name,createdAt,updatedAt",
      collectionMovies: "id,&[collectionId+movieId],collectionId,movieId,position",
      profile: "&id",
      preferences: "&id",
      catalogCache: "&cacheKey,resourceType,fetchedAt",
      availabilityCache: "id,&[movieId+region],movieId,region,lastFetchedAt",
      peopleCache: "&tmdbPersonId,name,fetchedAt",
      spectroSnapshots: "id,algorithmVersion,computedAt,inputFingerprint",
      appMetadata: "&key"
    });
  }
}

export const prismaDb = new PrismaDatabase();
