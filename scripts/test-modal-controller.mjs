import assert from "node:assert/strict";
import { createModalController } from "../js/ui/modal-controller.js";

const movie = { title: "Prisma Modal Return Fixture", tmdbId: "987654" };
const root = { innerHTML: "" };
const renders = { details: 0, rating: 0, utility: 0, person: 0 };
let detailElement = null;
const ctx = {
  ratingFor() { return null; },
  ratingValue() { return 7; },
  $ (selector) {
    if (selector === "#modalRoot") return root;
    if (selector === ".detail-sheet") return detailElement;
    return null;
  },
  $$() { return []; },
  movieDetail: null,
  modalDraft: null,
  ratingReturnDetail: false,
  personDetail: null,
  utilitySheet: null,
  collectionSort: "added",
  collectionDirection: "desc",
  collectionGenres: [],
  renderUtilitySheet() { renders.utility += 1; },
  renderPersonDetails() { renders.person += 1; },
  renderRatingSheet() { renders.rating += 1; },
  renderMovieDetails() {
    renders.details += 1;
    detailElement = { visible: true };
    root.innerHTML = '<section class="detail-sheet">detail</section>';
  },
  tmdbCredential: null
};

const controller = createModalController(ctx);
ctx.renderModal = controller.renderModal;

controller.openModal(movie, "details");
assert.ok(ctx.movieDetail, "La ficha debe establecer un estado de detalle.");
assert.ok(detailElement, "La ficha debe estar renderizada.");

ctx.movieDetail = null; // Reproduce el caso límite: UI visible, estado de detalle temporalmente ausente.
controller.openModal(movie, "rate");
assert.equal(ctx.modalDraft.returnMovieDetail.movie.tmdbId, movie.tmdbId,
  "El modal de calificación debe conservar la ficha de origen si sigue visible en el DOM.");

ctx.movieDetail = null; // La misma pérdida de estado puede ocurrir mientras se está calificando.
controller.closeModal();
assert.equal(ctx.modalDraft, null, "Cerrar el editor debe descartar el borrador.");
assert.equal(ctx.movieDetail.movie.tmdbId, movie.tmdbId,
  "Cerrar el editor debe restaurar la ficha que originó la calificación.");
assert.ok(detailElement, "La ficha restaurada debe volver a renderizarse.");
assert.ok(renders.details >= 2, "Debe renderizarse tanto al abrir la ficha como al regresar del editor.");

// Rating opened from outside a detail must still close normally and must not manufacture a detail.
detailElement = null;
ctx.movieDetail = null;
controller.openModal(movie, "rate");
assert.equal(ctx.modalDraft.returnMovieDetail, null);
controller.closeModal();
assert.equal(ctx.movieDetail, null,
  "Cerrar una calificación abierta desde una lista no debe crear una ficha de detalle.");
assert.equal(root.innerHTML, "", "El modal sin ficha de origen debe cerrarse por completo.");

console.log("Retorno del modal verificado: conserva la ficha de origen sin interferir con calificaciones abiertas desde listas.");
