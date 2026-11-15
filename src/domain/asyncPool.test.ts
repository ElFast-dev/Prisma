import { describe, expect, it } from "vitest";
import { runWithConcurrency } from "./asyncPool";

describe("runWithConcurrency", () => {
  it("processes every item while respecting the concurrency limit", async () => {
    const items = Array.from({ length: 17 }, (_, index) => index);
    const processed: number[] = [];
    let active = 0;
    let maximumActive = 0;

    await runWithConcurrency(items, 4, async (item) => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setTimeout(resolve, 4));
      processed.push(item);
      active -= 1;
    });

    expect(maximumActive).toBe(4);
    expect(processed.sort((a, b) => a - b)).toEqual(items);
  });

  it("does not start more work after a stop is requested", async () => {
    const items = [1, 2, 3, 4, 5, 6];
    let stop = false;
    const processed: number[] = [];

    await runWithConcurrency(items, 2, async (item) => {
      processed.push(item);
      if (item === 2) stop = true;
    }, () => stop);

    expect(processed).toHaveLength(2);
  });
});
