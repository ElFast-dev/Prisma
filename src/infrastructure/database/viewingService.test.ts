import { beforeEach, describe, expect, it, vi } from "vitest";

const { database, state } = vi.hoisted(() => {
  const state = {
    movies: new Map<string, any>(),
    libraryEntries: new Map<string, any>(),
    viewings: [] as any[]
  };

  const database = {
    transaction: async (...args: unknown[]) => {
      const operation = args[args.length - 1] as () => Promise<unknown>;
      return operation();
    },
    movies: {
      get: async (id: string) => state.movies.get(id),
      update: async (id: string, changes: Record<string, unknown>) => {
        const current = state.movies.get(id);
        if (!current) return 0;
        state.movies.set(id, { ...current, ...changes });
        return 1;
      }
    },
    libraryEntries: {
      get: async (id: string) => state.libraryEntries.get(id),
      add: async (entry: any) => {
        state.libraryEntries.set(entry.movieId, { ...entry });
        return entry.movieId;
      },
      update: async (id: string, changes: Record<string, unknown>) => {
        const current = state.libraryEntries.get(id);
        if (!current) return 0;
        state.libraryEntries.set(id, { ...current, ...changes });
        return 1;
      },
      delete: async (id: string) => { state.libraryEntries.delete(id); }
    },
    viewings: {
      where: (field: string) => ({
        equals: (value: string) => ({
          first: async () => state.viewings.find((item: any) => item[field] === value),
          count: async () => state.viewings.filter((item: any) => item[field] === value).length
        })
      }),
      get: async (id: string) => state.viewings.find((item: any) => item.id === id),
      add: async (viewing: any) => {
        state.viewings.push({ ...viewing });
        return viewing.id;
      },
      update: async (id: string, changes: Record<string, unknown>) => {
        const index = state.viewings.findIndex((item: any) => item.id === id);
        if (index < 0) return 0;
        state.viewings[index] = { ...state.viewings[index], ...changes };
        return 1;
      },
      delete: async (id: string) => {
        const index = state.viewings.findIndex((item: any) => item.id === id);
        if (index >= 0) state.viewings.splice(index, 1);
      }
    }
  };

  return { database, state };
});

vi.mock("./database", () => ({ prismaDb: database }));

import { addViewing, deleteViewing, removeMovieFromPending, updateViewing } from "./viewingService";

function addInput(watchedOn: string, rating: number, review: string) {
  return {
    movieId: "movie-7",
    watchedOn,
    rating,
    review,
    watchedAtLocalTime: "20:30",
    timeZone: "America/Panama"
  };
}

