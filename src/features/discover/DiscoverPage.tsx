import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X, Film, LoaderCircle, WifiOff } from "lucide-react";
import { UnifiedSearchBar } from "../../components/UnifiedSearchBar";
import { EmptyState } from "../../components/EmptyState";
import { MoviePosterCard } from "../../components/MoviePosterCard";
import {
  getImageConfiguration,
  getTmdbImageUrl,
  getTrendingMovies,
  searchMovies,
  type TmdbMovieSummary
} from "../../infrastructure/tmdb/TmdbService";
import { getTmdbAccessToken } from "../../infrastructure/tmdb/settings";

type FeedState = "loading" | "ready" | "error" | "unconfigured";

export function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const loadFirstPage = useCallback(async (searchText: string) => {
    const token = getTmdbAccessToken();
    if (!token) {
      setState("unconfigured");
      setMovies([]);
      return;
    }

    const currentRequest = ++requestId.current;
    setState("loading");
    setError("");
    setShowingCachedData(false);
    setCachedFetchedAt("");
    setPage(1);

    try {
      const [feed, imageConfig] = await Promise.all([
        searchText.trim() ? searchMovies(token, searchText, 1) : getTrendingMovies(token, 1),
        getImageConfiguration(token).catch(() => ({ secure_base_url: "https://image.tmdb.org/t/p/", poster_sizes: [], backdrop_sizes: [], profile_sizes: [] }))
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
    const timer = window.setTimeout(() => void loadFirstPage(query), query.trim() ? 420 : 0);
    return () => window.clearTimeout(timer);
  }, [query, loadFirstPage]);

  useEffect(() => {
    const refreshAfterReconnect = () => {
      if (navigator.onLine) void loadFirstPage(query);
    };
    window.addEventListener("online", refreshAfterReconnect);
    return () => window.removeEventListener("online", refreshAfterReconnect);
  }, [loadFirstPage, query]);

  async function loadMore() {
    const token = getTmdbAccessToken();
    if (!token || loadingMore || state !== "ready" || page >= totalPages) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const result = query.trim()
        ? await searchMovies(token, query, nextPage)
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
  }, [state, page, totalPages, query, loadingMore]);

  function openMovie(movie: TmdbMovieSummary) {
    window.location.hash = "#/movie/" + movie.id;
  }

  return (
    <div className="page page-discover">
      <UnifiedSearchBar
        inputId="discover-search"
        placeholder="Buscar..."
        searchLabel="Buscar películas en TMDB"
        value={query}
        onChange={setQuery}
        onFiltersClick={() => setFiltersOpen(true)}
        filtersOpen={filtersOpen}
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
          action={<button className="button button-secondary" onClick={() => void loadFirstPage(query)}>Reintentar</button>}
        />
      ) : (
        <>
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
            <EmptyState icon={<Search size={25} />} title="No encontramos películas" description="Prueba con otro título o revisa la escritura." />
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
        <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setFiltersOpen(false);
        }}>
          <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="filters-title">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div><p className="eyebrow">EXPLORACIÓN</p><h2 id="filters-title">Filtros</h2></div>
              <button className="icon-button" onClick={() => setFiltersOpen(false)} aria-label="Cerrar filtros"><X size={19} /></button>
            </div>
            <p className="muted-copy">La búsqueda ya utiliza TMDB. Los filtros avanzados de género, año, país, duración y equipo se incorporarán en la siguiente etapa.</p>
            <button className="button button-secondary button-full" onClick={() => setFiltersOpen(false)}>Entendido</button>
          </section>
        </div>
      )}
    </div>
  );
}
