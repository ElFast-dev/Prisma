import { describe, expect, it } from "vitest";
import type { MovieRecord, Viewing } from "./types";
import {
  buildHistoryCalendarCells,
  buildHistoryItems,
  filterHistoryItems,
  groupHistoryItemsByMonth,
  shiftHistoryMonth,
  sortHistoryItems,
  type HistoryFilters
} from "./history";

function movie(id: string, title: string, options: Partial<MovieRecord> = {}): MovieRecord {
  return {
    id,
    tmdbId: Number(id.replace(/\D/g, "")) || 1,
    title,
    originalTitle: options.originalTitle,
    genres: options.genres ?? [],
    countries: options.countries ?? [],
    directors: options.directors,
    releaseYear: options.releaseYear,
    lastViewingSequence: options.lastViewingSequence ?? 0,
    createdAt: options.createdAt ?? "2024-01-01T00:00:00.000Z",
    updatedAt: options.updatedAt ?? "2024-01-01T00:00:00.000Z"
  };
}

function viewing(
  id: string,
  movieId: string,
  sequenceNumber: number,
  watchedOn: string,
  options: Partial<Viewing> = {}
): Viewing {
  return {
    id,
    movieId,
    sequenceNumber,
    watchedOn,
    rating: options.rating ?? 8,
    review: options.review,
    watchedAtLocalTime: options.watchedAtLocalTime,
    timeZone: options.timeZone,
    createdAt: options.createdAt ?? watchedOn + "T12:00:00.000Z",
    updatedAt: options.updatedAt ?? watchedOn + "T12:00:00.000Z",
    operationId: options.operationId ?? "operation-" + id
  };
}

const movies = [
  movie("movie-1", "Amélie", {
    originalTitle: "Le Fabuleux Destin d'Amélie Poulain",
    directors: ["Jean-Pierre Jeunet"],
    genres: ["Comedia", "Romance"],
    releaseYear: 2001
  }),
  movie("movie-2", "Ciudad de Dios", {
    originalTitle: "Cidade de Deus",
    directors: ["Fernando Meirelles"],
    genres: ["Drama", "Crimen"],
    releaseYear: 2002
  })
];

const filters: HistoryFilters = {
  query: "",
  notes: "all",
  rating: "all",
  fromDate: "",
  toDate: ""
};