describe("viewingService: integridad de experiencias", () => {
  beforeEach(() => {
    state.movies.clear();
    state.libraryEntries.clear();
    state.viewings.length = 0;

    state.movies.set("movie-7", {
      id: "movie-7",
      tmdbId: 7,
      title: "Película de prueba",
      genres: [],
      countries: [],
      lastViewingSequence: 0,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    });
    state.libraryEntries.set("movie-7", {
      movieId: "movie-7",
      status: "pending",
      isFavorite: true,
      addedAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    });
  });

  it("hace idempotente una operación y conserva revisionados independientes", async () => {
    const first = await addViewing(addInput("2024-02-01", 7, "Primera experiencia"), "00000000-0000-4000-8000-000000000001");
    const repeated = await addViewing(addInput("2024-02-02", 2, "No debe sustituir la primera"), "00000000-0000-4000-8000-000000000001");
    const second = await addViewing(addInput("2025-08-13", 10, "Segunda experiencia"), "00000000-0000-4000-8000-000000000002");

    expect(repeated.id).toBe(first.id);
    expect(state.viewings).toHaveLength(2);
    expect(state.viewings.map((item: any) => item.id)).toEqual([first.id, second.id]);
    expect(state.viewings.map((item: any) => item.sequenceNumber)).toEqual([1, 2]);
    expect(state.viewings.map((item: any) => item.rating)).toEqual([7, 10]);
    expect(state.viewings.map((item: any) => item.review)).toEqual([
      "Primera experiencia",
      "Segunda experiencia"
    ]);
    expect(state.viewings.every((item: any) => item.movieId === "movie-7")).toBe(true);
    expect(state.movies.get("movie-7").lastViewingSequence).toBe(2);
    expect(state.libraryEntries.get("movie-7")).toMatchObject({
      status: "watched",
      isFavorite: true
    });
  });

  it("registra una experiencia aunque no tenga calificación", async () => {
    const viewing = await addViewing({
      movieId: "movie-7",
      watchedOn: "2025-08-13"
    }, "00000000-0000-4000-8000-000000000099");

    expect(viewing.rating).toBeUndefined();
    expect(state.viewings).toHaveLength(1);
    expect(state.libraryEntries.get("movie-7").status).toBe("watched");
  });

  it("edita y elimina solo la experiencia seleccionada sin alterar las demás", async () => {
    const first = await addViewing(addInput("2024-02-01", 7, "Nota original"), "00000000-0000-4000-8000-000000000001");
    const second = await addViewing(addInput("2025-08-13", 10, "Nota del revisionado"), "00000000-0000-4000-8000-000000000002");

    await updateViewing(first.id, {
      watchedOn: "2024-02-03",
      rating: 9,
      review: "Nota editada"
    });

    expect(state.viewings.find((item: any) => item.id === first.id)).toMatchObject({
      movieId: "movie-7",
      sequenceNumber: 1,
      watchedOn: "2024-02-03",
      rating: 9,
      review: "Nota editada",
      watchedAtLocalTime: "20:30",
      timeZone: "America/Panama"
    });
    expect(state.viewings.find((item: any) => item.id === second.id)).toMatchObject({
      watchedOn: "2025-08-13",
      rating: 10,
      review: "Nota del revisionado"
    });

    await deleteViewing(first.id);
    expect(state.viewings).toHaveLength(1);
    expect(state.viewings[0].id).toBe(second.id);
    expect(state.libraryEntries.get("movie-7").status).toBe("watched");

    await deleteViewing(second.id);
    expect(state.viewings).toHaveLength(0);
    expect(state.libraryEntries.get("movie-7")).toMatchObject({
      status: undefined,
      isFavorite: true
    });
    expect(state.movies.get("movie-7").lastViewingSequence).toBe(2);
  });

  it("no reutiliza una secuencia aunque se elimine el último visionado", async () => {
    const first = await addViewing(addInput("2024-02-01", 7, "Primera"), "00000000-0000-4000-8000-000000000001");
    const second = await addViewing(addInput("2024-03-01", 8, "Segunda"), "00000000-0000-4000-8000-000000000002");

    await deleteViewing(second.id);
    const third = await addViewing(addInput("2024-04-01", 9, "Tercera"), "00000000-0000-4000-8000-000000000003");

    expect(third.sequenceNumber).toBe(3);
    expect(state.viewings.map((item: any) => item.sequenceNumber)).toEqual([first.sequenceNumber, third.sequenceNumber]);
    expect(state.viewings.some((item: any) => item.id === second.id)).toBe(false);
    expect(state.movies.get("movie-7").lastViewingSequence).toBe(3);
  });
  
  it("no convierte el último visionado eliminado en Pendientes", async () => {
    state.libraryEntries.set("movie-7", {
      movieId: "movie-7",
      status: "watched",
      isFavorite: false,
      addedAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    });
    const viewing = await addViewing({
      movieId: "movie-7",
      watchedOn: "2024-02-01",
      rating: 8
    }, "00000000-0000-4000-8000-000000000077");

    await deleteViewing(viewing.id);

    expect(state.viewings).toHaveLength(0);
    expect(state.libraryEntries.has("movie-7")).toBe(false);
  });

  it("permite quitar Pendientes conservando una película favorita sin clasificación", async () => {
    state.libraryEntries.set("movie-7", {
      movieId: "movie-7",
      status: "pending",
      isFavorite: true,
      addedAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    });

    await expect(removeMovieFromPending("movie-7")).resolves.toBe(true);
    expect(state.libraryEntries.get("movie-7")).toMatchObject({
      status: undefined,
      isFavorite: true
    });
  });

  it("elimina una entrada Pendiente al quitarla si no es favorita", async () => {
    state.libraryEntries.set("movie-7", {
      movieId: "movie-7",
      status: "pending",
      isFavorite: false,
      addedAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z"
    });

    await expect(removeMovieFromPending("movie-7")).resolves.toBe(true);
    expect(state.libraryEntries.has("movie-7")).toBe(false);
  });

});
