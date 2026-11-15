import { describe, expect, it } from "vitest";
import {
  readRouteScrollPosition,
  routeScrollStorageKey,
  saveRouteScrollPosition
} from "./scrollRestoration";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); }
  };
}

describe("restauración de scroll por ruta", () => {
  it("guarda y recupera la posición exacta de una ruta", () => {
    const storage = memoryStorage();
    saveRouteScrollPosition(storage, "/personal/library", 2487.4);
    expect(readRouteScrollPosition(storage, "/personal/library")).toBe(2487.4);
  });

  it("mantiene separadas las posiciones de Biblioteca y Descubrir", () => {
    const storage = memoryStorage();
    saveRouteScrollPosition(storage, "/personal/library", 1900);
    saveRouteScrollPosition(storage, "/discover", 640);

    expect(readRouteScrollPosition(storage, "/personal/library")).toBe(1900);
    expect(readRouteScrollPosition(storage, "/discover")).toBe(640);
  });

  it("normaliza rutas y descarta valores inválidos", () => {
    const storage = memoryStorage();
    expect(routeScrollStorageKey("personal/library")).toBe("prisma:scroll-position:/personal/library");
    saveRouteScrollPosition(storage, "/personal/library", Number.NaN);
    expect(readRouteScrollPosition(storage, "/personal/library")).toBeNull();
    storage.setItem(routeScrollStorageKey("/personal/library"), "-12");
    expect(readRouteScrollPosition(storage, "/personal/library")).toBeNull();
  });
});
