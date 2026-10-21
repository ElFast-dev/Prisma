import { createPWAUpdateController } from "./pwa-update.js?v=core-20261021-1";

export function createAppLifecycle(ctx) {
  const pwaUpdateController = createPWAUpdateController({
    getServiceWorker: function () { return ctx.navigator && ctx.navigator.serviceWorker; },
    getWindow: function () { return ctx.window; },
    getToastRoot: function () { return ctx.$("#toastRoot"); }
  });
  function clickNav(page) {
    if (["home","catalog","library","lab","data"].indexOf(page) < 0) return;
    if (page !== ctx.currentPage) {
      ctx.modalDraft = null; ctx.movieDetail = null; ctx.personDetail = null; ctx.utilitySheet = null; ctx.ratingReturnDetail = false;
      const modalRoot = ctx.$("#modalRoot");
      if (modalRoot) modalRoot.innerHTML = "";
    }
    ctx.currentPage = page;
    ctx.renderApp();
    if (page === "catalog" && ctx.tmdbCredential && ctx.tmdbCredential.value) {
      ctx.loadTMDBPage(1,ctx.catalogQuery.trim().length >= 2 ? "search" : "popular",false);
    }
    ctx.window.scrollTo({top:0,behavior:"smooth"});
  }

  async function init() {
    try {
      const results = await Promise.all([
        ctx.dbGet(ctx.STATE_KEY),
        ctx.dbGet(ctx.CATALOG_KEY),
        ctx.dbGet(ctx.TMDB_CREDENTIAL_KEY)
      ]);
      ctx.state = ctx.ensureState(results[0]);
      ctx.customCatalog = Array.isArray(results[1]) ? results[1].map(ctx.normalizeMovie).filter(Boolean) : [];
      ctx.tmdbCredential = results[2] && results[2].value ? results[2] : null;
      ctx.pruneTMDBCache();
      ctx.combineMovies();
      ctx.renderApp();
      if (ctx.tmdbCredential && ctx.tmdbCredential.value) ctx.window.setTimeout(function () { ctx.enrichRatedHistoryWithTMDB(); },350);
      pwaUpdateController.register();
    } catch (error) {
      ctx.$("#appRoot").innerHTML = '<div class="empty-state"><div class="empty-icon">!</div><h2>No se pudo iniciar Prisma</h2><p>' + ctx.escapeHTML(error.message || "Error al cargar los archivos") + '</p><button type="button" class="btn btn-primary" onclick="location.reload()">Reintentar</button></div>';
    }
  }

  return { clickNav, init };
}
