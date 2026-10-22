import { findMovieRecordMatch } from "../core/movie-utils.js";

export function createImportExportActions(ctx) {
  async function importPersonalJSON(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed && parsed.format === "prisma-backup" && parsed.state) {
      ctx.state = ctx.ensureState(parsed.state);
      if (Array.isArray(parsed.catalogCustom)) {
        ctx.customCatalog = parsed.catalogCustom.map(ctx.normalizeMovie).filter(Boolean);
        await ctx.dbSet(ctx.CATALOG_KEY, ctx.customCatalog);
      }
      await ctx.persistState();
      ctx.combineMovies();
      ctx.renderApp();
      ctx.toast("Copia de Prisma restaurada.");
      return;
    }
    const result = ctx.extractPersonalRatings(parsed);
    const collection = ctx.extractPersonalCollections(parsed);
    if (!result.ratings.length && !ctx.hasImportedCollection(collection)) {
      throw new Error("No encontré películas vistas, pendientes ni valoraciones reconocibles. Comprueba que el JSON contenga movies.cH, movies.cW o movies.rM.");
    }

    const ratingRows = (ctx.state.rated || []).slice();
    result.ratings.forEach(function (entry) {
      const old = findMovieRecordMatch(entry,ratingRows);
      if (old && old.source === "manual") return;
      const merged = ctx.mergeMovieEntries(old,entry);
      merged.rating = ctx.ratingValue(entry);
      merged.source = "imported";
      merged.updatedAt = entry.updatedAt || old && old.updatedAt || null;
      if (old) {
        const index = ratingRows.indexOf(old);
        if (index >= 0) ratingRows[index] = merged;
      } else {
        ratingRows.push(merged);
      }
    });
    ctx.state.rated = ratingRows.filter(function (entry) { return ctx.ratingValue(entry) != null; });
    ctx.state.watched = ctx.mergeMovieListByTitle(ctx.state.watched, collection.watched);
    ctx.state.watchlist = ctx.mergeMovieListByTitle(ctx.state.watchlist, collection.watchlist);
    ctx.state.hidden = ctx.mergeMovieListByTitle(ctx.state.hidden, collection.hidden);
    if (collection.confirmedWatchStreak) {
      // The day ledger is user-confirmed and independent from how many movie rows survived import.
      ctx.state.confirmedWatchStreak = collection.confirmedWatchStreak;
    }

    const catalogIncoming = collection.records.concat(result.ratings).map(ctx.normalizeMovie).filter(Boolean);
    ctx.customCatalog = ctx.mergeMovieListByTitle(ctx.customCatalog, catalogIncoming);
    ctx.state.importedAt = new Date().toISOString();
    const importDescription = result.ratings.length.toLocaleString("es-PA") + " notas · " +
      collection.watched.length.toLocaleString("es-PA") + " vistas · " +
      collection.watchlist.length.toLocaleString("es-PA") + " pendientes";
    ctx.state.events.unshift({ title:"Colección importada", description:importDescription, symbol:"⇧", at:new Date().toISOString() });
    ctx.state.events = ctx.state.events.slice(0, 80);
    ctx.state.updatedAt = new Date().toISOString();
    await ctx.persistState();
    await ctx.dbSet(ctx.CATALOG_KEY, ctx.customCatalog);
    ctx.combineMovies();
    ctx.renderApp();
    const skippedText = result.skippedRatings ? " · " + result.skippedRatings + " nota sin título" : "";
    ctx.toast("Importadas " + result.ratings.length + " notas, " + collection.watched.length + " vistas y " + collection.watchlist.length + " pendientes" + skippedText + ".");
    if (ctx.tmdbCredential && ctx.tmdbCredential.value) {
      window.setTimeout(function () { ctx.enrichRatedHistoryWithTMDB(); }, 250);
    } else {
      ctx.toast("Conecta TMDB en Ajustes para recuperar las carátulas y las sinopsis.");
    }
  }

  async function importCatalogCSV(file) {
    const parsed = ctx.parseCatalogCSV(await file.text());
    // Reconcile the complete source set at once so an incomplete title cannot
    // be assigned to the first same-title remake encountered in the CSV.
    ctx.customCatalog = ctx.mergeMovieListByTitle(ctx.customCatalog || [],parsed).map(function (movie) {
      return Object.assign({},movie,{source:"csv"});
    });
    await ctx.dbSet(ctx.CATALOG_KEY, ctx.customCatalog);
    ctx.logEvent("Catálogo ampliado", parsed.length.toLocaleString("es-PA") + " títulos leídos de " + file.name, "▦");
    ctx.combineMovies();
    ctx.renderApp();
    ctx.toast("Catálogo ampliado: " + parsed.length.toLocaleString("es-PA") + " títulos importados. Se guardan solo en tu navegador.");
  }

  async function exportBackup() {
    const backup = {
      format: "prisma-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      state: ctx.state,
      catalogCustom: ctx.customCatalog
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
    ctx.toast("Copia de seguridad preparada.");
  }

  async function restoreBackup(file) {
    const parsed = JSON.parse(await file.text());
    if (!parsed || parsed.format !== "prisma-backup" || !parsed.state) throw new Error("Ese archivo no parece una copia de seguridad de Prisma.");
    ctx.state = ctx.ensureState(parsed.state);
    ctx.customCatalog = Array.isArray(parsed.catalogCustom) ? parsed.catalogCustom.map(ctx.normalizeMovie).filter(Boolean) : [];
    await ctx.dbSet(ctx.STATE_KEY, ctx.state);
    await ctx.dbSet(ctx.CATALOG_KEY, ctx.customCatalog);
    ctx.combineMovies();
    ctx.renderApp();
    ctx.toast("Copia restaurada correctamente.");
  }

  async function resetAll() {
    if (!window.confirm("¿Borrar tus valoraciones, historial, pendientes, películas ocultas y emociones guardadas en este navegador? Esta acción no se puede deshacer sin una copia de seguridad.")) return;
    ctx.state = ctx.emptyState();
    ctx.customCatalog = [];
    await ctx.dbSet(ctx.STATE_KEY, ctx.state);
    await ctx.dbSet(ctx.CATALOG_KEY, ctx.customCatalog);
    ctx.combineMovies();
    ctx.renderApp();
    ctx.toast("Perfil y catálogo personal restablecidos. Conecta TMDB o importa tu catálogo para empezar de nuevo.");
  }

  return { importPersonalJSON, importCatalogCSV, exportBackup, restoreBackup, resetAll };
}
