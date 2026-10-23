export function createCollectionViews(ctx) {
  function recentPoster(item) {
    return '<button class="recent-movie" type="button" data-action="details" data-title="' + ctx.escapeHTML(item.title) + '" data-tmdb-id="' + ctx.escapeHTML(item.tmdbId || "") + '" data-year="' + ctx.escapeHTML(item.year || "") + '">' +
      (item.posterUrl ? '<img class="recent-poster-image" data-tmdb-id="' + ctx.escapeHTML(item.tmdbId || "") + '" src="' + ctx.escapeHTML(item.posterUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '') +
      '<span class="recent-movie-meta">' + ctx.escapeHTML(item.year || "Película") + '</span><strong>' + ctx.escapeHTML(item.title) + '</strong></button>';
  }

  function collectionRow(item, tab) {
    const rating = ctx.ratingValue(item);
    const publicRating = ctx.hasTrustedTMDBScore(item) ?
      '<span class="collection-score public-score" title="Valoración pública de TMDB"><span aria-hidden="true">★</span> ' + Number(item.voteAverage).toFixed(1) + '</span>' :
      (item.tmdbId ? '<a class="collection-score score-link" href="https://www.themoviedb.org/movie/' + encodeURIComponent(item.tmdbId) + '" target="_blank" rel="noopener noreferrer" aria-label="Consultar puntuación pública de TMDB">↗</a>' : '<span class="collection-score score-muted">—</span>');
    const personalRating = tab === "pending" ? "" :
      (rating ? '<span class="collection-score personal-score"><span aria-hidden="true">★</span> ' + rating + '/10</span>' : '<span class="collection-score score-muted">Sin nota</span>');
    const release = item.releaseDate ? ctx.dateLabel(item.releaseDate) : (item.year || "Estreno pendiente");
    const synopsis = item.overview ? ctx.escapeHTML(item.overview) : "Sin sinopsis disponible.";
    const stateLabel = tab === "hidden" ? '<span class="collection-row-state">Oculta</span>' :
      (tab === "pending" ? '<span class="collection-row-state pending-state">Pendiente</span>' : "");
    return '<div class="collection-row">' +
      '<button class="collection-row-main" type="button" data-action="details" data-title="' + ctx.escapeHTML(item.title) + '" data-tmdb-id="' + ctx.escapeHTML(item.tmdbId || "") + '" data-year="' + ctx.escapeHTML(item.year || "") + '">' +
      '<span class="collection-row-poster">' + (item.posterUrl ? '<img data-tmdb-id="' + ctx.escapeHTML(item.tmdbId || "") + '" src="' + ctx.escapeHTML(item.posterUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="poster-fallback">▣</span>') + '</span>' +
      '<span class="collection-row-copy"><span class="collection-release">' + ctx.escapeHTML(release) + '</span><strong>' + ctx.escapeHTML(item.title) + '</strong><span class="collection-synopsis">' + synopsis + '</span></span>' +
      '</button><span class="collection-row-side"><span class="collection-row-scores">' + personalRating + publicRating + '</span>' + stateLabel + '</span></div>';
  }

  function collectionCompactCard(item) {
    const rating = ctx.ratingValue(item);
    const seenMarker = ctx.isInHistory(item.title,item.tmdbId) ? "seen" : (ctx.isInWatchlist(item.title,item.tmdbId) ? "pending" : "hidden");
    return '<button class="collection-compact-card" type="button" data-action="details" data-title="' + ctx.escapeHTML(item.title) + '" data-tmdb-id="' + ctx.escapeHTML(item.tmdbId || "") + '" data-year="' + ctx.escapeHTML(item.year || "") + '">' +
      '<span class="compact-poster">' + (item.posterUrl ? '<img data-tmdb-id="' + ctx.escapeHTML(item.tmdbId || "") + '" src="' + ctx.escapeHTML(item.posterUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="poster-fallback">▣</span>') + '<i class="collection-marker ' + seenMarker + '"></i></span>' +
      '<strong>' + ctx.escapeHTML(item.title) + '</strong><small>' + ctx.escapeHTML(item.year || "") + (rating ? " · ★ " + rating + "/10" : "") + '</small></button>';
  }

  function renderCollectionContent() {
    if (ctx.collectionMode === "lists") {
      const historyCount = ctx.getCollectionItems("history").length;
      const pendingCount = ctx.getCollectionItems("pending").length;
      const hiddenCount = ctx.getCollectionItems("hidden").length;
      const cards = [
        {tab:"history",title:"Historial",description:"",count:historyCount,icon:"✓"},
        {tab:"pending",title:"Pendientes",description:"",count:pendingCount,icon:"＋"},
        {tab:"hidden",title:"Ocultos",description:"",count:hiddenCount,icon:"◌"}
      ];
      return '<div class="system-lists-grid">' + cards.map(function (item) {
        return '<button class="system-list-card" type="button" data-action="collection-open-tab" data-tab="' + item.tab + '"><span class="system-list-icon">' + item.icon + '</span><span class="system-list-copy"><strong>' + item.title + '</strong></span><span class="system-list-count">' + item.count.toLocaleString("es-PA") + '</span></button>';
      }).join("") + '</div>';
    }
    const tab = ctx.collectionTab;
    const all = ctx.getCollectionItems(tab);
    const recent = tab === "history" ? all.slice().sort(function (a, b) { return ctx.dateScore(ctx.latestRecordDate(b)) - ctx.dateScore(ctx.latestRecordDate(a)); }).slice(0, 4) : [];
    const title = tab === "history" ? "Todos" : (tab === "pending" ? "Pendientes" : "Ocultos");
    const sortLabels = {title:"Título",public:"Mejores valorados",rating:"Mi valoración",runtime:"Duración",release:"Más reciente",added:"Añadidos recientemente",random:"Aleatorio"};
    const noItems = tab === "history" ? "Tu historial está vacío" : (tab === "pending" ? "No tienes películas pendientes" : "No has ocultado ninguna película");
    return (recent.length ? '<section class="recent-section"><div class="collection-section-title"><h2>Añadidos recientemente</h2><span>Últimos 4</span></div><div class="recent-grid">' + recent.map(recentPoster).join("") + '</div></section>' : "") +
      '<div class="collection-list-heading"><h2>' + title + ' <span>(' + all.length.toLocaleString("es-PA") + ')</span></h2><span class="sort-summary">' + ctx.escapeHTML(sortLabels[ctx.collectionSort] || "Añadidos recientemente") + '</span></div>' +
      (all.length ? (ctx.collectionLayout === "compact" ? '<div class="collection-compact-grid">' + all.map(function (item) { return collectionCompactCard(item); }).join("") + '</div>' : '<div class="collection-list">' + all.map(function (item) { return collectionRow(item,tab); }).join("") + '</div>') :
        '<div class="empty-state collection-empty"><div class="empty-icon">' + (tab === "hidden" ? "◌" : "▣") + '</div><h3>' + noItems + '</h3><p>' + (tab === "history" ? "Sin películas vistas." : (tab === "pending" ? "Sin películas pendientes." : "Sin películas ocultas.")) + '</p><button class="btn btn-secondary" type="button" data-nav="catalog">Descubrir películas</button></div>');
  }

  function refreshCollectionContent() {
    const root = ctx.$("#collectionResultsRoot");
    if (root) root.innerHTML = renderCollectionContent();
  }

  function renderLibrary() {
    const tabs = [
      {key:"history",label:"Historial",count:ctx.getCollectionItems("history").length},
      {key:"pending",label:"Pendientes",count:ctx.getCollectionItems("pending").length},
      {key:"hidden",label:"Ocultos",count:ctx.getCollectionItems("hidden").length}
    ];
    const modeSwitch = '<div class="collection-mode-switch" role="tablist" aria-label="Tipo de colección"><button type="button" role="tab" class="' + (ctx.collectionMode === "movies" ? "active" : "") + '" data-action="collection-mode" data-mode="movies" aria-selected="' + (ctx.collectionMode === "movies") + '">Películas</button><button type="button" role="tab" class="' + (ctx.collectionMode === "lists" ? "active" : "") + '" data-action="collection-mode" data-mode="lists" aria-selected="' + (ctx.collectionMode === "lists") + '">Listas</button></div>';
    const movieTabs = ctx.collectionMode === "movies" ?
      '<div class="collection-tabs" role="tablist" aria-label="Vistas de la colección">' + tabs.map(function (tab) { return '<button type="button" role="tab" class="' + (ctx.collectionTab === tab.key ? "active" : "") + '" data-action="collection-tab" data-tab="' + tab.key + '" aria-selected="' + (ctx.collectionTab === tab.key) + '">' + tab.label + '<span>' + tab.count.toLocaleString("es-PA") + '</span></button>'; }).join("") + '</div>' : "";
    const searchPanel = ctx.showCollectionSearch && ctx.collectionMode === "movies" ?
      '<label class="collection-search"><span aria-hidden="true">⌕</span><input type="search" data-collection-search value="' + ctx.escapeHTML(ctx.collectionQuery) + '" placeholder="Buscar en mi colección…" aria-label="Buscar solo en mi colección"><button type="button" data-action="toggle-collection-search" aria-label="Cerrar búsqueda">✕</button></label>' : "";
    const tools = ctx.collectionMode === "movies" ?
      '<div class="collection-tools"><div class="collection-tools-left"><button class="collection-tool collection-search-trigger" type="button" data-action="toggle-collection-search" aria-label="Buscar en mi colección" title="Buscar en mi colección"><span aria-hidden="true">⌕</span> Buscar</button><button class="collection-tool" type="button" data-action="open-sort"><span aria-hidden="true">⇅</span> Ordenar <i>' + (ctx.collectionDirection === "asc" ? "↑" : "↓") + '</i></button><button class="collection-tool ' + (ctx.collectionGenres.length ? "has-filter" : "") + '" type="button" data-action="open-genres"><span aria-hidden="true">☷</span> Géneros' + (ctx.collectionGenres.length ? '<b>' + ctx.collectionGenres.length + '</b>' : "") + '</button>' + (ctx.collectionTab === "pending" ? '<button class="collection-tool ' + (ctx.onlyReleased ? "has-filter" : "") + '" type="button" data-action="toggle-released" aria-pressed="' + ctx.onlyReleased + '">Estrenada</button>' : "") + '</div><div class="collection-tools-right"><button class="collection-view-toggle" type="button" data-action="toggle-layout" aria-label="Cambiar la vista">' + (ctx.collectionLayout === "list" ? "▦ Compacta" : "☰ Lista") + '</button>' + ctx.infoButton("collection","Información sobre tu colección") + '</div></div>' : "";
    return '<section class="collection-page">' + modeSwitch + movieTabs + searchPanel + tools +
      '<div id="collectionResultsRoot">' + renderCollectionContent() + '</div></section>';
  }

  return { recentPoster, collectionRow, collectionCompactCard, renderCollectionContent, refreshCollectionContent, renderLibrary };
}
