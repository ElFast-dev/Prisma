import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStorageProtection } from "../js/core/storage-protection.js";
import { createStorageProtectionActions } from "../js/app/storage-protection-actions.js";

const calls = [];
let persistent = false;
const manager = {
  async persisted() {
    calls.push("persisted");
    return persistent;
  },
  async estimate() {
    calls.push("estimate");
    return { usage: 2048, quota: 1048576 };
  },
  async persist() {
    calls.push("persist");
    persistent = true;
    return true;
  }
};
const protection = createStorageProtection(manager);
const initial = await protection.inspect();
assert.equal(initial.supported, true);
assert.equal(initial.statusSupported, true);
assert.equal(initial.persisted, false);
assert.equal(initial.usage, 2048);
assert.equal(initial.quota, 1048576);
assert.equal(calls.includes("persist"), false, "La inspección nunca debe solicitar persistencia");

calls.length = 0;
const requestPromise = protection.request(initial);
assert.equal(calls[0], "persist", "La petición debe invocar persist() antes de cualquier await previo");
const granted = await requestPromise;
assert.equal(granted.granted, true);
assert.equal(granted.persisted, true);
assert.equal(granted.reason, "granted");
assert.equal(calls.filter(value => value === "persist").length, 1);

calls.length = 0;
const alreadyGranted = await protection.request(granted);
assert.equal(alreadyGranted.granted, true);
assert.equal(alreadyGranted.reason, "already-persistent");
assert.equal(calls.includes("persist"), false, "No debe pedir persistencia si ya fue concedida");

const deniedManager = {
  async persisted() { return false; },
  async estimate() { throw new Error("estimación no disponible"); },
  async persist() { return false; }
};
const denied = await createStorageProtection(deniedManager).request({ supported: true, persisted: false });
assert.equal(denied.granted, false);
assert.equal(denied.persisted, false);
assert.equal(denied.reason, "denied");
assert.equal(denied.usage, null, "Una estimación fallida no debe inventar cifras");

const unsupported = createStorageProtection(null);
const unsupportedSnapshot = await unsupported.inspect();
assert.equal(unsupportedSnapshot.supported, false);
assert.equal(unsupportedSnapshot.persisted, null);
const unsupportedRequest = await unsupported.request(unsupportedSnapshot);
assert.equal(unsupportedRequest.reason, "unsupported");
assert.equal(unsupportedRequest.requested, false);

const errorManager = {
  async persisted() { throw new Error("blocked"); },
  async estimate() { return { usage: -1, quota: Infinity }; },
  persist() { throw new Error("request blocked"); }
};
const failed = await createStorageProtection(errorManager).request({ supported: true, persisted: null });
assert.equal(failed.granted, false);
assert.equal(failed.reason, "error");
assert.equal(failed.persisted, null);
assert.equal(failed.usage, null);
assert.equal(failed.quota, null);

