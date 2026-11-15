import { describe, expect, it } from "vitest";
import { TmdbHttpError } from "../tmdb/TmdbClient";
import {
  classifyEnrichmentError,
  ENRICHMENT_CONCURRENCY,
  ENRICHMENT_REQUEST_INTERVAL_MS
} from "./enrichmentService";

describe("enrichment queue throughput", () => {
  it("uses 24 parallel workers and a controlled pace below 30 requests per second", () => {
    expect(ENRICHMENT_CONCURRENCY).toBe(24);
    expect(ENRICHMENT_REQUEST_INTERVAL_MS).toBe(35);
    expect(1000 / ENRICHMENT_REQUEST_INTERVAL_MS).toBeLessThan(30);
  });
});

describe("enrichment error handling", () => {
  it("does not retry a movie that TMDB reports as missing", () => {
    expect(classifyEnrichmentError(new TmdbHttpError("missing", 404, "movie/42"))).toBe("not-found");
  });

  it("stops the queue when TMDB credentials are rejected", () => {
    expect(classifyEnrichmentError(new TmdbHttpError("unauthorized", 401, "movie/42"))).toBe("authentication");
    expect(classifyEnrichmentError(new TmdbHttpError("forbidden", 403, "movie/42"))).toBe("authentication");
  });

  it("retries rate limits, timeouts and server errors", () => {
    expect(classifyEnrichmentError(new TmdbHttpError("limited", 429, "movie/42", 3000))).toBe("retryable");
    expect(classifyEnrichmentError(new TmdbHttpError("timeout", 408, "movie/42"))).toBe("retryable");
    expect(classifyEnrichmentError(new TmdbHttpError("server", 503, "movie/42"))).toBe("retryable");
    expect(classifyEnrichmentError(new TypeError("Failed to fetch"))).toBe("retryable");
  });

  it("does not repeatedly retry permanent client errors", () => {
    expect(classifyEnrichmentError(new TmdbHttpError("bad request", 400, "movie/42"))).toBe("permanent");
  });
});
