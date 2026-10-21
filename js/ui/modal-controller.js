export function createModalController(ctx) {
  function openModal(movie, mode) {
    if (!movie) return;
    const existing = ctx.ratingFor(movie.title);
    const nextMode = mode || "details";
    if (nextMode === "rate") {
      const detailIsVisible = Boolean(ctx.$(".detail-sheet"));
      const returnMovieDetail = ctx.movieDetail ||
        (detailIsVisible ? { movie: movie, data: null, loading: false, error: "" } : null);
      ctx.ratingReturnDetail = Boolean(returnMovieDetail);
      ctx.modalDraft = {
        movie: movie,
        mode: "rate",
        returnMovieDetail: returnMovieDetail,
        rating: existing ? ctx.ratingValue(existing) : 7,
        emotions: existing && Array.isArray(existing.emotions) ? existing.emotions.slice() : [],
        note: existing && existing.note ? existing.note : ""
      };
      ctx.utilitySheet = null;
      renderModal();
      return;
    }
    ctx.movieDetail = { movie: movie, data: null, loading: false, error: "" };
    ctx.personDetail = null;
    ctx.modalDraft = null;
    ctx.utilitySheet = null;
    ctx.ratingReturnDetail = false;
    renderModal();
    if (ctx.tmdbCredential && ctx.tmdbCredential.value && movie.tmdbId) ctx.loadMovieDetail(movie);
  }

  function renderModal() {
    const root = ctx.$("#modalRoot");
    if (!root) return;
    if (ctx.utilitySheet) { ctx.renderUtilitySheet(); return; }
    if (ctx.personDetail) { ctx.renderPersonDetails(); return; }
    if (ctx.modalDraft && ctx.modalDraft.mode === "rate") { ctx.renderRatingSheet(); return; }
    if (ctx.movieDetail) { ctx.renderMovieDetails(); return; }
    root.innerHTML = "";
  }

  function openUtilitySheet(type) {
    ctx.utilitySheet = { type:type, key:"", sort:ctx.collectionSort, direction:ctx.collectionDirection, genres:ctx.collectionGenres.slice() };
    renderModal();
  }

  function openInfoSheet(key) {
    ctx.utilitySheet = {type:"info",key:key || "collection"};
    renderModal();
  }

  function updateRatingPreview(value) {
    if (!ctx.modalDraft) return;
    ctx.modalDraft.rating = Number(value);
    const preview = ctx.$("#ratingPreview"), input = ctx.$("#ratingInput");
    if (preview) preview.textContent = String(ctx.modalDraft.rating);
    if (input) input.value = String(ctx.modalDraft.rating);
    ctx.$$(".rating-star").forEach(function (star) {
      const active = Number(star.dataset.rating) <= ctx.modalDraft.rating;
      star.classList.toggle("active",active);
      star.setAttribute("aria-pressed",String(Number(star.dataset.rating) === ctx.modalDraft.rating));
    });
  }

  function closeModal() {
    if (ctx.modalDraft && ctx.modalDraft.mode === "rate") {
      // Keep an explicit return target: rating state and detail UI are different layers,
      // and the detail may temporarily be cleared by a render/state transition.
      const returnMovieDetail = ctx.movieDetail || ctx.modalDraft.returnMovieDetail || null;
      if (returnMovieDetail) {
        ctx.movieDetail = returnMovieDetail;
        ctx.modalDraft = null; ctx.ratingReturnDetail = false; renderModal(); return;
      }
    }
    ctx.modalDraft = null; ctx.ratingReturnDetail = false; ctx.movieDetail = null; ctx.personDetail = null; ctx.utilitySheet = null;
    const root = ctx.$("#modalRoot");
    if (root) root.innerHTML = "";
  }

  return { openModal, renderModal, openUtilitySheet, openInfoSheet, updateRatingPreview, closeModal };
}
