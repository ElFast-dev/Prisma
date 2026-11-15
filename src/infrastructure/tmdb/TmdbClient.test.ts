import { afterEach, describe, expect, it, vi } from "vitest";
import { TmdbClient } from "./TmdbClient";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("TmdbClient", () => {
  it("invokes the browser fetch with globalThis as its receiver", async () => {
    const mockFetch = vi.fn(function (
      this: unknown,
      _input: RequestInfo | URL,
      _init?: RequestInit
    ): Promise<Response> {
      expect(this).toBe(globalThis);
      return Promise.resolve(new Response(JSON.stringify({ images: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
    });

    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const client = new TmdbClient("test-access-token");
    const result = await client.get<{ images: object }>("configuration");

    expect(result).toEqual({ images: {} });
    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch.mock.calls[0][0]).toBeInstanceOf(URL);

    const request = mockFetch.mock.calls[0][1];
    expect(request?.method).toBe("GET");
    expect(new Headers(request?.headers).get("Authorization")).toBe("Bearer test-access-token");
  });

  it("binds an injected fetch implementation too", async () => {
    const injectedFetch = vi.fn(function (this: unknown): Promise<Response> {
      expect(this).toBe(globalThis);
      return Promise.resolve(new Response(JSON.stringify({ page: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
    });

    const client = new TmdbClient("test-access-token", injectedFetch as unknown as typeof fetch);
    const result = await client.get<{ page: number }>("trending/movie/week");

    expect(result.page).toBe(1);
    expect(injectedFetch).toHaveBeenCalledOnce();
  });

  it("rejects non-success responses with a typed TMDB error", async () => {
    const mockFetch = vi.fn(async () => new Response("Unauthorized", { status: 401 }));
    const client = new TmdbClient("test-access-token", mockFetch as unknown as typeof fetch);

    await expect(client.get("configuration")).rejects.toMatchObject({
      name: "TmdbHttpError",
      status: 401,
      endpoint: "configuration"
    });
  });

  it("rejects absolute URLs as endpoints", async () => {
    const mockFetch = vi.fn();
    const client = new TmdbClient("test-access-token", mockFetch as unknown as typeof fetch);

    await expect(client.get("https://example.com")).rejects.toThrow("endpoint de TMDB");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
