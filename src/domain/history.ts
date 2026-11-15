import type { MovieRecord, Viewing } from "./types";

export interface HistoryItem {
  viewing: Viewing;
  movie: MovieRecord;
}

export type HistorySortOrder = "newest" | "oldest";
export type HistoryNotesFilter = "all" | "with-notes" | "without-notes";
export type HistoryRatingFilter = "all" | "9-10" | "7-8" | "1-6";

export interface HistoryFilters {
  query: string;
  notes: HistoryNotesFilter;
  rating: HistoryRatingFilter;
  fromDate: string;
  toDate: string;
}

export interface HistoryMonthGroup {
  month: string;
  label: string;
  items: HistoryItem[];
}

export interface HistoryCalendarCell {
  date: string;
  day: number;
}

function normalizeSearchText(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

/**
 * Ordena las experiencias por fecha. La hora solo se compara cuando ambos
 * registros comparten la misma zona horaria; createdAt proporciona un
 * desempate estable cuando la hora local no está disponible.
 */
export function sortHistoryItems(
  items: readonly HistoryItem[],
  order: HistorySortOrder = "newest"
): HistoryItem[] {
  const direction = order === "newest" ? 1 : -1;

  return [...items].sort((left, right) => {
    let result = right.viewing.watchedOn.localeCompare(left.viewing.watchedOn);

    if (!result) {
      const sameTimeZone = (left.viewing.timeZone ?? "") === (right.viewing.timeZone ?? "");
      const leftTime = left.viewing.watchedAtLocalTime;
      const rightTime = right.viewing.watchedAtLocalTime;

      if (sameTimeZone && leftTime && rightTime) {
        result = rightTime.localeCompare(leftTime);
      }
    }

    if (!result) {
      result = right.viewing.createdAt.localeCompare(left.viewing.createdAt);
    }

    if (!result && left.viewing.movieId === right.viewing.movieId) {
      result = right.viewing.sequenceNumber - left.viewing.sequenceNumber;
    }

    if (!result) {
      result = left.movie.title.localeCompare(right.movie.title, "es", {
        sensitivity: "base",
        numeric: true
      });
    }

    if (!result) {
      result = left.viewing.id.localeCompare(right.viewing.id);
    }

    return result * direction;
  });
}

/**
 * Construye la vista del Historial sin agrupar ni fusionar experiencias.
 * Cada registro de Viewing produce su propia fila y conserva sus campos.
 */
export function buildHistoryItems(
  viewings: readonly Viewing[],
  movies: readonly (MovieRecord | undefined)[],
  order: HistorySortOrder = "newest"
): HistoryItem[] {
  const moviesById = new Map(
    movies
      .filter((movie): movie is MovieRecord => movie !== undefined)
      .map((movie) => [movie.id, movie])
  );

  const items = viewings.flatMap((viewing) => {
    const movie = moviesById.get(viewing.movieId);
    return movie ? [{ viewing, movie }] : [];
  });

  return sortHistoryItems(items, order);
}

export function filterHistoryItems(
  items: readonly HistoryItem[],
  filters: HistoryFilters,
  order: HistorySortOrder = "newest"
): HistoryItem[] {
  const query = normalizeSearchText(filters.query.trim());

  const filtered = items.filter(({ viewing, movie }) => {
    const note = viewing.review?.trim() ?? "";
    if (filters.notes === "with-notes" && !note) return false;
    if (filters.notes === "without-notes" && note) return false;

    if (filters.rating === "9-10" && viewing.rating < 9) return false;
    if (filters.rating === "7-8" && (viewing.rating < 7 || viewing.rating > 8)) return false;
    if (filters.rating === "1-6" && viewing.rating > 6) return false;

    if (filters.fromDate && viewing.watchedOn < filters.fromDate) return false;
    if (filters.toDate && viewing.watchedOn > filters.toDate) return false;

    if (!query) return true;

    const searchableText = normalizeSearchText([
      movie.title,
      movie.originalTitle,
      movie.directors?.join(" "),
      movie.genres.join(" "),
      movie.releaseYear?.toString(),
      movie.tmdbId.toString(),
      note,
      "visionado " + viewing.sequenceNumber
    ].filter(Boolean).join(" "));

    return searchableText.includes(query);
  });

  return sortHistoryItems(filtered, order);
}

export function groupHistoryItemsByMonth(items: readonly HistoryItem[]): HistoryMonthGroup[] {
  const groups = new Map<string, HistoryMonthGroup>();

  for (const item of items) {
    const month = item.viewing.watchedOn.slice(0, 7);
    let group = groups.get(month);

    if (!group) {
      const [year, monthNumber] = month.split("-").map(Number);
      const label = new Intl.DateTimeFormat("es-PA", {
        month: "long",
        year: "numeric"
      }).format(new Date(year, monthNumber - 1, 1));

      group = { month, label, items: [] };
      groups.set(month, group);
    }

    group.items.push(item);
  }

  return [...groups.values()];
}

export function shiftHistoryMonth(value: string, offset: number): string {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

export function buildHistoryCalendarCells(month: string): (HistoryCalendarCell | null)[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const cells: (HistoryCalendarCell | null)[] = Array.from({ length: offset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = year + "-" + String(monthNumber).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    cells.push({ date, day });
  }

  return cells;
}
