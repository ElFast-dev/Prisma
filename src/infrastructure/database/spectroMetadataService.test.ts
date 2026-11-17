import { describe, expect, it } from "vitest";
import type { MovieRecord } from "../../domain/types";
import { TmdbHttpError } from "../tmdb/TmdbClient";
import {
  classifySpectroMetadataError,
  getSpectroMetadataPriority,
  getSpectroMetadataRetryDelay,
  isSpectroMetadataIncomplete,
  isSpectroMetadataRetryDeferred
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
  keywords: [],
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

  it("vuelve a consultar temas solo cuando aún no se han descargado", () => {
    expect(isSpectroMetadataIncomplete({
      ...completeMovie,
      keywords: undefined
    })).toBe(true);
    expect(isSpectroMetadataIncomplete({
      ...completeMovie,
      keywords: []
    })).toBe(false);
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


describe("Espectro · pausa de reintentos", () => {
  const now = Date.parse("2026-11-16T12:00:00.000Z");

  it("mantiene visible un error reciente durante la ventana de espera", () => {
    expect(isSpectroMetadataRetryDeferred({
      status: "error",
      updatedAt: new Date(now - 60 * 60 * 1000).toISOString()
    }, now)).toBe(true);
  });

  it("calcula el plazo restante y permite consultar al cumplir las 12 horas", () => {
    expect(getSpectroMetadataRetryDelay({
      status: "error",
      updatedAt: new Date(now - 60 * 60 * 1000).toISOString()
    }, now)).toBe(11 * 60 * 60 * 1000);
    expect(getSpectroMetadataRetryDelay({
      status: "error",
      updatedAt: new Date(now - 12 * 60 * 60 * 1000).toISOString()
    }, now)).toBe(0);
  });

  it("no difiere registros completos, no encontrados ni fechas inválidas", () => {
    expect(isSpectroMetadataRetryDeferred({
      status: "complete",
      updatedAt: new Date(now).toISOString()
    }, now)).toBe(false);
    expect(isSpectroMetadataRetryDeferred({
      status: "not-found",
      updatedAt: new Date(now).toISOString()
    }, now)).toBe(false);
    expect(isSpectroMetadataRetryDeferred({
      status: "error",
      updatedAt: "fecha inválida"
    }, now)).toBe(false);
  });
});

describe("Espectro · prioridad de enriquecimiento", () => {
  const pending = new Set(["pending", "also-favorite"]);
  const favorites = new Set(["favorite", "also-favorite"]);
  const viewed = new Set(["viewed"]);

  it("enriquece primero los títulos Pendientes para mejorar las propuestas de Inicio", () => {
    expect(getSpectroMetadataPriority("pending", pending, favorites, viewed)).toBe(0);
    expect(getSpectroMetadataPriority("also-favorite", pending, favorites, viewed)).toBe(0);
  });

  it("mantiene después favoritos, visionados y otros títulos del catálogo local", () => {
    expect(getSpectroMetadataPriority("favorite", pending, favorites, viewed)).toBe(1);
    expect(getSpectroMetadataPriority("viewed", pending, favorites, viewed)).toBe(2);
    expect(getSpectroMetadataPriority("catalog", pending, favorites, viewed)).toBe(3);
  });
});
