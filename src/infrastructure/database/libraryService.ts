import type { LibraryEntry } from "../../domain/types";
import { prismaDb } from "./database";

export async function getLibraryEntry(movieId: string): Promise<LibraryEntry | undefined> {
  return prismaDb.libraryEntries.get(movieId);
}

export async function addMovieToPending(movieId: string): Promise<LibraryEntry> {
  const movie = await prismaDb.movies.get(movieId);
  if (!movie) throw new Error("La película no está guardada en el catálogo local.");

  const current = await prismaDb.libraryEntries.get(movieId);
  if (current?.status === "pending") return current;

  const now = new Date().toISOString();
  const entry: LibraryEntry = {
    movieId,
    status: "pending",
    isFavorite: current?.isFavorite ?? false,
    addedAt: current?.addedAt ?? now,
    updatedAt: now
  };
  await prismaDb.libraryEntries.put(entry);
  return entry;
}

export async function getViewingCount(movieId: string): Promise<number> {
  return prismaDb.viewings.where("movieId").equals(movieId).count();
}

export async function getMovieViewings(movieId: string) {
  return prismaDb.viewings.where("movieId").equals(movieId).reverse().sortBy("sequenceNumber");
}
