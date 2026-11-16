import { describe, expect, it } from "vitest";
import { createRouteHistory, isPrimaryRoute } from "./routeHistory";

describe("historial de navegación de Prisma", () => {
  it("conserva la cadena de fichas abiertas desde recomendaciones", () => {
    const history = createRouteHistory("/discover");
    history.record("/movie/101");
    history.record("/movie/202");
    history.record("/movie/303");

    history.record("/movie/202", true);
    expect(history.current()).toBe("/movie/202");
    expect(history.hasPrevious()).toBe(true);

    history.record("/movie/101", true);
    expect(history.current()).toBe("/movie/101");
    expect(history.hasPrevious()).toBe(true);

    history.record("/discover", true);
    expect(history.current()).toBe("/discover");
    expect(history.hasPrevious()).toBe(false);
  });

  it("permite avanzar de nuevo después de regresar con el navegador", () => {
    const history = createRouteHistory("/discover");
    history.record("/movie/101");
    history.record("/movie/202");

    history.record("/movie/101", true);
    history.record("/movie/202", true);

    expect(history.current()).toBe("/movie/202");
    expect(history.hasPrevious()).toBe(true);
  });

  it("vuelve a Historial al cerrar una ficha abierta desde esa sección", () => {
    const history = createRouteHistory("/personal/history");
    history.record("/movie/123");
    expect(history.current()).toBe("/movie/123");
    expect(history.hasPrevious()).toBe(true);

    history.record("/personal/history", true);
    expect(history.current()).toBe("/personal/history");
    expect(history.hasPrevious()).toBe(false);
  });

  it("no inventa una ruta anterior cuando la ficha se abre directamente", () => {
    const history = createRouteHistory("/movie/555");
    expect(history.current()).toBe("/movie/555");
    expect(history.hasPrevious()).toBe(false);

    history.record("/movie/777");
    expect(history.hasPrevious()).toBe(true);
    history.record("/movie/555", true);
    expect(history.current()).toBe("/movie/555");
    expect(history.hasPrevious()).toBe(false);
  });
});


describe("visibilidad de la navegación principal", () => {
  it("solo reconoce Personal, Descubrir y Espectro como secciones principales", () => {
    expect(isPrimaryRoute("/personal")).toBe(true);
    expect(isPrimaryRoute("/discover")).toBe(true);
    expect(isPrimaryRoute("/spectro")).toBe(true);
  });

  it("oculta la píldora en Biblioteca, Historial, Colecciones, Perfil, ajustes y fichas", () => {
    [
      "/personal/library",
      "/personal/history",
      "/personal/collections",
      "/personal/profile",
      "/settings",
      "/movie/123",
      "/spectro/affinities"
    ].forEach((path) => expect(isPrimaryRoute(path)).toBe(false));
  });
});
