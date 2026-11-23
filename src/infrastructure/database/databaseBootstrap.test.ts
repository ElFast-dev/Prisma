import { describe, expect, it, vi } from "vitest";
import { createDatabaseOpener } from "./databaseBootstrap";

describe("database opener", () => {
  it("shares a single in-flight open operation", async () => {
    let resolveOpen: (() => void) | undefined;
    const open = vi.fn(() => new Promise<void>((resolve) => {
      resolveOpen = resolve;
    }));
    const opener = createDatabaseOpener(open, () => false);

    const first = opener();
    const second = opener();

    expect(open).toHaveBeenCalledOnce();
    resolveOpen?.();
    await Promise.all([first, second]);
  });

  it("does not reopen a database that is already open", async () => {
    const open = vi.fn(async () => undefined);
    const opener = createDatabaseOpener(open, () => true);

    await opener();

    expect(open).not.toHaveBeenCalled();
  });

  it("allows a retry after an open failure", async () => {
    const open = vi.fn()
      .mockRejectedValueOnce(new Error("IndexedDB unavailable"))
      .mockResolvedValueOnce(undefined);
    const opener = createDatabaseOpener(open, () => false);

    await expect(opener()).rejects.toThrow("IndexedDB unavailable");
    await expect(opener()).resolves.toBeUndefined();
    expect(open).toHaveBeenCalledTimes(2);
  });
});
