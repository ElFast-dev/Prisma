import { z } from "zod";

const text = z.string().trim().min(1);
const timestamp = z.string().min(1);
const movieSchema = z.object({
  id: text,
  tmdbId: z.number().int().positive(),
  title: text.max(300),
  originalTitle: z.string().max(300).optional(),
  overview: z.string().max(10000).optional(),
  releaseDate: z.string().max(20).optional(),
  releaseYear: z.number().int().min(1880).max(3000).optional(),
  runtimeMinutes: z.number().int().nonnegative().optional(),
  voteAverage: z.number().min(0).max(10).optional(),
  status: z.string().max(80).optional(),
  genres: z.array(z.string().max(100)).max(100),
  genreIds: z.array(z.number().int().positive()).max(100).optional(),
  countries: z.array(z.string().max(100)).max(100),
  directors: z.array(z.string().max(200)).max(100).optional(),
  castMembers: z.array(z.string().max(200)).max(100).optional(),
  originalLanguage: z.string().max(20).optional(),
  posterPath: z.string().max(300).optional(),
  backdropPath: z.string().max(300).optional(),
  lastViewingSequence: z.number().int().nonnegative(),
  createdAt: timestamp,
  updatedAt: timestamp
}).strict();

const libraryEntrySchema = z.object({
  movieId: text,
  status: z.enum(["watched", "pending"]),
  isFavorite: z.boolean(),
  addedAt: timestamp,
  updatedAt: timestamp
}).strict();

const viewingSchema = z.object({
  id: text,
  movieId: text,
  sequenceNumber: z.number().int().positive(),
  watchedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  watchedAtLocalTime: z.string().max(20).optional(),
  timeZone: z.string().max(100).optional(),
  rating: z.number().int().min(1).max(10),
  review: z.string().max(10000).optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
  operationId: text
}).strict();

const collectionSchema = z.object({
  id: text,
  name: z.string().trim().min(1).max(60),
  description: z.string().max(500).optional(),
  coverMovieId: text.optional(),
  createdAt: timestamp,
  updatedAt: timestamp
}).strict();

const collectionMovieSchema = z.object({
  id: text,
  collectionId: text,
  movieId: text,
  position: z.number().int().nonnegative(),
  addedAt: timestamp
}).strict();

const profileSchema = z.object({
  id: z.literal("local"),
  name: z.string().max(40).optional(),
  avatarDataUrl: z.string().max(2_100_000)
    .refine((value) => /^data:image\/(jpeg|png|webp);base64,/.test(value), "Formato de imagen no permitido.")
    .optional(),
  description: z.string().max(160).optional(),
  personalPhrase: z.string().max(100).optional(),
  updatedAt: timestamp
}).strict();

const preferencesSchema = z.object({
  id: z.literal("local"),
  theme: z.literal("dark"),
  reducedMotion: z.boolean(),
  language: z.literal("es"),
  region: z.string().regex(/^[A-Z]{2}$/),
  libraryView: z.enum(["grid", "list"]),
  historyBrowse: z.object({
    viewMode: z.enum(["timeline", "calendar"]),
    sortOrder: z.enum(["newest", "oldest"]),
    month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    selectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()
  }).strict().optional(),
  historyFilters: z.object({
    query: z.string().max(200),
    notes: z.enum(["all", "with-notes", "without-notes"]),
    rating: z.enum(["all", "9-10", "7-8", "1-6"]),
    fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),
    toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""))
  }).strict().optional(),
  libraryFilters: z.object({
    status: z.enum(["all", "watched", "pending", "favorites"]),
    releaseStatus: z.enum(["all", "upcoming", "released"]).optional(),
    query: z.string().max(200),
    genre: z.string().max(100),
    yearFrom: z.string().refine((value) => value === "" || (/^\d{4}$/.test(value) && Number(value) >= 1880 && Number(value) <= 3000)),
    yearTo: z.string().refine((value) => value === "" || (/^\d{4}$/.test(value) && Number(value) >= 1880 && Number(value) <= 3000)),
    sort: z.enum(["title", "rating", "my-rating", "runtime", "release-date", "added", "random", "added-desc", "title-asc", "year-desc", "year-asc"]).optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
    shuffleSeed: z.number().int().nonnegative().optional()
  }).strict().optional(),
  updatedAt: timestamp
}).strict();

