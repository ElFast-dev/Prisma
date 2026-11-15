import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, EllipsisVertical, Star, LoaderCircle, WifiOff, ChevronDown, ChevronUp, ExternalLink, Plus,
  UserRound, Clapperboard, X
} from "lucide-react";
import type { MovieRecord, Viewing } from "../../domain/types";
import { EmptyState } from "../../components/EmptyState";
import { MoviePosterCard } from "../../components/MoviePosterCard";
import { ViewingForm } from "../../components/ViewingForm";
import { getMovieBundle, getImageConfiguration, getTmdbImageUrl, type TmdbMovieBundle, type TmdbPerson } from "../../infrastructure/tmdb/TmdbService";
import { getCatalogRegion, getTmdbAccessToken } from "../../infrastructure/tmdb/settings";
import { saveTmdbMovie } from "../../infrastructure/database/movieRepository";
import { getLibraryEntry, getMovieViewings } from "../../infrastructure/database/libraryService";
import type { LibraryEntry } from "../../domain/types";
import { moveMovieToPending, undoMoveToPending, type LibraryStatusUndoToken } from "../../infrastructure/database/viewingService";
import { prismaDb } from "../../infrastructure/database/database";
import { navigateBack } from "../../navigation/routeHistory";

type CrewTab = "Dirección" | "Escritores" | "Música";
type PageState = "loading" | "ready" | "error" | "unconfigured";

function runtimeLabel(minutes?: number | null): string {
  if (!minutes) return "";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return hours ? hours + "h " + String(remainder).padStart(2, "0") + "m" : remainder + "m";
}

function releaseYear(date?: string): string {
  return date && date.length >= 4 ? date.slice(0, 4) : "";
}

function translatedStatus(status?: string): string {
  const values: Record<string, string> = {
    Released: "Estrenada",
    "Post Production": "En postproducción",
    "In Production": "En producción",
    Planned: "Anunciada",
    Rumored: "Rumoreada",
    Canceled: "Cancelada"
  };
  return status ? values[status] ?? status : "";
}

function crewForTab(crew: TmdbPerson[], tab: CrewTab): TmdbPerson[] {
  if (tab === "Dirección") {
    return crew.filter((person) => person.job === "Director" || person.department === "Directing");
  }
  if (tab === "Escritores") {
    return crew.filter((person) => ["Writer", "Screenplay", "Story", "Novel", "Teleplay"].includes(person.job ?? ""));
  }
  return crew.filter((person) => person.department === "Sound" && /composer|music/i.test(person.job ?? ""));
}

