export function createTMDBMovieDetails(ctx) {
  async function softTMDBRequest(path, params) {
    try { return await ctx.tmdbRequest(path, params || {}); } catch (_) { return null; }
  }

  async function loadMovieDetail(movie) {
    const id = String(movie.tmdbId || "");
    if (!id || !ctx.tmdbCredential || !ctx.tmdbCredential.value) return;
    if (ctx.movieDetailCache.has(id)) {
      if (ctx.movieDetail && ctx.sameMovieRecord(ctx.movieDetail.movie,movie)) {
        const cached = ctx.movieDetailCache.get(id);
        ctx.movieDetail.movie = cached.movie;
        ctx.movieDetail.data = cached.data;
        ctx.movieDetail.loading = false;
        ctx.renderModal();
      }
      return;
    }
    if (!ctx.movieDetail || ctx.titleKey(ctx.movieDetail.movie.title) !== ctx.titleKey(movie.title)) return;
    ctx.movieDetail.loading = true;
    ctx.renderModal();
    try {
      const raw = await ctx.tmdbRequest("/movie/" + encodeURIComponent(id), { language: "es-ES", append_to_response: "credits,videos,release_dates,external_ids,keywords,recommendations,similar" });
      const providerResponse = await softTMDBRequest("/movie/" + encodeURIComponent(id) + "/watch/providers", {});
      const normalized = ctx.fromTMDB(raw);
      const backdropPath = raw.backdrop_path || normalized.backdropPath || "";
      const detailsMovie = Object.assign({}, ctx.movieDetail.movie, normalized, {
        id:String(raw.id || id), tmdbId:String(raw.id || id), title:raw.title || ctx.movieDetail.movie.title,
        originalTitle:raw.original_title || "", releaseDate:raw.release_date || null,
        backdropPath:backdropPath, backdropUrl:backdropPath ? "https://image.tmdb.org/t/p/w1280" + backdropPath : "",
        tagline:raw.tagline || "", status:raw.status || "", runtime:Number(raw.runtime) || ctx.movieDetail.movie.runtime || null,
        productionCountries:Array.isArray(raw.production_countries) ? raw.production_countries.map(function (country) { return country.name || country.iso_3166_1; }) : [],
        imdbId:raw.external_ids && raw.external_ids.imdb_id ? raw.external_ids.imdb_id : (raw.imdb_id || ""),
        collection:raw.belongs_to_collection || null, popularity:Number(raw.popularity) || null
      });
      const providerRoot = providerResponse && providerResponse.results ? providerResponse.results : {};
      const data = {
        credits:raw.credits || {}, videos:raw.videos && raw.videos.results ? raw.videos.results : [],
        externalIds:raw.external_ids || {},
        recommendations:raw.recommendations && raw.recommendations.results ? raw.recommendations.results.map(ctx.fromTMDB) : [],
        similar:raw.similar && raw.similar.results ? raw.similar.results.map(ctx.fromTMDB) : [],
        providers:providerRoot.PA || null,
        providerResults:providerRoot,
        releaseDates:raw.release_dates && raw.release_dates.results ? raw.release_dates.results : []
      };
      if (ctx.movieDetail && ctx.sameMovieRecord(ctx.movieDetail.movie,movie)) {
        ctx.movieDetail.movie = detailsMovie; ctx.movieDetail.data = data; ctx.movieDetail.loading = false; ctx.movieDetail.error = "";
        ctx.movieDetailCache.set(id,{movie:detailsMovie,data:data});
        await persistMovieMetadata(detailsMovie);
        ctx.renderModal();
      }
    } catch (error) {
      if (ctx.movieDetail && ctx.sameMovieRecord(ctx.movieDetail.movie,movie)) {
        ctx.movieDetail.loading = false; ctx.movieDetail.error = error.message || "No se pudo cargar la ficha de TMDB."; ctx.renderModal();
      }
    }
  }

  async function persistMovieMetadata(movie) {
    if (!movie || !movie.title) return;
    const key = ctx.titleKey(movie.title);
    const metadata = {};
    ["id","tmdbId","year","genres","tags","overview","posterPath","posterUrl","voteAverage","voteCount","runtime","releaseDate","backdropPath","backdropUrl","tagline","status","productionCountries","productionCompanies","originalLanguage","spokenLanguages","collectionName","cast","directors","writers","composers","imdbId","tmdbCreditsFetchedAt","tmdbKeywordsFetchedAt","tmdbFetchedAt","metadataSource"].forEach(function (field) {
      if (movie[field] !== undefined && movie[field] !== null && movie[field] !== "") metadata[field] = movie[field];
    });
    function mergeMatching(list) {
      return (list || []).map(function (entry) { return ctx.sameMovieRecord(entry,movie) ? Object.assign({},entry,metadata) : entry; });
    }
    ctx.state.rated = mergeMatching(ctx.state.rated);
    ctx.state.watched = mergeMatching(ctx.state.watched);
    ctx.state.watchlist = mergeMatching(ctx.state.watchlist);
    ctx.state.hidden = mergeMatching(ctx.state.hidden);
    const movieId = ctx.movieTmdbId(movie);
    const index = ctx.customCatalog.findIndex(function (entry) {
      const existingId = ctx.movieTmdbId(entry);
      if (movieId && existingId) return movieId === existingId;
      return ctx.titleKey(entry.title) === key && !movieId && !existingId;
    });
    if (index >= 0) ctx.customCatalog[index] = Object.assign({},ctx.customCatalog[index],metadata,{title:movie.title,source:"tmdb"});
    else ctx.customCatalog.unshift(Object.assign({},metadata,{title:movie.title,source:"tmdb"}));
    await ctx.dbSet(ctx.CATALOG_KEY,ctx.customCatalog);
    await ctx.persistState();
    ctx.combineMovies();
  }

  function openPersonDetails(id, name, character) {
    ctx.personDetail = {id:String(id),name:name || "Persona",character:character || "",person:null,credits:null,loading:true,error:""};
    ctx.personListFilter = "all";
    ctx.renderModal();
    if (ctx.personDetailCache.has(String(id))) {
      ctx.personDetail = Object.assign(ctx.personDetail, ctx.personDetailCache.get(String(id)), {loading:false});
      ctx.renderModal();
      return;
    }
    if (!ctx.tmdbCredential || !ctx.tmdbCredential.value) {
      ctx.personDetail.loading = false; ctx.personDetail.error = "Conecta TMDB para consultar biografías y filmografías."; ctx.renderModal(); return;
    }
    const requestId = String(id);
    Promise.all([
      softTMDBRequest("/person/" + encodeURIComponent(requestId), {language:"es-ES"}),
      softTMDBRequest("/person/" + encodeURIComponent(requestId) + "/movie_credits", {language:"es-ES"})
    ]).then(function (responses) {
      if (!ctx.personDetail || ctx.personDetail.id !== requestId) return;
      ctx.personDetail.person = responses[0] || {};
      ctx.personDetail.credits = responses[1] || {cast:[],crew:[]};
      ctx.personDetail.loading = false;
      if (!responses[0]) ctx.personDetail.error = "No se pudo recuperar la ficha de esta persona.";
      ctx.personDetailCache.set(requestId,{person:ctx.personDetail.person,credits:ctx.personDetail.credits,error:ctx.personDetail.error});
      ctx.renderModal();
    });
  }

  return { softTMDBRequest, loadMovieDetail, persistMovieMetadata, openPersonDetails };
}