export const prismaBackupSchema = z.object({
  format: z.literal("prisma-local-backup"),
  formatVersion: z.literal(1),
  exportedAt: z.string().datetime(),
  catalogRegion: z.string().regex(/^[A-Z]{2}$/),
  data: z.object({
    movies: z.array(movieSchema).max(20000),
    libraryEntries: z.array(libraryEntrySchema).max(20000),
    viewings: z.array(viewingSchema).max(100000),
    collections: z.array(collectionSchema).max(5000),
    collectionMovies: z.array(collectionMovieSchema).max(100000),
    profile: z.array(profileSchema).max(1),
    preferences: z.array(preferencesSchema).max(1)
  }).strict()
}).strict();

export type PrismaBackup = z.infer<typeof prismaBackupSchema>;

function ensureUnique(values: string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error("La copia contiene registros duplicados en " + label + ".");
  }
}

export function validatePrismaBackup(value: unknown): PrismaBackup {
  const parsed = prismaBackupSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("El archivo no es una copia Prisma válida o pertenece a una versión no compatible.");
  }

  const backup = parsed.data;
  const { data } = backup;
  ensureUnique(data.movies.map((item) => item.id), "películas");
  ensureUnique(data.movies.map((item) => String(item.tmdbId)), "identificadores TMDB");
  ensureUnique(data.libraryEntries.map((item) => item.movieId), "Biblioteca");
  ensureUnique(data.viewings.map((item) => item.id), "visionados");
  ensureUnique(data.viewings.map((item) => item.operationId), "operaciones de visionado");
  ensureUnique(data.viewings.map((item) => item.movieId + ":" + item.sequenceNumber), "secuencias de visionado");
  ensureUnique(data.collections.map((item) => item.id), "colecciones");
  ensureUnique(data.collections.map((item) => item.name.trim().toLocaleLowerCase()), "nombres de colecciones");
  ensureUnique(data.collectionMovies.map((item) => item.id), "relaciones de colecciones");
  ensureUnique(data.collectionMovies.map((item) => item.collectionId + ":" + item.movieId), "películas repetidas en colecciones");
  ensureUnique(data.collectionMovies.map((item) => item.collectionId + ":" + item.position), "posiciones de colecciones");

  const movieIds = new Set(data.movies.map((item) => item.id));
  const movieById = new Map(data.movies.map((item) => [item.id, item]));
  const collectionIds = new Set(data.collections.map((item) => item.id));

  if (data.libraryEntries.some((item) => !movieIds.has(item.movieId))
    || data.viewings.some((item) => !movieIds.has(item.movieId))) {
    throw new Error("La copia contiene visionados o entradas de Biblioteca sin su película correspondiente.");
  }
  if (data.collections.some((item) => item.coverMovieId && !movieIds.has(item.coverMovieId))) {
    throw new Error("La copia contiene una portada de colección que no existe en el catálogo.");
  }
  if (data.collectionMovies.some((item) => !collectionIds.has(item.collectionId) || !movieIds.has(item.movieId))) {
    throw new Error("La copia contiene relaciones de colecciones incompletas.");
  }

  const maximumSequence = new Map<string, number>();
  for (const viewing of data.viewings) {
    maximumSequence.set(viewing.movieId, Math.max(maximumSequence.get(viewing.movieId) ?? 0, viewing.sequenceNumber));
  }
  for (const [movieId, sequence] of maximumSequence) {
    if ((movieById.get(movieId)?.lastViewingSequence ?? 0) < sequence) {
      throw new Error("La copia contiene un contador de visionados inconsistente para una película.");
    }
  }
  return backup;
}

export function parsePrismaBackup(content: string): PrismaBackup {
  if (content.length > 50 * 1024 * 1024) {
    throw new Error("La copia supera el tamaño máximo permitido de 50 MB.");
  }
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error("El archivo no contiene JSON válido.");
  }
  return validatePrismaBackup(value);
}