describe("Historial cinematográfico", () => {
  it("conserva cada revisionado como una experiencia independiente", () => {
    const first = viewing("view-1", "movie-1", 1, "2024-02-01", {
      rating: 7,
      review: "Primera experiencia"
    });
    const second = viewing("view-2", "movie-1", 2, "2025-08-13", {
      rating: 10,
      review: "La segunda vez fue mejor"
    });

    const items = buildHistoryItems([first, second], [movies[0]]);

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.viewing.id)).toEqual(["view-2", "view-1"]);
    expect(items.every((item) => item.movie.id === "movie-1")).toBe(true);
    expect(items.map((item) => item.viewing.sequenceNumber)).toEqual([2, 1]);
    expect(items.map((item) => item.viewing.rating)).toEqual([10, 7]);
    expect(items.map((item) => item.viewing.review)).toEqual([
      "La segunda vez fue mejor",
      "Primera experiencia"
    ]);
  });

  it("ordena por hora local sin comparar secuencias de películas distintas", () => {
    const laterSequence = {
      viewing: viewing("view-a", "movie-1", 9, "2025-05-10", {
        watchedAtLocalTime: "20:15",
        timeZone: "America/Panama",
        createdAt: "2025-05-10T23:00:00.000Z"
      }),
      movie: movies[0]
    };
    const earlierSequence = {
      viewing: viewing("view-b", "movie-2", 1, "2025-05-10", {
        watchedAtLocalTime: "21:30",
        timeZone: "America/Panama",
        createdAt: "2025-05-10T22:00:00.000Z"
      }),
      movie: movies[1]
    };

    expect(sortHistoryItems([laterSequence, earlierSequence]).map((item) => item.viewing.id))
      .toEqual(["view-b", "view-a"]);
    expect(sortHistoryItems([laterSequence, earlierSequence], "oldest").map((item) => item.viewing.id))
      .toEqual(["view-a", "view-b"]);
  });


  it("no compara horas locales si falta la zona horaria o si las zonas son distintas", () => {
    const items = [
      {
        viewing: viewing("view-panama", "movie-1", 2, "2025-05-10", {
          watchedAtLocalTime: "20:15",
          timeZone: "America/Panama",
          createdAt: "2025-05-10T23:00:00.000Z"
        }),
        movie: movies[0]
      },
      {
        viewing: viewing("view-other-zone", "movie-2", 1, "2025-05-10", {
          watchedAtLocalTime: "21:30",
          timeZone: "America/Los_Angeles",
          createdAt: "2025-05-10T22:00:00.000Z"
        }),
        movie: movies[1]
      }
    ];

    expect(sortHistoryItems(items).map((item) => item.viewing.id))
      .toEqual(["view-panama", "view-other-zone"]);

    const withoutTimeZone = items.map((item) => ({
      ...item,
      viewing: { ...item.viewing, timeZone: undefined }
    }));
    expect(sortHistoryItems(withoutTimeZone).map((item) => item.viewing.id))
      .toEqual(["view-panama", "view-other-zone"]);
  });

  it("busca títulos, títulos originales, directores, géneros y comentarios sin distinguir acentos", () => {
    const items = buildHistoryItems([
      viewing("view-1", "movie-1", 1, "2024-02-01", { review: "Una película cálida" }),
      viewing("view-2", "movie-2", 1, "2024-03-01", { review: "Gran realismo" })
    ], movies);

    expect(filterHistoryItems(items, { ...filters, query: "amelie" }).map((item) => item.viewing.id))
      .toEqual(["view-1"]);
    expect(filterHistoryItems(items, { ...filters, query: "cidade de deus" }).map((item) => item.viewing.id))
      .toEqual(["view-2"]);
    expect(filterHistoryItems(items, { ...filters, query: "meirelles" }).map((item) => item.viewing.id))
      .toEqual(["view-2"]);
    expect(filterHistoryItems(items, { ...filters, query: "comedia" }).map((item) => item.viewing.id))
      .toEqual(["view-1"]);
    expect(filterHistoryItems(items, { ...filters, query: "calida" }).map((item) => item.viewing.id))
      .toEqual(["view-1"]);
  });

  it("combina fecha, rango de calificación y presencia de notas", () => {
    const items = buildHistoryItems([
      viewing("view-1", "movie-1", 1, "2024-01-10", { rating: 6 }),
      viewing("view-2", "movie-1", 2, "2024-02-10", { rating: 8, review: "Con nota" }),
      viewing("view-3", "movie-2", 1, "2024-03-10", { rating: 10, review: "Excelente" })
    ], movies);

    const result = filterHistoryItems(items, {
      ...filters,
      notes: "with-notes",
      rating: "7-8",
      fromDate: "2024-02-01",
      toDate: "2024-02-28"
    });

    expect(result.map((item) => item.viewing.id)).toEqual(["view-2"]);
  });

  it("no pierde la relación y omite solo registros cuya película no existe", () => {
    const valid = viewing("view-1", "movie-1", 1, "2024-02-01");
    const orphan = viewing("view-2", "missing-movie", 1, "2024-02-02");
    const items = buildHistoryItems([valid, orphan], movies);

    expect(items).toHaveLength(1);
    expect(items[0].viewing.movieId).toBe(items[0].movie.id);
  });

  it("agrupa cronológicamente por mes y calcula correctamente los meses del calendario", () => {
    const items = buildHistoryItems([
      viewing("view-1", "movie-1", 1, "2024-03-02"),
      viewing("view-2", "movie-2", 1, "2024-02-29"),
      viewing("view-3", "movie-1", 2, "2024-02-01")
    ], movies);

    const groups = groupHistoryItemsByMonth(items);
    expect(groups.map((group) => group.month)).toEqual(["2024-03", "2024-02"]);
    expect(groups[1].items).toHaveLength(2);

    const cells = buildHistoryCalendarCells("2024-02");
    expect(cells.filter(Boolean)).toHaveLength(29);
    expect(cells.find((cell) => cell?.date === "2024-02-29")?.day).toBe(29);
    expect(shiftHistoryMonth("2024-01", -1)).toBe("2023-12");
    expect(shiftHistoryMonth("2024-12", 1)).toBe("2025-01");
  });
});
