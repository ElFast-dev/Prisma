import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createStorageProtection } from "../js/core/storage-protection.js";

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

const [appSource, pageSource, settingsSource, eventSource] = await Promise.all([
  readFile("app.js", "utf8"), readFile("js/ui/page-views.js", "utf8"), readFile("js/ui/settings-views.js", "utf8"), readFile("js/app/event-handlers.js", "utf8")
]);
assert.match(appSource, /storageProtection\.inspect\(\)/);
assert.match(appSource, /storageProtection\.request\(storageProtectionSnapshot\)/);
assert.match(settingsSource, /data-action="protect-storage"/);
assert.match(settingsSource, /Exporta una copia de seguridad/);
assert.match(eventSource, /action === "protect-storage"/);
console.log("Protección del almacenamiento correcta: inspección de solo lectura, solicitud explícita, denegación, API ausente y errores controlados.");
