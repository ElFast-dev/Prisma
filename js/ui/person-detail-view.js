import { groupPersonFilmography } from "./person-filmography.js?v=core-20261022-1";

export function createPersonDetailView(ctx) {
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
  return { renderPersonDetails };
}
