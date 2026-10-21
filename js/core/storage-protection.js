function finiteNonNegative(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function createStorageProtection(storageManager) {
  function supportsRequest() {
    return Boolean(storageManager && typeof storageManager.persist === "function");
  }

  async function inspect() {
    const snapshot = {
      supported: supportsRequest(),
      statusSupported: Boolean(storageManager && typeof storageManager.persisted === "function"),
      persisted: null,
      usage: null,
      quota: null
    };
    if (!storageManager) return snapshot;

    if (typeof storageManager.persisted === "function") {
      try {
        const value = await storageManager.persisted();
        if (typeof value === "boolean") snapshot.persisted = value;
      } catch (_) {
        // Browsers may expose the API but refuse the query; keep the state unknown.
      }
    }

    if (typeof storageManager.estimate === "function") {
      try {
        const estimate = await storageManager.estimate();
        if (estimate && typeof estimate === "object") {
          snapshot.usage = finiteNonNegative(estimate.usage);
          snapshot.quota = finiteNonNegative(estimate.quota);
        }
      } catch (_) {
        // Quota estimates are optional and must never block the app.
      }
    }

    return snapshot;
  }

  async function request(currentSnapshot) {
    if (!supportsRequest()) {
      const snapshot = await inspect();
      return Object.assign({}, snapshot, { requested: false, granted: false, reason: "unsupported" });
    }

    if (currentSnapshot && currentSnapshot.persisted === true) {
      return Object.assign({}, currentSnapshot, { supported: true, requested: false, granted: true, reason: "already-persistent" });
    }

    try {
      // Call before the first await to preserve the user's click activation.
      const decision = storageManager.persist();
      const granted = Boolean(await decision);
      const snapshot = await inspect();
      return Object.assign({}, snapshot, {
        supported: true,
        persisted: typeof snapshot.persisted === "boolean" ? snapshot.persisted : granted,
        requested: true,
        granted: granted,
        reason: granted ? "granted" : "denied"
      });
    } catch (_) {
      const snapshot = await inspect();
      return Object.assign({}, snapshot, { supported: true, requested: true, granted: false, reason: "error" });
    }
  }

  return { inspect, request };
}
