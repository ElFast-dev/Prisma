import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Film, LoaderCircle, WifiOff, SlidersHorizontal, BrainCircuit, RefreshCw } from "lucide-react";
import { UnifiedSearchBar } from "../../components/UnifiedSearchBar";
import { EmptyState } from "../../components/EmptyState";
import { MoviePosterCard } from "../../components/MoviePosterCard";
import { useAccessibleDialog } from "../../components/useAccessibleDialog";
import {
  appendDiscoverMovies,
  appendDiscoverSpectroRecommendations,
  countActiveDiscoverFilters,
  DEFAULT_DISCOVER_FILTERS,
  DISCOVER_GENRES,
  DISCOVER_LANGUAGES,
  getDiscoverFilterErrors,
  filterDiscoverLibraryVisibility,
  selectDiscoverSpectroMovies,
  hasActiveDiscoverFilters,
  normalizeDiscoverFilters,
  type DiscoverFilters
} from "../../domain/discoverFilters";
import {
  discoverMovies,
  getImageConfiguration,
  getTmdbImageUrl,
  getTrendingMovies,
  searchMovies,
  getMovieDetailsForEnrichment,
  type TmdbMovieDetails,
  type TmdbMovieSummary
} from "../../infrastructure/tmdb/TmdbService";
import { getTmdbAccessToken } from "../../infrastructure/tmdb/settings";
import { getDiscoverLibraryStatus } from "../../infrastructure/database/movieRepository";
import { getSpectroDiscoverRecommendations } from "../../infrastructure/database/spectroRepository";
import {
  rankSpectroRecommendations,
  type SpectroRecommendation
} from "../../domain/spectro";
import { runWithConcurrency } from "../../domain/asyncPool";
import { saveCurrentRouteScrollPosition } from "../../navigation/scrollRestoration";
import {
  getDiscoverFeedKey,
  getDiscoverSpectroState,
  preserveDiscoverSpectroReadyState,
  readDiscoverSession,
  writeDiscoverSession,
  type DiscoverSpectroState
} from "./discoverSession";

type FeedState = "loading" | "ready" | "error" | "unconfigured";
async function filterSearchResults(
  token: string,
  results: TmdbMovieSummary[],
  filters: DiscoverFilters
): Promise<TmdbMovieSummary[]> {
  const needsRuntime = Boolean(filters.runtimeMin || filters.runtimeMax);
  const needsRevenue = filters.sortBy === "revenue.desc";
  const needsDetails = needsRuntime || needsRevenue;
  const detailsById = new Map<number, TmdbMovieDetails | undefined>();
  if (needsDetails) {
    await runWithConcurrency(results, 4, async (movie) => {
      try {
        detailsById.set(movie.id, await getMovieDetailsForEnrichment(token, movie.id));
      } catch {
        detailsById.set(movie.id, undefined);
      }
    });
  }

  const filtered = results.filter((movie) => {
    if (filters.genreId && !movie.genre_ids?.includes(Number(filters.genreId))) return false;
    const year = movie.release_date && /^\d{4}/.test(movie.release_date)
      ? Number(movie.release_date.slice(0, 4))
      : undefined;
    if (filters.yearFrom && (year === undefined || year < Number(filters.yearFrom))) return false;
    if (filters.yearTo && (year === undefined || year > Number(filters.yearTo))) return false;
    if (filters.minVoteAverage && (movie.vote_average ?? 0) < Number(filters.minVoteAverage)) return false;
    if (filters.minVoteCount && (movie.vote_count ?? 0) < Number(filters.minVoteCount)) return false;
    if (filters.originalLanguage && movie.original_language !== filters.originalLanguage) return false;
    if (needsRuntime) {
      const runtime = detailsById.get(movie.id)?.runtime;
      if (!Number.isFinite(runtime) || !runtime || runtime <= 0) return false;
      if (filters.runtimeMin && runtime < Number(filters.runtimeMin)) return false;
      if (filters.runtimeMax && runtime > Number(filters.runtimeMax)) return false;
    }
    return true;
  });

  const sorted = [...filtered];
  switch (filters.sortBy) {
    case "vote_average.desc": sorted.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0)); break;
    case "primary_release_date.desc": sorted.sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? "")); break;
    case "primary_release_date.asc": sorted.sort((a, b) => (a.release_date ?? "").localeCompare(b.release_date ?? "")); break;
    case "revenue.desc": sorted.sort((a, b) => {
      const left = detailsById.get(a.id)?.revenue;
      const right = detailsById.get(b.id)?.revenue;
      const leftValid = typeof left === "number" && Number.isFinite(left) && left >= 0;
      const rightValid = typeof right === "number" && Number.isFinite(right) && right >= 0;
      if (!leftValid && !rightValid) return (b.popularity ?? 0) - (a.popularity ?? 0);
      if (!leftValid) return 1;
      if (!rightValid) return -1;
      return right - left;
    }); break;
    case "original_title.asc": sorted.sort((a, b) => (a.original_title ?? a.title).localeCompare(b.original_title ?? b.title, "es", { sensitivity: "base" })); break;
    default: sorted.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0)); break;
  }
  return sorted;
}

