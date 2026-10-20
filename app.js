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

  function emptyState() {
    return { version: 1, rated: [], watchlist: [], events: [], updatedAt: null, importedAt: null };
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
      tmdbId: tmdbId ? String(tmdbId) : null,
      title: cleanTitle,
      year: year,
      genres: genres.map(displayGenre),
      tags: tags,
      overview: String(overview || ""),
      posterPath: posterPath,
      posterUrl: movie.posterUrl || (posterPath ? "https://image.tmdb.org/t/p/w500" + posterPath : ""),
      voteAverage: Number(movie.voteAverage || movie.vote_average || 0) || null,
      runtime: Number(movie.runtime || 0) || null,
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

  function combineMovies() {
    const map = new Map();
    seedCatalog.concat(customCatalog).forEach(function (raw) {
      const movie = normalizeMovie(raw);
      if (!movie) return;
      const key = titleKey(movie.title);
      const previous = map.get(key);
      if (!previous) {
        movie.key = key;
        map.set(key, movie);
      } else {
        previous.genres = uniqueStrings(previous.genres.concat(movie.genres));
        previous.tags = uniqueStrings(previous.tags.concat(movie.tags));
        previous.year = previous.year || movie.year;
        previous.overview = previous.overview || movie.overview;
        previous.id = previous.id || movie.id;
        previous.tmdbId = previous.tmdbId || movie.tmdbId;
        previous.posterPath = previous.posterPath || movie.posterPath;
        previous.posterUrl = previous.posterUrl || movie.posterUrl;
        previous.voteAverage = previous.voteAverage || movie.voteAverage;
        previous.runtime = previous.runtime || movie.runtime;
        previous.tmdbFetchedAt = previous.tmdbFetchedAt || movie.tmdbFetchedAt;
        previous.metadataSource = previous.metadataSource || movie.metadataSource;
      }
    });
    state.rated.forEach(function (rating) {
      if (!rating.title) return;
      const key = titleKey(rating.title);
      const historyMovie = normalizeMovie(rating);
      if (!historyMovie) return;
      if (!map.has(key)) {
        historyMovie.key = key;
        historyMovie.source = "history";
        map.set(key, historyMovie);
      } else {
        const existing = map.get(key);
        existing.genres = uniqueStrings(existing.genres.concat(historyMovie.genres));
        existing.tags = uniqueStrings(existing.tags.concat(historyMovie.tags));
        existing.overview = existing.overview || historyMovie.overview;
        existing.posterPath = existing.posterPath || historyMovie.posterPath;
        existing.posterUrl = existing.posterUrl || historyMovie.posterUrl;
        existing.tmdbId = existing.tmdbId || historyMovie.tmdbId;
        existing.voteAverage = existing.voteAverage || historyMovie.voteAverage;
        existing.runtime = existing.runtime || historyMovie.runtime;
        existing.tmdbFetchedAt = existing.tmdbFetchedAt || historyMovie.tmdbFetchedAt;
        existing.metadataSource = existing.metadataSource || historyMovie.metadataSource;
      }
    });
    catalog = Array.from(map.values()).sort(function (a, b) { return a.title.localeCompare(b.title, "es"); });
    catalogByTitle = map;
  }

  function findMovie(title) {
    return catalogByTitle.get(titleKey(title)) || null;
  }

  function ratingFor(title) {
    const key = titleKey(title);
    return state.rated.find(function (entry) { return titleKey(entry.title) === key; }) || null;
  }

  function isInWatchlist(title) {
    const key = titleKey(title);
    return state.watchlist.some(function (entry) { return titleKey(entry.title) === key; });
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
      const movie = findMovie(entry.title);
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
    const limit = 1000 * 60 * 60 * 24 * 30;
    const now = Date.now();
    function isExpired(entry) {
      if (!entry || !entry.tmdbFetchedAt) return false;
      const fetchedAt = new Date(entry.tmdbFetchedAt).getTime();
      return Number.isFinite(fetchedAt) && now - fetchedAt > limit;
    }
    function strip(entry) {
      delete entry.genres;
      delete entry.tags;
      delete entry.overview;
      delete entry.posterPath;
      delete entry.posterUrl;
      delete entry.voteAverage;
      delete entry.runtime;
      delete entry.tmdbFetchedAt;
      delete entry.metadataSource;
      return entry;
    }
    let changed = false;
    customCatalog = customCatalog.map(function (entry) {
      if (entry.metadataSource === "tmdb" && isExpired(entry)) {
        changed = true;
        return strip(Object.assign({}, entry, { genres: [], tags: [], overview: "", posterPath: "", posterUrl: "" }));
      }
      return entry;
    });
    state.rated = state.rated.map(function (entry) {
      if (entry.metadataSource === "tmdb" && isExpired(entry)) {
        changed = true;
        const copy = Object.assign({}, entry);
        strip(copy);
        return copy;
      }
      return entry;
    });
    state.watchlist = state.watchlist.map(function (entry) {
      if (entry.metadataSource === "tmdb" && isExpired(entry)) {
        changed = true;
        return strip(Object.assign({}, entry));
      }
      return entry;
    });
    if (changed) {
      dbSet(CATALOG_KEY, customCatalog).catch(function () {});
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
      runtime: Number(raw.runtime) || null,
      popularity: Number(raw.popularity) || null,
      tmdbFetchedAt: new Date().toISOString(),
      metadataSource: "tmdb",
      source: "tmdb"
    };
  }

  function historyNeedsTMDB(entry) {
    const fetchedAt = entry && entry.tmdbFetchedAt ? new Date(entry.tmdbFetchedAt).getTime() : 0;
    const isFresh = entry && entry.metadataSource === "tmdb" &&
      Number.isFinite(fetchedAt) && Date.now() - fetchedAt < 1000 * 60 * 60 * 24 * 30 &&
      Array.isArray(entry.genres) && entry.genres.length > 0 && Boolean(entry.overview);
    if (isFresh) return false;
    return Boolean(entry && entry.title);
  }

  function historyTMDBId(entry) {
    const value = Number(entry && (entry.tmdbId || entry.tmId || entry.tmdb_id));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  function pendingHistoryTMDBCount() {
    return state.rated.filter(historyNeedsTMDB).length;
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
    entry.runtime = enriched.runtime || entry.runtime || null;
    entry.tmdbFetchedAt = enriched.tmdbFetchedAt || new Date().toISOString();
    entry.metadataSource = "tmdb";
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
    const index = customCatalog.findIndex(function (movie) { return titleKey(movie.title) === key; });
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
      "Procesando " + tmdbHistorySync.done + " de " + tmdbHistorySync.total + " películas. Actualizadas: " + tmdbHistorySync.updated + ". Errores o no encontradas: " + tmdbHistorySync.failed + "." :
      (tmdbHistorySync.finishedAt ?
        "Última pasada: " + tmdbHistorySync.updated + " actualizadas y " + tmdbHistorySync.failed + " con error/no encontradas." :
        "Enlaza tus valoraciones con sus fichas de TMDB mediante el identificador TMDB del JSON. Las series están fuera de esta lista.");
    const percent = tmdbHistorySync.total ? Math.round(tmdbHistorySync.done / tmdbHistorySync.total * 100) : 0;
    const button = !connected ?
      '<button class="btn btn-secondary" type="button" data-nav="data">Conectar TMDB en Datos</button>' :
      '<button class="btn btn-primary" type="button" data-action="enrich-history" ' + (tmdbHistorySync.running || pending === 0 ? "disabled" : "") + '>' +
      (tmdbHistorySync.running ? "Enriqueciendo…" : (pending === 0 ? "Historial actualizado" : "Enriquecer " + pending + " películas con TMDB")) + '</button>';
    return '<section class="panel tmdb-history-panel" style="margin-top:17px"><div class="panel-head"><div><h3>Enlazar mi historial con TMDB</h3><p>Añade géneros, sinopsis, palabras clave y carteles para que el motor tenga señales reales sobre las películas que ya calificaste.</p></div><span class="badge ' + (connected ? "badge-mint" : "") + '">' + (connected ? "Conectado" : "Desconectado") + '</span></div>' +
      '<div class="metrics-grid">' + metric("Por enriquecer", pending.toLocaleString("es-PA"), "Metadatos pendientes") + metric("Procesadas", tmdbHistorySync.done.toLocaleString("es-PA"), "En esta pasada") + metric("Actualizadas", tmdbHistorySync.updated.toLocaleString("es-PA"), "Con datos recuperados") + metric("Con error", tmdbHistorySync.failed.toLocaleString("es-PA"), "No encontradas o fallidas") + '</div>' +
      (tmdbHistorySync.running ? '<progress class="tmdb-progress" max="100" value="' + percent + '">' + percent + '%</progress>' : "") +
      '<p class="kicker" style="margin-top:12px">' + escapeHTML(status) + '</p><div class="hero-actions">' + button + '</div>' +
      '<p class="kicker" style="margin-top:10px">Las notas y emociones no cambian. Los datos obtenidos de TMDB se refrescan pasado un tiempo; esta acción puede tardar porque consulta cada película por separado.</p></section>';
  }

  async function enrichRatedHistoryWithTMDB() {
    if (!tmdbCredential || !tmdbCredential.value) {
      toast("Primero conecta TMDB desde Datos.", true);
      clickNav("data");
      return;
    }
    if (tmdbHistorySync.running) {
      toast("El enriquecimiento del historial ya está en marcha.");
      return;
    }
    const targets = state.rated.filter(historyNeedsTMDB);
    if (!targets.length) {
      toast("Tu historial ya tiene metadatos recientes de TMDB.");
      return;
    }
    tmdbHistorySync = { running: true, total: targets.length, done: 0, updated: 0, failed: 0, current: "", finishedAt: null };
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
              applyTMDBDetailsToRating(entry, enriched);
              upsertTMDBCatalogEntry(entry, enriched);
              tmdbHistorySync.updated += 1;
            }
          }
        } catch (error) {
          tmdbHistorySync.failed += 1;
        } finally {
          tmdbHistorySync.done += 1;
          if (tmdbHistorySync.done - lastPersisted >= 5 || tmdbHistorySync.done === tmdbHistorySync.total) {
            lastPersisted = tmdbHistorySync.done;
            state.updatedAt = new Date().toISOString();
            await persistState();
            await dbSet(CATALOG_KEY, customCatalog);
            combineMovies();
            if (currentPage === "lab" || currentPage === "data") renderApp();
          }
        }
        await new Promise(function (resolve) { window.setTimeout(resolve, 120); });
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    tmdbHistorySync.running = false;
    tmdbHistorySync.finishedAt = new Date().toISOString();
    tmdbHistorySync.current = "";
    state.events.unshift({
      title: "Historial enriquecido con TMDB",
      description: tmdbHistorySync.updated + " actualizadas; " + tmdbHistorySync.failed + " no encontradas o fallidas",
      symbol: "✦",
      at: tmdbHistorySync.finishedAt
    });
    state.events = state.events.slice(0, 80);
    state.updatedAt = tmdbHistorySync.finishedAt;
    await persistState();
    await dbSet(CATALOG_KEY, customCatalog);
    combineMovies();
    renderApp();
    toast("Terminado: " + tmdbHistorySync.updated + " películas actualizadas; " + tmdbHistorySync.failed + " con error o sin coincidencia.");
  }

  function renderTMDBAttribution() {
    return '<section class="tmdb-attribution" aria-label="Atribución de TMDB"><a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer"><img src="' + TMDB_LOGO_URL + '" alt="TMDB" loading="lazy"></a><div><strong>Datos e imágenes de The Movie Database (TMDB)</strong><p>Este producto utiliza TMDB y las API de TMDB, pero no está respaldado, certificado ni aprobado por TMDB.</p><a href="https://www.themoviedb.org/about/logos-attribution" target="_blank" rel="noopener noreferrer">Logos y atribución oficial ↗</a></div></section>';
  }

  function renderTMDBResults() {
    const status = $("#tmdbStatus");
    const target = $("#tmdbResults");
    if (!status || !target) return;
    if (!tmdbCredential || !tmdbCredential.value) {
      status.innerHTML = 'Para explorar el catálogo completo, configura tus credenciales desde <button class="btn btn-secondary btn-small" type="button" data-nav="data">Datos → Conectar con TMDB</button>.';
      target.innerHTML = '<div class="empty-state"><div class="empty-icon">⌕</div><h3>Busca entre películas de TMDB</h3><p>Conectar la API permite buscar títulos, sinopsis, géneros y carteles en línea. Tu historial personal seguirá local.</p></div>';
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
      (tmdbPage < tmdbTotalPages ? '<div style="display:flex;justify-content:center;margin-top:17px"><button class="btn btn-secondary" type="button" data-action="tmdb-more">' + (tmdbLoading ? "Cargando…" : "Cargar más películas") + '</button></div>' : "") +
      '<p class="kicker" style="margin-top:12px">Las películas y los carteles proceden de TMDB. La nota estimada por Prisma es distinta de la valoración pública de TMDB.</p>';
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
      const movie = findMovie(entry.title);
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
    const ratedKeys = new Set(state.rated.map(function (entry) { return titleKey(entry.title); }));
    const pendingKeys = new Set(state.watchlist.map(function (entry) { return titleKey(entry.title); }));
    const results = catalog.filter(function (movie) {
      return !ratedKeys.has(movie.key) && !pendingKeys.has(movie.key) && movie.source !== "history";
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
      const movie = findMovie(entry.title);
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
      const movie = findMovie(entry.title);
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
    return Math.abs(hash) % 360;
  }

  function movieCard(movie, options) {
    const opts = options || {};
    const hue = cardColor(movie);
    const rating = ratingFor(movie.title);
    const actionLabel = rating ? "Editar nota" : "Calificar";
    const score = movie.prediction ? '<div class="movie-score">✦ ' + movie.prediction.score.toFixed(1).replace(".", ",") + '/10 estimado</div>' : (rating ? '<div class="movie-score">★ Tu nota: ' + ratingValue(rating) + '/10</div>' : "");
    const meta = [movie.year, (movie.genres || []).slice(0, 2).map(displayGenre).join(" · ")].filter(Boolean).join(" · ");
    const detail = opts.compact ? "" : '<div class="movie-actions"><button class="btn btn-secondary" type="button" data-action="details" data-title="' + escapeHTML(movie.title) + '">Detalles</button><button class="btn btn-primary" type="button" data-action="rate" data-title="' + escapeHTML(movie.title) + '">' + actionLabel + '</button></div>';
    return '<article class="movie-card">' +
      '<div class="poster-art" role="img" aria-label="Tarjeta de ' + escapeHTML(movie.title) + '" style="background:radial-gradient(circle at 75% 22%,hsla(' + hue + ',65%,65%,.35),transparent 42%),linear-gradient(145deg,hsl(' + hue + ',32%,25%),#13131d 66%,hsl(' + ((hue + 70) % 360) + ',28%,19%))">' +
      (movie.posterUrl ? '<img class="poster-image" src="' + escapeHTML(movie.posterUrl) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : '') +
      '<span class="poster-symbol">✦</span><strong class="poster-title">' + escapeHTML(movie.title) + '</strong><span class="poster-year">' + escapeHTML(movie.year || "Película") + '</span></div>' +
      '<div class="movie-copy"><h3 class="movie-title">' + escapeHTML(movie.title) + '</h3><div class="movie-meta">' + escapeHTML(meta || "Metadatos pendientes") + '</div>' + score + detail + '</div></article>';
  }

  function metric(label, value, note) {
    return '<div class="metric-card"><div class="metric-label">' + label + '</div><div class="metric-value">' + value + '</div><div class="metric-note">' + note + '</div></div>';
  }

  function sectionHead(title, description, action) {
    return '<div class="section-head"><div><h2>' + title + '</h2><p>' + description + '</p></div>' + (action || "") + '</div>';
  }

  function ratedMetadataCount() {
    return buildProfile().withMetadata;
  }

  function renderHome() {
    const stats = summaryStats();
    const recs = getRecommendations(6);
    const profile = buildProfile();
    const warning = stats.total && profile.withMetadata < 8 ?
      '<div class="notice"><strong>El motor está empezando.</strong> Hay ' + profile.withMetadata + ' películas calificadas enlazadas a géneros o etiquetas. Tus otras notas se conservarán, pero para aprender mejor de ellas importa también un catálogo con títulos y géneros.</div>' : "";
    const empty = stats.total === 0 ?
      '<div class="empty-state"><div class="empty-icon">✧</div><h3>Vamos a conocer tus gustos</h3><p>Importa tu historial JSON para que Prisma empiece a construir un perfil a partir de tus notas. Las series se ignoran.</p><button type="button" class="btn btn-primary" data-action="import-json">Importar mi JSON</button></div>' : "";
    const recSection = recs.length ?
      recs.map(function (movie) { return movieCard(movie); }).join("") :
      '<div class="empty-state"><div class="empty-icon">⌕</div><h3>No hay recomendaciones disponibles todavía</h3><p>Amplía el catálogo o revisa tus pendientes para darle más opciones a Prisma.</p><button type="button" class="btn btn-secondary" data-nav="catalog">Explorar catálogo</button></div>';
    return '<section class="hero"><div class="hero-content"><div class="eyebrow">Tu laboratorio cinematográfico · V 0.1</div>' +
      '<h1 class="hero-title">No busques cualquier película.<br><span class="gradient-text">Encuentra la que te haga sentir.</span></h1>' +
      '<p class="lead">Prisma aprende de tus valoraciones, busca señales en las historias y te explica por qué podría gustarte cada película. Tu perfil se queda en este dispositivo.</p>' +
      '<div class="hero-actions"><button class="btn btn-primary" type="button" data-nav="home">✦ Ver mis recomendaciones</button><button class="btn btn-secondary" type="button" data-nav="lab">Explorar el aprendizaje ↗</button></div></div></section>' +
      '<div class="metrics-grid">' +
      metric("Películas calificadas", String(stats.total), "Tu historial personal") +
      metric("Nota media", stats.average == null ? "—" : stats.average.toFixed(2).replace(".", ","), "Tu escala del 1 al 10") +
      metric("Notas de 8 a 10", stats.total ? Math.round(stats.high / stats.total * 100) + "%" : "—", stats.high + " películas") +
      metric("Catálogo local", stats.catalog.toLocaleString("es-PA"), "Título y metadatos disponibles") +
      '</div>' +
      (warning ? '<div style="margin-top:16px">' + warning + '</div>' : "") + (empty ? '<div style="margin-top:24px">' + empty + '</div>' : "") +
      sectionHead("Una selección para ti", "Puntuación experimental basada en tus preferencias y los metadatos disponibles.", '<button class="btn btn-quiet btn-small" type="button" data-nav="catalog">Ver catálogo completo ↗</button>') +
      '<div class="movie-grid">' + recSection + '</div>' +
      '<footer>Prisma es un proyecto personal en desarrollo. Las puntuaciones estimadas son hipótesis del motor, no garantías. Tus valoraciones no se envían a un servidor.</footer>';
  }

  function movieGrid(movies) {
    return '<div class="movie-grid">' + movies.map(function (movie) { return movieCard(movie); }).join("") + '</div>';
  }

  function filterCatalog() {
    const query = titleKey(catalogQuery);
    return catalog.filter(function (movie) {
      const text = titleKey(movie.title + " " + (movie.genres || []).join(" ") + " " + (movie.tags || []).join(" ") + " " + (movie.year || ""));
      const queryOkay = !query || text.indexOf(query) >= 0;
      const genreOkay = activeGenre === "Todos" || (movie.genres || []).some(function (genre) { return genre.toLowerCase() === activeGenre.toLowerCase(); });
      return queryOkay && genreOkay;
    });
  }

  function renderCatalogResults() {
    const target = $("#localCatalogResults");
    if (!target) return;
    const results = filterCatalog();
    const cap = 80;
    const truncated = results.length > cap;
    target.innerHTML = results.length ?
      movieGrid(results.slice(0, cap)) + (truncated ? '<p class="kicker" style="margin-top:15px">Mostrando 80 de ' + results.length.toLocaleString("es-PA") + ' resultados. Refina la búsqueda para ver menos.</p>' : "") :
      '<div class="empty-state"><div class="empty-icon">⌕</div><h3>No encontramos esa película</h3><p>Prueba con otro título o importa un catálogo más amplio.</p><button class="btn btn-secondary" type="button" data-action="import-catalog">Importar CSV</button></div>';
    const count = $("#catalogCount");
    if (count) count.textContent = results.length.toLocaleString("es-PA") + " películas encontradas";
  }

  function renderCatalog() {
    const genres = ["Todos"].concat(allGenres());
    const genreChips = genres.map(function (genre) {
      return '<button class="chip ' + (activeGenre === genre ? "active" : "") + '" type="button" data-action="genre" data-genre="' + escapeHTML(genre) + '">' + escapeHTML(displayGenre(genre)) + '</button>';
    }).join("");
    return '<div class="eyebrow">Explora</div><h1>Tu próximo descubrimiento</h1><p class="lead">Busca entre películas de TMDB o filtra tu catálogo local. Prisma guarda tus valoraciones en este dispositivo.</p>' +
      '<div class="toolbar"><label class="search-wrap"><span>⌕</span><input class="field" type="search" data-catalog-search value="' + escapeHTML(catalogQuery) + '" placeholder="Buscar una película por título…" aria-label="Buscar películas en TMDB y tu catálogo"></label><button class="btn btn-secondary" type="button" data-action="import-catalog">＋ Importar CSV</button></div>' +
      '<section class="panel tmdb-browser"><div class="panel-head"><div><h3>Explorar TMDB</h3><p>Busca en su catálogo en línea o explora películas populares.</p></div><span class="badge badge-mint">API</span></div><div id="tmdbStatus" class="kicker">Conecta tus credenciales desde Datos para activar la búsqueda global.</div><div id="tmdbResults" style="margin-top:14px"></div></section>' +
      '<div class="section-head"><div><h2>Catálogo local</h2><p id="catalogCount">Cargando resultados…</p></div><div class="chip-row">' + genreChips + '</div></div><div id="localCatalogResults"></div>' +
      '<footer>El catálogo remoto se consulta por páginas, no se descarga entero. Puedes calificar resultados de TMDB para ampliar tu perfil personal.</footer>';
  }

  function renderLibrary() {
    const watch = state.watchlist.map(function (entry) {
      return findMovie(entry.title) || normalizeMovie(entry);
    }).filter(Boolean);
    const rated = state.rated.slice().sort(function (a, b) {
      return String(b.updatedAt || b.rA || b.date || "").localeCompare(String(a.updatedAt || a.rA || a.date || ""));
    });
    const ratingRows = rated.slice(0, 120).map(function (entry) {
      return '<div class="event-item"><div class="event-mark">★</div><div class="event-copy"><strong>' + escapeHTML(entry.title) + '</strong><small>' + escapeHTML(entry.year || "Año no disponible") + (entry.emotions && entry.emotions.length ? " · " + escapeHTML(entry.emotions.join(", ")) : "") + (entry.note ? " · " + escapeHTML(entry.note) : "") + '</small></div><span class="badge badge-gold">' + ratingValue(entry) + '/10</span><button class="btn btn-quiet btn-small" type="button" data-action="rate" data-title="' + escapeHTML(entry.title) + '">Editar</button></div>';
    }).join("");
    return '<div class="eyebrow">Tu colección</div><h1>Tu historia con el cine</h1><p class="lead">Aquí viven tus notas, tus emociones registradas y las películas que quieres ver después.</p>' +
      '<div class="metrics-grid">' + metric("Calificadas", String(state.rated.length), "Historial importado y nuevo") + metric("Pendientes", String(state.watchlist.length), "Películas guardadas") + metric("Con nota 10", String(state.rated.filter(function (r) { return ratingValue(r) === 10; }).length), "Tus experiencias excepcionales") + metric("Notas registradas", String(state.rated.filter(function (r) { return r.emotions && r.emotions.length; }).length), "Con emociones opcionales") + '</div>' +
      sectionHead("Quiero ver", "Tus películas guardadas para más adelante.") +
      (watch.length ? movieGrid(watch.map(function (movie) { return Object.assign({}, movie, { prediction: null }); })) : '<div class="empty-state"><div class="empty-icon">＋</div><h3>Tu lista está vacía</h3><p>Cuando encuentres una película interesante, guárdala para verla otro día.</p><button class="btn btn-secondary" type="button" data-nav="catalog">Explorar catálogo</button></div>') +
      sectionHead("Mi historial", "Tus calificaciones en orden reciente.") +
      (ratingRows ? '<div class="panel"><div class="event-list">' + ratingRows + '</div>' + (rated.length > 120 ? '<p class="kicker">Mostrando las 120 valoraciones más recientes.</p>' : "") + '</div>' : '<div class="empty-state"><h3>Aún no hay valoraciones</h3><p>Importa tu JSON para comenzar a ver tu historial aquí.</p><button class="btn btn-primary" type="button" data-action="import-json">Importar JSON</button></div>') +
      '<footer>Tus valoraciones permanecen en este navegador. Exporta una copia periódicamente desde Datos.</footer>';
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
    const top = genres.slice().sort(function (a, b) { return b.average - a.average; }).slice(0, 7);
    const bottom = genres.slice().sort(function (a, b) { return a.average - b.average; }).slice(0, 7);
    const events = state.events.slice(0, 8).map(function (event) {
      return '<div class="event-item"><div class="event-mark">' + escapeHTML(event.symbol || "✦") + '</div><div class="event-copy"><strong>' + escapeHTML(event.title) + '</strong><small>' + escapeHTML(event.description) + ' · ' + escapeHTML(formatDate(event.at)) + '</small></div></div>';
    }).join("");
    const learningNotice = profile.withMetadata < 5 ?
      '<div class="notice"><strong>Datos insuficientes para evaluar todavía.</strong> El motor ha importado tus notas, pero solo ' + profile.withMetadata + ' películas tienen géneros o etiquetas para aprender. Importa un catálogo CSV con títulos y géneros para enlazar más historial.</div>' :
      '<div class="notice good"><strong>El motor encuentra características en ' + profile.withMetadata + ' de ' + stats.total + ' películas.</strong> Las señales de género se calculan a partir de tus calificaciones enlazadas. Una cantidad pequeña de películas sigue produciendo conclusiones preliminares.</div>';
    const evaluationText = evaluation.available ?
      '<div class="metric-value">' + evaluation.mae.toFixed(2).replace(".", ",") + '</div><div class="metric-note">Error absoluto medio en validación leave-one-out, sobre ' + evaluation.count + ' películas enlazadas. Menor es mejor; aún es una prueba pequeña.</div>' :
      '<div class="metric-value">—</div><div class="metric-note">Se necesitan al menos 5 películas calificadas con características enlazadas para estimar este error.</div>';
    return '<div class="eyebrow">Laboratorio personal</div><h1>¿Qué está aprendiendo Prisma?</h1><p class="lead">Observa qué información tiene el motor, qué preferencias aparecen en tus notas y si sus predicciones se acercan a tus puntuaciones reales.</p>' +
      '<div class="metrics-grid">' + metric("Versión", "0.1", "Motor de contenido explicable") + metric("Historial enlazado", profile.withMetadata + "/" + stats.total, "Películas con géneros o temas") + metric("Señales aprendidas", String(profile.features.size), "Géneros y etiquetas distintas") + metric("Nota base", overall.toFixed(2).replace(".", ","), "Promedio histórico personal") + '</div>' +
      '<div style="margin-top:16px">' + learningNotice + '</div>' + renderTMDBHistoryPanel() +
      '<div class="two-col" style="margin-top:18px"><section class="panel"><div class="panel-head"><div><h3>Géneros con notas más altas</h3><p>Solo grupos con al menos dos películas.</p></div><span class="badge">Exploratorio</span></div>' +
      (top.length ? '<div class="bar-list">' + top.map(function (item) { return barRow(displayGenre(item.name), item.average, 10, item.average.toFixed(1).replace(".", ",") + " · n=" + item.count); }).join("") + '</div>' : '<p class="kicker">Todavía no hay suficientes datos de género. Amplía el catálogo y vuelve a calcular.</p>') +
      '</section><section class="panel"><div class="panel-head"><div><h3>Grupos con notas más bajas</h3><p>No significa que rechaces todo el género.</p></div></div>' +
      (bottom.length ? '<div class="bar-list">' + bottom.map(function (item) { return barRow(displayGenre(item.name), item.average, 10, item.average.toFixed(1).replace(".", ",") + " · n=" + item.count); }).join("") + '</div>' : '<p class="kicker">Todavía no hay suficientes datos de género.</p>') +
      '</section></div>' +
      '<div class="two-col" style="margin-top:17px"><section class="panel"><div class="panel-head"><div><h3>Prueba del modelo</h3><p>Oculta una película cada vez y predice su nota usando las demás.</p></div></div>' + evaluationText + '</section>' +
      '<section class="panel"><div class="panel-head"><div><h3>Historial de aprendizaje</h3><p>Acciones que han cambiado tus datos.</p></div></div>' +
      (events ? '<div class="event-list">' + events + '</div>' : '<p class="kicker">Cuando califiques películas o importes datos, el registro aparecerá aquí.</p>') + '</section></div>' +
      '<footer>El laboratorio distingue los datos observados de las estimaciones. La validación leave-one-out es experimental: las películas con metadatos escasos pueden hacer que el error no sea representativo.</footer>';
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
    return '<section class="panel tmdb-settings" style="margin-top:22px"><div class="panel-head"><div><h3>Conectar con TMDB</h3><p>Configura tu token de lectura o clave API v3. No la escribas en el código ni en GitHub.</p></div><span class="badge ' + (connected ? "badge-mint" : "") + '">' + (connected ? "Configurada aquí" : "Sin conectar") + '</span></div>' +
      '<div class="form-field"><label class="field-label" for="tmdbAuthType">Tipo de credencial</label><select id="tmdbAuthType" class="field"><option value="readToken" ' + (kind === "readToken" ? "selected" : "") + '>Token de acceso de lectura</option><option value="apiKey" ' + (kind === "apiKey" ? "selected" : "") + '>Clave API v3</option></select></div>' +
      '<div class="form-field"><label class="field-label" for="tmdbCredentialInput">Credencial TMDB</label><input class="field" id="tmdbCredentialInput" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' + (connected ? "Guardada; deja vacío para conservarla" : "Pega aquí tu credencial") + '"></div>' +
      '<div class="hero-actions"><button class="btn btn-primary" type="button" data-action="save-tmdb">Guardar en este dispositivo</button><button class="btn btn-secondary" type="button" data-action="test-tmdb">Probar conexión</button>' + (connected ? '<button class="btn btn-danger" type="button" data-action="remove-tmdb">Eliminar credencial</button>' : "") + '</div>' +
      '<div class="notice" style="margin-top:14px"><strong>Importante:</strong> se guarda solo en el almacenamiento local y no se incluye en tus respaldos ni en GitHub. Como Prisma es una web estática, el navegador debe enviar la credencial directamente a TMDB; no queda protegida como un secreto de servidor. <a href="https://developer.themoviedb.org/docs/faq" target="_blank" rel="noopener noreferrer">Condiciones y atribución de TMDB</a>.</div></section>';
  }

  function renderData() {
    const stats = summaryStats();
    return '<div class="eyebrow">Privacidad y mantenimiento</div><h1>Tus datos, bajo tu control</h1><p class="lead">Importa tu historial, amplía el catálogo y guarda una copia de seguridad.</p>' + renderTMDBSettings() +
      '<div class="settings-grid" style="margin-top:22px"><section class="panel"><div class="panel-head"><div><h3>Importar mi historial JSON</h3><p>Leerá las valoraciones de películas y omitirá entradas claramente identificadas como series.</p></div><span class="badge">Local</span></div><button class="btn btn-primary" type="button" data-action="import-json">Seleccionar JSON</button><p class="kicker" style="margin-top:13px">El importador busca la sección movies y listas de valoraciones como rM o ratings. Puedes conservar notas antiguas sin emociones registradas.</p></section>' +
      '<section class="panel"><div class="panel-head"><div><h3>Ampliar el catálogo</h3><p>Importa un CSV que incluya títulos y, si es posible, géneros o etiquetas.</p></div><span class="badge">Local</span></div><button class="btn btn-primary" type="button" data-action="import-catalog">Seleccionar CSV</button><p class="kicker" style="margin-top:13px">Compatible con columnas title/year/genres/tags/overview y con movies.csv de MovieLens. Los datos importados se quedan en este dispositivo.</p></section>' +
      '<section class="panel"><div class="panel-head"><div><h3>Copia de seguridad</h3><p>Exporta tu perfil para recuperarlo en el futuro.</p></div><span class="badge badge-mint">Recomendado</span></div><div class="hero-actions" style="margin-top:10px"><button class="btn btn-secondary" type="button" data-action="export-backup">Exportar mis datos</button><button class="btn btn-quiet" type="button" data-action="restore-backup">Restaurar copia</button></div><p class="kicker" style="margin-top:13px">El archivo de respaldo incluye tus calificaciones, lista de pendientes y emociones. No lo publiques en GitHub.</p></section>' +
      '<section class="panel"><div class="panel-head"><div><h3>Estado de tu perfil</h3><p>Información local y fecha de la última modificación.</p></div></div>' +
      '<div class="setting-row"><div><strong>Películas calificadas</strong><p>Valoraciones personales guardadas.</p></div><span class="badge">' + stats.total + '</span></div>' +
      '<div class="setting-row"><div><strong>Metadatos enlazados</strong><p>Películas con géneros o etiquetas utilizables.</p></div><span class="badge">' + stats.matched + '</span></div>' +
      '<div class="setting-row"><div><strong>Última actualización</strong><p>Solo se registra cuando cambias datos.</p></div><span class="kicker">' + escapeHTML(formatDate(state.updatedAt)) + '</span></div>' +
      '<div class="setting-row"><div><strong>Restablecer perfil</strong><p>Borra las notas, pendientes y emociones de este navegador.</p></div><button class="btn btn-danger btn-small" type="button" data-action="reset">Borrar</button></div></section></div>' +
      '<div class="notice" style="margin-top:16px"><strong>Importante sobre privacidad.</strong> Tu perfil se almacena en el almacenamiento local del navegador. Si borras sus datos, cambias de navegador o dispositivo, podrías perderlo. Exporta copias de seguridad regularmente. Los metadatos de catálogo pueden provenir de fuentes externas, pero tus valoraciones no se envían a ellas.</div>' +
      '<footer>Prisma está diseñado para un solo usuario. La web pública contiene el código y el catálogo de muestra; las preferencias personales no forman parte del repositorio.</footer>';
  }

  function renderApp() {
    const root = $("#appRoot");
    if (!root) return;
    $$(".nav-item").forEach(function (button) { button.classList.toggle("active", button.dataset.nav === currentPage); });
    const views = { home: renderHome, catalog: renderCatalog, library: renderLibrary, lab: renderLab, data: renderData };
    root.innerHTML = (views[currentPage] || renderHome)() + renderTMDBAttribution();
    if (currentPage === "catalog") {
      renderCatalogResults();
      renderTMDBResults();
    }
  }

  function openModal(movie, mode) {
    const root = $("#modalRoot");
    if (!root || !movie) return;
    const existing = ratingFor(movie.title);
    modalDraft = {
      movie: movie,
      mode: mode || "details",
      rating: existing ? ratingValue(existing) : 7,
      emotions: existing && Array.isArray(existing.emotions) ? existing.emotions.slice() : [],
      note: existing && existing.note ? existing.note : ""
    };
    renderModal();
    if (tmdbCredential && tmdbCredential.value && (movie.tmdbId || movie.source === "tmdb")) enrichTMDBMovie(movie);
  }

  function renderModal() {
    const root = $("#modalRoot");
    if (!root || !modalDraft) return;
    const movie = modalDraft.movie;
    const rating = ratingFor(movie.title);
    const emotionChips = EMOTIONS.map(function (emotion) {
      return '<button type="button" class="emotion-chip ' + (modalDraft.emotions.indexOf(emotion) >= 0 ? "selected" : "") + '" data-action="emotion" data-emotion="' + escapeHTML(emotion) + '">' + escapeHTML(emotion) + '</button>';
    }).join("");
    const features = (movie.genres || []).concat((movie.tags || []).slice(0, 5));
    const overview = movie.overview ? '<p>' + escapeHTML(movie.overview) + '</p>' : '<p>Aún no hay sinopsis guardada para esta película. Puedes registrar tu nota sin completar ningún análisis.</p>';
    const prediction = movie.prediction ? '<div class="notice"><strong>Estimación de Prisma: ' + movie.prediction.score.toFixed(1).replace(".", ",") + '/10.</strong> ' + escapeHTML(movie.prediction.explanation) + ' Confianza: ' + escapeHTML(movie.prediction.confidence) + '. Esta cifra es experimental.</div>' : "";
    root.innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle" data-modal-panel>' +
      '<div class="modal-top"><div><div class="eyebrow">' + escapeHTML(movie.year || "Película") + ' · ' + (rating ? "Ya calificada" : "Nueva película") + '</div><h2 id="modalTitle">' + escapeHTML(movie.title) + '</h2><div class="chip-row">' + features.slice(0, 8).map(function (feature) { return '<span class="chip">' + escapeHTML(displayGenre(feature)) + '</span>'; }).join("") + '</div></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Cerrar">✕</button></div>' +
      '<div style="margin-top:18px">' + overview + prediction + '</div>' +
      '<div class="hero-actions"><button type="button" class="btn btn-secondary" data-action="toggle-watchlist" data-title="' + escapeHTML(movie.title) + '">' + (isInWatchlist(movie.title) ? "✓ En mi lista" : "＋ Quiero verla") + '</button><button type="button" class="btn btn-quiet" data-action="close-modal">Cerrar</button></div>' +
      '<hr style="border:0;border-top:1px solid var(--line);margin:23px 0">' +
      '<div class="eyebrow">Tu experiencia</div><h3 style="margin-top:8px">¿Qué nota le das?</h3><div style="display:flex;align-items:center;gap:13px"><div class="rating-number" id="ratingPreview">' + modalDraft.rating + '</div><div class="form-field" style="flex:1;margin:0"><label class="field-label" for="ratingInput">Tu puntuación del 1 al 10</label><input class="field" id="ratingInput" type="range" min="1" max="10" step="1" value="' + modalDraft.rating + '"></div></div>' +
      '<div class="form-field"><span class="field-label">¿Qué emociones recuerdas? (opcional)</span><div class="emotion-grid">' + emotionChips + '</div><p class="kicker" style="margin-top:8px">No hace falta recordar toda la trama. Selecciona solo lo que te venga a la mente.</p></div>' +
      '<div class="form-field"><label class="field-label" for="ratingNote">¿Qué fue lo que más te hizo sentir? (opcional)</label><textarea class="field" id="ratingNote" rows="3" placeholder="Una frase basta; también puedes dejarlo vacío.">' + escapeHTML(modalDraft.note) + '</textarea></div>' +
      '<div class="hero-actions"><button class="btn btn-primary" type="button" data-action="save-rating">Guardar mi experiencia</button>' + (rating ? '<button class="btn btn-danger" type="button" data-action="delete-rating" data-title="' + escapeHTML(movie.title) + '">Quitar nota</button>' : "") + '</div>' +
      '</section></div>';
    $("#ratingInput").addEventListener("input", function (event) {
      modalDraft.rating = Number(event.target.value);
      $("#ratingPreview").textContent = String(modalDraft.rating);
    });
    $("#ratingNote").addEventListener("input", function (event) { modalDraft.note = event.target.value; });
  }

  function closeModal() {
    modalDraft = null;
    $("#modalRoot").innerHTML = "";
  }

  async function saveRating() {
    if (!modalDraft) return;
    const movie = modalDraft.movie;
    const rating = Number($("#ratingInput").value);
    if (!Number.isInteger(rating) || rating < 1 || rating > 10) {
      toast("La nota debe ser un número del 1 al 10.", true);
      return;
    }
    const existingIndex = state.rated.findIndex(function (entry) { return titleKey(entry.title) === titleKey(movie.title); });
    const old = existingIndex >= 0 ? state.rated[existingIndex] : {};
    const newEntry = Object.assign({}, old, {
      id: old.id || movie.id,
      tmdbId: movie.tmdbId || old.tmdbId || null,
      title: movie.title,
      year: movie.year || old.year || null,
      rating: rating,
      posterPath: movie.posterPath || old.posterPath || "",
      posterUrl: movie.posterUrl || old.posterUrl || "",
      voteAverage: movie.voteAverage || old.voteAverage || null,
      runtime: movie.runtime || old.runtime || null,
      overview: movie.overview || old.overview || "",
      tmdbFetchedAt: movie.tmdbFetchedAt || old.tmdbFetchedAt || null,
      metadataSource: movie.metadataSource || old.metadataSource || (movie.source === "tmdb" ? "tmdb" : null),
      genres: uniqueStrings((old.genres || []).concat(movie.genres || [])),
      tags: uniqueStrings((old.tags || []).concat(movie.tags || [])),
      emotions: modalDraft.emotions.slice(),
      note: String($("#ratingNote").value || "").trim(),
      updatedAt: new Date().toISOString(),
      source: "manual"
    });
    if (existingIndex >= 0) state.rated[existingIndex] = newEntry;
    else state.rated.unshift(newEntry);
    state.watchlist = state.watchlist.filter(function (entry) { return titleKey(entry.title) !== titleKey(movie.title); });
    logEvent("Valoración guardada: " + movie.title, "Nota " + rating + "/10" + (newEntry.emotions.length ? " · " + newEntry.emotions.length + " emociones registradas" : ""), "★");
    await persistState();
    closeModal();
    combineMovies();
    renderApp();
    toast("Tu experiencia quedó guardada en este dispositivo.");
  }

  async function deleteRating(title) {
    state.rated = state.rated.filter(function (entry) { return titleKey(entry.title) !== titleKey(title); });
    logEvent("Valoración eliminada", title, "−");
    await persistState();
    closeModal();
    combineMovies();
    renderApp();
    toast("Se quitó la valoración de " + title + ".");
  }

  async function toggleWatchlist(title) {
    const movie = findMovie(title) || { title: title, id: titleKey(title), genres: [], tags: [] };
    if (isInWatchlist(title)) {
      state.watchlist = state.watchlist.filter(function (entry) { return titleKey(entry.title) !== titleKey(title); });
      logEvent("Quitada de pendientes", title, "−");
      toast("Se quitó de tu lista.");
    } else {
      state.watchlist.unshift({ id: movie.id, tmdbId: movie.tmdbId || null, title: movie.title, year: movie.year || null, genres: movie.genres || [], tags: movie.tags || [], posterPath: movie.posterPath || "", posterUrl: movie.posterUrl || "", overview: movie.overview || "", tmdbFetchedAt: movie.tmdbFetchedAt || null, metadataSource: movie.metadataSource || (movie.source === "tmdb" ? "tmdb" : null), addedAt: new Date().toISOString() });
      logEvent("Añadida a pendientes", title, "＋");
      toast("Añadida a tu lista para verla después.");
    }
    await persistState();
    combineMovies();
    if (modalDraft) renderModal();
    else renderApp();
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

  function findRatingArrays(scope) {
    const arrays = Object.entries(scope || {}).filter(function (entry) {
      return Array.isArray(entry[1]) && /^(rm|ratings|ratedmovies|rated_movies|valoraciones|calificaciones|ratingsmovies)$/i.test(entry[0]);
    });
    const preferred = arrays.sort(function (a, b) {
      const ap = /^rm$/i.test(a[0]) ? 0 : 1;
      const bp = /^rm$/i.test(b[0]) ? 0 : 1;
      return ap - bp;
    });
    return preferred;
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
      const key = titleKey(title);
      if (!key || seen.has(key)) return;
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
    return { ratings: imported, metadataRecords: info.metaById.size, ratingArrays: arrays.map(function (item) { return item[0]; }) };
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
    if (!result.ratings.length) {
      throw new Error("No encontré valoraciones de películas con nota del 1 al 10. Comprueba que el archivo tenga una sección movies con rM/ratings y títulos identificables.");
    }
    const prior = new Map(state.rated.map(function (entry) { return [titleKey(entry.title), entry]; }));
    result.ratings.forEach(function (entry) {
      const key = titleKey(entry.title);
      const old = prior.get(key);
      if (old && old.source === "manual") return;
      prior.set(key, Object.assign({}, old || {}, entry));
    });
    state.rated = Array.from(prior.values());
    state.importedAt = new Date().toISOString();
    state.events.unshift({ title: "Historial importado", description: result.ratings.length + " valoraciones leídas; " + result.metadataRecords + " registros de catálogo encontrados", symbol: "⇧", at: new Date().toISOString() });
    state.events = state.events.slice(0, 80);
    state.updatedAt = new Date().toISOString();
    await persistState();
    combineMovies();
    renderApp();
    const linked = ratedMetadataCount();
    toast("Importadas " + result.ratings.length + " valoraciones. " + linked + " tienen características para el motor.");
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
    const idIndex = column(["movieid", "movie_id", "id", "tmdbid", "tmdb_id"]);
    const catalogRows = [];
    const seen = new Set();
    for (let i = 1; i < lines.length; i += 1) {
      const values = parseCSVLine(lines[i], delimiter);
      const title = values[titleIndex] ? values[titleIndex].trim() : "";
      if (!title) continue;
      const key = titleKey(title);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      let year = yearIndex >= 0 ? Number(values[yearIndex]) || null : null;
      const match = title.match(/\(((?:19|20)\d{2})\)\s*$/);
      if (!year && match) year = Number(match[1]);
      catalogRows.push({
        id: idIndex >= 0 && values[idIndex] ? String(values[idIndex]) : key,
        title: title.replace(/\s*\(((?:19|20)\d{2})\)\s*$/, ""),
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
    const map = new Map(customCatalog.map(function (movie) { return [titleKey(movie.title), movie]; }));
    parsed.forEach(function (movie) {
      const key = titleKey(movie.title);
      const old = map.get(key);
      map.set(key, old ? {
        id: old.id || movie.id, title: old.title, year: old.year || movie.year,
        genres: uniqueStrings((old.genres || []).concat(movie.genres || [])),
        tags: uniqueStrings((old.tags || []).concat(movie.tags || [])),
        overview: old.overview || movie.overview, source: "csv"
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
    return Object.assign(defaults, incoming, {
      rated: Array.isArray(incoming.rated) ? incoming.rated.filter(function (entry) { return entry && entry.title && ratingValue(entry) != null; }).map(function (entry) {
        return Object.assign({}, entry, { title: String(entry.title), rating: ratingValue(entry), emotions: Array.isArray(entry.emotions) ? entry.emotions : [], genres: splitList(entry.genres), tags: splitList(entry.tags) });
      }) : [],
      watchlist: Array.isArray(incoming.watchlist) ? incoming.watchlist.filter(function (entry) { return entry && entry.title; }) : [],
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
    if (!window.confirm("¿Borrar tus valoraciones, pendientes y emociones guardadas en este navegador? Esta acción no se puede deshacer sin una copia de seguridad.")) return;
    state = emptyState();
    customCatalog = [];
    await dbSet(STATE_KEY, state);
    await dbSet(CATALOG_KEY, customCatalog);
    combineMovies();
    renderApp();
    toast("Perfil local restablecido. El catálogo de muestra permanece disponible.");
  }

  function clickNav(page) {
    if (["home", "catalog", "library", "lab", "data"].indexOf(page) < 0) return;
    currentPage = page;
    renderApp();
    if (page === "catalog" && tmdbCredential && tmdbCredential.value) {
      loadTMDBPage(1, catalogQuery.trim().length >= 2 ? "search" : "popular", false);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  document.addEventListener("click", async function (event) {
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
      if (action === "tmdb-retry") { await loadTMDBPage(1, catalogQuery.trim().length >= 2 ? "search" : "popular", false); return; }
      if (action === "tmdb-more") { await loadTMDBPage(tmdbPage + 1, tmdbMode, true); return; }
      if (action === "enrich-history") { await enrichRatedHistoryWithTMDB(); return; }
      if (action === "export-backup") { await exportBackup(); return; }
      if (action === "restore-backup") { $("#backupImportInput").click(); return; }
      if (action === "reset") { await resetAll(); return; }
      if (action === "genre") { activeGenre = button.dataset.genre || "Todos"; renderApp(); return; }
      if (action === "details" || action === "rate") {
        const movie = tmdbResults.find(function (item) { return titleKey(item.title) === titleKey(button.dataset.title); }) || findMovie(button.dataset.title);
        if (movie) openModal(movie, action);
        return;
      }
      if (action === "toggle-watchlist") { await toggleWatchlist(button.dataset.title); return; }
      if (action === "save-rating") { await saveRating(); return; }
      if (action === "delete-rating") { await deleteRating(button.dataset.title); return; }
      if (action === "close-modal") { closeModal(); return; }
      if (action === "emotion") {
        if (!modalDraft) return;
        const emotion = button.dataset.emotion;
        const index = modalDraft.emotions.indexOf(emotion);
        if (index >= 0) modalDraft.emotions.splice(index, 1);
        else modalDraft.emotions.push(emotion);
        renderModal();
        return;
      }
      if (action === "backdrop-close" && event.target === button) { closeModal(); return; }
    } catch (error) {
      toast(error && error.message ? error.message : "No se pudo completar la acción.", true);
    }
  });

  document.addEventListener("input", function (event) {
    if (event.target.matches("[data-catalog-search]")) {
      catalogQuery = event.target.value;
      renderCatalogResults();
      if (tmdbSearchTimer) window.clearTimeout(tmdbSearchTimer);
      tmdbSearchTimer = window.setTimeout(function () {
        if (currentPage === "catalog" && tmdbCredential && tmdbCredential.value) {
          loadTMDBPage(1, catalogQuery.trim().length >= 2 ? "search" : "popular", false);
        }
      }, 450);
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
