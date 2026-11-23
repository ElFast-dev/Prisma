import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowLeft, ArrowDown, ArrowUp, Clock3, Folders, Grid2X2, Library, List,
  UserRound, ChevronRight, Plus, Star, Heart, CalendarDays,
  ChevronLeft, Trash2, Pencil, X, Award, Flame, ImagePlus,
  Film, Clapperboard, Clock3 as AchievementClock,
  SlidersHorizontal
} from "lucide-react";
import { useAccessibleDialog } from "../../components/useAccessibleDialog";
import type {
  Collection,
  HistoryBrowsePreferences,
  LibraryEntry,
  LocalProfile,
  MovieRecord
} from "../../domain/types";
import {
  buildHistoryCalendarCells,
  buildHistoryItems,
  filterHistoryItems,
  groupHistoryItemsByMonth,
  shiftHistoryMonth,
  type HistoryFilters,
  type HistoryItem,
  type HistoryNotesFilter,
  type HistoryRatingFilter,
  type HistorySortOrder
} from "../../domain/history";
import { EmptyState } from "../../components/EmptyState";
import { MoviePosterCard } from "../../components/MoviePosterCard";
import { ViewingForm } from "../../components/ViewingForm";
import { getLibraryMovies } from "../../infrastructure/database/movieRepository";
import { getPersonalStats } from "../../infrastructure/database/statisticsRepository";
import { prismaDb } from "../../infrastructure/database/database";
import { deleteViewing } from "../../infrastructure/database/viewingService";
import {
  addMovieToCollection,
  createCollection,
  deleteCollection,
  getCollections,
  getCollectionMovies,
  getCollectionSummaries,
  reorderCollectionMovies,
  removeMovieFromCollection,
  updateCollection,
  type CollectionSummary
} from "../../infrastructure/database/collectionService";
import { getTmdbImageUrl } from "../../infrastructure/tmdb/TmdbService";
import { toLocalDateString } from "../../domain/viewingRules";
import type { PersonalStats } from "../../domain/statistics";
import { calculateAchievements, type AchievementIcon } from "../../domain/achievements";
import { getLocalProfile, saveLocalProfile } from "../../infrastructure/database/profileService";
import { filterLibraryItems, getLibraryFacets, getMovieReleaseStatus, type LibraryBrowseItem, type LibraryBrowseOptions, type LibrarySort } from "../../domain/libraryBrowse";
import { DEFAULT_LIBRARY_FILTERS, normalizeLibraryFilters, selectLibrarySort } from "../../domain/libraryPreferences";
import {
  getUserPreferences,
  saveHistoryBrowsePreferences,
  saveHistoryFilters,
  saveLibraryBrowseFilters
} from "../../infrastructure/database/preferencesService";
import { UnifiedSearchBar } from "../../components/UnifiedSearchBar";
import { navigateBack } from "../../navigation/routeHistory";
import { saveCurrentRouteScrollPosition } from "../../navigation/scrollRestoration";

