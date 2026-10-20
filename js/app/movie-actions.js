export function createMovieActions(ctx) {
  async function saveRating() {
    if (!ctx.modalDraft) return;
    const movie = ctx.modalDraft.movie;
    const rating = Number(ctx.$("#ratingInput").value);
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
      ctx.toast("La nota debe ser un número del 1 al 10.",true);
      return;
    }
    const existingIndex = ctx.state.rated.findIndex(function (entry) { return ctx.sameMovieRecord(entry,movie); });
    const old = existingIndex >= 0 ? ctx.state.rated[existingIndex] : {};
    const newEntry = Object.assign({},old,{
      id:old.id || movie.id,tmdbId:movie.tmdbId || old.tmdbId || null,
      title:movie.title,year:movie.year || old.year || null,rating:rating,
      posterPath:movie.posterPath || old.posterPath || "",posterUrl:movie.posterUrl || old.posterUrl || "",
      voteAverage:movie.voteAverage || old.voteAverage || null,voteCount:movie.voteCount || old.voteCount || null,runtime:movie.runtime || old.runtime || null,
      overview:movie.overview || old.overview || "",releaseDate:movie.releaseDate || old.releaseDate || null,
      backdropPath:movie.backdropPath || old.backdropPath || "",backdropUrl:movie.backdropUrl || old.backdropUrl || "",
      tmdbFetchedAt:movie.tmdbFetchedAt || old.tmdbFetchedAt || null,
      metadataSource:movie.metadataSource || old.metadataSource || (movie.source === "tmdb" ? "tmdb" : null),
      genres:ctx.uniqueStrings((old.genres || []).concat(movie.genres || [])),
      tags:ctx.uniqueStrings((old.tags || []).concat(movie.tags || [])),
      emotions:ctx.modalDraft.emotions.slice(),note:String((ctx.$("#ratingNote") || {}).value || "").trim(),
      updatedAt:new Date().toISOString(),source:"manual"
    });
    if (existingIndex >= 0) ctx.state.rated[existingIndex] = newEntry;
    else ctx.state.rated.unshift(newEntry);
    ctx.state.watchlist = ctx.state.watchlist.filter(function (entry) { return !ctx.sameMovieRecord(entry,movie); });
    const watchedIndex = (ctx.state.watched || []).findIndex(function (entry) { return ctx.sameMovieRecord(entry,movie); });
    const oldWatched = watchedIndex >= 0 ? ctx.state.watched[watchedIndex] : null;
    const watchedRecord = Object.assign({},oldWatched || {},newEntry,{
      watchedAt:(oldWatched && oldWatched.watchedAt) || old.watchedAt || old.updatedAt || new Date().toISOString()
    });
    if (watchedIndex >= 0) ctx.state.watched[watchedIndex] = watchedRecord;
    else ctx.state.watched.unshift(watchedRecord);
    ctx.logEvent("Valoración guardada: " + movie.title,"Nota " + rating + "/10" + (newEntry.emotions.length ? " · " + newEntry.emotions.length + " emociones registradas" : ""),"★");
    await ctx.persistState();
    const returnToDetails = ctx.ratingReturnDetail && Boolean(ctx.movieDetail);
    ctx.modalDraft = null;ctx.ratingReturnDetail = false;
    if (!returnToDetails) { ctx.movieDetail = null;ctx.$("#modalRoot").innerHTML = ""; }
    ctx.combineMovies();
    ctx.renderApp();
    if (returnToDetails) ctx.renderMovieDetails();
    ctx.toast("Tu experiencia quedó guardada en este dispositivo.");
  }

  async function deleteRating(title,tmdbId) {
    const target = {title:title,tmdbId:tmdbId || (ctx.modalDraft && ctx.modalDraft.movie.tmdbId) || ""};
    ctx.state.rated = ctx.state.rated.filter(function (entry) { return !ctx.sameMovieRecord(entry,target); });
    ctx.logEvent("Valoración eliminada",title,"−");
    await ctx.persistState();
    const returnToDetails = ctx.ratingReturnDetail && Boolean(ctx.movieDetail);
    ctx.modalDraft = null;ctx.ratingReturnDetail = false;
    if (!returnToDetails) { ctx.movieDetail = null;ctx.$("#modalRoot").innerHTML = ""; }
    ctx.combineMovies();
    ctx.renderApp();
    if (returnToDetails) ctx.renderMovieDetails();
    ctx.toast("Se quitó la valoración de " + title + ".");
  }

  function resolveMovieForAction(title,tmdbId) {
    const active = ctx.movieDetail && ctx.titleKey(ctx.movieDetail.movie.title) === ctx.titleKey(title) ? ctx.movieDetail.movie : null;
    const id = String(tmdbId || (active && active.tmdbId) || "");
    const target = {title:title,tmdbId:id};
    return (active && (!id || ctx.movieTmdbId(active) === id) ? active : null) ||
      ctx.findMovie(title,id) ||
      ctx.state.rated.find(function (entry) { return ctx.sameMovieRecord(entry,target); }) ||
      ctx.state.watchlist.find(function (entry) { return ctx.sameMovieRecord(entry,target); }) ||
      (ctx.state.watched || []).find(function (entry) { return ctx.sameMovieRecord(entry,target); }) ||
      (ctx.state.hidden || []).find(function (entry) { return ctx.sameMovieRecord(entry,target); }) ||
      {title:title,id:id || ctx.titleKey(title),tmdbId:id || null,genres:[],tags:[]};
  }

  async function toggleWatchlist(title,tmdbId) {
    const movie = resolveMovieForAction(title,tmdbId);
    const remove = ctx.isInWatchlist(movie.title,movie.tmdbId);
    if (remove) {
      ctx.state.watchlist = ctx.state.watchlist.filter(function (entry) { return !ctx.sameMovieRecord(entry,movie); });
      ctx.logEvent("Quitada de pendientes",title,"−");
      ctx.toast("Se quitó de tu lista.");
    } else {
      ctx.state.watchlist.unshift(Object.assign({},movie,{title:movie.title,addedAt:new Date().toISOString()}));
      ctx.logEvent("Añadida a pendientes",title,"＋");
      ctx.toast("Añadida a tu lista para verla después.");
    }
    await ctx.persistState();
    ctx.combineMovies();
    if (ctx.movieDetail) ctx.renderMovieDetails(); else ctx.renderApp();
  }

  async function markWatched(title,tmdbId) {
    const source = resolveMovieForAction(title,tmdbId);
    const index = (ctx.state.watched || []).findIndex(function (entry) { return ctx.sameMovieRecord(entry,source); });
    const previous = index >= 0 ? ctx.state.watched[index] : null;
    const watched = Object.assign({},previous || {},source,{watchedAt:(previous && previous.watchedAt) || new Date().toISOString()});
    if (index >= 0) ctx.state.watched[index] = watched;
    else ctx.state.watched.unshift(watched);
    ctx.state.watchlist = ctx.state.watchlist.filter(function (entry) { return !ctx.sameMovieRecord(entry,source); });
    ctx.logEvent("Añadida al historial",title,"✓");
    await ctx.persistState();
    ctx.combineMovies();
    if (ctx.movieDetail && ctx.sameMovieRecord(ctx.movieDetail.movie,source)) {
      ctx.movieDetail.movie = Object.assign({},ctx.movieDetail.movie,watched);
      ctx.renderMovieDetails();
    } else ctx.renderApp();
    ctx.toast("Marcada como vista.");
  }

  async function toggleHidden(title,tmdbId) {
    const movie = resolveMovieForAction(title,tmdbId);
    const remove = ctx.isHidden(movie.title,movie.tmdbId);
    if (remove) {
      ctx.state.hidden = ctx.state.hidden.filter(function (entry) { return !ctx.sameMovieRecord(entry,movie); });
    } else {
      ctx.state.hidden.unshift(Object.assign({},movie,{hiddenAt:new Date().toISOString()}));
    }
    ctx.logEvent(remove ? "Película mostrada" : "Película ocultada",title,"◌");
    await ctx.persistState();
    ctx.combineMovies();
    if (ctx.movieDetail && ctx.sameMovieRecord(ctx.movieDetail.movie,movie)) ctx.renderMovieDetails();
    else ctx.renderApp();
    ctx.toast(remove ? "La película vuelve a aparecer en Prisma." : "La película quedó oculta en tus recomendaciones.");
  }

  return { saveRating, deleteRating, resolveMovieForAction, toggleWatchlist, markWatched, toggleHidden };
}
