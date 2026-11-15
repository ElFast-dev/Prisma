import { describe, expect, it } from "vitest";
import { parseExternalMovieImport } from "./externalMovieImport";

function sourceBackup() {
  return {
    version: 2,
    platform: "android",
    createdAt: "2026-11-15T06:34:55.463Z",
    shows: { cH: [{ id: 123, t: "Una serie que no debe importarse" }] },
    movies: {
      cH: [
        { id: 9365, tmId: 15421, t: "Becket", a: "2025-11-06T00:22:23.302Z" },
        { id: 3832, tmId: 7191, t: "Cloverfield", a: "2025-11-06T00:22:39Z" }
      ],
      cW: [
        { id: 751145, tmId: 936075, t: "Michael", a: "2025-11-08T08:22:00.252Z" }
      ],
      cHid: [],
      pP: [],
      rM: [
        { id: 9365, tmId: 15421, r: 6, rA: "2026-11-15T06:33:31.920Z" },
        { id: 3832, tmId: 7191, r: 8, rA: "2026-11-13T05:25:21Z" },
        { id: 999999, tmId: -1, r: 6, rA: "2026-02-08T07:02:32Z" }
      ]
    },
    lists: { l: [] }
  };
}

describe("parseExternalMovieImport", () => {
  it("imports only movies and connects ratings through the Trakt ID", () => {
    const result = parseExternalMovieImport(JSON.stringify(sourceBackup()));

    expect(result.movies).toHaveLength(3);
    expect(result.summary.watchedMovies).toBe(2);
    expect(result.summary.pendingMovies).toBe(1);
    expect(result.summary.matchedRatings).toBe(2);
    expect(result.summary.orphanRatings).toBe(1);
    expect(result.movies[0]).toMatchObject({
      traktId: 9365,
      tmdbId: 15421,
      title: "Becket",
      status: "watched",
      watchedOn: "2025-11-05",
      rating: 6
    });
    expect(result.movies[2]).toMatchObject({ tmdbId: 936075, status: "pending" });
  });

  it("converts UTC instants to the Panama calendar date, including the previous evening", () => {
    const result = parseExternalMovieImport(JSON.stringify(sourceBackup()));
    expect(result.movies[0].watchedOn).toBe("2025-11-05");
    expect(result.movies[1].watchedOn).toBe("2025-11-05");
  });

  it("accepts ISO UTC dates with and without milliseconds and keeps the a date instead of rA", () => {
    const result = parseExternalMovieImport(JSON.stringify(sourceBackup()));
    expect(result.movies[0].addedAt).toBe("2025-11-06T00:22:23.302Z");
    expect(result.movies[1].addedAt).toBe("2025-11-06T00:22:39Z");
    expect(result.movies[0].watchedOn).toBe("2025-11-05");
    expect(result.movies[0].ratingAt).toBe("2026-11-15T06:33:31.920Z");
  });

  it("keeps midnight at 05:00 UTC on the same Panama date", () => {
    const backup = sourceBackup();
    backup.movies.cH[0].a = "2026-01-27T05:00:00Z";
    const result = parseExternalMovieImport(JSON.stringify(backup));
    expect(result.movies[0].watchedOn).toBe("2026-01-27");
  });

  it("supports an explicitly supplied device timezone", () => {
    const result = parseExternalMovieImport(JSON.stringify(sourceBackup()), "UTC");
    expect(result.movies[0].watchedOn).toBe("2025-11-06");
  });

  it("strips a UTF-8 BOM before parsing", () => {
    expect(parseExternalMovieImport("\uFEFF" + JSON.stringify(sourceBackup())).movies).toHaveLength(3);
  });

  it("skips movies whose TMDB ID is the unknown sentinel", () => {
    const backup = sourceBackup();
    backup.movies.cW.push({ id: 1234, tmId: -1, t: "Sin TMDB", a: "2026-01-01T00:00:00Z" });
    const result = parseExternalMovieImport(JSON.stringify(backup));
    expect(result.summary.skippedWithoutTmdb).toBe(1);
    expect(result.movies).toHaveLength(3);
  });

  it("rejects unsupported versions and malformed movie records", () => {
    const backup = sourceBackup();
    expect(() => parseExternalMovieImport(JSON.stringify({ ...backup, version: 1 }))).toThrow("versión 2");
    backup.movies.cH[0].tmId = 0.5;
    expect(() => parseExternalMovieImport(JSON.stringify(backup))).toThrow("datos de películas no válidos");
  });

  it("rejects duplicate Trakt IDs across watched and pending movies", () => {
    const backup = sourceBackup();
    backup.movies.cW[0].id = backup.movies.cH[0].id;
    expect(() => parseExternalMovieImport(JSON.stringify(backup))).toThrow("identificadores duplicados");
  });

  it("rejects IDs that cannot be represented safely as JavaScript integers", () => {
    const backup = sourceBackup();
    backup.movies.cH[0].id = Number.MAX_SAFE_INTEGER + 1;
    expect(() => parseExternalMovieImport(JSON.stringify(backup))).toThrow("datos de películas no válidos");
  });
});
