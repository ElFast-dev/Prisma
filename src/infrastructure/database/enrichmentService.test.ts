import { describe, expect, it } from "vitest";
import { TmdbHttpError } from "../tmdb/TmdbClient";
import {
  canResumeEnrichmentAfterConnection,
  classifyEnrichmentError,
  ENRICHMENT_CONCURRENCY,
  ENRICHMENT_REQUEST_INTERVAL_MS,
  getEnrichmentAutomaticRetryDelay
} from "./enrichmentService";

describe("enrichment queue throughput", () => {
  it("uses four parallel workers and a controlled pace of at most five requests per second", () => {
    expect(ENRICHMENT_CONCURRENCY).toBe(4);
    expect(ENRICHMENT_REQUEST_INTERVAL_MS).toBe(200);
    expect(1000 / ENRICHMENT_REQUEST_INTERVAL_MS).toBeLessThanOrEqual(5);
  });

  it("rechecks pending work after reconnection regardless of the persisted queue label", () => {
    expect(canResumeEnrichmentAfterConnection(true, "fixture-token")).toBe(true);
    expect(canResumeEnrichmentAfterConnection(true, "  ")).toBe(false);
    expect(canResumeEnrichmentAfterConnection(false, "fixture-token")).toBe(false);
  });
});

describe("automatic enrichment retry schedule", () => {
  const now = Date.parse("2026-11-16T12:00:00.000Z");

  it("increases the delay after consecutive temporary failures", () => {
    expect(getEnrichmentAutomaticRetryDelay({ status: "error", attempts: 3, updatedAt: new Date(now).toISOString(), retryable: true }, now)).toBe(15 * 60_000);
    expect(getEnrichmentAutomaticRetryDelay({ status: "error", attempts: 6, updatedAt: new Date(now).toISOString(), retryable: true }, now)).toBe(60 * 60_000);
    expect(getEnrichmentAutomaticRetryDelay({ status: "error", attempts: 9, updatedAt: new Date(now).toISOString(), retryable: true }, now)).toBe(6 * 60 * 60_000);
  });

  it("allows a retry when its deadline is reached and ignores permanent errors", () => {
    expect(getEnrichmentAutomaticRetryDelay({ status: "error", attempts: 3, updatedAt: new Date(now - 15 * 60_000).toISOString(), retryable: true }, now)).toBe(0);
    expect(getEnrichmentAutomaticRetryDelay({ status: "error", attempts: 3, updatedAt: new Date(now).toISOString(), retryable: false }, now)).toBeNull();
  });

  it("does not assign a retry deadline to pending or missing items", () => {
    expect(getEnrichmentAutomaticRetryDelay(undefined, now)).toBeNull();
    expect(getEnrichmentAutomaticRetryDelay({ status: "pending", attempts: 0, updatedAt: new Date(now).toISOString() }, now)).toBeNull();
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
