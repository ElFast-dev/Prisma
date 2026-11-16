import { describe, expect, it } from "vitest";
import type { MovieRecord } from "./types";
import {
  createMovieMetadataPatch,
  hasCompleteMovieMetadata
} from "./movieMetadata";

function movie(overrides: Partial<MovieRecord> = {}): MovieRecord {
  return {
    id: "tmdb-42",
    tmdbId: 42,
    title: "Título importado",
    genres: [],
    countries: [],
    lastViewingSequence: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides
  };
}

describe("movie metadata enrichment", () => {
  it("detects the minimal records created by an external movie import", () => {
    expect(hasCompleteMovieMetadata(movie())).toBe(false);
  });

  it("recognizes a movie with its catalog metadata already present", () => {
    expect(hasCompleteMovieMetadata(movie({
      originalTitle: "Original title",
      overview: "",
      releaseDate: "2020-01-02",
      releaseYear: 2020,
      runtimeMinutes: 100,
      genres: ["Drama"],
      genreIds: [18],
      countries: ["Panamá"],
      originalLanguage: "es",
      posterPath: "/poster.jpg",
      backdropPath: "/backdrop.jpg"
    }))).toBe(true);
  });

  it("creates a catalog-only patch and keeps unavailable fields already saved", () => {
    const current = movie({
      status: "Released",
      originalTitle: "Título original",
      overview: "Sinopsis existente",
      posterPath: "/poster-local.jpg",
      lastViewingSequence: 5
    });
    const patch = createMovieMetadataPatch(current, {
      title: "Título oficial",
      original_title: "Official title",
      release_date: "2021-09-10",
      runtime: 108,
      genres: [{ id: 18, name: "Drama" }],
      production_countries: [{ iso_3166_1: "US", name: "Estados Unidos" }],
      original_language: "en",
      keywords: ["memoria", "viajes en el tiempo"],
      poster_path: null,
      backdrop_path: "/backdrop.jpg"
    }, "2026-11-15T12:00:00.000Z");

    expect(patch).toMatchObject({
      title: "Título oficial",
      originalTitle: "Official title",
      releaseDate: "2021-09-10",
      releaseYear: 2021,
      runtimeMinutes: 108,
      genres: ["Drama"],
      genreIds: [18],
      countries: ["Estados Unidos"],
      originalLanguage: "en",
      keywords: ["memoria", "viajes en el tiempo"],
      posterPath: "/poster-local.jpg",
      backdropPath: "/backdrop.jpg",
      status: "Released"
    });
    expect(patch).not.toHaveProperty("id");
    expect(patch).not.toHaveProperty("tmdbId");
    expect(patch).not.toHaveProperty("lastViewingSequence");
    expect(patch).not.toHaveProperty("createdAt");
  });
});
