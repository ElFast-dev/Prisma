import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fakeCache = vi.hoisted(() => {
  type Entry = {
    cacheKey: string;
    resourceType: string;
    payload: unknown;
    fetchedAt: string;
    lastValidatedAt: string;
  };
  const entries = new Map<string, Entry>();
  const get = vi.fn(async (key: string) => entries.get(key));
  const put = vi.fn(async (entry: Entry) => {
    entries.set(entry.cacheKey, entry);
  });
  return { entries, get, put };
});

vi.mock("../database/database", () => ({
  prismaDb: {
    catalogCache: {
      get: fakeCache.get,
      put: fakeCache.put
    }
  }
}));

import {
  getMovieAnalysisMetadata,
  getMovieDetailsForEnrichment
} from "./TmdbService";

const originalFetch = globalThis.fetch;

function installFetch(
  respond: (pathname: string) => Response | Promise<Response>
): ReturnType<typeof vi.fn> {
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = input instanceof URL ? input : new URL(String(input));
    return respond(url.pathname);
  });
  globalThis.fetch = fetcher as unknown as typeof fetch;
  return fetcher;
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

beforeEach(() => {
  fakeCache.entries.clear();
  fakeCache.get.mockClear();
  fakeCache.put.mockClear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("caché TMDB compartida", () => {
  it("comparte una consulta simultánea de detalles entre Biblioteca y Espectro", async () => {
    const fetcher = installFetch((pathname) => {
      if (pathname.endsWith("/credits")) {
        return jsonResponse({ cast: [], crew: [] });
      }
      if (pathname.endsWith("/keywords")) {
        return jsonResponse({ keywords: [{ id: 1, name: "memoria" }] });
      }
      return jsonResponse({
        id: 42,
        title: "Película sintética",
        release_date: "2020-01-01",
        runtime: 110
      });
    });

    const [libraryDetails, spectroMetadata] = await Promise.all([
      getMovieDetailsForEnrichment("fixture-token", 42),
      getMovieAnalysisMetadata("fixture-token", 42)
    ]);

    expect(libraryDetails.id).toBe(42);
    expect(spectroMetadata.details.title).toBe("Película sintética");
    expect(spectroMetadata.keywords).toEqual(["memoria"]);

    const paths = fetcher.mock.calls.map(([input]) => new URL(String(input)).pathname);
    expect(paths.filter((path) => path === "/3/movie/42")).toHaveLength(1);
    expect(paths).toContain("/3/movie/42/credits");
    expect(paths).toContain("/3/movie/42/keywords");
    expect(fetcher).toHaveBeenCalledTimes(3);

    // La respuesta compartida también queda persistida para futuras aperturas.
    await getMovieDetailsForEnrichment("fixture-token", 42);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("respeta la política de datos obsoletos de cada consumidor", async () => {
    const staleEntry = {
      cacheKey: "movie:details:77",
      resourceType: "movie",
      payload: { id: 77, title: "Detalles en caché" },
      fetchedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      lastValidatedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
    };
    fakeCache.entries.set(staleEntry.cacheKey, staleEntry);

    const fetcher = installFetch((pathname) => {
      if (pathname === "/3/movie/77") return jsonResponse({ error: "temporal" }, 503);
      if (pathname.endsWith("/credits")) return jsonResponse({ cast: [], crew: [] });
      if (pathname.endsWith("/keywords")) return jsonResponse({ keywords: [] });
      return jsonResponse({});
    });

    const strictLibraryRequest = getMovieDetailsForEnrichment("fixture-token", 77);
    const analysisRequest = getMovieAnalysisMetadata("fixture-token", 77);
    const [strictResult, analysisResult] = await Promise.allSettled([
      strictLibraryRequest,
      analysisRequest
    ]);

    expect(strictResult.status).toBe("rejected");
    expect(analysisResult.status).toBe("fulfilled");
    if (analysisResult.status === "fulfilled") {
      expect(analysisResult.value.details.title).toBe("Detalles en caché");
    }
    const detailRequests = fetcher.mock.calls
      .map(([input]) => new URL(String(input)).pathname)
      .filter((path) => path === "/3/movie/77");
    expect(detailRequests).toHaveLength(1);
  });
});
