import { describe, expect, it } from "vitest";
import { DEFAULT_LIBRARY_FILTERS, normalizeLibraryFilters } from "./libraryPreferences";

describe("preferencias de Biblioteca", () => {
  it("usa valores seguros cuando no existe una preferencia guardada", () => {
    expect(normalizeLibraryFilters(undefined)).toEqual(DEFAULT_LIBRARY_FILTERS);
    expect(normalizeLibraryFilters(null)).toEqual(DEFAULT_LIBRARY_FILTERS);
  });

  it("restaura los filtros guardados conservando búsqueda, estado, género, rango y orden", () => {
    const saved = {
      status: "pending",
      query: "alien",
      genre: "Ciencia ficción",
      yearFrom: "1980",
      yearTo: "1990",
      sort: "year-asc"
    } as const;

    expect(normalizeLibraryFilters(saved)).toEqual(saved);
  });

  it("normaliza campos inválidos de forma independiente sin borrar los válidos", () => {
    expect(normalizeLibraryFilters({
      status: "unknown",
      query: "Amélie",
      genre: 42,
      yearFrom: "1700",
      yearTo: "1990",
      sort: "unknown"
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
});
