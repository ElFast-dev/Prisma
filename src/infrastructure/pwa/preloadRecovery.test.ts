import { describe, expect, it } from "vitest";
import {
  clearPreloadRecoveryFlag,
  shouldReloadAfterPreloadError,
  type SessionStorageLike
} from "./preloadRecovery";

function createStorage(): SessionStorageLike {
  const values = new Map<string, string>();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: (key) => { values.delete(key); }
  };
}

describe("preload recovery", () => {
  it("allows one reload when a dynamic import fails", () => {
    const storage = createStorage();

    expect(shouldReloadAfterPreloadError(storage, 10_000)).toBe(true);
    expect(shouldReloadAfterPreloadError(storage, 10_001)).toBe(false);
  });

  it("does not create a repeated reload loop during the cooldown", () => {
    const storage = createStorage();
    shouldReloadAfterPreloadError(storage, 50_000);

    expect(shouldReloadAfterPreloadError(storage, 50_000 + 59_999)).toBe(false);
    expect(shouldReloadAfterPreloadError(storage, 50_000 + 60_000)).toBe(true);
  });

  it("allows a new recovery after a route has loaded successfully", () => {
    const storage = createStorage();
    shouldReloadAfterPreloadError(storage, 100_000);
    clearPreloadRecoveryFlag(storage);

    expect(shouldReloadAfterPreloadError(storage, 100_001)).toBe(true);
  });

  it("falls back to the error boundary when session storage cannot be read or written", () => {
    const storage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => undefined
    };

    expect(shouldReloadAfterPreloadError(storage, 200_000)).toBe(false);
  });
});
