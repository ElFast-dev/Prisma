import type { LibraryEntry, MovieRecord } from "../../domain/types";
import type { TmdbMovieDetails, TmdbMovieSummary } from "../tmdb/TmdbService";
import { prismaDb } from "./database";

function dateYear(value?: string): number | undefined {
  if (!value || !/^\d{4}/.test(value)) return undefined;
  return Number(value.slice(0, 4));
}

export async function saveTmdbMovie(movie: TmdbMovieSummary | TmdbMovieDetails): Promise<MovieRecord> {
  const id = "tmdb-" + movie.id;
  const current = await prismaDb.movies.get(id);
  const details = movie as TmdbMovieDetails;
  const now = new Date().toISOString();

  const record: MovieRecord = {
    id,
    tmdbId: movie.id,
    title: movie.title,
    originalTitle: movie.original_title,
    overview: movie.overview,
    releaseDate: movie.release_date,
    releaseYear: dateYear(movie.release_date),
    runtimeMinutes: details.runtime ?? current?.runtimeMinutes,
    status: details.status ?? current?.status,
    genres: details.genres?.map((genre) => genre.name) ?? current?.genres ?? [],
    countries: details.production_countries?.map((country) => country.name) ?? current?.countries ?? [],
    originalLanguage: details.original_language ?? current?.originalLanguage,
    posterPath: movie.poster_path ?? current?.posterPath,
    backdropPath: movie.backdrop_path ?? current?.backdropPath,
    lastViewingSequence: current?.lastViewingSequence ?? 0,
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  };

  await prismaDb.movies.put(record);
  return record;
}

export async function getMovieByLocalId(movieId: string): Promise<MovieRecord | undefined> {
  return prismaDb.movies.get(movieId);
}

export async function getLibraryMovies(): Promise<{ movie: MovieRecord; entry: LibraryEntry }[]> {
  const entries = await prismaDb.libraryEntries.orderBy("addedAt").reverse().toArray();
  const results = await Promise.all(entries.map(async (entry) => {
    const movie = await prismaDb.movies.get(entry.movieId);
    return movie ? { movie, entry } : undefined;
  }));
  return results.filter((value): value is { movie: MovieRecord; entry: LibraryEntry } => Boolean(value));
}

export async function addToPending(movieId: string): Promise<void> {
  const movie = await prismaDb.movies.get(movieId);
  if (!movie) throw new Error("Primero debes guardar la película en el catálogo local.");
  const now = new Date().toISOString();
  const current = await prismaDb.libraryEntries.get(movieId);

  if (current?.status === "pending") return;
  if (current) {
    await prismaDb.libraryEntries.update(movieId, { status: "pending", updatedAt: now });
  } else {
    await prismaDb.libraryEntries.add({
      movieId,
      status: "pending",
      isFavorite: false,
      addedAt: now,
      updatedAt: now
    });
  }
}

export async function removeFromLibrary(movieId: string): Promise<void> {
  await prismaDb.libraryEntries.delete(movieId);
}

export async function setFavorite(movieId: string, favorite: boolean): Promise<void> {
  const current = await prismaDb.libraryEntries.get(movieId);
  if (!current) throw new Error("La película todavía no está en tu Biblioteca.");
  await prismaDb.libraryEntries.update(movieId, {
    isFavorite: favorite,
    updatedAt: new Date().toISOString()
  });
}
