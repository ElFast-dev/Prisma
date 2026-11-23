import { describe, expect, it } from "vitest";
import type { LibraryEntry, MovieRecord } from "./types";
import {
  filterLibraryItems,
  getLibraryFacets,
  getMovieReleaseStatus,
  type LibraryBrowseItem,
  type LibraryBrowseOptions
} from "./libraryBrowse";
import { DEFAULT_LIBRARY_FILTERS } from "./libraryPreferences";

function item(
  id: string,
  title: string,
  options: {
    originalTitle?: string;
    year?: number;
    releaseDate?: string;
    tmdbStatus?: string;
    voteAverage?: number;
    runtime?: number;
    myRating?: number;
    genres?: string[];
    directors?: string[];
    status?: LibraryEntry["status"];
    favorite?: boolean;
    addedAt?: string;
  } = {}
): LibraryBrowseItem {
  const movie: MovieRecord = {
    id,
    tmdbId: Number(id.replace(/\D/g, "")) || 1,
    title,
    originalTitle: options.originalTitle,
    releaseDate: options.releaseDate ?? (options.year ? String(options.year) + "-01-01" : undefined),
    releaseYear: options.year,
    status: options.tmdbStatus,
    voteAverage: options.voteAverage,
    runtimeMinutes: options.runtime,
    genres: options.genres ?? [],
    countries: [],
    directors: options.directors,
    lastViewingSequence: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
  const entry: LibraryEntry = {
    movieId: id,
    status: options.status ?? "watched",
    isFavorite: options.favorite ?? false,
    addedAt: options.addedAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
  return { movie, entry, userRating: options.myRating };
}

const library: LibraryBrowseItem[] = [
  item("movie-1", "Amélie", {
    originalTitle: "Le Fabuleux Destin d'Amélie Poulain",
    year: 2001,
    releaseDate: "2001-04-25",
    voteAverage: 7.4,
    runtime: 122,
    myRating: 8.5,
    genres: ["Comedia", "Romance"],
    directors: ["Jean-Pierre Jeunet"],
    favorite: true,
    addedAt: "2026-03-03T00:00:00.000Z"
  }),
  item("movie-2", "Ciudad de Dios", {
    originalTitle: "Cidade de Deus",
    year: 2002,
    releaseDate: "2002-08-30",
    voteAverage: 8.6,
    runtime: 130,
    myRating: 7.3,
    genres: ["Drama", "Crimen"],
    directors: ["Fernando Meirelles"],
    status: "pending",
    addedAt: "2026-02-02T00:00:00.000Z"
  }),
  item("movie-3", "Alien", {
    year: 1979,
    releaseDate: "1979-05-25",
    voteAverage: 8.5,
    runtime: 117,
    myRating: 9,
    genres: ["Ciencia ficción", "Terror"],
    favorite: true,
    addedAt: "2026-01-01T00:00:00.000Z"
  }),
  item("movie-4", "La cosa", {
    originalTitle: "The Thing",
    year: 1982,
    releaseDate: "1982-06-25",
    voteAverage: 8.1,
    runtime: 109,
    myRating: 7,
    genres: ["Ciencia ficción", "Terror"],
    status: "pending",
    directors: ["John Carpenter"],
    addedAt: "2026-04-04T00:00:00.000Z"
  }),
  item("movie-5", "Depredador", {
    originalTitle: "Predator",
    year: 1987,
    releaseDate: "1987-06-12",
    voteAverage: 7.8,
    runtime: 107,
    myRating: 8,
    genres: ["Ciencia ficción", "Acción"],
    status: "pending",
    addedAt: "2026-05-05T00:00:00.000Z"
  }),
  item("movie-6", "Película sin año", {
    genres: ["Drama"],
    addedAt: "2026-06-06T00:00:00.000Z"
  }),
  item("movie-7", "Estreno próximo", {
    releaseDate: "2026-12-12",
    tmdbStatus: "Planned",
    voteAverage: 0,
    runtime: 95,
    addedAt: "2026-07-07T00:00:00.000Z"
  })
];

const defaults: LibraryBrowseOptions = { ...DEFAULT_LIBRARY_FILTERS };

describe("filterLibraryItems", () => {
  it("mantiene filtros de Vistas, Pendientes y Favoritas", () => {
    expect(filterLibraryItems(library, { ...defaults, status: "pending" }).map(x => x.movie.id))
      .toEqual(["movie-5", "movie-4", "movie-2"]);
    expect(filterLibraryItems(library, { ...defaults, status: "favorites" }).map(x => x.movie.id))
      .toEqual(["movie-1", "movie-3"]);
  });

  it("clasifica Próximamente y Estrenada sin usar una fecha UTC incorrecta", () => {
    expect(getMovieReleaseStatus(library[6].movie, "2026-11-15")).toBe("upcoming");
    expect(getMovieReleaseStatus(library[0].movie, "2026-11-15")).toBe("released");
    expect(filterLibraryItems(library, { ...defaults, releaseStatus: "upcoming" }, "2026-11-15").map(x => x.movie.id))
      .toEqual(["movie-7"]);
    expect(filterLibraryItems(library, { ...defaults, releaseStatus: "released" }, "2026-11-15"))
      .toHaveLength(5);
  });

  it("busca títulos oficiales, originales y directores y combina filtros", () => {
    expect(filterLibraryItems(library, { ...defaults, query: "amelie" }).map(x => x.movie.id))
      .toEqual(["movie-1"]);
    expect(filterLibraryItems(library, { ...defaults, query: "cidade de deus" }).map(x => x.movie.id))
      .toEqual(["movie-2"]);
    expect(filterLibraryItems(library, { ...defaults, query: "carpenter", status: "pending", genre: "Ciencia ficción", yearFrom: "1980", yearTo: "1990" }).map(x => x.movie.id))
      .toEqual(["movie-4"]);
  });

  it("combina rangos de duración y valoración personal", () => {
    const filters = {
      ...defaults,
      runtimeMin: "100",
      runtimeMax: "122",
      myRatingMin: "8",
      myRatingMax: "9"
    };
    expect(filterLibraryItems(library, filters).map((x) => x.movie.id)).toEqual(["movie-1", "movie-3"]);
    expect(filterLibraryItems(library, { ...filters, runtimeMin: "125", myRatingMin: "9.5" })).toEqual([]);
  });

  it("ordena títulos en ambos sentidos", () => {
    expect(filterLibraryItems(library, { ...defaults, sort: "title", sortDirection: "asc" }).map(x => x.movie.title))
      .toEqual(["Alien", "Amélie", "Ciudad de Dios", "Depredador", "Estreno próximo", "La cosa", "Película sin año"]);
    expect(filterLibraryItems(library, { ...defaults, sort: "title", sortDirection: "desc" }).map(x => x.movie.title)[0])
      .toBe("Película sin año");
  });

  it("ordena mejor valoración TMDB y conserva sin calificación al final", () => {
    expect(filterLibraryItems(library, { ...defaults, sort: "rating", sortDirection: "desc" }).slice(0, 5).map(x => x.movie.id))
      .toEqual(["movie-2", "movie-3", "movie-4", "movie-5", "movie-1"]);
    expect(filterLibraryItems(library, { ...defaults, sort: "rating", sortDirection: "asc" }).at(-1)?.movie.id)
      .toBe("movie-6");
  });

  it("ordena según mi valoración personal", () => {
    expect(filterLibraryItems(library, { ...defaults, sort: "my-rating", sortDirection: "desc" }).slice(0, 3).map(x => x.movie.id))
      .toEqual(["movie-3", "movie-1", "movie-5"]);
    expect(filterLibraryItems(library, { ...defaults, sort: "my-rating", sortDirection: "asc" }).at(-1)?.movie.id)
      .toBe("movie-6");
  });

  it("ordena por duración: más corta primero y más larga primero", () => {
    expect(filterLibraryItems(library, { ...defaults, sort: "runtime", sortDirection: "asc" }).slice(0, 3).map(x => x.movie.id))
      .toEqual(["movie-7", "movie-5", "movie-4"]);
    expect(filterLibraryItems(library, { ...defaults, sort: "runtime", sortDirection: "desc" }).slice(0, 2).map(x => x.movie.id))
      .toEqual(["movie-2", "movie-1"]);
  });

  it("ordena por fecha de estreno y por incorporación", () => {
    expect(filterLibraryItems(library, { ...defaults, sort: "release-date", sortDirection: "desc" }).slice(0, 3).map(x => x.movie.id))
      .toEqual(["movie-7", "movie-2", "movie-1"]);
    expect(filterLibraryItems(library, { ...defaults, sort: "release-date", sortDirection: "asc" })[0].movie.id)
      .toBe("movie-3");
    expect(filterLibraryItems(library, { ...defaults, sort: "added", sortDirection: "desc" })[0].movie.id)
      .toBe("movie-7");
    expect(filterLibraryItems(library, { ...defaults, sort: "added", sortDirection: "asc" })[0].movie.id)
      .toBe("movie-3");
  });

  it("Aleatorio devuelve el mismo orden con su semilla y cambia con una semilla nueva", () => {
    const first = filterLibraryItems(library, { ...defaults, sort: "random", shuffleSeed: 123 });
    const repeated = filterLibraryItems(library, { ...defaults, sort: "random", shuffleSeed: 123 });
    const next = filterLibraryItems(library, { ...defaults, sort: "random", shuffleSeed: 456 });
    expect(repeated.map(x => x.movie.id)).toEqual(first.map(x => x.movie.id));
    expect(next.map(x => x.movie.id)).not.toEqual(first.map(x => x.movie.id));
  });

  it("devuelve géneros únicos y años disponibles", () => {
    expect(getLibraryFacets(library).genres).toContain("Ciencia ficción");
  });
});
