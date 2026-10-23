export function createRatingSheetView(ctx) {
  function renderRatingSheet() {
    if (!ctx.modalDraft) return;
    const root = ctx.$("#modalRoot");
    if (!root) return;
    const movie = ctx.modalDraft.movie, rating = ctx.ratingFor(movie.title, movie.tmdbId,movie.year);
    const stars = Array.from({ length: 10 }, function (_, index) {
      const value = index + 1;
      return '<button type="button" class="rating-star ' + (value <= ctx.modalDraft.rating ? "active" : "") + '" data-action="rating-star" data-rating="' + value + '" aria-label="Puntuar ' + value + ' de 10" aria-pressed="' + (value === ctx.modalDraft.rating) + '">★</button>';
    }).join("");
    root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal rating-sheet" role="dialog" aria-modal="true" aria-labelledby="ratingTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><h2 id="ratingTitle">Calificar</h2><p>' + ctx.escapeHTML(movie.title) + '</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Cerrar">✕</button></div><div class="rating-score-large"><strong id="ratingPreview">' + ctx.modalDraft.rating + '</strong><span>/ 10</span></div><div class="rating-stars" aria-label="Selecciona una nota del 1 al 10">' + stars + '</div><input id="ratingInput" type="hidden" value="' + ctx.modalDraft.rating + '"><p class="rating-only-hint">Tu nota es suficiente. Prisma analizará los metadatos de la película para personalizar tus recomendaciones.</p><div class="rating-sheet-actions">' + (rating ? '<button class="btn btn-danger-outline" type="button" data-action="delete-rating" data-title="' + ctx.escapeHTML(movie.title) + '" data-tmdb-id="' + ctx.escapeHTML(movie.tmdbId || "") + '" data-year="' + ctx.escapeHTML(movie.year || "") + '">Eliminar</button>' : '<button class="btn btn-danger-outline" type="button" data-action="close-modal">Cancelar</button>') + '<button class="btn btn-primary" type="button" data-action="save-rating">Guardar nota</button></div></section></div>';
  }
  return { renderRatingSheet };
}
