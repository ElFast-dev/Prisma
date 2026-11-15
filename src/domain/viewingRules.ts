export interface ViewingDraft {
  movieId: string;
  watchedOn: string;
  rating: number;
  watchedAtLocalTime?: string;
  timeZone?: string;
  review?: string;
}

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

export function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parts = value.split("-").map(Number);
  const date = new Date(parts[0], parts[1] - 1, parts[2]);
  return date.getFullYear() === parts[0]
    && date.getMonth() === parts[1] - 1
    && date.getDate() === parts[2];
}

export function validateViewingDraft(draft: ViewingDraft, now = new Date()): ViewingDraft {
  if (!draft.movieId.trim()) {
    throw new Error("Selecciona una película.");
  }
  if (!isValidCalendarDate(draft.watchedOn)) {
    throw new Error("La fecha del visionado no es válida.");
  }
  if (draft.watchedOn > toLocalDateString(now)) {
    throw new Error("No puedes registrar un visionado en una fecha futura.");
  }
  if (!Number.isInteger(draft.rating) || draft.rating < 1 || draft.rating > 10) {
    throw new Error("La calificación debe ser un número entero entre 1 y 10.");
  }

  const normalizedTime = draft.watchedAtLocalTime?.trim() || undefined;
  if (normalizedTime) {
    const parts = normalizedTime.split(":");
    const validHour = parts.length === 2 && /^[0-9]{2}$/.test(parts[0]) && Number(parts[0]) <= 23;
    const validMinute = parts.length === 2 && /^[0-9]{2}$/.test(parts[1]) && Number(parts[1]) <= 59;
    if (!validHour || !validMinute) {
      throw new Error("La hora debe utilizar el formato HH:mm.");
    }
  }
  if (draft.review && draft.review.length > 10000) {
    throw new Error("El comentario no puede superar los 10 000 caracteres.");
  }

  return {
    ...draft,
    watchedAtLocalTime: normalizedTime,
    review: draft.review?.trim() || undefined
  };
}

export function getNextViewingNumber(lastIssuedSequence: number): number {
  if (!Number.isInteger(lastIssuedSequence) || lastIssuedSequence < 0) {
    throw new Error("El contador de visionados no es válido.");
  }
  return lastIssuedSequence + 1;
}

export function calculateAverageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null;
  if (ratings.some((rating) => !Number.isInteger(rating) || rating < 1 || rating > 10)) {
    throw new Error("Todas las calificaciones deben estar entre 1 y 10.");
  }
  const average = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return Math.round(average * 100) / 100;
}
