import { describe, expect, it } from "vitest";
import type { MovieRecord } from "./types";
import type { SpectroRecommendation } from "./spectro";
import { selectHomePicks } from "./homeSelection";

function movie(id: string, genres: string[], overrides: Partial<MovieRecord> = {}): MovieRecord {
  return {
    id,
    tmdbId: Number(id.replace(/\D/g, "")) || 1,
    title: id,
    genres,
    genreIds: genres.map((genre) => genre === "Drama" ? 18 : genre === "Ciencia ficción" ? 878 : 27),
    countries: ["Japón"],
    directors: ["Dirección conocida"],
    castMembers: ["Reparto conocido"],
    keywords: ["memoria"],
    originalLanguage: "ja",
    releaseYear: 2024,
    runtimeMinutes: 110,
    lastViewingSequence: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

function recommendation(
  item: MovieRecord,
  fitPercentage: number,
  confidence: SpectroRecommendation["confidence"],
  reasonLabel = "Drama"
): SpectroRecommendation {
  return {
    movie: item,
    fitPercentage,
    predictedRating: 7.4,
    confidence,
    reasons: [{
      key: "genre:18",
      category: "Género",
      label: reasonLabel,
      source: "valoraciones",
      difference: 1,
      contribution: 2,
      sampleSize: 8,
      confidence
    }]
  };
}

describe("selección de Inicio", () => {
  it("distingue apuesta segura, descubrimiento y exploración sin inventar estimaciones", () => {
    const safe = movie("movie-1", ["Drama"]);
    const discovery = movie("movie-2", ["Drama", "Ciencia ficción"], {
      directors: ["Otra dirección"],
      castMembers: ["Otro reparto"],
      keywords: ["identidad", "viajes en el tiempo"]
    });
    const outside = movie("movie-3", ["Terror"], {
      genreIds: [27],
      directors: ["Dirección desconocida"],
      castMembers: ["Reparto desconocido"],
      keywords: ["fantasía oscura"],
      countries: ["Francia"],
      originalLanguage: "fr"
    });

    const picks = selectHomePicks({
      candidates: [safe, discovery, outside],
      recommendations: [
        recommendation(safe, 92, "sólida"),
        recommendation(discovery, 78, "moderada")
      ],
      pendingMovieIds: [safe.id],
      knownFeatureKeys: ["genre:18", "director:dirección conocida", "cast:reparto conocido", "theme:memoria"]
    });

    expect(picks.map((pick) => pick.kind)).toEqual(["safe", "discovery", "outside"]);
    expect(picks[0].movie.id).toBe(safe.id);
    expect(picks[0].source).toBe("pending");
    expect(picks[1].movie.id).toBe(discovery.id);
    expect(picks[2].movie.id).toBe(outside.id);
    expect(picks[2].fitPercentage).toBeNull();
    expect(picks[2].predictedRating).toBeNull();
    expect(picks[2].confidence).toBe("insuficiente");
    expect(new Set(picks.map((pick) => pick.movie.id)).size).toBe(3);
  });

  it("no crea una nota estimada cuando no hay candidatas con afinidades respaldadas", () => {
    const unknown = movie("movie-4", ["Terror"], {
      genreIds: [27],
      directors: ["Nueva dirección"],
      castMembers: ["Nuevo reparto"],
      keywords: ["inexplorado"]
    });
    const picks = selectHomePicks({
      candidates: [unknown],
      recommendations: [],
      pendingMovieIds: [],
      knownFeatureKeys: []
    });

    expect(picks).toHaveLength(1);
    expect(picks[0].kind).toBe("outside");
    expect(picks[0].fitPercentage).toBeNull();
    expect(picks[0].predictedRating).toBeNull();
    expect(picks[0].explanation).toContain("evidencia suficiente");
  });

  it("no propone títulos sin características cinematográficas mínimas", () => {
    const incomplete = movie("movie-5", [], {
      genres: [],
      genreIds: [],
      countries: [],
      directors: [],
      castMembers: [],
      keywords: [],
      originalLanguage: undefined,
      runtimeMinutes: undefined
    });
    const picks = selectHomePicks({
      candidates: [incomplete],
      recommendations: [],
      pendingMovieIds: [incomplete.id],
      knownFeatureKeys: []
    });
    expect(picks).toHaveLength(0);
  });
});
