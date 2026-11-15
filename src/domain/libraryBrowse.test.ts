import { describe, expect, it } from "vitest";
import type { LibraryEntry, MovieRecord } from "./types";
import {
  filterLibraryItems,
  getLibraryFacets,
  type LibraryBrowseItem,
  type LibraryBrowseOptions
} from "./libraryBrowse";

function item(
  id: string,
  title: string,
  options: {
    originalTitle?: string;
    year?: number;
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
    releaseYear: options.year,
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
  return { movie, entry };
}

const library = [
  item("movie-1", "Amélie", {
    originalTitle: "Le Fabuleux Destin d'Amélie Poulain",
    year: 2001,
    genres: ["Comedia", "Romance"],
    directors: ["Jean-Pierre Jeunet"],
    favorite: true,
    addedAt: "2026-03-03T00:00:00.000Z"
  }),
  item("movie-2", "Ciudad de Dios", {
    originalTitle: "Cidade de Deus",
    year: 2002,
    genres: ["Drama", "Crimen"],
    directors: ["Fernando Meirelles"],
    status: "pending",
    addedAt: "2026-02-02T00:00:00.000Z"
  }),
  item("movie-3", "Alien", {
    year: 1979,
    genres: ["Ciencia ficción", "Terror"],
    favorite: true,
    addedAt: "2026-01-01T00:00:00.000Z"
  }),
  item("movie-4", "La cosa", {
    originalTitle: "The Thing",
    year: 1982,
    genres: ["Ciencia ficción", "Terror"],
    status: "pending",
    directors: ["John Carpenter"],
    addedAt: "2026-04-04T00:00:00.000Z"
  }),
  item("movie-5", "Depredador", {
    originalTitle: "Predator",
    year: 1987,
    genres: ["Ciencia ficción", "Acción"],
    status: "pending",
    addedAt: "2026-05-05T00:00:00.000Z"
  }),
  item("movie-6", "Película sin año", {
    genres: ["Drama"],
    addedAt: "2026-06-06T00:00:00.000Z"
  })
];

const defaults: LibraryBrowseOptions = {
  status: "all",
  query: "",
  genre: "",
  yearFrom: "",
  yearTo: "",
  sort: "added-desc"
};

describe("filterLibraryItems", () => {
  it("filtra por estado y favoritos sin confundir ambos criterios", () => {
    expect(filterLibraryItems(library, { ...defaults, status: "pending" }).map(x => x.movie.id))
      .toEqual(["movie-5", "movie-4", "movie-2"]);
    expect(filterLibraryItems(library, { ...defaults, status: "favorites" }).map(x => x.movie.id))
      .toEqual(["movie-1", "movie-3"]);
  });

  it("busca títulos oficiales y originales sin distinguir tildes", () => {
    expect(filterLibraryItems(library, { ...defaults, query: "amelie" }).map(x => x.movie.id))
      .toEqual(["movie-1"]);
    expect(filterLibraryItems(library, { ...defaults, query: "cidade de deus" }).map(x => x.movie.id))
      .toEqual(["movie-2"]);
    expect(filterLibraryItems(library, { ...defaults, query: "the thing" }).map(x => x.movie.id))
      .toEqual(["movie-4"]);
  });

  it("busca directores y combina texto, género, estado y rango de años", () => {
    expect(filterLibraryItems(library, {
      ...defaults,
      status: "pending",
      query: "carpenter",
      genre: "Ciencia ficción",
      yearFrom: "1980",
      yearTo: "1990"
    }).map(x => x.movie.id)).toEqual(["movie-4"]);
  });

  it("filtra por rangos de años e ignora películas sin año cuando el rango está activo", () => {
    expect(filterLibraryItems(library, {
      ...defaults,
      yearFrom: "1980",
      yearTo: "1990"
    }).map(x => x.movie.id)).toEqual(["movie-5", "movie-4"]);
    expect(filterLibraryItems(library, {
      ...defaults,
      yearFrom: "2000"
    }).map(x => x.movie.id)).toEqual(["movie-1", "movie-2"]);
  });

  it("ordena por título y año, manteniendo los años desconocidos al final", () => {
    expect(filterLibraryItems(library, { ...defaults, sort: "title-asc" }).map(x => x.movie.title))
      .toEqual(["Alien", "Amélie", "Ciudad de Dios", "Depredador", "La cosa", "Película sin año"]);
    expect(filterLibraryItems(library, { ...defaults, sort: "year-desc" }).map(x => x.movie.id))
      .toEqual(["movie-2", "movie-1", "movie-5", "movie-4", "movie-3", "movie-6"]);
    expect(filterLibraryItems(library, { ...defaults, sort: "year-asc" }).map(x => x.movie.id))
      .toEqual(["movie-3", "movie-4", "movie-5", "movie-1", "movie-2", "movie-6"]);
  });

  it("mantiene primero las incorporaciones recientes de forma predeterminada", () => {
    expect(filterLibraryItems(library, defaults).map(x => x.movie.id))
      .toEqual(["movie-6", "movie-5", "movie-4", "movie-1", "movie-2", "movie-3"]);
  });

  it("devuelve géneros únicos y años disponibles en orden descendente", () => {
    expect(getLibraryFacets(library)).toEqual({
      genres: ["Acción", "Ciencia ficción", "Comedia", "Crimen", "Drama", "Romance", "Terror"],
      years: [2002, 2001, 1987, 1982, 1979]
    });
  });
});
