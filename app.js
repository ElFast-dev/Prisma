import { escapeHTML, titleKey, movieTmdbId, movieIdentityKey, sameMovieRecord, sameDiscoveryMovie, uniqueDiscoveryMovies, splitList, displayGenre, normalizeMovie, uniqueStrings, ratingValue } from "./js/core/movie-utils.js";
import { dbGet, dbSet } from "./js/core/storage.js?v=core-20261020-1";
import { emptyState, ensureState } from "./js/core/state-model.js";
import { movieFeatures } from "./js/recommendations/features.js";
import { createRecommendationEngine } from "./js/recommendations/engine.js";
import { parseCSVLine, parseCatalogCSV } from "./js/catalog/csv-parser.js";
import { createCatalogModel } from "./js/catalog/catalog-model.js?v=core-20261020-1";
import { createCollectionModel } from "./js/collection/collection-model.js?v=core-20261020-1";
import { createPresentationUtils } from "./js/ui/presentation-utils.js?v=core-20261020-1";
import { createPageViews } from "./js/ui/page-views.js?v=core-20261020-1";
import { createModalViews } from "./js/ui/modal-views.js?v=core-20261020-1";
import { movieMetadataFromJSON, extractPersonalCollections, hasImportedCollection, mergeMovieEntries, mergeMovieListByTitle, extractPersonalRatings } from "./js/import-export/personal-data.js";
import { createTMDBClient, normalizeCredential } from "./js/tmdb/client.js";

