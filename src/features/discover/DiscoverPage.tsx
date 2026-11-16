import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Film, LoaderCircle, WifiOff, SlidersHorizontal } from "lucide-react";
import { UnifiedSearchBar } from "../../components/UnifiedSearchBar";
import { EmptyState } from "../../components/EmptyState";
import { MoviePosterCard } from "../../components/MoviePosterCard";
import {
  discoverMovies,
  getImageConfiguration,
  getMovieDiscoverFilterOptions,
  getTmdbImageUrl,
  getTrendingMovies,
  searchMovies,
  type TmdbMovieDiscoverFilterOptions,
  type TmdbMovieSummary
} from "../../infrastructure/tmdb/TmdbService";
import {
  EMPTY_DISCOVER_FILTERS,
  getDiscoverActiveFilterCount,
  normalizeDiscoverFilters,
  type DiscoverFilters,
  type DiscoverSort
} from "../../domain/discoverFilters";
import { getTmdbAccessToken } from "../../infrastructure/tmdb/settings";
import { saveCurrentRouteScrollPosition } from "../../navigation/scrollRestoration";

type FeedState = "loading" | "ready" | "error" | "unconfigured";

const sortOptions: { value: DiscoverSort; label: string }[] = [
  { value: "popular", label: "Más populares" },
  { value: "rating", label: "Mejor valoradas" },
  { value: "newest", label: "Estrenos recientes" },
  { value: "oldest", label: "Estrenos antiguos" }
];

function selectedLabel<T extends { code: string; name: string }>(items: T[], code: string): string {
  return items.find((item) => item.code === code)?.name ?? "";
}

function filterSummary(filters: DiscoverFilters, options: TmdbMovieDiscoverFilterOptions | null): string[] {
  const genres = options?.genres
    .filter((genre) => filters.genres.includes(genre.id))
    .map((genre) => genre.name) ?? [];
  const years = filters.yearFrom || filters.yearTo
    ? (filters.yearFrom || "…") + "–" + (filters.yearTo || "…")
    : "";
  const runtime = filters.runtimeFrom || filters.runtimeTo
    ? (filters.runtimeFrom || "…") + "–" + (filters.runtimeTo || "…") + " min"
    : "";
  const country = selectedLabel(options?.countries ?? [], filters.originCountry);
  const language = selectedLabel(options?.languages ?? [], filters.originalLanguage);
  const sort = sortOptions.find((option) => option.value === filters.sortBy);
  return [
    genres.length ? "Géneros: " + genres.join(" / ") : "",
    years ? "Años: " + years : "",
    runtime ? "Duración: " + runtime : "",
    country ? "País: " + country : "",
    language ? "Idioma original: " + language : "",
    filters.sortBy !== "popular" ? "Orden: " + (sort?.label ?? "Personalizado") : ""
  ].filter(Boolean);
}

