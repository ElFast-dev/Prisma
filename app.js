import { escapeHTML, titleKey, movieTmdbId, movieIdentityKey, sameMovieRecord, sameDiscoveryMovie, uniqueDiscoveryMovies, splitList, displayGenre, normalizeMovie, uniqueStrings, ratingValue } from "./js/core/movie-utils.js";
import { dbGet, dbSet } from "./js/core/storage.js?v=core-20261020-1";
import { createStorageProtection } from "./js/core/storage-protection.js";
import { emptyState, ensureState } from "./js/core/state-model.js?v=core-20261022-2";
import { movieFeatures } from "./js/recommendations/features.js?v=rec-20261022-1";
import { createRecommendationEngine, RECOMMENDATION_SIGNAL_WEIGHTS } from "./js/recommendations/engine.js?v=rec-20261022-2";
import { createRidgeRecommendationExperiment } from "./js/recommendations/ridge-evaluation.js?v=rec-20261023-1";
import { createRecommendationNormalizationEvaluation } from "./js/recommendations/normalization-evaluation.js?v=rec-20261022-2";
import { buildRecommendationDiagnosticReport } from "./js/diagnostics/recommendation-report.js?v=core-20261022-2";
import { createRecommendationEvaluation } from "./js/recommendations/evaluation.js?v=rec-20261022-2";
import { createRecommendationPreferences } from "./js/recommendations/preferences.js?v=core-20261021-1";
import { parseCSVLine, parseCatalogCSV } from "./js/catalog/csv-parser.js";
import { createCatalogModel } from "./js/catalog/catalog-model.js?v=core-20261022-4";
import { createCollectionModel } from "./js/collection/collection-model.js?v=core-20261022-4";
import { createPresentationUtils } from "./js/ui/presentation-utils.js?v=core-20261022-4";
import { createPageViews } from "./js/ui/page-views.js?v=core-20261023-7";
import { createModalViews } from "./js/ui/modal-views.js?v=ui-20261023-1";
import { createMovieActions } from "./js/app/movie-actions.js?v=core-20261022-5";
import { createImportExportActions } from "./js/import-export/actions.js?v=core-20261022-4";
import { registerAppEvents } from "./js/app/event-handlers.js?v=core-20261022-8";
import { createTMDBSettingsActions } from "./js/tmdb/settings-actions.js?v=core-20261020-3";
import { createTMDBViews } from "./js/ui/tmdb-views.js?v=core-20261020-1";
import { createTMDBHistorySync } from "./js/tmdb/history-sync.js?v=core-20261022-3";
import { createTMDBBrowserActions } from "./js/tmdb/browser-actions.js?v=core-20261022-3";
import { createTMDBMovieDetails } from "./js/tmdb/movie-details.js?v=core-20261022-3";
import { createModalController } from "./js/ui/modal-controller.js?v=core-20261022-6";
import { createRecommendationRanking } from "./js/recommendations/ranking.js?v=core-20261022-1";
import { createAppRuntime } from "./js/app/runtime.js?v=core-20261020-1";
import { createAppLifecycle } from "./js/app/lifecycle.js?v=core-20261021-2";
import { movieMetadataFromJSON, extractPersonalCollections, hasImportedCollection, mergeMovieEntries, mergeMovieListByTitle, extractPersonalRatings } from "./js/import-export/personal-data.js?v=core-20261022-8";
import { createTMDBClient, normalizeCredential } from "./js/tmdb/client.js?v=core-20261022-3";
import { createThemeController } from "./js/ui/theme-controller.js?v=theme-20261020-1";

