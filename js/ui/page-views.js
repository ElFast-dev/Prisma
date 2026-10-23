import { createWatchStreakView } from "./watch-streak-view.js?v=core-20261023-1";
import { createLabViews } from "./lab-views.js?v=core-20261023-1";
import { createCollectionViews } from "./collection-views.js?v=core-20261023-1";
import { createCatalogViews } from "./catalog-views.js?v=core-20261023-1";
import { createSettingsViews } from "./settings-views.js?v=core-20261023-1";

export function createPageViews(ctx) {
  function ratedMetadataCount() {
    return ctx.buildProfile().withMetadata;
  }

  const { renderConfirmedWatchStreakPanel } = createWatchStreakView(ctx);
  function renderHome() {
    const stats = ctx.summaryStats();
    const history = ctx.getCollectionItems("history").sort(function (a,b) { return ctx.dateScore(b.watchedAt)-ctx.dateScore(a.watchedAt); });
    const genres = ctx.genreStats().slice().sort(function (a,b) { return b.average-a.average; }).slice(0,6);
    const events = ctx.state.events.slice(0,5).map(function (event) {
      return '<div class="event-item"><div class="event-mark">' + ctx.escapeHTML(event.symbol || "•") + '</div><div class="event-copy"><strong>' + ctx.escapeHTML(event.title) + '</strong><small>' + ctx.escapeHTML(event.description) + ' · ' + ctx.escapeHTML(ctx.formatDate(event.at)) + '</small></div></div>';
    }).join("");
    const onboarding = stats.total === 0 ?
      '<section class="onboarding-callout progress-onboarding" aria-labelledby="progress-onboarding-title">' +
      '<span class="empty-icon" aria-hidden="true">✦</span>' +
      '<div class="onboarding-copy"><strong id="progress-onboarding-title">Empieza a construir tu perfil</strong><p>Valora algunas películas o importa tu historial para que Prisma detecte los géneros y temas que disfrutas.</p></div>' +
      '<div class="progress-onboarding-actions"><button class="btn btn-primary btn-small" type="button" data-nav="catalog">Explorar películas</button><button class="btn btn-secondary btn-small" type="button" data-nav="data">Importar historial</button></div>' +
      '</section>' : "";
    return '<section class="page-heading"><h1>Progreso</h1>' + ctx.infoButton("progress","Información sobre Progreso") + '<button class="btn btn-secondary btn-small page-heading-action" type="button" data-nav="lab">Laboratorio ↗</button></section>' +
      onboarding +
      renderConfirmedWatchStreakPanel() +
      '<div class="metrics-grid progress-metrics">' +
      ctx.metric("Vistas",String(history.length),"") +
      ctx.metric("Valoradas",String(stats.total),"") +
      ctx.metric("Pendientes",String(ctx.state.watchlist.length),"") +
      ctx.metric("Nota media",stats.average == null ? "—" : stats.average.toFixed(1).replace(".",","),"") +
      '</div>' +
      '<div class="progress-columns"><section class="panel"><div class="panel-head"><h3>Géneros mejor valorados</h3>' + ctx.infoButton("genres","Información sobre las tendencias por género") + '</div>' +
      (genres.length ? '<div class="bar-list">' + genres.map(function (item) { return ctx.barRow(ctx.displayGenre(item.name),item.average,10,item.average.toFixed(1).replace(".",",") + " · " + item.count); }).join("") + '</div>' : '<div class="empty-inline progress-empty"><span>Las tendencias aparecerán cuando tengas valoraciones suficientes.</span></div>') +
      '</section><section class="panel"><div class="panel-head"><h3>Actividad reciente</h3></div>' +
      (events ? '<div class="event-list">' + events + '</div>' : '<div class="empty-inline"><strong>Sin actividad reciente</strong></div>') +
      '</section></div>';
  }


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
    const views = {home:renderHome,catalog:renderCatalog,library:renderLibrary,lab:renderLab,data:renderData};
    root.innerHTML = (views[ctx.currentPage] || renderHome)() + (ctx.currentPage === "data" ? ctx.renderTMDBAttribution() : "");
    if (ctx.currentPage === "catalog") {
      renderCatalogResults();
      ctx.renderTMDBResults();
    }
  }



  return { movieCard, ratedMetadataCount, renderConfirmedWatchStreakPanel, renderHome, movieGrid, filterCatalog, renderCatalogResults, renderCatalog, recentPoster, collectionRow, collectionCompactCard, renderCollectionContent, refreshCollectionContent, renderLibrary, renderLab, renderTMDBSettings, renderData, renderApp };
}