function PageBack({ title, backHref = "#/personal" }: { title: string; backHref?: string }) {
  const fallback = backHref.replace(/^#/, "") || "/personal";
  return (
    <header className="section-heading">
      <div className="heading-with-back">
        <button type="button" className="back-link" aria-label="Volver a la pantalla anterior" onClick={() => navigateBack(fallback)}><ArrowLeft size={19} /></button>
        <h1>{title}</h1>
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
  const [profile, setProfile] = useState<LocalProfile | undefined>();

  useEffect(() => {
    let active = true;
    void Promise.all([getPersonalStats(), getLocalProfile()])
      .then(([nextStats, nextProfile]) => {
        if (!active) return;
        setStats(nextStats);
        setProfile(nextProfile);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return (
    <div className="page">
      <h1 className="sr-only">Personal</h1>
      <a href="#/personal/profile" className="profile-summary card-surface">
        <div className="avatar-placeholder">{profile?.avatarDataUrl ? <img className="profile-summary-avatar" src={profile.avatarDataUrl} alt="" /> : <UserRound size={27} />}</div>
        <div className="profile-summary-copy">
          <span className="card-title">{profile?.name || "Mi perfil"}</span>
          {(profile?.description || profile?.personalPhrase) && (
            <span className="muted-copy">{profile.description || profile.personalPhrase}</span>
          )}
        </div>
        <ChevronRight size={19} className="subtle-icon" />
        <div className="profile-metrics">
          <div><strong>{stats?.uniqueMoviesWatched ?? "—"}</strong><span>Películas vistas</span></div>
          <div><strong>{stats?.totalViewings ?? "—"}</strong><span>Visionados</span></div>
          <div><strong>{stats?.longestStreak ?? "—"}</strong><span>Récord de racha</span></div>
        </div>
      </a>
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

type LibraryView = "grid" | "list";
type LibraryItem = LibraryBrowseItem;

const libraryStatusOptions: { id: LibraryBrowseOptions["status"]; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "watched", label: "Vistas" },
  { id: "pending", label: "Pendientes" },
  { id: "favorites", label: "Favoritas" }
];

const releaseStatusOptions: { id: LibraryBrowseOptions["releaseStatus"]; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "upcoming", label: "Próximamente" },
  { id: "released", label: "Estrenada" }
];

const sortOptions: { id: LibrarySort; label: string }[] = [
  { id: "title", label: "Título" },
  { id: "rating", label: "Mejor valorados" },
  { id: "my-rating", label: "Mi valoración" },
  { id: "runtime", label: "Duración" },
  { id: "release-date", label: "Más reciente" },
  { id: "added", label: "Añadidos recientemente" },
  { id: "random", label: "Aleatorio" }
];

function nextShuffleSeed(): number {
  return (Math.floor(Math.random() * 0xFFFFFFFF) ^ Date.now()) >>> 0;
}

function librarySortDirectionLabel(sort: LibrarySort, direction: "asc" | "desc"): string {
  if (sort === "random") return "Orden aleatorio";
  if (sort === "title") return direction === "asc" ? "A–Z" : "Z–A";
  if (sort === "runtime") return direction === "asc" ? "Más cortas primero" : "Más largas primero";
  if (sort === "release-date") return direction === "asc" ? "Más antiguas primero" : "Más recientes primero";
  if (sort === "added") return direction === "asc" ? "Más antiguos primero" : "Más recientes primero";
  return direction === "asc" ? "Menor a mayor" : "Mayor a menor";
}

export function LibraryPage() {
  const [filtersState, setFiltersState] = useState<LibraryBrowseOptions>({ ...DEFAULT_LIBRARY_FILTERS });
  const [view, setView] = useState<LibraryView>("list");
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const libraryFiltersDialogRef = useAccessibleDialog(filtersOpen, () => setFiltersOpen(false));

  useEffect(() => {
    let active = true;
    void Promise.all([
      getLibraryMovies(),
      getUserPreferences(),
      prismaDb.viewings.toArray()
    ])
      .then(([libraryItems, preferences, viewings]) => {
        if (!active) return;

        const ratingTotals = new Map<string, { total: number; count: number }>();
        for (const viewing of viewings) {
          if (viewing.rating === undefined) continue;
          const current = ratingTotals.get(viewing.movieId) ?? { total: 0, count: 0 };
          current.total += viewing.rating;
          current.count += 1;
          ratingTotals.set(viewing.movieId, current);
        }

        const withRatings: LibraryItem[] = libraryItems.map(({ movie, entry }) => {
          const ratings = ratingTotals.get(movie.id);
          return {
            movie,
            entry,
            userRating: ratings && ratings.count > 0
              ? Math.round((ratings.total / ratings.count) * 100) / 100
              : undefined
          };
        });

        setItems(withRatings);
        setFiltersState(normalizeLibraryFilters(preferences.libraryFilters));
        setView(preferences.libraryView);
        setPreferencesLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setPreferencesError("No se pudieron cargar tus preferencias locales. Se mostrarán los valores predeterminados.");
        setPreferencesLoaded(true);
      });
    return () => { active = false; };
  }, []);

  const today = toLocalDateString(new Date());
  const facets = useMemo(() => getLibraryFacets(items), [items]);
  const counts = useMemo(() => ({
    all: items.length,
    watched: items.filter(({ entry }) => entry.status === "watched").length,
    pending: items.filter(({ entry }) => entry.status === "pending").length,
    favorites: items.filter(({ entry }) => entry.isFavorite).length
  }), [items]);
  const releaseCounts = useMemo(() => ({
    all: items.length,
    upcoming: items.filter(({ movie }) => getMovieReleaseStatus(movie, today) === "upcoming").length,
    released: items.filter(({ movie }) => getMovieReleaseStatus(movie, today) === "released").length
  }), [items, today]);
  const visible = useMemo(
    () => filterLibraryItems(items, filtersState, today),
    [items, filtersState, today]
  );

  const hasActiveFilters = filtersState.status !== "all"
    || filtersState.releaseStatus !== "all"
    || Boolean(filtersState.query.trim())
    || Boolean(filtersState.genre)
    || Boolean(filtersState.yearFrom)
    || Boolean(filtersState.yearTo)
    || Boolean(filtersState.runtimeMin)
    || Boolean(filtersState.runtimeMax)
    || Boolean(filtersState.myRatingMin)
    || Boolean(filtersState.myRatingMax);
  const hasNonDefaultBrowseOptions = hasActiveFilters
    || filtersState.sort !== "added"
    || filtersState.sortDirection !== "desc";
  const ascendingYears = useMemo(() => [...facets.years].sort((a, b) => a - b), [facets.years]);

  function updateFilters(patch: Partial<LibraryBrowseOptions>) {
    const next = normalizeLibraryFilters({ ...filtersState, ...patch });
    setFiltersState(next);
    if (preferencesLoaded) {
      void saveLibraryBrowseFilters(next).catch(() => {
        setPreferencesError("No se pudo guardar el último cambio de los filtros en este dispositivo.");
      });
    }
  }

  function selectSort(sort: LibrarySort) {
    const next = selectLibrarySort(filtersState, sort, nextShuffleSeed());
    setFiltersState(next);
    if (preferencesLoaded) {
      void saveLibraryBrowseFilters(next).catch(() => {
        setPreferencesError("No se pudo guardar el orden de la Biblioteca.");
      });
    }
  }

  function clearLibraryFilters() {
    const defaults = { ...DEFAULT_LIBRARY_FILTERS };
    setFiltersState(defaults);
    if (preferencesLoaded) {
      void saveLibraryBrowseFilters(defaults).catch(() => {
        setPreferencesError("No se pudieron restablecer las preferencias de Biblioteca.");
      });
    }
  }

  function imageUrl(movie: MovieRecord) {
    return getTmdbImageUrl("https://image.tmdb.org/t/p/", movie.posterPath, "w342");
  }

  const selectedSort = sortOptions.find((option) => option.id === filtersState.sort);

  return (
    <div className="page">
      <PageBack title="Biblioteca" />
      <UnifiedSearchBar
        inputId="library-search"
        placeholder="Buscar..."
        searchLabel="Buscar exclusivamente en mi Biblioteca"
        value={filtersState.query}
        onChange={(query) => updateFilters({ query })}
        onFiltersClick={() => setFiltersOpen(true)}
        filtersOpen={filtersOpen}
        settingsHref="#/settings"
        filtersActive={hasNonDefaultBrowseOptions}
        disabled={!preferencesLoaded}
      />
      {preferencesError && <p className="preferences-feedback" role="status">{preferencesError}</p>}
      {preferencesLoaded && (
        <div className="library-results-heading">
          <div>
            <h2>{filtersState.releaseStatus === "upcoming"
              ? "Próximamente"
              : filtersState.releaseStatus === "released"
                ? "Estrenadas"
                : filtersState.status === "all"
                  ? "Mi Biblioteca"
                  : libraryStatusOptions.find((item) => item.id === filtersState.status)?.label ?? "Biblioteca"}</h2>
            <span className="muted-copy">{visible.length} de {items.length} películas</span>
          </div>
          <span className="library-view-caption">{view === "list" ? "Lista" : "Cuadrícula"}</span>
        </div>
      )}

      {!preferencesLoaded ? (
        <p className="library-loading" role="status">Cargando tu Biblioteca y tus preferencias locales...</p>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={view === "grid" ? <Grid2X2 size={25} /> : <List size={25} />}
          title={items.length ? "No hay películas con estos filtros" : "Tu biblioteca está esperando sus primeras películas"}
          description={items.length ? "Prueba otra combinación de búsqueda, estado, género o año." : "Añade películas desde Descubrir. Aquí podrás organizarlas como vistas, pendientes o favoritas."}
          action={items.length
            ? <button className="button button-secondary" type="button" onClick={clearLibraryFilters}>Limpiar filtros</button>
            : <a className="button button-primary" href="#/discover">Descubrir películas</a>}
        />
      ) : view === "grid" ? (
        <div className="library-poster-grid">
          {visible.map(({ movie }) => (
            <MoviePosterCard
              key={movie.id}
              title={movie.title}
              imageUrl={imageUrl(movie)}
              onClick={() => {
                saveCurrentRouteScrollPosition();
                window.location.hash = "#/movie/" + movie.tmdbId;
              }}
            />
          ))}
        </div>
      ) : (
        <div className="library-list">
          {visible.map(({ movie, entry }) => (
            <a className="library-list-item" href={"#/movie/" + movie.tmdbId} key={movie.id}>
              <div className="library-list-poster">{imageUrl(movie) ? <img src={imageUrl(movie) ?? ""} alt={movie.title} loading="lazy" /> : <FilmPlaceholder />}</div>
              <div className="library-list-info">
                <strong>{movie.title}</strong>
                <span>{[movie.releaseYear, ...movie.genres.slice(0, 2)].filter(Boolean).join(" · ")}</span>
                <small>{entry.status === "watched" ? "Vista" : entry.status === "pending" ? "Pendiente" : "Solo favorita"}{entry.isFavorite && entry.status ? " · Favorita" : ""}</small>
              </div>
              {entry.isFavorite && <Heart size={16} fill="currentColor" className="favorite-mark" />}
            </a>
          ))}
        </div>
      )}

      {filtersOpen && (
        <div className="sheet-backdrop library-sheet-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setFiltersOpen(false);
        }}>
          <section ref={libraryFiltersDialogRef} tabIndex={-1} className="bottom-sheet library-bottom-sheet library-filter-sheet" role="dialog" aria-modal="true" aria-labelledby="library-filters-title">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <h2 id="library-filters-title">Filtros</h2>
              <button className="icon-button" type="button" onClick={() => setFiltersOpen(false)} aria-label="Cerrar filtros"><X size={19} /></button>
            </div>

            <div className="library-sheet-section">
              <div className="library-sheet-label-row"><span>Estado</span><span>{releaseCounts[filtersState.releaseStatus]} títulos</span></div>
              <div className="library-status-options library-release-options" role="group" aria-label="Estado de estreno">
                {releaseStatusOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={filtersState.releaseStatus === option.id ? "library-status-option is-selected" : "library-status-option"}
                    onClick={() => updateFilters({ releaseStatus: option.id })}
                    aria-pressed={filtersState.releaseStatus === option.id}
                  >
                    <span>{option.label}</span><small>{releaseCounts[option.id]}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="library-sheet-section">
              <div className="library-sheet-label-row"><span>Estado en mi Biblioteca</span><span>{counts[filtersState.status]} películas</span></div>
              <div className="library-status-options" role="group" aria-label="Estado personal en Biblioteca">
                {libraryStatusOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={filtersState.status === option.id ? "library-status-option is-selected" : "library-status-option"}
                    onClick={() => updateFilters({ status: option.id })}
                    aria-pressed={filtersState.status === option.id}
                  >
                    <span>{option.label}</span><small>{counts[option.id]}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="library-sheet-section">
              <label className="library-sheet-field" htmlFor="library-genre">
                <span>Género</span>
                <select id="library-genre" className="library-refinement-select" value={filtersState.genre} onChange={(event) => updateFilters({ genre: event.target.value })}>
                  <option value="">Todos los géneros</option>
                  {facets.genres.map((genre) => <option key={genre} value={genre}>{genre}</option>)}
                </select>
              </label>
              <div className="library-year-range">
                <label className="library-sheet-field" htmlFor="library-year-from">
                  <span>Desde el año</span>
                  <select id="library-year-from" className="library-refinement-select" value={filtersState.yearFrom} onChange={(event) => {
                    const yearFrom = event.target.value;
                    updateFilters({ yearFrom, ...(yearFrom && filtersState.yearTo && Number(yearFrom) > Number(filtersState.yearTo) ? { yearTo: "" } : {}) });
                  }}>
                    <option value="">Cualquier año</option>
                    {ascendingYears.map((year) => <option key={year} value={String(year)}>{year}</option>)}
                  </select>
                </label>
                <label className="library-sheet-field" htmlFor="library-year-to">
                  <span>Hasta el año</span>
                  <select id="library-year-to" className="library-refinement-select" value={filtersState.yearTo} onChange={(event) => {
                    const yearTo = event.target.value;
                    updateFilters({ yearTo, ...(yearTo && filtersState.yearFrom && Number(yearTo) < Number(filtersState.yearFrom) ? { yearFrom: "" } : {}) });
                  }}>
                    <option value="">Cualquier año</option>
                    {ascendingYears.map((year) => <option key={year} value={String(year)}>{year}</option>)}
                  </select>
                </label>
              </div>
            </div>

            <div className="library-sheet-section">
              <div className="library-sheet-label-row"><span>Duración de la película</span><span>Minutos</span></div>
              <div className="library-year-range">
                <label className="library-sheet-field" htmlFor="library-runtime-min">
                  <span>Desde</span>
                  <input id="library-runtime-min" className="library-refinement-select" type="number" min="1" max="600" placeholder="Sin mínimo" value={filtersState.runtimeMin} onChange={(event) => updateFilters({ runtimeMin: event.target.value })} />
                </label>
                <label className="library-sheet-field" htmlFor="library-runtime-max">
                  <span>Hasta</span>
                  <input id="library-runtime-max" className="library-refinement-select" type="number" min="1" max="600" placeholder="Sin máximo" value={filtersState.runtimeMax} onChange={(event) => updateFilters({ runtimeMax: event.target.value })} />
                </label>
              </div>
            </div>

            <div className="library-sheet-section">
              <div className="library-sheet-label-row"><span>Mi valoración</span><span>Escala 1–10</span></div>
              <div className="library-year-range">
                <label className="library-sheet-field" htmlFor="library-rating-min">
                  <span>Desde</span>
                  <input id="library-rating-min" className="library-refinement-select" type="number" min="1" max="10" step="0.5" placeholder="Sin mínimo" value={filtersState.myRatingMin} onChange={(event) => updateFilters({ myRatingMin: event.target.value })} />
                </label>
                <label className="library-sheet-field" htmlFor="library-rating-max">
                  <span>Hasta</span>
                  <input id="library-rating-max" className="library-refinement-select" type="number" min="1" max="10" step="0.5" placeholder="Sin máximo" value={filtersState.myRatingMax} onChange={(event) => updateFilters({ myRatingMax: event.target.value })} />
                </label>
              </div>
              <p className="muted-copy">Solo aparecen títulos que tengan al menos una calificación personal.</p>
            </div>

            <div className="library-sheet-section">
              <div className="library-sheet-label-row"><span>Ordenar por</span><span>{selectedSort?.label ?? "Añadidos recientemente"}</span></div>
              <div className="library-sort-options" role="group" aria-label="Ordenar Biblioteca">
                {sortOptions.map((option) => {
                  const selected = filtersState.sort === option.id;
                  const DirectionIcon = filtersState.sortDirection === "asc" ? ArrowUp : ArrowDown;
                  return (
                    <button
                      className={selected ? "library-sort-option is-selected" : "library-sort-option"}
                      type="button"
                      key={option.id}
                      aria-pressed={selected}
                      aria-label={selected && option.id !== "random"
                        ? option.label + ", " + (filtersState.sortDirection === "asc" ? "ascendente" : "descendente") + ". Volver a pulsar para invertir."
                        : option.label}
                      onClick={() => selectSort(option.id)}
                    >
                      <span>{option.label}</span>
                      {selected && (option.id === "random"
                        ? <span className="library-sort-shuffle" aria-label="Nuevo orden aleatorio">↻</span>
                        : <DirectionIcon size={17} aria-label={filtersState.sortDirection === "asc" ? "Ascendente" : "Descendente"} />)}
                    </button>
                  );
                })}
              </div>
              <div className="library-sort-direction" aria-live="polite">
                {filtersState.sort === "random"
                  ? "Cada selección genera una distribución aleatoria nueva."
                  : (filtersState.sortDirection === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                {librarySortDirectionLabel(filtersState.sort, filtersState.sortDirection)}
                {filtersState.sort !== "random" && " · Toca otra vez " + (selectedSort?.label ?? "el criterio") + " para invertir"}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="library-active-filter-summary" aria-live="polite">
                <SlidersHorizontal size={15} />
                <span>
                  {[filtersState.releaseStatus !== "all" ? releaseStatusOptions.find((option) => option.id === filtersState.releaseStatus)?.label : "",
                    filtersState.status !== "all" ? libraryStatusOptions.find((option) => option.id === filtersState.status)?.label : "",
                    filtersState.genre,
                    filtersState.yearFrom || filtersState.yearTo
                      ? "Año " + (filtersState.yearFrom || "…") + "–" + (filtersState.yearTo || "…")
                      : "",
                    filtersState.runtimeMin || filtersState.runtimeMax
                      ? "Duración " + (filtersState.runtimeMin || "…") + "–" + (filtersState.runtimeMax || "…") + " min"
                      : "",
                    filtersState.myRatingMin || filtersState.myRatingMax
                      ? "Mi nota " + (filtersState.myRatingMin || "…") + "–" + (filtersState.myRatingMax || "…")
                      : "",
                    filtersState.query.trim() ? "Búsqueda" : ""]
                    .filter(Boolean).join(" · ")}
                </span>
              </div>
            )}

            <div className="library-sheet-actions">
              <button className="button button-quiet" type="button" onClick={clearLibraryFilters} disabled={!hasNonDefaultBrowseOptions}>Restablecer</button>
              <button className="button button-primary" type="button" onClick={() => setFiltersOpen(false)}>Aplicar filtros</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function FilmPlaceholder() {
  return <span className="list-poster-placeholder">PRISMA</span>;
}

type HistoryViewMode = "timeline" | "calendar";

export function HistoryPage() {
  const today = toLocalDateString(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [notesFilter, setNotesFilter] = useState<HistoryNotesFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<HistoryRatingFilter>("all");
  const [ratingMin, setRatingMin] = useState("");
  const [ratingMax, setRatingMax] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortOrder, setSortOrder] = useState<HistorySortOrder>("newest");
  const [viewMode, setViewMode] = useState<HistoryViewMode>("timeline");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<HistoryItem | null>(null);
  const [error, setError] = useState("");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [preferencesError, setPreferencesError] = useState("");
  const historyFiltersDialogRef = useAccessibleDialog(filtersOpen, () => setFiltersOpen(false));

  const loadHistory = useCallback(async () => {
    const viewings = await prismaDb.viewings.toArray();
    const movieIds = [...new Set(viewings.map((viewing) => viewing.movieId))];
    const movies = await prismaDb.movies.bulkGet(movieIds);
    setItems(buildHistoryItems(viewings, movies));
  }, []);

  useEffect(() => {
    void loadHistory().catch(() => setError("No se pudo leer el historial local."));
  }, [loadHistory]);

  useEffect(() => {
    let active = true;
    void getUserPreferences()
      .then((preferences) => {
        if (!active) return;
        const browse = preferences.historyBrowse;
        if (browse) {
          setViewMode(browse.viewMode);
          setSortOrder(browse.sortOrder);
          setMonth(browse.month);
          setSelectedDate(browse.selectedDate);
        }
        const savedFilters = preferences.historyFilters;
        if (savedFilters) {
          setQuery(savedFilters.query);
          setNotesFilter(savedFilters.notes);
          setRatingFilter(savedFilters.rating);
          setRatingMin(savedFilters.ratingMin);
          setRatingMax(savedFilters.ratingMax);
          setFromDate(savedFilters.fromDate);
          setToDate(savedFilters.toDate);
        }
      })
      .catch(() => {
        if (active) setPreferencesError("No se pudieron leer las preferencias del Historial. Se usarán los valores predeterminados.");
      })
      .finally(() => {
        if (active) setPreferencesReady(true);
      });
    return () => { active = false; };
  }, []);

  const filters = useMemo<HistoryFilters>(() => ({
    query,
    notes: notesFilter,
    rating: ratingFilter,
    ratingMin,
    ratingMax,
    fromDate,
    toDate
  }), [query, notesFilter, ratingFilter, ratingMin, ratingMax, fromDate, toDate]);

  const filteredItems = useMemo(
    () => filterHistoryItems(items, filters, sortOrder),
    [items, filters, sortOrder]
  );

  function updateHistoryBrowse(patch: Partial<HistoryBrowsePreferences>) {
    const next: HistoryBrowsePreferences = {
      viewMode,
      sortOrder,
      month,
      selectedDate,
      ...patch
    };
    setViewMode(next.viewMode);
    setSortOrder(next.sortOrder);
    setMonth(next.month);
    setSelectedDate(next.selectedDate);
    if (preferencesReady) {
      void saveHistoryBrowsePreferences(next).catch(() => {
        setPreferencesError("No se pudo guardar la presentación del Historial en este dispositivo.");
      });
    }
  }

  function updateHistoryFilters(patch: Partial<HistoryFilters>) {
    const next: HistoryFilters = { ...filters, ...patch };
    setQuery(next.query);
    setNotesFilter(next.notes);
    setRatingFilter(next.rating);
    setRatingMin(next.ratingMin);
    setRatingMax(next.ratingMax);
    setFromDate(next.fromDate);
    setToDate(next.toDate);
    if (preferencesReady) {
      void saveHistoryFilters(next).catch(() => {
        setPreferencesError("No se pudieron guardar los filtros del Historial en este dispositivo.");
      });
    }
  }
  const monthItems = useMemo(
    () => filteredItems.filter((item) => item.viewing.watchedOn.startsWith(month)),
    [filteredItems, month]
  );
  const visibleItems = viewMode === "calendar"
    ? selectedDate
      ? monthItems.filter((item) => item.viewing.watchedOn === selectedDate)
      : monthItems
    : filteredItems;
  const historyGroups = useMemo(
    () => groupHistoryItemsByMonth(visibleItems),
    [visibleItems]
  );
  const calendarCells = useMemo(
    () => buildHistoryCalendarCells(month),
    [month]
  );
  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of monthItems) {
      counts.set(item.viewing.watchedOn, (counts.get(item.viewing.watchedOn) ?? 0) + 1);
    }
    return counts;
  }, [monthItems]);

  const monthLabel = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("es-PA", {
      month: "long",
      year: "numeric"
    }).format(new Date(year, monthNumber - 1, 1));
  }, [month]);

  const uniqueMovies = useMemo(
    () => new Set(items.map((item) => item.viewing.movieId)).size,
    [items]
  );
  const ratedItems = items.filter((item) => item.viewing.rating !== undefined);
  const averageRating = ratedItems.length
    ? (ratedItems.reduce((total, item) => total + (item.viewing.rating ?? 0), 0) / ratedItems.length).toFixed(1)
    : "—";
  const activeFilterCount = Number(notesFilter !== "all")
    + Number(ratingFilter !== "all")
    + Number(Boolean(ratingMin))
    + Number(Boolean(ratingMax))
    + Number(Boolean(fromDate))
    + Number(Boolean(toDate))
    + Number(viewMode !== "timeline")
    + Number(sortOrder !== "newest")
    + Number(selectedDate !== null);
  const hasActiveHistoryOptions = activeFilterCount > 0 || Boolean(query.trim());

  function clearHistoryFilters() {
    updateHistoryFilters({
      query: "",
      notes: "all",
      rating: "all",
      ratingMin: "",
      ratingMax: "",
      fromDate: "",
      toDate: ""
    });
    updateHistoryBrowse({
      viewMode: "timeline",
      sortOrder: "newest",
      month: today.slice(0, 7),
      selectedDate: null
    });
  }

  async function handleDelete(item: HistoryItem) {
    const message = "¿Eliminar este visionado? No pasará automáticamente a Pendientes.";
    if (!window.confirm(message)) return;

    try {
      await deleteViewing(item.viewing.id);
      await loadHistory();
      if (selectedDate === item.viewing.watchedOn) updateHistoryBrowse({ selectedDate: null });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar el visionado.");
    }
  }

  function closeEditor() {
    setEditing(null);
  }

  if (!preferencesReady) {
    return (
      <div className="page history-loading" role="status" aria-live="polite">
        <h1>Historial</h1>
        <p className="muted-copy">Restaurando tu diario…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <PageBack title="Historial" />

      <section className="history-overview card-surface" aria-label="Resumen de tu historial">
        <div>
          <strong>{items.length}</strong>
          <span>Visionados</span>
        </div>
        <div>
          <strong>{uniqueMovies}</strong>
          <span>Películas</span>
        </div>
        <div>
          <strong>{averageRating}</strong>
          <span>Nota media / 10</span>
        </div>
      </section>

      <UnifiedSearchBar
        inputId="history-search"
        placeholder="Película, director, género o comentario..."
        searchLabel="Buscar en tu historial"
        value={query}
        onChange={(value) => updateHistoryFilters({ query: value })}
        onFiltersClick={() => setFiltersOpen(true)}
        filtersOpen={filtersOpen}
        filtersActive={hasActiveHistoryOptions}
        settingsHref="#/settings"
        disabled={!preferencesReady}
      />

      {preferencesError && <p className="preferences-feedback" role="status">{preferencesError}</p>}

      {viewMode === "calendar" && (
        <section className="history-calendar card-surface">
          <div className="history-calendar-header">
            <div>
              <p className="eyebrow">EXPLORA POR FECHA</p>
              <h2>{monthLabel}</h2>
            </div>
            <div className="history-month-actions">
              <button
                className="icon-button"
                type="button"
                onClick={() => {
                  updateHistoryBrowse({ month: shiftHistoryMonth(month, -1), selectedDate: null });
                }}
                aria-label="Mes anterior"
              >
                <ChevronLeft size={19} />
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => {
                  updateHistoryBrowse({ month: today.slice(0, 7), selectedDate: null });
                }}
                aria-label="Ir al mes actual"
              >
                <CalendarDays size={17} />
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => {
                  updateHistoryBrowse({ month: shiftHistoryMonth(month, 1), selectedDate: null });
                }}
                aria-label="Mes siguiente"
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </div>

          <div className="history-calendar-grid" role="grid" aria-label={"Calendario de " + monthLabel}>
            {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
              <span className="history-weekday" key={day}>{day}</span>
            ))}
            {calendarCells.map((cell, index) => cell ? (
              <button
                className={[
                  "history-calendar-day",
                  dayCounts.has(cell.date) ? "has-viewing" : "",
                  selectedDate === cell.date ? "is-selected" : ""
                ].filter(Boolean).join(" ")}
                key={cell.date}
                type="button"
                onClick={() => updateHistoryBrowse({ selectedDate: selectedDate === cell.date ? null : cell.date })}
                aria-pressed={selectedDate === cell.date}
                aria-label={cell.date + (dayCounts.has(cell.date)
                  ? ", " + dayCounts.get(cell.date) + " visionados"
                  : ", sin visionados")}
              >
                <span>{cell.day}</span>
                {dayCounts.has(cell.date) && <i aria-hidden="true" />}
              </button>
            ) : (
              <span className="history-calendar-empty" key={"empty-" + index} />
            ))}
          </div>

          <div className="history-calendar-legend">
            <span><i aria-hidden="true" /> Día con visionados</span>
            <span>{monthItems.length} {monthItems.length === 1 ? "visionado" : "visionados"}</span>
          </div>
        </section>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={<Clock3 size={25} />}
          title={items.length === 0
            ? "Todavía no hay visionados"
            : "No hay experiencias que coincidan"}
          description={items.length === 0
            ? "Registra una película desde su ficha. Cada experiencia conservará su propia fecha, calificación y comentario."
            : viewMode === "calendar" && monthItems.length === 0
              ? "No hay visionados en este mes con la búsqueda y los filtros actuales. Puedes volver a la cronología completa."
              : "Prueba con otra búsqueda, amplía las fechas o elimina algún filtro para encontrar tus experiencias."}
          action={items.length === 0 ? (
            <a className="text-link" href="#/discover">Descubrir películas</a>
          ) : viewMode === "calendar" && monthItems.length === 0 ? (
            <button className="text-link" type="button" onClick={() => updateHistoryBrowse({ viewMode: "timeline" })}>Ver toda la cronología</button>
          ) : selectedDate ? (
            <button className="text-link" type="button" onClick={() => updateHistoryBrowse({ selectedDate: null })}>Ver mes completo</button>
          ) : (
            <button className="text-link" type="button" onClick={clearHistoryFilters}>Limpiar búsqueda y filtros</button>
          )}
        />
      ) : (
        <div className="history-groups">
          {historyGroups.map((group) => (
            <section className="history-month-group" key={group.month}>
              {viewMode === "timeline" && (
                <div className="history-month-heading">
                  <h3>{group.label}</h3>
                  <span>{group.items.length} {group.items.length === 1 ? "visionado" : "visionados"}</span>
                </div>
              )}
              <div className="history-entry-list">
                {group.items.map((item) => {
                  const image = getTmdbImageUrl(
                    "https://image.tmdb.org/t/p/",
                    item.movie.posterPath,
                    "w185"
                  );
                  const watchedDate = new Date(item.viewing.watchedOn + "T12:00:00");
                  const dateDay = new Intl.DateTimeFormat("es-PA", { day: "2-digit" }).format(watchedDate);
                  const dateMonth = new Intl.DateTimeFormat("es-PA", { month: "short" })
                    .format(watchedDate)
                    .replace(".", "");
                  const genres = item.movie.genres.slice(0, 2).join(" · ");
                  const directors = item.movie.directors?.slice(0, 2).join(", ");

                  return (
                    <article className="history-entry" key={item.viewing.id}>
                      <div className="history-entry-date">
                        <time dateTime={item.viewing.watchedOn} aria-label={item.viewing.watchedOn}>
                          <strong>{dateDay}</strong>
                          <small>{dateMonth}</small>
                        </time>
                      </div>
                      <a
                        className="history-entry-poster"
                        href={"#/movie/" + item.movie.tmdbId}
                        aria-label={"Abrir ficha de " + item.movie.title}
                      >
                        {image
                          ? <img src={image} alt={"Póster de " + item.movie.title} loading="lazy" />
                          : <span>PRISMA</span>}
                      </a>
                      <div className="history-entry-info">
                        <a className="history-entry-title" href={"#/movie/" + item.movie.tmdbId}>
                          {item.movie.title}
                        </a>
                        {item.movie.originalTitle && item.movie.originalTitle !== item.movie.title && (
                          <small className="history-entry-original">{item.movie.originalTitle}</small>
                        )}
                        <div className="history-entry-meta">
                          <span className={item.viewing.sequenceNumber > 1 ? "history-entry-rewatch" : ""}>
                            {item.viewing.sequenceNumber > 1
                              ? "REVISIONADO · #" + item.viewing.sequenceNumber
                              : "PRIMERA EXPERIENCIA"}
                          </span>
                          {item.viewing.watchedAtLocalTime && (
                            <time
                              dateTime={item.viewing.watchedOn + "T" + item.viewing.watchedAtLocalTime}
                              title={item.viewing.timeZone
                                ? "Hora local · " + item.viewing.timeZone
                                : "Hora local registrada"}
                            >
                              {item.viewing.watchedAtLocalTime}
                            </time>
                          )}
                        </div>
                        {(genres || directors || item.movie.releaseYear) && (
                          <small className="history-entry-context">
                            {[item.movie.releaseYear?.toString(), genres, directors ? "Dir. " + directors : ""]
                              .filter(Boolean)
                              .join(" · ")}
                          </small>
                        )}
                        <span className="history-entry-rating">
                          {item.viewing.rating !== undefined ? (
                            <><Star size={14} fill="currentColor" aria-hidden="true" /> {item.viewing.rating}/10</>
                          ) : "Sin calificar"}
                        </span>
                        {item.viewing.review && (
                          <details className="history-entry-review">
                            <summary>Leer comentario personal</summary>
                            <p>{item.viewing.review}</p>
                          </details>
                        )}
                      </div>
                      <div className="history-entry-actions">
                        <button
                          className="icon-button"
                          type="button"
                          onClick={() => setEditing(item)}
                          aria-label={"Editar visionado " + item.viewing.sequenceNumber + " de " + item.movie.title}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button history-delete-button"
                          type="button"
                          onClick={() => void handleDelete(item)}
                          aria-label={"Eliminar visionado " + item.viewing.sequenceNumber + " de " + item.movie.title}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {filtersOpen && (
        <div
          className="sheet-backdrop history-sheet-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setFiltersOpen(false);
          }}
        >
          <section
            ref={historyFiltersDialogRef}
            tabIndex={-1}
            className="bottom-sheet history-bottom-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-filters-title"
          >
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div>
                <p className="eyebrow">AFINA TU BÚSQUEDA</p>
                <h2 id="history-filters-title">Filtros del historial</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setFiltersOpen(false)}
                aria-label="Cerrar filtros"
              >
                <X size={19} />
              </button>
            </div>

            <div className="history-filter-section">
              <span className="history-filter-label">Presentación</span>
              <div className="history-presentation-group">
                <span className="history-filter-sublabel">Vista</span>
                <div className="library-status-options" role="group" aria-label="Vista del historial">
                  <button
                    className={viewMode === "timeline" ? "library-status-option is-selected" : "library-status-option"}
                    type="button"
                    aria-pressed={viewMode === "timeline"}
                    disabled={!preferencesReady}
                    onClick={() => updateHistoryBrowse({ viewMode: "timeline" })}
                  >
                    <Clapperboard size={15} />
                    <span>Cronología</span>
                  </button>
                  <button
                    className={viewMode === "calendar" ? "library-status-option is-selected" : "library-status-option"}
                    type="button"
                    aria-pressed={viewMode === "calendar"}
                    disabled={!preferencesReady}
                    onClick={() => updateHistoryBrowse({ viewMode: "calendar" })}
                  >
                    <CalendarDays size={15} />
                    <span>Calendario</span>
                  </button>
                </div>
              </div>
              <div className="history-presentation-group">
                <span className="history-filter-sublabel">Orden cronológico</span>
                <div className="library-status-options" role="group" aria-label="Orden cronológico">
                  <button
                    className={sortOrder === "newest" ? "library-status-option is-selected" : "library-status-option"}
                    type="button"
                    aria-pressed={sortOrder === "newest"}
                    disabled={!preferencesReady}
                    onClick={() => updateHistoryBrowse({ sortOrder: "newest" })}
                  >
                    <ArrowDown size={15} />
                    <span>Más recientes primero</span>
                  </button>
                  <button
                    className={sortOrder === "oldest" ? "library-status-option is-selected" : "library-status-option"}
                    type="button"
                    aria-pressed={sortOrder === "oldest"}
                    disabled={!preferencesReady}
                    onClick={() => updateHistoryBrowse({ sortOrder: "oldest" })}
                  >
                    <ArrowUp size={15} />
                    <span>Más antiguos primero</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="history-filter-section">
              <span className="history-filter-label">Comentario personal</span>
              <div className="library-status-options">
                {([
                  ["all", "Todos"],
                  ["with-notes", "Con nota"],
                  ["without-notes", "Sin nota"]
                ] as [HistoryNotesFilter, string][]).map(([value, label]) => (
                  <button
                    className={notesFilter === value ? "library-status-option is-selected" : "library-status-option"}
                    type="button"
                    key={value}
                    aria-pressed={notesFilter === value}
                    onClick={() => updateHistoryFilters({ notes: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="history-filter-section">
              <span className="history-filter-label">Calificación personal</span>
              <div className="library-status-options">
                {([
                  ["all", "Todas"],
                  ["9-10", "9–10"],
                  ["7-8", "7–8"],
                  ["1-6", "1–6"]
                ] as [HistoryRatingFilter, string][]).map(([value, label]) => (
                  <button
                    className={ratingFilter === value ? "library-status-option is-selected" : "library-status-option"}
                    type="button"
                    key={value}
                    aria-pressed={ratingFilter === value}
                    onClick={() => updateHistoryFilters({ rating: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="history-filter-section">
              <span className="history-filter-label">Rango personalizado de nota</span>
              <div className="history-date-range">
                <label className="history-filter-field">
                  <span>Nota mínima</span>
                  <input
                    className="text-field"
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    placeholder="Sin mínimo"
                    value={ratingMin}
                    onChange={(event) => updateHistoryFilters({ ratingMin: event.target.value })}
                  />
                </label>
                <label className="history-filter-field">
                  <span>Nota máxima</span>
                  <input
                    className="text-field"
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    placeholder="Sin máximo"
                    value={ratingMax}
                    onChange={(event) => updateHistoryFilters({ ratingMax: event.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="history-filter-section">
              <span className="history-filter-label">Periodo de visionado</span>
              <div className="history-date-range">
                <label className="history-filter-field">
                  <span>Desde</span>
                  <input
                    className="text-field"
                    type="date"
                    value={fromDate}
                    max={toDate || today}
                    onChange={(event) => updateHistoryFilters({ fromDate: event.target.value })}
                  />
                </label>
                <label className="history-filter-field">
                  <span>Hasta</span>
                  <input
                    className="text-field"
                    type="date"
                    value={toDate}
                    min={fromDate || undefined}
                    max={today}
                    onChange={(event) => updateHistoryFilters({ toDate: event.target.value })}
                  />
                </label>
              </div>
            </div>

            <div className="history-panel-actions">
              <button className="button button-quiet" type="button" onClick={clearHistoryFilters}>
                Restablecer
              </button>
              <button className="button button-primary" type="button" onClick={() => setFiltersOpen(false)}>
                Ver {filteredItems.length} resultados
              </button>
            </div>
          </section>
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
  const collectionId = routeParts.length > 2 && routeParts[1] === "collections"
    ? decodeURIComponent(routeParts[2])
    : null;
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [movies, setMovies] = useState<MovieRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [search, setSearch] = useState("");
  const [editingCollection, setEditingCollection] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [addMoviesOpen, setAddMoviesOpen] = useState(false);
  const [libraryCandidates, setLibraryCandidates] = useState<{ movie: MovieRecord; entry: LibraryEntry }[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [addingMovieId, setAddingMovieId] = useState<string | null>(null);

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
        setEditingCollection(false);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar las colecciones.");
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => { void loadCollections(); }, [loadCollections]);

  const visibleCollections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return collections;
    return collections.filter(({ collection }) =>
      collection.name.toLocaleLowerCase().includes(query)
      || collection.description?.toLocaleLowerCase().includes(query)
    );
  }, [collections, search]);

  const matchingLibraryCandidates = useMemo(() => {
    const query = librarySearch.trim().toLocaleLowerCase();
    if (!query) return libraryCandidates;
    return libraryCandidates.filter(({ movie }) => [
      movie.title,
      movie.originalTitle,
      movie.releaseYear?.toString(),
      ...movie.genres
    ].filter(Boolean).some((value) => value!.toLocaleLowerCase().includes(query)));
  }, [libraryCandidates, librarySearch]);

  const currentCollectionMovieIds = useMemo(
    () => new Set(movies.map((movie) => movie.id)),
    [movies]
  );
  const availableLibraryCandidates = useMemo(
    () => matchingLibraryCandidates.filter(({ movie }) => !currentCollectionMovieIds.has(movie.id)),
    [matchingLibraryCandidates, currentCollectionMovieIds]
  );

  async function handleCreateCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const created = await createCollection(newCollectionName, newCollectionDescription);
      setNewCollectionName("");
      setNewCollectionDescription("");
      setCreateOpen(false);
      window.location.hash = "#/personal/collections/" + encodeURIComponent(created.id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear la colección.");
    } finally {
      setBusy(false);
    }
  }

  function startEditingCollection() {
    if (!selectedCollection) return;
    setEditName(selectedCollection.name);
    setEditDescription(selectedCollection.description ?? "");
    setEditingCollection(true);
    setError("");
  }

  async function handleSaveCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCollection || busy) return;
    setBusy(true);
    setError("");
    try {
      const updated = await updateCollection(selectedCollection.id, {
        name: editName,
        description: editDescription
      });
      setSelectedCollection(updated);
      setEditingCollection(false);
      await loadCollections();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la colección.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCollection() {
    if (!selectedCollection || busy) return;
    if (!window.confirm("¿Eliminar la colección “" + selectedCollection.name + "”? Las películas no se eliminarán de tu Biblioteca.")) return;
    setBusy(true);
    setError("");
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
    setError("");
    try {
      await removeMovieFromCollection(selectedCollection.id, movie.id);
      await loadCollections();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo quitar la película.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetCover(movie: MovieRecord) {
    if (!selectedCollection || busy || selectedCollection.coverMovieId === movie.id) return;
    setBusy(true);
    setError("");
    try {
      const updated = await updateCollection(selectedCollection.id, { coverMovieId: movie.id });
      setSelectedCollection(updated);
      await loadCollections();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la portada.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMoveMovie(movie: MovieRecord, direction: -1 | 1) {
    if (!selectedCollection || busy) return;
    const currentIndex = movies.findIndex((item) => item.id === movie.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= movies.length) return;

    const orderedMovieIds = movies.map((item) => item.id);
    [orderedMovieIds[currentIndex], orderedMovieIds[nextIndex]] = [
      orderedMovieIds[nextIndex],
      orderedMovieIds[currentIndex]
    ];
    setBusy(true);
    setError("");
    try {
      await reorderCollectionMovies(selectedCollection.id, orderedMovieIds);
      await loadCollections();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar el orden de las películas.");
    } finally {
      setBusy(false);
    }
  }

  function posterUrl(movie: MovieRecord) {
    return getTmdbImageUrl("https://image.tmdb.org/t/p/", movie.posterPath, "w342");
  }

  async function openLibraryPicker() {
    if (!selectedCollection) return;
    setAddMoviesOpen(true);
    setLibrarySearch("");
    setLibraryLoading(true);
    setError("");
    try {
      setLibraryCandidates(await getLibraryMovies());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar tu Biblioteca local.");
    } finally {
      setLibraryLoading(false);
    }
  }

  async function handleAddLibraryMovie(movie: MovieRecord) {
    if (!selectedCollection || addingMovieId) return;
    setAddingMovieId(movie.id);
    setError("");
    try {
      await addMovieToCollection(selectedCollection.id, movie.id);
      const [nextMovies, nextCollections] = await Promise.all([
        getCollectionMovies(selectedCollection.id),
        getCollectionSummaries()
      ]);
      setMovies(nextMovies);
      setCollections(nextCollections);
      const refreshed = nextCollections.find((item) => item.collection.id === selectedCollection.id);
      if (refreshed) setSelectedCollection(refreshed.collection);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo añadir la película a la colección.");
    } finally {
      setAddingMovieId(null);
    }
  }

  const selectedCover = movies.find((movie) => movie.id === selectedCollection?.coverMovieId) ?? movies[0];

  return (
    <div className="page">
      <PageBack
        title={selectedCollection?.name ?? "Colecciones"}
        backHref={collectionId ? "#/personal/collections" : "#/personal"}
      />
      {error && <p className="form-error collection-page-error" role="alert">{error}</p>}

      {!collectionId ? (
        <>
          <div className="collection-library-intro">
            <button
              className="icon-button accent-icon-button"
              type="button"
              aria-label="Crear colección"
              title="Crear colección"
              onClick={() => setCreateOpen((open) => !open)}
            >
              <Plus size={20} />
            </button>
          </div>

          {collections.length > 0 && (
            <label className="collection-search">
              <span className="sr-only">Buscar colecciones</span>
              <input
                className="text-field"
                type="search"
                placeholder="Buscar una selección..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Buscar colecciones"
              />
            </label>
          )}

          {createOpen && (
            <form className="collection-create-panel card-surface" data-prisma-unsaved="true" onSubmit={(event) => void handleCreateCollection(event)}>
              <div className="section-intro-row">
                <h2>Nueva colección</h2>
                <button className="icon-button" type="button" aria-label="Cerrar formulario" onClick={() => setCreateOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              <label className="field-label" htmlFor="collection-name">Nombre</label>
              <input
                className="text-field"
                id="collection-name"
                type="text"
                maxLength={60}
                placeholder="Ej. Noches de ciencia ficción"
                aria-label="Nombre de la colección"
                value={newCollectionName}
                onChange={(event) => setNewCollectionName(event.target.value)}
                autoFocus
              />
              <label className="field-label" htmlFor="collection-description">Descripción · opcional</label>
              <textarea
                className="text-field collection-description-input"
                id="collection-description"
                rows={3}
                maxLength={500}
                placeholder="La idea que une estas películas..."
                aria-label="Descripción de la colección"
                value={newCollectionDescription}
                onChange={(event) => setNewCollectionDescription(event.target.value)}
              />
              <div className="form-actions">
                <button className="button button-secondary" type="button" disabled={busy} onClick={() => {
                  setCreateOpen(false);
                  setNewCollectionName("");
                  setNewCollectionDescription("");
                }}>Cancelar</button>
                <button className="button button-primary" type="submit" disabled={!newCollectionName.trim() || busy}>
                  {busy ? "Creando..." : "Crear colección"}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="detail-loading"><span>Reuniendo tus selecciones...</span></div>
          ) : collections.length === 0 ? (
            <EmptyState
              icon={<Folders size={26} />}
              title="Aún no hay selecciones"
              description="Crea una colección para agrupar películas."
              action={<button className="button button-primary" type="button" onClick={() => setCreateOpen(true)}>Crear mi primera colección</button>}
            />
          ) : visibleCollections.length === 0 ? (
            <EmptyState
              icon={<Folders size={26} />}
              title="No encontramos esa selección"
              description="Prueba con otro nombre o con alguna palabra de su descripción."
              action={<button className="button button-secondary" type="button" onClick={() => setSearch("")}>Limpiar búsqueda</button>}
            />
          ) : (
            <div className="collection-grid">
              {visibleCollections.map(({ collection, movieCount, coverMovie }) => (
                <a className="collection-card card-surface" href={"#/personal/collections/" + encodeURIComponent(collection.id)} key={collection.id}>
                  <span className="collection-card-art">
                    {coverMovie && posterUrl(coverMovie) ? (
                      <img src={posterUrl(coverMovie) ?? ""} alt="" loading="lazy" />
                    ) : (
                      <span className="collection-card-placeholder"><Folders size={24} /></span>
                    )}
                  </span>
                  <span className="collection-card-copy">
                    <small className="collection-card-kicker">SELECCIÓN PERSONAL</small>
                    <strong>{collection.name}</strong>
                    {collection.description && <span className="collection-card-description">{collection.description}</span>}
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
          <div className="collection-detail-hero">
            <div className="collection-detail-art">
              {selectedCover && posterUrl(selectedCover) ? (
                <img src={posterUrl(selectedCover) ?? ""} alt={"Portada de " + selectedCollection.name} />
              ) : (
                <span><Folders size={30} /></span>
              )}
            </div>
            <div className="collection-detail-copy">
              <p className="muted-copy">{movies.length} {movies.length === 1 ? "película reunida" : "películas reunidas"}</p>
              {selectedCollection.description && <p className="collection-detail-description">{selectedCollection.description}</p>}
            </div>
          </div>

          <div className="section-intro-row collection-detail-heading">
            <div className="collection-detail-actions">
              <button
                className="button button-secondary collection-add-library-trigger"
                type="button"
                aria-label="Añadir películas desde Biblioteca"
                aria-expanded={addMoviesOpen}
                disabled={busy}
                onClick={() => addMoviesOpen ? setAddMoviesOpen(false) : void openLibraryPicker()}
              >
                <Plus size={15} />
                Añadir desde Biblioteca
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="Editar colección"
                title="Editar colección"
                disabled={busy}
                onClick={startEditingCollection}
              >
                <Pencil size={17} />
              </button>
              <button
                className="icon-button history-delete-button"
                type="button"
                aria-label="Eliminar colección"
                title="Eliminar colección"
                disabled={busy}
                onClick={() => void handleDeleteCollection()}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {addMoviesOpen && (
            <section className="collection-library-picker card-surface" aria-labelledby="collection-library-picker-title">
              <div className="section-intro-row">
                <div>
                  <h2 id="collection-library-picker-title">Añadir desde tu Biblioteca</h2>
                </div>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Cerrar selector de Biblioteca"
                  onClick={() => setAddMoviesOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <label className="collection-library-search">
                <span className="sr-only">Buscar en mi Biblioteca</span>
                <input
                  className="text-field"
                  type="search"
                  aria-label="Buscar en mi Biblioteca"
                  placeholder="Título, año o género..."
                  value={librarySearch}
                  onChange={(event) => setLibrarySearch(event.target.value)}
                />
              </label>

              {libraryLoading ? (
                <p className="muted-copy" role="status">Consultando tu Biblioteca local...</p>
              ) : libraryCandidates.length === 0 ? (
                <p className="muted-copy collection-library-empty">Todavía no hay películas en tu Biblioteca. También puedes añadirlas desde sus fichas cinematográficas.</p>
              ) : matchingLibraryCandidates.length === 0 ? (
                <p className="muted-copy collection-library-empty">No encontramos películas con esa búsqueda.</p>
              ) : availableLibraryCandidates.length === 0 ? (
                <p className="muted-copy collection-library-empty">Las películas encontradas ya pertenecen a esta colección.</p>
              ) : (
                <div className="collection-library-options">
                  {availableLibraryCandidates.map(({ movie, entry }) => (
                    <article className="collection-library-option" key={movie.id}>
                      <div className="collection-library-option-poster">
                        {posterUrl(movie)
                          ? <img src={posterUrl(movie) ?? ""} alt="" loading="lazy" />
                          : <Film size={17} aria-hidden="true" />}
                      </div>
                      <div className="collection-library-option-copy">
                        <strong>{movie.title}</strong>
                        <small>
                          {[movie.releaseYear?.toString(), entry.status === "watched" ? "Vista" : entry.status === "pending" ? "Pendiente" : "Solo favorita", entry.isFavorite && entry.status ? "Favorita" : ""]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      </div>
                      <button
                        className="button button-secondary collection-library-add-button"
                        type="button"
                        aria-label={"Añadir " + movie.title + " a la colección"}
                        disabled={Boolean(addingMovieId)}
                        onClick={() => void handleAddLibraryMovie(movie)}
                      >
                        {addingMovieId === movie.id ? "Añadiendo..." : "Añadir"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
              <p className="collection-library-footnote">Solo se añaden a la selección; tus estados y datos de Biblioteca no cambian.</p>
            </section>
          )}

          {editingCollection && (
            <form className="collection-create-panel card-surface" data-prisma-unsaved="true" onSubmit={(event) => void handleSaveCollection(event)}>
              <div className="section-intro-row">
                <div>
                  <h2>Editar colección</h2>
                </div>
                <button className="icon-button" type="button" aria-label="Cancelar edición" disabled={busy} onClick={() => setEditingCollection(false)}>
                  <X size={18} />
                </button>
              </div>
              <label className="field-label" htmlFor="collection-edit-name">Nombre</label>
              <input
                className="text-field"
                id="collection-edit-name"
                type="text"
                maxLength={60}
                aria-label="Nombre de la colección"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
              <label className="field-label" htmlFor="collection-edit-description">Descripción</label>
              <textarea
                className="text-field collection-description-input"
                id="collection-edit-description"
                rows={3}
                maxLength={500}
                aria-label="Descripción de la colección"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="La idea que une estas películas..."
              />
              <div className="form-actions">
                <button className="button button-secondary" type="button" disabled={busy} onClick={() => setEditingCollection(false)}>Cancelar</button>
                <button className="button button-primary" type="submit" disabled={!editName.trim() || busy}>
                  {busy ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="detail-loading"><span>Ordenando tu selección...</span></div>
          ) : movies.length === 0 ? (
            <EmptyState
              icon={<Folders size={26} />}
              title="Una historia por comenzar"
              description="Añade películas desde tu Biblioteca o desde el menú de una ficha cinematográfica. Después podrás ordenar la selección y escoger su portada."
              action={<a className="button button-secondary" href="#/discover">Descubrir películas</a>}
            />
          ) : (
            <div className="collection-movie-grid">
              {movies.map((movie, index) => (
                <div className="collection-movie-card" key={movie.id}>
                  <MoviePosterCard
                    title={movie.title}
                    imageUrl={posterUrl(movie)}
                    onClick={() => { window.location.hash = "#/movie/" + movie.tmdbId; }}
                  />
                  {selectedCollection.coverMovieId === movie.id && (
                    <span className="collection-movie-cover-label">PORTADA</span>
                  )}
                  <div className="collection-movie-controls">
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={"Mover " + movie.title + " hacia arriba"}
                      title="Mover hacia arriba"
                      disabled={busy || index === 0}
                      onClick={() => void handleMoveMovie(movie, -1)}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={"Mover " + movie.title + " hacia abajo"}
                      title="Mover hacia abajo"
                      disabled={busy || index === movies.length - 1}
                      onClick={() => void handleMoveMovie(movie, 1)}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      className="icon-button"
                      type="button"
                      aria-label={"Usar " + movie.title + " como portada"}
                      title="Usar como portada"
                      disabled={busy || selectedCollection.coverMovieId === movie.id}
                      onClick={() => void handleSetCover(movie)}
                    >
                      <ImagePlus size={15} />
                    </button>
                  </div>
                  <button className="button button-quiet collection-movie-remove" type="button" disabled={busy} onClick={() => void handleRemoveMovie(movie)}>
                    Quitar
                  </button>
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

const achievementIconComponents: Record<AchievementIcon, typeof Film> = {
  film: Film,
  clapperboard: Clapperboard,
  flame: Flame,
  calendar: CalendarDays,
  clock: AchievementClock,
  folders: Folders
};

export function ProfilePage() {
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [collectionCount, setCollectionCount] = useState(0);
  const [profile, setProfile] = useState<LocalProfile | undefined>();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [personalPhrase, setPersonalPhrase] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([getPersonalStats(), getLocalProfile(), getCollections()])
      .then(([nextStats, nextProfile, nextCollections]) => {
        if (!active) return;
        setStats(nextStats);
        setProfile(nextProfile);
        setCollectionCount(nextCollections.length);
        setName(nextProfile?.name ?? "");
        setDescription(nextProfile?.description ?? "");
        setPersonalPhrase(nextProfile?.personalPhrase ?? "");
        setAvatarDataUrl(nextProfile?.avatarDataUrl ?? "");
      })
      .catch((cause) => {
        if (active) setProfileError(cause instanceof Error ? cause.message : "No se pudieron cargar los datos del perfil.");
      });
    return () => { active = false; };
  }, []);

  function startEditing() {
    setName(profile?.name ?? "");
    setDescription(profile?.description ?? "");
    setPersonalPhrase(profile?.personalPhrase ?? "");
    setAvatarDataUrl(profile?.avatarDataUrl ?? "");
    setProfileError("");
    setEditing(true);
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setProfileError("Usa una imagen JPG, PNG o WebP.");
      return;
    }
    if (file.size > 1_500_000) {
      setProfileError("La imagen debe pesar menos de 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarDataUrl(reader.result);
        setProfileError("");
      } else {
        setProfileError("No se pudo leer la imagen seleccionada.");
      }
    };
    reader.onerror = () => setProfileError("No se pudo leer la imagen seleccionada.");
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setProfileError("");
    try {
      const saved = await saveLocalProfile({
        name,
        description,
        personalPhrase,
        avatarDataUrl
      });
      setProfile(saved);
      setEditing(false);
    } catch (cause) {
      setProfileError(cause instanceof Error ? cause.message : "No se pudo guardar tu perfil.");
    } finally {
      setSaving(false);
    }
  }

  const achievements = stats ? calculateAchievements(stats, collectionCount) : [];
  const unlockedCount = achievements.filter((achievement) => achievement.unlocked).length;
  const recentActivityPeak = Math.max(1, ...(stats?.recentActivity.map((month) => month.viewings) ?? []));

  return (
    <div className="page">
      <PageBack title="Mi perfil" />
      <div className="profile-hero card-surface">
        <div className="avatar-placeholder avatar-large">
          {profile?.avatarDataUrl
            ? <img className="profile-avatar-image" src={profile.avatarDataUrl} alt={"Foto de " + (profile.name || "perfil")} />
            : <UserRound size={34} />}
        </div>
        {profile?.name && <h2>{profile.name}</h2>}
        {profile?.description && <p className="muted-copy">{profile.description}</p>}
        {profile?.personalPhrase && <p className="profile-personal-phrase">“{profile.personalPhrase}”</p>}
        <button className="button button-secondary" type="button" onClick={startEditing}><Pencil size={15} /> Editar perfil</button>
      </div>

      {profileError && <p className="form-error profile-error" role="alert">{profileError}</p>}
      {editing && (
        <form className="profile-edit-panel card-surface" data-prisma-unsaved="true" onSubmit={(event) => void handleSaveProfile(event)}>
          <div className="section-intro-row"><h2>Tu identidad</h2><button className="icon-button" type="button" aria-label="Cancelar edición" disabled={saving} onClick={() => { setEditing(false); setProfileError(""); }}><X size={18} /></button></div>
          <div className="profile-edit-avatar-row">
            <div className="avatar-placeholder avatar-large">
              {avatarDataUrl ? <img className="profile-avatar-image" src={avatarDataUrl} alt="Vista previa de tu foto" /> : <UserRound size={34} />}
            </div>
            <div className="profile-avatar-controls">
              <label className="button button-secondary profile-avatar-label" htmlFor="profile-avatar-input"><ImagePlus size={15} /> Cambiar foto</label>
              <input className="sr-only" id="profile-avatar-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} />
              {avatarDataUrl && <button className="text-link" type="button" onClick={() => setAvatarDataUrl("")}>Quitar foto</button>}
              <small>JPG, PNG o WebP · máximo 1.5 MB</small>
            </div>
          </div>
          <label className="field-label" htmlFor="profile-name">Nombre</label>
          <input className="text-field" id="profile-name" type="text" maxLength={40} required value={name} onChange={(event) => setName(event.target.value)} placeholder="¿Cómo te llamas en Prisma?" />
          <label className="field-label" htmlFor="profile-description">Sobre mí</label>
          <textarea className="text-field profile-textarea" id="profile-description" maxLength={160} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Cuéntanos qué tipo de cine te gusta..." />
          <label className="field-label" htmlFor="profile-phrase">Mi frase cinéfila</label>
          <input className="text-field" id="profile-phrase" type="text" maxLength={100} value={personalPhrase} onChange={(event) => setPersonalPhrase(event.target.value)} placeholder="Una frase que te represente" />
          <div className="form-actions">
            <button className="button button-secondary" type="button" disabled={saving} onClick={() => setEditing(false)}>Cancelar</button>
            <button className="button button-primary" type="submit" disabled={saving || !name.trim()}>{saving ? "Guardando..." : "Guardar perfil"}</button>
          </div>
        </form>
      )}

      <div className="content-caption"><h2>Estadísticas</h2></div>
      <div className="metric-grid">
        <div className="metric-card"><strong>{stats?.uniqueMoviesWatched ?? "—"}</strong><span>Películas vistas</span></div>
        <div className="metric-card"><strong>{stats ? formatWatchTime(stats.watchedMinutes) : "—"}</strong><span>Tiempo de visionado</span></div>
        <div className="metric-card"><strong>{stats?.currentStreak ?? "—"}</strong><span>Racha actual · días</span></div>
        <div className="metric-card"><strong>{stats?.longestStreak ?? "—"}</strong><span>Récord de racha · días</span></div>
      </div>
      <div className="profile-stat-detail">
        <div><span>Visionados registrados</span><strong>{stats?.totalViewings ?? "—"}</strong></div>
        <div><span>Visionados adicionales</span><strong>{stats?.additionalViewings ?? "—"}</strong></div>
        <div><span>Días con actividad</span><strong>{stats?.activeDays ?? "—"}</strong></div>
        <div><span>Calificación promedio</span><strong>{stats?.averageRating !== null && stats?.averageRating !== undefined ? stats.averageRating.toFixed(2) + "/10" : "—"}</strong></div>
      </div>

      <section className="profile-insights card-surface" aria-labelledby="profile-insights-title">
        <div className="profile-insights-heading">
          <h2 id="profile-insights-title">Afinidades</h2>
        </div>
        <div className="profile-insights-grid">
          <section className="profile-insight-block" aria-labelledby="profile-genres-title">
            <h3 id="profile-genres-title">Géneros más vistos</h3>
            {stats?.genreHighlights.length ? (
              <ol className="profile-distribution-list">
                {stats.genreHighlights.map((highlight) => (
                  <li className="profile-distribution-item" key={highlight.label}>
                    <div className="profile-distribution-meta">
                      <span>{highlight.label}</span>
                      <strong>{highlight.count} {highlight.count === 1 ? "película" : "películas"}</strong>
                    </div>
                    <div className="profile-distribution-track" role="img" aria-label={highlight.label + ": " + highlight.count + " películas"}>
                      <span style={{ width: highlight.percentage + "%" }} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="profile-insight-empty">No hay datos de géneros.</p>
            )}
          </section>
          <section className="profile-insight-block" aria-labelledby="profile-directors-title">
            <h3 id="profile-directors-title">Directores más vistos</h3>
            {stats?.directorHighlights.length ? (
              <ol className="profile-distribution-list">
                {stats.directorHighlights.map((highlight) => (
                  <li className="profile-distribution-item" key={highlight.label}>
                    <div className="profile-distribution-meta">
                      <span>{highlight.label}</span>
                      <strong>{highlight.count} {highlight.count === 1 ? "película" : "películas"}</strong>
                    </div>
                    <div className="profile-distribution-track" role="img" aria-label={highlight.label + ": " + highlight.count + " películas"}>
                      <span style={{ width: highlight.percentage + "%" }} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="profile-insight-empty">No hay créditos de dirección.</p>
            )}
          </section>
          <section className="profile-insight-block" aria-labelledby="profile-countries-title">
            <h3 id="profile-countries-title">Países de producción</h3>
            {stats?.countryHighlights.length ? (
              <ol className="profile-distribution-list">
                {stats.countryHighlights.map((highlight) => (
                  <li className="profile-distribution-item" key={highlight.label}>
                    <div className="profile-distribution-meta">
                      <span>{highlight.label}</span>
                      <strong>{highlight.count} {highlight.count === 1 ? "película" : "películas"}</strong>
                    </div>
                    <div className="profile-distribution-track" role="img" aria-label={highlight.label + ": " + highlight.count + " películas"}>
                      <span style={{ width: highlight.percentage + "%" }} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="profile-insight-empty">No hay datos de producción.</p>
            )}
          </section>
          <section className="profile-insight-block" aria-labelledby="profile-decades-title">
            <h3 id="profile-decades-title">Décadas</h3>
            {stats?.decadeHighlights.length ? (
              <ol className="profile-distribution-list">
                {stats.decadeHighlights.map((highlight) => (
                  <li className="profile-distribution-item" key={highlight.label}>
                    <div className="profile-distribution-meta">
                      <span>{highlight.label}</span>
                      <strong>{highlight.count} {highlight.count === 1 ? "película" : "películas"}</strong>
                    </div>
                    <div className="profile-distribution-track" role="img" aria-label={highlight.label + ": " + highlight.count + " películas"}>
                      <span style={{ width: highlight.percentage + "%" }} />
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="profile-insight-empty">No hay años de estreno.</p>
            )}
          </section>
        </div>
      </section>

      <section className="profile-activity card-surface" aria-labelledby="profile-activity-title">
        <div className="profile-activity-heading">
          <h3 id="profile-activity-title">Actividad reciente</h3>
          <span>{stats?.totalViewings ?? 0} visionados en total</span>
        </div>
        {stats && stats.totalViewings > 0 ? (
          <div
            className="profile-month-chart"
            role="img"
            aria-label={"Actividad de los últimos seis meses: " + stats.recentActivity.map((month) => month.label + ": " + month.viewings + " visionados").join("; ")}
          >
            {stats.recentActivity.map((month) => (
              <div className="profile-month-column" key={month.key}>
                <strong>{month.viewings}</strong>
                <span className="profile-month-bar-track">
                  <span style={{ height: month.viewings ? Math.max(8, Math.round((month.viewings / recentActivityPeak) * 100)) + "%" : "0%" }} />
                </span>
                <span className="profile-month-label">{month.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="profile-insight-empty">Tu actividad de los últimos seis meses aparecerá aquí cuando registres tu próximo visionado.</p>
        )}
      </section>

      <div className="content-caption"><h2>Logros</h2><span className="achievement-count">{unlockedCount}/{achievements.length} desbloqueados</span></div>
      {achievements.length > 0 ? (
        <div className="achievement-grid">
          {achievements.map((achievement) => {
            const Icon = achievementIconComponents[achievement.icon];
            const percentage = Math.min(100, Math.round((achievement.progress / achievement.target) * 100));
            return (
              <article className={achievement.unlocked ? "achievement-card is-unlocked" : "achievement-card"} key={achievement.id}>
                <span className="achievement-icon"><Icon size={20} /></span>
                <div className="achievement-copy">
                  <div className="achievement-title-row"><strong>{achievement.title}</strong>{achievement.unlocked && <Award size={15} className="achievement-award" />}</div>
                  <p>{achievement.description}</p>
                  <div className="achievement-progress-track"><span style={{ width: percentage + "%" }} /></div>
                  <small>{Math.min(achievement.progress, achievement.target)} / {achievement.target} {achievement.unit}</small>
                </div>
                <span className={achievement.unlocked ? "achievement-state is-unlocked" : "achievement-state"}>{achievement.unlocked ? "Logrado" : "En progreso"}</span>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="muted-copy">Cargando logros…</p>
      )}
    </div>
  );
}