(function () {
  "use strict";

  const $ = function (selector, root) { return (root || document).querySelector(selector); };
  const $$ = function (selector, root) { return Array.from((root || document).querySelectorAll(selector)); };
  const STATE_KEY = "state";
  const CATALOG_KEY = "catalogCustom";
  const TMDB_CREDENTIAL_KEY = "tmdbCredential";
  const TMDB_LOGO_URL = "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg";
  const EMOTIONS = ["Asombro", "Alegría", "Tristeza", "Tensión", "Sorpresa", "Miedo", "Esperanza", "Curiosidad", "Empatía", "Nostalgia", "Frustración", "Alivio", "Ilusión", "Inquietud"];
 

  let seedCatalog = [];
  let customCatalog = [];
  let catalog = [];
  let catalogByTitle = new Map();
  let state = emptyState();
  let currentPage = "home";
  let catalogQuery = "";
  let activeGenre = "Todos";
  let modalDraft = null;
  let tmdbCredential = null;
  let tmdbResults = [];
  let tmdbPage = 1;
  let tmdbTotalPages = 1;
  let tmdbMode = "popular";
  let tmdbLoading = false;
  let tmdbError = "";
  let tmdbSearchTimer = null;
  let tmdbRequestSerial = 0;
  let tmdbHistorySync = { running: false, total: 0, done: 0, updated: 0, failed: 0, current: "", finishedAt: null };
  let tmdbEnrichRequested = false;
  let collectionTab = "history";
  let collectionMode = "movies";
  let collectionQuery = "";
  let collectionGenres = [];
  let collectionSort = "added";
  let collectionDirection = "desc";
  let collectionLayout = "list";
  let onlyReleased = false;
  let showCollectionSearch = false;
  let utilitySheet = null;
  let movieDetail = null;
  let personDetail = null;
  let personListFilter = "all";
  let ratingReturnDetail = false;
  const movieDetailCache = new Map();
  const personDetailCache = new Map();
  const COLLECTION_GENRES = ["Acción", "Animación", "Anime", "Aventura", "Ciencia ficción", "Comedia", "Crimen", "Documental", "Drama", "Fantasía", "Guerra", "Historia", "Romance", "Terror", "Thriller", "Western"];
  const tmdbClient = createTMDBClient({
    getCredential: function () { return tmdbCredential; },
    displayGenre: displayGenre,
    uniqueStrings: uniqueStrings
  });
  const tmdbRequest = tmdbClient.request;
  const ensureTMDBGenres = tmdbClient.ensureGenres;
  const fromTMDB = tmdbClient.fromTMDB;
  const presentationUtils = createPresentationUtils({ escapeHTML: escapeHTML });
  const { cardColor, infoButton, metric, sectionHead, barRow, formatDate, niceRuntime, dateLabel, formatWatchedDate, displayMovieStatus, externalMovieUrl, personImage, hasTrustedTMDBScore, formatVoteCount, buildRatingMetrics, personAge } = presentationUtils;

  const catalogModel = createCatalogModel({
    getSeedCatalog: function () { return seedCatalog; },
    getCustomCatalog: function () { return customCatalog; },
    getState: function () { return state; },
    getCatalog: function () { return catalog; },
    getCatalogByTitle: function () { return catalogByTitle; },
    setCatalog: function (value) { catalog = value; },
    setCatalogByTitle: function (value) { catalogByTitle = value; },
    normalizeMovie: normalizeMovie,
    titleKey: titleKey,
    movieTmdbId: movieTmdbId,
    movieIdentityKey: movieIdentityKey,
    uniqueStrings: uniqueStrings,
    ratingValue: ratingValue,
    movieFeatures: movieFeatures
  });
  const { combineMovies, findMovie, ratingFor, allGenres, summaryStats } = catalogModel;
  const collectionModel = createCollectionModel({
    getState: function () { return state; },
    getCollectionTab: function () { return collectionTab; },
    getCollectionQuery: function () { return collectionQuery; },
    getCollectionGenres: function () { return collectionGenres; },
    getOnlyReleased: function () { return onlyReleased; },
    getCollectionSort: function () { return collectionSort; },
    getCollectionDirection: function () { return collectionDirection; },
    findMovie: findMovie,
    titleKey: titleKey,
    displayGenre: displayGenre,
    movieIdentityKey: movieIdentityKey,
    movieTmdbId: movieTmdbId,
    ratingValue: ratingValue,
    sameMovieRecord: sameMovieRecord,
    hasTrustedTMDBScore: hasTrustedTMDBScore
  });
  const { dateScore, latestRecordDate, enrichCollectionMovie, getCollectionItems, isInHistory, isHidden, isInWatchlist, isMovieInCollection } = collectionModel;

  const pageViews = createPageViews({
    get $() { return $; },
    get $$() { return $$; },
    get cardColor() { return cardColor; },
    get state() { return state; },
    get catalog() { return catalog; },
    get currentPage() { return currentPage; },
    get catalogQuery() { return catalogQuery; },
    get activeGenre() { return activeGenre; },
    get collectionMode() { return collectionMode; },
    get collectionTab() { return collectionTab; },
    get collectionDirection() { return collectionDirection; },
    get collectionGenres() { return collectionGenres; },
    get collectionQuery() { return collectionQuery; },
    get collectionLayout() { return collectionLayout; },
    get collectionSort() { return collectionSort; },
    get onlyReleased() { return onlyReleased; },
    get showCollectionSearch() { return showCollectionSearch; },
    get tmdbCredential() { return tmdbCredential; },
    get escapeHTML() { return escapeHTML; },
    get titleKey() { return titleKey; },
    get uniqueDiscoveryMovies() { return uniqueDiscoveryMovies; },
    get displayGenre() { return displayGenre; },
    get ratingValue() { return ratingValue; },
    get ratingFor() { return ratingFor; },
    get buildProfile() { return buildProfile; },
    get getRecommendations() { return getRecommendations; },
    get allGenres() { return allGenres; },
    get summaryStats() { return summaryStats; },
    get genreStats() { return genreStats; },
    get barRow() { return barRow; },
    get metric() { return metric; },
    get infoButton() { return infoButton; },
    get formatDate() { return formatDate; },
    get dateScore() { return dateScore; },
    get latestRecordDate() { return latestRecordDate; },
    get getCollectionItems() { return getCollectionItems; },
    get isInHistory() { return isInHistory; },
    get isHidden() { return isHidden; },
    get isInWatchlist() { return isInWatchlist; },
    get hasTrustedTMDBScore() { return hasTrustedTMDBScore; },
    get dateLabel() { return dateLabel; },
    get renderTMDBHistoryPanel() { return renderTMDBHistoryPanel; },
    get renderTMDBAttribution() { return renderTMDBAttribution; },
    get renderTMDBResults() { return renderTMDBResults; },
    get evaluateModel() { return evaluateModel; }
  });
  const { movieCard, ratedMetadataCount, renderHome, movieGrid, filterCatalog, renderCatalogResults, renderCatalog, recentPoster, collectionRow, collectionCompactCard, renderCollectionContent, refreshCollectionContent, renderLibrary, renderLab, renderTMDBSettings, renderData, renderApp } = pageViews;

  const modalViews = createModalViews({
    get $() { return $; },
    get utilitySheet() { return utilitySheet; },
    get movieDetail() { return movieDetail; },
    get modalDraft() { return modalDraft; },
    get personDetail() { return personDetail; },
    get personListFilter() { return personListFilter; },
    get state() { return state; },
    get EMOTIONS() { return EMOTIONS; },
    get COLLECTION_GENRES() { return COLLECTION_GENRES; },
    get escapeHTML() { return escapeHTML; },
    get infoButton() { return infoButton; },
    get uniqueStrings() { return uniqueStrings; },
    get allGenres() { return allGenres; },
    get titleKey() { return titleKey; },
    get isInHistory() { return isInHistory; },
    get isInWatchlist() { return isInWatchlist; },
    get isHidden() { return isHidden; },
    get ratingFor() { return ratingFor; },
    get sameMovieRecord() { return sameMovieRecord; },
    get formatWatchedDate() { return formatWatchedDate; },
    get displayGenre() { return displayGenre; },
    get dateLabel() { return dateLabel; },
    get buildRatingMetrics() { return buildRatingMetrics; },
    get niceRuntime() { return niceRuntime; },
    get displayMovieStatus() { return displayMovieStatus; },
    get externalMovieUrl() { return externalMovieUrl; },
    get personImage() { return personImage; },
    get uniqueDiscoveryMovies() { return uniqueDiscoveryMovies; },
    get isMovieInCollection() { return isMovieInCollection; },
    get fromTMDB() { return fromTMDB; },
    get personAge() { return personAge; },
    get ratingValue() { return ratingValue; }
  });
  const { renderUtilitySheet, renderMovieDetails, renderPersonDetails, renderRatingSheet } = modalViews;

     async function saveTMDBCredential() {
    const input = $("#tmdbCredentialInput");
    const kindControl = $("#tmdbAuthType");
    const typed = input ? input.value.trim() : "";
    if (!typed && !tmdbCredential) {
      toast("Pega tu token de lectura o clave API v3 primero.", true);
      return;
    }
    if (typed) {
      tmdbCredential = normalizeCredential(typed, kindControl ? kindControl.value : "readToken");
      await dbSet(TMDB_CREDENTIAL_KEY, tmdbCredential);
    } else if (kindControl && tmdbCredential.kind !== kindControl.value) {
      toast("Para cambiar el tipo de credencial, vuelve a pegarla antes de guardar.", true);
      return;
    }
    if (input) input.value = "";
    renderApp();
    toast("Credencial guardada solo en este navegador. No se incluirá en respaldos ni en GitHub.");
  }

  async function testTMDBCredential() {
    const input = $("#tmdbCredentialInput");
    const kindControl = $("#tmdbAuthType");
    const candidate = normalizeCredential(input && input.value.trim(), kindControl ? kindControl.value : "readToken") || tmdbCredential;
    if (!candidate || !candidate.value) {
      toast("Pega tu credencial o guárdala en este navegador primero.", true);
      return;
    }
    toast("Probando conexión con TMDB…");
    try {
      await tmdbRequest("/configuration", {}, candidate);
      tmdbCredential = candidate;
      await dbSet(TMDB_CREDENTIAL_KEY, tmdbCredential);
      if (input) input.value = "";
      renderApp();
      toast("Conexión con TMDB correcta. Ya puedes buscar películas.");
      if (currentPage === "catalog") loadTMDBPage(1, catalogQuery.trim().length >= 2 ? "search" : "popular", false);
    } catch (error) {
      toast(error.message || "No se pudo conectar con TMDB.", true);
    }
  }

  async function removeTMDBCredential() {
    if (!window.confirm("¿Eliminar la credencial de TMDB guardada en este navegador?")) return;
    tmdbCredential = null;
    await dbSet(TMDB_CREDENTIAL_KEY, null);
    tmdbResults = [];
    tmdbClient.resetGenres();
    renderApp();
    toast("Credencial eliminada de este navegador.");
  }

  function pruneTMDBCache() {
    const limit = 1000 * 60 * 60 * 24 * 179;
    const now = Date.now();
    function isExpired(entry) {
      if (!entry || !entry.tmdbFetchedAt) return false;
      const fetchedAt = new Date(entry.tmdbFetchedAt).getTime();
      return Number.isFinite(fetchedAt) && now - fetchedAt > limit;
    }
    function strip(entry) {
      ["genres","tags","overview","posterPath","posterUrl","voteAverage","voteCount","runtime","releaseDate","backdropPath","backdropUrl","tagline","status","productionCountries","imdbId","tmdbFetchedAt","metadataSource"].forEach(function (key) { delete entry[key]; });
      return entry;
    }
    let changed = false;
    function pruneList(list) {
      return (list || []).map(function (entry) {
        if (entry && entry.metadataSource === "tmdb" && isExpired(entry)) {
          changed = true;
          return strip(Object.assign({},entry));
        }
        return entry;
      });
    }
    customCatalog = pruneList(customCatalog);
    state.rated = pruneList(state.rated);
    state.watched = pruneList(state.watched);
    state.watchlist = pruneList(state.watchlist);
    state.hidden = pruneList(state.hidden);
    if (changed) {
      dbSet(CATALOG_KEY,customCatalog).catch(function () {});
      persistState();
    }
  }


  function historyNeedsTMDB(entry) {
    const fetchedAt = entry && entry.tmdbFetchedAt ? new Date(entry.tmdbFetchedAt).getTime() : 0;
    const isFresh = entry && entry.metadataSource === "tmdb" &&
      Number.isFinite(fetchedAt) && Date.now() - fetchedAt < 1000 * 60 * 60 * 24 * 179;
    if (isFresh && (entry.posterUrl || entry.posterPath)) return false;
    return Boolean(entry && entry.title);
  }

  function historyTMDBId(entry) {
    const value = Number(entry && (entry.tmdbId || entry.tmId || entry.tmdb_id));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  function pendingHistoryTMDBCount() {
    return catalog.filter(historyNeedsTMDB).length;
  }

  async function findTMDBDetailsForRating(entry) {
    const id = historyTMDBId(entry);
    if (id) {
      try {
        return await tmdbRequest("/movie/" + encodeURIComponent(id), { language: "es-ES", append_to_response: "keywords" });
      } catch (error) {
        // Si el ID guardado ya no existe, busca el título por nombre y año.
      }
    }
    const params = { query: entry.title, language: "es-ES", include_adult: false };
    if (entry.year) params.year = entry.year;
    const results = await tmdbRequest("/search/movie", params);
    const candidates = results.results || [];
    if (!candidates.length) return null;
    const wanted = titleKey(entry.title);
    let selected = candidates.find(function (candidate) {
      return titleKey(candidate.title) === wanted || titleKey(candidate.original_title) === wanted;
    });
    if (!selected && entry.year) {
      const sameYear = candidates.filter(function (candidate) {
        return String(candidate.release_date || "").slice(0, 4) === String(entry.year);
      });
      if (sameYear.length === 1) selected = sameYear[0];
    }
    if (!selected && candidates.length === 1) selected = candidates[0];
    if (!selected) return null;
    return await tmdbRequest("/movie/" + encodeURIComponent(selected.id), { language: "es-ES", append_to_response: "keywords" });
  }

  function applyTMDBDetailsToRating(entry, enriched) {
    entry.tmdbId = String(enriched.id || enriched.tmdbId || entry.tmdbId || entry.tmId || "");
    entry.genres = uniqueStrings((enriched.genres || []).concat(entry.genres || []));
    entry.tags = uniqueStrings((enriched.tags || []).concat(entry.tags || []));
    entry.overview = enriched.overview || entry.overview || "";
    entry.posterPath = enriched.posterPath || entry.posterPath || "";
    entry.posterUrl = enriched.posterUrl || entry.posterUrl || "";
    entry.voteAverage = enriched.voteAverage || entry.voteAverage || null;
    entry.voteCount = enriched.voteCount || entry.voteCount || null;
    entry.runtime = enriched.runtime || entry.runtime || null;
    entry.releaseDate = enriched.releaseDate || entry.releaseDate || null;
    entry.backdropPath = enriched.backdropPath || entry.backdropPath || "";
    entry.backdropUrl = enriched.backdropUrl || entry.backdropUrl || "";
    entry.tagline = enriched.tagline || entry.tagline || "";
    entry.status = enriched.status || entry.status || "";
    entry.productionCountries = (enriched.productionCountries && enriched.productionCountries.length) ? enriched.productionCountries : (entry.productionCountries || []);
    entry.imdbId = enriched.imdbId || entry.imdbId || "";
    entry.tmdbFetchedAt = enriched.tmdbFetchedAt || new Date().toISOString();
    entry.metadataSource = "tmdb";
  }

  function applyTMDBDetailsToLocalCollection(entry, enriched) {
    ["rated","watched","watchlist","hidden"].forEach(function (listName) {
      state[listName] = (state[listName] || []).map(function (current) {
        if (!sameMovieRecord(current,entry)) return current;
        const updated = Object.assign({},current);
        applyTMDBDetailsToRating(updated,enriched);
        return updated;
      });
    });
  }


  function upsertTMDBCatalogEntry(rating, enriched) {
    const stored = Object.assign({}, enriched, {
      id: rating.id || enriched.id,
      tmdbId: rating.tmdbId || enriched.tmdbId || enriched.id,
      title: rating.title || enriched.title,
      year: rating.year || enriched.year,
      genres: uniqueStrings((rating.genres || []).concat(enriched.genres || [])),
      tags: uniqueStrings((rating.tags || []).concat(enriched.tags || [])),
      overview: rating.overview || enriched.overview || "",
      posterPath: rating.posterPath || enriched.posterPath || "",
      posterUrl: rating.posterUrl || enriched.posterUrl || "",
      tmdbFetchedAt: rating.tmdbFetchedAt || enriched.tmdbFetchedAt || new Date().toISOString(),
      metadataSource: "tmdb",
      source: "tmdb"
    });
    const key = titleKey(stored.title);
    const index = customCatalog.findIndex(function (movie) {
      const existingId = movieTmdbId(movie), incomingId = movieTmdbId(stored);
      if (existingId && incomingId) return existingId === incomingId;
      return titleKey(movie.title) === key && !existingId && !incomingId;
    });
    if (index >= 0) {
      customCatalog[index] = Object.assign({}, customCatalog[index], stored, {
        title: customCatalog[index].title || stored.title,
        genres: uniqueStrings((customCatalog[index].genres || []).concat(stored.genres || [])),
        tags: uniqueStrings((customCatalog[index].tags || []).concat(stored.tags || [])),
        overview: stored.overview || customCatalog[index].overview || "",
        posterUrl: stored.posterUrl || customCatalog[index].posterUrl || ""
      });
    } else customCatalog.push(stored);
  }

  function renderTMDBHistoryPanel() {
    const pending = pendingHistoryTMDBCount();
    const connected = Boolean(tmdbCredential && tmdbCredential.value);
    const status = tmdbHistorySync.running ?
      "Completando " + tmdbHistorySync.done.toLocaleString("es-PA") + " de " + tmdbHistorySync.total.toLocaleString("es-PA") :
      (tmdbHistorySync.finishedAt ? tmdbHistorySync.updated.toLocaleString("es-PA") + " actualizadas · " + tmdbHistorySync.failed.toLocaleString("es-PA") + " sin coincidencia" : "");
    const percent = tmdbHistorySync.total ? Math.round(tmdbHistorySync.done / tmdbHistorySync.total * 100) : 0;
    const button = !connected ?
      '<button class="btn btn-secondary" type="button" data-nav="data">Conectar TMDB</button>' :
      '<button class="btn btn-primary" type="button" data-action="enrich-history" ' + (tmdbHistorySync.running || pending === 0 ? "disabled" : "") + '>' +
      (tmdbHistorySync.running ? "Completando…" : (pending === 0 ? "Todo actualizado" : "Completar " + pending.toLocaleString("es-PA") + " títulos")) + '</button>';
    return '<section class="panel tmdb-history-panel"><div class="panel-head"><div class="panel-title-row"><h3>Carátulas y datos</h3>' + infoButton("metadata","Información sobre carátulas y datos") + '</div><span class="badge ' + (connected ? "badge-mint" : "") + '">' + (connected ? "TMDB conectado" : "TMDB desconectado") + '</span></div>' +
      '<div class="metadata-action-row"><span>' + pending.toLocaleString("es-PA") + ' por completar</span><div class="hero-actions">' + button + '</div></div>' +
      (tmdbHistorySync.running ? '<progress class="tmdb-progress" max="100" value="' + percent + '">' + percent + '%</progress><p class="metadata-progress-label">' + escapeHTML(status) + ' · ' + percent + '%</p>' : (status ? '<p class="metadata-progress-label">' + escapeHTML(status) + '</p>' : "")) +
      '</section>';
  }


  async function enrichRatedHistoryWithTMDB() {
    if (!tmdbCredential || !tmdbCredential.value) {
      toast("Conecta TMDB en Ajustes para cargar las carátulas y completar los datos.",true);
      clickNav("data");
      return;
    }
    if (tmdbHistorySync.running) {
      tmdbEnrichRequested = true;
      toast("Los títulos nuevos se añadirán a la cola actual.");
      return;
    }
    const targets = catalog.filter(historyNeedsTMDB);
    if (!targets.length) {
      toast("Las carátulas y los datos del catálogo están actualizados.");
      return;
    }
    tmdbHistorySync = {running:true,total:targets.length,done:0,updated:0,failed:0,current:"",finishedAt:null};
    renderApp();
    let cursor = 0;
    let lastPersisted = 0;
    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= targets.length) return;
        const entry = targets[index];
        tmdbHistorySync.current = entry.title;
        try {
          const raw = await findTMDBDetailsForRating(entry);
          if (!raw) {
            tmdbHistorySync.failed += 1;
          } else {
            const enriched = fromTMDB(raw);
            if (!enriched || !enriched.title) {
              tmdbHistorySync.failed += 1;
            } else {
              applyTMDBDetailsToRating(entry,enriched);
              applyTMDBDetailsToLocalCollection(entry,enriched);
              upsertTMDBCatalogEntry(entry,enriched);
              tmdbHistorySync.updated += 1;
            }
          }
        } catch (_) {
          tmdbHistorySync.failed += 1;
        } finally {
          tmdbHistorySync.done += 1;
          if (tmdbHistorySync.done - lastPersisted >= 5 || tmdbHistorySync.done === tmdbHistorySync.total) {
            lastPersisted = tmdbHistorySync.done;
            state.updatedAt = new Date().toISOString();
            await persistState();
            await dbSet(CATALOG_KEY,customCatalog);
            combineMovies();
            if (currentPage === "library") refreshCollectionContent();
            else renderApp();
          }
        }
        await new Promise(function (resolve) { window.setTimeout(resolve,120); });
      }
    }
    await Promise.all([worker(),worker(),worker()]);
    tmdbHistorySync.running = false;
    tmdbHistorySync.finishedAt = new Date().toISOString();
    tmdbHistorySync.current = "";
    state.events.unshift({title:"Carátulas y datos actualizados",description:tmdbHistorySync.updated + " actualizadas; " + tmdbHistorySync.failed + " sin coincidencia",symbol:"✦",at:tmdbHistorySync.finishedAt});
    state.events = state.events.slice(0,80);
    state.updatedAt = tmdbHistorySync.finishedAt;
    await persistState();
    await dbSet(CATALOG_KEY,customCatalog);
    combineMovies();
    renderApp();
    toast("Completado: " + tmdbHistorySync.updated.toLocaleString("es-PA") + " títulos actualizados; " + tmdbHistorySync.failed.toLocaleString("es-PA") + " sin coincidencia.");
    if (tmdbEnrichRequested) {
      tmdbEnrichRequested = false;
      window.setTimeout(function () { enrichRatedHistoryWithTMDB(); },250);
    }
  }


  function renderTMDBAttribution() {
    return '<section class="tmdb-attribution" aria-label="Atribución de TMDB"><a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer"><img src="' + TMDB_LOGO_URL + '" alt="TMDB" loading="lazy"></a><div><strong>Datos e imágenes de The Movie Database (TMDB)</strong><p>Este producto utiliza TMDB y las API de TMDB, pero no está respaldado, certificado ni aprobado por TMDB.</p><a href="https://www.themoviedb.org/about/logos-attribution" target="_blank" rel="noopener noreferrer">Logos y atribución oficial ↗</a></div></section>';
  }

  function renderTMDBResults() {
    const status = $("#tmdbStatus");
    const target = $("#tmdbResults");
    if (!status || !target) return;
    if (!tmdbCredential || !tmdbCredential.value) {
      status.innerHTML = '<button class="btn btn-secondary btn-small" type="button" data-nav="data">Conectar con TMDB</button>';
      target.innerHTML = '';
      return;
    }
    const label = tmdbMode === "search" ? "Resultados para «" + catalogQuery.trim() + "»" : "Películas populares en TMDB";
    const visibleResults = uniqueDiscoveryMovies(tmdbResults).filter(function (movie) {
      return !isInHistory(movie.title,movie.tmdbId) && !isHidden(movie.title,movie.tmdbId);
    });
    status.textContent = (tmdbLoading ? "Consultando TMDB…" : (tmdbError ? "No se pudo completar la consulta." : label)) +
      (tmdbResults.length && !tmdbLoading && !tmdbError ? " · " + visibleResults.length + " disponibles" : "");
    if (tmdbLoading && !tmdbResults.length) {
      target.innerHTML = '<div class="loading-state"><span class="spinner"></span><p>Buscando películas…</p></div>';
      return;
    }
    if (tmdbError) {
      target.innerHTML = '<div class="notice"><strong>Error de TMDB.</strong> ' + escapeHTML(tmdbError) + '<div style="margin-top:10px"><button class="btn btn-secondary btn-small" type="button" data-action="tmdb-retry">Volver a intentar</button></div></div>';
      return;
    }
    if (!tmdbResults.length) {
      target.innerHTML = '<div class="empty-state"><div class="empty-icon">⌕</div><h3>No hay resultados</h3><p>Prueba otra búsqueda.</p></div>';
      return;
    }
    const resultsMarkup = visibleResults.length
      ? movieGrid(visibleResults)
      : '<div class="empty-inline discovery-filtered-empty"><strong>No hay películas nuevas en estos resultados.</strong><span>Los títulos vistos y ocultos se omiten de Descubrir.</span></div>';
    target.innerHTML = resultsMarkup +
      (tmdbPage < tmdbTotalPages ? '<div class="load-more-wrap"><button class="btn btn-secondary" type="button" data-action="tmdb-more">' + (tmdbLoading ? "Cargando…" : "Cargar más") + '</button></div>' : "");
  }

  async function loadTMDBPage(page, mode, append) {
    if (!tmdbCredential || !tmdbCredential.value) {
      renderTMDBResults();
      return;
    }
    const safeMode = mode === "search" && catalogQuery.trim().length >= 2 ? "search" : "popular";
    const query = catalogQuery.trim();
    const requestId = ++tmdbRequestSerial;
    tmdbMode = safeMode;
    tmdbLoading = true;
    tmdbError = "";
    if (!append) tmdbResults = [];
    renderTMDBResults();
    try {
      try { await ensureTMDBGenres(); } catch (_) {
        // La búsqueda sigue siendo útil aunque no se pueda cargar el listado de géneros.
      }
      const params = { language: "es-ES", page: page, include_adult: false };
      const endpoint = safeMode === "search" ? "/search/movie" : "/movie/popular";
      if (safeMode === "search") params.query = query;
      const data = await tmdbRequest(endpoint, params);
      if (requestId !== tmdbRequestSerial) return;
      const mapped = (data.results || []).map(fromTMDB).filter(function (movie) { return Boolean(movie.title); });
      tmdbResults = append ? tmdbResults.concat(mapped) : mapped;
      tmdbPage = Number(data.page) || page;
      tmdbTotalPages = Math.min(Number(data.total_pages) || 1, 500);
      tmdbError = "";
    } catch (error) {
      if (requestId !== tmdbRequestSerial) return;
      tmdbError = error && error.message ? error.message : "Error al consultar TMDB.";
    } finally {
      if (requestId === tmdbRequestSerial) {
        tmdbLoading = false;
        renderTMDBResults();
      }
    }
  }

  async function enrichTMDBMovie(movie) {
    if (!movie || !tmdbCredential || !tmdbCredential.value) return;
    const id = movie.tmdbId || (movie.source === "tmdb" ? movie.id : null);
    if (!id) return;
    const fetchedAt = movie.tmdbFetchedAt ? new Date(movie.tmdbFetchedAt).getTime() : 0;
    const cacheFresh = fetchedAt && Date.now() - fetchedAt < 1000 * 60 * 60 * 24 * 30;
    if (cacheFresh && movie.tags && movie.tags.length) return;
    try {
      const details = await tmdbRequest("/movie/" + encodeURIComponent(id), { language: "es-ES", append_to_response: "keywords" });
      const enriched = fromTMDB(details);
      if (modalDraft && titleKey(modalDraft.movie.title) === titleKey(movie.title)) {
        modalDraft.movie = Object.assign({}, modalDraft.movie, enriched, { key: titleKey(enriched.title) });
        renderModal();
      }
    } catch (error) {
      console.warn("Prisma: no se pudieron cargar los detalles de TMDB.", error && error.message ? error.message : "");
    }
  }

  const { buildProfile, predictRating, evaluateModel } = createRecommendationEngine({
    getRatings: function () { return state.rated; },
    findMovie: findMovie,
    movieFeatures: movieFeatures,
    ratingValue: ratingValue
  });

  function getRecommendations(limit) {
    const profile = buildProfile();
    const results = uniqueDiscoveryMovies(catalog).filter(function (movie) {
      return !isMovieInCollection(movie.title,movie.tmdbId) && movie.source !== "history";
    }).map(function (movie) {
      const prediction = predictRating(movie, profile);
      return Object.assign({}, movie, { prediction: prediction });
    });
    results.sort(function (a, b) {
      const aScore = a.prediction.score + Math.min(a.prediction.freshFeatures, 3) * 0.025;
      const bScore = b.prediction.score + Math.min(b.prediction.freshFeatures, 3) * 0.025;
      return bScore - aScore || b.prediction.matches.length - a.prediction.matches.length || a.title.localeCompare(b.title);
    });
    const selected = [];
    const genreCounts = new Map();
    results.forEach(function (movie) {
      if (selected.length >= (limit || 8)) return;
      const mainGenre = (movie.genres && movie.genres[0]) || "Otros";
      if ((genreCounts.get(mainGenre) || 0) >= 2 && results.length > (limit || 8) * 1.4) return;
      selected.push(movie);
      genreCounts.set(mainGenre, (genreCounts.get(mainGenre) || 0) + 1);
    });
    return selected;
  }

   function genreStats() {
    const stats = new Map();
    state.rated.forEach(function (entry) {
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId);
      const rating = ratingValue(entry);
      if (rating == null) return;
      const genres = (entry.genres && entry.genres.length ? entry.genres : (movie && movie.genres)) || [];
      genres.forEach(function (genre) {
        const current = stats.get(genre) || { sum: 0, count: 0 };
        current.sum += rating;
        current.count += 1;
        stats.set(genre, current);
      });
    });
    return Array.from(stats.entries()).map(function (entry) {
      return { name: entry[0], average: entry[1].sum / entry[1].count, count: entry[1].count };
    }).filter(function (item) { return item.count >= 2; }).sort(function (a, b) { return b.average - a.average; });
  }

  function logEvent(title, description, symbol) {
    state.events.unshift({ title: title, description: description, symbol: symbol || "✦", at: new Date().toISOString() });
    state.events = state.events.slice(0, 80);
    state.updatedAt = new Date().toISOString();
    persistState();
  }

  async function persistState() {
    try { await dbSet(STATE_KEY, state); }
    catch (error) { toast("No pude guardar los datos. Exporta una copia de seguridad.", true); }
  }

  function toast(message, isError) {
    const root = $("#toastRoot");
    if (!root) return;
    const node = document.createElement("div");
    node.className = "toast" + (isError ? " error" : "");
    node.textContent = message;
    root.appendChild(node);
    window.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 3600);
  }

  function openModal(movie, mode) {
    if (!movie) return;
    const existing = ratingFor(movie.title);
    const nextMode = mode || "details";
    if (nextMode === "rate") {
      ratingReturnDetail = Boolean(movieDetail);
      modalDraft = {
        movie: movie,
        mode: "rate",
        rating: existing ? ratingValue(existing) : 7,
        emotions: existing && Array.isArray(existing.emotions) ? existing.emotions.slice() : [],
        note: existing && existing.note ? existing.note : ""
      };
      utilitySheet = null;
      renderModal();
      return;
    }
    movieDetail = { movie: movie, data: null, loading: false, error: "" };
    personDetail = null;
    modalDraft = null;
    utilitySheet = null;
    ratingReturnDetail = false;
    renderModal();
    if (tmdbCredential && tmdbCredential.value && movie.tmdbId) loadMovieDetail(movie);
  }

  function renderModal() {
    const root = $("#modalRoot");
    if (!root) return;
    if (utilitySheet) { renderUtilitySheet(); return; }
    if (personDetail) { renderPersonDetails(); return; }
    if (modalDraft && modalDraft.mode === "rate") { renderRatingSheet(); return; }
    if (movieDetail) { renderMovieDetails(); return; }
    root.innerHTML = "";
  }

  function openUtilitySheet(type) {
    utilitySheet = { type:type, key:"", sort:collectionSort, direction:collectionDirection, genres:collectionGenres.slice() };
    renderModal();
  }

  function openInfoSheet(key) {
    utilitySheet = {type:"info",key:key || "collection"};
    renderModal();
  }


    try { return await tmdbRequest(path, params || {}); } catch (_) { return null; }
  }

  async function loadMovieDetail(movie) {
    const id = String(movie.tmdbId || "");
    if (!id || !tmdbCredential || !tmdbCredential.value) return;
    if (movieDetailCache.has(id)) {
      if (movieDetail && sameMovieRecord(movieDetail.movie,movie)) {
        const cached = movieDetailCache.get(id);
        movieDetail.movie = cached.movie;
        movieDetail.data = cached.data;
        movieDetail.loading = false;
        renderModal();
      }
      return;
    }
    if (!movieDetail || titleKey(movieDetail.movie.title) !== titleKey(movie.title)) return;
    movieDetail.loading = true;
    renderModal();
    try {
      const raw = await tmdbRequest("/movie/" + encodeURIComponent(id), { language: "es-ES", append_to_response: "credits,videos,release_dates,external_ids,keywords,recommendations,similar" });
      const providerResponse = await softTMDBRequest("/movie/" + encodeURIComponent(id) + "/watch/providers", {});
      const normalized = fromTMDB(raw);
      const backdropPath = raw.backdrop_path || normalized.backdropPath || "";
      const detailsMovie = Object.assign({}, movieDetail.movie, normalized, {
        id:String(raw.id || id), tmdbId:String(raw.id || id), title:raw.title || movieDetail.movie.title,
        originalTitle:raw.original_title || "", releaseDate:raw.release_date || null,
        backdropPath:backdropPath, backdropUrl:backdropPath ? "https://image.tmdb.org/t/p/w1280" + backdropPath : "",
        tagline:raw.tagline || "", status:raw.status || "", runtime:Number(raw.runtime) || movieDetail.movie.runtime || null,
        productionCountries:Array.isArray(raw.production_countries) ? raw.production_countries.map(function (country) { return country.name || country.iso_3166_1; }) : [],
        imdbId:raw.external_ids && raw.external_ids.imdb_id ? raw.external_ids.imdb_id : (raw.imdb_id || ""),
        collection:raw.belongs_to_collection || null, popularity:Number(raw.popularity) || null
      });
      const providerRoot = providerResponse && providerResponse.results ? providerResponse.results : {};
      const data = {
        credits:raw.credits || {}, videos:raw.videos && raw.videos.results ? raw.videos.results : [],
        externalIds:raw.external_ids || {},
        recommendations:raw.recommendations && raw.recommendations.results ? raw.recommendations.results.map(fromTMDB) : [],
        similar:raw.similar && raw.similar.results ? raw.similar.results.map(fromTMDB) : [],
        providers:providerRoot.PA || null,
        providerResults:providerRoot,
        releaseDates:raw.release_dates && raw.release_dates.results ? raw.release_dates.results : []
      };
      if (movieDetail && sameMovieRecord(movieDetail.movie,movie)) {
        movieDetail.movie = detailsMovie; movieDetail.data = data; movieDetail.loading = false; movieDetail.error = "";
        movieDetailCache.set(id,{movie:detailsMovie,data:data});
        await persistMovieMetadata(detailsMovie);
        renderModal();
      }
    } catch (error) {
      if (movieDetail && sameMovieRecord(movieDetail.movie,movie)) {
        movieDetail.loading = false; movieDetail.error = error.message || "No se pudo cargar la ficha de TMDB."; renderModal();
      }
    }
  }

  async function persistMovieMetadata(movie) {
    if (!movie || !movie.title) return;
    const key = titleKey(movie.title);
    const metadata = {};
    ["id","tmdbId","year","genres","tags","overview","posterPath","posterUrl","voteAverage","voteCount","runtime","releaseDate","backdropPath","backdropUrl","tagline","status","productionCountries","imdbId","tmdbFetchedAt","metadataSource"].forEach(function (field) {
      if (movie[field] !== undefined && movie[field] !== null && movie[field] !== "") metadata[field] = movie[field];
    });
    function mergeMatching(list) {
      return (list || []).map(function (entry) { return sameMovieRecord(entry,movie) ? Object.assign({},entry,metadata) : entry; });
    }
    state.rated = mergeMatching(state.rated);
    state.watched = mergeMatching(state.watched);
    state.watchlist = mergeMatching(state.watchlist);
    state.hidden = mergeMatching(state.hidden);
    const movieId = movieTmdbId(movie);
    const index = customCatalog.findIndex(function (entry) {
      const existingId = movieTmdbId(entry);
      if (movieId && existingId) return movieId === existingId;
      return titleKey(entry.title) === key && !movieId && !existingId;
    });
    if (index >= 0) customCatalog[index] = Object.assign({},customCatalog[index],metadata,{title:movie.title,source:"tmdb"});
    else customCatalog.unshift(Object.assign({},metadata,{title:movie.title,source:"tmdb"}));
    await dbSet(CATALOG_KEY,customCatalog);
    await persistState();
    combineMovies();
  }


    personDetail = {id:String(id),name:name || "Persona",character:character || "",person:null,credits:null,loading:true,error:""};
    personListFilter = "all";
    renderModal();
    if (personDetailCache.has(String(id))) {
      personDetail = Object.assign(personDetail, personDetailCache.get(String(id)), {loading:false});
      renderModal();
      return;
    }
    if (!tmdbCredential || !tmdbCredential.value) {
      personDetail.loading = false; personDetail.error = "Conecta TMDB para consultar biografías y filmografías."; renderModal(); return;
    }
    const requestId = String(id);
    Promise.all([
      softTMDBRequest("/person/" + encodeURIComponent(requestId), {language:"es-ES"}),
      softTMDBRequest("/person/" + encodeURIComponent(requestId) + "/movie_credits", {language:"es-ES"})
    ]).then(function (responses) {
      if (!personDetail || personDetail.id !== requestId) return;
      personDetail.person = responses[0] || {};
      personDetail.credits = responses[1] || {cast:[],crew:[]};
      personDetail.loading = false;
      if (!responses[0]) personDetail.error = "No se pudo recuperar la ficha de esta persona.";
      personDetailCache.set(requestId,{person:personDetail.person,credits:personDetail.credits,error:personDetail.error});
      renderModal();
    });
  }

