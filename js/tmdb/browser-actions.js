export function createTMDBBrowserActions(ctx) {
  const requestedCandidateDetails = new Set();

  async function enrichRecommendationCandidates(candidates) {
    if (!ctx.tmdbCredential || !ctx.tmdbCredential.value) return;
    const eligible = (candidates || []).filter(function (movie) {
      const id = String(movie && (movie.tmdbId || movie.id) || "");
      return id && !(movie.cast && movie.cast.length) && !requestedCandidateDetails.has(id);
    }).slice(0, 6);
    eligible.forEach(function (movie) { requestedCandidateDetails.add(String(movie.tmdbId || movie.id)); });
    let cursor = 0;
    let changed = false;

    async function worker() {
      while (cursor < eligible.length) {
        const movie = eligible[cursor++];
        const id = String(movie.tmdbId || movie.id);
        try {
          const details = await ctx.tmdbRequest("/movie/" + encodeURIComponent(id), {
            language: "es-ES",
            append_to_response: "credits,keywords"
          });
          const enriched = ctx.fromTMDB(details);
          if (!enriched || !enriched.title) continue;
          const mergeById = function (list) {
            return (list || []).map(function (entry) {
              const entryId = String(entry && (entry.tmdbId || entry.id) || "");
              return entryId === id ? Object.assign({}, entry, enriched, { source: entry.source || "tmdb" }) : entry;
            });
          };
          ctx.recommendationCandidates = mergeById(ctx.recommendationCandidates);
          ctx.tmdbResults = mergeById(ctx.tmdbResults);
          changed = true;
        } catch (_) {
          requestedCandidateDetails.delete(id);
          // Retain the basic popular result if TMDB cannot supply its detailed metadata.
        }
      }
    }

    await Promise.all(Array.from({ length: Math.min(2, eligible.length) }, worker));
    if (changed && ctx.currentPage === "catalog") ctx.renderApp();
  }

  async function loadTMDBPage(page, mode, append) {
    if (!ctx.tmdbCredential || !ctx.tmdbCredential.value) {
      ctx.renderTMDBResults();
      return;
    }
    const safeMode = mode === "search" && ctx.catalogQuery.trim().length >= 2 ? "search" : "popular";
    const query = ctx.catalogQuery.trim();
    const requestId = ++ctx.tmdbRequestSerial;
    ctx.tmdbMode = safeMode;
    ctx.tmdbLoading = true;
    ctx.tmdbError = "";
    if (!append) ctx.tmdbResults = [];
    ctx.renderTMDBResults();
    try {
      try { await ctx.ensureTMDBGenres(); } catch (_) {
        // La búsqueda sigue siendo útil aunque no se pueda cargar el listado de géneros.
      }
      const params = { language: "es-ES", page: page, include_adult: false };
      const endpoint = safeMode === "search" ? "/search/movie" : "/movie/popular";
      if (safeMode === "search") params.query = query;
      const data = await ctx.tmdbRequest(endpoint, params);
      if (requestId !== ctx.tmdbRequestSerial) return;
      const mapped = (data.results || []).map(ctx.fromTMDB).filter(function (movie) { return Boolean(movie.title); });
      ctx.tmdbResults = append ? ctx.tmdbResults.concat(mapped) : mapped;
      if (safeMode === "popular") {
        const previousCandidates = append ? (ctx.recommendationCandidates || []) : [];
        ctx.recommendationCandidates = ctx.uniqueDiscoveryMovies(previousCandidates.concat(mapped));
        // Enrich at most six new candidates per page with two concurrent requests.
        // Results stay in memory until an explicit user action stores a movie.
        void enrichRecommendationCandidates(mapped);
      }
      ctx.tmdbPage = Number(data.page) || page;
      ctx.tmdbTotalPages = Math.min(Number(data.total_pages) || 1, 500);
      ctx.tmdbError = "";
    } catch (error) {
      if (requestId !== ctx.tmdbRequestSerial) return;
      ctx.tmdbError = error && error.message ? error.message : "Error al consultar TMDB.";
    } finally {
      if (requestId === ctx.tmdbRequestSerial) {
        ctx.tmdbLoading = false;
        if (ctx.currentPage === "catalog" && typeof ctx.renderApp === "function") ctx.renderApp();
        else ctx.renderTMDBResults();
      }
    }
  }

  async function enrichTMDBMovie(movie) {
    if (!movie || !ctx.tmdbCredential || !ctx.tmdbCredential.value) return;
    const id = movie.tmdbId || (movie.source === "tmdb" ? movie.id : null);
    if (!id) return;
    const now = Date.now();
    const fetchedAt = movie.tmdbFetchedAt ? new Date(movie.tmdbFetchedAt).getTime() : 0;
    const creditsFetchedAt = movie.tmdbCreditsFetchedAt ? new Date(movie.tmdbCreditsFetchedAt).getTime() : 0;
    const keywordsFetchedAt = movie.tmdbKeywordsFetchedAt ? new Date(movie.tmdbKeywordsFetchedAt).getTime() : 0;
    const cacheFresh = fetchedAt && now - fetchedAt >= 0 && now - fetchedAt < 1000 * 60 * 60 * 24 * 30;
    const creditsFresh = creditsFetchedAt && now - creditsFetchedAt >= 0 && now - creditsFetchedAt < 1000 * 60 * 60 * 24 * 30;
    const keywordsFresh = keywordsFetchedAt && now - keywordsFetchedAt >= 0 && now - keywordsFetchedAt < 1000 * 60 * 60 * 24 * 30;
    if (cacheFresh && creditsFresh && keywordsFresh) return;
    try {
      const details = await ctx.tmdbRequest("/movie/" + encodeURIComponent(id), { language: "es-ES", append_to_response: "credits,keywords" });
      const enriched = ctx.fromTMDB(details);
      const draftMovie = ctx.modalDraft && ctx.modalDraft.movie;
      const draftId = String(draftMovie && (draftMovie.tmdbId || draftMovie.tmId) || "");
      const requestedId = String(id);
      const matchesDraft = draftId && requestedId
        ? draftId === requestedId
        : Boolean(draftMovie && ctx.titleKey(draftMovie.title) === ctx.titleKey(movie.title));
      if (draftMovie && matchesDraft) {
        ctx.modalDraft.movie = Object.assign({}, draftMovie, enriched, { key: ctx.titleKey(enriched.title) });
        ctx.renderModal();
      }
    } catch (error) {
      console.warn("Prisma: no se pudieron cargar los detalles de TMDB.", error && error.message ? error.message : "");
    }
  }

  return { loadTMDBPage, enrichTMDBMovie };
}
