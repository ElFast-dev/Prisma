import { describe, expect, it } from "vitest";
import { createRouteHistory } from "./routeHistory";

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
