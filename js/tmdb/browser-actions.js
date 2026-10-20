export function createTMDBBrowserActions(ctx) {
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
      ctx.tmdbPage = Number(data.page) || page;
      ctx.tmdbTotalPages = Math.min(Number(data.total_pages) || 1, 500);
      ctx.tmdbError = "";
    } catch (error) {
      if (requestId !== ctx.tmdbRequestSerial) return;
      ctx.tmdbError = error && error.message ? error.message : "Error al consultar TMDB.";
    } finally {
      if (requestId === ctx.tmdbRequestSerial) {
        ctx.tmdbLoading = false;
        ctx.renderTMDBResults();
      }
    }
  }

  async function enrichTMDBMovie(movie) {
    if (!movie || !ctx.tmdbCredential || !ctx.tmdbCredential.value) return;
    const id = movie.tmdbId || (movie.source === "tmdb" ? movie.id : null);
    if (!id) return;
    const fetchedAt = movie.tmdbFetchedAt ? new Date(movie.tmdbFetchedAt).getTime() : 0;
    const cacheFresh = fetchedAt && Date.now() - fetchedAt < 1000 * 60 * 60 * 24 * 30;
    if (cacheFresh && movie.tags && movie.tags.length) return;
    try {
      const details = await ctx.tmdbRequest("/movie/" + encodeURIComponent(id), { language: "es-ES", append_to_response: "keywords" });
      const enriched = ctx.fromTMDB(details);
      if (ctx.modalDraft && ctx.titleKey(ctx.modalDraft.movie.title) === ctx.titleKey(movie.title)) {
        ctx.modalDraft.movie = Object.assign({}, ctx.modalDraft.movie, enriched, { key: ctx.titleKey(enriched.title) });
        ctx.renderModal();
      }
    } catch (error) {
      console.warn("Prisma: no se pudieron cargar los detalles de TMDB.", error && error.message ? error.message : "");
    }
  }

  return { loadTMDBPage, enrichTMDBMovie };
}