const [appSource, pageSource, settingsSource, eventSource, storageActionsSource] = await Promise.all([
  readFile("app.js", "utf8"),
  readFile("js/ui/page-views.js", "utf8"),
  readFile("js/ui/settings-views.js", "utf8"),
  readFile("js/app/event-handlers.js", "utf8"),
  readFile("js/app/storage-protection-actions.js", "utf8")
]);
assert.match(appSource, /createStorageProtectionActions\(/);
assert.doesNotMatch(appSource, /storageProtection\.request\(storageProtectionSnapshot\)/);
assert.doesNotMatch(appSource, /async function refreshStorageProtectionSnapshot\(/);
assert.doesNotMatch(appSource, /async function requestStorageProtection\(/);
assert.match(appSource, /return refreshStorageProtectionSnapshot\(\)/,
  "La inicialización solo debe inspeccionar el estado, nunca pedir persistencia.");
assert.match(settingsSource, /data-action="protect-storage"/);
assert.match(settingsSource, /Exporta una copia de seguridad/);
assert.match(eventSource, /action === "protect-storage"/);
assert.match(storageActionsSource, /export function createStorageProtectionActions\(ctx\)/);

function createHarness({ storageProtection: service, currentPage = "data", snapshot = { supported: true, persisted: false, usage: 10, quota: 100 } }) {
  const renders = [];
  const toasts = [];
  const events = [];
  const ctx = {
    storageProtection: service,
    currentPage,
    storageProtectionSnapshot: snapshot,
    storageProtectionBusy: false,
    renderApp() {
      renders.push({ page: ctx.currentPage, busy: ctx.storageProtectionBusy, snapshot: ctx.storageProtectionSnapshot });
      events.push("render");
    },
    toast(message, isError = false) {
      toasts.push({ message, isError });
      events.push("toast");
    }
  };
  return { ctx, renders, toasts, events, actions: createStorageProtectionActions(ctx) };
}

// Refresh is read-only and repaints only the active Settings page.
const readOnlySnapshot = { supported: true, persisted: false, usage: 25, quota: 500 };
let forbiddenRequestCount = 0;
const readOnlyHarness = createHarness({
  storageProtection: {
    async inspect() { return readOnlySnapshot; },
    request() { forbiddenRequestCount += 1; throw new Error("La inspección no debe solicitar persistencia"); }
  }
});
const inspected = await readOnlyHarness.actions.refreshStorageProtectionSnapshot();
assert.equal(inspected, readOnlySnapshot);
assert.equal(readOnlyHarness.ctx.storageProtectionSnapshot, readOnlySnapshot);
assert.equal(readOnlyHarness.renders.length, 1);
assert.equal(forbiddenRequestCount, 0);

const hiddenPageHarness = createHarness({
  currentPage: "home",
  storageProtection: { async inspect() { return readOnlySnapshot; }, async request() { return readOnlySnapshot; } }
});
await hiddenPageHarness.actions.refreshStorageProtectionSnapshot();
assert.equal(hiddenPageHarness.renders.length, 0, "Inspeccionar no debe repintar otra página");

// The request call starts synchronously before the first UI refresh. Repeating a
// completed successful action must not call the underlying persist() twice.
const actionEvents = [];
let persistentState = false;
const actionManager = {
  async persisted() { actionEvents.push("persisted"); return persistentState; },
  async estimate() { actionEvents.push("estimate"); return { usage: 2048, quota: 1048576 }; },
  persist() {
    actionEvents.push("persist-call");
    persistentState = true;
    return true;
  }
};
const actionHarness = createHarness({ storageProtection: createStorageProtection(actionManager) });
await actionHarness.actions.refreshStorageProtectionSnapshot();
assert.equal(actionEvents.includes("persist-call"), false);
actionEvents.length = 0;
actionHarness.events.length = 0;
const grantedActionPromise = actionHarness.actions.requestStorageProtection();
assert.deepEqual(actionEvents.slice(0, 1), ["persist-call"]);
assert.deepEqual(actionHarness.events.slice(0, 1), ["render"],
  "El render inicial ocurre después de iniciar persist() sin await previo.");
assert.equal(actionHarness.ctx.storageProtectionBusy, true);
await grantedActionPromise;
assert.equal(actionHarness.ctx.storageProtectionSnapshot.granted, true);
assert.equal(actionHarness.ctx.storageProtectionBusy, false);
assert.equal(actionHarness.renders.length, 3, "Inspección, inicio y fin deben actualizar el panel activo.");
assert.deepEqual(actionHarness.toasts.at(-1), {
  message: "El navegador concedió persistencia para el almacenamiento de Prisma.",
  isError: false
});
const persistCallCount = actionEvents.filter(value => value === "persist-call").length;
await actionHarness.actions.requestStorageProtection();
assert.equal(actionEvents.filter(value => value === "persist-call").length, persistCallCount,
  "Una repetición con persistencia concedida no debe volver a invocar persist().");
assert.equal(actionHarness.ctx.storageProtectionBusy, false);
assert.deepEqual(actionHarness.toasts.at(-1), {
  message: "El almacenamiento ya tenía persistencia concedida por el navegador.",
  isError: false
});

// Denial remains visible and does not leave the operation locked.
const deniedHarness = createHarness({
  storageProtection: createStorageProtection({
    async persisted() { return false; },
    async estimate() { throw new Error("estimación opcional no disponible"); },
    async persist() { return false; }
  })
});
await deniedHarness.actions.requestStorageProtection();
assert.equal(deniedHarness.ctx.storageProtectionSnapshot.granted, false);
assert.equal(deniedHarness.ctx.storageProtectionSnapshot.reason, "denied");
assert.equal(deniedHarness.ctx.storageProtectionBusy, false);
assert.deepEqual(deniedHarness.toasts.at(-1), {
  message: "El navegador no concedió persistencia. Prisma seguirá funcionando; exporta una copia de seguridad.",
  isError: true
});

// A browser without the API produces a controlled outcome.
const unsupportedService = createStorageProtection(null);
const unsupportedSnapshot = await unsupportedService.inspect();
const unsupportedHarness = createHarness({ storageProtection: unsupportedService, snapshot: unsupportedSnapshot });
await unsupportedHarness.actions.requestStorageProtection();
assert.equal(unsupportedHarness.ctx.storageProtectionSnapshot.reason, "unsupported");
assert.equal(unsupportedHarness.ctx.storageProtectionBusy, false);
assert.deepEqual(unsupportedHarness.toasts.at(-1), {
  message: "Este navegador no permite solicitar persistencia del almacenamiento.",
  isError: true
});

// Only one request can be active; after completion another explicit action is accepted.
let resolveDeferred;
let concurrentCalls = 0;
const concurrentService = {
  inspect: async () => readOnlySnapshot,
  request() {
    concurrentCalls += 1;
    if (concurrentCalls === 1) return new Promise(resolve => { resolveDeferred = resolve; });
    return Promise.resolve({ supported: true, persisted: true, granted: true, reason: "already-persistent" });
  }
};
const concurrentHarness = createHarness({ storageProtection: concurrentService });
const firstRequest = concurrentHarness.actions.requestStorageProtection();
assert.equal(concurrentHarness.ctx.storageProtectionBusy, true);
assert.equal(concurrentCalls, 1);
await concurrentHarness.actions.requestStorageProtection();
assert.equal(concurrentCalls, 1, "Una solicitud simultánea debe descartarse sin duplicar el efecto.");
resolveDeferred({ supported: true, persisted: true, granted: true, reason: "granted" });
await firstRequest;
assert.equal(concurrentHarness.ctx.storageProtectionBusy, false);
assert.equal(concurrentHarness.renders.length, 2);
await concurrentHarness.actions.requestStorageProtection();
assert.equal(concurrentCalls, 2, "Una nueva acción explícita tras finalizar debe admitirse.");
assert.equal(concurrentHarness.ctx.storageProtectionBusy, false);
assert.equal(concurrentHarness.renders.length, 4);

// A synchronous request failure plus a failed recovery inspection must still unlock.
const initialKnownSnapshot = { supported: true, persisted: false, usage: 1, quota: 10 };
let shouldThrowSynchronously = true;
let recoveryInspectCalls = 0;
const recoveringHarness = createHarness({
  snapshot: initialKnownSnapshot,
  storageProtection: {
    request() {
      if (shouldThrowSynchronously) throw new Error("fallo síncrono controlado");
      return Promise.resolve({ supported: true, persisted: true, granted: true, reason: "granted" });
    },
    inspect() {
      recoveryInspectCalls += 1;
      if (recoveryInspectCalls === 1) return Promise.reject(new Error("falló la recuperación"));
      return Promise.resolve(readOnlySnapshot);
    }
  }
});
await recoveringHarness.actions.requestStorageProtection();
assert.equal(recoveringHarness.ctx.storageProtectionBusy, false);
assert.equal(recoveringHarness.ctx.storageProtectionSnapshot, initialKnownSnapshot,
  "Una inspección de recuperación fallida debe preservar el último snapshot.");
assert.deepEqual(recoveringHarness.toasts.at(-1), {
  message: "No se pudo confirmar la protección del almacenamiento. Exporta una copia de seguridad.",
  isError: true
});
shouldThrowSynchronously = false;
await recoveringHarness.actions.requestStorageProtection();
assert.equal(recoveringHarness.ctx.storageProtectionSnapshot.reason, "granted");
assert.equal(recoveringHarness.ctx.storageProtectionBusy, false,
  "La acción debe volver a estar disponible tras el error síncrono.");

// An asynchronous rejection should refresh the snapshot if possible and unlock future actions.
let rejectNext = true;
const asyncErrorHarness = createHarness({
  storageProtection: {
    request() {
      if (rejectNext) return Promise.reject(new Error("fallo asíncrono controlado"));
      return Promise.resolve({ supported: true, persisted: true, granted: true, reason: "granted" });
    },
    async inspect() { return readOnlySnapshot; }
  }
});
await asyncErrorHarness.actions.requestStorageProtection();
assert.equal(asyncErrorHarness.ctx.storageProtectionBusy, false);
assert.equal(asyncErrorHarness.ctx.storageProtectionSnapshot, readOnlySnapshot);
assert.deepEqual(asyncErrorHarness.toasts.at(-1), {
  message: "No se pudo confirmar la protección del almacenamiento. Exporta una copia de seguridad.",
  isError: true
});
rejectNext = false;
await asyncErrorHarness.actions.requestStorageProtection();
assert.equal(asyncErrorHarness.ctx.storageProtectionSnapshot.reason, "granted");
assert.equal(asyncErrorHarness.ctx.storageProtectionBusy, false);

// Background pages update state without redundant renders.
const backgroundHarness = createHarness({
  currentPage: "home",
  storageProtection: { async inspect() { return readOnlySnapshot; }, async request() { return readOnlySnapshot; } }
});
await backgroundHarness.actions.requestStorageProtection();
assert.equal(backgroundHarness.ctx.storageProtectionSnapshot, readOnlySnapshot);
assert.equal(backgroundHarness.renders.length, 0);

console.log("Protección del almacenamiento correcta: inspección de solo lectura, concesión/denegación/no soporte, errores recuperables, bloqueo concurrente, repetición y repintados por página.");
