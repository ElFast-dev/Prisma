(function () {
  "use strict";

  const $ = function (selector, root) { return (root || document).querySelector(selector); };
  const $$ = function (selector, root) { return Array.from((root || document).querySelectorAll(selector)); };
  const DB_NAME = "prisma-local-v1";
  const DB_STORE = "kv";
  const STATE_KEY = "state";
  const CATALOG_KEY = "catalogCustom";
  const TMDB_CREDENTIAL_KEY = "tmdbCredential";
  const TMDB_API_BASE = "https://api.themoviedb.org/3";
  const TMDB_LOGO_URL = "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg";
  const EMOTIONS = ["Asombro", "Alegría", "Tristeza", "Tensión", "Sorpresa", "Miedo", "Esperanza", "Curiosidad", "Empatía", "Nostalgia", "Frustración", "Alivio", "Ilusión", "Inquietud"];
  const GENRE_LABELS = {
    "science fiction": "Ciencia ficción", "sci-fi": "Ciencia ficción", "sci fi": "Ciencia ficción",
    "thriller": "Suspenso", "mystery": "Misterio", "crime": "Crimen", "drama": "Drama",
    "action": "Acción", "adventure": "Aventura", "fantasy": "Fantasía", "romance": "Romance",
    "comedy": "Comedia", "horror": "Terror", "animation": "Animación", "anime": "Anime",
    "war": "Bélica", "sport": "Deportes", "sports": "Deportes", "family": "Familiar",
    "biography": "Biografía", "music": "Música", "history": "Historia", "documentary": "Documental"
  };

  let dbPromise = null;
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
  let tmdbGenres = new Map();
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

  function emptyState() {
    return { version: 2, rated: [], watched: [], watchlist: [], hidden: [], events: [], updatedAt: null, importedAt: null };
  }

  function openDB() {
    if (!("indexedDB" in window)) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = function () {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "key" });
      };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { resolve(null); };
      request.onblocked = function () { resolve(null); };
    });
    return dbPromise;
  }

  async function dbGet(key) {
    const db = await openDB();
    if (!db) {
      try { return JSON.parse(localStorage.getItem("prisma:" + key) || "null"); } catch (_) { return null; }
    }
    return new Promise(function (resolve) {
      const tx = db.transaction(DB_STORE, "readonly");
      const request = tx.objectStore(DB_STORE).get(key);
      request.onsuccess = function () { resolve(request.result ? request.result.value : null); };
      request.onerror = function () {
        try { resolve(JSON.parse(localStorage.getItem("prisma:" + key) || "null")); } catch (_) { resolve(null); }
      };
    });
  }

  async function dbSet(key, value) {
    const db = await openDB();
    if (!db) {
      localStorage.setItem("prisma:" + key, JSON.stringify(value));
      return;
    }
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put({ key: key, value: value });
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () {
        try { localStorage.setItem("prisma:" + key, JSON.stringify(value)); resolve(); }
        catch (error) { reject(error); }
      };
      tx.onabort = function () {
        try { localStorage.setItem("prisma:" + key, JSON.stringify(value)); resolve(); }
        catch (error) { reject(error); }
      };
    });
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function titleKey(value) {
    return String(value || "")
      .replace(/\s*\((19|20)\d{2}\)\s*$/, "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function movieTmdbId(entry) {
    const raw = entry && (entry.tmdbId || entry.tmId || entry.tmdb_id);
    const numeric = Number(raw);
    return Number.isSafeInteger(numeric) && numeric > 0 ? String(numeric) : "";
  }

  function movieIdentityKey(entry) {
    const id = movieTmdbId(entry);
    return id ? "tmdb:" + id : "title:" + titleKey(entry && entry.title);
  }

  function sameMovieRecord(left, right) {
    if (!left || !right) return false;
    const leftId = movieTmdbId(left);
    const rightId = movieTmdbId(right);
    if (leftId && rightId) return leftId === rightId;
    return titleKey(left.title) === titleKey(right.title);
  }

  function splitList(value) {
    if (Array.isArray(value)) return value.map(function (v) { return String(v).trim(); }).filter(Boolean);
    return String(value || "").split(/[|;,]/).map(function (v) { return v.trim(); }).filter(Boolean);
  }

  function displayGenre(value) {
    const raw = String(value || "").trim();
    return GENRE_LABELS[raw.toLowerCase()] || raw;
  }

  function normalizeMovie(movie) {
    const title = movie && (movie.title || movie.t || movie.name || movie.original_title || movie.originalTitle);
    if (!title) return null;
    let year = Number(movie.year || movie.releaseYear || movie.release_year || 0) || null;
    if (!year) {
      const match = String(title).match(/\(((?:19|20)\d{2})\)\s*$/);
      if (match) year = Number(match[1]);
    }
    const cleanTitle = String(title).replace(/\s*\(((?:19|20)\d{2})\)\s*$/, "").trim();
    const genres = splitList(movie.genres || movie.genre || movie.g);
    const tags = splitList(movie.tags || movie.keywords || movie.keywordsText || movie.labels);
    const overview = movie.overview || movie.plot || movie.description || movie.synopsis || "";
    const posterPath = movie.posterPath || movie.poster_path || "";
    const tmdbId = movie.tmdbId || movie.tmId || movie.tmdb_id || (movie.source === "tmdb" ? movie.id : null);
    return {
      id: String(movie.id || movie.tmdbId || movie.tmId || movie.tmdb_id || movie.movieId || titleKey(cleanTitle)),
      tmdbId: tmdbId && Number(tmdbId) > 0 ? String(tmdbId) : null,
      title: cleanTitle,
      year: year,
      genres: genres.map(displayGenre),
      tags: tags,
      overview: String(overview || ""),
      posterPath: posterPath,
      posterUrl: movie.posterUrl || (posterPath ? "https://image.tmdb.org/t/p/w500" + posterPath : ""),
      voteAverage: Number(movie.voteAverage || movie.vote_average || 0) || null,
      voteCount: Number(movie.voteCount || movie.vote_count || 0) || null,
      runtime: Number(movie.runtime || 0) || null,
      releaseDate: movie.releaseDate || movie.release_date || null,
      backdropPath: movie.backdropPath || movie.backdrop_path || "",
      backdropUrl: movie.backdropUrl || (movie.backdropPath || movie.backdrop_path ? "https://image.tmdb.org/t/p/w1280" + (movie.backdropPath || movie.backdrop_path) : ""),
      tagline: movie.tagline || "",
      status: movie.status || "",
      productionCountries: Array.isArray(movie.productionCountries) ? movie.productionCountries : (Array.isArray(movie.production_countries) ? movie.production_countries.map(function (country) { return country.name || country.iso_3166_1; }) : []),
      imdbId: movie.imdbId || movie.imdb_id || "",
      tmdbFetchedAt: movie.tmdbFetchedAt || null,
      metadataSource: movie.metadataSource || null,
      source: movie.source || "catalog"
    };
  }

  function uniqueStrings(items) {
    const seen = new Set();
    return (items || []).map(function (item) { return String(item).trim(); }).filter(function (item) {
      const key = item.toLowerCase();
      if (!item || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function mergeCatalogFields(target, source) {
    target.genres = uniqueStrings((target.genres || []).concat(source.genres || []));
    target.tags = uniqueStrings((target.tags || []).concat(source.tags || []));
    ["year","overview","posterPath","posterUrl","voteAverage","voteCount","runtime","releaseDate","backdropPath","backdropUrl","tagline","status","productionCountries","imdbId","tmdbFetchedAt","metadataSource"].forEach(function (field) {
      const current = target[field];
      const empty = current == null || current === "" || (Array.isArray(current) && current.length === 0);
      const incoming = source[field];
      const incomingEmpty = incoming == null || incoming === "" || (Array.isArray(incoming) && incoming.length === 0);
      if (empty && !incomingEmpty) target[field] = incoming;
    });
    if (!target.tmdbId && source.tmdbId) target.tmdbId = source.tmdbId;
    if (!target.id && source.id) target.id = source.id;
    return target;
  }

  function combineMovies() {
    const grouped = new Map();
    const baseRecords = seedCatalog.concat(customCatalog, state.watched || [], state.watchlist || [], state.hidden || []);
    const baseIdentities = new Set();
    function collect(raw, isBase) {
      const movie = normalizeMovie(raw);
      if (!movie) return;
      const title = titleKey(movie.title);
      if (!title) return;
      if (!grouped.has(title)) grouped.set(title, []);
      grouped.get(title).push({movie:movie,isBase:Boolean(isBase)});
      if (isBase) baseIdentities.add(movieIdentityKey(movie));
    }
    baseRecords.forEach(function (movie) { collect(movie,true); });
    (state.rated || []).forEach(function (movie) { collect(movie,false); });

    const combined = [];
    grouped.forEach(function (items) {
      const byTmdb = new Map();
      let noId = null;
      let noIdHasBase = false;
      items.forEach(function (record) {
        const movie = record.movie;
        const tmdbId = movieTmdbId(movie);
        if (!tmdbId) {
          noId = noId ? mergeCatalogFields(noId,movie) : Object.assign({},movie);
          noIdHasBase = noIdHasBase || record.isBase;
          return;
        }
        if (byTmdb.has(tmdbId)) {
          const prior = byTmdb.get(tmdbId);
          mergeCatalogFields(prior.movie,movie);
          prior.isBase = prior.isBase || record.isBase;
        } else {
          byTmdb.set(tmdbId,{movie:Object.assign({},movie),isBase:record.isBase});
        }
      });

      if (!byTmdb.size) {
        if (noId) {
          noId.key = movieIdentityKey(noId);
          if (!noIdHasBase) noId.source = "history";
          combined.push(noId);
        }
        return;
      }
      if (byTmdb.size === 1 && noId) {
        const only = Array.from(byTmdb.values())[0];
        mergeCatalogFields(only.movie,noId);
        only.isBase = only.isBase || noIdHasBase;
      }
      byTmdb.forEach(function (record) {
        const movie = record.movie;
        movie.key = movieIdentityKey(movie);
        if (!record.isBase && !baseIdentities.has(movie.key)) movie.source = "history";
        combined.push(movie);
      });
    });
    catalog = combined.sort(function (a,b) {
      return a.title.localeCompare(b.title,"es") ||
        (Number(a.year) || 0) - (Number(b.year) || 0) ||
        String(movieTmdbId(a)).localeCompare(String(movieTmdbId(b)));
    });
    catalogByTitle = new Map();
    catalog.forEach(function (movie) {
      const title = titleKey(movie.title);
      if (!catalogByTitle.has(title)) catalogByTitle.set(title,movie);
    });
  }

  function findMovie(title, tmdbId) {
    const id = movieTmdbId({tmdbId:tmdbId});
    if (id) return catalog.find(function (movie) { return movieTmdbId(movie) === id; }) || null;
    return catalogByTitle.get(titleKey(title)) || null;
  }

  function ratingFor(title, tmdbId) {
    const id = movieTmdbId({tmdbId:tmdbId});
    const key = titleKey(title);
    if (id) {
      const exactMatch = state.rated.find(function (entry) { return movieTmdbId(entry) === id; });
      if (exactMatch) return exactMatch;
      const sameTitle = state.rated.filter(function (entry) { return titleKey(entry.title) === key; });
      const noIdMatches = sameTitle.filter(function (entry) { return !movieTmdbId(entry); });
      return sameTitle.length === 1 && noIdMatches.length === 1 ? noIdMatches[0] : null;
    }
    return state.rated.find(function (entry) { return titleKey(entry.title) === key; }) || null;
  }


  function allGenres() {
    return uniqueStrings(catalog.reduce(function (all, movie) { return all.concat(movie.genres || []); }, []))
      .sort(function (a, b) { return a.localeCompare(b, "es"); });
  }

  function movieFeatures(movie, ratingEntry) {
    const entry = ratingEntry || {};
    const genres = entry.genres && entry.genres.length ? entry.genres : (movie && movie.genres) || [];
    const tags = entry.tags && entry.tags.length ? entry.tags : (movie && movie.tags) || [];
    return uniqueStrings(genres.map(function (g) { return "género: " + String(g).toLowerCase(); })
      .concat(tags.map(function (t) { return "tema: " + String(t).toLowerCase(); })));
  }

  function ratingValue(entry) {
    const value = Number(entry && (entry.rating != null ? entry.rating : (entry.r != null ? entry.r : entry.score)));
    return Number.isFinite(value) && value >= 1 && value <= 10 ? value : null;
  }

  function summaryStats() {
    const ratings = state.rated.map(ratingValue).filter(function (value) { return value != null; });
    const average = ratings.length ? ratings.reduce(function (sum, value) { return sum + value; }, 0) / ratings.length : null;
    const matched = state.rated.filter(function (entry) {
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId);
      return movieFeatures(movie, entry).length > 0;
    }).length;
    return {
      total: ratings.length,
      average: average,
      high: ratings.filter(function (value) { return value >= 8; }).length,
      tens: ratings.filter(function (value) { return value === 10; }).length,
      matched: matched,
      watchlist: state.watchlist.length,
      catalog: catalog.length
    };
  }

  function normalizeCredential(raw, kind) {
    const value = String(raw || "").trim();
    if (!value) return null;
    return { kind: kind === "apiKey" ? "apiKey" : "readToken", value: value };
  }

  async function tmdbRequest(path, params, credentialOverride) {
    const credential = credentialOverride || tmdbCredential;
    if (!credential || !credential.value) throw new Error("Conecta tu credencial de TMDB desde Datos.");
    const url = new URL(TMDB_API_BASE + path);
    Object.keys(params || {}).forEach(function (key) {
      if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
        url.searchParams.set(key, String(params[key]));
      }
    });
    const headers = { accept: "application/json" };
    if (credential.kind === "apiKey") url.searchParams.set("api_key", credential.value);
    else headers.Authorization = "Bearer " + credential.value;
    const response = await fetch(url.toString(), { method: "GET", headers: headers });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      if (response.status === 401) throw new Error("TMDB rechazó la credencial (401). Verifica que el token de lectura o la clave API v3 estén completos.");
      if (response.status === 403) throw new Error("TMDB denegó el acceso (403). Revisa las credenciales y los permisos de tu cuenta.");
      if (response.status === 429) throw new Error("TMDB limitó temporalmente las solicitudes. Espera un momento y vuelve a probar.");
      throw new Error((data && data.status_message) || ("TMDB respondió con HTTP " + response.status + "."));
    }
    return data;
  }

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
    tmdbGenres = new Map();
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


  async function ensureTMDBGenres() {
    if (tmdbGenres.size) return;
    const data = await tmdbRequest("/genre/movie/list", { language: "es-ES" });
    tmdbGenres = new Map((data.genres || []).map(function (genre) { return [Number(genre.id), genre.name]; }));
  }

  function fromTMDB(raw) {
    const releaseDate = String(raw.release_date || "");
    const year = releaseDate.length >= 4 ? Number(releaseDate.slice(0, 4)) : null;
    const genres = Array.isArray(raw.genres) && raw.genres.length ?
      raw.genres.map(function (item) { return item.name; }) :
      (raw.genre_ids || []).map(function (id) { return tmdbGenres.get(Number(id)); }).filter(Boolean);
    const keywordObject = raw.keywords || {};
    const keywords = keywordObject.keywords || keywordObject.results || [];
    const posterPath = raw.poster_path || "";
    return {
      id: String(raw.id),
      tmdbId: String(raw.id),
      title: raw.title || raw.original_title || "",
      year: year,
      genres: genres.map(displayGenre),
      tags: uniqueStrings(keywords.map(function (item) { return item.name; })),
      overview: raw.overview || "",
      posterPath: posterPath,
      posterUrl: posterPath ? "https://image.tmdb.org/t/p/w500" + posterPath : "",
      voteAverage: Number(raw.vote_average) || null,
      voteCount: Number(raw.vote_count) || null,
      runtime: Number(raw.runtime) || null,
      popularity: Number(raw.popularity) || null,
      releaseDate: raw.release_date || null,
      backdropPath: raw.backdrop_path || "",
      backdropUrl: raw.backdrop_path ? "https://image.tmdb.org/t/p/w1280" + raw.backdrop_path : "",
      tagline: raw.tagline || "",
      status: raw.status || "",
      productionCountries: Array.isArray(raw.production_countries) ? raw.production_countries.map(function (country) { return country.name || country.iso_3166_1; }) : [],
      imdbId: raw.imdb_id || "",
      tmdbFetchedAt: new Date().toISOString(),
      metadataSource: "tmdb",
      source: "tmdb"
    };
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
    status.textContent = (tmdbLoading ? "Consultando TMDB…" : (tmdbError ? "No se pudo completar la consulta." : label)) +
      (tmdbResults.length && !tmdbLoading && !tmdbError ? " · " + tmdbResults.length + " resultados cargados" : "");
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
    target.innerHTML = movieGrid(tmdbResults) +
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

  function buildProfile(trainingRatings) {
    const ratings = trainingRatings || state.rated;
    const valid = ratings.filter(function (entry) { return ratingValue(entry) != null; });
    const average = valid.length ? valid.reduce(function (sum, entry) { return sum + ratingValue(entry); }, 0) / valid.length : 6.5;
    const features = new Map();
    let withMetadata = 0;
    valid.forEach(function (entry) {
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId);
      const names = movieFeatures(movie, entry);
      if (!names.length) return;
      withMetadata += 1;
      const deviation = (ratingValue(entry) - average) / 4;
      names.forEach(function (name) {
        const item = features.get(name) || { sum: 0, count: 0, sumRating: 0 };
        item.sum += deviation;
        item.count += 1;
        item.sumRating += ratingValue(entry);
        features.set(name, item);
      });
    });
    features.forEach(function (item) {
      item.weight = item.sum / (item.count + 0.4);
      item.mean = item.sumRating / item.count;
    });
    return { average: average, features: features, count: valid.length, withMetadata: withMetadata };
  }

  function predictRating(movie, profile) {
    const features = movieFeatures(movie, null);
    const matches = features.map(function (feature) {
      const item = profile.features.get(feature);
      return item ? { name: feature.replace(/^género: |^tema: /, ""), weight: item.weight, count: item.count, mean: item.mean, raw: feature } : null;
    }).filter(Boolean);
    const weighted = matches.length ? matches.reduce(function (sum, item) { return sum + item.weight; }, 0) / matches.length : 0;
    const freshFeatures = features.filter(function (feature) { return !profile.features.has(feature); }).length;
    const score = Math.max(1, Math.min(10, profile.average + weighted * 2.3));
    const positive = matches.filter(function (item) { return item.weight > 0.08; }).sort(function (a, b) { return b.weight - a.weight; });
    const negative = matches.filter(function (item) { return item.weight < -0.08; }).sort(function (a, b) { return a.weight - b.weight; });
    const confidence = matches.length ? (profile.withMetadata < 8 ? "Inicial" : (matches.some(function (item) { return item.count >= 3; }) ? "Moderada" : "Limitada")) : "Muy baja";
    let explanation;
    if (positive.length) {
      explanation = "Coincide con señales positivas de tu historial: " + positive.slice(0, 2).map(function (item) { return item.name; }).join(" y ") + ".";
    } else if (matches.length) {
      explanation = "Comparte características que aún no han mostrado una preferencia clara en tus notas.";
    } else {
      explanation = "Todavía no hay suficientes características enlazadas para explicar esta recomendación; se usa tu nota media como referencia.";
    }
    if (negative.length && positive.length < 2) explanation += " Señal a vigilar: " + negative[0].name + ".";
    return {
      score: score,
      matches: matches,
      explanation: explanation,
      confidence: confidence,
      freshFeatures: freshFeatures,
      reasonFeatures: positive.slice(0, 3).map(function (item) { return item.name; })
    };
  }

  function getRecommendations(limit) {
    const profile = buildProfile();
    const ratedKeys = new Set(state.rated.map(movieIdentityKey));
    const pendingKeys = new Set(state.watchlist.map(movieIdentityKey));
    const watchedKeys = new Set((state.watched || []).map(movieIdentityKey));
    const hiddenKeys = new Set((state.hidden || []).map(movieIdentityKey));
    const results = catalog.filter(function (movie) {
      return !ratedKeys.has(movie.key) && !pendingKeys.has(movie.key) && !watchedKeys.has(movie.key) && !hiddenKeys.has(movie.key) && movie.source !== "history";
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

  function evaluateModel() {
    const mapped = state.rated.filter(function (entry) {
      const movie = findMovie(entry.title,entry.tmdbId || entry.tmId);
      return ratingValue(entry) != null && movieFeatures(movie, entry).length > 0;
    });
    if (mapped.length < 5) return { available: false, count: mapped.length, mae: null };
    let errors = [];
    mapped.forEach(function (heldOut, index) {
      const training = mapped.filter(function (_, i) { return i !== index; });
      const profile = buildProfile(training);
      const movie = findMovie(heldOut.title);
      const predicted = predictRating(movie || heldOut, profile).score;
      errors.push(Math.abs(predicted - ratingValue(heldOut)));
    });
    return { available: true, count: errors.length, mae: errors.reduce(function (sum, e) { return sum + e; }, 0) / errors.length };
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

  function cardColor(movie) {
    const text = (movie.genres || []).join(" ");
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    return 199 + Math.abs(hash) % 24;
  }

  function movieCard(movie, options) {
    const opts = options || {};
    const hue = cardColor(movie);
    const rating = ratingFor(movie.title,movie.tmdbId);
    const actionLabel = rating ? "Editar nota" : "Calificar";
    const score = movie.prediction ? '<div class="movie-score">✦ ' + movie.prediction.score.toFixed(1).replace(".", ",") + '/10 estimado</div>' : (rating ? '<div class="movie-score">★ Tu nota: ' + ratingValue(rating) + '/10</div>' : "");
    const meta = [movie.year, (movie.genres || []).slice(0, 2).map(displayGenre).join(" · ")].filter(Boolean).join(" · ");
    const posterBackground = 'background:radial-gradient(circle at 75% 22%,hsla(' + hue + ',65%,65%,.35),transparent 42%),linear-gradient(145deg,hsl(' + hue + ',32%,25%),#13131d 66%,hsl(' + ((hue + 14) % 360) + ',28%,19%))';
    const posterImage = movie.posterUrl ? '<img class="poster-image" data-tmdb-id="' + escapeHTML(movie.tmdbId || "") + '" src="' + escapeHTML(movie.posterUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '';
    const posterFallback = '<span class="poster-symbol" aria-hidden="true">✦</span><strong class="poster-title">' + escapeHTML(movie.title) + '</strong><span class="poster-year">' + escapeHTML(movie.year || "Película") + '</span>';
    if (opts.posterOnly) {
      return '<article class="movie-card movie-card-poster-only">' +
        '<button class="poster-art movie-poster-trigger" type="button" data-action="details" data-title="' + escapeHTML(movie.title) + '" data-tmdb-id="' + escapeHTML(movie.tmdbId || "") + '" aria-label="Ver detalles de ' + escapeHTML(movie.title) + '" style="' + posterBackground + '">' +
        posterImage + posterFallback + '</button></article>';
    }
    const detail = opts.compact ? "" : '<div class="movie-actions"><button class="btn btn-secondary" type="button" data-action="details" data-title="' + escapeHTML(movie.title) + '" data-tmdb-id="' + escapeHTML(movie.tmdbId || "") + '">Detalles</button><button class="btn btn-primary" type="button" data-action="rate" data-title="' + escapeHTML(movie.title) + '" data-tmdb-id="' + escapeHTML(movie.tmdbId || "") + '">' + actionLabel + '</button></div>';
    return '<article class="movie-card">' +
      '<div class="poster-art" role="img" aria-label="Tarjeta de ' + escapeHTML(movie.title) + '" style="' + posterBackground + '">' +
      posterImage + posterFallback + '</div>' +
      '<div class="movie-copy"><h3 class="movie-title">' + escapeHTML(movie.title) + '</h3><div class="movie-meta">' + escapeHTML(meta || "Metadatos pendientes") + '</div>' + score + detail + '</div></article>';
  }

  function infoButton(topic, label) {
    const accessibleLabel = label || "Más información";
    return '<button class="info-button" type="button" data-action="show-info" data-info="' + escapeHTML(topic) + '" aria-label="' + escapeHTML(accessibleLabel) + '" title="' + escapeHTML(accessibleLabel) + '">!</button>';
  }

  function metric(label, value, note) {
    return '<div class="metric-card"><div class="metric-label">' + label + '</div><div class="metric-value">' + value + '</div>' + (note ? '<div class="metric-note">' + note + '</div>' : "") + '</div>';
  }


  function sectionHead(title, description, action) {
    return '<div class="section-head"><div><h2>' + title + '</h2><p>' + description + '</p></div>' + (action || "") + '</div>';
  }

  function ratedMetadataCount() {
    return buildProfile().withMetadata;
  }

  function renderHome() {
    const stats = summaryStats();
    const history = getCollectionItems("history").sort(function (a,b) { return dateScore(b.watchedAt)-dateScore(a.watchedAt); });
    const genres = genreStats().slice().sort(function (a,b) { return b.average-a.average; }).slice(0,6);
    const events = state.events.slice(0,5).map(function (event) {
      return '<div class="event-item"><div class="event-mark">' + escapeHTML(event.symbol || "•") + '</div><div class="event-copy"><strong>' + escapeHTML(event.title) + '</strong><small>' + escapeHTML(event.description) + ' · ' + escapeHTML(formatDate(event.at)) + '</small></div></div>';
    }).join("");
    const onboarding = stats.total === 0 ?
      '<section class="onboarding-callout progress-onboarding" aria-labelledby="progress-onboarding-title">' +
      '<span class="empty-icon" aria-hidden="true">✦</span>' +
      '<div class="onboarding-copy"><strong id="progress-onboarding-title">Empieza a construir tu perfil</strong><p>Valora algunas películas o importa tu historial para que Prisma detecte los géneros y temas que disfrutas.</p></div>' +
      '<div class="progress-onboarding-actions"><button class="btn btn-primary btn-small" type="button" data-nav="catalog">Explorar películas</button><button class="btn btn-secondary btn-small" type="button" data-nav="data">Importar historial</button></div>' +
      '</section>' : "";
    return '<section class="page-heading"><h1>Progreso</h1>' + infoButton("progress","Información sobre Progreso") + '<button class="btn btn-secondary btn-small page-heading-action" type="button" data-nav="lab">Laboratorio ↗</button></section>' +
      onboarding +
      '<div class="metrics-grid progress-metrics">' +
      metric("Vistas",String(history.length),"") +
      metric("Valoradas",String(stats.total),"") +
      metric("Pendientes",String(state.watchlist.length),"") +
      metric("Nota media",stats.average == null ? "—" : stats.average.toFixed(1).replace(".",","),"") +
      '</div>' +
      '<div class="progress-columns"><section class="panel"><div class="panel-head"><h3>Géneros mejor valorados</h3>' + infoButton("genres","Información sobre las tendencias por género") + '</div>' +
      (genres.length ? '<div class="bar-list">' + genres.map(function (item) { return barRow(displayGenre(item.name),item.average,10,item.average.toFixed(1).replace(".",",") + " · " + item.count); }).join("") + '</div>' : '<div class="empty-inline progress-empty"><span>Las tendencias aparecerán cuando tengas valoraciones suficientes.</span></div>') +
      '</section><section class="panel"><div class="panel-head"><h3>Actividad reciente</h3></div>' +
      (events ? '<div class="event-list">' + events + '</div>' : '<div class="empty-inline"><strong>Sin actividad reciente</strong></div>') +
      '</section></div>';
  }


  function movieGrid(movies) {
    return '<div class="movie-grid poster-grid">' + movies.map(function (movie) { return movieCard(movie,{posterOnly:true}); }).join("") + '</div>';
  }

  function filterCatalog() {
    const query = titleKey(catalogQuery);
    return catalog.filter(function (movie) {
      const text = titleKey(movie.title + " " + (movie.genres || []).join(" ") + " " + (movie.tags || []).join(" ") + " " + (movie.year || ""));
      const queryOkay = !query || text.indexOf(query) >= 0;
      const genreOkay = activeGenre === "Todos" || (movie.genres || []).some(function (genre) { return titleKey(genre) === titleKey(activeGenre); });
      return queryOkay && genreOkay && !isHidden(movie.title, movie.tmdbId);
    });
  }

  function renderCatalogResults() {
    const target = $("#localCatalogResults");
    if (!target) return;
    const results = filterCatalog();
    const cap = 80;
    const truncated = results.length > cap;
    target.innerHTML = results.length ?
      movieGrid(results.slice(0, cap)) + (truncated ? '<p class="kicker result-cap">Mostrando 80 de ' + results.length.toLocaleString("es-PA") + ' resultados. Refina la búsqueda para ver menos.</p>' : "") :
      '<div class="empty-state"><div class="empty-icon">⌕</div><h3>No encontramos esa película</h3><p>Prueba con otro título o conecta TMDB para ampliar la búsqueda.</p><button class="btn btn-secondary" type="button" data-action="import-catalog">Importar CSV</button></div>';
    const count = $("#catalogCount");
    if (count) count.textContent = results.length.toLocaleString("es-PA") + " películas";
  }

  function renderCatalog() {
    const genres = ["Todos"].concat(allGenres());
    const genreChips = genres.slice(0,13).map(function (genre) {
      return '<button class="chip ' + (activeGenre === genre ? "active" : "") + '" type="button" data-action="genre" data-genre="' + escapeHTML(genre) + '">' + escapeHTML(displayGenre(genre)) + '</button>';
    }).join("");
    const recs = getRecommendations(4);
    const searchCaption = catalogQuery.trim() ? 'Resultados para «' + escapeHTML(catalogQuery.trim()) + '»' : "Catálogo";
    return '<section class="page-heading discover-heading"><h1>Descubrir</h1>' + infoButton("discover","Información sobre Descubrir") + '<span class="discover-count">' + catalog.length.toLocaleString("es-PA") + ' títulos</span></section>' +
      '<section class="discover-recommendations"><div class="section-head"><h2>Recomendadas para ti</h2>' + infoButton("recommendations","Cómo funcionan las recomendaciones") + '</div>' +
      (recs.length ? '<div class="movie-grid poster-grid featured-recommendations">' + recs.map(function (movie) { return movieCard(movie,{posterOnly:true}); }).join("") + '</div>' : '<div class="empty-inline"><strong>No hay recomendaciones todavía</strong><button class="btn btn-secondary btn-small" type="button" data-nav="library">Abrir colección</button></div>') +
      '</section>' +
      '<section class="panel tmdb-browser discover-tmdb"><div class="panel-head"><h3>Explorar TMDB</h3>' + infoButton("tmdb","Información sobre TMDB") + '</div><div id="tmdbStatus" class="kicker"></div><div id="tmdbResults" class="tmdb-results"></div></section>' +
      '<section class="local-catalog-section"><div class="section-head"><h2 id="catalogSearchTitle">' + searchCaption + '</h2><span id="catalogCount">Cargando…</span><button class="btn btn-secondary btn-small" type="button" data-action="import-catalog" aria-label="Importar catálogo CSV">＋ CSV</button></div><div class="chip-row catalog-genre-chips">' + genreChips + '</div><div id="localCatalogResults"></div></section>';
  }


  function dateScore(value) {
    if (!value) return 0;
    const number = new Date(value).getTime();
    return Number.isFinite(number) ? number : 0;
  }

  function latestRecordDate(entry) {
    return entry && (entry.watchedAt || entry.addedAt || entry.rA || entry.date || entry.updatedAt || null);
  }

  function enrichCollectionMovie(entry) {
    const stored = entry || {};
    const known = findMovie(stored.title,stored.tmdbId || stored.tmId) || {};
    const result = Object.assign({},known,stored);
    ["posterUrl","posterPath","overview","releaseDate","backdropUrl","runtime","voteAverage","voteCount","tmdbId","status","imdbId"].forEach(function (key) {
      if (!result[key]) result[key] = known[key] || (key === "posterUrl" ? "" : null);
    });
    if (!Array.isArray(result.genres) || !result.genres.length) result.genres = known.genres || [];
    if (!Array.isArray(result.tags) || !result.tags.length) result.tags = known.tags || [];
    result.watchedAt = result.watchedAt || latestRecordDate(stored);
    return result;
  }

  function getCollectionItems(tab) {
    const key = tab || collectionTab;
    let items = [];
    if (key === "history") {
      const map = new Map();
      (state.watched || []).forEach(function (entry) {
        if (entry && entry.title) map.set(movieIdentityKey(entry),enrichCollectionMovie(entry));
      });
      state.rated.forEach(function (entry) {
        if (!entry || !entry.title) return;
        const identity = movieIdentityKey(entry);
        const prior = map.get(identity) || {};
        map.set(identity,enrichCollectionMovie(Object.assign({},prior,entry,{
          rating:ratingValue(entry),
          watchedAt:prior.watchedAt || latestRecordDate(entry)
        })));
      });
      items = Array.from(map.values()).filter(function (item) {
        return !(state.hidden || []).some(function (hidden) { return sameMovieRecord(hidden,item); });
      });
    } else if (key === "pending") {
      items = (state.watchlist || []).map(enrichCollectionMovie).filter(function (item) {
        return !(state.hidden || []).some(function (hidden) { return sameMovieRecord(hidden,item); });
      });
    } else {
      items = (state.hidden || []).map(enrichCollectionMovie);
    }
    const query = titleKey(collectionQuery);
    if (query) {
      items = items.filter(function (item) {
        return titleKey([item.title,item.year,item.overview,(item.genres || []).join(" ")].join(" ")).indexOf(query) >= 0;
      });
    }
    if (collectionGenres.length) {
      items = items.filter(function (item) {
        const genres = (item.genres || []).map(function (genre) { return titleKey(displayGenre(genre)); });
        return collectionGenres.some(function (genre) { return genres.indexOf(titleKey(genre)) >= 0; });
      });
    }
    if (key === "pending" && onlyReleased) {
      const now = new Date();
      const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
      items = items.filter(function (item) {
        if (item.releaseDate) return item.releaseDate <= today;
        return item.year && Number(item.year) <= now.getFullYear();
      });
    }
    const multiplier = collectionDirection === "asc" ? 1 : -1;
    if (collectionSort === "random") items.sort(function () { return Math.random() - .5; });
    else items.sort(function (a,b) {
      let result = 0;
      if (collectionSort === "title") result = String(a.title || "").localeCompare(String(b.title || ""),"es");
      else if (collectionSort === "rating") result = (ratingValue(a) || 0) - (ratingValue(b) || 0);
      else if (collectionSort === "public") result = (hasTrustedTMDBScore(a) ? Number(a.voteAverage) : 0) - (hasTrustedTMDBScore(b) ? Number(b.voteAverage) : 0);
      else if (collectionSort === "runtime") result = (Number(a.runtime) || 0) - (Number(b.runtime) || 0);
      else if (collectionSort === "release") result = dateScore(a.releaseDate) - dateScore(b.releaseDate) || (Number(a.year) || 0) - (Number(b.year) || 0);
      else result = dateScore(latestRecordDate(a)) - dateScore(latestRecordDate(b));
      return result * multiplier || String(a.title || "").localeCompare(String(b.title || ""),"es") || String(movieTmdbId(a)).localeCompare(String(movieTmdbId(b)));
    });
    return items;
  }

  function isInHistory(title, tmdbId) {
    const target = {title:title,tmdbId:tmdbId};
    return state.rated.some(function (entry) { return sameMovieRecord(entry,target); }) ||
      (state.watched || []).some(function (entry) { return sameMovieRecord(entry,target); });
  }

  function isHidden(title, tmdbId) {
    const target = {title:title,tmdbId:tmdbId};
    return (state.hidden || []).some(function (entry) { return sameMovieRecord(entry,target); });
  }

  function isInWatchlist(title, tmdbId) {
    const target = {title:title,tmdbId:tmdbId};
    return (state.watchlist || []).some(function (entry) { return sameMovieRecord(entry,target); });
  }

  function isMovieInCollection(title, tmdbId) {
    return isInHistory(title,tmdbId) || isInWatchlist(title,tmdbId) || isHidden(title,tmdbId);
  }


  function recentPoster(item) {
    return '<button class="recent-movie" type="button" data-action="details" data-title="' + escapeHTML(item.title) + '" data-tmdb-id="' + escapeHTML(item.tmdbId || "") + '">' +
      (item.posterUrl ? '<img class="recent-poster-image" data-tmdb-id="' + escapeHTML(item.tmdbId || "") + '" src="' + escapeHTML(item.posterUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '') +
      '<span class="recent-movie-meta">' + escapeHTML(item.year || "Película") + '</span><strong>' + escapeHTML(item.title) + '</strong></button>';
  }

  function collectionRow(item, tab) {
    const rating = ratingValue(item);
    const publicRating = hasTrustedTMDBScore(item) ?
      '<span class="collection-score public-score" title="Valoración pública de TMDB"><span aria-hidden="true">★</span> ' + Number(item.voteAverage).toFixed(1) + '</span>' :
      (item.tmdbId ? '<a class="collection-score score-link" href="https://www.themoviedb.org/movie/' + encodeURIComponent(item.tmdbId) + '" target="_blank" rel="noopener noreferrer" aria-label="Consultar puntuación pública de TMDB">↗</a>' : '<span class="collection-score score-muted">—</span>');
    const personalRating = tab === "pending" ? "" :
      (rating ? '<span class="collection-score personal-score"><span aria-hidden="true">★</span> ' + rating + '/10</span>' : '<span class="collection-score score-muted">Sin nota</span>');
    const release = item.releaseDate ? dateLabel(item.releaseDate) : (item.year || "Estreno pendiente");
    const synopsis = item.overview ? escapeHTML(item.overview) : "Sin sinopsis disponible.";
    const stateLabel = tab === "hidden" ? '<span class="collection-row-state">Oculta</span>' :
      (tab === "pending" ? '<span class="collection-row-state pending-state">Pendiente</span>' : "");
    return '<div class="collection-row">' +
      '<button class="collection-row-main" type="button" data-action="details" data-title="' + escapeHTML(item.title) + '" data-tmdb-id="' + escapeHTML(item.tmdbId || "") + '">' +
      '<span class="collection-row-poster">' + (item.posterUrl ? '<img data-tmdb-id="' + escapeHTML(item.tmdbId || "") + '" src="' + escapeHTML(item.posterUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="poster-fallback">▣</span>') + '</span>' +
      '<span class="collection-row-copy"><span class="collection-release">' + escapeHTML(release) + '</span><strong>' + escapeHTML(item.title) + '</strong><span class="collection-synopsis">' + synopsis + '</span></span>' +
      '</button><span class="collection-row-side"><span class="collection-row-scores">' + personalRating + publicRating + '</span>' + stateLabel + '</span></div>';
  }

  function collectionCompactCard(item) {
    const rating = ratingValue(item);
    const seenMarker = isInHistory(item.title,item.tmdbId) ? "seen" : (isInWatchlist(item.title,item.tmdbId) ? "pending" : "hidden");
    return '<button class="collection-compact-card" type="button" data-action="details" data-title="' + escapeHTML(item.title) + '" data-tmdb-id="' + escapeHTML(item.tmdbId || "") + '">' +
      '<span class="compact-poster">' + (item.posterUrl ? '<img data-tmdb-id="' + escapeHTML(item.tmdbId || "") + '" src="' + escapeHTML(item.posterUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '<span class="poster-fallback">▣</span>') + '<i class="collection-marker ' + seenMarker + '"></i></span>' +
      '<strong>' + escapeHTML(item.title) + '</strong><small>' + escapeHTML(item.year || "") + (rating ? " · ★ " + rating + "/10" : "") + '</small></button>';
  }

  function renderCollectionContent() {
    if (collectionMode === "lists") {
      const historyCount = getCollectionItems("history").length;
      const pendingCount = getCollectionItems("pending").length;
      const hiddenCount = getCollectionItems("hidden").length;
      const cards = [
        {tab:"history",title:"Historial",description:"",count:historyCount,icon:"✓"},
        {tab:"pending",title:"Pendientes",description:"",count:pendingCount,icon:"＋"},
        {tab:"hidden",title:"Ocultos",description:"",count:hiddenCount,icon:"◌"}
      ];
      return '<div class="system-lists-grid">' + cards.map(function (item) {
        return '<button class="system-list-card" type="button" data-action="collection-open-tab" data-tab="' + item.tab + '"><span class="system-list-icon">' + item.icon + '</span><span class="system-list-copy"><strong>' + item.title + '</strong></span><span class="system-list-count">' + item.count.toLocaleString("es-PA") + '</span></button>';
      }).join("") + '</div>';
    }
    const tab = collectionTab;
    const all = getCollectionItems(tab);
    const recent = tab === "history" ? all.slice().sort(function (a, b) { return dateScore(latestRecordDate(b)) - dateScore(latestRecordDate(a)); }).slice(0, 4) : [];
    const title = tab === "history" ? "Todos" : (tab === "pending" ? "Pendientes" : "Ocultos");
    const sortLabels = {title:"Título",public:"Mejores valorados",rating:"Mi valoración",runtime:"Duración",release:"Más reciente",added:"Añadidos recientemente",random:"Aleatorio"};
    const noItems = tab === "history" ? "Tu historial está vacío" : (tab === "pending" ? "No tienes películas pendientes" : "No has ocultado ninguna película");
    return (recent.length ? '<section class="recent-section"><div class="collection-section-title"><h2>Añadidos recientemente</h2><span>Últimos 4</span></div><div class="recent-grid">' + recent.map(recentPoster).join("") + '</div></section>' : "") +
      '<div class="collection-list-heading"><h2>' + title + ' <span>(' + all.length.toLocaleString("es-PA") + ')</span></h2><span class="sort-summary">' + escapeHTML(sortLabels[collectionSort] || "Añadidos recientemente") + '</span></div>' +
      (all.length ? (collectionLayout === "compact" ? '<div class="collection-compact-grid">' + all.map(function (item) { return collectionCompactCard(item); }).join("") + '</div>' : '<div class="collection-list">' + all.map(function (item) { return collectionRow(item,tab); }).join("") + '</div>') :
        '<div class="empty-state collection-empty"><div class="empty-icon">' + (tab === "hidden" ? "◌" : "▣") + '</div><h3>' + noItems + '</h3><p>' + (tab === "history" ? "Sin películas vistas." : (tab === "pending" ? "Sin películas pendientes." : "Sin películas ocultas.")) + '</p><button class="btn btn-secondary" type="button" data-nav="catalog">Descubrir películas</button></div>');
  }

  function refreshCollectionContent() {
    const root = $("#collectionResultsRoot");
    if (root) root.innerHTML = renderCollectionContent();
  }

  function renderLibrary() {
    const tabs = [
      {key:"history",label:"Historial",count:getCollectionItems("history").length},
      {key:"pending",label:"Pendientes",count:getCollectionItems("pending").length},
      {key:"hidden",label:"Ocultos",count:getCollectionItems("hidden").length}
    ];
    const modeSwitch = '<div class="collection-mode-switch" role="tablist" aria-label="Tipo de colección"><button type="button" role="tab" class="' + (collectionMode === "movies" ? "active" : "") + '" data-action="collection-mode" data-mode="movies" aria-selected="' + (collectionMode === "movies") + '">Películas</button><button type="button" role="tab" class="' + (collectionMode === "lists" ? "active" : "") + '" data-action="collection-mode" data-mode="lists" aria-selected="' + (collectionMode === "lists") + '">Listas</button></div>';
    const movieTabs = collectionMode === "movies" ?
      '<div class="collection-tabs" role="tablist" aria-label="Vistas de la colección">' + tabs.map(function (tab) { return '<button type="button" role="tab" class="' + (collectionTab === tab.key ? "active" : "") + '" data-action="collection-tab" data-tab="' + tab.key + '" aria-selected="' + (collectionTab === tab.key) + '">' + tab.label + '<span>' + tab.count.toLocaleString("es-PA") + '</span></button>'; }).join("") + '</div>' : "";
    const searchPanel = showCollectionSearch && collectionMode === "movies" ?
      '<label class="collection-search"><span aria-hidden="true">⌕</span><input type="search" data-collection-search value="' + escapeHTML(collectionQuery) + '" placeholder="Buscar en mi colección…" aria-label="Buscar solo en mi colección"><button type="button" data-action="toggle-collection-search" aria-label="Cerrar búsqueda">✕</button></label>' : "";
    const tools = collectionMode === "movies" ?
      '<div class="collection-tools"><div class="collection-tools-left"><button class="collection-tool collection-search-trigger" type="button" data-action="toggle-collection-search" aria-label="Buscar en mi colección" title="Buscar en mi colección"><span aria-hidden="true">⌕</span> Buscar</button><button class="collection-tool" type="button" data-action="open-sort"><span aria-hidden="true">⇅</span> Ordenar <i>' + (collectionDirection === "asc" ? "↑" : "↓") + '</i></button><button class="collection-tool ' + (collectionGenres.length ? "has-filter" : "") + '" type="button" data-action="open-genres"><span aria-hidden="true">☷</span> Géneros' + (collectionGenres.length ? '<b>' + collectionGenres.length + '</b>' : "") + '</button>' + (collectionTab === "pending" ? '<button class="collection-tool ' + (onlyReleased ? "has-filter" : "") + '" type="button" data-action="toggle-released" aria-pressed="' + onlyReleased + '">Estrenada</button>' : "") + '</div><div class="collection-tools-right"><button class="collection-view-toggle" type="button" data-action="toggle-layout" aria-label="Cambiar la vista">' + (collectionLayout === "list" ? "▦ Compacta" : "☰ Lista") + '</button>' + infoButton("collection","Información sobre tu colección") + '</div></div>' : "";
    return '<section class="collection-page">' + modeSwitch + movieTabs + searchPanel + tools +
      '<div id="collectionResultsRoot">' + renderCollectionContent() + '</div></section>';
  }


  function barRow(label, value, max, suffix) {
    const percent = max > 0 ? Math.max(3, Math.min(100, value / max * 100)) : 0;
    return '<div class="bar-row"><span class="bar-label" title="' + escapeHTML(label) + '">' + escapeHTML(label) + '</span><div class="bar-track"><div class="bar-fill" style="width:' + percent.toFixed(1) + '%"></div></div><span class="bar-value">' + escapeHTML(suffix || value) + '</span></div>';
  }

  function renderLab() {
    const stats = summaryStats();
    const profile = buildProfile();
    const evaluation = evaluateModel();
    const genres = genreStats();
    const overall = stats.average || 6.5;
    const top = genres.slice().sort(function (a,b) { return b.average-a.average; }).slice(0,7);
    const bottom = genres.slice().sort(function (a,b) { return a.average-b.average; }).slice(0,7);
    const events = state.events.slice(0,8).map(function (event) {
      return '<div class="event-item"><div class="event-mark">' + escapeHTML(event.symbol || "✦") + '</div><div class="event-copy"><strong>' + escapeHTML(event.title) + '</strong><small>' + escapeHTML(event.description) + ' · ' + escapeHTML(formatDate(event.at)) + '</small></div></div>';
    }).join("");
    const evaluationMarkup = evaluation.available ?
      '<div class="metric-value">' + evaluation.mae.toFixed(2).replace(".",",") + '</div><div class="metric-note">n=' + evaluation.count + '</div>' :
      '<div class="metric-value">—</div>';
    return '<section class="page-heading"><h1>Laboratorio</h1>' + infoButton("lab","Información sobre el Laboratorio") + '</section>' +
      '<div class="metrics-grid">' + metric("Historial enlazado",profile.withMetadata + "/" + stats.total,"") + metric("Señales",String(profile.features.size),"") + metric("Nota media",overall.toFixed(1).replace(".",","),"") + '</div>' +
      '<div class="lab-metadata-host">' + renderTMDBHistoryPanel() + '</div>' +
      '<div class="two-col lab-charts"><section class="panel"><div class="panel-head"><h3>Géneros mejor valorados</h3></div>' +
      (top.length ? '<div class="bar-list">' + top.map(function (item) { return barRow(displayGenre(item.name),item.average,10,item.average.toFixed(1).replace(".",",") + " · " + item.count); }).join("") + '</div>' : '<div class="empty-inline"><strong>Datos insuficientes</strong></div>') +
      '</section><section class="panel"><div class="panel-head"><h3>Géneros con notas más bajas</h3></div>' +
      (bottom.length ? '<div class="bar-list">' + bottom.map(function (item) { return barRow(displayGenre(item.name),item.average,10,item.average.toFixed(1).replace(".",",") + " · " + item.count); }).join("") + '</div>' : '<div class="empty-inline"><strong>Datos insuficientes</strong></div>') +
      '</section></div>' +
      '<div class="two-col lab-bottom"><section class="panel"><div class="panel-head"><h3>Validación del modelo</h3>' + infoButton("lab","Información sobre la validación") + '</div>' + evaluationMarkup + '</section>' +
      '<section class="panel"><div class="panel-head"><h3>Actividad reciente</h3></div>' + (events ? '<div class="event-list">' + events + '</div>' : '<div class="empty-inline"><strong>Sin actividad reciente</strong></div>') + '</section></div>';
  }


  function formatDate(value) {
    if (!value) return "fecha no disponible";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "fecha no disponible";
    return new Intl.DateTimeFormat("es-PA", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function renderTMDBSettings() {
    const kind = tmdbCredential && tmdbCredential.kind === "apiKey" ? "apiKey" : "readToken";
    const connected = Boolean(tmdbCredential && tmdbCredential.value);
    return '<section class="panel tmdb-settings"><div class="panel-head"><div class="panel-title-row"><h3>TMDB</h3>' + infoButton("privacy","Información sobre la conexión TMDB") + '</div><span class="badge ' + (connected ? "badge-mint" : "") + '">' + (connected ? "Conectado" : "Sin conectar") + '</span></div>' +
      '<div class="form-field"><label class="field-label" for="tmdbAuthType">Tipo de credencial</label><select id="tmdbAuthType" class="field"><option value="readToken" ' + (kind === "readToken" ? "selected" : "") + '>Token de acceso de lectura</option><option value="apiKey" ' + (kind === "apiKey" ? "selected" : "") + '>Clave API v3</option></select></div>' +
      '<div class="form-field"><label class="field-label" for="tmdbCredentialInput">Credencial TMDB</label><input class="field" id="tmdbCredentialInput" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + (connected ? "Guardada; deja vacío para conservarla" : "Pega aquí tu credencial") + '"></div>' +
      '<div class="hero-actions"><button class="btn btn-primary" type="button" data-action="save-tmdb">Guardar en este dispositivo</button><button class="btn btn-secondary" type="button" data-action="test-tmdb">Probar conexión</button>' + (connected ? '<button class="btn btn-danger" type="button" data-action="remove-tmdb">Eliminar credencial</button>' : "") + '</div>' +
      '</section>';
  }

  function renderData() {
    const stats = summaryStats();
    return '<section class="page-heading"><h1>Ajustes</h1>' + infoButton("privacy","Información sobre privacidad y datos") + '</section>' +
      renderTMDBSettings() +
      '<div class="data-metadata-host">' + renderTMDBHistoryPanel() + '</div>' +
      '<div class="settings-grid settings-grid-clean">' +
      '<section class="panel"><div class="panel-head"><h3>Importar historial JSON</h3>' + infoButton("import","Qué importa el JSON") + '</div><button class="btn btn-primary" type="button" data-action="import-json">Importar JSON</button></section>' +
      '<section class="panel"><div class="panel-head"><h3>Ampliar catálogo</h3>' + infoButton("import","Información sobre importaciones") + '</div><button class="btn btn-secondary" type="button" data-action="import-catalog">Importar CSV</button></section>' +
      '<section class="panel"><div class="panel-head"><h3>Copia de seguridad</h3>' + infoButton("privacy","Información sobre copias de seguridad") + '</div><div class="hero-actions"><button class="btn btn-secondary" type="button" data-action="export-backup">Exportar</button><button class="btn btn-quiet" type="button" data-action="restore-backup">Restaurar</button></div></section>' +
      '<section class="panel"><div class="panel-head"><h3>Estado del perfil</h3></div>' +
      '<div class="setting-row"><div><strong>Películas valoradas</strong></div><span class="badge">' + stats.total.toLocaleString("es-PA") + '</span></div>' +
      '<div class="setting-row"><div><strong>Metadatos enlazados</strong></div><span class="badge">' + stats.matched.toLocaleString("es-PA") + '</span></div>' +
      '<div class="setting-row"><div><strong>Última actualización</strong></div><span class="kicker">' + escapeHTML(formatDate(state.updatedAt)) + '</span></div>' +
      '<div class="setting-row"><div><strong>Restablecer perfil</strong></div><button class="btn btn-danger btn-small" type="button" data-action="reset">Borrar datos</button></div></section></div>';
  }


  function renderApp() {
    const root = $("#appRoot");
    if (!root) return;
    const primaryPage = currentPage === "lab" ? "home" : (currentPage === "data" ? "library" : currentPage);
    $$(".nav-item").forEach(function (button) { button.classList.toggle("active",button.dataset.nav === primaryPage); });
    const views = {home:renderHome,catalog:renderCatalog,library:renderLibrary,lab:renderLab,data:renderData};
    root.innerHTML = (views[currentPage] || renderHome)() + (currentPage === "data" ? renderTMDBAttribution() : "");
    if (currentPage === "catalog") {
      renderCatalogResults();
      renderTMDBResults();
    }
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

  function renderUtilitySheet() {
    const root = $("#modalRoot");
    if (!root || !utilitySheet) return;
    if (utilitySheet.type === "info") {
      const help = {
        progress:{title:"Progreso",body:"Resume las películas vistas, las notas y la media personal de este navegador. Las tendencias por género usan los metadatos enlazados disponibles."},
        discover:{title:"Descubrir",body:"Aquí tienes recomendaciones, búsqueda TMDB y catálogo local. Las recomendaciones no incluyen películas vistas, pendientes u ocultas."},
        recommendations:{title:"Recomendaciones",body:"Prisma compara géneros y etiquetas disponibles con tus valoraciones. La nota mostrada es una estimación personal, no una puntuación pública ni una garantía."},
        collection:{title:"Tu colección",body:"Historial reúne películas vistas o valoradas. Pendientes guarda títulos para más tarde. Ocultos los retira de recomendaciones sin borrar sus notas. La búsqueda y los filtros solo afectan a la colección."},
        genres:{title:"Géneros",body:"Puedes seleccionar varios. Se muestran películas que coinciden con al menos uno de los géneros escogidos."},
        metadata:{title:"Carátulas y datos",body:"El JSON aporta títulos, identificadores TMDB, fechas y valoraciones; no incluye imágenes ni sinopsis. Prisma usa los identificadores para recuperar carátulas, géneros, sinopsis, duración y otros datos. Los resultados se guardan en este navegador."},
        tmdb:{title:"TMDB",body:"TMDB proporciona imágenes y datos de películas. Si no hay dato externo verificable, Prisma ofrece un enlace en vez de inventar una puntuación."},
        import:{title:"Importar JSON",body:"Prisma importa movies.cH (vistas), movies.cW (pendientes) y movies.rM (valoraciones). Las series de shows se ignoran. Tus notas manuales existentes tienen prioridad."},
        privacy:{title:"Privacidad",body:"Notas, listas y credencial TMDB se guardan en este navegador. No publiques tu JSON en GitHub. Exporta una copia de seguridad antes de borrar los datos del navegador."},
        lab:{title:"Laboratorio",body:"Muestra patrones de tus valoraciones y comprueba el motor con el historial enlazado. Las medidas son experimentales."},
        ratings:{title:"Puntuaciones",body:"La puntuación pública aparece si la fuente la entrega. IMDb, Rotten Tomatoes y Metacritic se abren como enlaces si sus cifras no están disponibles directamente."}
      };
      const info = help[utilitySheet.key] || help.collection;
      root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet info-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><h2 id="sheetTitle">' + escapeHTML(info.title) + '</h2><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><p class="info-sheet-copy">' + escapeHTML(info.body) + '</p><button class="btn btn-primary sheet-accept" type="button" data-action="close-sheet">Entendido</button></section></div>';
      return;
    }
    if (utilitySheet.type === "sort") {
      const options = [
        {key:"title",label:"Título",hint:"Orden alfabético"},
        {key:"public",label:"Mejores valorados",hint:"Nota pública de TMDB"},
        {key:"rating",label:"Mi valoración",hint:"Tu nota del 1 al 10"},
        {key:"runtime",label:"Duración",hint:"Películas más largas o cortas"},
        {key:"release",label:"Más reciente",hint:"Fecha de estreno"},
        {key:"added",label:"Añadidos recientemente",hint:"Fecha en que guardaste la película"},
        {key:"random",label:"Aleatorio",hint:"Mezcla la lista"}
      ];
      root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><div class="eyebrow">PERSONALIZA TU LISTA</div><h2 id="sheetTitle">Ordenar por</h2></div><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><button class="sort-direction" type="button" data-action="toggle-sort-direction"><span>Dirección del orden</span><strong>' + (utilitySheet.direction === "asc" ? "Ascendente ↑" : "Descendente ↓") + '</strong></button><div class="sheet-options">' + options.map(function (item) {
        const active = utilitySheet.sort === item.key;
        return '<button type="button" class="sheet-option ' + (active ? "active" : "") + '" data-action="choose-sort" data-sort="' + item.key + '"><span><strong>' + item.label + '</strong><small>' + item.hint + '</small></span><span class="sheet-option-mark">' + (active ? (utilitySheet.direction === "asc" ? "↑" : "↓") : "") + '</span></button>';
      }).join("") + '</div><button class="btn btn-primary sheet-accept" type="button" data-action="accept-sort">Aceptar</button></section></div>';
      return;
    }
    if (utilitySheet.type === "genres") {
      const genres = uniqueStrings(COLLECTION_GENRES.concat(allGenres())).sort(function (a, b) { return a.localeCompare(b, "es"); });
      root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><div class="eyebrow">AFINA LA SELECCIÓN</div><h2 id="sheetTitle">Géneros</h2></div><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><p class="kicker">Puedes seleccionar varios géneros. Se mostrarán películas que coincidan con al menos uno.</p><div class="sheet-genre-grid">' + genres.map(function (genre) {
        const selected = utilitySheet.genres.some(function (value) { return titleKey(value) === titleKey(genre); });
        return '<button type="button" class="sheet-genre ' + (selected ? "selected" : "") + '" data-action="toggle-sheet-genre" data-genre="' + escapeHTML(genre) + '" aria-pressed="' + selected + '"><span>' + escapeHTML(genre) + '</span><b>' + (selected ? "✓" : "+") + '</b></button>';
      }).join("") + '</div><div class="sheet-footer-actions"><button class="btn btn-quiet" type="button" data-action="clear-sheet-genres">Limpiar</button><button class="btn btn-primary" type="button" data-action="accept-genres">Aceptar</button></div></section></div>';
      return;
    }
    const current = movieDetail ? movieDetail.movie : null;
    root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal utility-sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><div class="eyebrow">TU COLECCIÓN</div><h2 id="sheetTitle">Gestionar listas</h2><p>' + escapeHTML(current ? current.title : "") + '</p></div><button class="modal-close" type="button" data-action="close-sheet" aria-label="Cerrar">✕</button></div><div class="manage-list-actions"><button class="manage-list-action" type="button" data-action="manage-history"><span>✓</span><strong>' + (current && isInHistory(current.title) ? "Ya está en tu historial" : "Añadir al historial") + '</strong><small>Marcar como vista sin necesidad de poner una nota.</small></button><button class="manage-list-action" type="button" data-action="manage-pending"><span>＋</span><strong>' + (current && isInWatchlist(current.title) ? "Quitar de pendientes" : "Añadir a pendientes") + '</strong><small>Guardar para verla más adelante.</small></button><button class="manage-list-action" type="button" data-action="manage-hidden"><span>◌</span><strong>' + (current && isHidden(current.title) ? "Mostrar en Prisma" : "Ocultar película") + '</strong><small>Controla si aparece en Descubrir y en tus listas visibles.</small></button></div></section></div>';
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

  function niceRuntime(minutes) {
    const runtime = Number(minutes);
    if (!runtime || runtime < 1) return "—";
    return Math.floor(runtime / 60) + " h " + String(runtime % 60).padStart(2,"0") + " min";
  }

  function dateLabel(value) {
    if (!value) return "Fecha desconocida";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("es-PA",{day:"numeric",month:"long",year:"numeric"}).format(date);
  }

  function dateTimeLabel(value) {
    if (!value) return "Fecha desconocida";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("es-PA",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(date);
  }

  function displayMovieStatus(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "released") return "Estrenada";
    if (normalized.indexOf("post") >= 0) return "Post-producción";
    if (normalized.indexOf("production") >= 0) return "En producción";
    if (normalized.indexOf("planned") >= 0) return "En desarrollo";
    return status || "Estado desconocido";
  }

  function externalMovieUrl(movie, externalIds) {
    const imdb = (externalIds && externalIds.imdb_id) || (movie && movie.imdbId);
    return imdb ? "https://www.imdb.com/title/" + encodeURIComponent(imdb) + "/" :
      (movie && movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movie.tmdbId) : "https://www.themoviedb.org/");
  }

  function personImage(path) {
    return path ? "https://image.tmdb.org/t/p/w185" + path : "";
  }

  function hasTrustedTMDBScore(movie) {
    const film = movie || {};
    const average = Number(film.voteAverage);
    const trustedSource = film.metadataSource === "tmdb" || film.source === "tmdb";
    return trustedSource && Number.isFinite(average) && average > 0 && average <= 10;
  }

  function formatVoteCount(value) {
    const count = Number(value);
    if (!Number.isSafeInteger(count) || count < 1) return "";
    return count.toLocaleString("es-PA") + (count === 1 ? " voto" : " votos");
  }

  function buildRatingMetrics(movie, externalIds) {
    const film = movie || {};
    const title = String(film.title || "Película");
    const movieId = film.tmdbId ? String(film.tmdbId) : "";
    const tmdbUrl = movieId
      ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movieId)
      : "https://www.themoviedb.org/search?query=" + encodeURIComponent(title);
    const imdbId = (externalIds && externalIds.imdb_id) || film.imdbId || "";
    const imdbUrl = imdbId
      ? "https://www.imdb.com/title/" + encodeURIComponent(imdbId) + "/"
      : "https://www.imdb.com/find/?q=" + encodeURIComponent(title);
    const criticUrl = "https://www.rottentomatoes.com/search?search=" + encodeURIComponent(title);
    const metacriticUrl = "https://www.metacritic.com/search/" + encodeURIComponent(title) + "/";
    const average = Number(film.voteAverage);
    const hasScore = hasTrustedTMDBScore(film);
    const votes = hasScore ? formatVoteCount(film.voteCount) : "";
    const communityMetric = hasScore
      ? '<a class="detail-rating-card" href="' + escapeHTML(tmdbUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="Ver la puntuación de la comunidad de ' + escapeHTML(title) + ' en TMDB" title="Puntuación pública de TMDB"><strong>' + average.toFixed(1) + '</strong><span>Nota media</span><small>TMDB' + (votes ? ' · ' + escapeHTML(votes) : '') + '</small></a>'
      : '<a class="detail-rating-card rating-external" href="' + escapeHTML(tmdbUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="Consultar puntuación de ' + escapeHTML(title) + ' en TMDB"><strong>↗</strong><span>Consultar nota</span><small>TMDB</small></a>';

    return communityMetric +
      '<a class="detail-rating-card rating-external" href="' + escapeHTML(imdbUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="Buscar ' + escapeHTML(title) + ' en IMDb" title="Abrir IMDb"><strong>↗</strong><span>Buscar título</span><small>IMDb</small></a>' +
      '<a class="detail-rating-card rating-external" href="' + escapeHTML(criticUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="Buscar críticas y puntuaciones de ' + escapeHTML(title) + ' en Rotten Tomatoes" title="Buscar en Rotten Tomatoes"><strong>↗</strong><span>Buscar título</span><small>Rotten Tomatoes</small></a>' +
      '<a class="detail-rating-card rating-external" href="' + escapeHTML(metacriticUrl) + '" target="_blank" rel="noopener noreferrer" aria-label="Buscar críticas y puntuaciones de ' + escapeHTML(title) + ' en Metacritic" title="Buscar en Metacritic"><strong>↗</strong><span>Buscar título</span><small>Metacritic</small></a>';
  }

  function renderMovieDetails() {
    const root = $("#modalRoot");
    if (!root || !movieDetail) return;
    const movie = movieDetail.movie, data = movieDetail.data, rating = ratingFor(movie.title,movie.tmdbId);
    const seen = isInHistory(movie.title,movie.tmdbId), pending = isInWatchlist(movie.title,movie.tmdbId), hidden = isHidden(movie.title,movie.tmdbId);
    const backdrop = movie.backdropUrl || movie.posterUrl || "";
    const genreChips = (movie.genres || []).slice(0,6).map(function (genre) { return '<span class="detail-chip">' + escapeHTML(displayGenre(genre)) + '</span>'; }).join("");
    const countryLine = (movie.productionCountries || []).slice(0,3).join(" · ");
    const release = movie.releaseDate ? dateLabel(movie.releaseDate) : (movie.year || "Estreno no disponible");
    const markedAt = (state.watched || []).find(function (entry) { return sameMovieRecord(entry,movie); })?.watchedAt || (rating && (rating.watchedAt || rating.updatedAt)) || null;
    const stateButton = seen ?
      '<button class="btn btn-primary detail-state-button" type="button" data-action="manage-history"><span aria-hidden="true">▣</span> Añadido al historial <small>' + escapeHTML(markedAt ? dateTimeLabel(markedAt) : "Fecha no registrada") + '</small></button>' :
      (pending ?
        '<button class="btn btn-secondary detail-state-button" type="button" data-action="manage-pending"><span aria-hidden="true">✓</span> Añadido a pendientes</button><button class="btn btn-primary" type="button" data-action="mark-watched">Marcar como vista</button>' :
        '<button class="btn btn-primary" type="button" data-action="manage-history">Añadir al historial</button><button class="btn btn-secondary" type="button" data-action="manage-pending">＋ Pendientes</button>');
    const voteLink = movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movie.tmdbId) : "https://www.themoviedb.org/";
    const externalIds = data && data.externalIds ? data.externalIds : {};
    const ratingMetrics = buildRatingMetrics(movie,externalIds);
    const cast = data && data.credits && Array.isArray(data.credits.cast) ? data.credits.cast.slice(0,14) : [];
    const crew = data && data.credits && Array.isArray(data.credits.crew) ? data.credits.crew : [];
    const director = crew.find(function (person) { return person.job === "Director"; });
    const writers = crew.filter(function (person) { return /writer|screenplay|story/i.test(String(person.job || "")); }).slice(0,4);
    const music = crew.find(function (person) { return /original music|composer|music/i.test(String(person.job || "")); });
    const crewChips =
      (director ? '<button class="crew-person" type="button" data-action="person-details" data-person-id="' + director.id + '" data-person-name="' + escapeHTML(director.name) + '"><small>Dirección</small><strong>' + escapeHTML(director.name) + '</strong></button>' : "") +
      writers.map(function (person) { return '<button class="crew-person" type="button" data-action="person-details" data-person-id="' + person.id + '" data-person-name="' + escapeHTML(person.name) + '"><small>' + escapeHTML(person.job || "Guion") + '</small><strong>' + escapeHTML(person.name) + '</strong></button>'; }).join("") +
      (music ? '<button class="crew-person" type="button" data-action="person-details" data-person-id="' + music.id + '" data-person-name="' + escapeHTML(music.name) + '"><small>Música</small><strong>' + escapeHTML(music.name) + '</strong></button>' : "");
    const castMarkup = cast.length ? '<div class="person-carousel">' + cast.map(function (person) {
      return '<button class="cast-person" type="button" data-action="person-details" data-person-id="' + person.id + '" data-person-name="' + escapeHTML(person.name) + '" data-character="' + escapeHTML(person.character || "") + '"><span class="cast-photo">' + (person.profile_path ? '<img src="' + escapeHTML(personImage(person.profile_path)) + '" alt="" loading="lazy">' : '<span>●</span>') + '</span><strong>' + escapeHTML(person.name) + '</strong><small>' + escapeHTML(person.character || "Reparto") + '</small></button>';
    }).join("") + '</div>' : '<span class="kicker">—</span>';
    const providers = data && data.providers ? data.providers : null;
    const providerCards = [];
    if (providers) ["flatrate","free","ads","rent","buy"].forEach(function (kind) {
      (providers[kind] || []).forEach(function (provider) {
        if (!providerCards.some(function (existing) { return existing.id === provider.provider_id; })) providerCards.push({id:provider.provider_id,name:provider.provider_name,logo:provider.logo_path,kind:kind});
      });
    });
    const providerMarkup = providerCards.length ? '<div class="provider-list">' + providerCards.map(function (provider) {
      const label = provider.kind === "flatrate" ? "Streaming" : (provider.kind === "rent" ? "Alquiler" : (provider.kind === "buy" ? "Compra" : "Gratis / anuncios"));
      return '<a class="provider-chip" href="' + escapeHTML(providers.link || voteLink + "/watch") + '" target="_blank" rel="noopener noreferrer">' + (provider.logo ? '<img src="https://image.tmdb.org/t/p/w92' + escapeHTML(provider.logo) + '" alt="" loading="lazy">' : "") + '<span><strong>' + escapeHTML(provider.name) + '</strong><small>' + label + '</small></span></a>';
    }).join("") + '</div>' : (data ? '<a class="btn btn-secondary btn-small" href="' + escapeHTML(voteLink + "/watch") + '" target="_blank" rel="noopener noreferrer">Consultar disponibilidad ↗</a>' : '<span class="kicker">—</span>');
    const collection = data && movie.collection ? movie.collection : null;
    const collectionMarkup = collection ? '<a class="saga-card" href="https://www.themoviedb.org/collection/' + encodeURIComponent(collection.id) + '" target="_blank" rel="noopener noreferrer"><span class="saga-art">' + (collection.poster_path ? '<img src="https://image.tmdb.org/t/p/w185' + escapeHTML(collection.poster_path) + '" alt="" loading="lazy">' : "▣") + '</span><span><small>PERTENECE A LA COLECCIÓN</small><strong>' + escapeHTML(collection.name) + '</strong></span><span aria-hidden="true">↗</span></a>' : "";
    const recs = data && data.recommendations ? data.recommendations.slice(0,12) : [];
    const similarMarkup = recs.length ? '<div class="similar-carousel">' + recs.map(function (item) {
      const marker = isInHistory(item.title,item.tmdbId) ? "seen" : (isInWatchlist(item.title,item.tmdbId) ? "pending" : "");
      return '<button class="similar-poster" type="button" data-action="details" data-title="' + escapeHTML(item.title) + '" data-tmdb-id="' + escapeHTML(item.tmdbId || "") + '">' + (item.posterUrl ? '<img src="' + escapeHTML(item.posterUrl) + '" alt="" loading="lazy">' : '<span class="poster-fallback">▣</span>') + (marker ? '<i class="collection-marker ' + marker + '"></i>' : "") + '<strong>' + escapeHTML(item.title) + '</strong></button>';
    }).join("") + '</div>' : "";
    const videos = data && data.videos ? data.videos : [];
    const trailer = videos.find(function (video) { return video.site === "YouTube" && video.type === "Trailer"; }) || videos.find(function (video) { return video.site === "YouTube"; });
    const trailerUrl = trailer ? "https://www.youtube.com/watch?v=" + encodeURIComponent(trailer.key) : (movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movie.tmdbId) + "/videos" : "");
    root.innerHTML = '<div class="modal-backdrop detail-backdrop" data-action="backdrop-close"><section class="modal detail-sheet" role="dialog" aria-modal="true" aria-labelledby="detailTitle" data-modal-panel>' +
      '<div class="detail-scroll"><header class="detail-hero" style="' + (backdrop ? 'background-image:linear-gradient(180deg,rgba(4,8,14,.18) 0%,rgba(4,8,14,.22) 35%,#08101b 100%),url(&quot;' + escapeHTML(backdrop) + '&quot;)' : '') + '"><button class="detail-back" type="button" data-action="close-modal" aria-label="Volver">‹ <span>Volver</span></button><div class="detail-hero-title"><div class="eyebrow">' + escapeHTML(movie.year || "PELÍCULA") + (movie.originalTitle && movie.originalTitle !== movie.title ? ' · ' + escapeHTML(movie.originalTitle) : "") + '</div><h2 id="detailTitle">' + escapeHTML(movie.title) + '</h2>' + (movie.tagline ? '<p>' + escapeHTML(movie.tagline) + '</p>' : "") + '</div></header>' +
      '<div class="detail-body"><div class="detail-state-actions">' + stateButton + '<button class="btn btn-quiet" type="button" data-action="manage-lists">Gestionar listas</button><button class="btn btn-quiet" type="button" data-action="toggle-hidden">' + (hidden ? "Mostrar en Prisma" : "Ocultar") + '</button></div>' +
      '<div class="detail-meta-line"><span>Estreno <strong>' + escapeHTML(release) + '</strong></span><span>País <strong>' + escapeHTML(countryLine || "—") + '</strong></span><span>Duración <strong>' + escapeHTML(niceRuntime(movie.runtime)) + '</strong></span><span>Estado <strong>' + escapeHTML(displayMovieStatus(movie.status)) + '</strong></span></div>' +
      (genreChips ? '<div class="detail-chip-row">' + genreChips + '</div>' : "") +
      '<section class="detail-section"><div class="detail-section-heading"><h3>Puntuaciones</h3>' + infoButton("ratings","Información sobre puntuaciones externas") + '</div><div class="detail-rating-grid">' + ratingMetrics + '</div></section>' +
      '<section class="detail-section"><div class="detail-section-heading"><h3>Dónde verla</h3></div>' + providerMarkup + '</section>' +
      '<section class="detail-section synopsis-section"><div class="detail-section-heading"><h3>Sinopsis</h3></div>' + (movie.overview ? '<p>' + escapeHTML(movie.overview) + '</p>' : '<p class="kicker">Sin sinopsis.</p>') + '</section>' +
      '<div class="detail-action-strip"><button class="btn btn-primary" type="button" data-action="rate">' + (rating ? "Calificar · " + ratingValue(rating) + "/10" : "Calificar") + '</button><button class="btn btn-secondary" type="button" data-action="open-reviews">Comentarios</button><button class="btn btn-secondary" type="button" data-action="open-trailer">Tráiler</button><a class="btn btn-secondary" href="' + escapeHTML(externalMovieUrl(movie,externalIds)) + '" target="_blank" rel="noopener noreferrer">Enlace ↗</a><button class="btn btn-secondary" type="button" data-action="share-movie">Compartir</button></div>' +
      '<section class="detail-section"><div class="detail-section-heading"><h3>Reparto &amp; equipo</h3></div>' + castMarkup + (crewChips ? '<div class="crew-list">' + crewChips + '</div>' : "") + '</section>' +
      (collectionMarkup ? '<section class="detail-section"><div class="detail-section-heading"><h3>Colecciones</h3></div>' + collectionMarkup + '</section>' : "") +
      (similarMarkup ? '<section class="detail-section"><div class="detail-section-heading"><h3>También podría gustarte</h3></div>' + similarMarkup + '</section>' : "") +
      (movieDetail.loading ? '<div class="detail-loading"><span class="spinner"></span><p>Completando la ficha con TMDB…</p></div>' : "") +
      (movieDetail.error ? '<div class="notice detail-error"><strong>No se pudo completar la ficha.</strong> ' + escapeHTML(movieDetail.error) + '<button class="btn btn-secondary btn-small" type="button" data-action="retry-movie-detail">Reintentar</button></div>' : "") +
      (!data && !movieDetail.loading ? '<div class="detail-connection-note"><span>Completar ficha</span>' + infoButton("tmdb","Información sobre cómo se completa la ficha") + '<button class="btn btn-secondary btn-small" type="button" data-nav="data">Conectar TMDB</button></div>' : "") +
      '</div></div></section></div>';
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

  function personAge(birthday, deathday) {
    if (!birthday) return "Edad desconocida";
    const born = new Date(birthday), end = deathday ? new Date(deathday) : new Date();
    if (Number.isNaN(born.getTime()) || Number.isNaN(end.getTime())) return "Edad desconocida";
    let age = end.getFullYear() - born.getFullYear();
    if (end.getMonth() < born.getMonth() || (end.getMonth() === born.getMonth() && end.getDate() < born.getDate())) age -= 1;
    return age + " años";
  }

  function renderPersonDetails() {
    const root = $("#modalRoot");
    if (!root || !personDetail) return;
    const person = personDetail.person || {};
    const biography = person.biography || "";
    let credits = personDetail.credits ? (personDetail.credits.cast || []).concat(personDetail.credits.crew || []) : [];
    const seen = new Set();
    credits = credits.filter(function (movie) {
      if (!movie || !movie.id || seen.has(movie.id)) return false;
      seen.add(movie.id); return true;
    });
    if (personListFilter === "collection") credits = credits.filter(function (item) { return isMovieInCollection(item.title || item.name); });
    credits.sort(function (a,b) {
      const ay = Number(String(a.release_date || "").slice(0,4)) || 0, by = Number(String(b.release_date || "").slice(0,4)) || 0;
      if (!ay && by) return -1;
      if (ay && !by) return 1;
      return by - ay || String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""),"es");
    });
    const roles = personDetail.character ? '<span class="person-role">' + escapeHTML(personDetail.character) + '</span>' : "";
    const films = credits.map(function (item) {
      const movie = fromTMDB(item), year = item.release_date ? String(item.release_date).slice(0,4) : "TBA";
      const role = item.character || item.job || "";
      const marker = isMovieInCollection(movie.title,movie.tmdbId) ? '<span class="collection-marker ' + (isInHistory(movie.title,movie.tmdbId) ? "seen" : (isInWatchlist(movie.title,movie.tmdbId) ? "pending" : "hidden")) + '"></span>' : "";
      return '<button class="person-film-row" type="button" data-action="movie-from-person" data-title="' + escapeHTML(movie.title) + '" data-tmdb-id="' + escapeHTML(movie.tmdbId || "") + '"><span class="person-film-poster">' + (movie.posterUrl ? '<img src="' + escapeHTML(movie.posterUrl) + '" alt="" loading="lazy">' : '<span>▣</span>') + '</span><span class="person-film-copy"><span class="collection-release">' + year + '</span><strong>' + escapeHTML(movie.title) + '</strong><small>' + escapeHTML(role) + '</small><span>' + escapeHTML(item.overview || "Sin sinopsis disponible.") + '</span></span>' + marker + '<span class="film-clapper" aria-hidden="true">▣</span></button>';
    }).join("");
    root.innerHTML = '<div class="modal-backdrop detail-backdrop" data-action="backdrop-close"><section class="modal person-sheet" role="dialog" aria-modal="true" aria-labelledby="personTitle" data-modal-panel><div class="person-header"><button class="detail-back" type="button" data-action="person-back">‹ <span>Volver a la película</span></button><div class="person-header-content">' + (person.profile_path ? '<img src="https://image.tmdb.org/t/p/w342' + escapeHTML(person.profile_path) + '" alt="" class="person-portrait">' : '<div class="person-portrait person-portrait-empty">●</div>') + '<div><h2 id="personTitle">' + escapeHTML(person.name || personDetail.name) + '</h2>' + roles + '<p>' + escapeHTML(personAge(person.birthday,person.deathday)) + (person.birthday ? " · " + escapeHTML(dateLabel(person.birthday)) : "") + '</p><p>' + escapeHTML(person.place_of_birth || "Lugar de nacimiento desconocido") + '</p><a href="https://www.themoviedb.org/person/' + encodeURIComponent(personDetail.id) + '" target="_blank" rel="noopener noreferrer">Ver ficha en TMDB ↗</a></div></div></div><div class="person-body"><section class="detail-section"><div class="detail-section-heading"><h3>Biografía</h3></div><p>' + escapeHTML(biography || (personDetail.loading ? "Cargando biografía…" : "Sin biografía.")) + '</p></section><section class="detail-section"><div class="detail-section-heading"><h3>Filmografía</h3><span>' + credits.length + ' títulos</span></div><div class="person-filter-tabs"><button class="' + (personListFilter === "all" ? "active" : "") + '" type="button" data-action="person-filter" data-filter="all">Películas</button><button class="' + (personListFilter === "collection" ? "active" : "") + '" type="button" data-action="person-filter" data-filter="collection">Colección</button></div>' + (films ? '<div class="person-film-list">' + films + '</div>' : '<div class="empty-inline"><strong>Sin películas en esta vista</strong></div>') + '</section>' + (personDetail.error ? '<div class="notice">' + escapeHTML(personDetail.error) + '</div>' : "") + '</div></section></div>';
  }

  function renderRatingSheet() {
    const root = $("#modalRoot");
    if (!root || !modalDraft) return;
    const movie = modalDraft.movie, rating = ratingFor(movie.title,movie.tmdbId);
    const emotionChips = EMOTIONS.map(function (emotion) {
      return '<button type="button" class="emotion-chip ' + (modalDraft.emotions.indexOf(emotion) >= 0 ? "selected" : "") + '" data-action="emotion" data-emotion="' + escapeHTML(emotion) + '">' + escapeHTML(emotion) + '</button>';
    }).join("");
    const stars = Array.from({length:10},function (_,i) {
      const value = i + 1;
      return '<button type="button" class="rating-star ' + (value <= modalDraft.rating ? "active" : "") + '" data-action="rating-star" data-rating="' + value + '" aria-label="Puntuar ' + value + ' de 10" aria-pressed="' + (value === modalDraft.rating) + '">★</button>';
    }).join("");
    root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal rating-sheet" role="dialog" aria-modal="true" aria-labelledby="ratingTitle" data-modal-panel><div class="sheet-handle"></div><div class="sheet-heading"><div><h2 id="ratingTitle">Calificar</h2><p>' + escapeHTML(movie.title) + '</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Cerrar">✕</button></div><div class="rating-score-large"><strong id="ratingPreview">' + modalDraft.rating + '</strong><span>/ 10</span></div><div class="rating-stars" aria-label="Selecciona una nota">' + stars + '</div><input id="ratingInput" type="hidden" value="' + modalDraft.rating + '">' +
      '<details class="rating-memories"><summary>Añadir recuerdos (opcional)</summary><div class="form-field"><span class="field-label">¿Qué emociones recuerdas?</span><div class="emotion-grid">' + emotionChips + '</div></div><div class="form-field"><label class="field-label" for="ratingNote">¿Qué fue lo que más te hizo sentir?</label><textarea class="field" id="ratingNote" rows="3" placeholder="Una frase basta; también puedes dejarlo vacío.">' + escapeHTML(modalDraft.note) + '</textarea></div></details>' +
      '<div class="rating-sheet-actions">' + (rating ? '<button class="btn btn-danger-outline" type="button" data-action="delete-rating" data-title="' + escapeHTML(movie.title) + '" data-tmdb-id="' + escapeHTML(movie.tmdbId || "") + '">Eliminar</button>' : '<button class="btn btn-danger-outline" type="button" data-action="close-modal">Cancelar</button>') + '<button class="btn btn-primary" type="button" data-action="save-rating">Calificar</button></div></section></div>';
    const note = $("#ratingNote");
    if (note) note.addEventListener("input", function (event) { modalDraft.note = event.target.value; });
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


  async function saveRating() {
    if (!modalDraft) return;
    const movie = modalDraft.movie;
    const rating = Number($("#ratingInput").value);
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
      toast("La nota debe ser un número del 1 al 10.",true);
      return;
    }
    const existingIndex = state.rated.findIndex(function (entry) { return sameMovieRecord(entry,movie); });
    const old = existingIndex >= 0 ? state.rated[existingIndex] : {};
    const newEntry = Object.assign({},old,{
      id:old.id || movie.id,tmdbId:movie.tmdbId || old.tmdbId || null,
      title:movie.title,year:movie.year || old.year || null,rating:rating,
      posterPath:movie.posterPath || old.posterPath || "",posterUrl:movie.posterUrl || old.posterUrl || "",
      voteAverage:movie.voteAverage || old.voteAverage || null,voteCount:movie.voteCount || old.voteCount || null,runtime:movie.runtime || old.runtime || null,
      overview:movie.overview || old.overview || "",releaseDate:movie.releaseDate || old.releaseDate || null,
      backdropPath:movie.backdropPath || old.backdropPath || "",backdropUrl:movie.backdropUrl || old.backdropUrl || "",
      tmdbFetchedAt:movie.tmdbFetchedAt || old.tmdbFetchedAt || null,
      metadataSource:movie.metadataSource || old.metadataSource || (movie.source === "tmdb" ? "tmdb" : null),
      genres:uniqueStrings((old.genres || []).concat(movie.genres || [])),
      tags:uniqueStrings((old.tags || []).concat(movie.tags || [])),
      emotions:modalDraft.emotions.slice(),note:String(($("#ratingNote") || {}).value || "").trim(),
      updatedAt:new Date().toISOString(),source:"manual"
    });
    if (existingIndex >= 0) state.rated[existingIndex] = newEntry;
    else state.rated.unshift(newEntry);
    state.watchlist = state.watchlist.filter(function (entry) { return !sameMovieRecord(entry,movie); });
    const watchedIndex = (state.watched || []).findIndex(function (entry) { return sameMovieRecord(entry,movie); });
    const oldWatched = watchedIndex >= 0 ? state.watched[watchedIndex] : null;
    const watchedRecord = Object.assign({},oldWatched || {},newEntry,{
      watchedAt:(oldWatched && oldWatched.watchedAt) || old.watchedAt || old.updatedAt || new Date().toISOString()
    });
    if (watchedIndex >= 0) state.watched[watchedIndex] = watchedRecord;
    else state.watched.unshift(watchedRecord);
    logEvent("Valoración guardada: " + movie.title,"Nota " + rating + "/10" + (newEntry.emotions.length ? " · " + newEntry.emotions.length + " emociones registradas" : ""),"★");
    await persistState();
    const returnToDetails = ratingReturnDetail && Boolean(movieDetail);
    modalDraft = null;ratingReturnDetail = false;
    if (!returnToDetails) { movieDetail = null;$("#modalRoot").innerHTML = ""; }
    combineMovies();
    renderApp();
    if (returnToDetails) renderMovieDetails();
    toast("Tu experiencia quedó guardada en este dispositivo.");
  }

  async function deleteRating(title,tmdbId) {
    const target = {title:title,tmdbId:tmdbId || (modalDraft && modalDraft.movie.tmdbId) || ""};
    state.rated = state.rated.filter(function (entry) { return !sameMovieRecord(entry,target); });
    logEvent("Valoración eliminada",title,"−");
    await persistState();
    const returnToDetails = ratingReturnDetail && Boolean(movieDetail);
    modalDraft = null;ratingReturnDetail = false;
    if (!returnToDetails) { movieDetail = null;$("#modalRoot").innerHTML = ""; }
    combineMovies();
    renderApp();
    if (returnToDetails) renderMovieDetails();
    toast("Se quitó la valoración de " + title + ".");
  }

  function resolveMovieForAction(title,tmdbId) {
    const active = movieDetail && titleKey(movieDetail.movie.title) === titleKey(title) ? movieDetail.movie : null;
    const id = String(tmdbId || (active && active.tmdbId) || "");
    const target = {title:title,tmdbId:id};
    return (active && (!id || movieTmdbId(active) === id) ? active : null) ||
      findMovie(title,id) ||
      state.rated.find(function (entry) { return sameMovieRecord(entry,target); }) ||
      state.watchlist.find(function (entry) { return sameMovieRecord(entry,target); }) ||
      (state.watched || []).find(function (entry) { return sameMovieRecord(entry,target); }) ||
      (state.hidden || []).find(function (entry) { return sameMovieRecord(entry,target); }) ||
      {title:title,id:id || titleKey(title),tmdbId:id || null,genres:[],tags:[]};
  }

  async function toggleWatchlist(title,tmdbId) {
    const movie = resolveMovieForAction(title,tmdbId);
    const remove = isInWatchlist(movie.title,movie.tmdbId);
    if (remove) {
      state.watchlist = state.watchlist.filter(function (entry) { return !sameMovieRecord(entry,movie); });
      logEvent("Quitada de pendientes",title,"−");
      toast("Se quitó de tu lista.");
    } else {
      state.watchlist.unshift(Object.assign({},movie,{title:movie.title,addedAt:new Date().toISOString()}));
      logEvent("Añadida a pendientes",title,"＋");
      toast("Añadida a tu lista para verla después.");
    }
    await persistState();
    combineMovies();
    if (movieDetail) renderMovieDetails(); else renderApp();
  }

  async function markWatched(title,tmdbId) {
    const source = resolveMovieForAction(title,tmdbId);
    const index = (state.watched || []).findIndex(function (entry) { return sameMovieRecord(entry,source); });
    const previous = index >= 0 ? state.watched[index] : null;
    const watched = Object.assign({},previous || {},source,{watchedAt:(previous && previous.watchedAt) || new Date().toISOString()});
    if (index >= 0) state.watched[index] = watched;
    else state.watched.unshift(watched);
    state.watchlist = state.watchlist.filter(function (entry) { return !sameMovieRecord(entry,source); });
    logEvent("Añadida al historial",title,"✓");
    await persistState();
    combineMovies();
    if (movieDetail && sameMovieRecord(movieDetail.movie,source)) {
      movieDetail.movie = Object.assign({},movieDetail.movie,watched);
      renderMovieDetails();
    } else renderApp();
    toast("Marcada como vista.");
  }

  async function toggleHidden(title,tmdbId) {
    const movie = resolveMovieForAction(title,tmdbId);
    const remove = isHidden(movie.title,movie.tmdbId);
    if (remove) {
      state.hidden = state.hidden.filter(function (entry) { return !sameMovieRecord(entry,movie); });
    } else {
      state.hidden.unshift(Object.assign({},movie,{hiddenAt:new Date().toISOString()}));
    }
    logEvent(remove ? "Película mostrada" : "Película ocultada",title,"◌");
    await persistState();
    combineMovies();
    if (movieDetail && sameMovieRecord(movieDetail.movie,movie)) renderMovieDetails();
    else renderApp();
    toast(remove ? "La película vuelve a aparecer en Prisma." : "La película quedó oculta en tus recomendaciones.");
  }



  function movieMetadataFromJSON(root) {
    const scope = root && root.movies && typeof root.movies === "object" ? root.movies : root;
    const metaById = new Map();
    const metaByTmdb = new Map();
    const arrays = Object.entries(scope || {}).filter(function (entry) { return Array.isArray(entry[1]); });
    arrays.forEach(function (entry) {
      const name = entry[0].toLowerCase();
      if (/rating|rated|calif|^rm$|^rw$|episode|season|^pep$/.test(name)) return;
      entry[1].forEach(function (raw) {
        if (!raw || typeof raw !== "object") return;
        const mediaType = String(raw.media_type || raw.mediaType || raw.type || "").toLowerCase();
        if (mediaType === "tv" || mediaType === "series" || mediaType === "show") return;
        const title = raw.t || raw.title || raw.name || raw.original_title;
        if (!title) return;
        const record = normalizeMovie(raw);
        if (!record) return;
        if (raw.id != null) metaById.set(String(raw.id), record);
        if (raw.tmId != null) metaByTmdb.set(String(raw.tmId), record);
        if (raw.tmdb_id != null) metaByTmdb.set(String(raw.tmdb_id), record);
      });
    });
    return { scope: scope, metaById: metaById, metaByTmdb: metaByTmdb };
  }

  function extractPersonalCollections(root) {
    const scope = root && root.movies && typeof root.movies === "object" ? root.movies : root;
    const info = movieMetadataFromJSON(root);
    function findArray(names) {
      for (let i = 0; i < names.length; i += 1) {
        const key = Object.keys(scope || {}).find(function (candidate) { return candidate.toLowerCase() === names[i].toLowerCase(); });
        if (key && Array.isArray(scope[key])) return scope[key];
      }
      return [];
    }
    function convert(raw, type) {
      if (!raw || typeof raw !== "object") return null;
      const rawTmdb = raw.tmId != null ? raw.tmId : (raw.tmdbId != null ? raw.tmdbId : raw.tmdb_id);
      const numericId = Number(rawTmdb);
      const tmdbId = Number.isSafeInteger(numericId) && numericId > 0 ? String(numericId) : null;
      const localId = raw.id != null ? String(raw.id) : "";
      const matched = (tmdbId && info.metaByTmdb.get(tmdbId)) || info.metaById.get(localId) || null;
      const title = raw.t || raw.title || raw.name || (matched && matched.title);
      if (!title) return null;
      const forNormalization = Object.assign({}, matched || {}, raw, {
        id: localId || (matched && matched.id) || tmdbId || titleKey(title),
        title: String(title),
        tmId: tmdbId,
        tmdbId: tmdbId,
        year: (matched && matched.year) || raw.year || null,
        source: "imported-json"
      });
      const movie = normalizeMovie(forNormalization);
      if (!movie) return null;
      if (!tmdbId) movie.tmdbId = null;
      movie.source = "imported-json";
      movie.addedAt = raw.a || raw.addedAt || raw.createdAt || null;
      if (type === "watched") movie.watchedAt = raw.a || raw.watchedAt || raw.watched_at || null;
      if (type === "pending") movie.addedAt = raw.a || raw.addedAt || raw.createdAt || null;
      if (type === "hidden") movie.hiddenAt = raw.a || raw.hiddenAt || null;
      return movie;
    }
    const watchedRaw = findArray(["cH","watched","history","watched_movies","watchedmovies"]);
    const pendingRaw = findArray(["cW","watchlist","pending","watch_later","watchlater"]);
    const hiddenRaw = findArray(["cHid","hidden","hidden_movies","hiddenmovies"]);
    const watched = watchedRaw.map(function (raw) { return convert(raw, "watched"); }).filter(Boolean);
    const watchlist = pendingRaw.map(function (raw) { return convert(raw, "pending"); }).filter(Boolean);
    const hidden = hiddenRaw.map(function (raw) { return convert(raw, "hidden"); }).filter(Boolean);
    const records = mergeMovieListByTitle([], watched.concat(watchlist, hidden));
    return { watched:watched, watchlist:watchlist, hidden:hidden, records:records };
  }

  function hasImportedCollection(collection) {
    return Boolean(collection && ((collection.watched && collection.watched.length) || (collection.watchlist && collection.watchlist.length) || (collection.hidden && collection.hidden.length)));
  }

  function isEmptyMovieValue(value) {
    return value == null || value === "" || (Array.isArray(value) && value.length === 0);
  }

  function mergeMovieEntries(existing, incoming) {
    const old = existing || {};
    const fresh = incoming || {};
    const merged = Object.assign({}, fresh, old);
    Object.keys(fresh).forEach(function (key) {
      if (isEmptyMovieValue(merged[key]) && !isEmptyMovieValue(fresh[key])) merged[key] = fresh[key];
    });
    merged.genres = uniqueStrings((old.genres || []).concat(fresh.genres || []));
    merged.tags = uniqueStrings((old.tags || []).concat(fresh.tags || []));
    return merged;
  }

  function mergeMovieListByTitle(existing, incoming) {
    const map = new Map();
    (existing || []).forEach(function (entry) {
      if (entry && entry.title) map.set(movieIdentityKey(entry),entry);
    });
    (incoming || []).forEach(function (entry) {
      if (!entry || !entry.title) return;
      let key = movieIdentityKey(entry);
      let previous = map.get(key);
      if (!previous) {
        const sameTitleWithoutIdentity = Array.from(map.entries()).filter(function (pair) {
          return titleKey(pair[1].title) === titleKey(entry.title) &&
            (!movieTmdbId(pair[1]) || !movieTmdbId(entry));
        });
        if (sameTitleWithoutIdentity.length === 1) {
          const pair = sameTitleWithoutIdentity[0];
          map.delete(pair[0]);
          key = movieTmdbId(entry) ? movieIdentityKey(entry) : pair[0];
          previous = pair[1];
        }
      }
      map.set(key,mergeMovieEntries(previous,entry));
    });
    return Array.from(map.values());
  }


  function findRatingArrays(scope) {
    const arrays = Object.entries(scope || {}).filter(function (entry) {
      return Array.isArray(entry[1]) && /^(rm|ratings|ratedmovies|rated_movies|valoraciones|calificaciones|ratingsmovies)$/i.test(entry[0]);
    });
    return arrays.sort(function (a, b) {
      return (/^rm$/i.test(a[0]) ? 0 : 1) - (/^rm$/i.test(b[0]) ? 0 : 1);
    });
  }


  function extractPersonalRatings(root) {
    const info = movieMetadataFromJSON(root);
    const scope = info.scope;
    let arrays = findRatingArrays(scope);
    if (!arrays.length) arrays = findRatingArrays(root);
    let rawRatings = [];
    arrays.forEach(function (entry) { rawRatings = rawRatings.concat(entry[1]); });
    const imported = [];
    const seen = new Set();
    rawRatings.forEach(function (raw) {
      if (!raw || typeof raw !== "object") return;
      const rating = ratingValue({ rating: raw.r != null ? raw.r : (raw.rating != null ? raw.rating : raw.score) });
      if (rating == null) return;
      const id = raw.id != null ? String(raw.id) : "";
      const tmId = raw.tmId != null ? String(raw.tmId) : String(raw.tmdb_id || "");
      const meta = info.metaById.get(id) || info.metaByTmdb.get(tmId);
      const title = raw.t || raw.title || raw.name || (meta && meta.title);
      if (!title) return;
      const key = tmId && Number(tmId) > 0 ? "tmdb:" + tmId : "title:" + titleKey(title);
      if (!titleKey(title) || seen.has(key)) return;
      seen.add(key);
      imported.push({
        id: raw.id || (meta && meta.id) || key,
        tmId: raw.tmId || raw.tmdb_id || (meta && meta.tmId) || null,
        title: String(title).replace(/\s*\(((?:19|20)\d{2})\)\s*$/, ""),
        year: (meta && meta.year) || raw.year || null,
        rating: rating,
        genres: meta ? meta.genres : splitList(raw.genres || raw.genre),
        tags: meta ? meta.tags : splitList(raw.tags || raw.keywords),
        emotions: [],
        note: "",
        rA: raw.rA || raw.createdAt || null,
        updatedAt: raw.rA || raw.updatedAt || null,
        source: "imported"
      });
    });
    if (!imported.length && root && Array.isArray(root.rated)) {
      root.rated.forEach(function (raw) {
        const rating = ratingValue(raw);
        if (rating != null && (raw.title || raw.name)) imported.push(Object.assign({}, normalizeMovie(raw), { rating: rating, emotions: raw.emotions || [], note: raw.note || "", updatedAt: raw.updatedAt || null, source: "imported" }));
      });
    }
    return { ratings: imported, metadataRecords: info.metaById.size, ratingArrays: arrays.map(function (item) { return item[0]; }), rawRatingCount: rawRatings.length, skippedRatings: Math.max(0, rawRatings.length - imported.length) };
  }

  async function importPersonalJSON(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (parsed && parsed.format === "prisma-backup" && parsed.state) {
      state = ensureState(parsed.state);
      if (Array.isArray(parsed.catalogCustom)) {
        customCatalog = parsed.catalogCustom.map(normalizeMovie).filter(Boolean);
        await dbSet(CATALOG_KEY, customCatalog);
      }
      await persistState();
      combineMovies();
      renderApp();
      toast("Copia de Prisma restaurada.");
      return;
    }
    const result = extractPersonalRatings(parsed);
    const collection = extractPersonalCollections(parsed);
    if (!result.ratings.length && !hasImportedCollection(collection)) {
      throw new Error("No encontré películas vistas, pendientes ni valoraciones reconocibles. Comprueba que el JSON contenga movies.cH, movies.cW o movies.rM.");
    }

    const ratingMap = new Map(state.rated.map(function (entry) { return [movieIdentityKey(entry), entry]; }));
    result.ratings.forEach(function (entry) {
      const key = movieIdentityKey(entry);
      const old = ratingMap.get(key);
      if (old && old.source === "manual") return;
      const merged = mergeMovieEntries(old, entry);
      merged.rating = ratingValue(entry);
      merged.source = "imported";
      merged.updatedAt = entry.updatedAt || old && old.updatedAt || null;
      ratingMap.set(key, merged);
    });
    state.rated = Array.from(ratingMap.values()).filter(function (entry) { return ratingValue(entry) != null; });
    state.watched = mergeMovieListByTitle(state.watched, collection.watched);
    state.watchlist = mergeMovieListByTitle(state.watchlist, collection.watchlist);
    state.hidden = mergeMovieListByTitle(state.hidden, collection.hidden);

    const catalogIncoming = collection.records.concat(result.ratings).map(normalizeMovie).filter(Boolean);
    customCatalog = mergeMovieListByTitle(customCatalog, catalogIncoming);
    state.importedAt = new Date().toISOString();
    const importDescription = result.ratings.length.toLocaleString("es-PA") + " notas · " +
      collection.watched.length.toLocaleString("es-PA") + " vistas · " +
      collection.watchlist.length.toLocaleString("es-PA") + " pendientes";
    state.events.unshift({ title:"Colección importada", description:importDescription, symbol:"⇧", at:new Date().toISOString() });
    state.events = state.events.slice(0, 80);
    state.updatedAt = new Date().toISOString();
    await persistState();
    await dbSet(CATALOG_KEY, customCatalog);
    combineMovies();
    renderApp();
    const skippedText = result.skippedRatings ? " · " + result.skippedRatings + " nota sin título" : "";
    toast("Importadas " + result.ratings.length + " notas, " + collection.watched.length + " vistas y " + collection.watchlist.length + " pendientes" + skippedText + ".");
    if (tmdbCredential && tmdbCredential.value) {
      window.setTimeout(function () { enrichRatedHistoryWithTMDB(); }, 250);
    } else {
      toast("Conecta TMDB en Ajustes para recuperar las carátulas y las sinopsis.");
    }
  }


  function parseCSVLine(line, delimiter) {
    const result = [];
    let value = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { value += '"'; i += 1; }
        else inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(value);
        value = "";
      } else value += char;
    }
    result.push(value);
    return result;
  }

  function parseCatalogCSV(text) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(function (line) { return line.trim().length > 0; });
    if (lines.length < 2) throw new Error("El CSV parece vacío o no contiene filas de películas.");
    const delimiter = lines[0].indexOf("\t") >= 0 && lines[0].indexOf(",") < 0 ? "\t" : ",";
    const headers = parseCSVLine(lines[0], delimiter).map(function (header) { return header.toLowerCase().trim().replace(/^"|"$/g, ""); });
    function column(names) {
      for (let i = 0; i < names.length; i += 1) {
        const index = headers.indexOf(names[i]);
        if (index >= 0) return index;
      }
      return -1;
    }
    const titleIndex = column(["title", "t", "name", "original_title"]);
    if (titleIndex < 0) throw new Error("El CSV necesita una columna title o name.");
    const yearIndex = column(["year", "release_year", "year_released"]);
    const genreIndex = column(["genres", "genre"]);
    const tagsIndex = column(["tags", "keywords", "labels"]);
    const overviewIndex = column(["overview", "plot", "description", "synopsis"]);
    const idIndex = column(["movieid", "movie_id", "id"]);
    const tmdbIdIndex = column(["tmdbid", "tmdb_id"]);
    const catalogRows = [];
    const seen = new Set();
    for (let i = 1; i < lines.length; i += 1) {
      const values = parseCSVLine(lines[i], delimiter);
      const title = values[titleIndex] ? values[titleIndex].trim() : "";
      if (!title) continue;
      let year = yearIndex >= 0 ? Number(values[yearIndex]) || null : null;
      const match = title.match(/\(((?:19|20)\d{2})\)\s*$/);
      if (!year && match) year = Number(match[1]);
      const cleanTitle = title.replace(/\s*\(((?:19|20)\d{2})\)\s*$/, "");
      const rawTmdbId = tmdbIdIndex >= 0 ? String(values[tmdbIdIndex] || "").trim() : "";
      const numericTmdbId = Number(rawTmdbId);
      const tmdbId = /^\d+$/.test(rawTmdbId) && Number.isSafeInteger(numericTmdbId) && numericTmdbId > 0 ? String(numericTmdbId) : null;
      const normalizedTitle = titleKey(cleanTitle);
      const key = tmdbId ? "tmdb:" + tmdbId : "title:" + normalizedTitle;
      if (!normalizedTitle || seen.has(key)) continue;
      seen.add(key);
      catalogRows.push({
        id: idIndex >= 0 && values[idIndex] ? String(values[idIndex]) : (tmdbId || normalizedTitle),
        tmdbId: tmdbId,
        title: cleanTitle,
        year: year,
        genres: genreIndex >= 0 ? splitList(values[genreIndex]).filter(function (genre) { return genre.toLowerCase() !== "(no genres listed)"; }).map(displayGenre) : [],
        tags: tagsIndex >= 0 ? splitList(values[tagsIndex]) : [],
        overview: overviewIndex >= 0 ? values[overviewIndex] || "" : "",
        source: "csv"
      });
      if (catalogRows.length >= 150000) break;
    }
    if (!catalogRows.length) throw new Error("No se encontraron filas válidas en el catálogo.");
    return catalogRows;
  }

  async function importCatalogCSV(file) {
    const parsed = parseCatalogCSV(await file.text());
    const map = new Map(customCatalog.map(function (movie) { return [movieIdentityKey(movie), movie]; }));
    parsed.forEach(function (movie) {
      const key = movieIdentityKey(movie);
      const old = map.get(key);
      map.set(key, old ? {
        id: old.id || movie.id,
        tmdbId: movieTmdbId(old) || movieTmdbId(movie) || null,
        title: old.title,
        year: old.year || movie.year,
        genres: uniqueStrings((old.genres || []).concat(movie.genres || [])),
        tags: uniqueStrings((old.tags || []).concat(movie.tags || [])),
        overview: old.overview || movie.overview,
        source: "csv"
      } : movie);
    });
    customCatalog = Array.from(map.values());
    await dbSet(CATALOG_KEY, customCatalog);
    logEvent("Catálogo ampliado", parsed.length.toLocaleString("es-PA") + " títulos leídos de " + file.name, "▦");
    combineMovies();
    renderApp();
    toast("Catálogo ampliado: " + parsed.length.toLocaleString("es-PA") + " títulos importados. Se guardan solo en tu navegador.");
  }

  function ensureState(value) {
    const defaults = emptyState();
    const incoming = value && typeof value === "object" ? value : {};
    function validList(name) {
      return Array.isArray(incoming[name]) ? incoming[name].filter(function (entry) { return entry && entry.title; }).map(function (entry) { return Object.assign({}, entry, {title:String(entry.title)}); }) : [];
    }
    return Object.assign(defaults, incoming, {
      version: 2,
      rated: Array.isArray(incoming.rated) ? incoming.rated.filter(function (entry) { return entry && entry.title && ratingValue(entry) != null; }).map(function (entry) {
        return Object.assign({}, entry, { title: String(entry.title), rating: ratingValue(entry), emotions: Array.isArray(entry.emotions) ? entry.emotions : [], genres: splitList(entry.genres), tags: splitList(entry.tags) });
      }) : [],
      watched: validList("watched"),
      watchlist: validList("watchlist"),
      hidden: validList("hidden"),
      events: Array.isArray(incoming.events) ? incoming.events.slice(0, 80) : []
    });
  }


  async function exportBackup() {
    const backup = {
      format: "prisma-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      state: state,
      catalogCustom: customCatalog
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
    toast("Copia de seguridad preparada.");
  }

  async function restoreBackup(file) {
    const parsed = JSON.parse(await file.text());
    if (!parsed || parsed.format !== "prisma-backup" || !parsed.state) throw new Error("Ese archivo no parece una copia de seguridad de Prisma.");
    state = ensureState(parsed.state);
    customCatalog = Array.isArray(parsed.catalogCustom) ? parsed.catalogCustom.map(normalizeMovie).filter(Boolean) : [];
    await dbSet(STATE_KEY, state);
    await dbSet(CATALOG_KEY, customCatalog);
    combineMovies();
    renderApp();
    toast("Copia restaurada correctamente.");
  }

  async function resetAll() {
    if (!window.confirm("¿Borrar tus valoraciones, historial, pendientes, películas ocultas y emociones guardadas en este navegador? Esta acción no se puede deshacer sin una copia de seguridad.")) return;
    state = emptyState();
    customCatalog = [];
    await dbSet(STATE_KEY, state);
    await dbSet(CATALOG_KEY, customCatalog);
    combineMovies();
    renderApp();
    toast("Perfil local restablecido. El catálogo de muestra permanece disponible.");
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

  const posterRefreshRequested = new Set();
  document.addEventListener("error",function (event) {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)) return;
    const host = image.parentElement;
    const failedId = image.dataset.tmdbId || "";
    if (image.classList.contains("poster-image") || image.classList.contains("recent-poster-image")) {
      image.remove();
      if (failedId && !posterRefreshRequested.has(failedId)) {
        posterRefreshRequested.add(failedId);
        const invalidate = function (list) {
          return (list || []).map(function (entry) {
            if (movieTmdbId(entry) !== failedId) return entry;
            return Object.assign({},entry,{posterUrl:"",posterPath:"",tmdbFetchedAt:null,metadataSource:null});
          });
        };
        state.rated = invalidate(state.rated);
        state.watched = invalidate(state.watched);
        state.watchlist = invalidate(state.watchlist);
        state.hidden = invalidate(state.hidden);
        customCatalog = invalidate(customCatalog);
        const catalogEntry = catalog.find(function (entry) { return movieTmdbId(entry) === failedId; });
        if (catalogEntry) Object.assign(catalogEntry,{posterUrl:"",posterPath:"",tmdbFetchedAt:null,metadataSource:null});
        persistState();
        dbSet(CATALOG_KEY,customCatalog).catch(function () {});
        if (tmdbCredential && tmdbCredential.value) {
          if (tmdbHistorySync.running) tmdbEnrichRequested = true;
          else window.setTimeout(function () { enrichRatedHistoryWithTMDB(); },300);
        }
      }
      return;
    }
    if (!host || !host.matches(".collection-row-poster,.compact-poster,.cast-photo,.person-film-poster,.similar-poster,.saga-art,.provider-chip")) return;
    image.remove();
    if (host.querySelector(".poster-fallback,.image-fallback")) return;
    const fallback = document.createElement("span");
    fallback.className = host.matches(".provider-chip") ? "image-fallback" : "poster-fallback";
    fallback.textContent = "▣";
    host.appendChild(fallback);
  },true);

  document.addEventListener("click",async function (event) {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      event.preventDefault();
      clickNav(nav.dataset.nav);
      return;
    }
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    try {
      if (action === "import-json") { $("#jsonImportInput").click(); return; }
      if (action === "import-catalog") { $("#catalogImportInput").click(); return; }
      if (action === "save-tmdb") { await saveTMDBCredential(); return; }
      if (action === "test-tmdb") { await testTMDBCredential(); return; }
      if (action === "remove-tmdb") { await removeTMDBCredential(); return; }
      if (action === "tmdb-retry") { await loadTMDBPage(1,catalogQuery.trim().length >= 2 ? "search" : "popular",false); return; }
      if (action === "tmdb-more") { await loadTMDBPage(tmdbPage + 1,tmdbMode,true); return; }
      if (action === "enrich-history") { await enrichRatedHistoryWithTMDB(); return; }
      if (action === "export-backup") { await exportBackup(); return; }
      if (action === "restore-backup") { $("#backupImportInput").click(); return; }
      if (action === "reset") { await resetAll(); return; }
      if (action === "show-info") { openInfoSheet(button.dataset.info || "collection"); return; }
      if (action === "genre") { activeGenre = button.dataset.genre || "Todos"; renderApp(); return; }
      if (action === "details") {
        const requestedId = button.dataset.tmdbId || "";
        let movie = (requestedId ? tmdbResults.find(function (item) { return movieTmdbId(item) === requestedId; }) : null) ||
          findMovie(button.dataset.title,requestedId) ||
          getCollectionItems("history").concat(getCollectionItems("pending"),getCollectionItems("hidden")).find(function (item) {
            return requestedId ? movieTmdbId(item) === requestedId : titleKey(item.title) === titleKey(button.dataset.title);
          });
        if (movie && requestedId && !movie.tmdbId) movie = Object.assign({},movie,{tmdbId:requestedId,source:"tmdb"});
        if (!movie && button.dataset.title) movie = {title:button.dataset.title,id:requestedId || titleKey(button.dataset.title),tmdbId:requestedId || null,source:requestedId ? "tmdb" : "catalog"};
        if (movie) openModal(movie,"details");
        return;
      }
      if (action === "rate") {
        const inDetail = Boolean(button.closest(".detail-sheet"));
        const requestedId = button.dataset.tmdbId || (movieDetail && movieDetail.movie.tmdbId) || "";
        const movie = (movieDetail && inDetail ? movieDetail.movie : null) ||
          (requestedId ? tmdbResults.find(function (item) { return movieTmdbId(item) === requestedId; }) : null) ||
          findMovie(button.dataset.title || (movieDetail && movieDetail.movie.title),requestedId) || (movieDetail && movieDetail.movie);
        if (movie) openModal(movie,"rate");
        return;
      }
      if (action === "rating-star") { updateRatingPreview(button.dataset.rating); return; }
      if (action === "save-rating") { await saveRating(); return; }
      if (action === "delete-rating") { await deleteRating(button.dataset.title,button.dataset.tmdbId); return; }
      if (action === "emotion") {
        if (!modalDraft) return;
        const emotion = button.dataset.emotion, index = modalDraft.emotions.indexOf(emotion);
        if (index >= 0) modalDraft.emotions.splice(index,1); else modalDraft.emotions.push(emotion);
        renderModal();
        return;
      }
      if (action === "close-modal") { closeModal(); return; }
      if (action === "backdrop-close" && event.target === button) {
        if (utilitySheet) { utilitySheet = null; renderModal(); }
        else closeModal();
        return;
      }
      if (action === "retry-movie-detail") { if (movieDetail) { movieDetailCache.delete(String(movieDetail.movie.tmdbId || "")); loadMovieDetail(movieDetail.movie); } return; }
      if (action === "toggle-watchlist") { if (button.dataset.title) await toggleWatchlist(button.dataset.title,button.dataset.tmdbId); return; }
      if (action === "manage-pending") {
        const title = movieDetail ? movieDetail.movie.title : (modalDraft && modalDraft.movie.title);
        if (title) await toggleWatchlist(title,movieDetail && movieDetail.movie.tmdbId);
        if (utilitySheet) { utilitySheet = null; renderModal(); }
        return;
      }
      if (action === "mark-watched" || action === "manage-history") {
        const title = movieDetail ? movieDetail.movie.title : (modalDraft && modalDraft.movie.title);
        if (title) await markWatched(title,movieDetail && movieDetail.movie.tmdbId);
        if (utilitySheet) { utilitySheet = null; renderModal(); }
        return;
      }
      if (action === "toggle-hidden" || action === "manage-hidden") {
        const title = movieDetail ? movieDetail.movie.title : (modalDraft && modalDraft.movie.title);
        if (title) await toggleHidden(title,movieDetail && movieDetail.movie.tmdbId);
        if (utilitySheet) { utilitySheet = null; renderModal(); }
        return;
      }
      if (action === "manage-lists") { openUtilitySheet("manage"); return; }
      if (action === "open-sort") { openUtilitySheet("sort"); return; }
      if (action === "open-genres") { openUtilitySheet("genres"); return; }
      if (action === "choose-sort") {
        if (!utilitySheet) return;
        utilitySheet.sort = button.dataset.sort || "added";
        utilitySheet.direction = utilitySheet.sort === "title" ? "asc" : "desc";
        renderModal();
        return;
      }
      if (action === "toggle-sort-direction") { if (utilitySheet) { utilitySheet.direction = utilitySheet.direction === "asc" ? "desc" : "asc"; renderModal(); } return; }
      if (action === "accept-sort") {
        if (utilitySheet) { collectionSort = utilitySheet.sort; collectionDirection = utilitySheet.direction; }
        utilitySheet = null; renderApp(); renderModal(); return;
      }
      if (action === "toggle-sheet-genre") {
        if (!utilitySheet) return;
        const genre = button.dataset.genre || "";
        const index = utilitySheet.genres.findIndex(function (value) { return titleKey(value) === titleKey(genre); });
        if (index >= 0) utilitySheet.genres.splice(index,1); else utilitySheet.genres.push(genre);
        renderModal(); return;
      }
      if (action === "clear-sheet-genres") { if (utilitySheet) utilitySheet.genres = []; renderModal(); return; }
      if (action === "accept-genres") {
        if (utilitySheet) collectionGenres = utilitySheet.genres.slice();
        utilitySheet = null; renderApp(); renderModal(); return;
      }
      if (action === "toggle-layout") { collectionLayout = collectionLayout === "list" ? "compact" : "list"; renderApp(); return; }
      if (action === "toggle-released") { onlyReleased = !onlyReleased; renderApp(); return; }
      if (action === "toggle-collection-search") {
        showCollectionSearch = !showCollectionSearch;
        if (!showCollectionSearch) collectionQuery = "";
        renderApp();
        const search = $("[data-collection-search]");
        if (search) search.focus();
        return;
      }
      if (action === "collection-tab") { collectionTab = button.dataset.tab || "history"; collectionMode = "movies"; renderApp(); return; }
      if (action === "collection-mode") { collectionMode = button.dataset.mode || "movies"; renderApp(); return; }
      if (action === "collection-open-tab") { collectionTab = button.dataset.tab || "history"; collectionMode = "movies"; renderApp(); return; }
      if (action === "person-details") { openPersonDetails(button.dataset.personId,button.dataset.personName,button.dataset.character); return; }
      if (action === "person-back") { personDetail = null; renderModal(); return; }
      if (action === "person-filter") { personListFilter = button.dataset.filter || "all"; renderPersonDetails(); return; }
      if (action === "movie-from-person") {
        const title = button.dataset.title;
        const movie = findMovie(title,button.dataset.tmdbId) || {title:title,id:button.dataset.tmdbId || titleKey(title),tmdbId:button.dataset.tmdbId || null,source:"tmdb"};
        personDetail = null; openModal(movie,"details"); return;
      }
      if (action === "open-trailer") {
        const videos = movieDetail && movieDetail.data ? movieDetail.data.videos : [];
        const trailer = (videos || []).find(function (video) { return video.site === "YouTube" && video.type === "Trailer"; }) ||
          (videos || []).find(function (video) { return video.site === "YouTube"; });
        const url = trailer ? "https://www.youtube.com/watch?v=" + encodeURIComponent(trailer.key) :
          (movieDetail && movieDetail.movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movieDetail.movie.tmdbId) + "/videos" : "");
        if (url) window.open(url,"_blank","noopener,noreferrer"); else toast("No hay enlace de tráiler disponible. Conecta TMDB para consultar los vídeos.",true);
        return;
      }
      if (action === "open-reviews") {
        if (movieDetail && movieDetail.movie.tmdbId) window.open("https://www.themoviedb.org/movie/" + encodeURIComponent(movieDetail.movie.tmdbId) + "/reviews","_blank","noopener,noreferrer");
        else toast("Conecta TMDB para abrir los comentarios públicos de esta película.",true);
        return;
      }
      if (action === "share-movie") {
        const movie = movieDetail && movieDetail.movie;
        if (!movie) return;
        const url = movie.tmdbId ? "https://www.themoviedb.org/movie/" + encodeURIComponent(movie.tmdbId) : window.location.href;
        const payload = {title:movie.title,text:"Mira " + movie.title + " en Prisma",url:url};
        if (navigator.share) await navigator.share(payload);
        else if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(url); toast("Enlace copiado."); }
        else window.prompt("Copia el enlace de la película",url);
        return;
      }
      if (action === "close-sheet") { utilitySheet = null; renderModal(); return; }
    } catch (error) {
      toast(error && error.message ? error.message : "No se pudo completar la acción.",true);
    }
  });

  document.addEventListener("input",function (event) {
    if (event.target.matches("[data-global-search]")) {
      catalogQuery = event.target.value;
      activeGenre = "Todos";
      if (currentPage !== "catalog") { currentPage = "catalog"; renderApp(); }
      else {
        renderCatalogResults();
        const caption = $("#catalogSearchTitle");
        if (caption) caption.textContent = catalogQuery.trim() ? "Resultados para «" + catalogQuery.trim() + "»" : "Catálogo local";
      }
      if (tmdbSearchTimer) window.clearTimeout(tmdbSearchTimer);
      tmdbSearchTimer = window.setTimeout(function () {
        if (currentPage === "catalog" && tmdbCredential && tmdbCredential.value) {
          loadTMDBPage(1,catalogQuery.trim().length >= 2 ? "search" : "popular",false);
        }
      },450);
      return;
    }
    if (event.target.matches("[data-catalog-search]")) {
      catalogQuery = event.target.value;
      renderCatalogResults();
      if (tmdbSearchTimer) window.clearTimeout(tmdbSearchTimer);
      tmdbSearchTimer = window.setTimeout(function () {
        if (currentPage === "catalog" && tmdbCredential && tmdbCredential.value) {
          loadTMDBPage(1,catalogQuery.trim().length >= 2 ? "search" : "popular",false);
        }
      },450);
      return;
    }
    if (event.target.matches("[data-collection-search]")) {
      collectionQuery = event.target.value;
      refreshCollectionContent();
    }
  });


  $("#jsonImportInput").addEventListener("change", async function (event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try { await importPersonalJSON(file); }
    catch (error) { toast(error.message || "No pude leer ese JSON.", true); }
  });
  $("#catalogImportInput").addEventListener("change", async function (event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try { await importCatalogCSV(file); }
    catch (error) { toast(error.message || "No pude leer ese CSV.", true); }
  });
  $("#backupImportInput").addEventListener("change", async function (event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try { await restoreBackup(file); }
    catch (error) { toast(error.message || "No pude restaurar la copia.", true); }
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
