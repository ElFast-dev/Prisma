import { resolveExplicitWatchedAt } from "./presentation-utils.js?v=core-20261022-4";
import { groupPersonFilmography } from "./person-filmography.js?v=core-20261022-1";

export function createModalViews(ctx) {
  function renderUtilitySheet() {
    const root = ctx.$("#modalRoot");
    if (!root || !ctx.utilitySheet) return;
    if (ctx.utilitySheet.type === "info") {
      const help = {
        progress:{title:"Progreso",body:"Resume las películas vistas, las notas y la media personal de este navegador. Las tendencias por género usan los metadatos enlazados disponibles."},
        discover:{title:"Descubrir",body:"Aquí tienes recomendaciones, búsqueda TMDB y catálogo local. Las recomendaciones no incluyen películas vistas, pendientes u ocultas."},
        recommendations:{title:"Recomendaciones",body:"Prisma compara géneros, palabras clave, trama y otros metadatos cinematográficos disponibles con tus valoraciones. La nota mostrada es una estimación personal, no una puntuación pública ni una garantía."},
        collection:{title:"Tu colección",body:"Historial reúne películas vistas o valoradas. Pendientes guarda títulos para más tarde. Ocultos los retira de recomendaciones sin borrar sus notas. La búsqueda y los filtros solo afectan a la colección."},
        genres:{title:"Géneros",body:"Puedes seleccionar varios. Se muestran películas que coinciden con al menos uno de los géneros escogidos."},
        metadata:{title:"Carátulas y datos",body:"El JSON aporta títulos, identificadores TMDB, fechas y valoraciones; no incluye imágenes ni sinopsis. Prisma usa los identificadores para recuperar carátulas, géneros, sinopsis, duración y otros datos. Los resultados se guardan en este navegador."},
        tmdb:{title:"TMDB",body:"TMDB proporciona imágenes y datos de películas. Si no hay dato externo verificable, Prisma ofrece un enlace en vez de inventar una puntuación."},
        import:{title:"Importar JSON",body:"Prisma importa movies.cH (vistas), movies.cW (pendientes) y movies.rM (valoraciones). Las series de shows se ignoran. Tus notas manuales existentes tienen prioridad."},
        privacy:{title:"Privacidad",body:"Notas, listas y credencial TMDB se guardan en este navegador. No publiques tu JSON en GitHub. Exporta una copia de seguridad antes de borrar los datos del navegador."},
        lab:{title:"Laboratorio",body:"Muestra patrones de tus valoraciones y comprueba el motor con el historial enlazado. Las medidas son experimentales."},
        ratings:{title:"Puntuaciones",body:"La puntuación pública aparece si la fuente la entrega. IMDb, Rotten Tomatoes y Metacritic se abren como enlaces si sus cifras no están disponibles directamente."}
      };
      const info = help[ctx.utilitySheet.key] || help.collection;
      root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet info-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><h2 id="sheetTitle">' + ctx.escapeHTML(info.title) + '</h2><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><p class="info-sheet-copy">' + ctx.escapeHTML(info.body) + '</p><button class="btn btn-primary sheet-accept" type="button" data-action="close-sheet">Entendido</button></section></div>';
      return;
    }
    if (ctx.utilitySheet.type === "sort") {
      const options = [
        {key:"title",label:"Título",hint:"Orden alfabético"},
        {key:"public",label:"Mejores valorados",hint:"Nota pública de TMDB"},
        {key:"rating",label:"Mi valoración",hint:"Tu nota del 1 al 10"},
        {key:"runtime",label:"Duración",hint:"Películas más largas o cortas"},
        {key:"release",label:"Más reciente",hint:"Fecha de estreno"},
        {key:"added",label:"Añadidos recientemente",hint:"Fecha en que guardaste la película"},
        {key:"random",label:"Aleatorio",hint:"Mezcla la lista"}
      ];
      root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><div class="eyebrow">PERSONALIZA TU LISTA</div><h2 id="sheetTitle">Ordenar por</h2></div><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><button class="sort-direction" type="button" data-action="toggle-sort-direction"><span>Dirección del orden</span><strong>' + (ctx.utilitySheet.direction === "asc" ? "Ascendente ↑" : "Descendente ↓") + '</strong></button><div class="sheet-options">' + options.map(function (item) {
        const active = ctx.utilitySheet.sort === item.key;
        return '<button type="button" class="sheet-option ' + (active ? "active" : "") + '" data-action="choose-sort" data-sort="' + item.key + '"><span><strong>' + item.label + '</strong><small>' + item.hint + '</small></span><span class="sheet-option-mark">' + (active ? (ctx.utilitySheet.direction === "asc" ? "↑" : "↓") : "") + '</span></button>';
      }).join("") + '</div><button class="btn btn-primary sheet-accept" type="button" data-action="accept-sort">Aceptar</button></section></div>';
      return;
    }
    if (ctx.utilitySheet.type === "genres") {
      const genres = ctx.uniqueStrings(ctx.COLLECTION_GENRES.concat(ctx.allGenres())).sort(function (a, b) { return a.localeCompare(b, "es"); });
      root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><div class="eyebrow">AFINA LA SELECCIÓN</div><h2 id="sheetTitle">Géneros</h2></div><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><p class="kicker">Puedes seleccionar varios géneros. Se mostrarán películas que coincidan con al menos uno.</p><div class="sheet-genre-grid">' + genres.map(function (genre) {
        const selected = ctx.utilitySheet.genres.some(function (value) { return ctx.titleKey(value) === ctx.titleKey(genre); });
        return '<button type="button" class="sheet-genre ' + (selected ? "selected" : "") + '" data-action="toggle-sheet-genre" data-genre="' + ctx.escapeHTML(genre) + '" aria-pressed="' + selected + '"><span>' + ctx.escapeHTML(genre) + '</span><b>' + (selected ? "✓" : "+") + '</b></button>';
      }).join("") + '</div><div class="sheet-footer-actions"><button class="btn btn-quiet" type="button" data-action="clear-sheet-genres">Limpiar</button><button class="btn btn-primary" type="button" data-action="accept-genres">Aceptar</button></div></section></div>';
      return;
    }
    const current = ctx.movieDetail ? ctx.movieDetail.movie : null;
    root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><div class="eyebrow">TU COLECCIÓN</div><h2 id="sheetTitle">Gestionar listas</h2><p>' + ctx.escapeHTML(current ? current.title : "") + '</p></div><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><div class="manage-list-actions"><button class="manage-list-action" type="button" data-action="manage-history"><span>✓</span><strong>' + (current && ctx.isInHistory(current.title) ? "Ya está en tu historial" : "Añadir al historial") + '</strong><small>Marcar como vista sin necesidad de poner una nota.</small></button><button class="manage-list-action" type="button" data-action="manage-pending"><span>＋</span><strong>' + (current && ctx.isInWatchlist(current.title) ? "Quitar de pendientes" : "Añadir a pendientes") + '</strong><small>Guardar para verla más adelante.</small></button><button class="manage-list-action" type="button" data-action="manage-hidden"><span>◌</span><strong>' + (current && ctx.isHidden(current.title) ? "Mostrar en Prisma" : "Ocultar película") + '</strong><small>Controla si aparece en Descubrir y en tus listas visibles.</small></button></div></section></div>';
  }

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

  function renderPersonDetails() {
    const root = ctx.$("#modalRoot");
    if (!root || !ctx.personDetail) return;
    const person = ctx.personDetail.person || {};
    const biography = person.biography || "";
    const creditsSource = ctx.personDetail.credits
      ? (ctx.personDetail.credits.cast || []).concat(ctx.personDetail.credits.crew || [])
      : [];
    const filmographyGroups = groupPersonFilmography(creditsSource, {
      filterToCollection: ctx.personListFilter === "collection",
      isMovieInCollection: function (title, tmdbId) {
        return ctx.isMovieInCollection(title, tmdbId);
      }
    });
    const creditCount = filmographyGroups.reduce(function (total, group) {
      return total + group.items.length;
    }, 0);
    const roles = ctx.personDetail.character
      ? '<span class="person-role">' + ctx.escapeHTML(ctx.personDetail.character) + '</span>'
      : "";
    const films = filmographyGroups.map(function (group) {
      const rows = group.items.map(function (item) {
        const movie = ctx.fromTMDB(item);
        const role = item.character || item.job || "";
        const marker = ctx.isMovieInCollection(movie.title, movie.tmdbId)
          ? '<span class="collection-marker ' +
            (ctx.isInHistory(movie.title, movie.tmdbId)
              ? "seen"
              : (ctx.isInWatchlist(movie.title, movie.tmdbId) ? "pending" : "hidden")) +
            '"></span>'
          : "";
        return '<button class="person-film-row" type="button" data-action="movie-from-person" data-title="' +
          ctx.escapeHTML(movie.title) + '" data-tmdb-id="' + ctx.escapeHTML(movie.tmdbId || "") +
          '" data-year="' + ctx.escapeHTML(movie.year || "") + '"><span class="person-film-poster">' +
          (movie.posterUrl
            ? '<img src="' + ctx.escapeHTML(movie.posterUrl) + '" alt="" loading="lazy">'
            : '<span>▣</span>') +
          '</span><span class="person-film-copy"><span class="collection-release">' +
          ctx.escapeHTML(group.year) + '</span><strong>' + ctx.escapeHTML(movie.title) +
          '</strong><small>' + ctx.escapeHTML(role) + '</small><span>' +
          ctx.escapeHTML(item.overview || "Sin sinopsis disponible.") +
          '</span></span>' + marker + '<span class="film-clapper" aria-hidden="true">▣</span></button>';
      }).join("");
      return '<section class="person-filmography-group" aria-label="Filmografía: ' +
        ctx.escapeHTML(group.label) + '"><div class="detail-section-heading"><h3>' +
        ctx.escapeHTML(group.label) + '</h3><span>' + group.items.length +
        (group.items.length === 1 ? ' película' : ' películas') +
        '</span></div><div class="person-film-list">' + rows + '</div></section>';
    }).join("");
    root.innerHTML = '<div class="modal-backdrop detail-backdrop" data-action="backdrop-close"><section class="modal person-sheet" role="dialog" aria-modal="true" aria-labelledby="personTitle" data-modal-panel><div class="person-header"><button class="detail-back" type="button" data-action="person-back">‹ <span>Volver a la película</span></button><div class="person-header-content">' +
      (person.profile_path
        ? '<img src="https://image.tmdb.org/t/p/w342' + ctx.escapeHTML(person.profile_path) + '" alt="" class="person-portrait">'
        : '<div class="person-portrait person-portrait-empty">●</div>') +
      '<div><h2 id="personTitle">' + ctx.escapeHTML(person.name || ctx.personDetail.name) + '</h2>' +
      roles + '<p>' + ctx.escapeHTML(ctx.personAge(person.birthday, person.deathday)) +
      (person.birthday ? " · " + ctx.escapeHTML(ctx.dateLabel(person.birthday)) : "") +
      '</p><p>' + ctx.escapeHTML(person.place_of_birth || "Lugar de nacimiento desconocido") +
      '</p><a href="https://www.themoviedb.org/person/' + encodeURIComponent(ctx.personDetail.id) +
      '" target="_blank" rel="noopener noreferrer">Ver ficha en TMDB ↗</a></div></div></div><div class="person-body">' +
      '<section class="detail-section"><div class="detail-section-heading"><h3>Biografía</h3></div><p>' +
      ctx.escapeHTML(biography || (ctx.personDetail.loading ? "Cargando biografía…" : "Sin biografía.")) +
      '</p></section><section class="detail-section"><div class="detail-section-heading"><h3>Filmografía</h3><span>' +
      creditCount + ' títulos</span></div><div class="person-filter-tabs"><button class="' +
      (ctx.personListFilter === "all" ? "active" : "") +
      '" type="button" data-action="person-filter" data-filter="all">Películas</button><button class="' +
      (ctx.personListFilter === "collection" ? "active" : "") +
      '" type="button" data-action="person-filter" data-filter="collection">Colección</button></div>' +
      (films ? '<div class="person-filmography-groups">' + films + '</div>' :
        '<div class="empty-inline"><strong>Sin películas en esta vista</strong></div>') +
      '</section>' + (ctx.personDetail.error ? '<div class="notice">' +
        ctx.escapeHTML(ctx.personDetail.error) + '</div>' : "") +
      '</div></section></div>';
  }

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

  return { renderUtilitySheet, renderMovieDetails, renderPersonDetails, renderRatingSheet };
}
