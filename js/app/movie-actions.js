import { findMovieRecordMatch } from "../core/movie-utils.js";

export function createMovieActions(ctx) {
  async function saveRating() {
    if (!ctx.modalDraft) return;
    const movie = ctx.modalDraft.movie;
    const rating = Number(ctx.$("#ratingInput").value);
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
      ctx.toast("La nota debe ser un número del 1 al 10.",true);
      return;
    }
    const existingRated = findMovieRecordMatch(movie,ctx.state.rated);
    const existingIndex = existingRated ? ctx.state.rated.indexOf(existingRated) : -1;
    const old = existingIndex >= 0 ? ctx.state.rated[existingIndex] : {};
    const newEntry = Object.assign({},old,{
      id:old.id || movie.id,tmdbId:movie.tmdbId || old.tmdbId || null,
      title:movie.title,year:movie.year || old.year || null,rating:rating,
      posterPath:movie.posterPath || old.posterPath || "",posterUrl:movie.posterUrl || old.posterUrl || "",
      voteAverage:movie.voteAverage || old.voteAverage || null,voteCount:movie.voteCount || old.voteCount || null,runtime:movie.runtime || old.runtime || null,
      overview:movie.overview || old.overview || "",releaseDate:movie.releaseDate || old.releaseDate || null,
      backdropPath:movie.backdropPath || old.backdropPath || "",backdropUrl:movie.backdropUrl || old.backdropUrl || "",
      tmdbCreditsFetchedAt:movie.tmdbCreditsFetchedAt || old.tmdbCreditsFetchedAt || null,
      tmdbKeywordsFetchedAt:movie.tmdbKeywordsFetchedAt || old.tmdbKeywordsFetchedAt || null,
      tmdbFetchedAt:movie.tmdbFetchedAt || old.tmdbFetchedAt || null,
      metadataSource:movie.metadataSource || old.metadataSource || (movie.source === "tmdb" ? "tmdb" : null),
      genres:ctx.uniqueStrings((old.genres || []).concat(movie.genres || [])),
      tags:ctx.uniqueStrings((old.tags || []).concat(movie.tags || [])),
      productionCountries:ctx.uniqueStrings((old.productionCountries || []).concat(movie.productionCountries || [])),
      productionCompanies:ctx.uniqueStrings((old.productionCompanies || []).concat(movie.productionCompanies || [])),
      spokenLanguages:ctx.uniqueStrings((old.spokenLanguages || []).concat(movie.spokenLanguages || [])),
      cast:ctx.uniqueStrings((old.cast || []).concat(movie.cast || [])),
      directors:ctx.uniqueStrings((old.directors || []).concat(movie.directors || [])),
      writers:ctx.uniqueStrings((old.writers || []).concat(movie.writers || [])),
      composers:ctx.uniqueStrings((old.composers || []).concat(movie.composers || [])),
      originalLanguage:movie.originalLanguage || old.originalLanguage || "",
      collectionName:movie.collectionName || old.collectionName || "",
      // Preserve imported legacy fields if present; the rating-only UI neither edits nor learns from them.
      emotions:Array.isArray(old.emotions) ? old.emotions.slice() : [],
      note:typeof old.note === "string" ? old.note : "",
      updatedAt:new Date().toISOString(),source:"manual"
    });
    if (existingIndex >= 0) ctx.state.rated[existingIndex] = newEntry;
    else ctx.state.rated.unshift(newEntry);
    const pendingMatch = findMovieRecordMatch(movie,ctx.state.watchlist);
    ctx.state.watchlist = ctx.state.watchlist.filter(function (entry) {
      return entry !== pendingMatch && !ctx.sameMovieRecord(entry,movie);
    });
    const existingWatched = findMovieRecordMatch(movie,ctx.state.watched || []);
    const watchedIndex = existingWatched ? ctx.state.watched.indexOf(existingWatched) : -1;
    const oldWatched = watchedIndex >= 0 ? ctx.state.watched[watchedIndex] : null;
    const watchedRecord = Object.assign({},oldWatched || {},newEntry);
    const dateRecords = [oldWatched, old];
    const explicitDate = dateRecords.find(function (entry) {
      return entry && entry.watchedAt && entry.watchedAtSource === "user-confirmed" &&
        Number.isFinite(Date.parse(entry.watchedAt));
    }) || dateRecords.find(function (entry) {
      return entry && entry.watchedAt && entry.watchedAtSource === "imported-explicit" &&
        Number.isFinite(Date.parse(entry.watchedAt));
    });
    const existingDate = [oldWatched, old].find(function (entry) {
      return entry && entry.watchedAt && entry.watchedAtSource !== "action-time" &&
        !(entry.watchDateConfidence === "pre-streak-unverified" && entry.watchedAtSource !== "user-confirmed") &&
        Number.isFinite(Date.parse(entry.watchedAt));
    });
    if (explicitDate) {
      watchedRecord.watchedAt = explicitDate.watchedAt;
      watchedRecord.watchedAtSource = explicitDate.watchedAtSource;
    } else if (existingDate) {
      watchedRecord.watchedAt = existingDate.watchedAt;
      watchedRecord.watchedAtSource = existingDate.watchedAtSource || "legacy-unknown";
    } else if (existingIndex < 0) {
      watchedRecord.watchedAt = new Date().toISOString();
      watchedRecord.watchedAtSource = "action-time";
    } else {
      delete watchedRecord.watchedAt;
      delete watchedRecord.watchedAtSource;
    }
    if (watchedIndex >= 0) ctx.state.watched[watchedIndex] = watchedRecord;
    else ctx.state.watched.unshift(watchedRecord);
    ctx.logEvent("Valoración guardada: " + movie.title,"Nota " + rating + "/10","★");
    await ctx.persistState();
    const returnToDetails = ctx.ratingReturnDetail && Boolean(ctx.movieDetail);
    ctx.modalDraft = null;ctx.ratingReturnDetail = false;
    if (!returnToDetails) { ctx.movieDetail = null;ctx.$("#modalRoot").innerHTML = ""; }
    ctx.combineMovies();
    ctx.renderApp();
    if (returnToDetails) ctx.renderMovieDetails();
    ctx.toast("Tu experiencia quedó guardada en este dispositivo.");
  }

  async function deleteRating(title,tmdbId,year) {
    const activeMovie = (ctx.modalDraft && ctx.modalDraft.movie) ||
      (ctx.movieDetail && ctx.movieDetail.movie) || {};
    const target = {
      title:title,
      tmdbId:tmdbId || activeMovie.tmdbId || "",
      year:Number(year) || (ctx.titleKey(activeMovie.title) === ctx.titleKey(title) ? activeMovie.year : null)
    };
    const match = findMovieRecordMatch(target,ctx.state.rated);
    ctx.state.rated = ctx.state.rated.filter(function (entry) {
      return entry !== match && !ctx.sameMovieRecord(entry,target);
    });
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

  function resolveMovieForAction(title,tmdbId,year) {
    const active = ctx.movieDetail && ctx.titleKey(ctx.movieDetail.movie.title) === ctx.titleKey(title) ? ctx.movieDetail.movie : null;
    const id = String(tmdbId || (active && active.tmdbId) || "");
    const requestedYear = Number(year) || 0;
    const activeYear = active ? Number(active.year) || 0 : 0;
    const resolvedYear = requestedYear || (active && (!id || ctx.movieTmdbId(active) === id) ? activeYear : 0);
    const target = {title:title,tmdbId:id,year:resolvedYear || null};
    return (active && (!id || ctx.movieTmdbId(active) === id) &&
      (!resolvedYear || !activeYear || resolvedYear === activeYear) ? active : null) ||
      ctx.findMovie(title,id,target.year) ||
      findMovieRecordMatch(target,ctx.state.rated) ||
      findMovieRecordMatch(target,ctx.state.watchlist) ||
      findMovieRecordMatch(target,ctx.state.watched || []) ||
      findMovieRecordMatch(target,ctx.state.hidden || []) ||
      {title:title,year:target.year,id:id || ctx.titleKey(title),tmdbId:id || null,genres:[],tags:[]};
  }

  async function toggleWatchlist(title,tmdbId,year) {
    const movie = resolveMovieForAction(title,tmdbId,year);
    const pendingMatch = findMovieRecordMatch(movie,ctx.state.watchlist);
    const remove = Boolean(pendingMatch) || ctx.isInWatchlist(movie.title,movie.tmdbId,movie.year);
    if (remove) {
      ctx.state.watchlist = ctx.state.watchlist.filter(function (entry) {
        return entry !== pendingMatch && !ctx.sameMovieRecord(entry,movie);
      });
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

  async function markWatched(title,tmdbId,year) {
    const source = resolveMovieForAction(title,tmdbId,year);
    const matchedPrevious = findMovieRecordMatch(source,ctx.state.watched || []);
    const index = matchedPrevious ? ctx.state.watched.indexOf(matchedPrevious) : -1;
    const previous = index >= 0 ? ctx.state.watched[index] : null;
    const hasReliableDate = Boolean(previous && previous.watchedAt &&
      previous.watchedAtSource !== "action-time" &&
      !(previous.watchDateConfidence === "pre-streak-unverified" && previous.watchedAtSource !== "user-confirmed") &&
      Number.isFinite(Date.parse(previous.watchedAt)));
    const watchedAt = hasReliableDate ? previous.watchedAt : new Date().toISOString();
    const watched = Object.assign({},previous || {},source,{watchedAt:watchedAt});
    if (!hasReliableDate) {
      watched.watchedAtSource = "user-confirmed";
      watched.watchDateConfidence = "user-confirmed";
    } else if (!watched.watchedAtSource) {
      watched.watchedAtSource = "legacy-unknown";
    }
    if (index >= 0) ctx.state.watched[index] = watched;
    else ctx.state.watched.unshift(watched);
    const pendingMatch = findMovieRecordMatch(source,ctx.state.watchlist);
    ctx.state.watchlist = ctx.state.watchlist.filter(function (entry) {
      return entry !== pendingMatch && !ctx.sameMovieRecord(entry,source);
    });
    ctx.logEvent("Añadida al historial",title,"✓");
    await ctx.persistState();
    ctx.combineMovies();
    if (ctx.movieDetail && ctx.sameMovieRecord(ctx.movieDetail.movie,source)) {
      ctx.movieDetail.movie = Object.assign({},ctx.movieDetail.movie,watched);
      ctx.renderMovieDetails();
    } else ctx.renderApp();
    ctx.toast("Marcada como vista.");
  }

  async function toggleHidden(title,tmdbId,year) {
    const movie = resolveMovieForAction(title,tmdbId,year);
    const hiddenMatch = findMovieRecordMatch(movie,ctx.state.hidden);
    const remove = Boolean(hiddenMatch) || ctx.isHidden(movie.title,movie.tmdbId,movie.year);
    if (remove) {
      ctx.state.hidden = ctx.state.hidden.filter(function (entry) {
        return entry !== hiddenMatch && !ctx.sameMovieRecord(entry,movie);
      });
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
