import type { LibraryEntry, MovieRecord } from "../../domain/types";
import type { TmdbCredits, TmdbMovieDetails, TmdbMovieSummary } from "../tmdb/TmdbService";
import { prismaDb } from "./database";
import { requestAutomaticEnrichment } from "./enrichmentService";
import { startSpectroMetadataEnrichment } from "./spectroMetadataService";
import { appendSpectroMetadataSnapshot } from "./spectroMetadataHistoryRepository";

function dateYear(value?: string): number | undefined {
  if (!value || !/^\d{4}/.test(value)) return undefined;
  return Number(value.slice(0, 4));
}

export async function saveTmdbMovie(movie: TmdbMovieSummary | TmdbMovieDetails, credits?: TmdbCredits): Promise<MovieRecord> {
  const id = "tmdb-" + movie.id;
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
    voteAverage: movie.vote_average ?? current?.voteAverage,
    status: details.status ?? current?.status,
    genres: details.genres?.map((genre) => genre.name) ?? current?.genres ?? [],
    genreIds: details.genres?.map((genre) => genre.id) ?? movie.genre_ids ?? current?.genreIds ?? [],
    countries: details.production_countries?.map((country) => country.name) ?? current?.countries ?? [],
    directors: credits?.crew.length
      ? [...new Set(credits.crew.filter((person) => person.job === "Director").map((person) => person.name))]
      : current?.directors ?? [],
    castMembers: credits?.cast.length
      ? [...new Set(credits.cast.slice(0, 12).map((person) => person.name))]
      : current?.castMembers ?? [],
    originalLanguage: details.original_language ?? current?.originalLanguage,
    posterPath: movie.poster_path ?? current?.posterPath,
    backdropPath: movie.backdrop_path ?? current?.backdropPath,
    lastViewingSequence: current?.lastViewingSequence ?? 0,
    createdAt: current?.createdAt ?? now,
    updatedAt: now
  };

  await prismaDb.transaction("rw", [prismaDb.movies, prismaDb.appMetadata], async () => {
    const current = await prismaDb.movies.get(id);
    if (current) {
      await appendSpectroMetadataSnapshot(current, current.updatedAt, "legacy-updated-at");
      // La construcción reutiliza datos locales que no llegan en el resumen TMDB.
      record.runtimeMinutes = details.runtime ?? current.runtimeMinutes;
      record.voteAverage = movie.vote_average ?? current.voteAverage;
      record.status = details.status ?? current.status;
      record.genres = details.genres?.map((genre) => genre.name) ?? current.genres;
      record.genreIds = details.genres?.map((genre) => genre.id) ?? movie.genre_ids ?? current.genreIds ?? [];
      record.countries = details.production_countries?.map((country) => country.name) ?? current.countries;
      record.directors = credits?.crew.length
        ? [...new Set(credits.crew.filter((person) => person.job === "Director").map((person) => person.name))]
        : current.directors ?? [];
      record.castMembers = credits?.cast.length
        ? [...new Set(credits.cast.slice(0, 12).map((person) => person.name))]
        : current.castMembers ?? [];
      record.originalLanguage = details.original_language ?? current.originalLanguage;
      record.posterPath = movie.poster_path ?? current.posterPath;
      record.backdropPath = movie.backdrop_path ?? current.backdropPath;
      record.lastViewingSequence = current.lastViewingSequence;
      record.createdAt = current.createdAt;
    }
    await prismaDb.movies.put(record);
    await appendSpectroMetadataSnapshot(record, now, "tmdb-observed");
  });
  return record;
}

export async function getMovieByLocalId(movieId: string): Promise<MovieRecord | undefined> {
  return prismaDb.movies.get(movieId);
}

export async function getLibraryMovies(): Promise<{ movie: MovieRecord; entry: LibraryEntry }[]> {
  const entries = await prismaDb.libraryEntries.orderBy("addedAt").reverse().toArray();
  const movies = await prismaDb.movies.bulkGet(entries.map((entry) => entry.movieId));
  const detailKeys = movies.map((movie) => movie ? "movie:details:" + movie.tmdbId : "");
  const cachedDetails = await prismaDb.catalogCache.bulkGet(detailKeys);

  return entries.flatMap((entry, index) => {
    const movie = movies[index];
    if (!movie) return [];

    const cachedPayload = cachedDetails[index]?.payload as { vote_average?: number } | undefined;
    const voteAverage = movie.voteAverage ?? cachedPayload?.vote_average;
    const hydratedMovie = voteAverage === undefined ? movie : { ...movie, voteAverage };
    return [{ movie: hydratedMovie, entry }];
  });
}


/** Estados locales usados para ocultar películas ya vistas o pendientes en Descubrir. */
export async function getDiscoverLibraryStatus(): Promise<{
  watchedTmdbIds: number[];
  pendingTmdbIds: number[];
}> {
  const [movies, entries, viewings] = await Promise.all([
    prismaDb.movies.toArray(),
    prismaDb.libraryEntries.toArray(),
    prismaDb.viewings.toArray()
  ]);
  const tmdbIdByMovieId = new Map(movies.map((movie) => [movie.id, movie.tmdbId]));
  const watched = new Set<string>(
    entries.filter((entry) => entry.status === "watched").map((entry) => entry.movieId)
  );
  for (const viewing of viewings) watched.add(viewing.movieId);
  const pending = new Set(entries
    .filter((entry) => entry.status === "pending")
    .map((entry) => entry.movieId));

  return {
    watchedTmdbIds: [...watched].flatMap((id) => {
      const tmdbId = tmdbIdByMovieId.get(id);
      return tmdbId === undefined ? [] : [tmdbId];
    }),
    pendingTmdbIds: [...pending].flatMap((id) => {
      const tmdbId = tmdbIdByMovieId.get(id);
      return tmdbId === undefined ? [] : [tmdbId];
    })
  };
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
  requestAutomaticEnrichment();
  void startSpectroMetadataEnrichment().catch(() => undefined);
}

export async function removeFromLibrary(movieId: string): Promise<void> {
  await prismaDb.libraryEntries.delete(movieId);
}

export async function setFavorite(movieId: string, favorite: boolean): Promise<void> {
  const current = await prismaDb.libraryEntries.get(movieId);
  if (!current) throw new Error("La película todavía no está en tu Biblioteca.");

  if (!favorite && !current.status) {
    await prismaDb.libraryEntries.delete(movieId);
    return;
  }

  await prismaDb.libraryEntries.update(movieId, {
    isFavorite: favorite,
    updatedAt: new Date().toISOString()
  });
}
