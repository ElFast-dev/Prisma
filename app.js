(function () {
  "use strict";

  const $ = function (selector, root) { return (root || document).querySelector(selector); };
  const $$ = function (selector, root) { return Array.from((root || document).querySelectorAll(selector)); };
  const DB_NAME = "prisma-local-v1";
  const DB_STORE = "kv";
  const STATE_KEY = "state";
  const CATALOG_KEY = "catalogCustom";
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
    return {
      id: String(movie.id || movie.tmId || movie.tmdb_id || movie.movieId || titleKey(cleanTitle)),
      title: cleanTitle,
      year: year,
      genres: genres.map(displayGenre),
      tags: tags,
      overview: String(overview || ""),
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
      }
    });
    state.rated.forEach(function (rating) {
      if (!rating.title) return;
      const key = titleKey(rating.title);
      if (!map.has(key)) {
        const historyMovie = normalizeMovie(rating);
        if (historyMovie) {
          historyMovie.key = key;
          historyMovie.source = "history";
          map.set(key, historyMovie);
        }
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
    const target = $("#catalogResults");
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
    return '<div class="eyebrow">Explora</div><h1>Tu próximo descubrimiento</h1><p class="lead">Busca por título o filtra por género. Las películas que califiques ayudarán a ajustar las próximas recomendaciones.</p>' +
      '<div class="toolbar"><label class="search-wrap"><span>⌕</span><input class="field" type="search" data-catalog-search value="' + escapeHTML(catalogQuery) + '" placeholder="Buscar una película, un género o un año…" aria-label="Buscar en el catálogo"></label><button class="btn btn-secondary" type="button" data-action="import-catalog">＋ Ampliar catálogo CSV</button></div>' +
      '<div class="chip-row">' + genreChips + '</div>' +
      '<div class="section-head"><div><h2>Catálogo</h2><p id="catalogCount">Cargando resultados…</p></div></div><div id="catalogResults"></div>' +
      '<footer>El catálogo que viene con Prisma es solo una muestra. Puedes importar localmente un archivo CSV compatible para ampliarlo.</footer>';
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
      '<div style="margin-top:16px">' + learningNotice + '</div>' +
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

  function renderData() {
    const stats = summaryStats();
    return '<div class="eyebrow">Privacidad y mantenimiento</div><h1>Tus datos, bajo tu control</h1><p class="lead">Importa tu historial, amplía el catálogo y guarda una copia de seguridad. Nada de esto necesita una cuenta ni una API de pago.</p>' +
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
    root.innerHTML = (views[currentPage] || renderHome)();
    if (currentPage === "catalog") renderCatalogResults();
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
      title: movie.title,
      year: movie.year || old.year || null,
      rating: rating,
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
      state.watchlist.unshift({ id: movie.id, title: movie.title, year: movie.year || null, genres: movie.genres || [], tags: movie.tags || [], addedAt: new Date().toISOString() });
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
      if (action === "export-backup") { await exportBackup(); return; }
      if (action === "restore-backup") { $("#backupImportInput").click(); return; }
      if (action === "reset") { await resetAll(); return; }
      if (action === "genre") { activeGenre = button.dataset.genre || "Todos"; renderApp(); return; }
      if (action === "details" || action === "rate") {
        const movie = findMovie(button.dataset.title);
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
        dbGet(CATALOG_KEY)
      ]);
      seedCatalog = Array.isArray(results[0]) ? results[0].map(normalizeMovie).filter(Boolean) : [];
      state = ensureState(results[1]);
      customCatalog = Array.isArray(results[2]) ? results[2].map(normalizeMovie).filter(Boolean) : [];
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
