import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, X, Film, LoaderCircle, WifiOff, SlidersHorizontal } from "lucide-react";
import { UnifiedSearchBar } from "../../components/UnifiedSearchBar";
import { EmptyState } from "../../components/EmptyState";
import { MoviePosterCard } from "../../components/MoviePosterCard";
import { useAccessibleDialog } from "../../components/useAccessibleDialog";
import {
  countActiveDiscoverFilters,
  DEFAULT_DISCOVER_FILTERS,
  discoverFilterTitleMatch,
  DISCOVER_GENRES,
  DISCOVER_LANGUAGES,
  getDiscoverFilterErrors,
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
  type TmdbMovieSummary
} from "../../infrastructure/tmdb/TmdbService";
import { getTmdbAccessToken } from "../../infrastructure/tmdb/settings";
import { saveCurrentRouteScrollPosition } from "../../navigation/scrollRestoration";

type FeedState = "loading" | "ready" | "error" | "unconfigured";

const SORT_OPTIONS = [
  { id: "popularity.desc", label: "Más populares" },
  { id: "vote_average.desc", label: "Mejor valoradas" },
  { id: "primary_release_date.desc", label: "Estreno más reciente" },
  { id: "primary_release_date.asc", label: "Estreno más antiguo" },
  { id: "revenue.desc", label: "Mayor recaudación" },
  { id: "original_title.asc", label: "Título A–Z" }
] as const;

