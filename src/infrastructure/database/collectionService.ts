import type { Collection, CollectionMovie, MovieRecord } from "../../domain/types";
import { prismaDb } from "./database";

export interface CollectionSummary {
  collection: Collection;
  movieCount: number;
}

export async function getCollections(): Promise<Collection[]> {
  return prismaDb.collections.orderBy("updatedAt").reverse().toArray();
}

export async function getCollectionSummaries(): Promise<CollectionSummary[]> {
  const collections = await getCollections();
  return Promise.all(collections.map(async (collection) => ({
    collection,
    movieCount: await prismaDb.collectionMovies.where("collectionId").equals(collection.id).count()
  })));
}

export async function getMovieCollectionIds(movieId: string): Promise<string[]> {
  const memberships = await prismaDb.collectionMovies.where("movieId").equals(movieId).toArray();
  return memberships.map((membership) => membership.collectionId);
}

export async function getCollectionMovies(collectionId: string): Promise<MovieRecord[]> {
  const memberships = await prismaDb.collectionMovies
    .where("collectionId")
    .equals(collectionId)
    .sortBy("position");
  const movies = await prismaDb.movies.bulkGet(memberships.map((membership) => membership.movieId));
  return movies.filter((movie): movie is MovieRecord => Boolean(movie));
}

export async function createCollection(name: string): Promise<Collection> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Escribe un nombre para la colección.");
  if (normalizedName.length > 60) throw new Error("El nombre no puede superar los 60 caracteres.");

  const existing = await prismaDb.collections.toArray();
  if (existing.some((collection) => collection.name.toLocaleLowerCase() === normalizedName.toLocaleLowerCase())) {
    throw new Error("Ya existe una colección con ese nombre.");
  }

  const now = new Date().toISOString();
  const collection: Collection = {
    id: crypto.randomUUID(),
    name: normalizedName,
    createdAt: now,
    updatedAt: now
  };
  await prismaDb.collections.add(collection);
  return collection;
}

export async function addMovieToCollection(collectionId: string, movieId: string): Promise<void> {
  await prismaDb.transaction("rw", prismaDb.collections, prismaDb.collectionMovies, prismaDb.movies, async () => {
    const collection = await prismaDb.collections.get(collectionId);
    if (!collection) throw new Error("No se encontró la colección.");
    const movie = await prismaDb.movies.get(movieId);
    if (!movie) throw new Error("No se encontró la película en el catálogo local.");

    const existing = await prismaDb.collectionMovies
      .where("[collectionId+movieId]")
      .equals([collectionId, movieId])
      .first();
    if (existing) return;

    const memberships = await prismaDb.collectionMovies.where("collectionId").equals(collectionId).toArray();
    const nextPosition = memberships.reduce((maximum, item) => Math.max(maximum, item.position), -1) + 1;
    const membership: CollectionMovie = {
      id: crypto.randomUUID(),
      collectionId,
      movieId,
      position: nextPosition,
      addedAt: new Date().toISOString()
    };
    await prismaDb.collectionMovies.add(membership);
    await prismaDb.collections.update(collectionId, {
      coverMovieId: collection.coverMovieId ?? movieId,
      updatedAt: new Date().toISOString()
    });
  });
}

export async function removeMovieFromCollection(collectionId: string, movieId: string): Promise<void> {
  await prismaDb.transaction("rw", prismaDb.collections, prismaDb.collectionMovies, async () => {
    const membership = await prismaDb.collectionMovies
      .where("[collectionId+movieId]")
      .equals([collectionId, movieId])
      .first();
    if (!membership) return;

    await prismaDb.collectionMovies.delete(membership.id);
    const collection = await prismaDb.collections.get(collectionId);
    if (!collection) return;

    const remaining = await prismaDb.collectionMovies
      .where("collectionId")
      .equals(collectionId)
      .sortBy("position");
    await prismaDb.collections.update(collectionId, {
      coverMovieId: collection.coverMovieId === movieId ? remaining[0]?.movieId : collection.coverMovieId,
      updatedAt: new Date().toISOString()
    });
  });
}

export async function deleteCollection(collectionId: string): Promise<void> {
  await prismaDb.transaction("rw", prismaDb.collections, prismaDb.collectionMovies, async () => {
    await prismaDb.collectionMovies.where("collectionId").equals(collectionId).delete();
    await prismaDb.collections.delete(collectionId);
  });
}
