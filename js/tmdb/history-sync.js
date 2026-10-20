export function createTMDBHistorySync(ctx) {
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
    ctx.customCatalog = pruneList(ctx.customCatalog);
    ctx.state.rated = pruneList(ctx.state.rated);
    ctx.state.watched = pruneList(ctx.state.watched);
    ctx.state.watchlist = pruneList(ctx.state.watchlist);
    ctx.state.hidden = pruneList(ctx.state.hidden);
    if (changed) {
      ctx.dbSet(ctx.CATALOG_KEY,ctx.customCatalog).catch(function () {});
      ctx.persistState();
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
    return ctx.catalog.filter(historyNeedsTMDB).length;
  }

  async function findTMDBDetailsForRating(entry) {
    const id = historyTMDBId(entry);
    if (id) {
      try {
        return await ctx.tmdbRequest("/movie/" + encodeURIComponent(id), { language: "es-ES", append_to_response: "keywords" });
      } catch (error) {
        // Si el ID guardado ya no existe, busca el título por nombre y año.
      }
    }
    const params = { query: entry.title, language: "es-ES", include_adult: false };
    if (entry.year) params.year = entry.year;
    const results = await ctx.tmdbRequest("/search/movie", params);
    const candidates = results.results || [];
    if (!candidates.length) return null;
    const wanted = ctx.titleKey(entry.title);
    let selected = candidates.find(function (candidate) {
      return ctx.titleKey(candidate.title) === wanted || ctx.titleKey(candidate.original_title) === wanted;
    });
    if (!selected && entry.year) {
      const sameYear = candidates.filter(function (candidate) {
        return String(candidate.release_date || "").slice(0, 4) === String(entry.year);
      });
      if (sameYear.length === 1) selected = sameYear[0];
    }
    if (!selected && candidates.length === 1) selected = candidates[0];
    if (!selected) return null;
    return await ctx.tmdbRequest("/movie/" + encodeURIComponent(selected.id), { language: "es-ES", append_to_response: "keywords" });
  }

  function applyTMDBDetailsToRating(entry, enriched) {
    entry.tmdbId = String(enriched.id || enriched.tmdbId || entry.tmdbId || entry.tmId || "");
    entry.genres = ctx.uniqueStrings((enriched.genres || []).concat(entry.genres || []));
    entry.tags = ctx.uniqueStrings((enriched.tags || []).concat(entry.tags || []));
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
      ctx.state[listName] = (ctx.state[listName] || []).map(function (current) {
        if (!ctx.sameMovieRecord(current,entry)) return current;
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
      genres: ctx.uniqueStrings((rating.genres || []).concat(enriched.genres || [])),
      tags: ctx.uniqueStrings((rating.tags || []).concat(enriched.tags || [])),
      overview: rating.overview || enriched.overview || "",
      posterPath: rating.posterPath || enriched.posterPath || "",
      posterUrl: rating.posterUrl || enriched.posterUrl || "",
      tmdbFetchedAt: rating.tmdbFetchedAt || enriched.tmdbFetchedAt || new Date().toISOString(),
      metadataSource: "tmdb",
      source: "tmdb"
    });
    const key = ctx.titleKey(stored.title);
    const index = ctx.customCatalog.findIndex(function (movie) {
      const existingId = ctx.movieTmdbId(movie), incomingId = ctx.movieTmdbId(stored);
      if (existingId && incomingId) return existingId === incomingId;
      return ctx.titleKey(movie.title) === key && !existingId && !incomingId;
    });
    if (index >= 0) {
      ctx.customCatalog[index] = Object.assign({}, ctx.customCatalog[index], stored, {
        title: ctx.customCatalog[index].title || stored.title,
        genres: ctx.uniqueStrings((ctx.customCatalog[index].genres || []).concat(stored.genres || [])),
        tags: ctx.uniqueStrings((ctx.customCatalog[index].tags || []).concat(stored.tags || [])),
        overview: stored.overview || ctx.customCatalog[index].overview || "",
        posterUrl: stored.posterUrl || ctx.customCatalog[index].posterUrl || ""
      });
    } else ctx.customCatalog.push(stored);
  }

  async function enrichRatedHistoryWithTMDB() {
    if (!ctx.tmdbCredential || !ctx.tmdbCredential.value) {
      ctx.toast("Conecta TMDB en Ajustes para cargar las carátulas y completar los datos.",true);
      ctx.clickNav("data");
      return;
    }
    if (ctx.tmdbHistorySync.running) {
      ctx.tmdbEnrichRequested = true;
      ctx.toast("Los títulos nuevos se añadirán a la cola actual.");
      return;
    }
    const targets = ctx.catalog.filter(historyNeedsTMDB);
    if (!targets.length) {
      ctx.toast("Las carátulas y los datos del catálogo están actualizados.");
      return;
    }
    ctx.tmdbHistorySync = {running:true,total:targets.length,done:0,updated:0,failed:0,current:"",finishedAt:null};
    ctx.renderApp();
    let cursor = 0;
    let lastPersisted = 0;
    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= targets.length) return;
        const entry = targets[index];
        ctx.tmdbHistorySync.current = entry.title;
        try {
          const raw = await findTMDBDetailsForRating(entry);
          if (!raw) {
            ctx.tmdbHistorySync.failed += 1;
          } else {
            const enriched = ctx.fromTMDB(raw);
            if (!enriched || !enriched.title) {
              ctx.tmdbHistorySync.failed += 1;
            } else {
              applyTMDBDetailsToRating(entry,enriched);
              applyTMDBDetailsToLocalCollection(entry,enriched);
              upsertTMDBCatalogEntry(entry,enriched);
              ctx.tmdbHistorySync.updated += 1;
            }
          }
        } catch (_) {
          ctx.tmdbHistorySync.failed += 1;
        } finally {
          ctx.tmdbHistorySync.done += 1;
          if (ctx.tmdbHistorySync.done - lastPersisted >= 5 || ctx.tmdbHistorySync.done === ctx.tmdbHistorySync.total) {
            lastPersisted = ctx.tmdbHistorySync.done;
            ctx.state.updatedAt = new Date().toISOString();
            await ctx.persistState();
            await ctx.dbSet(ctx.CATALOG_KEY,ctx.customCatalog);
            ctx.combineMovies();
            if (ctx.currentPage === "library") ctx.refreshCollectionContent();
            else ctx.renderApp();
          }
        }
        await new Promise(function (resolve) { ctx.window.setTimeout(resolve,120); });
      }
    }
    await Promise.all([worker(),worker(),worker()]);
    ctx.tmdbHistorySync.running = false;
    ctx.tmdbHistorySync.finishedAt = new Date().toISOString();
    ctx.tmdbHistorySync.current = "";
    ctx.state.events.unshift({title:"Carátulas y datos actualizados",description:ctx.tmdbHistorySync.updated + " actualizadas; " + ctx.tmdbHistorySync.failed + " sin coincidencia",symbol:"✦",at:ctx.tmdbHistorySync.finishedAt});
    ctx.state.events = ctx.state.events.slice(0,80);
    ctx.state.updatedAt = ctx.tmdbHistorySync.finishedAt;
    await ctx.persistState();
    await ctx.dbSet(ctx.CATALOG_KEY,ctx.customCatalog);
    ctx.combineMovies();
    ctx.renderApp();
    ctx.toast("Completado: " + ctx.tmdbHistorySync.updated.toLocaleString("es-PA") + " títulos actualizados; " + ctx.tmdbHistorySync.failed.toLocaleString("es-PA") + " sin coincidencia.");
    if (ctx.tmdbEnrichRequested) {
      ctx.tmdbEnrichRequested = false;
      ctx.window.setTimeout(function () { enrichRatedHistoryWithTMDB(); },250);
    }
  }

  return {
    pruneTMDBCache,
    historyNeedsTMDB,
    historyTMDBId,
    pendingHistoryTMDBCount,
    findTMDBDetailsForRating,
    applyTMDBDetailsToRating,
    applyTMDBDetailsToLocalCollection,
    upsertTMDBCatalogEntry,
    enrichRatedHistoryWithTMDB
  };
}
