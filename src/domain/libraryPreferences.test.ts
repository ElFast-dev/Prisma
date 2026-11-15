import { describe, expect, it } from "vitest";
import {
  DEFAULT_LIBRARY_FILTERS,
  normalizeLibraryFilters,
  selectLibrarySort
} from "./libraryPreferences";

describe("preferencias de Biblioteca", () => {
  it("usa valores seguros cuando no existe una preferencia guardada", () => {
    expect(normalizeLibraryFilters(undefined)).toEqual(DEFAULT_LIBRARY_FILTERS);
    expect(normalizeLibraryFilters(null)).toEqual(DEFAULT_LIBRARY_FILTERS);
  });

  it("restaura la búsqueda, los dos estados, el género, el rango y el orden", () => {
    const saved = {
      ...DEFAULT_LIBRARY_FILTERS,
      status: "pending",
      releaseStatus: "upcoming",
      query: "alien",
      genre: "Ciencia ficción",
      yearFrom: "1980",
      yearTo: "1990",
      sort: "runtime",
      sortDirection: "asc"
    } as const;
    expect(normalizeLibraryFilters(saved)).toEqual(saved);
  });

  it("migra las preferencias antiguas de ordenación sin perder los filtros", () => {
    const migrated = normalizeLibraryFilters({
      status: "pending",
      query: "The Thing",
      genre: "Terror",
      yearFrom: "1980",
      yearTo: "1990",
      sort: "year-asc"
    });
    expect(migrated).toEqual({
      ...DEFAULT_LIBRARY_FILTERS,
      status: "pending",
      query: "The Thing",
      genre: "Terror",
      yearFrom: "1980",
      yearTo: "1990",
      sort: "release-date",
      sortDirection: "asc"
    });
  });

  it("normaliza campos inválidos de forma independiente sin borrar los válidos", () => {
    expect(normalizeLibraryFilters({
      status: "unknown",
      releaseStatus: "unknown",
      query: "Amélie",
      genre: 42,
      yearFrom: "1700",
      yearTo: "1990",
      sort: "unknown",
      sortDirection: "up"
    })).toEqual({
      ...DEFAULT_LIBRARY_FILTERS,
      query: "Amélie",
      yearTo: "1990"
    });
  });

  it("restablece un rango de años invertido a valores seguros", () => {
    expect(normalizeLibraryFilters({
      ...DEFAULT_LIBRARY_FILTERS,
      yearFrom: "1990",
      yearTo: "1980"
    })).toEqual(DEFAULT_LIBRARY_FILTERS);
  });

  it("al volver a pulsar el mismo criterio invierte la dirección", () => {
    const ascending = selectLibrarySort(DEFAULT_LIBRARY_FILTERS, "title", 10);
    expect(ascending.sortDirection).toBe("asc");
    expect(selectLibrarySort(ascending, "title", 11).sortDirection).toBe("desc");
  });

  it("usa la dirección natural al cambiar de criterio", () => {
    expect(selectLibrarySort(DEFAULT_LIBRARY_FILTERS, "runtime", 2).sortDirection).toBe("asc");
    expect(selectLibrarySort(DEFAULT_LIBRARY_FILTERS, "rating", 2).sortDirection).toBe("desc");
    expect(selectLibrarySort(DEFAULT_LIBRARY_FILTERS, "release-date", 2).sortDirection).toBe("desc");
  });

  it("cambia la semilla al volver a seleccionar Aleatorio", () => {
    const first = selectLibrarySort(DEFAULT_LIBRARY_FILTERS, "random", 123);
    const second = selectLibrarySort(first, "random", 456);
    expect(first.shuffleSeed).toBe(123);
    expect(second.shuffleSeed).toBe(456);
  });
});
