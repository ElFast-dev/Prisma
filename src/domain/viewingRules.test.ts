import { describe, expect, it } from "vitest";
import {
  calculateAverageRating,
  getNextViewingNumber,
  isValidCalendarDate,
  validateViewingDraft
} from "./viewingRules";

describe("viewing rules", () => {
  it("increments the next viewing number without reusing previous numbers", () => {
    expect(getNextViewingNumber(0)).toBe(1);
    expect(getNextViewingNumber(3)).toBe(4);
  });

  it("rejects invalid calendar dates", () => {
    expect(isValidCalendarDate("2024-02-29")).toBe(true);
    expect(isValidCalendarDate("2025-02-29")).toBe(false);
    expect(isValidCalendarDate("2025-13-01")).toBe(false);
  });

  it("requires a rating from 1 to 10", () => {
    const valid = { movieId: "movie-1", watchedOn: "2024-02-18", rating: 8 };
    expect(() => validateViewingDraft(valid, new Date(2026, 10, 14))).not.toThrow();
    expect(() => validateViewingDraft({ ...valid, rating: 0 }, new Date(2026, 10, 14))).toThrow();
    expect(() => validateViewingDraft({ ...valid, rating: 11 }, new Date(2026, 10, 14))).toThrow();
  });

  it("rejects future viewing dates", () => {
    const future = { movieId: "movie-1", watchedOn: "2026-12-26", rating: 10 };
    expect(() => validateViewingDraft(future, new Date(2026, 10, 14))).toThrow(/futura/i);
  });

  it("calculates the average without modifying individual ratings", () => {
    expect(calculateAverageRating([8, 10])).toBe(9);
    expect(calculateAverageRating([])).toBeNull();
  });
});
