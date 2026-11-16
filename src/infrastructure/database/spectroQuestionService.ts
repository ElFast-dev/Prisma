import type { MovieRecord, Viewing } from "../../domain/types";
import { updateViewing } from "./viewingService";
import { prismaDb } from "./database";

const SNOOZE_KEY = "spectro:rating-question:snooze-until";
const SNOOZE_MS = 24 * 60 * 60 * 1000;

export interface SpectroRatingQuestion {
  viewingId: string;
  movieId: string;
  title: string;
  watchedOn: string;
  sequenceNumber: number;
}

async function snoozeQuestions(): Promise<void> {
  await prismaDb.appMetadata.put({
    key: SNOOZE_KEY,
    value: String(Date.now() + SNOOZE_MS)
  });
}

/**
 * Selecciona un visionado real sin calificación y propone una sola pregunta
 * contextual. La respuesta se guarda en ese visionado, nunca en un registro
 * nuevo y nunca como una valoración ficticia.
 */
export async function getNextSpectroRatingQuestion(): Promise<SpectroRatingQuestion | null> {
  const snooze = await prismaDb.appMetadata.get(SNOOZE_KEY);
  const snoozedUntil = Number(snooze?.value ?? 0);
  if (Number.isFinite(snoozedUntil) && snoozedUntil > Date.now()) return null;

  const viewings = await prismaDb.viewings.toArray();
  const unrated = viewings
    .filter((viewing) => viewing.rating === undefined)
    .sort((a, b) => (
      b.watchedOn.localeCompare(a.watchedOn)
      || b.sequenceNumber - a.sequenceNumber
      || b.createdAt.localeCompare(a.createdAt)
    ));
  if (!unrated.length) return null;

  const movieById = new Map<string, MovieRecord>();
  const movies = await prismaDb.movies.bulkGet([...new Set(unrated.map((item) => item.movieId))]);
  for (const movie of movies) {
    if (movie) movieById.set(movie.id, movie);
  }

  const viewing = unrated.find((item) => movieById.has(item.movieId));
  if (!viewing) return null;
  const movie = movieById.get(viewing.movieId);
  if (!movie) return null;

  return {
    viewingId: viewing.id,
    movieId: viewing.movieId,
    title: movie.title,
    watchedOn: viewing.watchedOn,
    sequenceNumber: viewing.sequenceNumber
  };
}

/**
 * Espectro solicita la nota solo para una experiencia que sigue sin calificación.
 * La escritura conserva la fecha, comentario, hora local y resto del historial.
 */
export async function answerSpectroRatingQuestion(
  viewingId: string,
  rating: number
): Promise<void> {
  if (!Number.isSafeInteger(rating) || rating < 1 || rating > 10) {
    throw new Error("La calificación debe ser un número entero entre 1 y 10.");
  }

  const current: Viewing | undefined = await prismaDb.viewings.get(viewingId);
  if (!current) throw new Error("El visionado ya no está disponible.");
  if (current.rating !== undefined) {
    throw new Error("Este visionado ya tiene una calificación.");
  }

  await updateViewing(viewingId, {
    watchedOn: current.watchedOn,
    rating
  });
  await snoozeQuestions();
}

/** Posponer preguntas durante 24 horas; no altera los datos del usuario. */
export async function dismissSpectroRatingQuestion(): Promise<void> {
  await snoozeQuestions();
}
