import { resolveExplicitWatchedAt } from "./presentation-utils.js?v=core-20261022-4";

export function createMovieDetailView(ctx) {
  function renderMovieDetails() {
    const root = ctx.$("#modalRoot");
    if (!root || !ctx.movieDetail) return;
    const movie = ctx.movieDetail.movie, data = ctx.movieDetail.data, rating = ctx.ratingFor(movie.title,movie.tmdbId,movie.year);
    const seen = ctx.isInHistory(movie.title,movie.tmdbId), pending = ctx.isInWatchlist(movie.title,movie.tmdbId), hidden = ctx.isHidden(movie.title,movie.tmdbId);
    const backdrop = movie.backdropUrl || movie.posterUrl || "";
    const genreChips = (movie.genres || []).slice(0,6).map(function (genre) { return '<span class="detail-chip">' + ctx.escapeHTML(ctx.displayGenre(genre)) + '</span>'; }).join("");
    const countryLine = (movie.productionCountries || []).slice(0,3).join(" · ");
    const release = movie.releaseDate ? ctx.dateLabel(movie.releaseDate) : (movie.year || "Estreno no disponible");
    const watchedRecord = (ctx.state.watched || []).find(function (entry) { return ctx.sameMovieRecord(entry,movie); }) || null;
    const markedAt = resolveExplicitWatchedAt(watchedRecord, rating);
    const stateButton = seen ?
      '<button class="btn btn-primary detail-state-button" type="button" data-action="manage-history"><span aria-hidden="true">▣</span> Añadido al historial <small>' + ctx.escapeHTML(markedAt ? ctx.formatWatchedDate(markedAt) : "Fecha no registrada") + '</small></button>' :
      (pending ?
        '<button class="btn btn-secondary detail-state-button" type="button" data-action="manage-pending"><span aria-hidden="true">✓</span> Añadido a pendientes</button><button class="btn btn-primary" type="button" data-action="mark-watched">Marcar como vista</button>' :
        '<button class="btn btn-primary" type="button" data-action="manage-history">Añadir al historial</button><button class="btn btn-secondary" type="button" data-action="manage-pending">＋ Pendientes</button>');
    const voteLink = movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movie.tmdbId) : "https://www.themoviedb.org/";
    const externalIds = data && data.externalIds ? data.externalIds : {};
    const ratingMetrics = ctx.buildRatingMetrics(movie,externalIds);
    const cast = data && data.credits && Array.isArray(data.credits.cast) ? data.credits.cast.slice(0,14) : [];
    const crew = data && data.credits && Array.isArray(data.credits.crew) ? data.credits.crew : [];
    const director = crew.find(function (person) { return person.job === "Director"; });
    const writers = crew.filter(function (person) { return /writer|screenplay|story/i.test(String(person.job || "")); }).slice(0,4);
    const music = crew.find(function (person) { return /original music|composer|music/i.test(String(person.job || "")); });
    const crewChips =
      (director ? '<button class="crew-person" type="button" data-action="person-details" data-person-id="' + director.id + '" data-person-name="' + ctx.escapeHTML(director.name) + '"><small>Dirección</small><strong>' + ctx.escapeHTML(director.name) + '</strong></button>' : "") +
      writers.map(function (person) { return '<button class="crew-person" type="button" data-action="person-details" data-person-id="' + person.id + '" data-person-name="' + ctx.escapeHTML(person.name) + '"><small>' + ctx.escapeHTML(person.job || "Guion") + '</small><strong>' + ctx.escapeHTML(person.name) + '</strong></button>'; }).join("") +
      (music ? '<button class="crew-person" type="button" data-action="person-details" data-person-id="' + music.id + '" data-person-name="' + ctx.escapeHTML(music.name) + '"><small>Música</small><strong>' + ctx.escapeHTML(music.name) + '</strong></button>' : "");
    const castMarkup = cast.length ? '<div class="person-carousel">' + cast.map(function (person) {
      return '<button class="cast-person" type="button" data-action="person-details" data-person-id="' + person.id + '" data-person-name="' + ctx.escapeHTML(person.name) + '" data-character="' + ctx.escapeHTML(person.character || "") + '"><span class="cast-photo">' + (person.profile_path ? '<img src="' + ctx.escapeHTML(ctx.personImage(person.profile_path)) + '" alt="" loading="lazy">' : '<span>●</span>') + '</span><strong>' + ctx.escapeHTML(person.name) + '</strong><small>' + ctx.escapeHTML(person.character || "Reparto") + '</small></button>';
    }).join("") + '</div>' : '<span class="kicker">—</span>';
    const providers = data && data.providers ? data.providers : null;
    const providerCards = [];
    if (providers) ["flatrate","free","ads","rent","buy"].forEach(function (kind) {
      (providers[kind] || []).forEach(function (provider) {
        if (!providerCards.some(function (existing) { return existing.id === provider.provider_id; })) providerCards.push({id:provider.provider_id,name:provider.provider_name,logo:provider.logo_path,kind:kind});
      });
    });
    const providerMarkup = providerCards.length ? '<div class="provider-list">' + providerCards.map(function (provider) {
      const label = provider.kind === "flatrate" ? "Streaming" : (provider.kind === "rent" ? "Alquiler" : (provider.kind === "buy" ? "Compra" : "Gratis / anuncios"));
      return '<a class="provider-chip" href="' + ctx.escapeHTML(providers.link || voteLink + "/watch") + '" target="_blank" rel="noopener noreferrer">' + (provider.logo ? '<img src="https://image.tmdb.org/t/p/w92' + ctx.escapeHTML(provider.logo) + '" alt="" loading="lazy">' : "") + '<span><strong>' + ctx.escapeHTML(provider.name) + '</strong><small>' + label + '</small></span></a>';
    }).join("") + '</div>' : (data ? '<a class="btn btn-secondary btn-small" href="' + ctx.escapeHTML(voteLink + "/watch") + '" target="_blank" rel="noopener noreferrer">Consultar disponibilidad ↗</a>' : '<span class="kicker">—</span>');
    const collection = data && movie.collection ? movie.collection : null;
    const collectionMarkup = collection ? '<a class="saga-card" href="https://www.themoviedb.org/collection/' + encodeURIComponent(collection.id) + '" target="_blank" rel="noopener noreferrer"><span class="saga-art">' + (collection.poster_path ? '<img src="https://image.tmdb.org/t/p/w185' + ctx.escapeHTML(collection.poster_path) + '" alt="" loading="lazy">' : "▣") + '</span><span><small>PERTENECE A LA COLECCIÓN</small><strong>' + ctx.escapeHTML(collection.name) + '</strong></span><span aria-hidden="true">↗</span></a>' : "";
    const recs = data && data.recommendations ? ctx.uniqueDiscoveryMovies(data.recommendations).filter(function (item) {
      return !ctx.isMovieInCollection(item.title,item.tmdbId);
    }).slice(0,12) : [];
    const similarMarkup = recs.length ? '<div class="similar-carousel">' + recs.map(function (item) {
      const marker = ctx.isInHistory(item.title,item.tmdbId) ? "seen" : (ctx.isInWatchlist(item.title,item.tmdbId) ? "pending" : "");
      return '<button class="similar-poster" type="button" data-action="details" data-title="' + ctx.escapeHTML(item.title) + '" data-tmdb-id="' + ctx.escapeHTML(item.tmdbId || "") + '" data-year="' + ctx.escapeHTML(item.year || "") + '">' + (item.posterUrl ? '<img src="' + ctx.escapeHTML(item.posterUrl) + '" alt="" loading="lazy">' : '<span class="poster-fallback">▣</span>') + (marker ? '<i class="collection-marker ' + marker + '"></i>' : "") + '<strong>' + ctx.escapeHTML(item.title) + '</strong></button>';
    }).join("") + '</div>' : "";
    const videos = data && data.videos ? data.videos : [];
    const trailer = videos.find(function (video) { return video.site === "YouTube" && video.type === "Trailer"; }) || videos.find(function (video) { return video.site === "YouTube"; });
    const trailerUrl = trailer ? "https://www.youtube.com/watch?v=" + encodeURIComponent(trailer.key) : (movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movie.tmdbId) + "/videos" : "");
    root.innerHTML = '<div class="modal-backdrop detail-backdrop" data-action="backdrop-close"><section class="modal detail-sheet" role="dialog" aria-modal="true" aria-labelledby="detailTitle" data-modal-panel>' +
      '<div class="detail-scroll"><header class="detail-hero" style="' + (backdrop ? 'background-image:linear-gradient(180deg,rgba(4,8,14,.18) 0%,rgba(4,8,14,.24) 38%,var(--bg-elevated) 100%),url(&quot;' + ctx.escapeHTML(backdrop) + '&quot;)' : '') + '"><button class="detail-back" type="button" data-action="close-modal" aria-label="Volver">‹ <span>Volver</span></button><div class="detail-hero-title"><div class="eyebrow">' + ctx.escapeHTML(movie.year || "PELÍCULA") + (movie.originalTitle && movie.originalTitle !== movie.title ? ' · ' + ctx.escapeHTML(movie.originalTitle) : "") + '</div><h2 id="detailTitle">' + ctx.escapeHTML(movie.title) + '</h2>' + (movie.tagline ? '<p>' + ctx.escapeHTML(movie.tagline) + '</p>' : "") + '</div></header>' +
      '<div class="detail-body"><div class="detail-state-actions">' + stateButton + '<button class="btn btn-quiet" type="button" data-action="manage-lists">Gestionar listas</button><button class="btn btn-quiet" type="button" data-action="toggle-hidden">' + (hidden ? "Mostrar en Prisma" : "Ocultar") + '</button></div>' +
      '<div class="detail-meta-line"><span>Estreno <strong>' + ctx.escapeHTML(release) + '</strong></span><span>País <strong>' + ctx.escapeHTML(countryLine || "—") + '</strong></span><span>Duración <strong>' + ctx.escapeHTML(ctx.niceRuntime(movie.runtime)) + '</strong></span><span>Estado <strong>' + ctx.escapeHTML(ctx.displayMovieStatus(movie.status)) + '</strong></span></div>' +
      (genreChips ? '<div class="detail-chip-row">' + genreChips + '</div>' : "") +
      '<section class="detail-section"><div class="detail-section-heading"><h3>Puntuaciones</h3>' + ctx.infoButton("ratings","Información sobre puntuaciones externas") + '</div><div class="detail-rating-grid">' + ratingMetrics + '</div></section>' +
      '<section class="detail-section"><div class="detail-section-heading"><h3>Dónde verla</h3></div>' + providerMarkup + '</section>' +
      '<section class="detail-section synopsis-section"><div class="detail-section-heading"><h3>Sinopsis</h3></div>' + (movie.overview ? '<p>' + ctx.escapeHTML(movie.overview) + '</p>' : '<p class="kicker">Sin sinopsis.</p>') + '</section>' +
      '<div class="detail-action-strip"><button class="btn btn-primary" type="button" data-action="rate">' + (rating ? "Calificar · " + ctx.ratingValue(rating) + "/10" : "Calificar") + '</button><button class="btn btn-secondary" type="button" data-action="open-reviews">Comentarios</button><button class="btn btn-secondary" type="button" data-action="open-trailer">Tráiler</button><a class="btn btn-secondary" href="' + ctx.escapeHTML(ctx.externalMovieUrl(movie,externalIds)) + '" target="_blank" rel="noopener noreferrer">Enlace ↗</a><button class="btn btn-secondary" type="button" data-action="share-movie">Compartir</button></div>' +
      '<section class="detail-section"><div class="detail-section-heading"><h3>Reparto &amp; equipo</h3></div>' + castMarkup + (crewChips ? '<div class="crew-list">' + crewChips + '</div>' : "") + '</section>' +
      (collectionMarkup ? '<section class="detail-section"><div class="detail-section-heading"><h3>Colecciones</h3></div>' + collectionMarkup + '</section>' : "") +
      (similarMarkup ? '<section class="detail-section"><div class="detail-section-heading"><h3>También podría gustarte</h3></div>' + similarMarkup + '</section>' : "") +
      (ctx.movieDetail.loading ? '<div class="detail-loading"><span class="spinner"></span><p>Completando la ficha con TMDB…</p></div>' : "") +
      (ctx.movieDetail.error ? '<div class="notice detail-error"><strong>No se pudo completar la ficha.</strong> ' + ctx.escapeHTML(ctx.movieDetail.error) + '<button class="btn btn-secondary btn-small" type="button" data-action="retry-movie-detail">Reintentar</button></div>' : "") +
      (!data && !ctx.movieDetail.loading ? '<div class="detail-connection-note"><span>Completar ficha</span>' + ctx.infoButton("tmdb","Información sobre cómo se completa la ficha") + '<button class="btn btn-secondary btn-small" type="button" data-nav="data">Conectar TMDB</button></div>' : "") +
      '</div></div></section></div>';
  }
  return { renderMovieDetails };
}
