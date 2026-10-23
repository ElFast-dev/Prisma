import { createWatchStreakView } from "./watch-streak-view.js?v=core-20261023-1";
import { createLabViews } from "./lab-views.js?v=core-20261023-5";
import { createCollectionViews } from "./collection-views.js?v=core-20261023-1";
import { createCatalogViews } from "./catalog-views.js?v=core-20261023-1";
import { createSettingsViews } from "./settings-views.js?v=core-20261023-1";
import { createProgressViews } from "./progress-views.js?v=core-20261023-1";

export function createPageViews(ctx) {
  function ratedMetadataCount() {
    return ctx.buildProfile().withMetadata;
  }

  const { renderConfirmedWatchStreakPanel } = createWatchStreakView(ctx);
  const { renderHome } = createProgressViews(ctx, renderConfirmedWatchStreakPanel);


  const { movieCard, movieGrid, filterCatalog, renderCatalogResults, renderCatalog } = createCatalogViews(ctx);


  const { recentPoster, collectionRow, collectionCompactCard, renderCollectionContent, refreshCollectionContent, renderLibrary } = createCollectionViews(ctx);

  const { renderLab } = createLabViews(ctx);

  const { renderTMDBSettings, renderData } = createSettingsViews(ctx);

  function renderApp() {
    const root = ctx.$("#appRoot");
    if (!root) return;
    const primaryPage = ctx.currentPage === "lab" ? "home" : (ctx.currentPage === "data" ? "library" : ctx.currentPage);
    ctx.$$(".nav-item").forEach(function (button) {
      const active = button.dataset.nav === primaryPage;
      button.classList.toggle("active",active);
      if (active) button.setAttribute("aria-current","page");
      else button.removeAttribute("aria-current");
    });
    const startedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const views = {home:renderHome,catalog:renderCatalog,library:renderLibrary,lab:renderLab,data:renderData};
    root.innerHTML = (views[ctx.currentPage] || renderHome)() + (ctx.currentPage === "data" ? ctx.renderTMDBAttribution() : "");
    const finishedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    if (typeof console !== "undefined" && typeof console.info === "function") {
      console.info("[Prisma performance]", JSON.stringify({
        operation: "navigation-render",
        page: ctx.currentPage,
        durationMs: Math.round(Math.max(0, finishedAt - startedAt) * 10) / 10,
        sampleCount: (ctx.state && ctx.state.rated || []).length,
        status: "completed"
      }));
    }
    if (ctx.currentPage === "lab" && typeof ctx.ensureLabMetrics === "function") {
      ctx.ensureLabMetrics();
    } else {
      // Leaving the Laboratory must not cancel a valid local diagnostic run.
      // Data mutations invalidate it through the metrics coordinator itself.
      if (typeof ctx.cancelLabExperiments === "function") ctx.cancelLabExperiments();
    }
    if (ctx.currentPage === "catalog") {
      renderCatalogResults();
      ctx.renderTMDBResults();
    }
  }



  return { movieCard, ratedMetadataCount, renderConfirmedWatchStreakPanel, renderHome, movieGrid, filterCatalog, renderCatalogResults, renderCatalog, recentPoster, collectionRow, collectionCompactCard, renderCollectionContent, refreshCollectionContent, renderLibrary, renderLab, renderTMDBSettings, renderData, renderApp };
}