export function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [searchNotice, setSearchNotice] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<DiscoverFilters>(EMPTY_DISCOVER_FILTERS);
  const [draftFilters, setDraftFilters] = useState<DiscoverFilters>(EMPTY_DISCOVER_FILTERS);
  const [filterOptions, setFilterOptions] = useState<TmdbMovieDiscoverFilterOptions | null>(null);
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(false);
  const [filterOptionsError, setFilterOptionsError] = useState("");
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
  const activeFilterCount = getDiscoverActiveFilterCount(appliedFilters);

  const loadFilterOptions = useCallback(async (force = false) => {
    if (loadingFilterOptions || (!force && filterOptions)) return;
    const token = getTmdbAccessToken();
    if (!token) {
      setFilterOptionsError("Configura TMDB en Ajustes para cargar las opciones de filtros.");
      return;
    }

    setLoadingFilterOptions(true);
    setFilterOptionsError("");
    try {
      const options = await getMovieDiscoverFilterOptions(token);
      setFilterOptions(options);
    } catch (cause) {
      setFilterOptionsError(cause instanceof Error ? cause.message : "No se pudieron cargar las opciones de TMDB.");
    } finally {
      setLoadingFilterOptions(false);
    }
  }, [filterOptions, loadingFilterOptions]);

  const openFilters = () => {
    setDraftFilters(normalizeDiscoverFilters(appliedFilters));
    setFiltersOpen(true);
    void loadFilterOptions();
  };

  const loadFirstPage = useCallback(async (searchText: string, filters: DiscoverFilters) => {
    const token = getTmdbAccessToken();
    if (!token) {
      setState("unconfigured");
      setMovies([]);
      return;
    }

    const currentRequest = ++requestId.current;
    const activeFilters = getDiscoverActiveFilterCount(filters) > 0;
    setState("loading");
    setError("");
    setShowingCachedData(false);
    setCachedFetchedAt("");
    setPage(1);

    try {
      const [feed, imageConfig] = await Promise.all([
        searchText.trim()
          ? searchMovies(token, searchText, 1)
          : activeFilters
            ? discoverMovies(token, filters, 1)
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

  function changeQuery(value: string) {
    if (value.trim() && activeFilterCount > 0) {
      setAppliedFilters(EMPTY_DISCOVER_FILTERS);
      setDraftFilters(EMPTY_DISCOVER_FILTERS);
      setSearchNotice("La búsqueda por título sustituye a los filtros avanzados.");
    } else if (!value.trim()) {
      setSearchNotice("");
    }
    setQuery(value);
  }

  async function loadMore() {
    const token = getTmdbAccessToken();
    if (!token || loadingMore || state !== "ready" || page >= totalPages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const result = query.trim()
        ? await searchMovies(token, query, nextPage)
        : activeFilterCount > 0
          ? await discoverMovies(token, appliedFilters, nextPage)
          : await getTrendingMovies(token, nextPage);
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
      setError("No se pudieron cargar más películas. Comprueba tu conexión.");
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    const target = sentinelRef.current;
    if (!target || state !== "ready") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { rootMargin: "500px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [state, page, totalPages, query, loadingMore, appliedFilters, activeFilterCount]);

  function openMovie(movie: TmdbMovieSummary) {
    saveCurrentRouteScrollPosition();
    window.location.hash = "#/movie/" + movie.id;
  }

  function toggleGenre(genreId: number) {
    setDraftFilters((current) => ({
      ...current,
      genres: current.genres.includes(genreId)
        ? current.genres.filter((id) => id !== genreId)
        : [...current.genres, genreId]
    }));
  }

  function updateDraftRange(
    key: "yearFrom" | "yearTo" | "runtimeFrom" | "runtimeTo",
    value: string
  ) {
    setDraftFilters((current) => {
      const next = { ...current, [key]: value };
      if (key === "yearFrom" && value && current.yearTo && Number(value) > Number(current.yearTo)) next.yearTo = "";
      if (key === "yearTo" && value && current.yearFrom && Number(value) < Number(current.yearFrom)) next.yearFrom = "";
      if (key === "runtimeFrom" && value && current.runtimeTo && Number(value) > Number(current.runtimeTo)) next.runtimeTo = "";
      if (key === "runtimeTo" && value && current.runtimeFrom && Number(value) < Number(current.runtimeFrom)) next.runtimeFrom = "";
      return next;
    });
  }

  function applyFilters() {
    const normalized = normalizeDiscoverFilters(draftFilters);
    setAppliedFilters(normalized);
    setQuery("");
    setSearchNotice("");
    setFiltersOpen(false);
  }

  function clearDraftFilters() {
    setDraftFilters(EMPTY_DISCOVER_FILTERS);
  }

  const draftFilterCount = getDiscoverActiveFilterCount(draftFilters);
  const queryConflictsWithFilters = Boolean(query.trim());

  return (
    <div className="page page-discover">
      <UnifiedSearchBar
        inputId="discover-search"
        placeholder="Buscar..."
        searchLabel="Buscar películas en TMDB"
        value={query}
        onChange={changeQuery}
        onFiltersClick={openFilters}
        filtersOpen={filtersOpen}
        filtersActive={activeFilterCount > 0}
        settingsHref="#/settings"
      />

      {searchNotice && <p className="discover-mode-note" role="status">{searchNotice}</p>}

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
          {activeFilterCount > 0 && (
            <div className="discover-active-summary" aria-live="polite">
              <SlidersHorizontal size={14} />
              <span>{filterSummary(appliedFilters, filterOptions).join(" · ") || activeFilterCount + " filtros activos"}</span>
              <button type="button" onClick={() => setAppliedFilters(EMPTY_DISCOVER_FILTERS)}>Limpiar</button>
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
          ) : movies.length === 0 ? (
            <EmptyState icon={<Search size={25} />} title="No encontramos películas" description="Prueba con otros criterios o amplía los rangos." />
          ) : (
            <div className="poster-grid">
              {movies.map((movie) => (
                <MoviePosterCard
                  key={movie.id}
                  title={movie.title}
                  imageUrl={getTmdbImageUrl(imageBase, movie.poster_path, "w342")}
                  onClick={() => openMovie(movie)}
                />
              ))}
            </div>
          )}
          <div ref={sentinelRef} className="feed-sentinel" aria-hidden="true" />
          {loadingMore && <div className="feed-loading"><LoaderCircle size={19} className="spin" /><span>Cargando películas...</span></div>}
          {error && movies.length > 0 && <p className="feed-inline-error">{error}</p>}
        </>
      )}

      {filtersOpen && (
        <div className="sheet-backdrop library-sheet-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setFiltersOpen(false);
        }}>
          <section className="bottom-sheet library-bottom-sheet library-filter-sheet discover-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="discover-filters-title">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2 id="discover-filters-title">Explorar por criterios</h2>
              <button className="icon-button" type="button" onClick={() => setFiltersOpen(false)} aria-label="Cerrar filtros"><X size={19} /></button>
            </div>

            {loadingFilterOptions ? (
              <div className="discover-filter-loading" role="status"><LoaderCircle size={18} className="spin" /> Cargando opciones de TMDB…</div>
            ) : filterOptionsError ? (
              <div className="discover-filter-error" role="alert">
                <p>{filterOptionsError}</p>
                <button className="button button-secondary" type="button" onClick={() => void loadFilterOptions(true)}>Reintentar</button>
              </div>
            ) : filterOptions ? (
              <>
                {queryConflictsWithFilters && (
                  <div className="library-active-filter-summary discover-query-conflict" role="status">
                    <SlidersHorizontal size={15} />
                    <span>La búsqueda por título y los filtros avanzados usan consultas distintas. Borra el texto para aplicar los filtros.</span>
                    <button type="button" onClick={() => changeQuery("")}>Borrar búsqueda</button>
                  </div>
                )}

                <div className="library-sheet-section">
                  <div className="library-sheet-label-row"><span>Géneros</span><span>Puedes elegir varios · cualquiera coincide</span></div>
                  <div className="discover-genre-options" role="group" aria-label="Géneros de película">
                    {filterOptions.genres.map((genre) => {
                      const selected = draftFilters.genres.includes(genre.id);
                      return (
                        <button
                          className={selected ? "discover-genre-option is-selected" : "discover-genre-option"}
                          type="button"
                          role="checkbox"
                          aria-checked={selected}
                          key={genre.id}
                          onClick={() => toggleGenre(genre.id)}
                        >
                          {genre.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="library-sheet-section">
                  <div className="library-year-range">
                    <label className="library-sheet-field" htmlFor="discover-year-from">
                      <span>Desde el año</span>
                      <input id="discover-year-from" className="library-refinement-select" type="number" inputMode="numeric" min="1888" max="2100" placeholder="Sin límite" value={draftFilters.yearFrom} onChange={(event) => updateDraftRange("yearFrom", event.target.value)} />
                    </label>
                    <label className="library-sheet-field" htmlFor="discover-year-to">
                      <span>Hasta el año</span>
                      <input id="discover-year-to" className="library-refinement-select" type="number" inputMode="numeric" min="1888" max="2100" placeholder="Sin límite" value={draftFilters.yearTo} onChange={(event) => updateDraftRange("yearTo", event.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="library-sheet-section">
                  <div className="library-year-range">
                    <label className="library-sheet-field" htmlFor="discover-runtime-from">
                      <span>Duración mínima · minutos</span>
                      <input id="discover-runtime-from" className="library-refinement-select" type="number" inputMode="numeric" min="1" max="500" placeholder="Sin límite" value={draftFilters.runtimeFrom} onChange={(event) => updateDraftRange("runtimeFrom", event.target.value)} />
                    </label>
                    <label className="library-sheet-field" htmlFor="discover-runtime-to">
                      <span>Duración máxima · minutos</span>
                      <input id="discover-runtime-to" className="library-refinement-select" type="number" inputMode="numeric" min="1" max="500" placeholder="Sin límite" value={draftFilters.runtimeTo} onChange={(event) => updateDraftRange("runtimeTo", event.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="library-sheet-section">
                  <label className="library-sheet-field" htmlFor="discover-origin-country">
                    <span>País de origen de la producción</span>
                    <select id="discover-origin-country" className="library-refinement-select" value={draftFilters.originCountry} onChange={(event) => setDraftFilters((current) => ({ ...current, originCountry: event.target.value }))}>
                      <option value="">Cualquier país</option>
                      {filterOptions.countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                    </select>
                  </label>
                  <label className="library-sheet-field" htmlFor="discover-original-language">
                    <span>Idioma original</span>
                    <select id="discover-original-language" className="library-refinement-select" value={draftFilters.originalLanguage} onChange={(event) => setDraftFilters((current) => ({ ...current, originalLanguage: event.target.value }))}>
                      <option value="">Cualquier idioma</option>
                      {filterOptions.languages.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}
                    </select>
                  </label>
                </div>

                <div className="library-sheet-section">
                  <label className="library-sheet-field" htmlFor="discover-sort">
                    <span>Ordenar resultados</span>
                    <select id="discover-sort" className="library-refinement-select" value={draftFilters.sortBy} onChange={(event) => setDraftFilters((current) => ({ ...current, sortBy: event.target.value as DiscoverSort }))}>
                      {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                </div>

                {draftFilterCount > 0 && (
                  <div className="library-active-filter-summary" aria-live="polite">
                    <SlidersHorizontal size={15} />
                    <span>{draftFilterCount} grupos de criterios · los parámetros diferentes se combinan entre sí.</span>
                  </div>
                )}
                <div className="library-sheet-actions">
                  <button className="button button-quiet" type="button" onClick={clearDraftFilters} disabled={draftFilterCount === 0}>Restablecer</button>
                  <button className="button button-primary" type="button" onClick={applyFilters} disabled={queryConflictsWithFilters}>Aplicar filtros</button>
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}
    </div>
  );
}