const SORT_OPTIONS = [
  { id: "spectro", label: "Para ti · Espectro" },
  { id: "popularity.desc", label: "Más populares" },
  { id: "vote_average.desc", label: "Mejor valoradas" },
  { id: "primary_release_date.desc", label: "Estreno más reciente" },
  { id: "primary_release_date.asc", label: "Estreno más antiguo" },
  { id: "revenue.desc", label: "Mayor recaudación" },
  { id: "original_title.asc", label: "Título A–Z" }
] as const;

export function DiscoverPage() {
  const restoredSession = useMemo(() => readDiscoverSession(), []);
  const hasRestoredMovies = Boolean(restoredSession?.movies.length && getTmdbAccessToken());
  const [query, setQuery] = useState(restoredSession?.query ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersDialogRef = useAccessibleDialog(filtersOpen, () => setFiltersOpen(false));
  const [appliedFilters, setAppliedFilters] = useState<DiscoverFilters>(
    restoredSession?.appliedFilters ?? DEFAULT_DISCOVER_FILTERS
  );
  const [draftFilters, setDraftFilters] = useState<DiscoverFilters>(
    restoredSession?.appliedFilters ?? DEFAULT_DISCOVER_FILTERS
  );
  const [movies, setMovies] = useState<TmdbMovieSummary[]>(restoredSession?.movies ?? []);
  const [recommendations, setRecommendations] = useState<SpectroRecommendation[]>([]);
  const [spectroState, setSpectroState] = useState<DiscoverSpectroState>("loading");
  const [watchedTmdbIds, setWatchedTmdbIds] = useState<number[]>([]);
  const [pendingTmdbIds, setPendingTmdbIds] = useState<number[]>([]);
  const [state, setState] = useState<FeedState>(hasRestoredMovies ? "ready" : "loading");
  const [error, setError] = useState("");
  const [showingCachedData, setShowingCachedData] = useState(restoredSession?.showingCachedData ?? false);
  const [cachedFetchedAt, setCachedFetchedAt] = useState(restoredSession?.cachedFetchedAt ?? "");
  const [page, setPage] = useState(restoredSession?.page ?? 1);
  const [totalPages, setTotalPages] = useState(restoredSession?.totalPages ?? 1);
  const [totalResults, setTotalResults] = useState(restoredSession?.totalResults ?? 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);
  const [refreshAvailable, setRefreshAvailable] = useState(false);
  const [imageBase, setImageBase] = useState(restoredSession?.imageBase ?? "https://image.tmdb.org/t/p/");
  const requestId = useRef(0);
  const feedRevisionRef = useRef(0);
  const loadedFeedKeyRef = useRef(
    hasRestoredMovies && restoredSession
      ? getDiscoverFeedKey(restoredSession.query, restoredSession.appliedFilters)
      : ""
  );

  const activeFilterCount = countActiveDiscoverFilters(appliedFilters);
  const filtersActive = activeFilterCount > 0;
  const catalogFiltersActive = hasActiveDiscoverFilters(appliedFilters);
  const filterErrors = getDiscoverFilterErrors(draftFilters);
  const waitingForSpectro = state === "ready"
    && appliedFilters.sortBy === "spectro"
    && spectroState === "loading";
  const rankedMovies = useMemo(() => (
    selectDiscoverSpectroMovies(movies, recommendations, appliedFilters.sortBy)
  ), [movies, recommendations, appliedFilters.sortBy]);
  const visibleMovies = useMemo(() => filterDiscoverLibraryVisibility(
    rankedMovies,
    new Set(watchedTmdbIds),
    new Set(pendingTmdbIds),
    appliedFilters
  ), [rankedMovies, watchedTmdbIds, pendingTmdbIds, appliedFilters.hideWatched, appliedFilters.hidePending]);
  const activeFilterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    const genre = DISCOVER_GENRES.find((item) => String(item.id) === appliedFilters.genreId);
    const language = DISCOVER_LANGUAGES.find((item) => item.id === appliedFilters.originalLanguage);
    const sort = SORT_OPTIONS.find((item) => item.id === appliedFilters.sortBy);
    if (genre) chips.push({ key: "genre", label: "Género: " + genre.label });
    if (appliedFilters.runtimeMin || appliedFilters.runtimeMax) {
      chips.push({
        key: "runtime",
        label: "Duración: " + (appliedFilters.runtimeMin || "0") + "–" + (appliedFilters.runtimeMax || "∞") + " min"
      });
    }
    if (appliedFilters.yearFrom || appliedFilters.yearTo) {
      chips.push({
        key: "year",
        label: "Año: " + (appliedFilters.yearFrom || "1888") + "–" + (appliedFilters.yearTo || "actualidad")
      });
    }
    if (appliedFilters.minVoteAverage) chips.push({ key: "rating", label: "Valoración: ≥ " + appliedFilters.minVoteAverage });
    if (appliedFilters.minVoteCount) chips.push({ key: "votes", label: "Votos: ≥ " + Number(appliedFilters.minVoteCount).toLocaleString("es-PA") });
    if (language) chips.push({ key: "language", label: "Idioma: " + language.label });
    if (appliedFilters.hideWatched) chips.push({ key: "watched", label: "Ocultar vistas" });
    if (appliedFilters.hidePending) chips.push({ key: "pending", label: "Ocultar pendientes" });
    if (sort && appliedFilters.sortBy !== "spectro") chips.push({ key: "sort", label: "Orden: " + sort.label });
    return chips;
  }, [appliedFilters]);

  const loadFirstPage = useCallback(async (searchText: string, filters: DiscoverFilters) => {
    const currentRequest = ++requestId.current;
    feedRevisionRef.current += 1;
    loadingMoreRef.current = false;
    loadedFeedKeyRef.current = getDiscoverFeedKey(searchText, filters);
    const token = getTmdbAccessToken();
    if (!token) {
      setState("unconfigured");
      setMovies([]);
      setTotalResults(0);
      return;
    }

    setState("loading");
    setRefreshAvailable(false);
    setSpectroState("loading");
    setRecommendations([]);
    setError("");
    setMovies([]);
    setShowingCachedData(false);
    setCachedFetchedAt("");
    setPage(1);
    setTotalPages(1);
    setTotalResults(0);
    setLoadingMore(false);

    try {
      const useFilters = hasActiveDiscoverFilters(filters);
      const [rawFeed, imageConfig, libraryStatus] = await Promise.all([
        searchText.trim()
          ? searchMovies(token, searchText, 1)
          : useFilters
            ? discoverMovies(token, filters, 1)
            : getTrendingMovies(token, 1),
        getImageConfiguration(token).catch(() => ({
          secure_base_url: "https://image.tmdb.org/t/p/",
          poster_sizes: [],
          backdrop_sizes: [],
          profile_sizes: []
        })),
        getDiscoverLibraryStatus().catch(() => ({ watchedTmdbIds: [], pendingTmdbIds: [] }))
      ]);
      const feed = searchText.trim() && useFilters
        ? { ...rawFeed, movies: await filterSearchResults(token, rawFeed.movies, filters) }
        : rawFeed;
      if (currentRequest !== requestId.current) return;
      setMovies(feed.movies);
      setTotalPages(rawFeed.totalPages);
      setTotalResults(rawFeed.totalResults);
      setPage(1);
      setImageBase(imageConfig.secure_base_url);
      setShowingCachedData(feed.stale);
      setCachedFetchedAt(feed.stale ? feed.fetchedAt : "");
      setWatchedTmdbIds(libraryStatus.watchedTmdbIds);
      setPendingTmdbIds(libraryStatus.pendingTmdbIds);
      if (currentRequest !== requestId.current) return;
      // Primero se presenta el catálogo; el enriquecimiento de Espectro continúa
      // en segundo plano para no bloquear la búsqueda en las consultas de metadatos.
      setState("ready");
      void getSpectroDiscoverRecommendations(feed.movies).then((personalized) => {
        if (currentRequest !== requestId.current) return;
        setRecommendations(rankSpectroRecommendations(personalized.recommendations));
        const nextSpectroState = getDiscoverSpectroState(
          personalized.movieCount,
          personalized.recommendations.length
        );
        setSpectroState((current) => preserveDiscoverSpectroReadyState(current, nextSpectroState));
      }).catch(() => {
        if (currentRequest !== requestId.current) return;
        // Un error tardío no debe borrar recomendaciones que ya aportó otra página.
        setSpectroState((current) => preserveDiscoverSpectroReadyState(current, "unavailable"));
      });
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setState("error");
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo.");
    }
  }, []);


  useEffect(() => {
    let active = true;
    const sessionRequest = requestId.current;
    const sessionFeedKey = loadedFeedKeyRef.current;
    const sessionRevision = feedRevisionRef.current;
    const sessionMovies = movies;
    if (sessionMovies.length > 0) {
      void Promise.all([
        getDiscoverLibraryStatus(),
        getSpectroDiscoverRecommendations(sessionMovies)
      ]).then(([libraryStatus, personalized]) => {
        // La sesión restaurada solo puede completar su propio feed, nunca una
        // búsqueda o página más reciente iniciada mientras se calculaba Espectro.
        if (
          !active
          || sessionRequest !== requestId.current
          || sessionFeedKey !== loadedFeedKeyRef.current
          || sessionRevision !== feedRevisionRef.current
        ) return;
        setWatchedTmdbIds(libraryStatus.watchedTmdbIds);
        setPendingTmdbIds(libraryStatus.pendingTmdbIds);
        setRecommendations(rankSpectroRecommendations(personalized.recommendations));
        const nextSpectroState = getDiscoverSpectroState(
          personalized.movieCount,
          personalized.recommendations.length
        );
        setSpectroState((current) => preserveDiscoverSpectroReadyState(current, nextSpectroState));
      }).catch(() => {
        if (
          active
          && sessionRequest === requestId.current
          && sessionFeedKey === loadedFeedKeyRef.current
          && sessionRevision === feedRevisionRef.current
        ) {
          setSpectroState((current) => preserveDiscoverSpectroReadyState(current, "unavailable"));
        }
      });
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const requestedFeedKey = getDiscoverFeedKey(query, appliedFilters);
    if (loadedFeedKeyRef.current === requestedFeedKey) return;
    // Invalida de inmediato cualquier enriquecimiento de una consulta anterior,
    // incluso durante la pausa de escritura antes de solicitar la nueva página.
    requestId.current += 1;
    const timer = window.setTimeout(() => void loadFirstPage(query, appliedFilters), query.trim() ? 420 : 0);
    return () => window.clearTimeout(timer);
  }, [query, appliedFilters, loadFirstPage]);

  useEffect(() => {
    const refreshAfterReconnect = () => {
      // No sustituir resultados ni mover el scroll mientras la persona explora.
      // La actualización queda disponible como acción explícita.
      if (navigator.onLine) setRefreshAvailable(true);
    };
    window.addEventListener("online", refreshAfterReconnect);
    return () => window.removeEventListener("online", refreshAfterReconnect);
  }, [loadFirstPage, query, appliedFilters]);

  useEffect(() => {
    const feedIsCurrent = loadedFeedKeyRef.current === getDiscoverFeedKey(query, appliedFilters)
      && state === "ready";
    writeDiscoverSession({
      query,
      appliedFilters,
      movies: feedIsCurrent ? movies : [],
      page: feedIsCurrent ? page : 1,
      totalPages: feedIsCurrent ? totalPages : 1,
      totalResults: feedIsCurrent ? totalResults : 0,
      imageBase,
      showingCachedData: feedIsCurrent && showingCachedData,
      cachedFetchedAt: feedIsCurrent ? cachedFetchedAt : ""
    });
  }, [
    query, appliedFilters, movies, page, totalPages, totalResults, imageBase,
    showingCachedData, cachedFetchedAt, state
  ]);


  const loadMore = useCallback(async () => {
    const token = getTmdbAccessToken();
    if (!token || loadingMore || loadingMoreRef.current || state !== "ready" || page >= totalPages) return;
    loadingMoreRef.current = true;
    const currentRequest = requestId.current;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const useFilters = hasActiveDiscoverFilters(appliedFilters);
      const rawResult = query.trim()
        ? await searchMovies(token, query, nextPage)
        : useFilters
          ? await discoverMovies(token, appliedFilters, nextPage)
          : await getTrendingMovies(token, nextPage);
      const existingIds = new Set(movies.map((movie) => movie.id));
      // Cada página se filtra y ordena de forma independiente. Las películas que
      // ya están en pantalla permanecen en su sitio; solo se añade contenido abajo.
      const filteredPage = query.trim() && useFilters
        ? await filterSearchResults(token, rawResult.movies, appliedFilters)
        : rawResult.movies;
      if (currentRequest !== requestId.current) return;
      const newPageMovies = filteredPage.filter((movie) => !existingIds.has(movie.id));
      // Invalida cualquier resultado atrasado de la sesión restaurada antes de
      // añadir una página, pero conserva intacto el orden que ya se está mostrando.
      feedRevisionRef.current += 1;
      setMovies((current) => appendDiscoverMovies(current, newPageMovies));
      void getSpectroDiscoverRecommendations(newPageMovies).then((personalized) => {
        if (currentRequest !== requestId.current) return;
        const rankedPageRecommendations = rankSpectroRecommendations(personalized.recommendations);
        setRecommendations((current) => (
          appendDiscoverSpectroRecommendations(current, rankedPageRecommendations)
        ));
        const nextSpectroState = getDiscoverSpectroState(
          personalized.movieCount,
          personalized.recommendations.length
        );
        setSpectroState((current) => preserveDiscoverSpectroReadyState(current, nextSpectroState));
      }).catch(() => {
        if (currentRequest === requestId.current) {
          setSpectroState((current) => preserveDiscoverSpectroReadyState(current, "unavailable"));
        }
      });
      if (rawResult.stale) {
        setShowingCachedData(true);
        setCachedFetchedAt(rawResult.fetchedAt);
      }
      setPage(nextPage);
      setTotalResults(rawResult.totalResults);
    } catch {
      if (currentRequest === requestId.current) {
        setError("No se pudieron cargar más películas. Comprueba tu conexión.");
      }
    } finally {
      if (currentRequest === requestId.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [appliedFilters, loadingMore, movies, page, query, state, totalPages]);

  function openMovie(movie: TmdbMovieSummary) {
    saveCurrentRouteScrollPosition();
    window.location.hash = "#/movie/" + movie.id;
  }

  function openFilters() {
    setDraftFilters(appliedFilters);
    setFiltersOpen(true);
  }

  function updateDraft(patch: Partial<DiscoverFilters>) {
    setDraftFilters((current) => ({ ...current, ...patch }));
  }

  function applyFilters() {
    if (filterErrors.length) return;
    setAppliedFilters(normalizeDiscoverFilters(draftFilters));
    setFiltersOpen(false);
  }

  function clearDraftFilters() {
    setDraftFilters(DEFAULT_DISCOVER_FILTERS);
  }

  function clearAppliedFilter(key: string) {
    const next = { ...appliedFilters };
    switch (key) {
      case "genre": next.genreId = ""; break;
      case "runtime": next.runtimeMin = ""; next.runtimeMax = ""; break;
      case "year": next.yearFrom = ""; next.yearTo = ""; break;
      case "rating": next.minVoteAverage = ""; break;
      case "votes": next.minVoteCount = ""; break;
      case "language": next.originalLanguage = ""; break;
      case "watched": next.hideWatched = false; break;
      case "pending": next.hidePending = false; break;
      case "sort": next.sortBy = "spectro"; break;
      default: return;
    }
    const normalized = normalizeDiscoverFilters(next);
    setAppliedFilters(normalized);
    setDraftFilters(normalized);
  }

  function applyDiscoverPreset(preset: "rated" | "recent" | "classics" | "short") {
    const currentYear = new Date().getFullYear();
    const base = {
      ...DEFAULT_DISCOVER_FILTERS,
      hideWatched: draftFilters.hideWatched,
      hidePending: draftFilters.hidePending
    };
    if (preset === "rated") {
      updateDraft({ ...base, minVoteAverage: "7.5", minVoteCount: "500", sortBy: "vote_average.desc" });
    } else if (preset === "recent") {
      updateDraft({ ...base, yearFrom: String(currentYear - 4), yearTo: String(currentYear), sortBy: "primary_release_date.desc" });
    } else if (preset === "classics") {
      updateDraft({ ...base, yearTo: "1989", sortBy: "vote_average.desc" });
    } else {
      updateDraft({ ...base, runtimeMax: "100", sortBy: "popularity.desc" });
    }
  }

  function clearAppliedFilters() {
    const cleared = { ...DEFAULT_DISCOVER_FILTERS, hideWatched: false, hidePending: false };
    setAppliedFilters(cleared);
    setDraftFilters(cleared);
    setQuery("");
  }

  return (
    <div className="page page-discover">
      <UnifiedSearchBar
        inputId="discover-search"
        placeholder="Buscar por título..."
        searchLabel="Buscar películas por título o abrir filtros para explorar el catálogo"
        value={query}
        onChange={setQuery}
        onFiltersClick={openFilters}
        filtersOpen={filtersOpen}
        filtersActive={filtersActive}
        settingsHref="#/settings"
      />

      <p className="discover-search-hint">Busca por título o combina filtros para descubrir algo nuevo.</p>

      {state === "unconfigured" ? (
        <EmptyState
          icon={<Film size={27} />}
          title="Conecta tu catálogo cinematográfico"
          description="Introduce tu propia credencial de TMDB en Ajustes para descubrir películas."
          action={<a className="button button-primary" href="#/settings">Configurar TMDB</a>}
        />
      ) : state === "error" && movies.length === 0 ? (
        <EmptyState
          icon={<WifiOff size={26} />}
          title="No se pudo consultar el catálogo"
          description={error || "Comprueba tu conexión y la credencial de TMDB."}
          action={<button className="button button-secondary" onClick={() => void loadFirstPage(query, appliedFilters)}>Reintentar</button>}
        />
      ) : (
        <>
          {refreshAvailable && state === "ready" && (
            <div className="discover-refresh-note" role="status">
              <span>Conexión restablecida. Tus resultados actuales no se han movido.</span>
              <button type="button" onClick={() => void loadFirstPage(query, appliedFilters)}>
                <RefreshCw size={14} /> Actualizar
              </button>
            </div>
          )}
          {filtersActive && state === "ready" && (
            <div className="discover-active-filters" role="group" aria-label="Filtros aplicados">
              <span className="discover-filter-summary-icon" aria-hidden="true"><SlidersHorizontal size={14} /></span>
              <span className="sr-only">{activeFilterCount} {activeFilterCount === 1 ? "filtro activo" : "filtros activos"}</span>
              <div className="discover-filter-chips">
                {activeFilterChips.map((chip) => (
                  <button
                    key={chip.key}
                    className="discover-filter-chip"
                    type="button"
                    aria-label={"Quitar filtro " + chip.label}
                    onClick={() => clearAppliedFilter(chip.key)}
                  >
                    <span>{chip.label}</span><X size={13} />
                  </button>
                ))}
              </div>
              <button className="discover-clear-filters" type="button" onClick={clearAppliedFilters}>Limpiar todo</button>
            </div>
          )}
          {state === "ready" && movies.length > 0 && (
            <p className="discover-results-meta" role="status">
              {query.trim() && catalogFiltersActive
                ? visibleMovies.length + " de " + movies.length + " coincidencias cargadas · " + totalResults.toLocaleString("es-PA") + " resultados de búsqueda"
                : totalResults.toLocaleString("es-PA") + " resultados en TMDB"}
              {" · Página " + page + " de " + totalPages}
            </p>
          )}
          {state === "ready" && movies.length > 0 && (
            <div className="discover-spectro-note" role="status">
              <BrainCircuit size={16} />
              <span>
                {spectroState === "loading"
                  ? "Espectro está preparando una lista estable según tus afinidades. Las películas aparecerán cuando termine de ordenarlas."
                  : spectroState === "ready"
                    ? "Espectro prioriza los resultados según tus afinidades, valoraciones y películas favoritas. Encaje y nota prevista son estimaciones."
                    : spectroState === "insufficient"
                      ? "Espectro todavía necesita al menos tres películas distintas calificadas para personalizar estas sugerencias."
                      : spectroState === "no-matches"
                        ? "Espectro no encontró coincidencias personales con evidencia suficiente; se conserva el orden de TMDB."
                        : "No se pudo calcular la clasificación personal ahora. Los resultados de TMDB siguen disponibles."}
              </span>
            </div>
          )}
          {showingCachedData && (
            <p className="cached-feed-note" role="status">
              <WifiOff size={14} />
              <span>Mostrando catálogo guardado en este dispositivo{cachedFetchedAt ? " · " + new Date(cachedFetchedAt).toLocaleString("es-PA") : ""}.</span>
            </p>
          )}
          {(state === "loading" && movies.length === 0) || waitingForSpectro ? (
            <>
              {waitingForSpectro && <p className="discover-ranking-status" role="status">Preparando tus recomendaciones sin cambiar la lista mientras navegas…</p>}
              <div className="poster-grid" aria-label={waitingForSpectro ? "Preparando recomendaciones de Espectro" : "Cargando películas"}>
                {Array.from({ length: 8 }, (_, index) => <div className="poster-skeleton" key={index} />)}
              </div>
            </>
          ) : visibleMovies.length === 0 ? (
            <EmptyState
              icon={<Search size={25} />}
              title="No encontramos películas"
              description={query.trim()
                ? "No hay títulos que coincidan con esta búsqueda y sus criterios. Prueba otro término o amplía los filtros."
                : "Prueba otra combinación de filtros o revisa la escritura."}
              action={<button className="button button-secondary" type="button" onClick={clearAppliedFilters}>Limpiar búsqueda y filtros</button>}
            />
          ) : (
            <>
              <div className="poster-grid">
                {visibleMovies.map((movie) => (
                  <MoviePosterCard
                    key={movie.id}
                    title={movie.title}
                    imageUrl={getTmdbImageUrl(imageBase, movie.poster_path, "w342")}
                    onClick={() => openMovie(movie)}
                  />
                ))}
              </div>
            </>
          )}
          {state === "ready" && page < totalPages && (
            <button className="button button-secondary discover-load-more" type="button" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore
                ? <><LoaderCircle size={17} className="spin" /> Cargando películas…</>
                : <>Cargar más películas <span>({page} de {totalPages} páginas)</span></>}
            </button>
          )}
          {loadingMore && <p className="discover-load-more-hint" role="status">Añadiendo resultados al final; tu posición actual se conserva.</p>}
          {error && movies.length > 0 && <p className="feed-inline-error">{error}</p>}
        </>
      )}

      {filtersOpen && (
        <div className="sheet-backdrop library-sheet-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setFiltersOpen(false);
        }}>
          <section ref={filtersDialogRef} tabIndex={-1} className="bottom-sheet library-bottom-sheet library-filter-sheet discover-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="discover-filters-title">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2 id="discover-filters-title">Filtros</h2>
              <button className="icon-button" type="button" onClick={() => setFiltersOpen(false)} aria-label="Cerrar filtros"><X size={19} /></button>
            </div>

            <p className="discover-filter-intro">Empieza con un atajo o ajusta solo lo que te importa. Los filtros se combinan entre sí.</p>

            <div className="library-sheet-section">
              <div className="library-sheet-label-row"><span>¿Qué te apetece ver?</span><span>Atajos</span></div>
              <div className="discover-presets">
                <button type="button" onClick={() => applyDiscoverPreset("rated")}>Bien valoradas</button>
                <button type="button" onClick={() => applyDiscoverPreset("recent")}>Recientes</button>
                <button type="button" onClick={() => applyDiscoverPreset("classics")}>Clásicos</button>
                <button type="button" onClick={() => applyDiscoverPreset("short")}>Hasta 100 min</button>
              </div>
            </div>

            <div className="library-sheet-section">
              <div className="library-sheet-label-row"><span>Géneros populares</span><span>Elige uno</span></div>
              <div className="discover-genre-shortcuts" role="group" aria-label="Géneros populares">
                {[
                  { id: 18, label: "Drama" },
                  { id: 35, label: "Comedia" },
                  { id: 28, label: "Acción" },
                  { id: 53, label: "Suspenso" },
                  { id: 878, label: "Ciencia ficción" },
                  { id: 27, label: "Terror" }
                ].map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    aria-pressed={draftFilters.genreId === String(genre.id)}
                    className={draftFilters.genreId === String(genre.id) ? "is-selected" : ""}
                    onClick={() => updateDraft({ genreId: draftFilters.genreId === String(genre.id) ? "" : String(genre.id) })}
                  >
                    {genre.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="library-sheet-section">
              <div className="library-sheet-label-row"><span>Mi Biblioteca</span><span>Exclusiones locales</span></div>
              <label className="discover-exclusion-option">
                <input
                  type="checkbox"
                  checked={draftFilters.hideWatched}
                  onChange={(event) => updateDraft({ hideWatched: event.target.checked })}
                />
                <span>Ocultar películas que ya vi</span>
              </label>
              <label className="discover-exclusion-option">
                <input
                  type="checkbox"
                  checked={draftFilters.hidePending}
                  onChange={(event) => updateDraft({ hidePending: event.target.checked })}
                />
                <span>Ocultar películas pendientes</span>
              </label>
              <p className="discover-filter-help">Son exclusiones de este catálogo, no borran nada de tu Biblioteca ni se envían a TMDB.</p>
            </div>

            <div className="library-sheet-section">
              <label className="library-sheet-field" htmlFor="discover-genre">
                <span>Todos los géneros disponibles</span>
                <select id="discover-genre" className="library-refinement-select" value={draftFilters.genreId} onChange={(event) => updateDraft({ genreId: event.target.value })}>
                  <option value="">Todos los géneros</option>
                  {DISCOVER_GENRES.map((genre) => <option key={genre.id} value={String(genre.id)}>{genre.label}</option>)}
                </select>
              </label>
            </div>

            <div className="library-sheet-section">
              <div className="library-sheet-label-row"><span>Duración</span><span>Personalizable</span></div>
              <div className="discover-duration-shortcuts" role="group" aria-label="Atajos de duración">
                <button type="button" aria-pressed={!draftFilters.runtimeMin && draftFilters.runtimeMax === "100"} onClick={() => updateDraft({ runtimeMin: "", runtimeMax: "100" })}>Hasta 100 min</button>
                <button type="button" aria-pressed={draftFilters.runtimeMin === "100" && draftFilters.runtimeMax === "140"} onClick={() => updateDraft({ runtimeMin: "100", runtimeMax: "140" })}>100–140 min</button>
                <button type="button" aria-pressed={draftFilters.runtimeMin === "140" && !draftFilters.runtimeMax} onClick={() => updateDraft({ runtimeMin: "140", runtimeMax: "" })}>Más de 140 min</button>
              </div>
              <div className="library-year-range">
                <label className="library-sheet-field" htmlFor="discover-runtime-min">
                  <span>Mínima</span>
                  <input id="discover-runtime-min" className="library-refinement-select" type="number" inputMode="numeric" min="1" max="600" placeholder="Sin mínimo" value={draftFilters.runtimeMin} onChange={(event) => updateDraft({ runtimeMin: event.target.value })} />
                </label>
                <label className="library-sheet-field" htmlFor="discover-runtime-max">
                  <span>Máxima</span>
                  <input id="discover-runtime-max" className="library-refinement-select" type="number" inputMode="numeric" min="1" max="600" placeholder="Sin máximo" value={draftFilters.runtimeMax} onChange={(event) => updateDraft({ runtimeMax: event.target.value })} />
                </label>
              </div>
            </div>

            <div className="library-sheet-section">
              <div className="library-sheet-label-row"><span>Época de estreno</span><span>Desde / hasta</span></div>
              <div className="discover-year-shortcuts" role="group" aria-label="Atajos de época">
                <button type="button" onClick={() => updateDraft({ yearFrom: String(new Date().getFullYear() - 5), yearTo: String(new Date().getFullYear()) })}>Últimos 5 años</button>
                <button type="button" onClick={() => updateDraft({ yearFrom: "2000", yearTo: "" })}>Desde 2000</button>
                <button type="button" onClick={() => updateDraft({ yearFrom: "", yearTo: "1999" })}>Antes de 2000</button>
              </div>
              <div className="library-year-range">
                <label className="library-sheet-field" htmlFor="discover-year-from">
                  <span>Desde</span>
                  <input id="discover-year-from" className="library-refinement-select" type="number" inputMode="numeric" min="1888" max="2100" placeholder="Cualquier año" value={draftFilters.yearFrom} onChange={(event) => updateDraft({ yearFrom: event.target.value })} />
                </label>
                <label className="library-sheet-field" htmlFor="discover-year-to">
                  <span>Hasta</span>
                  <input id="discover-year-to" className="library-refinement-select" type="number" inputMode="numeric" min="1888" max="2100" placeholder="Cualquier año" value={draftFilters.yearTo} onChange={(event) => updateDraft({ yearTo: event.target.value })} />
                </label>
              </div>
            </div>

            <div className="library-sheet-section">
              <label className="library-sheet-field" htmlFor="discover-min-rating">
                <span>Nota mínima en TMDB</span>
                <select id="discover-min-rating" className="library-refinement-select" value={draftFilters.minVoteAverage} onChange={(event) => updateDraft({ minVoteAverage: event.target.value })}>
                  <option value="">Cualquier nota</option>
                  {["5", "6", "6.5", "7", "7.5", "8", "8.5", "9"].map((value) => <option key={value} value={value}>{value}/10 o más</option>)}
                </select>
              </label>
              <label className="library-sheet-field" htmlFor="discover-min-votes">
                <span>Evitar notas con pocas votaciones</span>
                <select id="discover-min-votes" className="library-refinement-select" value={draftFilters.minVoteCount} onChange={(event) => updateDraft({ minVoteCount: event.target.value })}>
                  <option value="">Sin mínimo</option>
                  <option value="100">100 votos</option>
                  <option value="500">500 votos</option>
                  <option value="1000">1.000 votos</option>
                  <option value="5000">5.000 votos</option>
                </select>
              </label>
            </div>

            <div className="library-sheet-section">
              <p className="discover-filter-help">El idioma original no es necesariamente el idioma del doblaje o los subtítulos.</p>
              <label className="library-sheet-field" htmlFor="discover-language">
                <span>Idioma original de la película</span>
                <select id="discover-language" className="library-refinement-select" value={draftFilters.originalLanguage} onChange={(event) => updateDraft({ originalLanguage: event.target.value })}>
                  <option value="">Todos los idiomas</option>
                  {DISCOVER_LANGUAGES.map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}
                </select>
              </label>
              <label className="library-sheet-field" htmlFor="discover-sort">
                <span>Cómo ordenar los resultados</span>
                <select id="discover-sort" className="library-refinement-select" value={draftFilters.sortBy} onChange={(event) => updateDraft({ sortBy: event.target.value as DiscoverFilters["sortBy"] })}>
                  {SORT_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
            </div>

            {filterErrors.length > 0 && (
              <p className="discover-filter-error" role="alert">{filterErrors.join(" ")}</p>
            )}

            <div className="library-sheet-actions">
              <button className="button button-quiet" type="button" onClick={clearDraftFilters}>Restablecer</button>
              <button className="button button-primary" type="button" onClick={applyFilters} disabled={filterErrors.length > 0}>Aplicar filtros</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
