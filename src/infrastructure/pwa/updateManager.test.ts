import { describe, expect, it, vi } from "vitest";
import { createPwaUpdateManager } from "./updateManager";

describe("PwaUpdateManager", () => {
  it("shows an available update without applying it automatically", () => {
    const manager = createPwaUpdateManager();
    const update = vi.fn(async () => undefined);
    manager.setUpdateService(update);

    manager.notifyUpdateAvailable();

    expect(manager.getSnapshot()).toMatchObject({
      available: true,
      applying: false,
      dismissed: false
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("waits until the user applies the update", async () => {
    const manager = createPwaUpdateManager();
    const update = vi.fn(async (reloadPage?: boolean) => {
      expect(reloadPage).toBe(true);
    });
    manager.setUpdateService(update);
    manager.notifyUpdateAvailable();

    await manager.apply();

    expect(update).toHaveBeenCalledOnce();
    expect(manager.getSnapshot().applying).toBe(true);
  });

  it("does not apply an update twice while it is running", async () => {
    const manager = createPwaUpdateManager();
    let resolveUpdate: (() => void) | undefined;
    const update = vi.fn(() => new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    }));
    manager.setUpdateService(update);
    manager.notifyUpdateAvailable();

    const first = manager.apply();
    await manager.apply();
    expect(update).toHaveBeenCalledOnce();

    resolveUpdate?.();
    await first;
  });

  it("can postpone an update without losing its availability", () => {
    const manager = createPwaUpdateManager();
    manager.notifyUpdateAvailable();

    manager.dismiss();

    expect(manager.getSnapshot()).toMatchObject({
      available: true,
      dismissed: true,
      applying: false
    });
  });

  it("reports update failures and allows another attempt", async () => {
    const manager = createPwaUpdateManager();
    const update = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    manager.setUpdateService(update);
    manager.notifyUpdateAvailable();

    await manager.apply();
    expect(manager.getSnapshot()).toMatchObject({
      available: true,
      applying: false,
      error: expect.stringContaining("No se pudo aplicar")
    });

    await manager.apply();
    expect(update).toHaveBeenCalledTimes(2);
  });
});
