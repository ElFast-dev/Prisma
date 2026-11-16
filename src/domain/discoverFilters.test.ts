import { describe, expect, it } from "vitest";
import {
  buildDiscoverMovieParams,
  EMPTY_DISCOVER_FILTERS,
  getDiscoverActiveFilterCount,
  normalizeDiscoverFilters
} from "./discoverFilters";

describe("filtros reales de Descubrir", () => {
  it("traduce varios géneros a OR y criterios separados a AND en TMDB", () => {
    const params = buildDiscoverMovieParams({
      ...EMPTY_DISCOVER_FILTERS,
      genres: [878, 18],
      yearFrom: "1990",
      yearTo: "2020",
      runtimeFrom: "90",
      runtimeTo: "160",
      originCountry: "PA",
      originalLanguage: "ja",
      sortBy: "rating"
    }, 2);

    expect(params).toEqual({
      include_adult: false,
      language: "es-MX",
      page: 2,
      sort_by: "vote_average.desc",
      with_genres: "18|878",
      "primary_release_date.gte": "1990-01-01",
      "primary_release_date.lte": "2020-12-31",
      "with_runtime.gte": 90,
      "with_runtime.lte": 160,
      with_origin_country: "PA",
      with_original_language: "ja"
    });
  });

  it("omite los criterios vacíos y mantiene el feed por popularidad como base", () => {
    expect(buildDiscoverMovieParams(EMPTY_DISCOVER_FILTERS)).toEqual({
      include_adult: false,
      language: "es-MX",
      page: 1,
      sort_by: "popularity.desc"
    });
  });

  it("elimina IDs repetidos, códigos inválidos y límites fuera de rango", () => {
    expect(normalizeDiscoverFilters({
      ...EMPTY_DISCOVER_FILTERS,
      genres: [18, 18, 0, -1, 878],
      yearFrom: "2200",
      yearTo: "1990",
      runtimeFrom: "700",
      runtimeTo: "0",
      originCountry: "pan",
      originalLanguage: "english"
    })).toEqual({
      ...EMPTY_DISCOVER_FILTERS,
      genres: [18, 878],
      yearFrom: "1990",
      yearTo: "",
      runtimeFrom: "",
      runtimeTo: "",
      originCountry: "",
      originalLanguage: ""
    });
  });

  it("cuenta grupos de criterios activos y no el número de géneros", () => {
    expect(getDiscoverActiveFilterCount({
      ...EMPTY_DISCOVER_FILTERS,
      genres: [18, 878],
      yearFrom: "2000",
      originCountry: "PA"
    })).toBe(3);
  });
});
