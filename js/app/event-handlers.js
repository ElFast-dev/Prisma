export function registerAppEvents(ctx) {
  const posterRefreshRequested = new Set();
  ctx.document.addEventListener("error",function (event) {
    const image = event.target;
    if (!(image instanceof ctx.HTMLImageElement)) return;
    const host = image.parentElement;
    const failedId = image.dataset.tmdbId || "";
    if (image.classList.contains("poster-image") || image.classList.contains("recent-poster-image")) {
      image.remove();
      if (failedId && !posterRefreshRequested.has(failedId)) {
        posterRefreshRequested.add(failedId);
        const invalidate = function (list) {
          return (list || []).map(function (entry) {
            if (ctx.movieTmdbId(entry) !== failedId) return entry;
            return Object.assign({},entry,{posterUrl:"",posterPath:"",tmdbFetchedAt:null,metadataSource:null});
          });
        };
        ctx.state.rated = invalidate(ctx.state.rated);
        ctx.state.watched = invalidate(ctx.state.watched);
        ctx.state.watchlist = invalidate(ctx.state.watchlist);
        ctx.state.hidden = invalidate(ctx.state.hidden);
        ctx.customCatalog = invalidate(ctx.customCatalog);
        const catalogEntry = ctx.catalog.find(function (entry) { return ctx.movieTmdbId(entry) === failedId; });
        if (catalogEntry) Object.assign(catalogEntry,{posterUrl:"",posterPath:"",tmdbFetchedAt:null,metadataSource:null});
        ctx.persistState();
        ctx.dbSet(ctx.CATALOG_KEY,ctx.customCatalog).catch(function () {});
        if (ctx.tmdbCredential && ctx.tmdbCredential.value) {
          if (ctx.tmdbHistorySync.running) ctx.tmdbEnrichRequested = true;
          else ctx.window.setTimeout(function () { ctx.enrichRatedHistoryWithTMDB(); },300);
        }
      }
      return;
    }
    if (!host || !host.matches(".collection-row-poster,.compact-poster,.cast-photo,.person-film-poster,.similar-poster,.saga-art,.provider-chip")) return;
    image.remove();
    if (host.querySelector(".poster-fallback,.image-fallback")) return;
    const fallback = ctx.document.createElement("span");
    fallback.className = host.matches(".provider-chip") ? "image-fallback" : "poster-fallback";
    fallback.textContent = "▣";
    host.appendChild(fallback);
  },true);

  ctx.document.addEventListener("click",async function (event) {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      event.preventDefault();
      ctx.clickNav(nav.dataset.nav);
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    try {
      if (action === "import-json") { ctx.$("#jsonImportInput").click(); return; }
      if (action === "import-catalog") { ctx.$("#catalogImportInput").click(); return; }
      if (action === "save-tmdb") { await ctx.saveTMDBCredential(); return; }
      if (action === "test-tmdb") { await ctx.testTMDBCredential(); return; }
      if (action === "remove-tmdb") { await ctx.removeTMDBCredential(); return; }
      if (action === "tmdb-retry") { await ctx.loadTMDBPage(1,ctx.catalogQuery.trim().length >= 2 ? "search" : "popular",false); return; }
      if (action === "tmdb-more") { await ctx.loadTMDBPage(ctx.tmdbPage + 1,ctx.tmdbMode,true); return; }
      if (action === "enrich-history") { await ctx.enrichRatedHistoryWithTMDB(); return; }
      if (action === "export-backup") { await ctx.exportBackup(); return; }
      if (action === "restore-backup") { ctx.$("#backupImportInput").click(); return; }
      if (action === "reset") { await ctx.resetAll(); return; }
      if (action === "show-info") { ctx.openInfoSheet(button.dataset.info || "collection"); return; }
      if (action === "genre") { ctx.activeGenre = button.dataset.genre || "Todos"; ctx.renderApp(); return; }
      if (action === "details") {
        const requestedId = button.dataset.tmdbId || "";
        let movie = (requestedId ? ctx.tmdbResults.find(function (item) { return ctx.movieTmdbId(item) === requestedId; }) : null) ||
          ctx.findMovie(button.dataset.title,requestedId) ||
          ctx.getCollectionItems("history").concat(ctx.getCollectionItems("pending"),ctx.getCollectionItems("hidden")).find(function (item) {
            return requestedId ? ctx.movieTmdbId(item) === requestedId : ctx.titleKey(item.title) === ctx.titleKey(button.dataset.title);
          });
        if (movie && requestedId && !movie.tmdbId) movie = Object.assign({},movie,{tmdbId:requestedId,source:"tmdb"});
        if (!movie && button.dataset.title) movie = {title:button.dataset.title,id:requestedId || ctx.titleKey(button.dataset.title),tmdbId:requestedId || null,source:requestedId ? "tmdb" : "catalog"};
        if (movie) ctx.openModal(movie,"details");
        return;
      }
      if (action === "rate") {
        const inDetail = Boolean(button.closest(".detail-sheet"));
        const requestedId = button.dataset.tmdbId || (ctx.movieDetail && ctx.movieDetail.movie.tmdbId) || "";
        const movie = (ctx.movieDetail && inDetail ? ctx.movieDetail.movie : null) ||
          (requestedId ? ctx.tmdbResults.find(function (item) { return ctx.movieTmdbId(item) === requestedId; }) : null) ||
          ctx.findMovie(button.dataset.title || (ctx.movieDetail && ctx.movieDetail.movie.title),requestedId) || (ctx.movieDetail && ctx.movieDetail.movie);
        if (movie) ctx.openModal(movie,"rate");
        return;
      }
      if (action === "rating-star") { ctx.updateRatingPreview(button.dataset.rating); return; }
      if (action === "save-rating") { await ctx.saveRating(); return; }
      if (action === "delete-rating") { await ctx.deleteRating(button.dataset.title,button.dataset.tmdbId); return; }
      if (action === "emotion") {
        if (!modalDraft) return;
        const emotion = button.dataset.emotion, index = modalDraft.emotions.indexOf(emotion);
        if (index >= 0) modalDraft.emotions.splice(index,1); else modalDraft.emotions.push(emotion);
        ctx.renderModal();
        return;
      }
      if (action === "close-modal") { ctx.closeModal(); return; }
      if (action === "backdrop-close" && event.target === button) {
        if (ctx.utilitySheet) { ctx.utilitySheet = null; ctx.renderModal(); }
        else ctx.closeModal();
        return;
      }
      if (action === "retry-movie-detail") { if (ctx.movieDetail) { ctx.movieDetailCache.delete(String(ctx.movieDetail.movie.tmdbId || "")); ctx.loadMovieDetail(ctx.movieDetail.movie); } return; }
      if (action === "toggle-watchlist") { if (button.dataset.title) await ctx.toggleWatchlist(button.dataset.title,button.dataset.tmdbId); return; }
      if (action === "manage-pending") {
        const title = ctx.movieDetail ? ctx.movieDetail.movie.title : (modalDraft && modalDraft.movie.title);
        if (title) await ctx.toggleWatchlist(title,ctx.movieDetail && ctx.movieDetail.movie.tmdbId);
        if (ctx.utilitySheet) { ctx.utilitySheet = null; ctx.renderModal(); }
        return;
      }
      if (action === "mark-watched" || action === "manage-history") {
        const title = ctx.movieDetail ? ctx.movieDetail.movie.title : (modalDraft && modalDraft.movie.title);
        if (title) await ctx.markWatched(title,ctx.movieDetail && ctx.movieDetail.movie.tmdbId);
        if (ctx.utilitySheet) { ctx.utilitySheet = null; ctx.renderModal(); }
        return;
      }
      if (action === "toggle-hidden" || action === "manage-hidden") {
        const title = ctx.movieDetail ? ctx.movieDetail.movie.title : (modalDraft && modalDraft.movie.title);
        if (title) await ctx.toggleHidden(title,ctx.movieDetail && ctx.movieDetail.movie.tmdbId);
        if (ctx.utilitySheet) { ctx.utilitySheet = null; ctx.renderModal(); }
        return;
      }
      if (action === "manage-lists") { ctx.openUtilitySheet("manage"); return; }
      if (action === "open-sort") { ctx.openUtilitySheet("sort"); return; }
      if (action === "open-genres") { ctx.openUtilitySheet("genres"); return; }
      if (action === "choose-sort") {
        if (!ctx.utilitySheet) return;
        ctx.utilitySheet.sort = button.dataset.sort || "added";
        ctx.utilitySheet.direction = ctx.utilitySheet.sort === "title" ? "asc" : "desc";
        ctx.renderModal();
        return;
      }
      if (action === "toggle-sort-direction") { if (ctx.utilitySheet) { ctx.utilitySheet.direction = ctx.utilitySheet.direction === "asc" ? "desc" : "asc"; ctx.renderModal(); } return; }
      if (action === "accept-sort") {
        if (ctx.utilitySheet) { ctx.collectionSort = ctx.utilitySheet.sort; ctx.collectionDirection = ctx.utilitySheet.direction; }
        ctx.utilitySheet = null; ctx.renderApp(); ctx.renderModal(); return;
      }
      if (action === "toggle-sheet-genre") {
        if (!ctx.utilitySheet) return;
        const genre = button.dataset.genre || "";
        const index = ctx.utilitySheet.genres.findIndex(function (value) { return ctx.titleKey(value) === ctx.titleKey(genre); });
        if (index >= 0) ctx.utilitySheet.genres.splice(index,1); else ctx.utilitySheet.genres.push(genre);
        ctx.renderModal(); return;
      }
      if (action === "clear-sheet-genres") { if (ctx.utilitySheet) ctx.utilitySheet.genres = []; ctx.renderModal(); return; }
      if (action === "accept-genres") {
        if (ctx.utilitySheet) ctx.collectionGenres = ctx.utilitySheet.genres.slice();
        ctx.utilitySheet = null; ctx.renderApp(); ctx.renderModal(); return;
      }
      if (action === "toggle-layout") { ctx.collectionLayout = ctx.collectionLayout === "list" ? "compact" : "list"; ctx.renderApp(); return; }
      if (action === "toggle-released") { ctx.onlyReleased = !ctx.onlyReleased; ctx.renderApp(); return; }
      if (action === "toggle-collection-search") {
        ctx.showCollectionSearch = !ctx.showCollectionSearch;
        if (!ctx.showCollectionSearch) ctx.collectionQuery = "";
        ctx.renderApp();
        const search = ctx.$("[data-collection-search]");
        if (search) search.focus();
        return;
      }
      if (action === "collection-tab") { ctx.collectionTab = button.dataset.tab || "history"; ctx.collectionMode = "movies"; ctx.renderApp(); return; }
      if (action === "collection-mode") { ctx.collectionMode = button.dataset.mode || "movies"; ctx.renderApp(); return; }
      if (action === "collection-open-tab") { ctx.collectionTab = button.dataset.tab || "history"; ctx.collectionMode = "movies"; ctx.renderApp(); return; }
      if (action === "person-details") { ctx.openPersonDetails(button.dataset.personId,button.dataset.personName,button.dataset.character); return; }
      if (action === "person-back") { ctx.personDetail = null; ctx.renderModal(); return; }
      if (action === "person-filter") { ctx.personListFilter = button.dataset.filter || "all"; ctx.renderPersonDetails(); return; }
      if (action === "movie-from-person") {
        const title = button.dataset.title;
        const movie = ctx.findMovie(title,button.dataset.tmdbId) || {title:title,id:button.dataset.tmdbId || ctx.titleKey(title),tmdbId:button.dataset.tmdbId || null,source:"tmdb"};
        ctx.personDetail = null; ctx.openModal(movie,"details"); return;
      }
      if (action === "open-trailer") {
        const videos = ctx.movieDetail && ctx.movieDetail.data ? ctx.movieDetail.data.videos : [];
        const trailer = (videos || []).find(function (video) { return video.site === "YouTube" && video.type === "Trailer"; }) ||
          (videos || []).find(function (video) { return video.site === "YouTube"; });
        const url = trailer ? "https://www.youtube.com/watch?v=" + encodeURIComponent(trailer.key) :
          (ctx.movieDetail && ctx.movieDetail.movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(ctx.movieDetail.movie.tmdbId) + "/videos" : "");
        if (url) ctx.window.open(url,"_blank","noopener,noreferrer"); else ctx.toast("No hay enlace de tráiler disponible. Conecta TMDB para consultar los vídeos.",true);
        return;
      }
      if (action === "open-reviews") {
        if (ctx.movieDetail && ctx.movieDetail.movie.tmdbId) ctx.window.open("https://www.themoviedb.org/movie/" + encodeURIComponent(ctx.movieDetail.movie.tmdbId) + "/reviews","_blank","noopener,noreferrer");
        else ctx.toast("Conecta TMDB para abrir los comentarios públicos de esta película.",true);
        return;
      }
      if (action === "share-movie") {
        const movie = ctx.movieDetail && ctx.movieDetail.movie;
        if (!movie) return;
        const url = movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movie.tmdbId) : ctx.window.location.href;
        const payload = {title:movie.title,text:"Mira " + movie.title + " en Prisma",url:url};
        if (ctx.navigator.share) await ctx.navigator.share(payload);
        else if (ctx.navigator.clipboard && ctx.navigator.clipboard.writeText) { await ctx.navigator.clipboard.writeText(url); ctx.toast("Enlace copiado."); }
        else ctx.window.prompt("Copia el enlace de la película",url);
        return;
      }
      if (action === "close-sheet") { ctx.utilitySheet = null; ctx.renderModal(); return; }
    } catch (error) {
      ctx.toast(error && error.message ? error.message : "No se pudo completar la acción.",true);
    }
  });

  ctx.document.addEventListener("input",function (event) {
    if (event.target.matches("[data-global-search]")) {
      ctx.catalogQuery = event.target.value;
      ctx.activeGenre = "Todos";
      if (ctx.currentPage !== "catalog") { ctx.currentPage = "catalog"; ctx.renderApp(); }
      else {
        ctx.renderCatalogResults();
        const caption = ctx.$("#catalogSearchTitle");
        if (caption) caption.textContent = ctx.catalogQuery.trim() ? "Resultados para «" + ctx.catalogQuery.trim() + "»" : "Catálogo local";
      }
      if (ctx.tmdbSearchTimer) ctx.window.clearTimeout(ctx.tmdbSearchTimer);
      ctx.tmdbSearchTimer = ctx.window.setTimeout(function () {
        if (ctx.currentPage === "catalog" && ctx.tmdbCredential && ctx.tmdbCredential.value) {
          ctx.loadTMDBPage(1,ctx.catalogQuery.trim().length >= 2 ? "search" : "popular",false);
        }
      },450);
      return;
    }
    if (event.target.matches("[data-catalog-search]")) {
      ctx.catalogQuery = event.target.value;
      ctx.renderCatalogResults();
      if (ctx.tmdbSearchTimer) ctx.window.clearTimeout(ctx.tmdbSearchTimer);
      ctx.tmdbSearchTimer = ctx.window.setTimeout(function () {
        if (ctx.currentPage === "catalog" && ctx.tmdbCredential && ctx.tmdbCredential.value) {
          ctx.loadTMDBPage(1,ctx.catalogQuery.trim().length >= 2 ? "search" : "popular",false);
        }
      },450);
      return;
    }
    if (event.target.matches("[data-collection-search]")) {
      ctx.collectionQuery = event.target.value;
      ctx.refreshCollectionContent();
    }
  });


  ctx.$("#jsonImportInput").addEventListener("change", async function (event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try { await ctx.importPersonalJSON(file); }
    catch (error) { ctx.toast(error.message || "No pude leer ese JSON.", true); }
  });
  ctx.$("#catalogImportInput").addEventListener("change", async function (event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try { await ctx.importCatalogCSV(file); }
    catch (error) { ctx.toast(error.message || "No pude leer ese CSV.", true); }
  });
  ctx.$("#backupImportInput").addEventListener("change", async function (event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try { await ctx.restoreBackup(file); }
    catch (error) { ctx.toast(error.message || "No pude restaurar la copia.", true); }
  });
}