movieTmdbId, movieIdentityKey, sameMovieRecord, sameDiscoveryMovie, uniqueDiscoveryMovies, splitList, displayGenre, normalizeMovie, uniqueStrings, ratingValue } from "./js/core/movie-utils.js";
import { dbGet, dbSet } from "./js/core/storage.js?v=core-20261020-1";
import { emptyState, ensureState } from "./js/core/state-model.js";
import { movieFeatures } from "./js/recommendations/features.js";
import { createRecommendationEngine } from "./js/recommendations/engine.js";
import { parseCSVLine, parseCatalogCSV } from "./js/catalog/csv-parser.js";
import { createCatalogModel } from "./js/catalog/catalog-model.js?v=core-20261020-1";
import { createCollectionModel } from "./js/collection/collection-model.js?v=core-20261020-1";
import { createPresentationUtils } from "./js/ui/presentation-utils.js?v=core-20261020-1";
import { createPageViews } from "./js/ui/page-views.js?v=core-20261020-1";
import { movieMetadataFromJSON, extractPersonalCollections, hasImportedCollection, mergeMovieEntries, mergeMovieListByTitle, extractPersonalRatings } from "./js/import-export/personal-data.js";
import { createTMDBClient, normalizeCredential } from "./js/tmdb/client.js";

