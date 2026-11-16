import { beforeEach, describe, expect, it, vi } from "vitest";

const { database, state } = vi.hoisted(() => {
  const state = {
    movies: new Map<string, any>(),
    viewings: [] as any[],
    metadata: new Map<string, any>()
  };
  const database = {
    transaction: async (...args: unknown[]) => {
      const operation = args[args.length - 1] as () => Promise<unknown>;
      return operation();
    },
    movies: {
      bulkGet: async (ids: string[]) => ids.map((id) => state.movies.get(id))
    },
    viewings: {
      toArray: async () => state.viewings.map((item) => ({ ...item })),
      get: async (id: string) => state.viewings.find((item) => item.id === id),
      update: async (id: string, changes: Record<string, unknown>) => {
        const index = state.viewings.findIndex((item: any) => item.id === id);
        if (index < 0) return 0;
        state.viewings[index] = { ...state.viewings[index], ...changes };
        return 1;
      }
    },
    appMetadata: {
      get: async (key: string) => state.metadata.get(key),
      put: async (item: any) => {
        state.metadata.set(item.key, { ...item });
        return item.key;
      }
    }
  };
  return { database, state };
});

vi.mock("./database", () => ({ prismaDb: database }));

import {
  answerSpectroRatingQuestion,
  dismissSpectroRatingQuestion,
  getNextSpectroRatingQuestion
} from "./spectroQuestionService";

describe("preguntas contextuales de Espectro", () => {
  beforeEach(() => {
    state.movies.clear();
    state.viewings.length = 0;
    state.metadata.clear();
    state.movies.set("movie-1", {
      id: "movie-1",
      tmdbId: 1,
      title: "Película pendiente",
      genres: ["Drama"],
      countries: [],
      lastViewingSequence: 2,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z"
    });
    state.viewings.push({
      id: "viewing-1",
      movieId: "movie-1",
      sequenceNumber: 2,
      watchedOn: "2026-04-10",
      rating: undefined,
      review: "Me gustaría recordarla mejor",
      watchedAtLocalTime: "20:15",
      timeZone: "America/Panama",
      createdAt: "2026-04-10T20:15:00.000Z",
      updatedAt: "2026-04-10T20:15:00.000Z",
      operationId: "operation-1"
    });
  });

  it("propone un visionado sin nota sin obligar a abrir la ficha", async () => {
    await expect(getNextSpectroRatingQuestion()).resolves.toMatchObject({
      viewingId: "viewing-1",
      movieId: "movie-1",
      title: "Película pendiente",
      watchedOn: "2026-04-10",
      sequenceNumber: 2
    });
  });

  it("guarda la respuesta en el visionado existente y conserva su experiencia", async () => {
    await answerSpectroRatingQuestion("viewing-1", 8);
    expect(state.viewings[0]).toMatchObject({
      id: "viewing-1",
      watchedOn: "2026-04-10",
      rating: 8,
      review: "Me gustaría recordarla mejor",
      watchedAtLocalTime: "20:15",
      timeZone: "America/Panama",
      operationId: "operation-1"
    });
    await expect(getNextSpectroRatingQuestion()).resolves.toBeNull();
  });

  it("rechaza una nota fuera de la escala de Prisma", async () => {
    await expect(answerSpectroRatingQuestion("viewing-1", 0)).rejects.toThrow(
      "La calificación debe ser un número entero entre 1 y 10."
    );
    expect(state.viewings[0].rating).toBeUndefined();
  });

  it("permite posponer preguntas sin modificar el historial", async () => {
    await dismissSpectroRatingQuestion();
    await expect(getNextSpectroRatingQuestion()).resolves.toBeNull();
    expect(state.viewings[0].rating).toBeUndefined();
  });
});
