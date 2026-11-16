import type { Collection, CollectionMovie, MovieRecord } from "../../domain/types";
import { prismaDb } from "./database";

export interface CollectionSummary {
  collection: Collection;
  movieCount: number;
  coverMovie?: MovieRecord;
}

export interface CollectionUpdateInput {
  name?: string;
  description?: string;
  /** null quita la portada elegida y usa la primera película de la selección. */
  coverMovieId?: string | null;
}

export async function getCollections(): Promise<Collection[]> {
  return prismaDb.collections.orderBy("updatedAt").reverse().toArray();
}

export async function getCollectionSummaries(): Promise<CollectionSummary[]> {
  const collections = await getCollections();
  return Promise.all(collections.map(async (collection) => {
    const memberships = await prismaDb.collectionMovies
      .where("collectionId")
      .equals(collection.id)
      .sortBy("position");
    const coverMembership = memberships.find((item) => item.movieId === collection.coverMovieId)
      ?? memberships[0];
    const coverMovie = coverMembership
      ? await prismaDb.movies.get(coverMembership.movieId)
      : undefined;

    return {
      collection,
      movieCount: memberships.length,
      coverMovie
    };
  }));
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

function normalizeCollectionName(name: string): string {
  const normalized = name.trim();
  if (!normalized) throw new Error("Escribe un nombre para la colección.");
  if (normalized.length > 60) throw new Error("El nombre no puede superar los 60 caracteres.");
  return normalized;
}

function normalizeCollectionDescription(description?: string): string | undefined {
  const normalized = description?.trim() ?? "";
  if (normalized.length > 500) throw new Error("La descripción no puede superar los 500 caracteres.");
  return normalized || undefined;
}

async function ensureUniqueCollectionName(name: string, exceptId?: string): Promise<void> {
  const existing = await prismaDb.collections.toArray();
  if (existing.some((collection) =>
    collection.id !== exceptId
    && collection.name.toLocaleLowerCase() === name.toLocaleLowerCase()
  )) {
    throw new Error("Ya existe una colección con ese nombre.");
  }
}

export async function createCollection(name: string, description?: string): Promise<Collection> {
  const normalizedName = normalizeCollectionName(name);
  const normalizedDescription = normalizeCollectionDescription(description);
  await ensureUniqueCollectionName(normalizedName);

  const now = new Date().toISOString();
  const collection: Collection = {
    id: crypto.randomUUID(),
    name: normalizedName,
    ...(normalizedDescription ? { description: normalizedDescription } : {}),
    createdAt: now,
    updatedAt: now
  };
  await prismaDb.collections.add(collection);
  return collection;
}

export async function updateCollection(
  collectionId: string,
  changes: CollectionUpdateInput
): Promise<Collection> {
  return prismaDb.transaction("rw", prismaDb.collections, prismaDb.collectionMovies, async () => {
    const current = await prismaDb.collections.get(collectionId);
    if (!current) throw new Error("No se encontró la colección.");

    const patch: Partial<Collection> = {};
    if (changes.name !== undefined) {
      const name = normalizeCollectionName(changes.name);
      await ensureUniqueCollectionName(name, collectionId);
      patch.name = name;
    }

    if (changes.description !== undefined) {
      patch.description = normalizeCollectionDescription(changes.description);
    }

    if (changes.coverMovieId !== undefined) {
      if (changes.coverMovieId === null) {
        patch.coverMovieId = undefined;
      } else {
        const membership = await prismaDb.collectionMovies
          .where("[collectionId+movieId]")
          .equals([collectionId, changes.coverMovieId])
          .first();
        if (!membership) throw new Error("La portada debe pertenecer a esta colección.");
        patch.coverMovieId = changes.coverMovieId;
      }
    }

    const updated: Collection = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString()
    };
    await prismaDb.collections.update(collectionId, {
      ...patch,
      updatedAt: updated.updatedAt
    });
    return updated;
  });
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

/**
 * Reordena una selección completa en una sola transacción.
 * La lista debe contener, una sola vez, todas las películas que pertenecen a ella.
 */
export async function reorderCollectionMovies(
  collectionId: string,
  orderedMovieIds: string[]
): Promise<void> {
  await prismaDb.transaction("rw", prismaDb.collections, prismaDb.collectionMovies, async () => {
    const collection = await prismaDb.collections.get(collectionId);
    if (!collection) throw new Error("No se encontró la colección.");

    const memberships = await prismaDb.collectionMovies
      .where("collectionId")
      .equals(collectionId)
      .toArray();
    const byMovieId = new Map(memberships.map((membership) => [membership.movieId, membership]));

    if (
      orderedMovieIds.length !== memberships.length
      || new Set(orderedMovieIds).size !== orderedMovieIds.length
      || orderedMovieIds.some((movieId) => !byMovieId.has(movieId))
    ) {
      throw new Error("El nuevo orden no coincide con las películas de esta colección.");
    }

    const reordered = orderedMovieIds.map((movieId, position) => ({
      ...byMovieId.get(movieId)!,
      position
    }));
    if (reordered.length) await prismaDb.collectionMovies.bulkPut(reordered);
    await prismaDb.collections.update(collectionId, { updatedAt: new Date().toISOString() });
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
    const coverMovieId = collection.coverMovieId === movieId
      ? remaining[0]?.movieId
      : collection.coverMovieId;
    await prismaDb.collections.update(collectionId, {
      coverMovieId,
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