(function () {
  "use strict";

  const $ = function (selector, root) { return (root || document).querySelector(selector); };
  const $$ = function (selector, root) { return Array.from((root || document).querySelectorAll(selector)); };
  const STATE_KEY = "state";
  const CATALOG_KEY = "catalogCustom";
  const TMDB_CREDENTIAL_KEY = "tmdbCredential";
  const TMDB_LOGO_URL = "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg";
  const EMOTIONS = ["Asombro", "Alegría", "Tristeza", "Tensión", "Sorpresa", "Miedo", "Esperanza", "Curiosidad", "Empatía", "Nostalgia", "Frustración", "Alivio", "Ilusión", "Inquietud"];
 

  let seedCatalog = [];
  let customCatalog = [];
  let catalog = [];
  let catalogByTitle = new Map();
  let state = emptyState();
  let currentPage = "home";
  let catalogQuery = "";
  let activeGenre = "Todos";
  let modalDraft = null;
  let tmdbCredential = null;
  let tmdbResults = [];
  let tmdbPage = 1;
  let tmdbTotalPages = 1;
  let tmdbMode = "popular";
  let tmdbLoading = false;
  let tmdbError = "";
  let tmdbSearchTimer = null;
  let tmdbRequestSerial = 0;
  let tmdbHistorySync = { running: false, total: 0, done: 0, updated: 0, failed: 0, current: "", finishedAt: null };
  let tmdbEnrichRequested = false;
  let collectionTab = "history";
  let collectionMode = "movies";
  let collectionQuery = "";
  let collectionGenres = [];
  let collectionSort = "added";
  let collectionDirection = "desc";
  let collectionLayout = "list";
  let onlyReleased = false;
  let showCollectionSearch = false;
  let utilitySheet = null;
  let movieDetail = null;
  let personDetail = null;
  let personListFilter = "all";
  let ratingReturnDetail = false;
  const movieDetailCache = new Map();
  const personDetailCache = new Map();
  const COLLECTION_GENRES = ["Acción", "Animación", "Anime", "Aventura", "Ciencia ficción", "Comedia", "Crimen", "Documental", "Drama", "Fantasía", "Guerra", "Historia", "Romance", "Terror", "Thriller", "Western"];
  const tmdbClient = createTMDBClient({
    getCredential: function () { return tmdbCredential; },
    displayGenre: displayGenre,
    uniqueStrings: uniqueStrings
  });
  const tmdbRequest = tmdbClient.request;
  const ensureTMDBGenres = tmdbClient.ensureGenres;
  const fromTMDB = tmdbClient.fromTMDB;
  const presentationUtils = createPresentationUtils({ escapeHTML: escapeHTML });
  const { cardColor, infoButton, metric, sectionHead, barRow, formatDate, niceRuntime, dateLabel, formatWatchedDate, displayMovieStatus, externalMovieUrl, personImage, hasTrustedTMDBScore, formatVoteCount, buildRatingMetrics, personAge } = presentationUtils;

  const catalogModel = createCatalogModel({
    getSeedCatalog: function () { return seedCatalog; },
    getCustomCatalog: function () { return customCatalog; },
    getState: function () { return state; },
    getCatalog: function () { return catalog; },
    getCatalogByTitle: function () { return catalogByTitle; },
    setCatalog: function (value) { catalog = value; },
    setCatalogByTitle: function (value) { catalogByTitle = value; },
    normalizeMovie: normalizeMovie,
    titleKey: titleKey,
    movieTmdbId: movieTmdbId,
    movieIdentityKey: movieIdentityKey,
    uniqueStrings: uniqueStrings,
    ratingValue: ratingValue,
    movieFeatures: movieFeatures
  });
  const { combineMovies, findMovie, ratingFor, allGenres, summaryStats } = catalogModel;
  const collectionModel = createCollectionModel({
    getState: function () { return state; },
    getCollectionTab: function () { return collectionTab; },
    getCollectionQuery: function () { return collectionQuery; },
    getCollectionGenres: function () { return collectionGenres; },
    getOnlyReleased: function () { return onlyReleased; },
    getCollectionSort: function () { return collectionSort; },
    getCollectionDirection: function () { return collectionDirection; },
    findMovie: findMovie,
    titleKey: titleKey,
    displayGenre: displayGenre,
    movieIdentityKey: movieIdentityKey,
    movieTmdbId: movieTmdbId,
    ratingValue: ratingValue,
    sameMovieRecord: sameMovieRecord,
    hasTrustedTMDBScore: hasTrustedTMDBScore
  });
  const { dateScore, latestRecordDate, enrichCollectionMovie, getCollectionItems, isInHistory, isHidden, isInWatchlist, isMovieInCollection } = collectionModel;

  const pageViews = createPageViews({
    get $() { return $; },
    get $$() { return $$; },
    get cardColor() { return cardColor; },
    get state() { return state; },
    get catalog() { return catalog; },
    get currentPage() { return currentPage; },
    get catalogQuery() { return catalogQuery; },
    get activeGenre() { return activeGenre; },
    get collectionMode() { return collectionMode; },
    get collectionTab() { return collectionTab; },
    get collectionDirection() { return collectionDirection; },
    get collectionGenres() { return collectionGenres; },
    get collectionQuery() { return collectionQuery; },
    get collectionLayout() { return collectionLayout; },
    get collectionSort() { return collectionSort; },
    get onlyReleased() { return onlyReleased; },
    get showCollectionSearch() { return showCollectionSearch; },
    get tmdbCredential() { return tmdbCredential; },
    get escapeHTML() { return escapeHTML; },
    get titleKey() { return titleKey; },
    get uniqueDiscoveryMovies() { return uniqueDiscoveryMovies; },
    get displayGenre() { return displayGenre; },
    get ratingValue() { return ratingValue; },
    get ratingFor() { return ratingFor; },
    get buildProfile() { return buildProfile; },
    get getRecommendations() { return getRecommendations; },
    get allGenres() { return allGenres; },
    get summaryStats() { return summaryStats; },
    get genreStats() { return genreStats; },
    get barRow() { return barRow; },
    get metric() { return metric; },
    get infoButton() { return infoButton; },
    get formatDate() { return formatDate; },
    get dateScore() { return dateScore; },
    get latestRecordDate() { return latestRecordDate; },
    get getCollectionItems() { return getCollectionItems; },
    get isInHistory() { return isInHistory; },
    get isHidden() { return isHidden; },
    get isInWatchlist() { return isInWatchlist; },
    get hasTrustedTMDBScore() { return hasTrustedTMDBScore; },
    get dateLabel() { return dateLabel; },
    get renderTMDBHistoryPanel() { return renderTMDBHistoryPanel; },
    get renderTMDBAttribution() { return renderTMDBAttribution; },
    get renderTMDBResults() { return renderTMDBResults; },
    get evaluateModel() { return evaluateModel; }
  });
  const { movieCard, ratedMetadataCount, renderHome, movieGrid, filterCatalog, renderCatalogResults, renderCatalog, recentPoster, collectionRow, collectionCompactCard, renderCollectionContent, refreshCollectionContent, renderLibrary, renderLab, renderTMDBSettings, renderData, renderApp } = pageViews;

     async function saveTMDBCredential() {
    const input = $("#tmdbCredentialInput");
    const kindControl = $("#tmdbAuthType");
    const typed = input ? input.value.trim() : "";
    if (!typed && !tmdbCredential) {
      toast("Pega tu token de lectura o clave API v3 primero.", true);
      return;
    }
    if (typed) {
      tmdbCredential = normalizeCredential(typed, kindControl ? kindControl.value : "readToken");
      await dbSet(TMDB_CREDENTIAL_KEY, tmdbCredential);
    } else if (kindControl && tmdbCredential.kind !== kindControl.value) {
      toast("Para cambiar el tipo de credencial, vuelve a pegarla antes de guardar.", true);
      return;
    }
    if (input) input.value = "";
    renderApp();
    toast("Credencial guardada solo en este navegador. No se incluirá en respaldos ni en GitHub.");
  }

  async function testTMDBCredential() {
    const input = $("#tmdbCredentialInput");
    const kindControl = $("#tmdbAuthType");
    const candidate = normalizeCredential(input && input.value.trim(), kindControl ? kindControl.value : "readToken") || tmdbCredential;
    if (!candidate || !candidate.value) {
      toast("Pega tu credencial o guárdala en este navegador primero.", true);
      return;
    }
    toast("Probando conexión con TMDB…");
    try {
      await tmdbRequest("/configuration", {}, candidate);
      tmdbCredential = candidate;
      await dbSet(TMDB_CREDENTIAL_KEY, tmdbCredential);
      if (input) input.value = "";
      renderApp();
      toast("Conexión con TMDB correcta. Ya puedes buscar películas.");
      if (currentPage === "catalog") loadTMDBPage(1, catalogQuery.trim().length >= 2 ? "search" : "popular", false);
    } catch (error) {
      toast(error.message || "No se pudo conectar con TMDB.", true);
    }
  }

  async function removeTMDBCredential() {
    if (!window.confirm("¿Eliminar la credencial de TMDB guardada en este navegador?")) return;
    tmdbCredential = null;
    await dbSet(TMDB_CREDENTIAL_KEY, null);
    tmdbResults = [];
    tmdbClient.resetGenres();
    renderApp();
    toast("Credencial eliminada de este navegador.");
  }

  function pruneTMDBCache() {
    const limit = 1000 * 60 * 60 * 24 * 179;
    const now = Date.now();
    function isExpired(entry) {
      if (!entry || !entry.tmdbFetchedAt) return false;
      const fetchedAt = new Date(entry.tmdbFetchedAt).getTime();
      return Number.isFinite(fetchedAt) && now - fetchedAt > limit;
    }
    function strip(entry) {
      ["genres","tags","overview","posterPath","posterUrl","voteAverage","voteCount","runtime","releaseDate","backdropPath","backdropUrl","tagline","status","productionCountries","imdbId","tmdbFetchedAt","metadataSource"].forEach(function (key) { delete entry[key]; });
      return entry;
    }
    let changed = false;
    function pruneList(list) {
      return (list || []).map(function (entry) {
        if (entry && entry.metadataSource === "tmdb" && isExpired(entry)) {
          changed = true;
          return strip(Object.assign({},entry));
        }
        return entry;
      });
    }
    customCatalog = pruneList(customCatalog);
    state.rated = pruneList(state.rated);
    state.watched = pruneList(state.watched);
    state.watchlist = pruneList(state.watchlist);
    state.hidden = pruneList(state.hidden);
    if (changed) {
      dbSet(CATALOG_KEY,customCatalog).catch(function () {});
      persistState();
    }
  }


  function historyNeedsTMDB(entry) {
    const fetchedAt = entry && entry.tmdbFetchedAt ? new Date(entry.tmdbFetchedAt).getTime() : 0;
    const isFresh = entry && entry.metadataSource === "tmdb" &&
      Number.isFinite(fetchedAt) && Date.now() - fetchedAt < 1000 * 60 * 60 * 24 * 179;
    if (isFresh && (entry.posterUrl || entry.posterPath)) return false;
    return Boolean(entry && entry.title);
  }

  function historyTMDBId(entry) {
    const value = Number(entry && (entry.tmdbId || entry.tmId || entry.tmdb_id));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  function pendingHistoryTMDBCount() {
    return catalog.filter(historyNeedsTMDB).length;
  }

  async function findTMDBDetailsForRating(entry) {
    const id = historyTMDBId(entry);
    if (id) {
      try {
        return await tmdbRequest("/movie/" + encodeURIComponent(id), { language: "es-ES", append_to_response: "keywords" });
      } catch (error) {
        // Si el ID guardado ya no existe, busca el título por nombre y año.
      }
    }
    const params = { query: entry.title, language: "es-ES", include_adult: false };
    if (entry.year) params.year = entry.year;
    const results = await tmdbRequest("/search/movie", params);
    const candidates = results.results || [];
    if (!candidates.length) return null;
    const wanted = titleKey(entry.title);
    let selected = candidates.find(function (candidate) {
      return titleKey(candidate.title) === wanted || titleKey(candidate.original_title) === wanted;
    });
    if (!selected && entry.year) {
      const sameYear = candidates.filter(function (candidate) {
        return String(candidate.release_date || "").slice(0, 4) === String(entry.year);
      });
      if (sameYear.length === 1) selected = sameYear[0];
    }
    if (!selected && candidates.length === 1) selected = candidates[0];
    if (!selected) return null;
    return await tmdbRequest("/movie/" + encodeURIComponent(selected.id), { language: "es-ES", append_to_response: "keywords" });
  }

  function applyTMDBDetailsToRating(entry, enriched) {
    entry.tmdbId = String(enriched.id || enriched.tmdbId || entry.tmdbId || entry.tmId || "");
    entry.genres = uniqueStrings((enriched.genres || []).concat(entry.genres || []));
    entry.tags = uniqueStrings((enriched.tags || []).concat(entry.tags || []));
    entry.overview = enriched.overview || entry.overview || "";
    entry.posterPath = enriched.posterPath || entry.posterPath || "";
    entry.posterUrl = enriched.posterUrl || entry.posterUrl || "";
    entry.voteAverage = enriched.voteAverage || entry.voteAverage || null;
    entry.voteCount = enriched.voteCount || entry.voteCount || null;
    entry.runtime = enriched.runtime || entry.runtime || null;
    entry.releaseDate = enriched.releaseDate || entry.releaseDate || null;
    entry.backdropPath = enriched.backdropPath || entry.backdropPath || "";
    entry.backdropUrl = enriched.backdropUrl || entry.backdropUrl || "";
    entry.tagline = enriched.tagline || entry.tagline || "";
    entry.status = enriched.status || entry.status || "";
    entry.productionCountries = (enriched.productionCountries && enriched.productionCountries.length) ? enriched.productionCountries : (entry.productionCountries || []);
    entry.imdbId = enriched.imdbId || entry.imdbId || "";
    entry.tmdbFetchedAt = enriched.tmdbFetchedAt || new Date().toISOString();
    entry.metadataSource = "tmdb";
  }

  function applyTMDBDetailsToLocalCollection(entry, enriched) {
    ["rated","watched","watchlist","hidden"].forEach(function (listName) {
      state[listName] = (state[listName] || []).map(function (current) {
        if (!sameMovieRecord(current,entry)) return current;
        const updated = Object.assign({},current);
        applyTMDBDetailsToRating(updated,enriched);
        return updated;
      });
    });
  }


  function upsertTMDBCatalogEntry(rating, enriched) {
    const stored = Object.assign({}, enriched, {
      id: rating.id || enriched.id,
      tmdbId: rating.tmdbId || enriched.tmdbId || enriched.id,
      title: rating.title || enriched.title,
      year: rating.year || enriched.year,
      genres: uniqueStrings((rating.genres || []).concat(enriched.genres || [])),
      tags: uniqueStrings((rating.tags || []).concat(enriched.tags || [])),
      overview: rating.overview || enriched.overview || "",
      posterPath: rating.posterPath || enriched.posterPath || "",
      posterUrl: rating.posterUrl || enriched.posterUrl || "",
      tmdbFetchedAt: rating.tmdbFetchedAt || enriched.tmdbFetchedAt || new Date().toISOString(),
      metadataSource: "tmdb",
      source: "tmdb"
    });
    const key = titleKey(stored.title);
    const index = customCatalog.findIndex(function (movie) {
      const existingId = movieTmdbId(movie), incomingId = movieTmdbId(stored);
      if (existingId && incomingId) return existingId === incomingId;
      return titleKey(movie.title) === key && !existingId && !incomingId;
    });
    if (index >= 0) {
      customCatalog[index] = Object.assign({}, customCatalog[index], stored, {
        title: customCatalog[index].title || stored.title,
        genres: uniqueStrings((customCatalog[index].genres || []).concat(stored.genres || [])),
        tags: uniqueStrings((customCatalog[index].tags || []).concat(stored.tags || [])),
        overview: stored.overview || customCatalog[index].overview || "",
        posterUrl: stored.posterUrl || customCatalog[index].posterUrl || ""
      });
    } else customCatalog.push(stored);
  }

  function renderTMDBHistoryPanel() {
    const pending = pendingHistoryTMDBCount();
    const connected = Boolean(tmdbCredential && tmdbCredential.value);
    const status = tmdbHistorySync.running ?
      "Completando " + tmdbHistorySync.done.toLocaleString("es-PA") + " de " + tmdbHistorySync.total.toLocaleString("es-PA") :
      (tmdbHistorySync.finishedAt ? tmdbHistorySync.updated.toLocaleString("es-PA") + " actualizadas · " + tmdbHistorySync.failed.toLocaleString("es-PA") + " sin coincidencia" : "");
    const percent = tmdbHistorySync.total ? Math.round(tmdbHistorySync.done / tmdbHistorySync.total * 100) : 0;
    const button = !connected ?
      '<button class="btn btn-secondary" type="button" data-nav="data">Conectar TMDB</button>' :
      '<button class="btn btn-primary" type="button" data-action="enrich-history" ' + (tmdbHistorySync.running || pending === 0 ? "disabled" : "") + '>' +
      (tmdbHistorySync.running ? "Completando…" : (pending === 0 ? "Todo actualizado" : "Completar " + pending.toLocaleString("es-PA") + " títulos")) + '</button>';
    return '<section class="panel tmdb-history-panel"><div class="panel-head"><div class="panel-title-row"><h3>Carátulas y datos</h3>' + infoButton("metadata","Información sobre carátulas y datos") + '</div><span class="badge ' + (connected ? "badge-mint" : "") + '">' + (connected ? "TMDB conectado" : "TMDB desconectado") + '</span></div>' +
      '<div class="metadata-action-row"><span>' + pending.toLocaleString("es-PA") + ' por completar</span><div class="hero-actions">' + button + '</div></div>' +
      (tmdbHistorySync.running ? '<progress class="tmdb-progress" max="100" value="' + percent + '">' + percent + '%</progress><p class="metadata-progress-label">' + escapeHTML(status) + ' · ' + percent + '%</p>' : (status ? '<p class="metadata-progress-label">' + escapeHTML(status) + '</p>' : "")) +
      '</section>';
  }


  async function enrichRatedHistoryWithTMDB() {
    if (!tmdbCredential || !tmdbCredential.value) {
      toast("Conecta TMDB en Ajustes para cargar las carátulas y completar los datos.",true);
      clickNav("data");
      return;
    }
    if (tmdbHistorySync.running) {
      tmdbEnrichRequested = true;
      toast("Los títulos nuevos se añadirán a la cola actual.");
      return;
    }
    const targets = catalog.filter(historyNeedsTMDB);
    if (!targets.length) {
      toast("Las carátulas y los datos del catálogo están actualizados.");
      return;
    }
    tmdbHistorySync = {running:true,total:targets.length,done:0,updated:0,failed:0,current:"",finishedAt:null};
    renderApp();
    let cursor = 0;
    let lastPersisted = 0;
    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= targets.length) return;
        const entry = targets[index];
        tmdbHistorySync.current = entry.title;
        try {
          const raw = await findTMDBDetailsForRating(entry);
          if (!raw) {
            tmdbHistorySync.failed += 1;
          } else {
            const enriched = fromTMDB(raw);
            if (!enriched || !enriched.title) {
              tmdbHistorySync.failed += 1;
            } else {
              applyTMDBDetailsToRating(entry,enriched);
              applyTMDBDetailsToLocalCollection(entry,enriched);
              upsertTMDBCatalogEntry(entry,enriched);
              tmdbHistorySync.updated += 1;
            }
          }
        } catch (_) {
          tmdbHistorySync.failed += 1;
        } finally {
          tmdbHistorySync.done += 1;
          if (tmdbHistorySync.done - lastPersisted >= 5 || tmdbHistorySync.done === tmdbHistorySync.total) {
            lastPersisted = tmdbHistorySync.done;
            state.updatedAt = new Date().toISOString();
            await persistState();
            await dbSet(CATALOG_KEY,customCatalog);
            combineMovies();
            if (currentPage === "library") refreshCollectionContent();
            else renderApp();
          }
        }
        await new Promise(function (resolve) { window.setTimeout(resolve,120); });
      }
    }
    await Promise.all([worker(),worker(),worker()]);
    tmdbHistorySync.running = false;
    tmdbHistorySync.finishedAt = new Date().toISOString();
    tmdbHistorySync.current = "";
    state.events.unshift({title:"Carátulas y datos actualizados",description:tmdbHistorySync.updated + " actualizadas; " + tmdbHistorySync.failed + " sin coincidencia",symbol:"✦",at:tmdbHistorySync.finishedAt});
    state.events = state.events.slice(0,80);
    state.updatedAt = tmdbHistorySync.finishedAt;
    await persistState();
    await dbSet(CATALOG_KEY,customCatalog);
    combineMovies();
    renderApp();
    toast("Completado: " + tmdbHistorySync.updated.toLocaleString("es-PA") + " títulos actualizados; " + tmdbHistorySync.failed.toLocaleString("es-PA") + " sin coincidencia.");
    if (tmdbEnrichRequested) {
      tmdbEnrichRequested = false;
      window.setTimeout(function () { enrichRatedHistoryWithTMDB(); },250);
    }
  }


  function renderTMDBAttribution() {
    return '<section class="tmdb-attribution" aria-label="Atribución de TMDB"><a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer"><img src="' + TMDB_LOGO_URL + '" alt="TMDB" loading="lazy"></a><div><strong>Datos e imágenes de The Movie Database (TMDB)</strong><p>Este producto utiliza TMDB y las API de TMDB, pero no está respaldado, certificado ni aprobado por TMDB.</p><a href="https://www.themoviedb.org/about/logos-attribution" target="_blank" rel="noopener noreferrer">Logos y atribución oficial ↗</a></div></section>';
  }

  function renderTMDBResults() {
    const status = $("#tmdbStatus");
    const target = $("#tmdbResults");
    if (!status || !target) return;
    if (!tmdbCredential || !tmdbCredential.value) {
      status.innerHTML = '<button class="btn btn-secondary btn-small" type="button" data-nav="data">Conectar con TMDB</button>';
      target.innerHTML = '';
      return;
    }
    const label = tmdbMode === "search" ? "Resultados para «" + catalogQuery.trim() + "»" : "Películas populares en TMDB";
    const visibleResults = uniqueDiscoveryMovies(tmdbResults).filter(function (movie) {
      return !isInHistory(movie.title,movie.tmdbId) && !isHidden(movie.title,movie.tmdbId);
    });
    status.textContent = (tmdbLoading ? "Consultando TMDB…" : (tmdbError ? "No se pudo completar la consulta." : label)) +
      (tmdbResults.length && !tmdbLoading && !tmdbError ? " · " + visibleResults.length + " disponibles" : "");
    if (tmdbLoading && !tmdbResults.length) {
      target.innerHTML = '<div class="loading-state"><span class="spinner"></span><p>Buscando películas…</p></div>';
      return;
    }
    if (tmdbError) {
      target.innerHTML = '<div class="notice"><strong>Error de TMDB.</strong> ' + escapeHTML(tmdbError) + '<div style="margin-top:10px"><button class="btn btn-secondary btn-small" type="button" data-action="tmdb-retry">Volver a intentar</button></div></div>';
      return;
    }
    if (!tmdbResults.length) {
      target.innerHTML = '<div class="empty-state"><div class="empty-icon">⌕</div><h3>No hay resultados</h3><p>Prueba otra búsqueda.</p></div>';
      return;
    }
    const resultsMarkup = visibleResults.length
      ? movieGrid(visibleResults)
      : '<div class="empty-inline discovery-filtered-empty"><strong>No hay películas nuevas en estos resultados.</strong><span>Los títulos vistos y ocultos se omiten de Descubrir.</span></div>';
    target.innerHTML = resultsMarkup +
      (tmdbPage < tmdbTotalPages ? '<div class="load-more-wrap"><button class="btn btn-secondary" type="button" data-action="tmdb-more">' + (tmdbLoading ? "Cargando…" : "Cargar más") + '</button></div>' : "");
  }

  async function loadTMDBPage(page, mode, append) {
    if (!tmdbCredential || !tmdbCredential.value) {
      renderTMDBResults();
      return;
    }
    const safeMode = mode === "search" && catalogQuery.trim().length >= 2 ? "search" : "popular";
    const query = catalogQuery.trim();
    const requestId = ++tmdbRequestSerial;
    tmdbMode = safeMode;
    tmdbLoading = true;
    tmdbError = "";
    if (!append) tmdbResults = [];
    renderTMDBResults();
    try {
      try { await ensureTMDBGenres(); } catch (_) {
        // La búsqueda sigue siendo útil aunque no se pueda cargar el listado de géneros.
      }
      const params = { language: "es-ES", page: page, include_adult: false };
      const endpoint = safeMode === "search" ? "/search/movie" : "/movie/popular";
      if (safeMode === "search") params.query = query;
      const data = await tmdbRequest(endpoint, params);
      if (requestId !== tmdbRequestSerial) return;
      const mapped = (data.results || []).map(fromTMDB).filter(function (movie) { return Boolean(movie.title); });
      tmdbResults = append ? tmdbResults.concat(mapped) : mapped;
      tmdbPage = Number(data.page) || page;
      tmdbTotalPages = Math.min(Number(data.total_pages) || 1, 500);
      tmdbError = "";
    } catch (error) {
      if (requestId !== tmdbRequestSerial) return;
      tmdbError = error && error.message ? error.message : "Error al consultar TMDB.";
    } finally {
      if (requestId === tmdbRequestSerial) {
        tmdbLoading = false;
        renderTMDBResults();
      }
    }
  }

  async function enrichTMDBMovie(movie) {
    if (!movie || !tmdbCredential || !tmdbCredential.value) return;
    const id = movie.tmdbId || (movie.source === "tmdb" ? movie.id : null);
    if (!id) return;
    const fetchedAt = movie.tmdbFetchedAt ? new Date(movie.tmdbFetchedAt).getTime() : 0;
    const cacheFresh = fetchedAt && Date.now() - fetchedAt < 1000 * 60 * 60 * 24 * 30;
    if (cacheFresh && movie.tags && movie.tags.length) return;
    try {
      const details = await tmdbRequest("/movie/" + encodeURIComponent(id), { language: "es-ES", append_to_response: "keywords" });
      const enriched = fromTMDB(details);
      if (modalDraft && titleKey(modalDraft.movie.title) === titleKey(movie.title)) {
        modalDraft.movie = Object.assign({}, modalDraft.movie, enriched, { key: titleKey(enriched.title) });
        renderModal();
      }
    } catch (error) {
      console.warn("Prisma: no se pudieron cargar los detalles de TMDB.", error && error.message ? error.message : "");
    }
  }

  const { buildProfile, predictRating, evaluateModel } = createRecommendationEngine({
    getRatings: function () { return state.rated; },
    findMovie: findMovie,
    movieFeatures: movieFeatures,
    ratingValue: ratingValue
  });

  function getRecommendations(limit) {
    const profile = buildProfile();
    const results = uniqueDiscoveryMovies(catalog).filter(function (movie) {
      return !isMovieInCollection(movie.title,movie.tmdbId) && movie.source !== "history";
    }).map(function (movie) {
      const prediction = predictRating(movie, profile);
      return Object.assign({}, movie, { prediction: prediction });
    });
    results.sort(function (a, b) {
      const aScore = a.prediction.score + Math.min(a.prediction.freshFeatures, 3) * 0.025;
      const bScore = b.prediction.score + Math.min(b.prediction.freshFeatures, 3) * 0.025;
      return bScore - aScore || b.prediction.matches.length - a.prediction.matches.length || a.title.localeCompare(b.title);
    });
    const selected = [];
    const genreCounts = new Map();
    results.forEach(function (movie) {
      if (selected.length >= (limit || 8)) return;
      const mainGenre = (movie.genres && movie.genres[0]) || "Otros";
      if ((genreCounts.get(mainGenre) || 0) >= 2 && results.length > (limit || 8) * 1.4) return;
      selected.push(movie);
      genreCounts.set(mainGenre, (genreCounts.get(mainGenre) || 0) + 1);
    });
    return selected;
  }

   function genreStats() {
    const stats = new Map();
    state.rated.forEach(function (entry) {
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId);
      const rating = ratingValue(entry);
      if (rating == null) return;
      const genres = (entry.genres && entry.genres.length ? entry.genres : (movie && movie.genres)) || [];
      genres.forEach(function (genre) {
        const current = stats.get(genre) || { sum: 0, count: 0 };
        current.sum += rating;
        current.count += 1;
        stats.set(genre, current);
      });
    });
    return Array.from(stats.entries()).map(function (entry) {
      return { name: entry[0], average: entry[1].sum / entry[1].count, count: entry[1].count };
    }).filter(function (item) { return item.count >= 2; }).sort(function (a, b) { return b.average - a.average; });
  }

  function logEvent(title, description, symbol) {
    state.events.unshift({ title: title, description: description, symbol: symbol || "✦", at: new Date().toISOString() });
    state.events = state.events.slice(0, 80);
    state.updatedAt = new Date().toISOString();
    persistState();
  }

  async function persistState() {
    try { await dbSet(STATE_KEY, state); }
    catch (error) { toast("No pude guardar los datos. Exporta una copia de seguridad.", true); }
  }

  function toast(message, isError) {
    const root = $("#toastRoot");
    if (!root) return;
    const node = document.createElement("div");
    node.className = "toast" + (isError ? " error" : "");
    node.textContent = message;
    root.appendChild(node);
    window.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 3600);
  }

  function openModal(movie, mode) {
    if (!movie) return;
    const existing = ratingFor(movie.title);
    const nextMode = mode || "details";
    if (nextMode === "rate") {
      ratingReturnDetail = Boolean(movieDetail);
      modalDraft = {
        movie: movie,
        mode: "rate",
        rating: existing ? ratingValue(existing) : 7,
        emotions: existing && Array.isArray(existing.emotions) ? existing.emotions.slice() : [],
        note: existing && existing.note ? existing.note : ""
      };
      utilitySheet = null;
      renderModal();
      return;
    }
    movieDetail = { movie: movie, data: null, loading: false, error: "" };
    personDetail = null;
    modalDraft = null;
    utilitySheet = null;
    ratingReturnDetail = false;
    renderModal();
    if (tmdbCredential && tmdbCredential.value && movie.tmdbId) loadMovieDetail(movie);
  }

  function renderModal() {
    const root = $("#modalRoot");
    if (!root) return;
    if (utilitySheet) { renderUtilitySheet(); return; }
    if (personDetail) { renderPersonDetails(); return; }
    if (modalDraft && modalDraft.mode === "rate") { renderRatingSheet(); return; }
    if (movieDetail) { renderMovieDetails(); return; }
    root.innerHTML = "";
  }

  function openUtilitySheet(type) {
    utilitySheet = { type:type, key:"", sort:collectionSort, direction:collectionDirection, genres:collectionGenres.slice() };
    renderModal();
  }

  function openInfoSheet(key) {
    utilitySheet = {type:"info",key:key || "collection"};
    renderModal();
  }

  function renderUtilitySheet() {
    const root = $("#modalRoot");
    if (!root || !utilitySheet) return;
    if (utilitySheet.type === "info") {
      const help = {
        progress:{title:"Progreso",body:"Resume las películas vistas, las notas y la media personal de este navegador. Las tendencias por género usan los metadatos enlazados disponibles."},
        discover:{title:"Descubrir",body:"Aquí tienes recomendaciones, búsqueda TMDB y catálogo local. Las recomendaciones no incluyen películas vistas, pendientes u ocultas."},
        recommendations:{title:"Recomendaciones",body:"Prisma compara géneros y etiquetas disponibles con tus valoraciones. La nota mostrada es una estimación personal, no una puntuación pública ni una garantía."},
        collection:{title:"Tu colección",body:"Historial reúne películas vistas o valoradas. Pendientes guarda títulos para más tarde. Ocultos los retira de recomendaciones sin borrar sus notas. La búsqueda y los filtros solo afectan a la colección."},
        genres:{title:"Géneros",body:"Puedes seleccionar varios. Se muestran películas que coinciden con al menos uno de los géneros escogidos."},
        metadata:{title:"Carátulas y datos",body:"El JSON aporta títulos, identificadores TMDB, fechas y valoraciones; no incluye imágenes ni sinopsis. Prisma usa los identificadores para recuperar carátulas, géneros, sinopsis, duración y otros datos. Los resultados se guardan en este navegador."},
        tmdb:{title:"TMDB",body:"TMDB proporciona imágenes y datos de películas. Si no hay dato externo verificable, Prisma ofrece un enlace en vez de inventar una puntuación."},
        import:{title:"Importar JSON",body:"Prisma importa movies.cH (vistas), movies.cW (pendientes) y movies.rM (valoraciones). Las series de shows se ignoran. Tus notas manuales existentes tienen prioridad."},
        privacy:{title:"Privacidad",body:"Notas, listas y credencial TMDB se guardan en este navegador. No publiques tu JSON en GitHub. Exporta una copia de seguridad antes de borrar los datos del navegador."},
        lab:{title:"Laboratorio",body:"Muestra patrones de tus valoraciones y comprueba el motor con el historial enlazado. Las medidas son experimentales."},
        ratings:{title:"Puntuaciones",body:"La puntuación pública aparece si la fuente la entrega. IMDb, Rotten Tomatoes y Metacritic se abren como enlaces si sus cifras no están disponibles directamente."}
      };
      const info = help[utilitySheet.key] || help.collection;
      root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet info-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><h2 id="sheetTitle">' + escapeHTML(info.title) + '</h2><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><p class="info-sheet-copy">' + escapeHTML(info.body) + '</p><button class="btn btn-primary sheet-accept" type="button" data-action="close-sheet">Entendido</button></section></div>';
      return;
    }
    if (utilitySheet.type === "sort") {
      const options = [
        {key:"title",label:"Título",hint:"Orden alfabético"},
        {key:"public",label:"Mejores valorados",hint:"Nota pública de TMDB"},
        {key:"rating",label:"Mi valoración",hint:"Tu nota del 1 al 10"},
        {key:"runtime",label:"Duración",hint:"Películas más largas o cortas"},
        {key:"release",label:"Más reciente",hint:"Fecha de estreno"},
        {key:"added",label:"Añadidos recientemente",hint:"Fecha en que guardaste la película"},
        {key:"random",label:"Aleatorio",hint:"Mezcla la lista"}
      ];
      root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><div class="eyebrow">PERSONALIZA TU LISTA</div><h2 id="sheetTitle">Ordenar por</h2></div><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><button class="sort-direction" type="button" data-action="toggle-sort-direction"><span>Dirección del orden</span><strong>' + (utilitySheet.direction === "asc" ? "Ascendente ↑" : "Descendente ↓") + '</strong></button><div class="sheet-options">' + options.map(function (item) {
        const active = utilitySheet.sort === item.key;
        return '<button type="button" class="sheet-option ' + (active ? "active" : "") + '" data-action="choose-sort" data-sort="' + item.key + '"><span><strong>' + item.label + '</strong><small>' + item.hint + '</small></span><span class="sheet-option-mark">' + (active ? (utilitySheet.direction === "asc" ? "↑" : "↓") : "") + '</span></button>';
      }).join("") + '</div><button class="btn btn-primary sheet-accept" type="button" data-action="accept-sort">Aceptar</button></section></div>';
      return;
    }
    if (utilitySheet.type === "genres") {
      const genres = uniqueStrings(COLLECTION_GENRES.concat(allGenres())).sort(function (a, b) { return a.localeCompare(b, "es"); });
      root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><div class="eyebrow">AFINA LA SELECCIÓN</div><h2 id="sheetTitle">Géneros</h2></div><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><p class="kicker">Puedes seleccionar varios géneros. Se mostrarán películas que coincidan con al menos uno.</p><div class="sheet-genre-grid">' + genres.map(function (genre) {
        const selected = utilitySheet.genres.some(function (value) { return titleKey(value) === titleKey(genre); });
        return '<button type="button" class="sheet-genre ' + (selected ? "selected" : "") + '" data-action="toggle-sheet-genre" data-genre="' + escapeHTML(genre) + '" aria-pressed="' + selected + '"><span>' + escapeHTML(genre) + '</span><b>' + (selected ? "✓" : "+") + '</b></button>';
      }).join("") + '</div><div class="sheet-footer-actions"><button class="btn btn-quiet" type="button" data-action="clear-sheet-genres">Limpiar</button><button class="btn btn-primary" type="button" data-action="accept-genres">Aceptar</button></div></section></div>';
      return;
    }
    const current = movieDetail ? movieDetail.movie : null;
    root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><div class="eyebrow">TU COLECCIÓN</div><h2 id="sheetTitle">Gestionar listas</h2><p>' + escapeHTML(current ? current.title : "") + '</p></div><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><div class="manage-list-actions"><button class="manage-list-action" type="button" data-action="manage-history"><span>✓</span><strong>' + (current && isInHistory(current.title) ? "Ya está en tu historial" : "Añadir al historial") + '</strong><small>Marcar como vista sin necesidad de poner una nota.</small></button><button class="manage-list-action" type="button" data-action="manage-pending"><span>＋</span><strong>' + (current && isInWatchlist(current.title) ? "Quitar de pendientes" : "Añadir a pendientes") + '</strong><small>Guardar para verla más adelante.</small></button><button class="manage-list-action" type="button" data-action="manage-hidden"><span>◌</span><strong>' + (current && isHidden(current.title) ? "Mostrar en Prisma" : "Ocultar película") + '</strong><small>Controla si aparece en Descubrir y en tus listas visibles.</small></button></div></section></div>';
  }

  async function softTMDBRequest(path, params) {
    try { return await tmdbRequest(path, params || {}); } catch (_) { return null; }
  }

  async function loadMovieDetail(movie) {
    const id = String(movie.tmdbId || "");
    if (!id || !tmdbCredential || !tmdbCredential.value) return;
    if (movieDetailCache.has(id)) {
      if (movieDetail && sameMovieRecord(movieDetail.movie,movie)) {
        const cached = movieDetailCache.get(id);
        movieDetail.movie = cached.movie;
        movieDetail.data = cached.data;
        movieDetail.loading = false;
        renderModal();
      }
      return;
    }
    if (!movieDetail || titleKey(movieDetail.movie.title) !== titleKey(movie.title)) return;
    movieDetail.loading = true;
    renderModal();
    try {
      const raw = await tmdbRequest("/movie/" + encodeURIComponent(id), { language: "es-ES", append_to_response: "credits,videos,release_dates,external_ids,keywords,recommendations,similar" });
      const providerResponse = await softTMDBRequest("/movie/" + encodeURIComponent(id) + "/watch/providers", {});
      const normalized = fromTMDB(raw);
      const backdropPath = raw.backdrop_path || normalized.backdropPath || "";
      const detailsMovie = Object.assign({}, movieDetail.movie, normalized, {
        id:String(raw.id || id), tmdbId:String(raw.id || id), title:raw.title || movieDetail.movie.title,
        originalTitle:raw.original_title || "", releaseDate:raw.release_date || null,
        backdropPath:backdropPath, backdropUrl:backdropPath ? "https://image.tmdb.org/t/p/w1280" + backdropPath : "",
        tagline:raw.tagline || "", status:raw.status || "", runtime:Number(raw.runtime) || movieDetail.movie.runtime || null,
        productionCountries:Array.isArray(raw.production_countries) ? raw.production_countries.map(function (country) { return country.name || country.iso_3166_1; }) : [],
        imdbId:raw.external_ids && raw.external_ids.imdb_id ? raw.external_ids.imdb_id : (raw.imdb_id || ""),
        collection:raw.belongs_to_collection || null, popularity:Number(raw.popularity) || null
      });
      const providerRoot = providerResponse && providerResponse.results ? providerResponse.results : {};
      const data = {
        credits:raw.credits || {}, videos:raw.videos && raw.videos.results ? raw.videos.results : [],
        externalIds:raw.external_ids || {},
        recommendations:raw.recommendations && raw.recommendations.results ? raw.recommendations.results.map(fromTMDB) : [],
        similar:raw.similar && raw.similar.results ? raw.similar.results.map(fromTMDB) : [],
        providers:providerRoot.PA || null,
        providerResults:providerRoot,
        releaseDates:raw.release_dates && raw.release_dates.results ? raw.release_dates.results : []
      };
      if (movieDetail && sameMovieRecord(movieDetail.movie,movie)) {
        movieDetail.movie = detailsMovie; movieDetail.data = data; movieDetail.loading = false; movieDetail.error = "";
        movieDetailCache.set(id,{movie:detailsMovie,data:data});
        await persistMovieMetadata(detailsMovie);
        renderModal();
      }
    } catch (error) {
      if (movieDetail && sameMovieRecord(movieDetail.movie,movie)) {
        movieDetail.loading = false; movieDetail.error = error.message || "No se pudo cargar la ficha de TMDB."; renderModal();
      }
    }
  }

  async function persistMovieMetadata(movie) {
    if (!movie || !movie.title) return;
    const key = titleKey(movie.title);
    const metadata = {};
    ["id","tmdbId","year","genres","tags","overview","posterPath","posterUrl","voteAverage","voteCount","runtime","releaseDate","backdropPath","backdropUrl","tagline","status","productionCountries","imdbId","tmdbFetchedAt","metadataSource"].forEach(function (field) {
      if (movie[field] !== undefined && movie[field] !== null && movie[field] !== "") metadata[field] = movie[field];
    });
    function mergeMatching(list) {
      return (list || []).map(function (entry) { return sameMovieRecord(entry,movie) ? Object.assign({},entry,metadata) : entry; });
    }
    state.rated = mergeMatching(state.rated);
    state.watched = mergeMatching(state.watched);
    state.watchlist = mergeMatching(state.watchlist);
    state.hidden = mergeMatching(state.hidden);
    const movieId = movieTmdbId(movie);
    const index = customCatalog.findIndex(function (entry) {
      const existingId = movieTmdbId(entry);
      if (movieId && existingId) return movieId === existingId;
      return titleKey(entry.title) === key && !movieId && !existingId;
    });
    if (index >= 0) customCatalog[index] = Object.assign({},customCatalog[index],metadata,{title:movie.title,source:"tmdb"});
    else customCatalog.unshift(Object.assign({},metadata,{title:movie.title,source:"tmdb"}));
    await dbSet(CATALOG_KEY,customCatalog);
    await persistState();
    combineMovies();
  }

  function renderMovieDetails() {
    const root = $("#modalRoot");
    if (!root || !movieDetail) return;
    const movie = movieDetail.movie, data = movieDetail.data, rating = ratingFor(movie.title,movie.tmdbId);
    const seen = isInHistory(movie.title,movie.tmdbId), pending = isInWatchlist(movie.title,movie.tmdbId), hidden = isHidden(movie.title,movie.tmdbId);
    const backdrop = movie.backdropUrl || movie.posterUrl || "";
    const genreChips = (movie.genres || []).slice(0,6).map(function (genre) { return '<span class="detail-chip">' + escapeHTML(displayGenre(genre)) + '</span>'; }).join("");
    const countryLine = (movie.productionCountries || []).slice(0,3).join(" · ");
    const release = movie.releaseDate ? dateLabel(movie.releaseDate) : (movie.year || "Estreno no disponible");
    const markedAt = (state.watched || []).find(function (entry) { return sameMovieRecord(entry,movie); })?.watchedAt || (rating && (rating.watchedAt || rating.updatedAt)) || null;
    const stateButton = seen ?
      '<button class="btn btn-primary detail-state-button" type="button" data-action="manage-history"><span aria-hidden="true">▣</span> Añadido al historial <small>' + escapeHTML(markedAt ? formatWatchedDate(markedAt) : "Fecha no registrada") + '</small></button>' :
      (pending ?
        '<button class="btn btn-secondary detail-state-button" type="button" data-action="manage-pending"><span aria-hidden="true">✓</span> Añadido a pendientes</button><button class="btn btn-primary" type="button" data-action="mark-watched">Marcar como vista</button>' :
        '<button class="btn btn-primary" type="button" data-action="manage-history">Añadir al historial</button><button class="btn btn-secondary" type="button" data-action="manage-pending">＋ Pendientes</button>');
    const voteLink = movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movie.tmdbId) : "https://www.themoviedb.org/";
    const externalIds = data && data.externalIds ? data.externalIds : {};
    const ratingMetrics = buildRatingMetrics(movie,externalIds);
    const cast = data && data.credits && Array.isArray(data.credits.cast) ? data.credits.cast.slice(0,14) : [];
    const crew = data && data.credits && Array.isArray(data.credits.crew) ? data.credits.crew : [];
    const director = crew.find(function (person) { return person.job === "Director"; });
    const writers = crew.filter(function (person) { return /writer|screenplay|story/i.test(String(person.job || "")); }).slice(0,4);
    const music = crew.find(function (person) { return /original music|composer|music/i.test(String(person.job || "")); });
    const crewChips =
      (director ? '<button class="crew-person" type="button" data-action="person-details" data-person-id="' + director.id + '" data-person-name="' + escapeHTML(director.name) + '"><small>Dirección</small><strong>' + escapeHTML(director.name) + '</strong></button>' : "") +
      writers.map(function (person) { return '<button class="crew-person" type="button" data-action="person-details" data-person-id="' + person.id + '" data-person-name="' + escapeHTML(person.name) + '"><small>' + escapeHTML(person.job || "Guion") + '</small><strong>' + escapeHTML(person.name) + '</strong></button>'; }).join("") +
      (music ? '<button class="crew-person" type="button" data-action="person-details" data-person-id="' + music.id + '" data-person-name="' + escapeHTML(music.name) + '"><small>Música</small><strong>' + escapeHTML(music.name) + '</strong></button>' : "");
    const castMarkup = cast.length ? '<div class="person-carousel">' + cast.map(function (person) {
      return '<button class="cast-person" type="button" data-action="person-details" data-person-id="' + person.id + '" data-person-name="' + escapeHTML(person.name) + '" data-character="' + escapeHTML(person.character || "") + '"><span class="cast-photo">' + (person.profile_path ? '<img src="' + escapeHTML(personImage(person.profile_path)) + '" alt="" loading="lazy">' : '<span>●</span>') + '</span><strong>' + escapeHTML(person.name) + '</strong><small>' + escapeHTML(person.character || "Reparto") + '</small></button>';
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
      return '<a class="provider-chip" href="' + escapeHTML(providers.link || voteLink + "/watch") + '" target="_blank" rel="noopener noreferrer">' + (provider.logo ? '<img src="https://image.tmdb.org/t/p/w92' + escapeHTML(provider.logo) + '" alt="" loading="lazy">' : "") + '<span><strong>' + escapeHTML(provider.name) + '</strong><small>' + label + '</small></span></a>';
    }).join("") + '</div>' : (data ? '<a class="btn btn-secondary btn-small" href="' + escapeHTML(voteLink + "/watch") + '" target="_blank" rel="noopener noreferrer">Consultar disponibilidad ↗</a>' : '<span class="kicker">—</span>');
    const collection = data && movie.collection ? movie.collection : null;
    const collectionMarkup = collection ? '<a class="saga-card" href="https://www.themoviedb.org/collection/' + encodeURIComponent(collection.id) + '" target="_blank" rel="noopener noreferrer"><span class="saga-art">' + (collection.poster_path ? '<img src="https://image.tmdb.org/t/p/w185' + escapeHTML(collection.poster_path) + '" alt="" loading="lazy">' : "▣") + '</span><span><small>PERTENECE A LA COLECCIÓN</small><strong>' + escapeHTML(collection.name) + '</strong></span><span aria-hidden="true">↗</span></a>' : "";
    const recs = data && data.recommendations ? uniqueDiscoveryMovies(data.recommendations).filter(function (item) {
      return !isMovieInCollection(item.title,item.tmdbId);
    }).slice(0,12) : [];
    const similarMarkup = recs.length ? '<div class="similar-carousel">' + recs.map(function (item) {
      const marker = isInHistory(item.title,item.tmdbId) ? "seen" : (isInWatchlist(item.title,item.tmdbId) ? "pending" : "");
      return '<button class="similar-poster" type="button" data-action="details" data-title="' + escapeHTML(item.title) + '" data-tmdb-id="' + escapeHTML(item.tmdbId || "") + '">' + (item.posterUrl ? '<img src="' + escapeHTML(item.posterUrl) + '" alt="" loading="lazy">' : '<span class="poster-fallback">▣</span>') + (marker ? '<i class="collection-marker ' + marker + '"></i>' : "") + '<strong>' + escapeHTML(item.title) + '</strong></button>';
    }).join("") + '</div>' : "";
    const videos = data && data.videos ? data.videos : [];
    const trailer = videos.find(function (video) { return video.site === "YouTube" && video.type === "Trailer"; }) || videos.find(function (video) { return video.site === "YouTube"; });
    const trailerUrl = trailer ? "https://www.youtube.com/watch?v=" + encodeURIComponent(trailer.key) : (movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movie.tmdbId) + "/videos" : "");
    root.innerHTML = '<div class="modal-backdrop detail-backdrop" data-action="backdrop-close"><section class="modal detail-sheet" role="dialog" aria-modal="true" aria-labelledby="detailTitle" data-modal-panel>' +
      '<div class="detail-scroll"><header class="detail-hero" style="' + (backdrop ? 'background-image:linear-gradient(180deg,rgba(4,8,14,.18) 0%,rgba(4,8,14,.22) 35%,#08101b 100%),url(&quot;' + escapeHTML(backdrop) + '&quot;)' : '') + '"><button class="detail-back" type="button" data-action="close-modal" aria-label="Volver">‹ <span>Volver</span></button><div class="detail-hero-title"><div class="eyebrow">' + escapeHTML(movie.year || "PELÍCULA") + (movie.originalTitle && movie.originalTitle !== movie.title ? ' · ' + escapeHTML(movie.originalTitle) : "") + '</div><h2 id="detailTitle">' + escapeHTML(movie.title) + '</h2>' + (movie.tagline ? '<p>' + escapeHTML(movie.tagline) + '</p>' : "") + '</div></header>' +
      '<div class="detail-body"><div class="detail-state-actions">' + stateButton + '<button class="btn btn-quiet" type="button" data-action="manage-lists">Gestionar listas</button><button class="btn btn-quiet" type="button" data-action="toggle-hidden">' + (hidden ? "Mostrar en Prisma" : "Ocultar") + '</button></div>' +
      '<div class="detail-meta-line"><span>Estreno <strong>' + escapeHTML(release) + '</strong></span><span>País <strong>' + escapeHTML(countryLine || "—") + '</strong></span><span>Duración <strong>' + escapeHTML(niceRuntime(movie.runtime)) + '</strong></span><span>Estado <strong>' + escapeHTML(displayMovieStatus(movie.status)) + '</strong></span></div>' +
      (genreChips ? '<div class="detail-chip-row">' + genreChips + '</div>' : "") +
      '<section class="detail-section"><div class="detail-section-heading"><h3>Puntuaciones</h3>' + infoButton("ratings","Información sobre puntuaciones externas") + '</div><div class="detail-rating-grid">' + ratingMetrics + '</div></section>' +
      '<section class="detail-section"><div class="detail-section-heading"><h3>Dónde verla</h3></div>' + providerMarkup + '</section>' +
      '<section class="detail-section synopsis-section"><div class="detail-section-heading"><h3>Sinopsis</h3></div>' + (movie.overview ? '<p>' + escapeHTML(movie.overview) + '</p>' : '<p class="kicker">Sin sinopsis.</p>') + '</section>' +
      '<div class="detail-action-strip"><button class="btn btn-primary" type="button" data-action="rate">' + (rating ? "Calificar · " + ratingValue(rating) + "/10" : "Calificar") + '</button><button class="btn btn-secondary" type="button" data-action="open-reviews">Comentarios</button><button class="btn btn-secondary" type="button" data-action="open-trailer">Tráiler</button><a class="btn btn-secondary" href="' + escapeHTML(externalMovieUrl(movie,externalIds)) + '" target="_blank" rel="noopener noreferrer">Enlace ↗</a><button class="btn btn-secondary" type="button" data-action="share-movie">Compartir</button></div>' +
      '<section class="detail-section"><div class="detail-section-heading"><h3>Reparto &amp; equipo</h3></div>' + castMarkup + (crewChips ? '<div class="crew-list">' + crewChips + '</div>' : "") + '</section>' +
      (collectionMarkup ? '<section class="detail-section"><div class="detail-section-heading"><h3>Colecciones</h3></div>' + collectionMarkup + '</section>' : "") +
      (similarMarkup ? '<section class="detail-section"><div class="detail-section-heading"><h3>También podría gustarte</h3></div>' + similarMarkup + '</section>' : "") +
      (movieDetail.loading ? '<div class="detail-loading"><span class="spinner"></span><p>Completando la ficha con TMDB…</p></div>' : "") +
      (movieDetail.error ? '<div class="notice detail-error"><strong>No se pudo completar la ficha.</strong> ' + escapeHTML(movieDetail.error) + '<button class="btn btn-secondary btn-small" type="button" data-action="retry-movie-detail">Reintentar</button></div>' : "") +
      (!data && !movieDetail.loading ? '<div class="detail-connection-note"><span>Completar ficha</span>' + infoButton("tmdb","Información sobre cómo se completa la ficha") + '<button class="btn btn-secondary btn-small" type="button" data-nav="data">Conectar TMDB</button></div>' : "") +
      '</div></div></section></div>';
  }

  function openPersonDetails(id, name, character) {
    personDetail = {id:String(id),name:name || "Persona",character:character || "",person:null,credits:null,loading:true,error:""};
    personListFilter = "all";
    renderModal();
    if (personDetailCache.has(String(id))) {
      personDetail = Object.assign(personDetail, personDetailCache.get(String(id)), {loading:false});
      renderModal();
      return;
    }
    if (!tmdbCredential || !tmdbCredential.value) {
      personDetail.loading = false; personDetail.error = "Conecta TMDB para consultar biografías y filmografías."; renderModal(); return;
    }
    const requestId = String(id);
    Promise.all([
      softTMDBRequest("/person/" + encodeURIComponent(requestId), {language:"es-ES"}),
      softTMDBRequest("/person/" + encodeURIComponent(requestId) + "/movie_credits", {language:"es-ES"})
    ]).then(function (responses) {
      if (!personDetail || personDetail.id !== requestId) return;
      personDetail.person = responses[0] || {};
      personDetail.credits = responses[1] || {cast:[],crew:[]};
      personDetail.loading = false;
      if (!responses[0]) personDetail.error = "No se pudo recuperar la ficha de esta persona.";
      personDetailCache.set(requestId,{person:personDetail.person,credits:personDetail.credits,error:personDetail.error});
      renderModal();
    });
  }

  function renderPersonDetails() {
    const root = $("#modalRoot");
    if (!root || !personDetail) return;
    const person = personDetail.person || {};
    const biography = person.biography || "";
    let credits = personDetail.credits ? (personDetail.credits.cast || []).concat(personDetail.credits.crew || []) : [];
    const seen = new Set();
    credits = credits.filter(function (movie) {
      if (!movie || !movie.id || seen.has(movie.id)) return false;
      seen.add(movie.id); return true;
    });
    if (personListFilter === "collection") credits = credits.filter(function (item) { return isMovieInCollection(item.title || item.name); });
    credits.sort(function (a,b) {
      const ay = Number(String(a.release_date || "").slice(0,4)) || 0, by = Number(String(b.release_date || "").slice(0,4)) || 0;
      if (!ay && by) return -1;
      if (ay && !by) return 1;
      return by - ay || String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""),"es");
    });
    const roles = personDetail.character ? '<span class="person-role">' + escapeHTML(personDetail.character) + '</span>' : "";
    const films = credits.map(function (item) {
      const movie = fromTMDB(item), year = item.release_date ? String(item.release_date).slice(0,4) : "TBA";
      const role = item.character || item.job || "";
      const marker = isMovieInCollection(movie.title,movie.tmdbId) ? '<span class="collection-marker ' + (isInHistory(movie.title,movie.tmdbId) ? "seen" : (isInWatchlist(movie.title,movie.tmdbId) ? "pending" : "hidden")) + '"></span>' : "";
      return '<button class="person-film-row" type="button" data-action="movie-from-person" data-title="' + escapeHTML(movie.title) + '" data-tmdb-id="' + escapeHTML(movie.tmdbId || "") + '"><span class="person-film-poster">' + (movie.posterUrl ? '<img src="' + escapeHTML(movie.posterUrl) + '" alt="" loading="lazy">' : '<span>▣</span>') + '</span><span class="person-film-copy"><span class="collection-release">' + year + '</span><strong>' + escapeHTML(movie.title) + '</strong><small>' + escapeHTML(role) + '</small><span>' + escapeHTML(item.overview || "Sin sinopsis disponible.") + '</span></span>' + marker + '<span class="film-clapper" aria-hidden="true">▣</span></button>';
    }).join("");
    root.innerHTML = '<div class="modal-backdrop detail-backdrop" data-action="backdrop-close"><section class="modal person-sheet" role="dialog" aria-modal="true" aria-labelledby="personTitle" data-modal-panel><div class="person-header"><button class="detail-back" type="button" data-action="person-back">‹ <span>Volver a la película</span></button><div class="person-header-content">' + (person.profile_path ? '<img src="https://image.tmdb.org/t/p/w342' + escapeHTML(person.profile_path) + '" alt="" class="person-portrait">' : '<div class="person-portrait person-portrait-empty">●</div>') + '<div><h2 id="personTitle">' + escapeHTML(person.name || personDetail.name) + '</h2>' + roles + '<p>' + escapeHTML(personAge(person.birthday,person.deathday)) + (person.birthday ? " · " + escapeHTML(dateLabel(person.birthday)) : "") + '</p><p>' + escapeHTML(person.place_of_birth || "Lugar de nacimiento desconocido") + '</p><a href="https://www.themoviedb.org/person/' + encodeURIComponent(personDetail.id) + '" target="_blank" rel="noopener noreferrer">Ver ficha en TMDB ↗</a></div></div></div><div class="person-body"><section class="detail-section"><div class="detail-section-heading"><h3>Biografía</h3></div><p>' + escapeHTML(biography || (personDetail.loading ? "Cargando biografía…" : "Sin biografía.")) + '</p></section><section class="detail-section"><div class="detail-section-heading"><h3>Filmografía</h3><span>' + credits.length + ' títulos</span></div><div class="person-filter-tabs"><button class="' + (personListFilter === "all" ? "active" : "") + '" type="button" data-action="person-filter" data-filter="all">Películas</button><button class="' + (personListFilter === "collection" ? "active" : "") + '" type="button" data-action="person-filter" data-filter="collection">Colección</button></div>' + (films ? '<div class="person-film-list">' + films + '</div>' : '<div class="empty-inline"><strong>Sin películas en esta vista</strong></div>') + '</section>' + (personDetail.error ? '<div class="notice">' + escapeHTML(personDetail.error) + '</div>' : "") + '</div></section></div>';
  }


    if (!modalDraft) return;
    modalDraft.rating = Number(value);
    const preview = $("#ratingPreview"), input = $("#ratingInput");
    if (preview) preview.textContent = String(modalDraft.rating);
    if (input) input.value = String(modalDraft.rating);
    $$(".rating-star").forEach(function (star) {
      const active = Number(star.dataset.rating) <= modalDraft.rating;
      star.classList.toggle("active",active);
      star.setAttribute("aria-pressed",String(Number(star.dataset.rating) === modalDraft.rating));
    });
  }

  function closeModal() {
    if (modalDraft && modalDraft.mode === "rate" && ratingReturnDetail && movieDetail) {
      modalDraft = null; ratingReturnDetail = false; renderModal(); return;
    }
    modalDraft = null; ratingReturnDetail = false; movieDetail = null; personDetail = null; utilitySheet = null;
    const root = $("#modalRoot");
    if (root) root.innerHTML = "";
  }


  async function saveRating() {
    if (!modalDraft) return;
    const movie = modalDraft.movie;
    const rating = Number($("#ratingInput").value);
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
      toast("La nota debe ser un número del 1 al 10.",true);
      return;
    }
    const existingIndex = state.rated.findIndex(function (entry) { return sameMovieRecord(entry,movie); });
    const old = existingIndex >= 0 ? state.rated[existingIndex] : {};
    const newEntry = Object.assign({},old,{
      id:old.id || movie.id,tmdbId:movie.tmdbId || old.tmdbId || null,
      title:movie.title,year:movie.year || old.year || null,rating:rating,
      posterPath:movie.posterPath || old.posterPath || "",posterUrl:movie.posterUrl || old.posterUrl || "",
      voteAverage:movie.voteAverage || old.voteAverage || null,voteCount:movie.voteCount || old.voteCount || null,runtime:movie.runtime || old.runtime || null,
      overview:movie.overview || old.overview || "",releaseDate:movie.releaseDate || old.releaseDate || null,
      backdropPath:movie.backdropPath || old.backdropPath || "",backdropUrl:movie.backdropUrl || old.backdropUrl || "",
      tmdbFetchedAt:movie.tmdbFetchedAt || old.tmdbFetchedAt || null,
      metadataSource:movie.metadataSource || old.metadataSource || (movie.source === "tmdb" ? "tmdb" : null),
      genres:uniqueStrings((old.genres || []).concat(movie.genres || [])),
      tags:uniqueStrings((old.tags || []).concat(movie.tags || [])),
      emotions:modalDraft.emotions.slice(),note:String(($("#ratingNote") || {}).value || "").trim(),
      updatedAt:new Date().toISOString(),source:"manual"
    });
    if (existingIndex >= 0) state.rated[existingIndex] = newEntry;
    else state.rated.unshift(newEntry);
    state.watchlist = state.watchlist.filter(function (entry) { return !sameMovieRecord(entry,movie); });
    const watchedIndex = (state.watched || []).findIndex(function (entry) { return sameMovieRecord(entry,movie); });
    const oldWatched = watchedIndex >= 0 ? state.watched[watchedIndex] : null;
    const watchedRecord = Object.assign({},oldWatched || {},newEntry,{
      watchedAt:(oldWatched && oldWatched.watchedAt) || old.watchedAt || old.updatedAt || new Date().toISOString()
    });
    if (watchedIndex >= 0) state.watched[watchedIndex] = watchedRecord;
    else state.watched.unshift(watchedRecord);
    logEvent("Valoración guardada: " + movie.title,"Nota " + rating + "/10" + (newEntry.emotions.length ? " · " + newEntry.emotions.length + " emociones registradas" : ""),"★");
    await persistState();
    const returnToDetails = ratingReturnDetail && Boolean(movieDetail);
    modalDraft = null;ratingReturnDetail = false;
    if (!returnToDetails) { movieDetail = null;$("#modalRoot").innerHTML = ""; }
    combineMovies();
    renderApp();
    if (returnToDetails) renderMovieDetails();
    toast("Tu experiencia quedó guardada en este dispositivo.");
  }

  async function deleteRating(title,tmdbId) {
    const target = {title:title,tmdbId:tmdbId || (modalDraft && modalDraft.movie.tmdbId) || ""};
    state.rated = state.rated.filter(function (entry) { return !sameMovieRecord(entry,target); });
    logEvent("Valoración eliminada",title,"−");
    await persistState();
    const returnToDetails = ratingReturnDetail && Boolean(movieDetail);
    modalDraft = null;ratingReturnDetail = false;
    if (!returnToDetails) { movieDetail = null;$("#modalRoot").innerHTML = ""; }
    combineMovies();
    renderApp();
    if (returnToDetails) renderMovieDetails();
    toast("Se quitó la valoración de " + title + ".");
  }

  function resolveMovieForAction(title,tmdbId) {
    const active = movieDetail && titleKey(movieDetail.movie.title) === titleKey(title) ? movieDetail.movie : null;
    const id = String(tmdbId || (active && active.tmdbId) || "");
    const target = {title:title,tmdbId:id};
    return (active && (!id || movieTmdbId(active) === id) ? active : null) ||
      findMovie(title,id) ||
      state.rated.find(function (entry) { return sameMovieRecord(entry,target); }) ||
      state.watchlist.find(function (entry) { return sameMovieRecord(entry,target); }) ||
      (state.watched || []).find(function (entry) { return sameMovieRecord(entry,target); }) ||
      (state.hidden || []).find(function (entry) { return sameMovieRecord(entry,target); }) ||
      {title:title,id:id || titleKey(title),tmdbId:id || null,genres:[],tags:[]};
  }

  async function toggleWatchlist(title,tmdbId) {
    const movie = resolveMovieForAction(title,tmdbId);
    const remove = isInWatchlist(movie.title,movie.tmdbId);
    if (remove) {
      state.watchlist = state.watchlist.filter(function (entry) { return !sameMovieRecord(entry,movie); });
      logEvent("Quitada de pendientes",title,"−");
      toast("Se quitó de tu lista.");
    } else {
      state.watchlist.unshift(Object.assign({},movie,{title:movie.title,addedAt:new Date().toISOString()}));
      logEvent("Añadida a pendientes",title,"＋");
      toast("Añadida a tu lista para verla después.");
    }
    await persistState();
    combineMovies();
    if (movieDetail) renderMovieDetails(); else renderApp();
  }

  async function markWatched(title,tmdbId) {
    const source = resolveMovieForAction(title,tmdbId);
    const index = (state.watched || []).findIndex(function (entry) { return sameMovieRecord(entry,source); });
    const previous = index >= 0 ? state.watched[index] : null;
    const watched = Object.assign({},previous || {},source,{watchedAt:(previous && previous.watchedAt) || new Date().toISOString()});
    if (index >= 0) state.watched[index] = watched;
    else state.watched.unshift(watched);
    state.watchlist = state.watchlist.filter(function (entry) { return !sameMovieRecord(entry,source); });
    logEvent("Añadida al historial",title,"✓");
    await persistState();
    combineMovies();
    if (movieDetail && sameMovieRecord(movieDetail.movie,source)) {
      movieDetail.movie = Object.assign({},movieDetail.movie,watched);
      renderMovieDetails();
    } else renderApp();
    toast("Marcada como vista.");
  }

  async function toggleHidden(title,tmdbId) {
    const movie = resolveMovieForAction(title,tmdbId);
    const remove = isHidden(movie.title,movie.tmdbId);
    if (remove) {
      state.hidden = state.hidden.filter(function (entry) { return !sameMovieRecord(entry,movie); });
    } else {
      state.hidden.unshift(Object.assign({},movie,{hiddenAt:new Date().toISOString()}));
    }
    logEvent(remove ? "Película mostrada" : "Película ocultada",title,"◌");
    await persistState();
    combineMovies();
    if (movieDetail && sameMovieRecord(movieDetail.movie,movie)) renderMovieDetails();
    else renderApp();
    toast(remove ? "La película vuelve a aparecer en Prisma." : "La película quedó oculta en tus recomendaciones.");
  }



   async function importPersonalJSON(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed && parsed.format === "prisma-backup" && parsed.state) {
      state = ensureState(parsed.state);
      if (Array.isArray(parsed.catalogCustom)) {
        customCatalog = parsed.catalogCustom.map(normalizeMovie).filter(Boolean);
        await dbSet(CATALOG_KEY, customCatalog);
      }
      await persistState();
      combineMovies();
      renderApp();
      toast("Copia de Prisma restaurada.");
      return;
    }
    const result = extractPersonalRatings(parsed);
    const collection = extractPersonalCollections(parsed);
    if (!result.ratings.length && !hasImportedCollection(collection)) {
      throw new Error("No encontré películas vistas, pendientes ni valoraciones reconocibles. Comprueba que el JSON contenga movies.cH, movies.cW o movies.rM.");
    }

    const ratingMap = new Map(state.rated.map(function (entry) { return [movieIdentityKey(entry), entry]; }));
    result.ratings.forEach(function (entry) {
      const key = movieIdentityKey(entry);
      const old = ratingMap.get(key);
      if (old && old.source === "manual") return;
      const merged = mergeMovieEntries(old, entry);
      merged.rating = ratingValue(entry);
      merged.source = "imported";
      merged.updatedAt = entry.updatedAt || old && old.updatedAt || null;
      ratingMap.set(key, merged);
    });
    state.rated = Array.from(ratingMap.values()).filter(function (entry) { return ratingValue(entry) != null; });
    state.watched = mergeMovieListByTitle(state.watched, collection.watched);
    state.watchlist = mergeMovieListByTitle(state.watchlist, collection.watchlist);
    state.hidden = mergeMovieListByTitle(state.hidden, collection.hidden);

    const catalogIncoming = collection.records.concat(result.ratings).map(normalizeMovie).filter(Boolean);
    customCatalog = mergeMovieListByTitle(customCatalog, catalogIncoming);
    state.importedAt = new Date().toISOString();
    const importDescription = result.ratings.length.toLocaleString("es-PA") + " notas · " +
      collection.watched.length.toLocaleString("es-PA") + " vistas · " +
      collection.watchlist.length.toLocaleString("es-PA") + " pendientes";
    state.events.unshift({ title:"Colección importada", description:importDescription, symbol:"⇧", at:new Date().toISOString() });
    state.events = state.events.slice(0, 80);
    state.updatedAt = new Date().toISOString();
    await persistState();
    await dbSet(CATALOG_KEY, customCatalog);
    combineMovies();
    renderApp();
    const skippedText = result.skippedRatings ? " · " + result.skippedRatings + " nota sin título" : "";
    toast("Importadas " + result.ratings.length + " notas, " + collection.watched.length + " vistas y " + collection.watchlist.length + " pendientes" + skippedText + ".");
    if (tmdbCredential && tmdbCredential.value) {
      window.setTimeout(function () { enrichRatedHistoryWithTMDB(); }, 250);
    } else {
      toast("Conecta TMDB en Ajustes para recuperar las carátulas y las sinopsis.");
    }
  }


   async function importCatalogCSV(file) {
    const parsed = parseCatalogCSV(await file.text());
    const map = new Map(customCatalog.map(function (movie) { return [movieIdentityKey(movie), movie]; }));
    parsed.forEach(function (movie) {
      const key = movieIdentityKey(movie);
      const old = map.get(key);
      map.set(key, old ? {
        id: old.id || movie.id,
        tmdbId: movieTmdbId(old) || movieTmdbId(movie) || null,
        title: old.title,
        year: old.year || movie.year,
        genres: uniqueStrings((old.genres || []).concat(movie.genres || [])),
        tags: uniqueStrings((old.tags || []).concat(movie.tags || [])),
        overview: old.overview || movie.overview,
        source: "csv"
      } : movie);
    });
    customCatalog = Array.from(map.values());
    await dbSet(CATALOG_KEY, customCatalog);
    logEvent("Catálogo ampliado", parsed.length.toLocaleString("es-PA") + " títulos leídos de " + file.name, "▦");
    combineMovies();
    renderApp();
    toast("Catálogo ampliado: " + parsed.length.toLocaleString("es-PA") + " títulos importados. Se guardan solo en tu navegador.");
  }

   async function exportBackup() {
    const backup = {
      format: "prisma-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      state: state,
      catalogCustom: customCatalog
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "prisma-copia-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast("Copia de seguridad preparada.");
  }

  async function restoreBackup(file) {
    const parsed = JSON.parse(await file.text());
    if (!parsed || parsed.format !== "prisma-backup" || !parsed.state) throw new Error("Ese archivo no parece una copia de seguridad de Prisma.");
    state = ensureState(parsed.state);
    customCatalog = Array.isArray(parsed.catalogCustom) ? parsed.catalogCustom.map(normalizeMovie).filter(Boolean) : [];
    await dbSet(STATE_KEY, state);
    await dbSet(CATALOG_KEY, customCatalog);
    combineMovies();
    renderApp();
    toast("Copia restaurada correctamente.");
  }

  async function resetAll() {
    if (!window.confirm("¿Borrar tus valoraciones, historial, pendientes, películas ocultas y emociones guardadas en este navegador? Esta acción no se puede deshacer sin una copia de seguridad.")) return;
    state = emptyState();
    customCatalog = [];
    await dbSet(STATE_KEY, state);
    await dbSet(CATALOG_KEY, customCatalog);
    combineMovies();
    renderApp();
    toast("Perfil local restablecido. El catálogo de muestra permanece disponible.");
  }

  function clickNav(page) {
    if (["home","catalog","library","lab","data"].indexOf(page) < 0) return;
    if (page !== currentPage) {
      modalDraft = null; movieDetail = null; personDetail = null; utilitySheet = null; ratingReturnDetail = false;
      const modalRoot = $("#modalRoot");
      if (modalRoot) modalRoot.innerHTML = "";
    }
    currentPage = page;
    renderApp();
    if (page === "catalog" && tmdbCredential && tmdbCredential.value) {
      loadTMDBPage(1,catalogQuery.trim().length >= 2 ? "search" : "popular",false);
    }
    window.scrollTo({top:0,behavior:"smooth"});
  }

  const posterRefreshRequested = new Set();
  document.addEventListener("error",function (event) {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const host = image.parentElement;
    const failedId = image.dataset.tmdbId || "";
    if (image.classList.contains("poster-image") || image.classList.contains("recent-poster-image")) {
      image.remove();
      if (failedId && !posterRefreshRequested.has(failedId)) {
        posterRefreshRequested.add(failedId);
        const invalidate = function (list) {
          return (list || []).map(function (entry) {
            if (movieTmdbId(entry) !== failedId) return entry;
            return Object.assign({},entry,{posterUrl:"",posterPath:"",tmdbFetchedAt:null,metadataSource:null});
          });
        };
        state.rated = invalidate(state.rated);
        state.watched = invalidate(state.watched);
        state.watchlist = invalidate(state.watchlist);
        state.hidden = invalidate(state.hidden);
        customCatalog = invalidate(customCatalog);
        const catalogEntry = catalog.find(function (entry) { return movieTmdbId(entry) === failedId; });
        if (catalogEntry) Object.assign(catalogEntry,{posterUrl:"",posterPath:"",tmdbFetchedAt:null,metadataSource:null});
        persistState();
        dbSet(CATALOG_KEY,customCatalog).catch(function () {});
        if (tmdbCredential && tmdbCredential.value) {
          if (tmdbHistorySync.running) tmdbEnrichRequested = true;
          else window.setTimeout(function () { enrichRatedHistoryWithTMDB(); },300);
        }
      }
      return;
    }
    if (!host || !host.matches(".collection-row-poster,.compact-poster,.cast-photo,.person-film-poster,.similar-poster,.saga-art,.provider-chip")) return;
    image.remove();
    if (host.querySelector(".poster-fallback,.image-fallback")) return;
    const fallback = document.createElement("span");
    fallback.className = host.matches(".provider-chip") ? "image-fallback" : "poster-fallback";
    fallback.textContent = "▣";
    host.appendChild(fallback);
  },true);

  document.addEventListener("click",async function (event) {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      event.preventDefault();
      clickNav(nav.dataset.nav);
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    try {
      if (action === "import-json") { $("#jsonImportInput").click(); return; }
      if (action === "import-catalog") { $("#catalogImportInput").click(); return; }
      if (action === "save-tmdb") { await saveTMDBCredential(); return; }
      if (action === "test-tmdb") { await testTMDBCredential(); return; }
      if (action === "remove-tmdb") { await removeTMDBCredential(); return; }
      if (action === "tmdb-retry") { await loadTMDBPage(1,catalogQuery.trim().length >= 2 ? "search" : "popular",false); return; }
      if (action === "tmdb-more") { await loadTMDBPage(tmdbPage + 1,tmdbMode,true); return; }
      if (action === "enrich-history") { await enrichRatedHistoryWithTMDB(); return; }
      if (action === "export-backup") { await exportBackup(); return; }
      if (action === "restore-backup") { $("#backupImportInput").click(); return; }
      if (action === "reset") { await resetAll(); return; }
      if (action === "show-info") { openInfoSheet(button.dataset.info || "collection"); return; }
      if (action === "genre") { activeGenre = button.dataset.genre || "Todos"; renderApp(); return; }
      if (action === "details") {
        const requestedId = button.dataset.tmdbId || "";
        let movie = (requestedId ? tmdbResults.find(function (item) { return movieTmdbId(item) === requestedId; }) : null) ||
          findMovie(button.dataset.title,requestedId) ||
          getCollectionItems("history").concat(getCollectionItems("pending"),getCollectionItems("hidden")).find(function (item) {
            return requestedId ? movieTmdbId(item) === requestedId : titleKey(item.title) === titleKey(button.dataset.title);
          });
        if (movie && requestedId && !movie.tmdbId) movie = Object.assign({},movie,{tmdbId:requestedId,source:"tmdb"});
        if (!movie && button.dataset.title) movie = {title:button.dataset.title,id:requestedId || titleKey(button.dataset.title),tmdbId:requestedId || null,source:requestedId ? "tmdb" : "catalog"};
        if (movie) openModal(movie,"details");
        return;
      }
      if (action === "rate") {
        const inDetail = Boolean(button.closest(".detail-sheet"));
        const requestedId = button.dataset.tmdbId || (movieDetail && movieDetail.movie.tmdbId) || "";
        const movie = (movieDetail && inDetail ? movieDetail.movie : null) ||
          (requestedId ? tmdbResults.find(function (item) { return movieTmdbId(item) === requestedId; }) : null) ||
          findMovie(button.dataset.title || (movieDetail && movieDetail.movie.title),requestedId) || (movieDetail && movieDetail.movie);
        if (movie) openModal(movie,"rate");
        return;
      }
      if (action === "rating-star") { updateRatingPreview(button.dataset.rating); return; }
      if (action === "save-rating") { await saveRating(); return; }
      if (action === "delete-rating") { await deleteRating(button.dataset.title,button.dataset.tmdbId); return; }
      if (action === "emotion") {
        if (!modalDraft) return;
        const emotion = button.dataset.emotion, index = modalDraft.emotions.indexOf(emotion);
        if (index >= 0) modalDraft.emotions.splice(index,1); else modalDraft.emotions.push(emotion);
        renderModal();
        return;
      }
      if (action === "close-modal") { closeModal(); return; }
      if (action === "backdrop-close" && event.target === button) {
        if (utilitySheet) { utilitySheet = null; renderModal(); }
        else closeModal();
        return;
      }
      if (action === "retry-movie-detail") { if (movieDetail) { movieDetailCache.delete(String(movieDetail.movie.tmdbId || "")); loadMovieDetail(movieDetail.movie); } return; }
      if (action === "toggle-watchlist") { if (button.dataset.title) await toggleWatchlist(button.dataset.title,button.dataset.tmdbId); return; }
      if (action === "manage-pending") {
        const title = movieDetail ? movieDetail.movie.title : (modalDraft && modalDraft.movie.title);
        if (title) await toggleWatchlist(title,movieDetail && movieDetail.movie.tmdbId);
        if (utilitySheet) { utilitySheet = null; renderModal(); }
        return;
      }
      if (action === "mark-watched" || action === "manage-history") {
        const title = movieDetail ? movieDetail.movie.title : (modalDraft && modalDraft.movie.title);
        if (title) await markWatched(title,movieDetail && movieDetail.movie.tmdbId);
        if (utilitySheet) { utilitySheet = null; renderModal(); }
        return;
      }
      if (action === "toggle-hidden" || action === "manage-hidden") {
        const title = movieDetail ? movieDetail.movie.title : (modalDraft && modalDraft.movie.title);
        if (title) await toggleHidden(title,movieDetail && movieDetail.movie.tmdbId);
        if (utilitySheet) { utilitySheet = null; renderModal(); }
        return;
      }
      if (action === "manage-lists") { openUtilitySheet("manage"); return; }
      if (action === "open-sort") { openUtilitySheet("sort"); return; }
      if (action === "open-genres") { openUtilitySheet("genres"); return; }
      if (action === "choose-sort") {
        if (!utilitySheet) return;
        utilitySheet.sort = button.dataset.sort || "added";
        utilitySheet.direction = utilitySheet.sort === "title" ? "asc" : "desc";
        renderModal();
        return;
      }
      if (action === "toggle-sort-direction") { if (utilitySheet) { utilitySheet.direction = utilitySheet.direction === "asc" ? "desc" : "asc"; renderModal(); } return; }
      if (action === "accept-sort") {
        if (utilitySheet) { collectionSort = utilitySheet.sort; collectionDirection = utilitySheet.direction; }
        utilitySheet = null; renderApp(); renderModal(); return;
      }
      if (action === "toggle-sheet-genre") {
        if (!utilitySheet) return;
        const genre = button.dataset.genre || "";
        const index = utilitySheet.genres.findIndex(function (value) { return titleKey(value) === titleKey(genre); });
        if (index >= 0) utilitySheet.genres.splice(index,1); else utilitySheet.genres.push(genre);
        renderModal(); return;
      }
      if (action === "clear-sheet-genres") { if (utilitySheet) utilitySheet.genres = []; renderModal(); return; }
      if (action === "accept-genres") {
        if (utilitySheet) collectionGenres = utilitySheet.genres.slice();
        utilitySheet = null; renderApp(); renderModal(); return;
      }
      if (action === "toggle-layout") { collectionLayout = collectionLayout === "list" ? "compact" : "list"; renderApp(); return; }
      if (action === "toggle-released") { onlyReleased = !onlyReleased; renderApp(); return; }
      if (action === "toggle-collection-search") {
        showCollectionSearch = !showCollectionSearch;
        if (!showCollectionSearch) collectionQuery = "";
        renderApp();
        const search = $("[data-collection-search]");
        if (search) search.focus();
        return;
      }
      if (action === "collection-tab") { collectionTab = button.dataset.tab || "history"; collectionMode = "movies"; renderApp(); return; }
      if (action === "collection-mode") { collectionMode = button.dataset.mode || "movies"; renderApp(); return; }
      if (action === "collection-open-tab") { collectionTab = button.dataset.tab || "history"; collectionMode = "movies"; renderApp(); return; }
      if (action === "person-details") { openPersonDetails(button.dataset.personId,button.dataset.personName,button.dataset.character); return; }
      if (action === "person-back") { personDetail = null; renderModal(); return; }
      if (action === "person-filter") { personListFilter = button.dataset.filter || "all"; renderPersonDetails(); return; }
      if (action === "movie-from-person") {
        const title = button.dataset.title;
        const movie = findMovie(title,button.dataset.tmdbId) || {title:title,id:button.dataset.tmdbId || titleKey(title),tmdbId:button.dataset.tmdbId || null,source:"tmdb"};
        personDetail = null; openModal(movie,"details"); return;
      }
      if (action === "open-trailer") {
        const videos = movieDetail && movieDetail.data ? movieDetail.data.videos : [];
        const trailer = (videos || []).find(function (video) { return video.site === "YouTube" && video.type === "Trailer"; }) ||
          (videos || []).find(function (video) { return video.site === "YouTube"; });
        const url = trailer ? "https://www.youtube.com/watch?v=" + encodeURIComponent(trailer.key) :
          (movieDetail && movieDetail.movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movieDetail.movie.tmdbId) + "/videos" : "");
        if (url) window.open(url,"_blank","noopener,noreferrer"); else toast("No hay enlace de tráiler disponible. Conecta TMDB para consultar los vídeos.",true);
        return;
      }
      if (action === "open-reviews") {
        if (movieDetail && movieDetail.movie.tmdbId) window.open("https://www.themoviedb.org/movie/" + encodeURIComponent(movieDetail.movie.tmdbId) + "/reviews","_blank","noopener,noreferrer");
        else toast("Conecta TMDB para abrir los comentarios públicos de esta película.",true);
        return;
      }
      if (action === "share-movie") {
        const movie = movieDetail && movieDetail.movie;
        if (!movie) return;
        const url = movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movie.tmdbId) : window.location.href;
        const payload = {title:movie.title,text:"Mira " + movie.title + " en Prisma",url:url};
        if (navigator.share) await navigator.share(payload);
        else if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(url); toast("Enlace copiado."); }
        else window.prompt("Copia el enlace de la película",url);
        return;
      }
      if (action === "close-sheet") { utilitySheet = null; renderModal(); return; }
    } catch (error) {
      toast(error && error.message ? error.message : "No se pudo completar la acción.",true);
    }
  });

  document.addEventListener("input",function (event) {
    if (event.target.matches("[data-global-search]")) {
      catalogQuery = event.target.value;
      activeGenre = "Todos";
      if (currentPage !== "catalog") { currentPage = "catalog"; renderApp(); }
      else {
        renderCatalogResults();
        const caption = $("#catalogSearchTitle");
        if (caption) caption.textContent = catalogQuery.trim() ? "Resultados para «" + catalogQuery.trim() + "»" : "Catálogo local";
      }
      if (tmdbSearchTimer) window.clearTimeout(tmdbSearchTimer);
      tmdbSearchTimer = window.setTimeout(function () {
        if (currentPage === "catalog" && tmdbCredential && tmdbCredential.value) {
          loadTMDBPage(1,catalogQuery.trim().length >= 2 ? "search" : "popular",false);
        }
      },450);
      return;
    }
    if (event.target.matches("[data-catalog-search]")) {
      catalogQuery = event.target.value;
      renderCatalogResults();
      if (tmdbSearchTimer) window.clearTimeout(tmdbSearchTimer);
      tmdbSearchTimer = window.setTimeout(function () {
        if (currentPage === "catalog" && tmdbCredential && tmdbCredential.value) {
          loadTMDBPage(1,catalogQuery.trim().length >= 2 ? "search" : "popular",false);
        }
      },450);
      return;
    }
    if (event.target.matches("[data-collection-search]")) {
      collectionQuery = event.target.value;
      refreshCollectionContent();
    }
  });


  $("#jsonImportInput").addEventListener("change", async function (event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try { await importPersonalJSON(file); }
    catch (error) { toast(error.message || "No pude leer ese JSON.", true); }
  });
  $("#catalogImportInput").addEventListener("change", async function (event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try { await importCatalogCSV(file); }
    catch (error) { toast(error.message || "No pude leer ese CSV.", true); }
  });
  $("#backupImportInput").addEventListener("change", async function (event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try { await restoreBackup(file); }
    catch (error) { toast(error.message || "No pude restaurar la copia.", true); }
  });

  async function init() {
    try {
      const results = await Promise.all([
        fetch("./data/catalog.json").then(function (response) {
          if (!response.ok) throw new Error("No se pudo cargar el catálogo de muestra.");
          return response.json();
        }),
        dbGet(STATE_KEY),
        dbGet(CATALOG_KEY),
        dbGet(TMDB_CREDENTIAL_KEY)
      ]);
      seedCatalog = Array.isArray(results[0]) ? results[0].map(normalizeMovie).filter(Boolean) : [];
      state = ensureState(results[1]);
      customCatalog = Array.isArray(results[2]) ? results[2].map(normalizeMovie).filter(Boolean) : [];
      tmdbCredential = results[3] && results[3].value ? results[3] : null;
      pruneTMDBCache();
      combineMovies();
      renderApp();
      if (tmdbCredential && tmdbCredential.value) window.setTimeout(function () { enrichRatedHistoryWithTMDB(); },350);
      if ("serviceWorker" in navigator && window.isSecureContext) {
        navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(function () {
          // La app sigue funcionando si el navegador no permite service workers.
        });
      }
    } catch (error) {
      $("#appRoot").innerHTML = '<div class="empty-state"><div class="empty-icon">!</div><h2>No se pudo iniciar Prisma</h2><p>' + escapeHTML(error.message || "Error al cargar los archivos") + '</p><button type="button" class="btn btn-primary" onclick="location.reload()">Reintentar</button></div>';
    }
  }

  init();
}());
