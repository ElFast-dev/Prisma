import { describe, expect, it } from "vitest";
import type { MovieRecord, Viewing } from "./types";
import { analyzeSpectro, SPECTRO_ALGORITHM_VERSION } from "./spectro";

const movie = (
  id: string,
  genre: string,
  genreId: number,
  year: number,
  overrides: Partial<MovieRecord> = {}
): MovieRecord => ({
  id,
  tmdbId: Number(id.replace("movie-", "")),
  title: id,
  genres: [genre],
  genreIds: [genreId],
  countries: ["Japón"],
  releaseYear: year,
  directors: ["Directora A"],
  castMembers: ["Actor A"],
  keywords: [],
  originalLanguage: "ja",
  runtimeMinutes: 110,
  lastViewingSequence: 0,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides
});

const viewing = (
  id: string,
  movieId: string,
  watchedOn: string,
  rating: number
): Viewing => ({
  id,
  movieId,
  sequenceNumber: 1,
  watchedOn,
  rating,
  createdAt: watchedOn + "T12:00:00.000Z",
  updatedAt: watchedOn + "T12:00:00.000Z",
  operationId: "op-" + id
});

describe("analyzeSpectro 2.2", () => {
  it("identifica la versión que separa las instantáneas anteriores", () => {
    expect(SPECTRO_ALGORITHM_VERSION).toBe("2.2.0");
  });

  it("usa temas TMDB como afinidades explícitas y motivos de recomendación", () => {
    const movies = [
      movie("theme-drama-1", "Drama", 18, 2018, { keywords: ["Memoria", "Sueños"] }),
      movie("theme-drama-2", "Drama", 18, 2019, { keywords: ["Memoria", "Sueños"] }),
      movie("theme-drama-3", "Drama", 18, 2020, { keywords: ["Memoria", "Sueños"] }),
      movie("theme-comedy-1", "Comedia", 35, 2018, { keywords: ["Amistad"] }),
      movie("theme-comedy-2", "Comedia", 35, 2019, { keywords: ["Amistad"] }),
      movie("theme-comedy-3", "Comedia", 35, 2020, { keywords: ["Amistad"] })
    ];
    const ratings = [10, 9, 10, 5, 6, 5];
    const viewings = movies.map((item, index) => viewing(
      "theme-view-" + index,
      item.id,
      "2026-01-" + String(index + 1).padStart(2, "0"),
      ratings[index]
    ));
    const candidate = movie("theme-candidate", "Drama", 18, 2024, {
      keywords: ["Memoria", "Sueños"]
    });
    const result = analyzeSpectro({ movies, viewings, candidates: [candidate] });

    expect(result.themeAffinities.find((item) => item.key === "theme:memoria")?.sampleSize).toBe(3);
    expect(result.recommendations[0]?.movie.id).toBe(candidate.id);
    expect(result.recommendations[0]?.reasons.some((reason) => reason.category === "Temas")).toBe(true);
    expect(result.networkGraph.nodes.some((node) => node.kind === "theme" && node.label === "Memoria")).toBe(true);
  });

  it("construye una red con cada película local, rasgos, influencia y grupos explicables", () => {
    const shared = {
      directors: ["Directora Prisma"],
      castMembers: ["Actor Prisma"],
      keywords: ["Memoria", "Identidad"]
    };
    const movies = [
      movie("network-seen-1", "Drama", 18, 2019, shared),
      movie("network-seen-2", "Drama", 18, 2020, shared),
      movie("network-seen-3", "Drama", 18, 2021, shared),
      movie("network-candidate", "Drama", 18, 2024, shared),
      movie("network-unexplored", "Terror", 27, 2024, {
        directors: ["Otra dirección"],
        castMembers: ["Otro actor"],
        keywords: ["Monstruos"]
      })
    ];
    const viewings = [
      viewing("network-v1", "network-seen-1", "2026-01-01", 10),
      viewing("network-v2", "network-seen-2", "2026-01-02", 9),
      viewing("network-v3", "network-seen-3", "2026-01-03", 10)
    ];
    const result = analyzeSpectro({
      movies,
      viewings,
      candidates: movies.filter((item) => !viewings.some((viewingItem) => viewingItem.movieId === item.id))
    });
    const graph = result.networkGraph;
    const seenNode = graph.nodes.find((node) => node.id === "movie:network-seen-1");
    const unexploredNode = graph.nodes.find((node) => node.id === "movie:network-unexplored");
    const themeNode = graph.nodes.find((node) => node.id === "feature:theme:memoria");

    expect(graph.nodes.filter((node) => node.kind === "movie")).toHaveLength(movies.length);
    expect(seenNode?.state).toBe("explored");
    expect(unexploredNode?.state).toBe("unexplored");
    expect(themeNode?.connections).toBe(4);
    expect(themeNode?.influence).toBeGreaterThan(0);
    expect(graph.edges.some((edge) => edge.source === "movie:network-seen-1" && edge.target === themeNode?.id)).toBe(true);
    expect(graph.clusters.some((cluster) => cluster.movieIds.includes("network-seen-1") && cluster.movieIds.includes("network-candidate"))).toBe(true);
    expect(graph.stats.explored).toBe(3);
    expect(graph.stats.unexplored).toBe(2);
    expect(graph.stats.connections).toBe(graph.edges.length);
  });

  it("distribuye películas aisladas en zonas pequeñas sin superponer todo el catálogo", () => {
    const movies = Array.from({ length: 25 }, (_, index) => {
      const id = index + 1;
      return movie("movie-" + id, "Género " + id, 5000 + id, 1980 + id, {
        directors: ["Dirección " + id],
        castMembers: ["Actor " + id],
        keywords: ["Tema " + id]
      });
    });
    const graph = analyzeSpectro({
      movies,
      viewings: [],
      candidates: []
    }).networkGraph;
    const isolatedZones = graph.clusters.filter((cluster) => cluster.similarity === 0);
    const memberCount = isolatedZones.reduce((sum, cluster) => sum + cluster.movieIds.length, 0);

    expect(isolatedZones.length).toBe(4);
    expect(Math.max(...isolatedZones.map((cluster) => cluster.movieIds.length))).toBeLessThanOrEqual(8);
    expect(memberCount).toBe(movies.length);
    expect(new Set(isolatedZones.map((cluster) => cluster.id)).size).toBe(isolatedZones.length);
  });

  it("no infiere afinidades antes de tres películas distintas calificadas", () => {
    const result = analyzeSpectro({
      movies: [movie("movie-1", "Drama", 18, 1995), movie("movie-2", "Drama", 18, 2005)],
      viewings: [viewing("v1", "movie-1", "2026-01-01", 10), viewing("v2", "movie-2", "2026-01-02", 9)],
      candidates: []
    });

    expect(result.hasEnoughData).toBe(false);
    expect(result.genreAffinities).toEqual([]);
    expect(result.recommendations).toEqual([]);
  });

  it("calcula afinidades con títulos distintos y reduce el peso de muestras pequeñas", () => {
    const movies = [
      movie("movie-1", "Drama", 18, 1995),
      movie("movie-2", "Drama", 18, 2005),
      movie("movie-3", "Comedia", 35, 2015)
    ];
    const result = analyzeSpectro({
      movies,
      viewings: [
        viewing("v1", "movie-1", "2026-01-01", 10),
        viewing("v2", "movie-1", "2026-01-08", 8),
        viewing("v3", "movie-2", "2026-01-12", 9),
        viewing("v4", "movie-3", "2026-02-01", 6)
      ],
      candidates: []
    });

    const drama = result.genreAffinities.find((item) => item.label === "Drama");
    expect(result.totalViewings).toBe(4);
    expect(result.movieCount).toBe(3);
    expect(result.averageRating).toBe(8);
    expect(drama?.sampleSize).toBe(2);
    expect(drama?.averageRating).toBe(9);
    expect(drama?.confidence).toBe("inicial");
    expect(drama?.adjustedDifference).toBe(0.4);
  });

  it("recomienda candidatas por varias señales locales y explica el respaldo", () => {
    const movies = [
      movie("movie-1", "Drama", 18, 2015),
      movie("movie-2", "Drama", 18, 2016),
      movie("movie-3", "Drama", 18, 2017),
      movie("movie-4", "Comedia", 35, 2005, {
        countries: ["México"], directors: ["Director B"], castMembers: ["Actor B"],
        originalLanguage: "es", runtimeMinutes: 85
      }),
      movie("movie-5", "Comedia", 35, 2006, {
        countries: ["México"], directors: ["Director B"], castMembers: ["Actor B"],
        originalLanguage: "es", runtimeMinutes: 88
      }),
      movie("movie-6", "Comedia", 35, 2007, {
        countries: ["México"], directors: ["Director B"], castMembers: ["Actor B"],
        originalLanguage: "es", runtimeMinutes: 90
      })
    ];
    const ratings = [10, 9, 10, 5, 6, 5];
    const viewings = movies.map((item, index) => viewing(
      "v" + (index + 1),
      item.id,
      "2026-01-" + String(index + 1).padStart(2, "0"),
      ratings[index]
    ));
    const candidate = movie("movie-7", "Drama", 18, 2024);
    const result = analyzeSpectro({ movies, viewings, candidates: [candidate] });

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].movie.id).toBe(candidate.id);
    expect(result.recommendations[0].reasons.map((reason) => reason.category)).toEqual(
      expect.arrayContaining(["Género", "Dirección", "Reparto", "País", "Idioma original", "Duración"])
    );
    expect(result.languageAffinities.find((item) => item.key === "language:ja")?.sampleSize).toBe(3);
    expect(result.durationAffinities.find((item) => item.key === "duration:medium")?.sampleSize).toBe(3);
    expect(result.recommendations[0].confidence).toBe("moderada");
    expect(result.recommendations[0].reasons.every((reason) => reason.sampleSize === 3)).toBe(true);
    expect(result.recommendations[0].fitPercentage).toBeGreaterThan(50);
    expect(result.recommendations[0].fitPercentage).toBeLessThanOrEqual(100);
    expect(result.recommendations[0].predictedRating).toBeGreaterThan(7.5);
    expect(result.recommendations[0].predictedRating).toBeLessThanOrEqual(10);
    expect(result.decisionGraph.candidateCount).toBe(1);
    expect(result.decisionGraph.signalCount).toBeGreaterThan(0);
  });

  it("resta puntos por señales negativas y muestra su contribución en el grafo", () => {
    const movies = [
      movie("movie-1", "Drama", 18, 2015),
      movie("movie-2", "Drama", 18, 2016),
      movie("movie-3", "Drama", 18, 2017),
      movie("movie-4", "Comedia", 35, 2005, {
        countries: ["México"], directors: ["Director B"], castMembers: ["Actor B"],
        originalLanguage: "es", runtimeMinutes: 85
      }),
      movie("movie-5", "Comedia", 35, 2006, {
        countries: ["México"], directors: ["Director B"], castMembers: ["Actor B"],
        originalLanguage: "es", runtimeMinutes: 88
      }),
      movie("movie-6", "Comedia", 35, 2007, {
        countries: ["México"], directors: ["Director B"], castMembers: ["Actor B"],
        originalLanguage: "es", runtimeMinutes: 90
      })
    ];
    const ratings = [10, 9, 10, 5, 6, 5];
    const viewings = movies.map((item, index) => viewing(
      "v" + (index + 1), item.id, "2026-01-" + String(index + 1).padStart(2, "0"), ratings[index]
    ));
    const positive = movie("movie-7", "Drama", 18, 2024);
    const mixed = movie("movie-8", "Drama", 18, 2024, { directors: ["Director B"] });
    const negative = movie("movie-9", "Comedia", 35, 2024, {
      countries: ["México"], directors: ["Director B"], castMembers: ["Actor B"],
      originalLanguage: "es", runtimeMinutes: 85
    });
    const result = analyzeSpectro({
      movies,
      viewings,
      candidates: [positive, mixed, negative]
    });
    const positiveMatch = result.recommendations.find((item) => item.movie.id === positive.id);
    const mixedMatch = result.recommendations.find((item) => item.movie.id === mixed.id);

    expect(positiveMatch).toBeDefined();
    expect(mixedMatch).toBeDefined();
    expect(mixedMatch?.fitPercentage).toBeLessThan(positiveMatch?.fitPercentage ?? 100);
    expect(result.recommendations.some((item) => item.movie.id === negative.id)).toBe(false);
    expect(mixedMatch?.reasons.some((reason) => reason.difference < 0)).toBe(true);
    expect(result.decisionGraph.edges.some((edge) => edge.polarity === "negative")).toBe(true);
  });

  it("usa favoritos como señales explícitas sin inventar una calificación", () => {
    const movies = [
      movie("movie-1", "Drama", 18, 2015),
      movie("movie-2", "Drama", 18, 2016),
      movie("movie-3", "Drama", 18, 2017),
      movie("movie-4", "Terror", 27, 2020, {
        countries: ["Estados Unidos"], directors: ["Director Z"], castMembers: ["Actor Z"],
        originalLanguage: "en", runtimeMinutes: 160
      })
    ];
    const viewings = [
      viewing("v1", "movie-1", "2026-01-01", 8),
      viewing("v2", "movie-2", "2026-01-02", 8),
      viewing("v3", "movie-3", "2026-01-03", 8)
    ];
    const candidate = movie("movie-5", "Terror", 27, 2024, {
      countries: ["Estados Unidos"], directors: ["Director Z"], castMembers: ["Actor Z"],
      originalLanguage: "en", runtimeMinutes: 160
    });
    const result = analyzeSpectro({
      movies,
      viewings,
      candidates: [candidate],
      favoriteMovieIds: ["movie-4"]
    });
    const recommendation = result.recommendations[0];

    expect(result.favoriteSignals.find((signal) => signal.key === "genre:27")?.sampleSize).toBe(1);
    expect(recommendation?.fitPercentage).toBeGreaterThan(50);
    expect(recommendation?.predictedRating).toBe(8);
    expect(recommendation?.confidence).toBe("declarada");
    expect(recommendation?.reasons.some((reason) => reason.source === "favoritos")).toBe(true);
    expect(result.decisionGraph.nodes.some((node) => node.source === "favoritos")).toBe(true);
  });

  it("no eleva la confianza por varias coincidencias dentro de una sola familia", () => {
    const movies: MovieRecord[] = [];
    const viewings: Viewing[] = [];
    const groups = [
      { genre: "Drama", genreId: 18, rating: 10, prefix: "drama" },
      { genre: "Documental", genreId: 99, rating: 10, prefix: "documentary" },
      { genre: "Comedia", genreId: 35, rating: 5, prefix: "comedy" }
    ];

    for (const group of groups) {
      for (let index = 0; index < 5; index += 1) {
        const item = movie(group.prefix + "-" + index, group.genre, group.genreId, 0, {
          countries: [],
          directors: [],
          castMembers: [],
          originalLanguage: "",
          runtimeMinutes: 0,
          releaseYear: 0
        });
        movies.push(item);
        viewings.push(viewing(
          "view-" + group.prefix + "-" + index,
          item.id,
          "2026-01-" + String(index + 1).padStart(2, "0"),
          group.rating
        ));
      }
    }

    const candidate = movie("candidate-multiple-genres", "Drama", 18, 0, {
      genres: ["Drama", "Documental"],
      genreIds: [18, 99],
      countries: [],
      directors: [],
      castMembers: [],
      originalLanguage: "",
      runtimeMinutes: 0,
      releaseYear: 0
    });
    const result = analyzeSpectro({ movies, viewings, candidates: [candidate] });
    const recommendation = result.recommendations[0];

    expect(recommendation).toBeDefined();
    expect(recommendation?.reasons.map((reason) => reason.category)).toEqual(["Género", "Género"]);
    expect(recommendation?.confidence).toBe("inicial");
  });

  it("no recomienda una afinidad respaldada solo por dos películas", () => {
    const movies = [
      movie("movie-1", "Drama", 18, 1995),
      movie("movie-2", "Drama", 18, 2005),
      movie("movie-3", "Comedia", 35, 2015)
    ];
    const result = analyzeSpectro({
      movies,
      viewings: [
        viewing("v1", "movie-1", "2026-01-01", 10),
        viewing("v2", "movie-2", "2026-01-02", 9),
        viewing("v3", "movie-3", "2026-01-03", 5)
      ],
      candidates: [movie("movie-4", "Drama", 18, 2022)]
    });

    expect(result.genreAffinities.find((item) => item.label === "Drama")?.sampleSize).toBe(2);
    expect(result.recommendations).toEqual([]);
  });

  it("mantiene la evolución mensual basada en visionados con calificación", () => {
    const result = analyzeSpectro({
      movies: [movie("movie-1", "Drama", 18, 1995), movie("movie-2", "Drama", 18, 2005), movie("movie-3", "Comedia", 35, 2015)],
      viewings: [
        viewing("v1", "movie-1", "2026-01-12", 8),
        viewing("v2", "movie-2", "2026-03-01", 10),
        viewing("v3", "movie-3", "2026-03-18", 6)
      ],
      candidates: []
    });

    expect(result.evolution).toEqual([
      { month: "2026-01", averageRating: 8, viewingCount: 1 },
      { month: "2026-03", averageRating: 8, viewingCount: 2 }
    ]);
  });

  it("compara afinidades entre periodos solo con tres títulos distintos por rasgo", () => {
    const movies: MovieRecord[] = [];
    const viewings: Viewing[] = [];
    const addPeriod = (prefix: string, date: string, dramaRatings: number[], comedyRatings: number[]) => {
      dramaRatings.forEach((rating, index) => {
        const item = movie(prefix + "-drama-" + index, "Drama", 18, 2010 + index * 10, {
          countries: [], directors: [], castMembers: [], originalLanguage: "", runtimeMinutes: 0
        });
        movies.push(item);
        viewings.push(viewing(prefix + "-drama-view-" + index, item.id, date, rating));
      });
      comedyRatings.forEach((rating, index) => {
        const item = movie(prefix + "-comedy-" + index, "Comedia", 35, 1980 + index * 10, {
          countries: [], directors: [], castMembers: [], originalLanguage: "", runtimeMinutes: 0
        });
        movies.push(item);
        viewings.push(viewing(prefix + "-comedy-view-" + index, item.id, date, rating));
      });
    };

    addPeriod("previous", "2025-01-30", [6, 6, 6], [9, 9, 9]);
    addPeriod("recent", "2026-02-02", [10, 10, 10], [5, 5, 5]);

    const result = analyzeSpectro({ movies, viewings, candidates: [] });
    const dramaTrend = result.affinityTrends.find((item) => item.key === "genre:18");

    expect(dramaTrend).toBeDefined();
    expect(dramaTrend?.previousSampleSize).toBe(3);
    expect(dramaTrend?.recentSampleSize).toBe(3);
    expect(dramaTrend?.direction).toBe("sube");
    expect(dramaTrend?.change).toBeGreaterThan(2);
  });

  it("no presenta tendencias con menos de tres títulos distintos en cada periodo", () => {
    const movies = [
      movie("movie-1", "Drama", 18, 1995),
      movie("movie-2", "Drama", 18, 2005),
      movie("movie-3", "Comedia", 35, 2015)
    ];
    const result = analyzeSpectro({
      movies,
      viewings: [
        viewing("v1", "movie-1", "2025-01-01", 8),
        viewing("v2", "movie-2", "2026-01-01", 9),
        viewing("v3", "movie-3", "2026-02-01", 6)
      ],
      candidates: []
    });

    expect(result.affinityTrends).toEqual([]);
  });

  it("incluye idioma y duración en la huella que invalida instantáneas", () => {
    const movies = [
      movie("movie-1", "Drama", 18, 1995),
      movie("movie-2", "Drama", 18, 2005),
      movie("movie-3", "Comedia", 35, 2015)
    ];
    const viewings = [
      viewing("v1", "movie-1", "2026-01-01", 8),
      viewing("v2", "movie-2", "2026-01-02", 9),
      viewing("v3", "movie-3", "2026-01-03", 6)
    ];
    const before = analyzeSpectro({ movies, viewings, candidates: [] });
    const after = analyzeSpectro({
      movies: movies.map((item) => item.id === "movie-1"
        ? { ...item, originalLanguage: "fr", runtimeMinutes: 145 }
        : item),
      viewings,
      candidates: []
    });

    expect(after.inputFingerprint).not.toBe(before.inputFingerprint);
  });
});
