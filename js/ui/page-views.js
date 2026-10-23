import { createWatchStreakView } from "./watch-streak-view.js?v=core-20261023-1";
import { createLabViews } from "./lab-views.js?v=core-20261023-1";
import { createCollectionViews } from "./collection-views.js?v=core-20261023-1";

export function createPageViews(ctx) {
  function movieCard(movie, options) {
    const opts = options || {};
    const hue = ctx.cardColor(movie);
    const rating = ctx.ratingFor(movie.title,movie.tmdbId,movie.year);
    const actionLabel = rating ? "Editar nota" : "Calificar";
    const score = movie.prediction ? '<div class="movie-score">✦ ' + movie.prediction.score.toFixed(1).replace(".", ",") + '/10 estimado</div>' : (rating ? '<div class="movie-score">★ Tu nota: ' + ctx.ratingValue(rating) + '/10</div>' : "");
    const meta = [movie.year, (movie.genres || []).slice(0, 2).map(ctx.displayGenre).join(" · ")].filter(Boolean).join(" · ");
    const posterBackground = 'background:radial-gradient(circle at 75% 22%,hsla(' + hue + ',65%,65%,.35),transparent 42%),linear-gradient(145deg,hsl(' + hue + ',32%,25%),#13131d 66%,hsl(' + ((hue + 14) % 360) + ',28%,19%))';
    const posterImage = movie.posterUrl ? '<img class="poster-image" data-tmdb-id="' + ctx.escapeHTML(movie.tmdbId || "") + '" src="' + ctx.escapeHTML(movie.posterUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '';
    const posterFallback = '<span class="poster-symbol" aria-hidden="true">✦</span><strong class="poster-title">' + ctx.escapeHTML(movie.title) + '</strong><span class="poster-year">' + ctx.escapeHTML(movie.year || "Película") + '</span>';
    if (opts.posterOnly) {
      return '<article class="movie-card movie-card-poster-only">' +
        '<button class="poster-art movie-poster-trigger" type="button" data-action="details" data-title="' + ctx.escapeHTML(movie.title) + '" data-tmdb-id="' + ctx.escapeHTML(movie.tmdbId || "") + '" data-year="' + ctx.escapeHTML(movie.year || "") + '" aria-label="Ver detalles de ' + ctx.escapeHTML(movie.title) + '" style="' + posterBackground + '">' +
        posterImage + posterFallback + '</button></article>';
    }
    const detail = opts.compact ? "" : '<div class="movie-actions"><button class="btn btn-secondary" type="button" data-action="details" data-title="' + ctx.escapeHTML(movie.title) + '" data-tmdb-id="' + ctx.escapeHTML(movie.tmdbId || "") + '" data-year="' + ctx.escapeHTML(movie.year || "") + '">Detalles</button><button class="btn btn-primary" type="button" data-action="rate" data-title="' + ctx.escapeHTML(movie.title) + '" data-tmdb-id="' + ctx.escapeHTML(movie.tmdbId || "") + '" data-year="' + ctx.escapeHTML(movie.year || "") + '">' + actionLabel + '</button></div>';
    return '<article class="movie-card">' +
      '<div class="poster-art" role="img" aria-label="Tarjeta de ' + ctx.escapeHTML(movie.title) + '" style="' + posterBackground + '">' +
      posterImage + posterFallback + '</div>' +
      '<div class="movie-copy"><h3 class="movie-title">' + ctx.escapeHTML(movie.title) + '</h3><div class="movie-meta">' + ctx.escapeHTML(meta || "Metadatos pendientes") + '</div>' + score + detail + '</div></article>';
  }

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


  function movieGrid(movies) {
    return '<div class="movie-grid poster-grid">' + movies.map(function (movie) { return movieCard(movie,{posterOnly:true}); }).join("") + '</div>';
  }

  function filterCatalog() {
    const query = ctx.titleKey(ctx.catalogQuery);
    return ctx.uniqueDiscoveryMovies(ctx.catalog).filter(function (movie) {
      const text = ctx.titleKey(movie.title + " " + (movie.genres || []).join(" ") + " " + (movie.tags || []).join(" ") + " " + (movie.year || ""));
      const queryOkay = !query || text.indexOf(query) >= 0;
      const genreOkay = ctx.activeGenre === "Todos" || (movie.genres || []).some(function (genre) { return ctx.titleKey(genre) === ctx.titleKey(ctx.activeGenre); });
      return queryOkay && genreOkay && !ctx.isInHistory(movie.title,movie.tmdbId) && !ctx.isHidden(movie.title,movie.tmdbId);
    });
  }

  function renderCatalogResults() {
    const target = ctx.$("#localCatalogResults");
    if (!target) return;
    const results = filterCatalog();
    const cap = 80;
    const truncated = results.length > cap;
    target.innerHTML = results.length ?
      movieGrid(results.slice(0, cap)) + (truncated ? '<p class="kicker result-cap">Mostrando 80 de ' + results.length.toLocaleString("es-PA") + ' resultados. Refina la búsqueda para ver menos.</p>' : "") :
      (!ctx.catalog.length && !ctx.catalogQuery.trim()
        ? '<div class="empty-state"><div class="empty-icon">⌕</div><h3>Tu catálogo personal está vacío</h3><p>Prisma no carga películas de muestra. Explora títulos reales en TMDB; solo se añadirán a tu colección cuando tú lo decidas.</p></div>'
        : '<div class="empty-state"><div class="empty-icon">⌕</div><h3>No encontramos esa película</h3><p>Prueba otro título o consulta los resultados de TMDB.</p><button class="btn btn-secondary" type="button" data-action="import-catalog">Importar CSV</button></div>');
    const count = ctx.$("#catalogCount");
    if (count) count.textContent = results.length.toLocaleString("es-PA") + " películas";
  }

  function renderCatalog() {
    const genres = ["Todos"].concat(ctx.allGenres());
    const genreChips = genres.slice(0,13).map(function (genre) {
      return '<button class="chip ' + (ctx.activeGenre === genre ? "active" : "") + '" type="button" data-action="genre" data-genre="' + ctx.escapeHTML(genre) + '">' + ctx.escapeHTML(ctx.displayGenre(genre)) + '</button>';
    }).join("");
    const recommendationMode = ["balanced","affinity","variety"].includes(ctx.recommendationMode) ? ctx.recommendationMode : "balanced";
    const profile = ctx.buildProfile();
    const hasPersonalizedSignals = profile.withMetadata > 0;
    const recs = ctx.getRecommendations(4,recommendationMode);
    const recommendationModeCopy = {
      balanced: "Mezcla equilibrada de afinidad y descubrimiento.",
      affinity: "Prioriza las películas con mejores estimaciones para tus gustos.",
      variety: "Busca géneros distintos sin perder de vista tu afinidad."
    }[recommendationMode];
    const recommendationModes = [
      {id:"balanced",label:"Equilibrado"},
      {id:"affinity",label:"Más afines"},
      {id:"variety",label:"Más variedad"}
    ].map(function (mode) {
      const active = recommendationMode === mode.id;
      return '<button class="chip recommendation-mode' + (active ? ' active' : '') + '" type="button" data-action="recommendation-mode" data-mode="' + mode.id + '" aria-pressed="' + active + '">' + mode.label + '</button>';
    }).join("");
    const recommendationTitle = hasPersonalizedSignals ? "Recomendadas para ti" : "Empieza a descubrir";
    const recommendationIntro = hasPersonalizedSignals ? recommendationModeCopy :
      "Cuando tengas valoraciones con géneros o temas enlazados, Prisma podrá adaptar estas sugerencias a tus gustos.";
    const recommendationEmptyState = ctx.catalog.length
      ? '<div class="empty-inline"><strong>No hay recomendaciones disponibles</strong><button class="btn btn-secondary btn-small" type="button" data-nav="library">Abrir colección</button></div>'
      : (!ctx.tmdbCredential || !ctx.tmdbCredential.value
        ? '<div class="empty-inline"><strong>Tu espacio empieza vacío</strong><span>Conecta TMDB desde Ajustes / Datos para explorar películas reales. No se añadirá ninguna película a tu colección automáticamente.</span><button class="btn btn-secondary btn-small" type="button" data-nav="data">Conectar TMDB</button></div>'
        : '<div class="empty-inline"><strong>Aún no hay recomendaciones personales</strong><span>Explora las películas de TMDB y añade las que te interesen. Prisma podrá adaptar las sugerencias cuando haya valoraciones propias.</span></div>');
    const searchCaption = ctx.catalogQuery.trim() ? 'Resultados para «' + ctx.escapeHTML(ctx.catalogQuery.trim()) + '»' : "Catálogo";
    const personalCatalogCount = ctx.catalog.length.toLocaleString("es-PA") + (ctx.catalog.length === 1 ? " título personal" : " títulos personales");
    return '<section class="page-heading discover-heading"><h1>Descubrir</h1>' + ctx.infoButton("discover","Información sobre Descubrir") + '<span class="discover-count">' + personalCatalogCount + '</span></section>' +
      '<section class="discover-recommendations"><div class="section-head"><h2>' + recommendationTitle + '</h2>' + ctx.infoButton("recommendations","Cómo funcionan las recomendaciones") + '</div>' +
      '<div class="recommendation-controls" role="group" aria-label="Enfoque de recomendaciones">' + recommendationModes + '</div>' +
      '<p class="recommendation-mode-copy" aria-live="polite">' + ctx.escapeHTML(recommendationIntro) + '</p>' +
      (recs.length ? '<div class="movie-grid poster-grid featured-recommendations">' + recs.map(function (movie) { return movieCard(movie,{posterOnly:true}); }).join("") + '</div>' : recommendationEmptyState) +
      '</section>' +
      '<section class="panel tmdb-browser discover-tmdb"><div class="panel-head"><h3>Explorar TMDB</h3>' + ctx.infoButton("tmdb","Información sobre TMDB") + '</div><div id="tmdbStatus" class="kicker"></div><div id="tmdbResults" class="tmdb-results"></div></section>' +
      '<section class="local-catalog-section"><div class="section-head"><h2 id="catalogSearchTitle">' + searchCaption + '</h2><span id="catalogCount">Cargando…</span><button class="btn btn-secondary btn-small" type="button" data-action="import-catalog" aria-label="Importar catálogo CSV">＋ CSV</button></div><div class="chip-row catalog-genre-chips">' + genreChips + '</div><div id="localCatalogResults"></div></section>';
  }


  const { recentPoster, collectionRow, collectionCompactCard, renderCollectionContent, refreshCollectionContent, renderLibrary } = createCollectionViews(ctx);

  const { renderLab } = createLabViews(ctx);

  function renderAppearanceSettings() {
    const activeTheme = ctx.theme === "light" ? "light" : "dark";
    return '<section class="panel appearance-panel" aria-labelledby="appearance-heading">' +
      '<div class="panel-head"><div><h3 id="appearance-heading">Apariencia</h3><p class="appearance-description">Oscuro por defecto. Tu elección se guarda en este dispositivo.</p></div></div>' +
      '<div class="theme-options" role="group" aria-label="Elegir tema de Prisma">' +
      '<button class="theme-choice" type="button" data-action="set-theme" data-theme="dark" aria-pressed="' + (activeTheme === "dark" ? "true" : "false") + '">' +
        '<span class="theme-preview theme-preview-dark" aria-hidden="true"><i></i><b></b></span>' +
        '<span class="theme-choice-copy"><strong>Oscuro</strong><small>Negro y azul acero</small></span>' +
        '<span class="theme-choice-mark" aria-hidden="true">✓</span>' +
      '</button>' +
      '<button class="theme-choice" type="button" data-action="set-theme" data-theme="light" aria-pressed="' + (activeTheme === "light" ? "true" : "false") + '">' +
        '<span class="theme-preview theme-preview-light" aria-hidden="true"><i></i><b></b></span>' +
        '<span class="theme-choice-copy"><strong>Claro</strong><small>Blanco y gris suave</small></span>' +
        '<span class="theme-choice-mark" aria-hidden="true">✓</span>' +
      '</button>' +
      '</div></section>';
  }

  function renderTMDBSettings() {
    const kind = ctx.tmdbCredential && ctx.tmdbCredential.kind === "apiKey" ? "apiKey" : "readToken";
    const connected = Boolean(ctx.tmdbCredential && ctx.tmdbCredential.value);
    return '<section class="panel tmdb-settings"><div class="panel-head"><div class="panel-title-row"><h3>TMDB</h3>' + ctx.infoButton("privacy","Información sobre la conexión TMDB") + '</div><span class="badge ' + (connected ? "badge-mint" : "") + '">' + (connected ? "Conectado" : "Sin conectar") + '</span></div>' +
      '<div class="form-field"><label class="field-label" for="tmdbAuthType">Tipo de credencial</label><select id="tmdbAuthType" class="field"><option value="readToken" ' + (kind === "readToken" ? "selected" : "") + '>Token de acceso de lectura</option><option value="apiKey" ' + (kind === "apiKey" ? "selected" : "") + '>Clave API v3</option></select></div>' +
      '<div class="form-field"><label class="field-label" for="tmdbCredentialInput">Credencial TMDB</label><input class="field" id="tmdbCredentialInput" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + (connected ? "Guardada; deja vacío para conservarla" : "Pega aquí tu credencial") + '"></div>' +
      '<div class="hero-actions"><button class="btn btn-primary" type="button" data-action="save-tmdb">Guardar en este dispositivo</button><button class="btn btn-secondary" type="button" data-action="test-tmdb">Probar conexión</button>' + (connected ? '<button class="btn btn-danger" type="button" data-action="remove-tmdb">Eliminar credencial</button>' : "") + '</div>' +
      '</section>';
  }


  function formatStorageBytes(value) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let amount = value;
    let unit = 0;
    while (amount >= 1024 && unit < units.length - 1) {
      amount /= 1024;
      unit += 1;
    }
    return amount.toLocaleString("es-PA", { maximumFractionDigits: unit === 0 ? 0 : 1 }) + " " + units[unit];
  }

  function renderStorageProtectionSettings() {
    const snapshot = ctx.storageProtectionSnapshot || {};
    let statusLabel = "Comprobando…";
    let description = "Consultando si el navegador ofrece almacenamiento persistente.";
    let badgeClass = "";

    if (snapshot.persisted === true) {
      statusLabel = "Persistencia concedida";
      description = "El navegador informa de que el almacenamiento de este sitio es persistente, lo que reduce el riesgo de expulsión automática por presión de almacenamiento. No impide borrar los datos del sitio.";
      badgeClass = " badge-mint";
    } else if (snapshot.supported === false) {
      statusLabel = "Solicitud no disponible";
      description = "Este navegador no permite solicitar persistencia desde Prisma. La aplicación seguirá funcionando normalmente.";
    } else if (snapshot.supported === true && snapshot.persisted === false) {
      statusLabel = "Aún no concedida";
      description = "El navegador puede denegar esta solicitud. Si no concede persistencia, el almacenamiento todavía podría retirarse automáticamente bajo presión.";
    } else if (snapshot.supported === true) {
      statusLabel = "Estado no confirmado";
      description = "Prisma no pudo confirmar el estado de persistencia. Puedes volver a solicitarla si el navegador lo permite.";
    }

    const estimate = typeof snapshot.usage === "number" && typeof snapshot.quota === "number"
      ? '<p class="metric-note">Uso estimado de este sitio: ' + formatStorageBytes(snapshot.usage) + ' de una cuota estimada de ' + formatStorageBytes(snapshot.quota) + '.</p>'
      : "";
    const action = snapshot.supported === true && snapshot.persisted !== true
      ? '<div class="hero-actions"><button class="btn btn-secondary" type="button" data-action="protect-storage"' + (ctx.storageProtectionBusy ? ' disabled' : '') + '>' + (ctx.storageProtectionBusy ? 'Solicitando…' : 'Proteger datos locales') + '</button></div>'
      : "";

    return '<section class="panel storage-protection-panel" aria-labelledby="storage-protection-heading">' +
      '<div class="panel-head"><div><h3 id="storage-protection-heading">Protección de datos locales</h3><p class="metric-note">Estado del almacenamiento del navegador</p></div><span class="badge' + badgeClass + '">' + statusLabel + '</span></div>' +
      '<p class="appearance-description">' + description + '</p>' +
      estimate +
      action +
      '<p class="metric-note">La persistencia no sustituye las copias de seguridad y no impide borrar manualmente los datos del sitio. Exporta una copia de seguridad desde esta pantalla; las sesiones privadas pueden tener reglas de almacenamiento propias.</p>' +
      '</section>';
  }

  function renderData() {
    const stats = ctx.summaryStats();
    return '<section class="page-heading"><h1>Ajustes</h1>' + ctx.infoButton("privacy","Información sobre privacidad y datos") + '</section>' +
      renderAppearanceSettings() +
      renderTMDBSettings() +
      renderStorageProtectionSettings() +
      '<div class="data-metadata-host">' + ctx.renderTMDBHistoryPanel() + '</div>' +
      '<div class="settings-grid settings-grid-clean">' +
      '<section class="panel"><div class="panel-head"><h3>Importar historial JSON</h3>' + ctx.infoButton("import","Qué importa el JSON") + '</div><button class="btn btn-primary" type="button" data-action="import-json">Importar JSON</button></section>' +
      '<section class="panel"><div class="panel-head"><h3>Ampliar catálogo</h3>' + ctx.infoButton("import","Información sobre importaciones") + '</div><button class="btn btn-secondary" type="button" data-action="import-catalog">Importar CSV</button></section>' +
      '<section class="panel"><div class="panel-head"><h3>Copia de seguridad</h3>' + ctx.infoButton("privacy","Información sobre copias de seguridad") + '</div><div class="hero-actions"><button class="btn btn-secondary" type="button" data-action="export-backup">Exportar</button><button class="btn btn-quiet" type="button" data-action="restore-backup">Restaurar</button></div></section>' +
      '<section class="panel"><div class="panel-head"><h3>Estado del perfil</h3></div>' +
      '<div class="setting-row"><div><strong>Películas valoradas</strong></div><span class="badge">' + stats.total.toLocaleString("es-PA") + '</span></div>' +
      '<div class="setting-row"><div><strong>Metadatos enlazados</strong></div><span class="badge">' + stats.matched.toLocaleString("es-PA") + '</span></div>' +
      '<div class="setting-row"><div><strong>Última actualización</strong></div><span class="kicker">' + ctx.escapeHTML(ctx.formatDate(ctx.state.updatedAt)) + '</span></div>' +
      '<div class="setting-row"><div><strong>Restablecer perfil</strong></div><button class="btn btn-danger btn-small" type="button" data-action="reset">Borrar datos</button></div></section></div>';
  }


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
