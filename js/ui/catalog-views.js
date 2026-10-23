export function createCatalogViews(ctx) {
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

  return { movieCard, movieGrid, filterCatalog, renderCatalogResults, renderCatalog };
}
