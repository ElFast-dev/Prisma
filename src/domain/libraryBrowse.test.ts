import { describe, expect, it } from "vitest";
import type { LibraryEntry, MovieRecord } from "./types";
import { filterLibraryItems, getLibraryFacets, type LibraryBrowseItem, type LibraryBrowseOptions } from "./libraryBrowse";

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
  item("movie-4", "Película sin año", {
    genres: ["Drama"],
    addedAt: "2026-04-04T00:00:00.000Z"
  })
];

const defaults: LibraryBrowseOptions = {
  status: "all",
  query: "",
  genre: "",
  year: "",
  sort: "added-desc"
};

describe("filterLibraryItems", () => {
  it("filters by status and favorites without mixing the two", () => {
    expect(filterLibraryItems(library, { ...defaults, status: "pending" }).map(x => x.movie.id))
      .toEqual(["movie-2"]);
    expect(filterLibraryItems(library, { ...defaults, status: "favorites" }).map(x => x.movie.id))
      .toEqual(["movie-1", "movie-3"]);
  });

  it("searches official and original titles without accent sensitivity", () => {
    expect(filterLibraryItems(library, { ...defaults, query: "amelie" }).map(x => x.movie.id))
      .toEqual(["movie-1"]);
    expect(filterLibraryItems(library, { ...defaults, query: "cidade de deus" }).map(x => x.movie.id))
      .toEqual(["movie-2"]);
  });

  it("searches directors and combines text, genre and release year", () => {
    expect(filterLibraryItems(library, {
      ...defaults,
      query: "meirelles",
      genre: "Crimen",
      year: "2002"
    }).map(x => x.movie.id)).toEqual(["movie-2"]);
  });

  it("sorts by title and release year with unknown years at the end", () => {
    expect(filterLibraryItems(library, { ...defaults, sort: "title-asc" }).map(x => x.movie.title))
      .toEqual(["Alien", "Amélie", "Ciudad de Dios", "Película sin año"]);
    expect(filterLibraryItems(library, { ...defaults, sort: "year-desc" }).map(x => x.movie.id))
      .toEqual(["movie-2", "movie-1", "movie-3", "movie-4"]);
    expect(filterLibraryItems(library, { ...defaults, sort: "year-asc" }).map(x => x.movie.id))
      .toEqual(["movie-3", "movie-1", "movie-2", "movie-4"]);
  });

  it("keeps the newest library additions first by default", () => {
    expect(filterLibraryItems(library, defaults).map(x => x.movie.id))
      .toEqual(["movie-4", "movie-1", "movie-2", "movie-3"]);
  });

  it("returns unique genres and descending years for the selectors", () => {
    expect(getLibraryFacets(library)).toEqual({
      genres: ["Ciencia ficción", "Comedia", "Crimen", "Drama", "Romance", "Terror"],
      years: [2002, 2001, 1979]
    });
  });
});
