import { describe, expect, it } from "vitest";
import type { MovieRecord } from "../../domain/types";
import { TmdbHttpError } from "../tmdb/TmdbClient";
import {
  classifySpectroMetadataError,
  isSpectroMetadataIncomplete
} from "./spectroMetadataService";

const completeMovie: MovieRecord = {
  id: "tmdb-42",
  tmdbId: 42,
  title: "Película de prueba",
  originalTitle: "Test Film",
  overview: "Resumen ficticio.",
  releaseDate: "2020-01-01",
  releaseYear: 2020,
  runtimeMinutes: 110,
  genres: ["Drama"],
  genreIds: [18],
  countries: ["Japón"],
  directors: ["Directora de prueba"],
  castMembers: ["Actor de prueba"],
  originalLanguage: "ja",
  posterPath: "/poster.jpg",
  backdropPath: "/backdrop.jpg",
  lastViewingSequence: 1,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

describe("Espectro · detección de metadatos pendientes", () => {
  it("reconoce un registro con todos los metadatos que utiliza el análisis", () => {
    expect(isSpectroMetadataIncomplete(completeMovie)).toBe(false);
  });

  it("solicita información cuando faltan dirección o reparto", () => {
    expect(isSpectroMetadataIncomplete({
      ...completeMovie,
      directors: [],
      castMembers: []
    })).toBe(true);
  });

  it("solicita información cuando faltan idioma, duración o países", () => {
    expect(isSpectroMetadataIncomplete({
      ...completeMovie,
      originalLanguage: undefined,
      runtimeMinutes: undefined,
      countries: []
    })).toBe(true);
  });
});

describe("Espectro · errores de TMDB", () => {
  it("no vuelve a consultar una película que TMDB no encuentra", () => {
    expect(classifySpectroMetadataError(
      new TmdbHttpError("missing", 404, "movie/42")
    )).toBe("not-found");
  });

  it("reconoce errores de credenciales y limita sus reintentos", () => {
    expect(classifySpectroMetadataError(
      new TmdbHttpError("unauthorized", 401, "movie/42")
    )).toBe("authentication");
    expect(classifySpectroMetadataError(
      new TmdbHttpError("forbidden", 403, "movie/42")
    )).toBe("authentication");
  });

  it("reintenta límites de solicitudes y errores temporales del servidor", () => {
    expect(classifySpectroMetadataError(
      new TmdbHttpError("limited", 429, "movie/42", 2500)
    )).toBe("retryable");
    expect(classifySpectroMetadataError(
      new TmdbHttpError("timeout", 408, "movie/42")
    )).toBe("retryable");
    expect(classifySpectroMetadataError(
      new TmdbHttpError("server", 503, "movie/42")
    )).toBe("retryable");
  });
});
