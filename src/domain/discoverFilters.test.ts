import { describe, expect, it } from "vitest";
import {
  appendDiscoverMovies,
  appendDiscoverSpectroRecommendations,
  buildDiscoverMovieParams,
  countActiveDiscoverFilters,
  DEFAULT_DISCOVER_FILTERS,
  DISCOVER_LANGUAGES,
  discoverFilterTitleMatch,
  filterDiscoverLibraryVisibility,
  hasActiveDiscoverFilters,
  normalizeDiscoverFilters,
  selectDiscoverSpectroMovies
} from "./discoverFilters";

describe("Discover filters", () => {
  it("starts without optional filters so the trending feed remains unchanged", () => {
    expect(hasActiveDiscoverFilters(DEFAULT_DISCOVER_FILTERS)).toBe(false);
    expect(countActiveDiscoverFilters(DEFAULT_DISCOVER_FILTERS)).toBe(2);
  });

  it("uses Spectro by default and preserves explicit catalog sorting", () => {
    expect(DEFAULT_DISCOVER_FILTERS.sortBy).toBe("spectro");
    expect(hasActiveDiscoverFilters(DEFAULT_DISCOVER_FILTERS)).toBe(false);
    expect(buildDiscoverMovieParams(DEFAULT_DISCOVER_FILTERS, 1).sort_by).toBe("popularity.desc");

    const explicitPopularity = normalizeDiscoverFilters({ sortBy: "popularity.desc" });
    expect(hasActiveDiscoverFilters(explicitPopularity)).toBe(true);
    expect(buildDiscoverMovieParams(explicitPopularity, 1).sort_by).toBe("popularity.desc");
  });

  it("normalizes numeric inputs and repairs inverted ranges", () => {
    expect(normalizeDiscoverFilters({
      ...DEFAULT_DISCOVER_FILTERS,
      runtimeMin: "720",
      runtimeMax: "40",
      yearFrom: "2030",
      yearTo: "1990",
      minVoteAverage: "8.77",
      minVoteCount: "-5"
    })).toMatchObject({
      runtimeMin: "600",
      runtimeMax: "",
      yearFrom: "2030",
      yearTo: "",
      minVoteAverage: "8.8",
      minVoteCount: "1"
    });
  });

  it("builds TMDB discover parameters for runtime, genre, release years and quality", () => {
    const params = buildDiscoverMovieParams({
      ...DEFAULT_DISCOVER_FILTERS,
      genreId: "18",
      runtimeMin: "90",
      runtimeMax: "120",
      yearFrom: "2010",
      yearTo: "2024",
      minVoteAverage: "7.5",
      minVoteCount: "500",
      originalLanguage: "ja",
      sortBy: "vote_average.desc"
    }, 3);

    expect(params).toEqual({
      page: 3,
      language: "es-MX",
      include_adult: false,
      include_video: false,
      sort_by: "vote_average.desc",
      with_genres: "18",
      "with_runtime.gte": 90,
      "with_runtime.lte": 120,
      "primary_release_date.gte": "2010-01-01",
      "primary_release_date.lte": "2024-12-31",
      "vote_average.gte": 7.5,
      "vote_count.gte": 500,
      with_original_language: "ja"
    });
  });

  it("counts independent filter groups and treats a non-default sort as active", () => {
    const filters = {
      ...DEFAULT_DISCOVER_FILTERS,
      runtimeMin: "90",
      runtimeMax: "120",
      yearFrom: "2000",
      yearTo: "2020",
      sortBy: "revenue.desc" as const
    };

    expect(hasActiveDiscoverFilters(filters)).toBe(true);
    expect(countActiveDiscoverFilters(filters)).toBe(5);
  });

  it("keeps watched and pending exclusions as local discover preferences", () => {
    expect(DEFAULT_DISCOVER_FILTERS.hideWatched).toBe(true);
    expect(DEFAULT_DISCOVER_FILTERS.hidePending).toBe(true);
    expect(normalizeDiscoverFilters({ hideWatched: false, hidePending: true }))
      .toMatchObject({ hideWatched: false, hidePending: true });
    expect(buildDiscoverMovieParams({
      ...DEFAULT_DISCOVER_FILTERS,
      hideWatched: true,
      hidePending: true
    }, 1)).not.toHaveProperty("hideWatched");
  });

  it("hides watched and pending titles independently from the downloaded catalog", () => {
    const movies = [
      { id: 10, title: "Ya vista" },
      { id: 20, title: "Pendiente" },
      { id: 30, title: "Vista y pendiente" },
      { id: 40, title: "Sin guardar" }
    ];
    const watched = new Set([10, 30]);
    const pending = new Set([20, 30]);

    expect(filterDiscoverLibraryVisibility(movies, watched, pending, {
      hideWatched: true,
      hidePending: true
    }).map((movie) => movie.id)).toEqual([40]);
    expect(filterDiscoverLibraryVisibility(movies, watched, pending, {
      hideWatched: false,
      hidePending: true
    }).map((movie) => movie.id)).toEqual([10, 40]);
    expect(filterDiscoverLibraryVisibility(movies, watched, pending, {
      hideWatched: true,
      hidePending: false
    }).map((movie) => movie.id)).toEqual([20, 40]);
  });

  it("returns every downloaded title when both local exclusions are disabled", () => {
    const movies = [{ id: 10 }, { id: 20 }, { id: 30 }];
    expect(filterDiscoverLibraryVisibility(
      movies,
      new Set([10, 20]),
      new Set([20, 30]),
      { hideWatched: false, hidePending: false }
    )).toEqual(movies);
  });

  it("offers a broad set of original-language options for filtering", () => {
    expect(DISCOVER_LANGUAGES.map((language) => language.id)).toContain("pl");
    expect(DISCOVER_LANGUAGES.map((language) => language.id)).toContain("tr");
    expect(DISCOVER_LANGUAGES.map((language) => language.id)).toContain("ar");
    expect(DISCOVER_LANGUAGES.map((language) => language.id)).toEqual([...new Set(DISCOVER_LANGUAGES.map((language) => language.id))]);
    for (const language of ["bn", "fa", "ta", "te", "uk", "ur", "vi", "el", "fi", "ca"]) {
      expect(DISCOVER_LANGUAGES.map((item) => item.id)).toContain(language);
    }
  });

  it("matches a title or original title without accents or case sensitivity", () => {
    expect(discoverFilterTitleMatch("Amélie", "Le Fabuleux Destin", "amelie")).toBe(true);
    expect(discoverFilterTitleMatch("Prisma Film", "Película Prisma", "PELÍCULA")).toBe(true);
    expect(discoverFilterTitleMatch("Otra película", "Another Movie", "prisma")).toBe(false);
    expect(discoverFilterTitleMatch("Otra película", undefined, "   ")).toBe(true);
  });

  it("appends new catalog pages without moving existing results or duplicating IDs", () => {
    const firstPage = [{ id: 10 }, { id: 20 }, { id: 30 }];
    const nextPage = [{ id: 30 }, { id: 40 }, { id: 50 }];

    expect(appendDiscoverMovies(firstPage, nextPage))
      .toEqual([{ id: 10 }, { id: 20 }, { id: 30 }, { id: 40 }, { id: 50 }]);
  });

  it("appends each new Spectro page after existing recommendations without reranking them", () => {
    const firstPage = [
      { movie: { tmdbId: 20 }, predictedRating: 9 },
      { movie: { tmdbId: 10 }, predictedRating: 8 }
    ];
    const nextPage = [
      { movie: { tmdbId: 40 }, predictedRating: 10 },
      { movie: { tmdbId: 20 }, predictedRating: 9.5 },
      { movie: { tmdbId: 30 }, predictedRating: 7 }
    ];

    expect(appendDiscoverSpectroRecommendations(firstPage, nextPage))
      .toEqual([firstPage[0], firstPage[1], nextPage[0], nextPage[2]]);
  });

  it("shows only movies personally recommended by Spectro, in recommendation order", () => {
    const catalog = [
      { id: 101, title: "Resultado antiguo A" },
      { id: 102, title: "Resultado antiguo B" },
      { id: 103, title: "Recomendación favorita" },
      { id: 104, title: "Resultado antiguo C" },
      { id: 105, title: "Otra recomendación" }
    ];
    const recommendations = [
      { movie: { tmdbId: 105 } },
      { movie: { tmdbId: 103 } }
    ];

    expect(selectDiscoverSpectroMovies(catalog, recommendations, "spectro"))
      .toEqual([catalog[4], catalog[2]]);
  });

  it("keeps the full catalog for explicit sorting or when Spectro has no matches", () => {
    const catalog = [
      { id: 101, title: "Película A" },
      { id: 102, title: "Película B" }
    ];
    const recommendation = [{ movie: { tmdbId: 102 } }];

    expect(selectDiscoverSpectroMovies(catalog, recommendation, "popularity.desc"))
      .toEqual(catalog);
    expect(selectDiscoverSpectroMovies(catalog, [], "spectro")).toEqual(catalog);
  });

});
