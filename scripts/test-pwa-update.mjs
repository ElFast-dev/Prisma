import assert from "node:assert/strict";
import { createPWAUpdateController } from "../js/app/pwa-update.js";

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName; this.ownerDocument = ownerDocument; this.children = [];
    this.attributes = {}; this.listeners = {}; this.className = ""; this.textContent = "";
    this.parentNode = null; this.type = "";
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  querySelector(selector) {
    const attribute = selector.match(/^\[([^\]]+)\]$/);
    if (!attribute) return null;
    for (const child of this.children) {
      if (Object.prototype.hasOwnProperty.call(child.attributes, attribute[1])) return child;
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }
  click() { if (this.listeners.click) this.listeners.click(); }
}
const documentRef = { createElement: tag => new FakeElement(tag, documentRef) };
const textContent = node => node.textContent + node.children.map(textContent).join("");
function makeServiceWorker(initialController) {
  const handlers = {}; let registerArgs = null, updates = 0;
  const registration = { update: async () => { updates += 1; } };
  const serviceWorker = {
    controller: initialController,
    addEventListener: (name, callback) => { handlers[name] = callback; },
    register: async (url, options) => { registerArgs = { url, options }; return registration; }
  };
  return { serviceWorker, handlers, registration, get registerArgs() { return registerArgs; }, get updates() { return updates; } };
}

const environment = makeServiceWorker({ version: "old" });
const toastRoot = new FakeElement("div", documentRef); let reloads = 0;
const updater = createPWAUpdateController({
  getServiceWorker: () => environment.serviceWorker,
  getWindow: () => ({ isSecureContext: true, location: { reload: () => { reloads += 1; } } }),
  getToastRoot: () => toastRoot
});
const registration = await updater.register();
assert.equal(registration, environment.registration);
assert.equal(environment.registerArgs.url, "./sw.js");
assert.equal(environment.registerArgs.options.scope, "./");
assert.equal(environment.registerArgs.options.updateViaCache, "none",
  "El navegador no debe depender de una copia HTTP en caché del service worker.");
assert.equal(environment.updates, 1, "El registro debe comprobar si existe una actualización.");

environment.serviceWorker.controller = { version: "new" };
environment.handlers.controllerchange();
const notice = toastRoot.querySelector("[data-pwa-update-notice]");
assert.ok(notice, "Un cliente abierto debe recibir un aviso si cambia su controlador.");
assert.match(textContent(notice), /Prisma se ha actualizado/);
assert.match(textContent(notice), /Recargar/);
assert.equal(reloads, 0, "No debe recargarse por sorpresa una pantalla con posibles cambios sin guardar.");
const reloadButton = notice.children.find(child => child.tagName === "button");
assert.ok(reloadButton);
assert.equal(reloadButton.attributes["aria-label"], "Recargar Prisma y aplicar la actualización");
reloadButton.click();
assert.equal(reloads, 1, "La recarga requiere elección explícita.");
environment.handlers.controllerchange();
assert.equal(toastRoot.children.length, 1, "No se deben apilar avisos duplicados.");

const freshEnvironment = makeServiceWorker(null);
const freshRoot = new FakeElement("div", documentRef);
const freshUpdater = createPWAUpdateController({
  getServiceWorker: () => freshEnvironment.serviceWorker,
  getWindow: () => ({ isSecureContext: true, location: { reload() {} } }),
  getToastRoot: () => freshRoot
});
await freshUpdater.register();
freshEnvironment.serviceWorker.controller = { version: "first-install" };
freshEnvironment.handlers.controllerchange();
assert.equal(freshRoot.children.length, 0, "Una instalación nueva no debe ver un aviso de actualización.");

const unsupportedUpdater = createPWAUpdateController({
  getServiceWorker: () => null, getWindow: () => ({ isSecureContext: true }), getToastRoot: () => toastRoot
});
assert.equal(await unsupportedUpdater.register(), null, "Sin soporte de service worker debe continuar sin error.");
console.log("PWA: comprobación inmediata, aviso accesible, recarga explícita y primera instalación silenciosa.");
