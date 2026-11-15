import { z } from "zod";

const safeInteger = z.number().int().refine(Number.isSafeInteger, "El identificador no es un entero seguro.");
const positiveId = safeInteger.refine((value) => value > 0, "El identificador debe ser positivo.");
const utcTimestamp = z.string().datetime();

const sourceMovieSchema = z.object({
  id: positiveId,
  tmId: safeInteger,
  t: z.string().trim().min(1).max(300),
  a: utcTimestamp
}).passthrough();

const sourceRatingSchema = z.object({
  id: positiveId,
  tmId: safeInteger,
  r: z.number().int().min(1).max(10),
  rA: utcTimestamp
}).passthrough();

const sourceBackupSchema = z.object({
  version: z.literal(2),
  platform: z.literal("android"),
  createdAt: utcTimestamp,
  movies: z.object({
    cH: z.array(sourceMovieSchema).max(20000).optional().default([]),
    cW: z.array(sourceMovieSchema).max(20000).optional().default([]),
    rM: z.array(sourceRatingSchema).max(50000).optional().default([])
  }).passthrough()
}).passthrough();

export interface ExternalMovieImportItem {
  traktId: number;
  tmdbId: number;
  title: string;
  addedAt: string;
  status: "watched" | "pending";
  watchedOn?: string;
  rating?: number;
  ratingAt?: string;
}

export interface ExternalMovieImportPlan {
  sourceCreatedAt: string;
  movies: ExternalMovieImportItem[];
  summary: {
    watchedMovies: number;
    pendingMovies: number;
    matchedRatings: number;
    orphanRatings: number;
    skippedWithoutTmdb: number;
    watchedWithoutRating: number;
  };
}

function ensureUnique(values: number[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error("El archivo externo contiene identificadores duplicados en " + label + ".");
  }
}

export function parseExternalMovieImport(content: string): ExternalMovieImportPlan {
  if (content.length > 50 * 1024 * 1024) {
    throw new Error("El archivo supera el tamaño máximo permitido de 50 MB.");
  }

  let value: unknown;
  try {
    value = JSON.parse(content.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("El archivo externo no contiene JSON válido.");
  }

  const parsed = sourceBackupSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("El archivo no corresponde al respaldo Android de versión 2 o contiene datos de películas no válidos.");
  }

  const source = parsed.data.movies;
  ensureUnique([...source.cH, ...source.cW].map((movie) => movie.id), "películas Trakt");
  ensureUnique(
    [...source.cH, ...source.cW].filter((movie) => movie.tmId > 0).map((movie) => movie.tmId),
    "identificadores TMDB"
  );
  ensureUnique(source.rM.map((rating) => rating.id), "calificaciones");

  const ratingsByTraktId = new Map(source.rM.map((rating) => [rating.id, rating]));
  const importedHistory = source.cH.filter((movie) => movie.tmId > 0);
  const importedPending = source.cW.filter((movie) => movie.tmId > 0);
  const validHistoryIds = new Set(importedHistory.map((movie) => movie.id));
  const items: ExternalMovieImportItem[] = [];

  for (const movie of importedHistory) {
    const rating = ratingsByTraktId.get(movie.id);
    items.push({
      traktId: movie.id,
      tmdbId: movie.tmId,
      title: movie.t,
      addedAt: movie.a,
      status: "watched",
      watchedOn: movie.a.slice(0, 10),
      rating: rating?.r,
      ratingAt: rating?.rA
    });
  }

  for (const movie of importedPending) {
    items.push({
      traktId: movie.id,
      tmdbId: movie.tmId,
      title: movie.t,
      addedAt: movie.a,
      status: "pending"
    });
  }

  const matchedRatings = importedHistory.filter((movie) => ratingsByTraktId.has(movie.id)).length;
  return {
    sourceCreatedAt: parsed.data.createdAt,
    movies: items,
    summary: {
      watchedMovies: importedHistory.length,
      pendingMovies: importedPending.length,
      matchedRatings,
      orphanRatings: source.rM.length - matchedRatings,
      skippedWithoutTmdb: source.cH.length - importedHistory.length + source.cW.length - importedPending.length,
      watchedWithoutRating: importedHistory.length - matchedRatings
    }
  };
}
