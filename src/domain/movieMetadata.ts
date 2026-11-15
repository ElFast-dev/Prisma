import type { MovieRecord } from "./types";

export interface TmdbMovieMetadataSource {
  title: string;
  original_title?: string;
  overview?: string;
  release_date?: string;
  runtime?: number | null;
  status?: string;
  genres?: { id: number; name: string }[];
  genre_ids?: number[];
  production_countries?: { iso_3166_1: string; name: string }[];
  original_language?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
}

export function hasCompleteMovieMetadata(movie: MovieRecord): boolean {
  return Boolean(
    movie.title.trim()
    && movie.originalTitle?.trim()
    && typeof movie.overview === "string"
    && typeof movie.releaseDate === "string"
    && typeof movie.releaseYear === "number"
    && typeof movie.runtimeMinutes === "number"
    && movie.originalLanguage?.trim()
    && movie.genres.length > 0
    && (movie.genreIds?.length ?? 0) > 0
    && movie.countries.length > 0
    && movie.posterPath
    && movie.backdropPath
  );
}

function releaseYear(value?: string): number | undefined {
  if (!value || !/^\d{4}/.test(value)) return undefined;
  return Number(value.slice(0, 4));
}

/**
 * Construye exclusivamente el parche de metadatos cinematográficos.
 * No incluye estados de biblioteca, visionados ni información personal.
 */
export function createMovieMetadataPatch(
  current: MovieRecord,
  source: TmdbMovieMetadataSource,
  updatedAt: string
): Partial<MovieRecord> {
  const releaseDate = source.release_date ?? current.releaseDate;
  const sourceGenres = source.genres?.filter((genre) => genre.name.trim()) ?? [];
  const genreIds = sourceGenres.length
    ? sourceGenres.map((genre) => genre.id)
    : source.genre_ids?.length
      ? source.genre_ids
      : current.genreIds ?? [];

  return {
    title: source.title.trim() || current.title,
    originalTitle: source.original_title ?? current.originalTitle ?? current.title,
    overview: source.overview ?? current.overview ?? "",
    releaseDate: releaseDate ?? "",
    releaseYear: releaseYear(releaseDate) ?? current.releaseYear,
    runtimeMinutes: typeof source.runtime === "number" ? source.runtime : current.runtimeMinutes,
    status: source.status ?? current.status,
    genres: sourceGenres.length ? sourceGenres.map((genre) => genre.name) : current.genres,
    genreIds,
    countries: source.production_countries?.length
      ? source.production_countries.map((country) => country.name)
      : current.countries,
    originalLanguage: source.original_language ?? current.originalLanguage,
    posterPath: source.poster_path ?? current.posterPath,
    backdropPath: source.backdrop_path ?? current.backdropPath,
    updatedAt
  };
}