(function () {
  "use strict";

  const $ = function (selector, root) { return (root || document).querySelector(selector); };
  const $$ = function (selector, root) { return Array.from((root || document).querySelectorAll(selector)); };
  const themeController = createThemeController({ document: document, window: window });
  themeController.initialize();
  const STATE_KEY = "state";
  const CATALOG_KEY = "catalogCustom";
  const TMDB_CREDENTIAL_KEY = "tmdbCredential";
  const TMDB_LOGO_URL = "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg";
 

  let customCatalog = [];
  let catalog = [];
  let catalogByTitle = new Map();
  let state = emptyState();
  const storageProtection = createStorageProtection(typeof navigator !== "undefined" ? navigator.storage : null);
  let storageProtectionSnapshot = { supported: null, statusSupported: null, persisted: null, usage: null, quota: null };
  let storageProtectionBusy = false;
  let recommendationDiagnosticReportText = "";
  let recommendationDiagnosticCopyMessage = "";
  let recommendationDiagnosticFeatureLabelsIncluded = false;
  let ridgeEvaluationResult = null;
  let ridgeEvaluationBusy = false;
  let ridgeEvaluationProgress = null;
  let ridgeEvaluationRunId = 0;
  let temporalRidgeEvaluationResult = null;
  let temporalRidgeEvaluationBusy = false;
  let temporalRidgeEvaluationProgress = null;
  let temporalRidgeEvaluationRunId = 0;
  let temporalUseCollectionAddedAtProxy = false;
  let influenceNormalizationEvaluationResult = null;
  let influenceNormalizationEvaluationBusy = false;
  let influenceNormalizationEvaluationRunId = 0;
  const recommendationPreferences = createRecommendationPreferences(function () { return window.localStorage; });
  let recommendationMode = recommendationPreferences.getMode();
  let currentPage = "home";
  let catalogQuery = "";
  let activeGenre = "Todos";
  let modalDraft = null;
  let tmdbCredential = null;
  let tmdbResults = [];
  let tmdbRecommendationCandidates = [];
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
    get theme() { return themeController.getTheme(); },
    get $$() { return $$; },
    get cardColor() { return cardColor; },
    get state() { return state; },
    get catalog() { return catalog; },
    get currentPage() { return currentPage; },
    get recommendationMode() { return recommendationMode; },
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
    get storageProtectionSnapshot() { return storageProtectionSnapshot; },
    get storageProtectionBusy() { return storageProtectionBusy; },
    get recommendationDiagnosticReportText() { return recommendationDiagnosticReportText; },
    get recommendationDiagnosticCopyMessage() { return recommendationDiagnosticCopyMessage; },
    get recommendationDiagnosticFeatureLabelsIncluded() { return recommendationDiagnosticFeatureLabelsIncluded; },
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
    get evaluateModel() { return evaluateModel; },
    get evaluateRecommendationQuality() { return evaluateRecommendationQuality; },
    get ridgeEvaluationResult() { return ridgeEvaluationResult; },
    get ridgeEvaluationBusy() { return ridgeEvaluationBusy; },
    get ridgeEvaluationProgress() { return ridgeEvaluationProgress; },
    get runRidgeExperiment() { return runRidgeExperiment; },
    get temporalRidgeEvaluationResult() { return temporalRidgeEvaluationResult; },
    get temporalRidgeEvaluationBusy() { return temporalRidgeEvaluationBusy; },
    get temporalRidgeEvaluationProgress() { return temporalRidgeEvaluationProgress; },
    get temporalUseCollectionAddedAtProxy() { return temporalUseCollectionAddedAtProxy; },
    get runTemporalRidgeExperiment() { return runTemporalRidgeExperiment; },
    get toggleTemporalAddedAtProxy() { return toggleTemporalAddedAtProxy; },
    get influenceNormalizationEvaluationResult() { return influenceNormalizationEvaluationResult; },
    get influenceNormalizationEvaluationBusy() { return influenceNormalizationEvaluationBusy; },
    get runInfluenceNormalizationExperiment() { return runInfluenceNormalizationExperiment; }
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

  const tmdbSettingsActions = createTMDBSettingsActions({
    get $() { return $; },
    get tmdbCredential() { return tmdbCredential; },
    set tmdbCredential(value) { tmdbCredential = value; },
    get normalizeCredential() { return normalizeCredential; },
    get dbSet() { return dbSet; },
    get TMDB_CREDENTIAL_KEY() { return TMDB_CREDENTIAL_KEY; },
    get renderApp() { return renderApp; },
    get toast() { return toast; },
    get tmdbRequest() { return tmdbRequest; },
    get currentPage() { return currentPage; },
    get catalogQuery() { return catalogQuery; },
    get loadTMDBPage() { return loadTMDBPage; },
    get enrichTMDBMovie() { return enrichTMDBMovie; },
    get tmdbResults() { return tmdbResults; },
    set tmdbResults(value) { tmdbResults = value; },
    get recommendationCandidates() { return tmdbRecommendationCandidates; },
    set recommendationCandidates(value) { tmdbRecommendationCandidates = Array.isArray(value) ? value : []; },
    get resetTMDBGenres() { return tmdbClient.resetGenres; },
    get confirm() { return window.confirm.bind(window); }
  });
  const { saveTMDBCredential, testTMDBCredential, removeTMDBCredential } = tmdbSettingsActions;

  const tmdbHistorySyncModule = createTMDBHistorySync({
    get state() { return state; },
    get customCatalog() { return customCatalog; },
    set customCatalog(value) { customCatalog = value; },
    get catalog() { return catalog; },
    get tmdbCredential() { return tmdbCredential; },
    get dbSet() { return dbSet; },
    get CATALOG_KEY() { return CATALOG_KEY; },
    get persistState() { return persistState; },
    get tmdbRequest() { return tmdbRequest; },
    get titleKey() { return titleKey; },
    get uniqueStrings() { return uniqueStrings; },
    get movieTmdbId() { return movieTmdbId; },
    get sameMovieRecord() { return sameMovieRecord; },
    get tmdbHistorySync() { return tmdbHistorySync; },
    set tmdbHistorySync(value) { tmdbHistorySync = value; },
    get tmdbEnrichRequested() { return tmdbEnrichRequested; },
    set tmdbEnrichRequested(value) { tmdbEnrichRequested = value; },
    get fromTMDB() { return fromTMDB; },
    get renderApp() { return renderApp; },
    get toast() { return toast; },
    get clickNav() { return clickNav; },
    get currentPage() { return currentPage; },
    get refreshCollectionContent() { return refreshCollectionContent; },
    get combineMovies() { return combineMovies; },
    get window() { return window; }
  });
  const { pruneTMDBCache, historyNeedsTMDB, historyTMDBId, pendingHistoryTMDBCount, findTMDBDetailsForRating, applyTMDBDetailsToRating, applyTMDBDetailsToLocalCollection, upsertTMDBCatalogEntry, enrichRatedHistoryWithTMDB } = tmdbHistorySyncModule;

  const tmdbBrowserActions = createTMDBBrowserActions({
    get tmdbCredential() { return tmdbCredential; },
    get catalogQuery() { return catalogQuery; },
    get tmdbRequestSerial() { return tmdbRequestSerial; },
    set tmdbRequestSerial(value) { tmdbRequestSerial = value; },
    get tmdbMode() { return tmdbMode; },
    set tmdbMode(value) { tmdbMode = value; },
    get tmdbLoading() { return tmdbLoading; },
    set tmdbLoading(value) { tmdbLoading = value; },
    get tmdbError() { return tmdbError; },
    set tmdbError(value) { tmdbError = value; },
    get tmdbResults() { return tmdbResults; },
    set tmdbResults(value) { tmdbResults = value; },
    get recommendationCandidates() { return tmdbRecommendationCandidates; },
    set recommendationCandidates(value) { tmdbRecommendationCandidates = Array.isArray(value) ? value : []; },
    get uniqueDiscoveryMovies() { return uniqueDiscoveryMovies; },
    get currentPage() { return currentPage; },
    get renderApp() { return renderApp; },
    get catalog() { return catalog; },
    get sameMovieRecord() { return sameMovieRecord; },
    get tmdbPage() { return tmdbPage; },
    set tmdbPage(value) { tmdbPage = value; },
    get tmdbTotalPages() { return tmdbTotalPages; },
    set tmdbTotalPages(value) { tmdbTotalPages = value; },
    get renderTMDBResults() { return renderTMDBResults; },
    get ensureTMDBGenres() { return ensureTMDBGenres; },
    get tmdbRequest() { return tmdbRequest; },
    get fromTMDB() { return fromTMDB; },
    get modalDraft() { return modalDraft; },
    get titleKey() { return titleKey; },
    get renderModal() { return renderModal; }
  });
  const { loadTMDBPage, enrichTMDBMovie } = tmdbBrowserActions;

  const tmdbMovieDetails = createTMDBMovieDetails({
    get tmdbRequest() { return tmdbRequest; },
    get tmdbCredential() { return tmdbCredential; },
    get movieDetail() { return movieDetail; },
    get sameMovieRecord() { return sameMovieRecord; },
    get movieDetailCache() { return movieDetailCache; },
    get renderModal() { return renderModal; },
    get titleKey() { return titleKey; },
    get fromTMDB() { return fromTMDB; },
    get state() { return state; },
    get uniqueStrings() { return uniqueStrings; },
    get movieTmdbId() { return movieTmdbId; },
    get customCatalog() { return customCatalog; },
    get dbSet() { return dbSet; },
    get CATALOG_KEY() { return CATALOG_KEY; },
    get persistState() { return persistState; },
    get combineMovies() { return combineMovies; },
    get personDetail() { return personDetail; },
    set personDetail(value) { personDetail = value; },
    get personListFilter() { return personListFilter; },
    set personListFilter(value) { personListFilter = value; },
    get personDetailCache() { return personDetailCache; }
  });
  const { softTMDBRequest, loadMovieDetail, persistMovieMetadata, openPersonDetails } = tmdbMovieDetails;

  const modalController = createModalController({
    get $() { return $; },
    get $$() { return $$; },
    get ratingFor() { return ratingFor; },
    get ratingValue() { return ratingValue; },
    get ratingReturnDetail() { return ratingReturnDetail; },
    set ratingReturnDetail(value) { ratingReturnDetail = value; },
    get movieDetail() { return movieDetail; },
    set movieDetail(value) { movieDetail = value; },
    get modalDraft() { return modalDraft; },
    set modalDraft(value) { modalDraft = value; },
    get personDetail() { return personDetail; },
    set personDetail(value) { personDetail = value; },
    get utilitySheet() { return utilitySheet; },
    set utilitySheet(value) { utilitySheet = value; },
    get tmdbCredential() { return tmdbCredential; },
    get loadMovieDetail() { return loadMovieDetail; },
    get collectionSort() { return collectionSort; },
    get collectionDirection() { return collectionDirection; },
    get collectionGenres() { return collectionGenres; },
    get renderUtilitySheet() { return renderUtilitySheet; },
    get renderPersonDetails() { return renderPersonDetails; },
    get renderRatingSheet() { return renderRatingSheet; },
    get renderMovieDetails() { return renderMovieDetails; }
  });
  const { openModal, renderModal, openUtilitySheet, openInfoSheet, updateRatingPreview, closeModal } = modalController;

  const appRuntime = createAppRuntime({
    get state() { return state; },
    get dbSet() { return dbSet; },
    get STATE_KEY() { return STATE_KEY; },
    get $() { return $; },
    get document() { return document; },
    get window() { return window; },
    get toast() { return toast; }
  });
  const { logEvent, persistState: persistStateToStorage, toast } = appRuntime;

  function persistState() {
    ridgeEvaluationRunId += 1;
    ridgeEvaluationResult = null;
    ridgeEvaluationBusy = false;
    ridgeEvaluationProgress = null;
    temporalRidgeEvaluationRunId += 1;
    temporalRidgeEvaluationResult = null;
    temporalRidgeEvaluationBusy = false;
    temporalRidgeEvaluationProgress = null;
    influenceNormalizationEvaluationRunId += 1;
    influenceNormalizationEvaluationResult = null;
    influenceNormalizationEvaluationBusy = false;
    return persistStateToStorage();
  }

  const tmdbViews = createTMDBViews({
    get $() { return $; },
    get pendingHistoryTMDBCount() { return pendingHistoryTMDBCount; },
    get tmdbCredential() { return tmdbCredential; },
    get tmdbHistorySync() { return tmdbHistorySync; },
    get infoButton() { return infoButton; },
    get escapeHTML() { return escapeHTML; },
    get TMDB_LOGO_URL() { return TMDB_LOGO_URL; },
    get tmdbMode() { return tmdbMode; },
    get catalogQuery() { return catalogQuery; },
    get uniqueDiscoveryMovies() { return uniqueDiscoveryMovies; },
    get isInHistory() { return isInHistory; },
    get isHidden() { return isHidden; },
    get tmdbLoading() { return tmdbLoading; },
    get tmdbError() { return tmdbError; },
    get tmdbResults() { return tmdbResults; },
    get movieGrid() { return movieGrid; },
    get tmdbPage() { return tmdbPage; },
    get tmdbTotalPages() { return tmdbTotalPages; }
  });
  const { renderTMDBHistoryPanel, renderTMDBAttribution, renderTMDBResults } = tmdbViews;

     const { buildProfile, predictRating, evaluateModel } = createRecommendationEngine({
    getRatings: function () { return state.rated; },
    findMovie: findMovie,
    movieFeatures: movieFeatures,
    ratingValue: ratingValue
  });

  const recommendationRanking = createRecommendationRanking({
    get state() { return state; },
    get catalog() { return catalog; },
    get recommendationCandidates() { return tmdbRecommendationCandidates; },
    get buildProfile() { return buildProfile; },
    get predictRating() { return predictRating; },
    get uniqueDiscoveryMovies() { return uniqueDiscoveryMovies; },
    get isMovieInCollection() { return isMovieInCollection; },
    get findMovie() { return findMovie; },
    get ratingValue() { return ratingValue; }
  });
  const { getRecommendations, genreStats } = recommendationRanking;

  const ridgeRecommendationExperiment = createRidgeRecommendationExperiment({
    getRatings: function () { return state.rated; },
    getWatched: function () { return state.watched || []; },
    findMovie: findMovie,
    movieFeatures: movieFeatures,
    ratingValue: ratingValue,
    buildProfile: buildProfile,
    predictRating: predictRating,
    movieTmdbId: movieTmdbId,
    titleKey: titleKey,
    getUseCollectionAddedAtProxy: function () { return temporalUseCollectionAddedAtProxy; },
    rankCandidates: recommendationRanking.rankCandidates
  });

  const recommendationEvaluation = createRecommendationEvaluation({
    getRatings: function () { return state.rated; },
    findMovie: findMovie,
    movieFeatures: movieFeatures,
    ratingValue: ratingValue,
    buildProfile: buildProfile,
    predictRating: predictRating,
    getRecommendations: getRecommendations,
    rankCandidates: recommendationRanking.rankCandidates,
    movieTmdbId: movieTmdbId,
    titleKey: titleKey
  });
  const { evaluateRecommendationQuality } = recommendationEvaluation;

  const recommendationNormalizationEvaluation = createRecommendationNormalizationEvaluation({
    getRatings: function () { return state.rated; },
    findMovie: findMovie,
    movieFeatures: movieFeatures,
    ratingValue: ratingValue,
    buildProfile: buildProfile,
    predictRating: predictRating,
    rankCandidates: recommendationRanking.rankCandidates,
    movieTmdbId: movieTmdbId,
    titleKey: titleKey
  });

  async function runInfluenceNormalizationExperiment() {
    if (influenceNormalizationEvaluationBusy || ridgeEvaluationBusy || temporalRidgeEvaluationBusy) return;
    const runId = ++influenceNormalizationEvaluationRunId;
    influenceNormalizationEvaluationBusy = true;
    if (currentPage === "lab") renderApp();
    await new Promise(function (resolve) {
      if (window && typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(resolve);
      else window.setTimeout(resolve, 0);
    });
    try {
      const evaluationResult = recommendationNormalizationEvaluation.evaluate();
      if (runId !== influenceNormalizationEvaluationRunId) return;
      influenceNormalizationEvaluationResult = evaluationResult;
      toast(evaluationResult.available
        ? "Calibración de influencia terminada: tres variantes y los mismos pliegues comparados."
        : (evaluationResult.unavailableReason || "No se pudo evaluar la normalización de influencia."),
      !evaluationResult.available);
    } catch (_) {
      if (runId !== influenceNormalizationEvaluationRunId) return;
      influenceNormalizationEvaluationResult = {
        executionStatus: "unavailable",
        available: false,
        sampleCount: 0,
        methods: [],
        unavailableReason: "No se pudo completar el experimento de normalización de forma estable."
      };
      toast("No se pudo completar el experimento de normalización de forma estable.", true);
    } finally {
      if (runId === influenceNormalizationEvaluationRunId) {
        influenceNormalizationEvaluationBusy = false;
        if (currentPage === "lab") renderApp();
      }
    }
  }

  async function runRidgeExperiment() {
    if (ridgeEvaluationBusy || temporalRidgeEvaluationBusy) return;
    const runId = ++ridgeEvaluationRunId;
    ridgeEvaluationBusy = true;
    ridgeEvaluationProgress = { completedRepeats: 0, totalRepeats: 3, foldsPerRepeat: 5 };
    if (currentPage === "lab") renderApp();
    await new Promise(function (resolve) {
      if (window && typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(resolve);
      else window.setTimeout(resolve, 0);
    });
    try {
      const evaluationResult = await ridgeRecommendationExperiment.evaluateAsync(function (progress) {
        if (runId !== ridgeEvaluationRunId) return false;
        if (progress.phase !== "starting") {
          ridgeEvaluationProgress = progress;
          if (currentPage === "lab") renderApp();
        }
        return true;
      });
      if (runId !== ridgeEvaluationRunId) return;
      ridgeEvaluationResult = evaluationResult;
      toast(ridgeEvaluationResult.available
        ? "Validación Ridge terminada: se evaluaron 3 repeticiones de 5 pliegues. Revisa los agregados en el Laboratorio."
        : (ridgeEvaluationResult.reason || "No se pudo evaluar Ridge con esta muestra."), !ridgeEvaluationResult.available);
    } catch (_) {
      if (runId !== ridgeEvaluationRunId) return;
      ridgeEvaluationResult = { available: false, count: 0, mae: null, baselineMae: null,
        deltaBaseMinusRidge: null, outerFolds: 5, foldsEvaluated: 0, innerFolds: 3,
        selectedAlphaCounts: {}, repeatedValidation: { available: false, repeats: 3, foldsPerRepeat: 5,
          foldsEvaluated: 0, repeatSummaries: [], unavailableReason: "No se pudo completar la validación Ridge repetida." },
        reason: "No se pudo completar el experimento Ridge de forma estable." };
      toast("No se pudo completar el experimento Ridge de forma estable.", true);
    } finally {
      if (runId === ridgeEvaluationRunId) {
        ridgeEvaluationBusy = false;
        ridgeEvaluationProgress = null;
        if (currentPage === "lab") renderApp();
      }
    }
  }

  function toggleTemporalAddedAtProxy() {
    if (temporalRidgeEvaluationBusy || ridgeEvaluationBusy) return;
    temporalUseCollectionAddedAtProxy = !temporalUseCollectionAddedAtProxy;
    temporalRidgeEvaluationRunId += 1;
    temporalRidgeEvaluationResult = null;
    temporalRidgeEvaluationProgress = null;
    toast(temporalUseCollectionAddedAtProxy
      ? "Proxy exploratorio activado: la fecha de incorporación a la lista podrá usarse solo en la evaluación temporal."
      : "Proxy desactivado: la evaluación temporal usará solo las fechas watchedAt disponibles.");
    if (currentPage === "lab") renderApp();
  }

  async function runTemporalRidgeExperiment() {
    if (temporalRidgeEvaluationBusy || ridgeEvaluationBusy) return;
    const runId = ++temporalRidgeEvaluationRunId;
    temporalRidgeEvaluationBusy = true;
    temporalRidgeEvaluationProgress = { completedWindows: 0, totalWindows: 5 };
    if (currentPage === "lab") renderApp();
    await new Promise(function (resolve) {
      if (window && typeof window.requestAnimationFrame === "function") window.requestAnimationFrame(resolve);
      else window.setTimeout(resolve, 0);
    });
    try {
      const evaluationResult = await ridgeRecommendationExperiment.evaluateTemporalAsync(function (progress) {
        if (runId !== temporalRidgeEvaluationRunId) return false;
        if (progress.phase !== "starting") {
          temporalRidgeEvaluationProgress = progress;
          if (currentPage === "lab") renderApp();
        }
        return true;
      });
      if (runId !== temporalRidgeEvaluationRunId) return;
      temporalRidgeEvaluationResult = evaluationResult;
      toast(temporalRidgeEvaluationResult.available
        ? "Validación temporal terminada. Revisa las ventanas futuras en el Laboratorio."
        : (temporalRidgeEvaluationResult.unavailableReason || "No se pudo completar la evaluación temporal."),
      !temporalRidgeEvaluationResult.available);
    } catch (_) {
      if (runId !== temporalRidgeEvaluationRunId) return;
      temporalRidgeEvaluationResult = {
        available: false, sampleCount: 0, featureRowCount: 0, timestampedFeatureCount: 0,
        missingDateCount: 0, warmupCount: 0, testCount: 0, windowsPlanned: 5,
        windowsEvaluated: 0, innerWindows: 3, selectedAlphaCounts: {}, mae: null, baselineMae: null,
        deltaBaseMinusRidge: null, windowSummaries: [],
        unavailableReason: "No se pudo completar la evaluación temporal de forma estable."
      };
      toast("No se pudo completar la evaluación temporal de forma estable.", true);
    } finally {
      if (runId === temporalRidgeEvaluationRunId) {
        temporalRidgeEvaluationBusy = false;
        temporalRidgeEvaluationProgress = null;
        if (currentPage === "lab") renderApp();
      }
    }
  }

  function clearRecommendationDiagnosticReport() {
    recommendationDiagnosticReportText = "";
    recommendationDiagnosticCopyMessage = "";
    if (currentPage === "lab") renderApp();
  }

  async function copyRecommendationDiagnosticReport(includeFeatureLabels) {
    recommendationDiagnosticFeatureLabelsIncluded = Boolean(includeFeatureLabels);
    const profile = buildProfile();
    const report = buildRecommendationDiagnosticReport({
      ratedCount: state.rated.length,
      ratingValues: state.rated.map(ratingValue).filter(function (value) { return value != null; }),
      catalogCount: catalog.length,
      collectionCounts: {
        watched: (state.watched || []).length,
        pending: (state.watchlist || []).length,
        hidden: (state.hidden || []).length
      },
      profile: profile,
      signalWeights: RECOMMENDATION_SIGNAL_WEIGHTS,
      recommendationMode: recommendationMode,
      ratingEvaluation: evaluateModel(),
      ridgeEvaluation: ridgeEvaluationResult,
      temporalRidgeEvaluation: temporalRidgeEvaluationResult,
      influenceNormalizationEvaluation: influenceNormalizationEvaluationResult,
      recommendationQuality: evaluateRecommendationQuality(),
      includeFeatureLabels: recommendationDiagnosticFeatureLabelsIncluded
    });
    const reportText = JSON.stringify(report, null, 2);
    recommendationDiagnosticReportText = reportText;
    recommendationDiagnosticCopyMessage = "Informe generado localmente. Revisa su contenido antes de compartirlo; Prisma no lo envía a ningún servidor.";

    let copied = false;
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("El portapapeles no está disponible");
      }
      // Keep the clipboard write directly within the explicit click activation.
      const writePromise = navigator.clipboard.writeText(reportText);
      await writePromise;
      copied = true;
      recommendationDiagnosticCopyMessage = "Copiado al portapapeles. Revisa el contenido de abajo antes de pegarlo en otra conversación.";
    } catch (_) {
      recommendationDiagnosticCopyMessage = "No se pudo copiar automáticamente. El informe completo está visible abajo para seleccionarlo y copiarlo manualmente.";
    }

    if (currentPage === "lab") renderApp();
    if (copied) toast("Diagnóstico copiado. Revísalo antes de compartirlo.");
    else toast("Informe preparado para revisión y copia manual.");
  }

  async function refreshStorageProtectionSnapshot() {
    storageProtectionSnapshot = await storageProtection.inspect();
    if (currentPage === "data") renderApp();
    return storageProtectionSnapshot;
  }

  async function requestStorageProtection() {
    if (storageProtectionBusy) return;
    storageProtectionBusy = true;

    // Invoke persist() immediately from the explicit click, before rendering or awaiting.
    const requestPromise = storageProtection.request(storageProtectionSnapshot);
    if (currentPage === "data") renderApp();

    try {
      const result = await requestPromise;
      storageProtectionSnapshot = result;
      if (result.granted) {
        toast(result.reason === "already-persistent"
          ? "El almacenamiento ya tenía persistencia concedida por el navegador."
          : "El navegador concedió persistencia para el almacenamiento de Prisma.");
      } else if (result.reason === "unsupported") {
        toast("Este navegador no permite solicitar persistencia del almacenamiento.", true);
      } else if (result.reason === "denied") {
        toast("El navegador no concedió persistencia. Prisma seguirá funcionando; exporta una copia de seguridad.", true);
      } else {
        toast("No se pudo confirmar la protección del almacenamiento. Exporta una copia de seguridad.", true);
      }
    } catch (_) {
      storageProtectionSnapshot = await storageProtection.inspect();
      toast("No se pudo confirmar la protección del almacenamiento. Exporta una copia de seguridad.", true);
    } finally {
      storageProtectionBusy = false;
      if (currentPage === "data") renderApp();
    }
  }

  const appLifecycle = createAppLifecycle({
    get state() { return state; },
    set state(value) { state = value; },
    get customCatalog() { return customCatalog; },
    set customCatalog(value) { customCatalog = value; },
    get tmdbCredential() { return tmdbCredential; },
    set tmdbCredential(value) { tmdbCredential = value; },
    get currentPage() { return currentPage; },
    set currentPage(value) { currentPage = value; },
    get modalDraft() { return modalDraft; },
    set modalDraft(value) { modalDraft = value; },
    get movieDetail() { return movieDetail; },
    set movieDetail(value) { movieDetail = value; },
    get personDetail() { return personDetail; },
    set personDetail(value) { personDetail = value; },
    get utilitySheet() { return utilitySheet; },
    set utilitySheet(value) { utilitySheet = value; },
    get ratingReturnDetail() { return ratingReturnDetail; },
    set ratingReturnDetail(value) { ratingReturnDetail = value; },
    get $() { return $; },
    get document() { return document; },
    get window() { return window; },
    get navigator() { return navigator; },
    get fetch() { return window.fetch.bind(window); },
    get dbGet() { return dbGet; },
    get STATE_KEY() { return STATE_KEY; },
    get CATALOG_KEY() { return CATALOG_KEY; },
    get TMDB_CREDENTIAL_KEY() { return TMDB_CREDENTIAL_KEY; },
    get normalizeMovie() { return normalizeMovie; },
    get ensureState() { return ensureState; },
    get pruneTMDBCache() { return pruneTMDBCache; },
    get combineMovies() { return combineMovies; },
    get renderApp() { return renderApp; },
    get enrichRatedHistoryWithTMDB() { return enrichRatedHistoryWithTMDB; },
    get loadTMDBPage() { return loadTMDBPage; },
    get catalogQuery() { return catalogQuery; },
    get escapeHTML() { return escapeHTML; }
  });
  const { clickNav, init } = appLifecycle;

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
    get sameMovieRecord() { return sameMovieRecord; },
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
    get recommendationMode() { return recommendationMode; },
    set recommendationMode(value) { recommendationMode = recommendationPreferences.setMode(value); },
    get activeGenre() { return activeGenre; },
    set activeGenre(value) { activeGenre = value; },
    get utilitySheet() { return utilitySheet; },
    set utilitySheet(value) { utilitySheet = value; },
    get modalDraft() { return modalDraft; },
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
    get toast() { return toast; },
    get requestStorageProtection() { return requestStorageProtection; },
    get copyRecommendationDiagnosticReport() { return copyRecommendationDiagnosticReport; },
    get clearRecommendationDiagnosticReport() { return clearRecommendationDiagnosticReport; },
    get runRidgeExperiment() { return runRidgeExperiment; },
    get runTemporalRidgeExperiment() { return runTemporalRidgeExperiment; },
    get toggleTemporalAddedAtProxy() { return toggleTemporalAddedAtProxy; },
    get runInfluenceNormalizationExperiment() { return runInfluenceNormalizationExperiment; },
    get setRecommendationDiagnosticFeatureLabelsIncluded() { return function (value) { recommendationDiagnosticFeatureLabelsIncluded = Boolean(value); }; },
    get setTheme() { return themeController.setTheme; }
  });

  init().then(function () {
    return refreshStorageProtectionSnapshot();
  }).catch(function () {
    storageProtectionSnapshot = { supported: false, statusSupported: false, persisted: null, usage: null, quota: null };
  });
}());
