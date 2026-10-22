import { formatPanamaDateMDY } from "../core/date-utils.js";

export function createPresentationUtils(dependencies) {
  const escapeHTML = dependencies.escapeHTML;

  function cardColor(movie) {
    const text = (movie.genres || []).join(" ");
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return 199 + Math.abs(hash) % 24;
  }

  function infoButton(topic, label) {
    const accessibleLabel = label || "Más información";
    return '<button class="info-button" type="button" data-action="show-info" data-info="' + escapeHTML(topic) + '" aria-label="' + escapeHTML(accessibleLabel) + '" title="' + escapeHTML(accessibleLabel) + '">!</button>';
  }

  function metric(label, value, note) {
    return '<div class="metric-card"><div class="metric-label">' + label + '</div><div class="metric-value">' + value + '</div>' + (note ? '<div class="metric-note">' + note + '</div>' : "") + '</div>';
  }

  function sectionHead(title, description, action) {
    return '<div class="section-head"><div><h2>' + title + '</h2><p>' + description + '</p></div>' + (action || "") + '</div>';
  }

  function barRow(label, value, max, suffix) {
    const percent = max > 0 ? Math.max(3, Math.min(100, value / max * 100)) : 0;
    return '<div class="bar-row"><span class="bar-label" title="' + escapeHTML(label) + '">' + escapeHTML(label) + '</span><div class="bar-track"><div class="bar-fill" style="width:' + percent.toFixed(1) + '%"></div></div><span class="bar-value">' + escapeHTML(suffix || value) + '</span></div>';
  }

  function formatDate(value) {
    if (!value) return "fecha no disponible";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "fecha no disponible";
    return new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function niceRuntime(minutes) {
    const runtime = Number(minutes);
    if (!runtime || runtime < 1) return "—";
    return Math.floor(runtime / 60) + " h " + String(runtime % 60).padStart(2,"0") + " min";
  }

  function dateLabel(value) {
    if (!value) return "Fecha desconocida";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("es-PA",{day:"numeric",month:"long",year:"numeric"}).format(date);
  }

  function formatWatchedDate(value) {
    return formatPanamaDateMDY(value) || "Fecha desconocida";
  }

  function displayMovieStatus(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "released") return "Estrenada";
    if (normalized.indexOf("post") >= 0) return "Post-producción";
    if (normalized.indexOf("production") >= 0) return "En producción";
    if (normalized.indexOf("planned") >= 0) return "En desarrollo";
    return status || "Estado desconocido";
  }

  function externalMovieUrl(movie, externalIds) {
    const imdb = (externalIds && externalIds.imdb_id) || (movie && movie.imdbId);
    return imdb ? "https://www.imdb.com/title/" + encodeURIComponent(imdb) + "/" :
      (movie && movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movie.tmdbId) : "https://www.themoviedb.org/");
  }

  function personImage(path) {
    return path ? "https://image.tmdb.org/t/p/w185" + path : "";
  }

  function hasTrustedTMDBScore(movie) {
    const film = movie || {};
    const average = Number(film.voteAverage);
    const trustedSource = film.metadataSource === "tmdb" || film.source === "tmdb";
    return trustedSource && Number.isFinite(average) && average > 0 && average <= 10;
  }

  function formatVoteCount(value) {
    const count = Number(value);
    if (!Number.isSafeInteger(count) || count < 1) return "";
    return count.toLocaleString("es-PA") + (count === 1 ? " voto" : " votos");
  }

  function buildRatingMetrics(movie, externalIds) {
    const film = movie || {};
    const title = String(film.title || "Película");
    const movieId = film.tmdbId ? String(film.tmdbId) : "";
    const tmdbUrl = movieId
      ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movieId)
      : "https://www.themoviedb.org/search?query=" + encodeURIComponent(title);
    const imdbId = (externalIds && externalIds.imdb_id) || film.imdbId || "";
    const imdbUrl = imdbId
      ? "https://www.imdb.com/title/" + encodeURIComponent(imdbId) + "/"
      : "https://www.imdb.com/find/?q=" + encodeURIComponent(title);
    const criticUrl = "https://www.rottentomatoes.com/search?search=" + encodeURIComponent(title);
    const metacriticUrl = "https://www.metacritic.com/search/" + encodeURIComponent(title) + "/";
    const average = Number(film.voteAverage);
    const hasScore = hasTrustedTMDBScore(film);
    const votes = hasScore ? formatVoteCount(film.voteCount) : "";
    const communityMetric = hasScore
      ? '<a class="detail-rating-card" href="' + escapeHTML(tmdbUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="Ver la puntuación de la comunidad de ' + escapeHTML(title) + ' en TMDB" title="Puntuación pública de TMDB"><strong>' + average.toFixed(1) + '</strong><span>Nota media</span><small>TMDB' + (votes ? ' · ' + escapeHTML(votes) : '') + '</small></a>'
      : '<a class="detail-rating-card rating-external" href="' + escapeHTML(tmdbUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="Consultar puntuación de ' + escapeHTML(title) + ' en TMDB"><strong>↗</strong><span>Consultar nota</span><small>TMDB</small></a>';

    return communityMetric +
      '<a class="detail-rating-card rating-external" href="' + escapeHTML(imdbUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="Buscar ' + escapeHTML(title) + ' en IMDb" title="Abrir IMDb"><strong>↗</strong><span>Buscar título</span><small>IMDb</small></a>' +
      '<a class="detail-rating-card rating-external" href="' + escapeHTML(criticUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="Buscar críticas y puntuaciones de ' + escapeHTML(title) + ' en Rotten Tomatoes" title="Buscar en Rotten Tomatoes"><strong>↗</strong><span>Buscar título</span><small>Rotten Tomatoes</small></a>' +
      '<a class="detail-rating-card rating-external" href="' + escapeHTML(metacriticUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="Buscar críticas y puntuaciones de ' + escapeHTML(title) + ' en Metacritic" title="Buscar en Metacritic"><strong>↗</strong><span>Buscar título</span><small>Metacritic</small></a>';
  }

  function personAge(birthday, deathday) {
    if (!birthday) return "Edad desconocida";
    const born = new Date(birthday), end = deathday ? new Date(deathday) : new Date();
    if (Number.isNaN(born.getTime()) || Number.isNaN(end.getTime())) return "Edad desconocida";
    let age = end.getFullYear() - born.getFullYear();
    if (end.getMonth() < born.getMonth() || (end.getMonth() === born.getMonth() && end.getDate() < born.getDate())) age -= 1;
    return age + " años";
  }

  return { cardColor, infoButton, metric, sectionHead, barRow, formatDate, niceRuntime, dateLabel, formatWatchedDate, displayMovieStatus, externalMovieUrl, personImage, hasTrustedTMDBScore, formatVoteCount, buildRatingMetrics, personAge };
}
