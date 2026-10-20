export function createTMDBViews(ctx) {
  function renderTMDBHistoryPanel() {
    const pending = ctx.pendingHistoryTMDBCount();
    const connected = Boolean(ctx.tmdbCredential && ctx.tmdbCredential.value);
    const status = ctx.tmdbHistorySync.running ?
      "Completando " + ctx.tmdbHistorySync.done.toLocaleString("es-PA") + " de " + ctx.tmdbHistorySync.total.toLocaleString("es-PA") :
      (ctx.tmdbHistorySync.finishedAt ? ctx.tmdbHistorySync.updated.toLocaleString("es-PA") + " actualizadas · " + ctx.tmdbHistorySync.failed.toLocaleString("es-PA") + " sin coincidencia" : "");
    const percent = ctx.tmdbHistorySync.total ? Math.round(ctx.tmdbHistorySync.done / ctx.tmdbHistorySync.total * 100) : 0;
    const button = !connected ?
      '<button class="btn btn-secondary" type="button" data-nav="data">Conectar TMDB</button>' :
      '<button class="btn btn-primary" type="button" data-action="enrich-history" ' + (ctx.tmdbHistorySync.running || pending === 0 ? "disabled" : "") + '>' +
      (ctx.tmdbHistorySync.running ? "Completando…" : (pending === 0 ? "Todo actualizado" : "Completar " + pending.toLocaleString("es-PA") + " títulos")) + '</button>';
    return '<section class="panel tmdb-history-panel"><div class="panel-head"><div class="panel-title-row"><h3>Carátulas y datos</h3>' + ctx.infoButton("metadata","Información sobre carátulas y datos") + '</div><span class="badge ' + (connected ? "badge-mint" : "") + '">' + (connected ? "TMDB conectado" : "TMDB desconectado") + '</span></div>' +
      '<div class="metadata-action-row"><span>' + pending.toLocaleString("es-PA") + ' por completar</span><div class="hero-actions">' + button + '</div></div>' +
      (ctx.tmdbHistorySync.running ? '<progress class="tmdb-progress" max="100" value="' + percent + '">' + percent + '%</progress><p class="metadata-progress-label">' + ctx.escapeHTML(status) + ' · ' + percent + '%</p>' : (status ? '<p class="metadata-progress-label">' + ctx.escapeHTML(status) + '</p>' : "")) +
      '</section>';
  }

  function renderTMDBAttribution() {
    return '<section class="tmdb-attribution" aria-label="Atribución de TMDB"><a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer"><img src="' + ctx.TMDB_LOGO_URL + '" alt="TMDB" loading="lazy"></a><div><strong>Datos e imágenes de The Movie Database (TMDB)</strong><p>Este producto utiliza TMDB y las API de TMDB, pero no está respaldado, certificado ni aprobado por TMDB.</p><a href="https://www.themoviedb.org/about/logos-attribution" target="_blank" rel="noopener noreferrer">Logos y atribución oficial ↗</a></div></section>';
  }

  function renderTMDBResults() {
    const status = ctx.$("#tmdbStatus");
    const target = ctx.$("#tmdbResults");
    if (!status || !target) return;
    if (!ctx.tmdbCredential || !ctx.tmdbCredential.value) {
      status.innerHTML = '<button class="btn btn-secondary btn-small" type="button" data-nav="data">Conectar con TMDB</button>';
      target.innerHTML = '';
      return;
    }
    const label = ctx.tmdbMode === "search" ? "Resultados para «" + ctx.catalogQuery.trim() + "»" : "Películas populares en TMDB";
    const visibleResults = ctx.uniqueDiscoveryMovies(ctx.tmdbResults).filter(function (movie) {
      return !ctx.isInHistory(movie.title,movie.tmdbId) && !ctx.isHidden(movie.title,movie.tmdbId);
    });
    status.textContent = (ctx.tmdbLoading ? "Consultando TMDB…" : (ctx.tmdbError ? "No se pudo completar la consulta." : label)) +
      (ctx.tmdbResults.length && !ctx.tmdbLoading && !ctx.tmdbError ? " · " + visibleResults.length + " disponibles" : "");
    if (ctx.tmdbLoading && !ctx.tmdbResults.length) {
      target.innerHTML = '<div class="loading-state"><span class="spinner"></span><p>Buscando películas…</p></div>';
      return;
    }
    if (ctx.tmdbError) {
      target.innerHTML = '<div class="notice"><strong>Error de TMDB.</strong> ' + ctx.escapeHTML(ctx.tmdbError) + '<div style="margin-top:10px"><button class="btn btn-secondary btn-small" type="button" data-action="tmdb-retry">Volver a intentar</button></div></div>';
      return;
    }
    if (!ctx.tmdbResults.length) {
      target.innerHTML = '<div class="empty-state"><div class="empty-icon">⌕</div><h3>No hay resultados</h3><p>Prueba otra búsqueda.</p></div>';
      return;
    }
    const resultsMarkup = visibleResults.length
      ? ctx.movieGrid(visibleResults)
      : '<div class="empty-inline discovery-filtered-empty"><strong>No hay películas nuevas en estos resultados.</strong><span>Los títulos vistos y ocultos se omiten de Descubrir.</span></div>';
    target.innerHTML = resultsMarkup +
      (ctx.tmdbPage < ctx.tmdbTotalPages ? '<div class="load-more-wrap"><button class="btn btn-secondary" type="button" data-action="tmdb-more">' + (ctx.tmdbLoading ? "Cargando…" : "Cargar más") + '</button></div>' : "");
  }

  return { renderTMDBHistoryPanel, renderTMDBAttribution, renderTMDBResults };
}
