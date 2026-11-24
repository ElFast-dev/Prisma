import { describe, expect, it } from "vitest";
import { runWithConcurrency, shareInFlight } from "./asyncPool";

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


describe("shareInFlight", () => {
  it("shares overlapping work for the same key and releases the request after completion", async () => {
    const requests = new Map<string, Promise<number>>();
    let calls = 0;
    let complete!: (value: number) => void;
    const create = () => {
      calls += 1;
      return new Promise<number>((resolve) => { complete = resolve; });
    };

    const first = shareInFlight(requests, "spectro-profile", create);
    const second = shareInFlight(requests, "spectro-profile", create);
    expect(second).toBe(first);

    await Promise.resolve();
    expect(calls).toBe(1);
    complete(42);
    await expect(Promise.all([first, second])).resolves.toEqual([42, 42]);
    expect(requests.has("spectro-profile")).toBe(false);
  });

  it("releases a rejected request so a later attempt can retry", async () => {
    const requests = new Map<string, Promise<number>>();
    const failure = new Error("temporary");
    await expect(shareInFlight(requests, "spectro-profile", () => Promise.reject(failure)))
      .rejects.toBe(failure);
    expect(requests.has("spectro-profile")).toBe(false);
    await expect(shareInFlight(requests, "spectro-profile", async () => 7)).resolves.toBe(7);
  });
});