export function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersDialogRef = useAccessibleDialog(filtersOpen, () => setFiltersOpen(false));
  const [appliedFilters, setAppliedFilters] = useState<DiscoverFilters>(DEFAULT_DISCOVER_FILTERS);
  const [draftFilters, setDraftFilters] = useState<DiscoverFilters>(DEFAULT_DISCOVER_FILTERS);
  const [movies, setMovies] = useState<TmdbMovieSummary[]>([]);
  const [state, setState] = useState<FeedState>("loading");
  const [error, setError] = useState("");
  const [showingCachedData, setShowingCachedData] = useState(false);
  const [cachedFetchedAt, setCachedFetchedAt] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [imageBase, setImageBase] = useState("https://image.tmdb.org/t/p/");
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const activeFilterCount = countActiveDiscoverFilters(appliedFilters);
  const filtersActive = activeFilterCount > 0;
  const filterErrors = getDiscoverFilterErrors(draftFilters);
  const visibleMovies = useMemo(() => {
    if (!filtersActive || !query.trim()) return movies;
    return movies.filter((movie) => discoverFilterTitleMatch(movie.title, movie.original_title, query));
  }, [filtersActive, movies, query]);

  const loadFirstPage = useCallback(async (searchText: string, filters: DiscoverFilters) => {
    const token = getTmdbAccessToken();
    if (!token) {
      setState("unconfigured");
      setMovies([]);
      return;
    }

    const currentRequest = ++requestId.current;
    setState("loading");
    setError("");
    setMovies([]);
    setShowingCachedData(false);
    setCachedFetchedAt("");
    setPage(1);
    setTotalPages(1);
    setLoadingMore(false);

    try {
      const useFilters = hasActiveDiscoverFilters(filters);
      const [feed, imageConfig] = await Promise.all([
        useFilters
          ? discoverMovies(token, filters, 1)
          : searchText.trim()
            ? searchMovies(token, searchText, 1)
            : getTrendingMovies(token, 1),
        getImageConfiguration(token).catch(() => ({
          secure_base_url: "https://image.tmdb.org/t/p/",
          poster_sizes: [],
          backdrop_sizes: [],
          profile_sizes: []
        }))
      ]);
      if (currentRequest !== requestId.current) return;
      setMovies(feed.movies);
      setTotalPages(feed.totalPages);
      setPage(1);
      setImageBase(imageConfig.secure_base_url);
      setShowingCachedData(feed.stale);
      setCachedFetchedAt(feed.stale ? feed.fetchedAt : "");
      setState("ready");
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      setState("error");
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo.");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadFirstPage(query, appliedFilters), query.trim() ? 420 : 0);
    return () => window.clearTimeout(timer);
  }, [query, appliedFilters, loadFirstPage]);

  useEffect(() => {
    const refreshAfterReconnect = () => {
      if (navigator.onLine) void loadFirstPage(query, appliedFilters);
    };
    window.addEventListener("online", refreshAfterReconnect);
    return () => window.removeEventListener("online", refreshAfterReconnect);
  }, [loadFirstPage, query, appliedFilters]);

  const loadMore = useCallback(async () => {
    const token = getTmdbAccessToken();
    if (!token || loadingMore || state !== "ready" || page >= totalPages) return;
    const currentRequest = requestId.current;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const result = hasActiveDiscoverFilters(appliedFilters)
        ? await discoverMovies(token, appliedFilters, nextPage)
        : query.trim()
          ? await searchMovies(token, query, nextPage)
          : await getTrendingMovies(token, nextPage);
      if (currentRequest !== requestId.current) return;
      setMovies((current) => {
        const seen = new Set(current.map((movie) => movie.id));
        return [...current, ...result.movies.filter((movie) => !seen.has(movie.id))];
      });
      if (result.stale) {
        setShowingCachedData(true);
        setCachedFetchedAt(result.fetchedAt);
      }
      setPage(nextPage);
    } catch {
      if (currentRequest === requestId.current) {
        setError("No se pudieron cargar más películas. Comprueba tu conexión.");
      }
    } finally {
      if (currentRequest === requestId.current) setLoadingMore(false);
    }
  }, [appliedFilters, loadingMore, page, query, state, totalPages]);

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || state !== "ready" || (filtersActive && query.trim())) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: "500px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [filtersActive, query, state, loadMore]);

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

  function clearAppliedFilters() {
    setAppliedFilters(DEFAULT_DISCOVER_FILTERS);
    setDraftFilters(DEFAULT_DISCOVER_FILTERS);
    setQuery("");
  }

  return (
    <div className="page page-discover">
      <UnifiedSearchBar
        inputId="discover-search"
        placeholder={filtersActive ? "Buscar dentro de los resultados..." : "Buscar..."}
        searchLabel={filtersActive ? "Buscar por título dentro de los resultados filtrados" : "Buscar películas en TMDB"}
        value={query}
        onChange={setQuery}
        onFiltersClick={openFilters}
        filtersOpen={filtersOpen}
        filtersActive={filtersActive}
        settingsHref="#/settings"
      />

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
          {filtersActive && state === "ready" && (
            <div className="discover-active-filters" role="status">
              <span><SlidersHorizontal size={14} /> {activeFilterCount} {activeFilterCount === 1 ? "filtro activo" : "filtros activos"}</span>
              <button type="button" onClick={clearAppliedFilters}>Limpiar</button>
            </div>
          )}
          {showingCachedData && (
            <p className="cached-feed-note" role="status">
              <WifiOff size={14} />
              <span>Mostrando catálogo guardado en este dispositivo{cachedFetchedAt ? " · " + new Date(cachedFetchedAt).toLocaleString("es-PA") : ""}.</span>
            </p>
          )}
          {state === "loading" && movies.length === 0 ? (
            <div className="poster-grid" aria-label="Cargando películas">
              {Array.from({ length: 8 }, (_, index) => <div className="poster-skeleton" key={index} />)}
            </div>
          ) : visibleMovies.length === 0 ? (
            <EmptyState
              icon={<Search size={25} />}
              title="No encontramos películas"
              description={filtersActive && query.trim()
                ? "No hay títulos que coincidan con el texto dentro de esta combinación de filtros. Prueba otro término o amplía los criterios."
                : "Prueba otra combinación de filtros o revisa la escritura."}
              action={<button className="button button-secondary" type="button" onClick={clearAppliedFilters}>Limpiar búsqueda y filtros</button>}
            />
          ) : (
            <>
              {filtersActive && query.trim() && (
                <p className="discover-filtered-count">{visibleMovies.length} títulos coinciden con tu búsqueda dentro de los resultados filtrados.</p>
              )}
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
          <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />
          {filtersActive && query.trim() && page < totalPages && (
            <button className="button button-secondary discover-load-more" type="button" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? <><LoaderCircle size={17} className="spin" /> Cargando...</> : "Buscar en más resultados"}
            </button>
          )}
          {loadingMore && !(filtersActive && query.trim()) && <div className="feed-loading"><LoaderCircle size={19} className="spin" /><span>Cargando películas...</span></div>}
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

            <div className="library-sheet-section">
              <label className="library-sheet-field" htmlFor="discover-genre">
                <span>Género</span>
                <select id="discover-genre" className="library-refinement-select" value={draftFilters.genreId} onChange={(event) => updateDraft({ genreId: event.target.value })}>
                  <option value="">Todos los géneros</option>
                  {DISCOVER_GENRES.map((genre) => <option key={genre.id} value={String(genre.id)}>{genre.label}</option>)}
                </select>
              </label>
            </div>

            <div className="library-sheet-section">
              <div className="library-sheet-label-row"><span>Duración</span><span>Minutos</span></div>
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
              <div className="library-sheet-label-row"><span>Año de estreno</span><span>Rango</span></div>
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
                <span>Valoración mínima de TMDB</span>
                <select id="discover-min-rating" className="library-refinement-select" value={draftFilters.minVoteAverage} onChange={(event) => updateDraft({ minVoteAverage: event.target.value })}>
                  <option value="">Cualquier valoración</option>
                  {["5", "6", "6.5", "7", "7.5", "8", "8.5", "9"].map((value) => <option key={value} value={value}>{value}/10 o más</option>)}
                </select>
              </label>
              <label className="library-sheet-field" htmlFor="discover-min-votes">
                <span>Número mínimo de votos</span>
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
              <label className="library-sheet-field" htmlFor="discover-language">
                <span>Idioma original</span>
                <select id="discover-language" className="library-refinement-select" value={draftFilters.originalLanguage} onChange={(event) => updateDraft({ originalLanguage: event.target.value })}>
                  <option value="">Todos los idiomas</option>
                  {DISCOVER_LANGUAGES.map((language) => <option key={language.id} value={language.id}>{language.label}</option>)}
                </select>
              </label>
              <label className="library-sheet-field" htmlFor="discover-sort">
                <span>Ordenar resultados</span>
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
