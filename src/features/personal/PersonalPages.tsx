import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft, Clock3, Folders, Grid2X2, Library, List, Search,
  UserRound, ChevronRight, Plus, Star, Heart, CalendarDays,
  ChevronLeft, Trash2, Pencil, X
} from "lucide-react";
import type { Collection, MovieRecord, LibraryEntry, Viewing } from "../../domain/types";
import { EmptyState } from "../../components/EmptyState";
import { MoviePosterCard } from "../../components/MoviePosterCard";
import { ViewingForm } from "../../components/ViewingForm";
import { getLibraryMovies } from "../../infrastructure/database/movieRepository";
import { getPersonalStats } from "../../infrastructure/database/statisticsRepository";
import { prismaDb } from "../../infrastructure/database/database";
import { deleteViewing } from "../../infrastructure/database/viewingService";
import { getLibraryEntry } from "../../infrastructure/database/libraryService";
import {
  createCollection,
  deleteCollection,
  getCollectionMovies,
  getCollectionSummaries,
  removeMovieFromCollection,
  type CollectionSummary
} from "../../infrastructure/database/collectionService";
import { getTmdbImageUrl } from "../../infrastructure/tmdb/TmdbService";
import { toLocalDateString } from "../../domain/viewingRules";
import type { PersonalStats } from "../../domain/statistics";

function PageBack({ title, eyebrow = "PERSONAL", backHref = "#/personal" }: { title: string; eyebrow?: string; backHref?: string }) {
  return (
    <header className="section-heading">
      <div className="heading-with-back">
        <a href={backHref} className="back-link" aria-label="Volver"><ArrowLeft size={19} /></a>
        <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>
      </div>
    </header>
  );
}

const personalLinks = [
  { title: "Biblioteca", description: "Todas tus películas vistas y pendientes.", href: "#/personal/library", icon: Library },
  { title: "Historial", description: "Tus experiencias y calificaciones por visionado.", href: "#/personal/history", icon: Clock3 },
  { title: "Colecciones", description: "Tus selecciones cinematográficas.", href: "#/personal/collections", icon: Folders }
];

function formatWatchTime(minutes: number): string {
  if (!minutes) return "0 min";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return remainder + " min";
  return remainder ? hours + " h " + remainder + " min" : hours + " h";
}