export function MovieDetailPage() {
  const tmdbId = Number(window.location.hash.split("/").pop());
  const [state, setState] = useState<PageState>("loading");
  const [bundle, setBundle] = useState<TmdbMovieBundle | null>(null);
  const [imageBase, setImageBase] = useState("https://image.tmdb.org/t/p/");
  const [localMovie, setLocalMovie] = useState<MovieRecord | null>(null);
  const [entry, setEntry] = useState<LibraryEntry | undefined>();
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [crewTab, setCrewTab] = useState<CrewTab>("Dirección");
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);
  const [viewingForm, setViewingForm] = useState(false);
  const [editingViewing, setEditingViewing] = useState<Viewing | undefined>();
  const [ratingSectionOpen, setRatingSectionOpen] = useState(false);
  const [movieMenuOpen, setMovieMenuOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [undoToken, setUndoToken] = useState<LibraryStatusUndoToken | null>(null);
  const [undoMessage, setUndoMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const region = getCatalogRegion();

  const refreshLocalState = useCallback(async (movieId: string) => {
    const [nextEntry, nextViewings, movie] = await Promise.all([
      getLibraryEntry(movieId),
      getMovieViewings(movieId),
      prismaDb.movies.get(movieId)
    ]);
    setEntry(nextEntry);
    setViewings(nextViewings);
    if (movie) setLocalMovie(movie);
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      const token = getTmdbAccessToken();
      if (!token) {
        setState("unconfigured");
        return;
      }
      if (!Number.isFinite(tmdbId) || tmdbId <= 0) {
        setState("error");
        setError("El identificador de la película no es válido.");
        return;
      }
      setState("loading");
      setError("");
      try {
        const [data, imageConfig] = await Promise.all([
          getMovieBundle(token, tmdbId, region),
          getImageConfiguration(token).catch(() => ({ secure_base_url: "https://image.tmdb.org/t/p/", poster_sizes: [], backdrop_sizes: [], profile_sizes: [] }))
        ]);
        if (!active) return;
        const saved = await saveTmdbMovie(data.details);
        if (!active) return;
        setBundle(data);
        setImageBase(imageConfig.secure_base_url);
        setLocalMovie(saved);
        await refreshLocalState(saved.id);
        if (active) setState("ready");
      } catch (cause) {
        if (!active) return;
        setState("error");
        setError(cause instanceof Error ? cause.message : "No se pudo cargar la película.");
      }
    }
    void load();
    return () => { active = false; };
  }, [tmdbId, region, refreshLocalState]);

  useEffect(() => {
    if (!undoToken) return;
    const timer = window.setTimeout(() => {
      setUndoToken(null);
      setUndoMessage("");
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [undoToken]);

  const nextViewingNumber = localMovie?.lastViewingSequence
    ? localMovie.lastViewingSequence + 1
    : viewings.length + 1;

  const selectedCrew = useMemo(
    () => bundle ? crewForTab(bundle.credits.crew, crewTab).slice(0, 20) : [],
    [bundle, crewTab]
  );

  async function confirmAddPending() {
    if (!localMovie) return;
    setBusy(true);
    try {
      const token = await moveMovieToPending(localMovie.id);
      if (token) {
        setUndoToken(token);
        setUndoMessage("Película movida a Pendientes.");
      }
      await refreshLocalState(localMovie.id);
      setPendingConfirm(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la Biblioteca.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUndo() {
    if (!undoToken) return;
    try {
      await undoMoveToPending(undoToken);
      await refreshLocalState(undoToken.movieId);
      setUndoMessage("Cambio deshecho.");
      setUndoToken(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo deshacer el cambio.");
    }
  }

  if (state === "unconfigured") {
    return <div className="page"><a href="#/discover" className="back-link" aria-label="Volver" onClick={(event) => { event.preventDefault(); navigateBack(); }}><ArrowLeft size={19} /></a><EmptyState icon={<Clapperboard size={26} />} title="Conecta TMDB para consultar esta película" description="Configura tu credencial desde Ajustes y vuelve a abrir la ficha." action={<a className="button button-primary" href="#/settings">Configurar TMDB</a>} /></div>;
  }

  if (state === "loading") {
    return <div className="page"><a href="#/discover" className="back-link" aria-label="Volver" onClick={(event) => { event.preventDefault(); navigateBack(); }}><ArrowLeft size={19} /></a><div className="detail-loading"><LoaderCircle className="spin" size={24} /><span>Cargando ficha cinematográfica...</span></div></div>;
  }

  if (state === "error" || !bundle) {
    return <div className="page"><a href="#/discover" className="back-link" aria-label="Volver" onClick={(event) => { event.preventDefault(); navigateBack(); }}><ArrowLeft size={19} /></a><EmptyState icon={<WifiOff size={25} />} title="No se pudo abrir la ficha" description={error || "Comprueba la conexión o la credencial de TMDB."} action={<a className="text-link" href="#/discover">Volver a Descubrir</a>} /></div>;
  }

  const movie = bundle.details;
  const title = movie.title;
  const backdrop = getTmdbImageUrl(imageBase, movie.backdrop_path, "w1280");
  const poster = getTmdbImageUrl(imageBase, movie.poster_path, "w780");
  const heroImage = backdrop ?? poster;
  const year = releaseYear(movie.release_date);
  const genres = movie.genres?.map((genre) => genre.name) ?? [];
  const runtime = runtimeLabel(movie.runtime);
  const infoLine = [year, ...genres, runtime].filter(Boolean).join(" · ");
  const watchedCount = viewings.length;
  const isPending = entry?.status === "pending";
  const isWatched = entry?.status === "watched";
  const hasWatchProviders = Boolean(bundle.watchProviders?.flatrate?.length || bundle.watchProviders?.rent?.length || bundle.watchProviders?.buy?.length);
  const providersLink = bundle.watchProviders?.link;

  return (
    <div className="movie-detail-page">
      <div className="movie-hero">
        {heroImage ? <img src={heroImage} alt={(backdrop ? "Fondo cinematográfico de " : "Carátula de ") + title} className={backdrop ? undefined : "movie-hero-poster-fallback"} /> : <div className="movie-hero-placeholder"><Clapperboard size={44} /></div>}
        <div className="movie-hero-shade" />
        <a href="#/discover" className="movie-hero-control hero-back" aria-label="Volver a la pantalla anterior" onClick={(event) => { event.preventDefault(); navigateBack(); }}><ArrowLeft size={21} /></a>
        <button className="movie-hero-control hero-menu" type="button" aria-label="Más opciones" aria-haspopup="dialog" aria-expanded={movieMenuOpen} onClick={() => setMovieMenuOpen(true)}><EllipsisVertical size={22} /></button>
        <div className="movie-hero-title">
          <h1>{title}</h1>
          {movie.original_title && movie.original_title !== title && <p>{movie.original_title}</p>}
        </div>
      </div>

      <div className="movie-detail-content">
        <div className="movie-metadata">
          {infoLine && <p>{infoLine}</p>}
          {translatedStatus(movie.status) && <span className="movie-release-status">{translatedStatus(movie.status)}</span>}
        </div>

        <div className="movie-status-actions">
          <button className="button button-primary" type="button" onClick={() => { setEditingViewing(undefined); setViewingForm(true); }}>
            {watchedCount === 0 ? "Agregar a Vistas" : "Agregar visionado #" + nextViewingNumber}
          </button>
          <button className={isPending ? "button button-selected" : "button button-secondary"} type="button" onClick={() => setPendingConfirm(true)} disabled={isPending || busy}>
            {isPending ? "En Pendientes ✓" : "Agregar a Pendientes"}
          </button>
        </div>

      {movieMenuOpen && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setMovieMenuOpen(false);
        }}>
          <section className="bottom-sheet movie-options-sheet" role="dialog" aria-modal="true" aria-labelledby="movie-options-title">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div><p className="eyebrow">PRISMA</p><h2 id="movie-options-title">Opciones de película</h2></div>
              <button className="icon-button" type="button" aria-label="Cerrar opciones" onClick={() => setMovieMenuOpen(false)}><X size={19} /></button>
            </div>
            <div className="movie-options-list">
              <button
                className="button button-secondary button-full"
                type="button"
                onClick={() => {
                  setEditingViewing(undefined);
                  setMovieMenuOpen(false);
                  setViewingForm(true);
                }}
              >
                <Plus size={17} /> Registrar visionado
              </button>
              <button
                className="button button-secondary button-full"
                type="button"
                disabled={isPending || busy}
                onClick={() => {
                  setMovieMenuOpen(false);
                  setPendingConfirm(true);
                }}
              >
                {isPending ? "Ya está en Pendientes" : "Agregar a Pendientes"}
              </button>
              <button className="button button-quiet button-full" type="button" onClick={() => setMovieMenuOpen(false)}>
                Cerrar
              </button>
            </div>
          </section>
        </div>
      )}

        {pendingConfirm && (
          <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) setPendingConfirm(false);
          }}>
            <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="pending-dialog-title">
              <div className="sheet-handle" />
              <div className="sheet-header"><h2 id="pending-dialog-title">{isWatched ? "¿Mover a Pendientes?" : "¿Agregar a Pendientes?"}</h2></div>
              <p className="muted-copy">{isWatched ? "La película dejará Vistas y aparecerá en Pendientes. Tus " + watchedCount + " visionados, fechas y calificaciones se conservarán." : "La película se añadirá a tu lista Pendientes. Podrás retirarla después."}</p>
              <div className="form-actions">
                <button className="button button-secondary" type="button" disabled={busy} onClick={() => setPendingConfirm(false)}>Cancelar</button>
                <button className="button button-primary" type="button" disabled={busy} onClick={() => void confirmAddPending()}>{busy ? "Guardando..." : "Confirmar"}</button>
              </div>
            </section>
          </div>
        )}

        <section className="movie-section synopsis-section">
          <h2>Sinopsis</h2>
          <p className={synopsisExpanded ? "synopsis-text is-expanded" : "synopsis-text"}>
            {movie.overview || "No hay una sinopsis disponible en el catálogo."}
          </p>
          {(movie.overview?.length ?? 0) > 250 && (
            <button className="text-link synopsis-toggle" onClick={() => setSynopsisExpanded((expanded) => !expanded)}>
              {synopsisExpanded ? "Ver menos" : "Ver más"}
              {synopsisExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
        </section>

        <section className="movie-section">
          <div className="section-title-row">
            <h2>Calificar</h2>
            <button className="text-link" onClick={() => setRatingSectionOpen((open) => !open)}>
              {ratingSectionOpen ? "Ocultar" : watchedCount ? "Ver experiencias" : "Registrar visionado"}
            </button>
          </div>
          {ratingSectionOpen && (
            <div className="viewing-history-list">
              {viewings.length === 0 ? (
                <p className="muted-copy">Todavía no has registrado experiencias con esta película.</p>
              ) : viewings.map((viewing) => (
                <button className="viewing-history-row" key={viewing.id} onClick={() => { setEditingViewing(viewing); setViewingForm(true); }}>
                  <span><strong>Visionado #{viewing.sequenceNumber}</strong><small>{viewing.watchedOn}</small></span>
                  <span className="viewing-history-rating"><Star size={15} fill="currentColor" /> {viewing.rating}/10</span>
                </button>
              ))}
              <button className="button button-primary button-full" onClick={() => { setEditingViewing(undefined); setViewingForm(true); }}>
                <Plus size={16} /> Agregar visionado #{nextViewingNumber}
              </button>
            </div>
          )}
          {!ratingSectionOpen && watchedCount > 0 && (
            <p className="muted-copy">{watchedCount} {watchedCount === 1 ? "visionado registrado" : "visionados registrados"} · Promedio personal { (viewings.reduce((sum, item) => sum + item.rating, 0) / watchedCount).toFixed(1) }/10</p>
          )}
        </section>

        <section className="movie-section">
          <h2>Reparto y Equipo</h2>
          <div className="people-carousel">
            {bundle.credits.cast.slice(0, 16).map((person) => (
              <div className="person-card" key={person.id}>
                {getTmdbImageUrl(imageBase, person.profile_path, "w185")
                  ? <img src={getTmdbImageUrl(imageBase, person.profile_path, "w185") ?? ""} alt={person.name} loading="lazy" />
                  : <div className="person-placeholder"><UserRound size={24} /></div>}
                <span>{person.name}</span>
              </div>
            ))}
          </div>
          <div className="crew-tabs" role="group" aria-label="Filtrar equipo cinematográfico">
            {(["Dirección", "Escritores", "Música"] as CrewTab[]).map((tab) => (
              <button key={tab} className={crewTab === tab ? "crew-tab is-active" : "crew-tab"} onClick={() => setCrewTab(tab)} aria-pressed={crewTab === tab}>{tab}</button>
            ))}
          </div>
          <div className="people-carousel crew-carousel">
            {selectedCrew.length ? selectedCrew.map((person) => (
              <div className="person-card" key={person.id}>
                {getTmdbImageUrl(imageBase, person.profile_path, "w185")
                  ? <img src={getTmdbImageUrl(imageBase, person.profile_path, "w185") ?? ""} alt={person.name} loading="lazy" />
                  : <div className="person-placeholder"><UserRound size={24} /></div>}
                <span>{person.name}</span>
                <small>{person.job}</small>
              </div>
            )) : <p className="muted-copy">No hay información disponible para esta categoría.</p>}
          </div>
        </section>

        <section className="movie-section">
          <div className="section-title-row"><h2>Dónde ver</h2><span className="region-label">{region}</span></div>
          {hasWatchProviders ? (
            <div className="provider-groups">
              {([
                ["flatrate", "Streaming"],
                ["rent", "Alquiler"],
                ["buy", "Compra"]
              ] as const).map(([key, label]) => {
                const providers = bundle.watchProviders?.[key] ?? [];
                if (!providers.length) return null;
                return (
                  <div className="provider-group" key={key}>
                    <h3>{label}</h3>
                    <div className="provider-row">
                      {providers.map((provider) => (
                        <div className="provider-card" key={provider.provider_id}>
                          {getTmdbImageUrl(imageBase, provider.logo_path, "w185")
                            ? <img src={getTmdbImageUrl(imageBase, provider.logo_path, "w185") ?? ""} alt="" />
                            : <span className="provider-logo-fallback">{provider.provider_name.slice(0, 1)}</span>}
                          <span>{provider.provider_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {providersLink && <a className="text-link provider-source-link" href={providersLink} target="_blank" rel="noreferrer">Consultar opciones <ExternalLink size={14} /></a>}
            </div>
          ) : (
            <p className="muted-copy">No hay información de disponibilidad para esta región en el catálogo.</p>
          )}
          {bundle.watchFetchedAt && <p className="cache-caption">Consulta almacenada: {new Date(bundle.watchFetchedAt).toLocaleDateString("es-PA")}</p>}
        </section>

        <section className="movie-section recommendations-section">
          <h2>Podría gustarte</h2>
          <div className="recommendations-row">
            {bundle.recommendations.filter((item) => item.id !== movie.id && item.poster_path).slice(0, 12).map((item) => (
              <MoviePosterCard
                key={item.id}
                title={item.title}
                imageUrl={getTmdbImageUrl(imageBase, item.poster_path, "w342")}
                onClick={() => { window.location.hash = "#/movie/" + item.id; }}
              />
            ))}
          </div>
          {bundle.recommendations.length === 0 && <p className="muted-copy">Todavía no hay recomendaciones para esta película.</p>}
        </section>
      </div>

      {bundle.staleResources.length > 0 && <div className="stale-data-note">Mostrando información guardada anteriormente. Se actualizará cuando TMDB esté disponible.</div>}
      {undoToken && <div className="undo-toast"><span>{undoMessage}</span><button onClick={() => void handleUndo()}>Deshacer</button></div>}
      {error && <div className="detail-error" role="alert">{error}</div>}

      {viewingForm && localMovie && (
        <ViewingForm
          movieId={localMovie.id}
          movieTitle={title}
          nextNumber={nextViewingNumber}
          initialViewing={editingViewing}
          onClose={() => { setViewingForm(false); setEditingViewing(undefined); }}
          onSaved={() => { void refreshLocalState(localMovie.id); setRatingSectionOpen(true); }}
        />
      )}
    </div>
  );
}
