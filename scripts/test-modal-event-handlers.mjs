import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerAppEvents } from "../js/app/event-handlers.js";
import { createModalController } from "../js/ui/modal-controller.js";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const registrationStart = appSource.indexOf("  registerAppEvents({");
const registrationEnd = appSource.indexOf("\n  });\n\n  init().then", registrationStart);
assert.ok(registrationStart >= 0 && registrationEnd > registrationStart,
  "Debe existir el contexto real de registro de eventos en app.js.");
const eventContextSource = appSource.slice(registrationStart, registrationEnd);
assert.match(eventContextSource, /get modalDraft\(\)\s*\{\s*return modalDraft;\s*\}/,
  "app.js debe inyectar modalDraft en el contexto real que recibe registerAppEvents.");

const movie = { title: "Prisma Synthetic Modal Movie", tmdbId: "987654" };

function createHarness(action, emotion) {
  const listeners = new Map();
  const errors = [];
  const calls = { renderModal: 0, pending: [], watched: [], hidden: [] };
  const element = { addEventListener() {}, value: "" };
  const memoriesPanel = { open: true };
  const ctx = {
    document: {
      addEventListener(type, listener) { listeners.set(type, listener); },
      createElement() { return { className: "", textContent: "", appendChild() {} }; }
    },
    HTMLImageElement: class HTMLImageElement {},
    state: {},
    modalDraft: { movie: { ...movie }, emotions: [] },
    movieDetail: null,
    utilitySheet: { type: "manage" },
    $(selector) { return selector === ".rating-memories" ? memoriesPanel : element; },
    renderModal() { calls.renderModal += 1; },
    renderApp() {},
    toast(message, isError) { if (isError) errors.push(String(message)); },
    toggleWatchlist(...args) { calls.pending.push(args); },
    markWatched(...args) { calls.watched.push(args); },
    toggleHidden(...args) { calls.hidden.push(args); },
    clickNav() {},
    movieTmdbId(entry) { return String(entry && entry.tmdbId || ""); },
    window: {}
  };
  registerAppEvents(ctx);
  const button = {
    dataset: { action, emotion: emotion || "Asombro" },
    closest(selector) {
      if (selector === "[data-nav]") return null;
      if (selector === "[data-action]") return this;
      return null;
    }
  };
  async function click() {
    await listeners.get("click")({
      target: button,
      preventDefault() {},
      stopPropagation() {}
    });
  }
  return { ctx, calls, errors, click };
}

const emotion = createHarness("emotion", "Asombro");
await emotion.click();
assert.deepEqual(emotion.ctx.modalDraft.emotions, ["Asombro"]);
assert.equal(emotion.ctx.modalDraft.memoriesExpanded, true,
  "El contexto debe conservar abierto el panel de emociones al volver a pintar el modal.");
assert.equal(emotion.calls.renderModal, 1);
await emotion.click();
assert.deepEqual(emotion.ctx.modalDraft.emotions, [],
  "Volver a pulsar una emoción debe quitarla del borrador.");
assert.equal(emotion.calls.renderModal, 2);
assert.deepEqual(emotion.errors, [], "No debe aparecer el ReferenceError modalDraft is not defined.");

const detail = { ...movie };
const controllerState = {
  modalDraft: { movie: detail, mode: "rate", emotions: [] },
  movieDetail: { movie: detail },
  ratingReturnDetail: false,
  personDetail: null,
  utilitySheet: null,
  modalRoot: { innerHTML: "rating sheet" },
  renderCalls: 0
};
const controller = createModalController({
  get modalDraft() { return controllerState.modalDraft; },
  set modalDraft(value) { controllerState.modalDraft = value; },
  get movieDetail() { return controllerState.movieDetail; },
  set movieDetail(value) { controllerState.movieDetail = value; },
  get ratingReturnDetail() { return controllerState.ratingReturnDetail; },
  set ratingReturnDetail(value) { controllerState.ratingReturnDetail = value; },
  get personDetail() { return controllerState.personDetail; },
  set personDetail(value) { controllerState.personDetail = value; },
  get utilitySheet() { return controllerState.utilitySheet; },
  set utilitySheet(value) { controllerState.utilitySheet = value; },
  $() { return controllerState.modalRoot; },
  renderModal() { controllerState.renderCalls += 1; }
});
controller.closeModal();
assert.equal(controllerState.modalDraft, null,
  "Cerrar el editor debe retirar el borrador temporal.");
assert.deepEqual(controllerState.movieDetail, { movie: detail },
  "Cerrar el editor debe conservar una ficha activa incluso si ratingReturnDetail está desincronizado.");
assert.equal(controllerState.modalRoot.innerHTML, "rating sheet",
  "La ruta de retorno debe delegar la pintura a renderModal, no borrar el detalle directamente.");
assert.equal(controllerState.renderCalls, 1);


const cases = [
  ["manage-pending", "pending"],
  ["manage-history", "watched"],
  ["mark-watched", "watched"],
  ["manage-hidden", "hidden"],
  ["toggle-hidden", "hidden"]
];

for (const [action, expected] of cases) {
  const harness = createHarness(action);
  await harness.click();
  assert.deepEqual(harness.errors, [],
    action + " no debe depender de una variable modalDraft global.");
  assert.equal(harness.calls[expected].length, 1,
    action + " debe ejecutar su operación sobre el borrador activo.");
  assert.equal(harness.calls[expected][0][0], movie.title,
    action + " debe mantener el título del borrador.");
  assert.equal(harness.calls[expected][0][1], movie.tmdbId,
    action + " debe conservar la identidad TMDB del borrador aunque no haya una ficha abierta.");
  assert.equal(harness.ctx.utilitySheet, null,
    action + " debe cerrar la hoja de gestión después de actuar.");
}

console.log("Acciones de modal correctas: emociones, pendientes, historial y ocultación usan el contexto inyectado.");