export function PersonalPage() {
  const [stats, setStats] = useState<PersonalStats | null>(null);

  useEffect(() => {
    let active = true;
    void getPersonalStats().then((value) => { if (active) setStats(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <div className="page">
      <header className="section-heading"><div><p className="eyebrow">MI ESPACIO CINEMATOGRÁFICO</p><h1>Personal</h1></div></header>
      <a href="#/personal/profile" className="profile-summary card-surface">
        <div className="avatar-placeholder"><UserRound size={27} /></div>
        <div className="profile-summary-copy"><span className="card-title">Mi perfil</span><span className="muted-copy">Tu identidad cinematográfica</span></div>
        <ChevronRight size={19} className="subtle-icon" />
        <div className="profile-metrics">
          <div><strong>{stats?.uniqueMoviesWatched ?? "—"}</strong><span>Películas vistas</span></div>
          <div><strong>{stats?.totalViewings ?? "—"}</strong><span>Visionados</span></div>
          <div><strong>{stats?.longestStreak ?? "—"}</strong><span>Récord de racha</span></div>
        </div>
      </a>
      <div className="section-heading compact-heading"><div><p className="eyebrow">TU COLECCIÓN</p><h2>Mi cine</h2></div></div>
      <div className="navigation-cards">
        {personalLinks.map((item) => {
          const Icon = item.icon;
          return <a className="navigation-card card-surface" href={item.href} key={item.title}>
            <span className="navigation-card-icon"><Icon size={22} /></span>
            <span className="navigation-card-copy"><strong>{item.title}</strong><span>{item.description}</span></span>
            <ChevronRight size={19} className="subtle-icon" />
          </a>;
        })}
      </div>
    </div>
  );
}

type LibraryFilter = "all" | "watched" | "pending" | "favorites";
type LibraryView = "grid" | "list";
type LibraryItem = { movie: MovieRecord; entry: LibraryEntry };
const filters: { id: LibraryFilter; label: string }[] = [
  { id: "all", label: "Todas" }, { id: "watched", label: "Vistas" },
  { id: "pending", label: "Pendientes" }, { id: "favorites", label: "Favoritas" }
];

export function LibraryPage() {
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [view, setView] = useState<LibraryView>("grid");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    let active = true;
    void getLibraryMovies().then((result) => { if (active) setItems(result); });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => items.filter(({ movie, entry }) => {
    const matchesFilter = filter === "all"
      || (filter === "favorites" ? entry.isFavorite : entry.status === filter);
    const matchesQuery = movie.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    return matchesFilter && matchesQuery;
  }), [items, filter, query]);

  function imageUrl(movie: MovieRecord) {
    return getTmdbImageUrl("https://image.tmdb.org/t/p/", movie.posterPath, "w342");
  }

  return (
    <div className="page">
      <PageBack title="Biblioteca" />
      <div className="library-filter-row" role="group" aria-label="Filtrar biblioteca">
        {filters.map((item) => <button className={filter === item.id ? "filter-chip is-selected" : "filter-chip"} key={item.id} onClick={() => setFilter(item.id)} aria-pressed={filter === item.id}>{item.label}</button>)}
      </div>
      <div className="library-tools">
        <div className="inline-search"><Search size={17} /><input type="search" placeholder="Buscar en mi biblioteca..." aria-label="Buscar en mi biblioteca" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <div className="view-toggle" role="group" aria-label="Modo de presentación">
          <button className={view === "grid" ? "view-toggle-button is-active" : "view-toggle-button"} onClick={() => setView("grid")} aria-label="Vista de cuadrícula" aria-pressed={view === "grid"}><Grid2X2 size={18} /></button>
          <button className={view === "list" ? "view-toggle-button is-active" : "view-toggle-button"} onClick={() => setView("list")} aria-label="Vista de lista" aria-pressed={view === "list"}><List size={19} /></button>
        </div>
      </div>
      <div className="content-caption"><h2>{filters.find((item) => item.id === filter)?.label}</h2><span className="muted-copy">{visible.length} películas</span></div>

      {visible.length === 0 ? (
        <EmptyState
          icon={view === "grid" ? <Grid2X2 size={25} /> : <List size={25} />}
          title={items.length ? "No hay películas en esta categoría" : "Tu biblioteca está esperando sus primeras películas"}
          description={items.length ? "Prueba otra categoría o cambia la búsqueda." : "Añade películas desde Descubrir. Aquí podrás organizarlas como vistas, pendientes o favoritas."}
          action={<a className="button button-primary" href="#/discover">Descubrir películas</a>}
        />
      ) : view === "grid" ? (
        <div className="library-poster-grid">
          {visible.map(({ movie }) => <MoviePosterCard key={movie.id} title={movie.title} imageUrl={imageUrl(movie)} onClick={() => { window.location.hash = "#/movie/" + movie.tmdbId; }} />)}
        </div>
      ) : (
        <div className="library-list">
          {visible.map(({ movie, entry }) => (
            <a className="library-list-item" href={"#/movie/" + movie.tmdbId} key={movie.id}>
              <div className="library-list-poster">{imageUrl(movie) ? <img src={imageUrl(movie) ?? ""} alt={movie.title} loading="lazy" /> : <FilmPlaceholder />}</div>
              <div className="library-list-info">
                <strong>{movie.title}</strong>
                <span>{[movie.releaseYear, ...movie.genres.slice(0, 2)].filter(Boolean).join(" · ")}</span>
                <small>{entry.status === "watched" ? "Vista" : "Pendiente"}{entry.isFavorite ? " · Favorita" : ""}</small>
              </div>
              {entry.isFavorite && <Heart size={16} fill="currentColor" className="favorite-mark" />}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function FilmPlaceholder() {
  return <span className="list-poster-placeholder">PRISMA</span>;
}

interface HistoryItem {
  viewing: Viewing;
  movie: MovieRecord;
}

interface CalendarCell {
  date: string;
  day: number;
}

function shiftMonth(value: string, offset: number): string {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function buildCalendarCells(month: string): (CalendarCell | null)[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const cells: (CalendarCell | null)[] = Array.from({ length: offset }, () => null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = year + "-" + String(monthNumber).padStart(2, "0") + "-" + String(day).padStart(2, "0");
    cells.push({ date, day });
  }
  return cells;
}

export function HistoryPage() {
  const [month, setMonth] = useState(toLocalDateString(new Date()).slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [editing, setEditing] = useState<HistoryItem | null>(null);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    const viewings = await prismaDb.viewings.toArray();
    const movieIds = [...new Set(viewings.map((viewing) => viewing.movieId))];
    const movies = await prismaDb.movies.bulkGet(movieIds);
    const byId = new Map(movies.filter((movie) => movie !== undefined).map((movie) => [movie.id, movie]));
    const rows = viewings
      .map((viewing) => ({ viewing, movie: byId.get(viewing.movieId) }))
      .filter((item): item is HistoryItem => Boolean(item.movie))
      .sort((a, b) => b.viewing.watchedOn.localeCompare(a.viewing.watchedOn)
        || b.viewing.sequenceNumber - a.viewing.sequenceNumber);
    setItems(rows);
  }, []);

  useEffect(() => { void loadHistory().catch(() => setError("No se pudo leer el historial local.")); }, [loadHistory]);

  const monthLabel = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("es-PA", { month: "long", year: "numeric" }).format(new Date(year, monthNumber - 1, 1));
  }, [month]);

  const monthItems = useMemo(() => items.filter((item) => item.viewing.watchedOn.startsWith(month)), [items, month]);
  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of monthItems) {
      counts.set(item.viewing.watchedOn, (counts.get(item.viewing.watchedOn) ?? 0) + 1);
    }
    return counts;
  }, [monthItems]);
  const visibleItems = selectedDate
    ? monthItems.filter((item) => item.viewing.watchedOn === selectedDate)
    : monthItems;
  const calendarCells = useMemo(() => buildCalendarCells(month), [month]);

  async function handleDelete(item: HistoryItem) {
    const countForMovie = items.filter((entry) => entry.viewing.movieId === item.viewing.movieId).length;
    const libraryEntry = await getLibraryEntry(item.viewing.movieId);
    const willMoveToPending = countForMovie === 1 && libraryEntry?.status === "watched";
    const message = willMoveToPending
      ? "Este es el último visionado registrado. Al eliminarlo, la película pasará a Pendientes. ¿Continuar?"
      : "¿Eliminar únicamente este visionado? Las demás experiencias se conservarán.";
    if (!window.confirm(message)) return;

    try {
      await deleteViewing(item.viewing.id);
      await loadHistory();
      if (selectedDate === item.viewing.watchedOn) setSelectedDate(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el visionado.");
    }
  }

  function closeEditor() {
    setEditing(null);
  }

  return (
    <div className="page">
      <PageBack title="Historial" />
      <section className="history-calendar card-surface">
        <div className="history-calendar-header">
          <div>
            <p className="eyebrow">TU ACTIVIDAD CINEMATOGRÁFICA</p>
            <h2>{monthLabel}</h2>
          </div>
          <div className="history-month-actions">
            <button className="icon-button" onClick={() => { setMonth((value) => shiftMonth(value, -1)); setSelectedDate(null); }} aria-label="Mes anterior"><ChevronLeft size={19} /></button>
            <button className="icon-button" onClick={() => { setMonth(toLocalDateString(new Date()).slice(0, 7)); setSelectedDate(null); }} aria-label="Ir al mes actual"><CalendarDays size={17} /></button>
            <button className="icon-button" onClick={() => { setMonth((value) => shiftMonth(value, 1)); setSelectedDate(null); }} aria-label="Mes siguiente"><ChevronRight size={19} /></button>
          </div>
        </div>
        <div className="history-calendar-grid" role="grid" aria-label={"Calendario de " + monthLabel}>
          {["L", "M", "X", "J", "V", "S", "D"].map((day) => <span className="history-weekday" key={day}>{day}</span>)}
          {calendarCells.map((cell, index) => cell ? (
            <button
              className={[
                "history-calendar-day",
                dayCounts.has(cell.date) ? "has-viewing" : "",
                selectedDate === cell.date ? "is-selected" : ""
              ].filter(Boolean).join(" ")}
              key={cell.date}
              onClick={() => setSelectedDate((current) => current === cell.date ? null : cell.date)}
              aria-pressed={selectedDate === cell.date}
              aria-label={cell.date + (dayCounts.has(cell.date) ? ", " + dayCounts.get(cell.date) + " visionados" : ", sin visionados")}
            >
              <span>{cell.day}</span>
              {dayCounts.has(cell.date) && <i />}
            </button>
          ) : <span className="history-calendar-empty" key={"empty-" + index} />)}
        </div>
        <div className="history-calendar-legend">
          <span><i /> Día con visionados</span>
          <span>{monthItems.length} {monthItems.length === 1 ? "visionado" : "visionados"}</span>
        </div>
      </section>

      <div className="history-list-heading">
        <div>
          <p className="eyebrow">{selectedDate ? "DÍA SELECCIONADO" : "REGISTROS DEL MES"}</p>
          <h2>{selectedDate ? new Date(selectedDate + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "long", year: "numeric" }) : "Tus experiencias"}</h2>
        </div>
        {selectedDate && <button className="text-link" onClick={() => setSelectedDate(null)}>Ver mes</button>}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {visibleItems.length === 0 ? (
        <EmptyState
          icon={<Clock3 size={25} />}
          title={items.length ? "No hay visionados en este día" : "Todavía no hay visionados"}
          description={items.length ? "Selecciona otro día del calendario o cambia de mes para consultar tus experiencias." : "Registra una película desde su ficha. Cada experiencia conservará su propia fecha y calificación."}
          action={<a className="text-link" href="#/discover">Descubrir películas</a>}
        />
      ) : (
        <div className="history-entry-list">
          {visibleItems.map((item) => {
            const image = getTmdbImageUrl("https://image.tmdb.org/t/p/", item.movie.posterPath, "w185");
            return (
              <article className="history-entry card-surface" key={item.viewing.id}>
                <a className="history-entry-poster" href={"#/movie/" + item.movie.tmdbId}>
                  {image ? <img src={image} alt={item.movie.title} loading="lazy" /> : <span>PRISMA</span>}
                </a>
                <div className="history-entry-info">
                  <strong>{item.movie.title}</strong>
                  <span>Visionado #{item.viewing.sequenceNumber} · {new Date(item.viewing.watchedOn + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short", year: "numeric" })}</span>
                  {item.viewing.watchedAtLocalTime && <small>{item.viewing.watchedAtLocalTime}</small>}
                  <span className="history-entry-rating"><Star size={14} fill="currentColor" /> {item.viewing.rating}/10</span>
                  {item.viewing.review && <p>{item.viewing.review}</p>}
                </div>
                <div className="history-entry-actions">
                  <button className="icon-button" onClick={() => setEditing(item)} aria-label={"Editar visionado " + item.viewing.sequenceNumber}><Pencil size={16} /></button>
                  <button className="icon-button history-delete-button" onClick={() => void handleDelete(item)} aria-label={"Eliminar visionado " + item.viewing.sequenceNumber}><Trash2 size={16} /></button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <ViewingForm
          movieId={editing.movie.id}
          movieTitle={editing.movie.title}
          nextNumber={editing.movie.lastViewingSequence + 1}
          initialViewing={editing.viewing}
          onClose={closeEditor}
          onSaved={() => { void loadHistory(); }}
        />
      )}
    </div>
  );
}

export function CollectionsPage() {
  const routeParts = window.location.hash.replace(/^#\/?/, "").split("/");
  const collectionId = routeParts.length > 2 && routeParts[1] === "collections" ? decodeURIComponent(routeParts[2]) : null;
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [movies, setMovies] = useState<MovieRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const nextCollections = await getCollectionSummaries();
      setCollections(nextCollections);
      if (collectionId) {
        const selected = nextCollections.find((item) => item.collection.id === collectionId)?.collection ?? null;
        setSelectedCollection(selected);
        setMovies(selected ? await getCollectionMovies(collectionId) : []);
      } else {
        setSelectedCollection(null);
        setMovies([]);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las colecciones.");
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => { void loadCollections(); }, [loadCollections]);

  async function handleCreateCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const created = await createCollection(newCollectionName);
      setNewCollectionName("");
      setCreateOpen(false);
      window.location.hash = "#/personal/collections/" + encodeURIComponent(created.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la colección.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCollection() {
    if (!selectedCollection || busy) return;
    if (!window.confirm("¿Eliminar la colección “" + selectedCollection.name + "”? Las películas no se eliminarán de tu Biblioteca.")) return;
    setBusy(true);
    try {
      await deleteCollection(selectedCollection.id);
      window.location.hash = "#/personal/collections";
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar la colección.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMovie(movie: MovieRecord) {
    if (!selectedCollection || busy) return;
    setBusy(true);
    try {
      await removeMovieFromCollection(selectedCollection.id, movie.id);
      await loadCollections();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo quitar la película.");
    } finally {
      setBusy(false);
    }
  }

  function posterUrl(movie: MovieRecord) {
    return getTmdbImageUrl("https://image.tmdb.org/t/p/", movie.posterPath, "w342");
  }

  return (
    <div className="page">
      <PageBack
        title={selectedCollection?.name ?? "Colecciones"}
        eyebrow={collectionId ? "COLECCIÓN" : "PERSONAL"}
        backHref={collectionId ? "#/personal/collections" : "#/personal"}
      />
      {error && <p className="form-error collection-page-error" role="alert">{error}</p>}

      {!collectionId ? (
        <>
          <div className="section-intro-row">
            <p className="muted-copy">Organiza películas en selecciones creadas por ti.</p>
            <button className="icon-button accent-icon-button" type="button" aria-label="Crear colección" title="Crear colección" onClick={() => setCreateOpen((open) => !open)}><Plus size={20} /></button>
          </div>
          {createOpen && (
            <form className="collection-create-panel card-surface" onSubmit={(event) => void handleCreateCollection(event)}>
              <div className="section-intro-row"><h2>Nueva colección</h2><button className="icon-button" type="button" aria-label="Cerrar formulario" onClick={() => setCreateOpen(false)}><X size={18} /></button></div>
              <input
                className="text-field"
                type="text"
                maxLength={60}
                placeholder="Ej. Ciencia ficción esencial"
                aria-label="Nombre de la colección"
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                autoFocus
              />
              <div className="form-actions">
                <button className="button button-secondary" type="button" disabled={busy} onClick={() => { setCreateOpen(false); setNewCollectionName(""); }}>Cancelar</button>
                <button className="button button-primary" type="submit" disabled={!newCollectionName.trim() || busy}>{busy ? "Creando..." : "Crear colección"}</button>
              </div>
            </form>
          )}
          {loading ? (
            <div className="detail-loading"><span>Cargando colecciones...</span></div>
          ) : collections.length === 0 ? (
            <EmptyState
              icon={<Folders size={26} />}
              title="Crea tu primera colección"
              description="Agrupa películas por tema, director, país o cualquier criterio que te guste."
              action={<button className="button button-primary" type="button" onClick={() => setCreateOpen(true)}>Crear colección</button>}
            />
          ) : (
            <div className="collection-grid">
              {collections.map(({ collection, movieCount }) => (
                <a className="collection-card card-surface" href={"#/personal/collections/" + encodeURIComponent(collection.id)} key={collection.id}>
                  <span className="collection-card-icon"><Folders size={21} /></span>
                  <span className="collection-card-copy">
                    <strong>{collection.name}</strong>
                    <small>{movieCount} {movieCount === 1 ? "película" : "películas"}</small>
                  </span>
                  <ChevronRight size={19} className="subtle-icon" />
                </a>
              ))}
            </div>
          )}
        </>
      ) : selectedCollection ? (
        <>
          <div className="section-intro-row collection-detail-heading">
            <p className="muted-copy">{movies.length} {movies.length === 1 ? "película" : "películas"} en esta colección</p>
            <button className="icon-button history-delete-button" type="button" aria-label="Eliminar colección" title="Eliminar colección" disabled={busy} onClick={() => void handleDeleteCollection()}><Trash2 size={18} /></button>
          </div>
          {loading ? (
            <div className="detail-loading"><span>Cargando películas...</span></div>
          ) : movies.length === 0 ? (
            <EmptyState
              icon={<Folders size={26} />}
              title="Esta colección está vacía"
              description="Abre la ficha de una película, toca los tres puntos y elige “Agregar a colección”."
              action={<a className="button button-secondary" href="#/discover">Descubrir películas</a>}
            />
          ) : (
            <div className="collection-movie-grid">
              {movies.map((movie) => (
                <div className="collection-movie-card" key={movie.id}>
                  <MoviePosterCard
                    title={movie.title}
                    imageUrl={posterUrl(movie)}
                    onClick={() => { window.location.hash = "#/movie/" + movie.tmdbId; }}
                  />
                  <button className="button button-quiet collection-movie-remove" type="button" disabled={busy} onClick={() => void handleRemoveMovie(movie)}>Quitar</button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={<Folders size={26} />}
          title="No se encontró esta colección"
          description="Puede que haya sido eliminada."
          action={<a className="button button-secondary" href="#/personal/collections">Ver colecciones</a>}
        />
      )}
    </div>
  );
}

export function ProfilePage() {
  const [stats, setStats] = useState<PersonalStats | null>(null);

  useEffect(() => {
    let active = true;
    void getPersonalStats().then((value) => { if (active) setStats(value); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <div className="page">
      <PageBack title="Mi perfil" />
      <div className="profile-hero card-surface"><div className="avatar-placeholder avatar-large"><UserRound size={34} /></div><h2>Tu identidad cinematográfica</h2><p className="muted-copy">Una historia construida película a película.</p><button className="button button-secondary" disabled>Editar perfil · Próximamente</button></div>
      <div className="content-caption"><h2>Mi historia</h2></div>
      <div className="metric-grid">
        <div className="metric-card"><strong>{stats?.uniqueMoviesWatched ?? "—"}</strong><span>Películas vistas</span></div>
        <div className="metric-card"><strong>{stats ? formatWatchTime(stats.watchedMinutes) : "—"}</strong><span>Tiempo de visionado</span></div>
        <div className="metric-card"><strong>{stats?.currentStreak ?? "—"}</strong><span>Racha actual · días</span></div>
        <div className="metric-card"><strong>{stats?.longestStreak ?? "—"}</strong><span>Récord de racha · días</span></div>
      </div>
      <div className="profile-stat-detail">
        <div><span>Visionados registrados</span><strong>{stats?.totalViewings ?? "—"}</strong></div>
        <div><span>Días con actividad</span><strong>{stats?.activeDays ?? "—"}</strong></div>
        <div><span>Calificación promedio</span><strong>{stats?.averageRating ? stats.averageRating.toFixed(2) + "/10" : "—"}</strong></div>
      </div>
      <div className="content-caption"><h2>Mis logros</h2><Star size={17} /></div>
      <EmptyState icon={<Star size={24} />} title="Tus logros están por comenzar" description="Se desbloquearán a medida que registres películas y experiencias." />
    </div>
  );
}
