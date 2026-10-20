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
import { createMovieActions } from "./js/app/movie-actions.js?v=core-20261020-1";
import { createImportExportActions } from "./js/import-export/actions.js?v=core-20261020-1";
import { registerAppEvents } from "./js/app/event-handlers.js?v=core-20261020-1";
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

  const movieActions = createMovieActions({
    get $() { return $; },
    get state() { return state; },
    get modalDraft() { return modalDraft; },
    set modalDraft(value) { modalDraft = value; },
    get movieDetail() { return movieDetail; },
    set movieDetail(value) { movieDetail = value; },
    get ratingReturnDetail() { return ratingReturnDetail; },
    set ratingReturnDetail(value) { ratingReturnDetail = value; },
    get sameMovieRecord() { return sameMovieRecord; },
    get uniqueStrings() { return uniqueStrings; },
    get logEvent() { return logEvent; },
    get persistState() { return persistState; },
    get combineMovies() { return combineMovies; },
    get renderApp() { return renderApp; },
    get renderMovieDetails() { return renderMovieDetails; },
    get toast() { return toast; },
    get titleKey() { return titleKey; },
    get movieTmdbId() { return movieTmdbId; },
    get findMovie() { return findMovie; },
    get isInWatchlist() { return isInWatchlist; },
    get isHidden() { return isHidden; },
    get ratingValue() { return ratingValue; }
  });
  const { saveRating, deleteRating, resolveMovieForAction, toggleWatchlist, markWatched, toggleHidden } = movieActions;

  const importExportActions = createImportExportActions({
    get state() { return state; },
    set state(value) { state = value; },
    get customCatalog() { return customCatalog; },
    set customCatalog(value) { customCatalog = value; },
    get tmdbCredential() { return tmdbCredential; },
    get STATE_KEY() { return STATE_KEY; },
    get CATALOG_KEY() { return CATALOG_KEY; },
    get dbSet() { return dbSet; },
    get persistState() { return persistState; },
    get combineMovies() { return combineMovies; },
    get renderApp() { return renderApp; },
    get toast() { return toast; },
    get extractPersonalRatings() { return extractPersonalRatings; },
    get extractPersonalCollections() { return extractPersonalCollections; },
    get hasImportedCollection() { return hasImportedCollection; },
    get movieIdentityKey() { return movieIdentityKey; },
    get mergeMovieEntries() { return mergeMovieEntries; },
    get mergeMovieListByTitle() { return mergeMovieListByTitle; },
    get normalizeMovie() { return normalizeMovie; },
    get ratingValue() { return ratingValue; },
    get parseCatalogCSV() { return parseCatalogCSV; },
    get movieTmdbId() { return movieTmdbId; },
    get uniqueStrings() { return uniqueStrings; },
    get logEvent() { return logEvent; },
    get enrichRatedHistoryWithTMDB() { return enrichRatedHistoryWithTMDB; },
    get ensureState() { return ensureState; },
    get emptyState() { return emptyState; }
  });
  const { importPersonalJSON, importCatalogCSV, exportBackup, restoreBackup, resetAll } = importExportActions;

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

  function updateRatingPreview(value) {
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

  registerAppEvents({
    get $() { return $; },
    get document() { return document; },
    get HTMLImageElement() { return HTMLImageElement; },
    get window() { return window; },
    get navigator() { return navigator; },
    get state() { return state; },
    get customCatalog() { return customCatalog; },
    set customCatalog(value) { customCatalog = value; },
    get catalog() { return catalog; },
    get CATALOG_KEY() { return CATALOG_KEY; },
    get tmdbCredential() { return tmdbCredential; },
    get tmdbHistorySync() { return tmdbHistorySync; },
    get tmdbEnrichRequested() { return tmdbEnrichRequested; },
    set tmdbEnrichRequested(value) { tmdbEnrichRequested = value; },
    get tmdbPage() { return tmdbPage; },
    get tmdbMode() { return tmdbMode; },
    get tmdbResults() { return tmdbResults; },
    get catalogQuery() { return catalogQuery; },
    set catalogQuery(value) { catalogQuery = value; },
    get currentPage() { return currentPage; },
    set currentPage(value) { currentPage = value; },
    get activeGenre() { return activeGenre; },
    set activeGenre(value) { activeGenre = value; },
    get utilitySheet() { return utilitySheet; },
    set utilitySheet(value) { utilitySheet = value; },
    get movieDetail() { return movieDetail; },
    get personDetail() { return personDetail; },
    set personDetail(value) { personDetail = value; },
    get personListFilter() { return personListFilter; },
    set personListFilter(value) { personListFilter = value; },
    get collectionSort() { return collectionSort; },
    set collectionSort(value) { collectionSort = value; },
    get collectionDirection() { return collectionDirection; },
    get collectionGenres() { return collectionGenres; },
    set collectionGenres(value) { collectionGenres = value; },
    get collectionLayout() { return collectionLayout; },
    set collectionLayout(value) { collectionLayout = value; },
    get onlyReleased() { return onlyReleased; },
    set onlyReleased(value) { onlyReleased = value; },
    get showCollectionSearch() { return showCollectionSearch; },
    set showCollectionSearch(value) { showCollectionSearch = value; },
    get collectionQuery() { return collectionQuery; },
    set collectionQuery(value) { collectionQuery = value; },
    get collectionTab() { return collectionTab; },
    set collectionTab(value) { collectionTab = value; },
    get collectionMode() { return collectionMode; },
    set collectionMode(value) { collectionMode = value; },
    get tmdbSearchTimer() { return tmdbSearchTimer; },
    set tmdbSearchTimer(value) { tmdbSearchTimer = value; },
    get movieDetailCache() { return movieDetailCache; },
    get movieTmdbId() { return movieTmdbId; },
    get persistState() { return persistState; },
    get dbSet() { return dbSet; },
    get enrichRatedHistoryWithTMDB() { return enrichRatedHistoryWithTMDB; },
    get clickNav() { return clickNav; },
    get saveTMDBCredential() { return saveTMDBCredential; },
    get testTMDBCredential() { return testTMDBCredential; },
    get removeTMDBCredential() { return removeTMDBCredential; },
    get loadTMDBPage() { return loadTMDBPage; },
    get exportBackup() { return exportBackup; },
    get restoreBackup() { return restoreBackup; },
    get resetAll() { return resetAll; },
    get openInfoSheet() { return openInfoSheet; },
    get renderApp() { return renderApp; },
    get findMovie() { return findMovie; },
    get getCollectionItems() { return getCollectionItems; },
    get titleKey() { return titleKey; },
    get openModal() { return openModal; },
    get renderModal() { return renderModal; },
    get updateRatingPreview() { return updateRatingPreview; },
    get saveRating() { return saveRating; },
    get deleteRating() { return deleteRating; },
    get closeModal() { return closeModal; },
    get loadMovieDetail() { return loadMovieDetail; },
    get isInWatchlist() { return isInWatchlist; },
    get toggleWatchlist() { return toggleWatchlist; },
    get markWatched() { return markWatched; },
    get toggleHidden() { return toggleHidden; },
    get isHidden() { return isHidden; },
    get isInHistory() { return isInHistory; },
    get openUtilitySheet() { return openUtilitySheet; },
    get renderPersonDetails() { return renderPersonDetails; },
    get openPersonDetails() { return openPersonDetails; },
    get refreshCollectionContent() { return refreshCollectionContent; },
    get renderCatalogResults() { return renderCatalogResults; },
    get importPersonalJSON() { return importPersonalJSON; },
    get importCatalogCSV() { return importCatalogCSV; },
    get toast() { return toast; }
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
