import { describe, expect, it } from "vitest";
import type { MovieRecord } from "./types";
import {
  applySpectroMetadataSnapshot,
  createSpectroMetadataSnapshot,
  getSpectroMetadataFingerprint,
  isSpectroMetadataSnapshot,
  selectSpectroMetadataSnapshot
} from "./spectroMetadataHistory";

function movie(): MovieRecord {
  return {
    id: "tmdb-77",
    tmdbId: 77,
    title: "Película de prueba",
    overview: "Drama conocido al principio.",
    genres: ["Drama"],
    genreIds: [18],
    countries: ["Japón"],
    directors: ["Dirección original"],
    castMembers: ["Reparto original"],
    keywords: ["memoria"],
    originalLanguage: "ja",
    releaseYear: 2001,
    runtimeMinutes: 110,
    lastViewingSequence: 1,
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2026-01-05T12:00:00.000Z"
  };
}

describe("historial temporal de metadatos de Espectro", () => {
  it("captura solo los rasgos que intervienen en el predictor", () => {
    const snapshot = createSpectroMetadataSnapshot(
      movie(),
      "2026-01-05T12:00:00.000Z",
      "legacy-updated-at"
    );

    expect(snapshot).toMatchObject({
      movieId: "tmdb-77",
      source: "legacy-updated-at",
      genres: ["Drama"],
      genreIds: [18],
      overview: "Drama conocido al principio.",
      keywords: ["memoria"]
    });
    expect(snapshot).not.toHaveProperty("title");
    expect(snapshot).not.toHaveProperty("tmdbId");
    expect(snapshot).not.toHaveProperty("createdAt");
  });

  it("selecciona la última observación estrictamente anterior al corte", () => {
    const first = createSpectroMetadataSnapshot(
      movie(),
      "2026-01-05T12:00:00.000Z",
      "legacy-updated-at"
    )!;
    const second = createSpectroMetadataSnapshot({
      ...movie(),
      overview: "Metadatos observados antes del corte.",
      genres: ["Drama", "Misterio"]
    }, "2026-01-11T08:30:00.000Z", "tmdb-observed")!;
    const sameDay = createSpectroMetadataSnapshot({
      ...movie(),
      overview: "No debe entrar por ser del día del corte."
    }, "2026-01-12T23:59:00.000Z", "tmdb-observed")!;
    const future = createSpectroMetadataSnapshot({
      ...movie(),
      overview: "Metadatos futuros."
    }, "2026-01-13T00:00:00.000Z", "tmdb-observed")!;

    expect(selectSpectroMetadataSnapshot(
      [first, second, sameDay, future],
      "tmdb-77",
      "2026-01-12"
    )).toEqual(second);
  });

  it("no reutiliza una observación del mismo día ni una posterior", () => {
    const sameDay = createSpectroMetadataSnapshot(
      movie(),
      "2026-01-12T00:01:00.000Z",
      "tmdb-observed"
    )!;
    const future = createSpectroMetadataSnapshot(
      movie(),
      "2026-01-13T00:00:00.000Z",
      "tmdb-observed"
    )!;

    expect(selectSpectroMetadataSnapshot([sameDay, future], "tmdb-77", "2026-01-12"))
      .toBeNull();
  });

  it("sustituye metadatos futuros por la instantánea histórica sin completar campos ausentes", () => {
    const current = {
      ...movie(),
      overview: "Sinopsis de hoy.",
      genres: ["Acción", "Ciencia ficción"],
      genreIds: [28, 878],
      countries: ["Estados Unidos"],
      directors: ["Director actual"],
      castMembers: ["Reparto actual"],
      keywords: ["viaje espacial"],
      originalLanguage: "en",
      releaseYear: 2025,
      runtimeMinutes: 160
    };
    const snapshot = createSpectroMetadataSnapshot({
      ...movie(),
      overview: "Sinopsis antigua.",
      genres: ["Drama"],
      countries: ["Japón"],
      directors: [],
      keywords: []
    }, "2025-12-15T00:00:00.000Z", "legacy-updated-at")!;

    const historical = applySpectroMetadataSnapshot(current, snapshot);
    expect(historical.title).toBe(current.title);
    expect(historical.overview).toBe("Sinopsis antigua.");
    expect(historical.genres).toEqual(["Drama"]);
    expect(historical.genreIds).toEqual([18]);
    expect(historical.countries).toEqual(["Japón"]);
    expect(historical.directors).toEqual([]);
    expect(historical.castMembers).toEqual(["Reparto original"]);
    expect(historical.keywords).toEqual([]);
    expect(historical.originalLanguage).toBe("ja");
    expect(historical.releaseYear).toBe(2001);
    expect(historical.runtimeMinutes).toBe(110);
  });

  it("valida instantáneas persistidas y rechaza fechas o fuentes inválidas", () => {
    const valid = createSpectroMetadataSnapshot(movie(), "2026-01-05T12:00:00.000Z", "tmdb-observed")!;
    expect(isSpectroMetadataSnapshot(valid)).toBe(true);
    expect(isSpectroMetadataSnapshot({ ...valid, observedAt: "no-es-fecha" })).toBe(false);
    expect(isSpectroMetadataSnapshot({ ...valid, source: "catalog-current" })).toBe(false);
    expect(isSpectroMetadataSnapshot({ ...valid, genres: "Drama" })).toBe(false);
    expect(createSpectroMetadataSnapshot(movie(), "no-es-fecha", "tmdb-observed")).toBeNull();
  });

  it("normaliza el orden de características en la huella", () => {
    const left = createSpectroMetadataSnapshot(movie(), "2026-01-05T12:00:00.000Z", "tmdb-observed")!;
    const right = {
      ...left,
      genres: [...left.genres].reverse(),
      countries: [...left.countries].reverse(),
      keywords: [...(left.keywords ?? [])].reverse()
    };
    expect(getSpectroMetadataFingerprint(left)).toBe(getSpectroMetadataFingerprint(right));
  });
});
