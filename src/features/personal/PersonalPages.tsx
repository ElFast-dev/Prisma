import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, Clock3, Folders, Grid2X2, Library, List, Search,
  UserRound, ChevronRight, Plus, Star, Heart
} from "lucide-react";
import { EmptyState } from "../../components/EmptyState";
import { MoviePosterCard } from "../../components/MoviePosterCard";
import { getLibraryMovies } from "../../infrastructure/database/movieRepository";
import { getTmdbImageUrl } from "../../infrastructure/tmdb/TmdbService";
import type { MovieRecord, LibraryEntry } from "../../domain/types";

function PageBack({ title, eyebrow = "PERSONAL" }: { title: string; eyebrow?: string }) {
  return (
    <header className="section-heading">
      <div className="heading-with-back">
        <a href="#/personal" className="back-link" aria-label="Volver a Personal"><ArrowLeft size={19} /></a>
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

export function PersonalPage() {
  return (
    <div className="page">
      <header className="section-heading"><div><p className="eyebrow">MI ESPACIO CINEMATOGRÁFICO</p><h1>Personal</h1></div></header>
      <a href="#/personal/profile" className="profile-summary card-surface">
        <div className="avatar-placeholder"><UserRound size={27} /></div>
        <div className="profile-summary-copy"><span className="card-title">Mi perfil</span><span className="muted-copy">Tu identidad cinematográfica</span></div>
        <ChevronRight size={19} className="subtle-icon" />
        <div className="profile-metrics"><div><strong>—</strong><span>Películas vistas</span></div><div><strong>—</strong><span>Visionados</span></div><div><strong>—</strong><span>Logros</span></div></div>
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

export function HistoryPage() {
  return (
    <div className="page">
      <PageBack title="Historial" />
      <div className="summary-card card-surface">
        <div><p className="eyebrow">TU ACTIVIDAD CINEMATOGRÁFICA</p><h2>Tu historia, día a día.</h2><p className="muted-copy">Cada visionado conservará su propia fecha y calificación de 1 a 10 estrellas.</p></div>
        <div className="history-preview-grid" aria-label="Vista previa del calendario">{Array.from({ length: 28 }, (_, index) => <span className="history-day" key={index} />)}</div>
      </div>
      <EmptyState icon={<Clock3 size={25} />} title="El historial completo se habilitará próximamente" description="Los visionados ya pueden registrarse desde la ficha; aquí construiremos el calendario y la cronología." action={<a className="text-link" href="#/discover">Buscar una película</a>} />
    </div>
  );
}

export function CollectionsPage() {
  return (
    <div className="page">
      <PageBack title="Colecciones" />
      <div className="section-intro-row"><p className="muted-copy">Organiza películas en selecciones creadas por ti.</p><button className="icon-button accent-icon-button" aria-label="Crear colección" title="Crear colección" disabled><Plus size={20} /></button></div>
      <EmptyState icon={<Folders size={26} />} title="Tus colecciones aparecerán aquí" description="Crea selecciones como cine japonés, ciencia ficción o películas que quieras volver a ver." action={<span className="muted-copy">La creación de colecciones se habilitará en la siguiente entrega.</span>} />
    </div>
  );
}

export function ProfilePage() {
  return (
    <div className="page">
      <PageBack title="Mi perfil" />
      <div className="profile-hero card-surface"><div className="avatar-placeholder avatar-large"><UserRound size={34} /></div><h2>Tu identidad cinematográfica</h2><p className="muted-copy">Una historia construida película a película.</p><button className="button button-secondary" disabled>Editar perfil · Próximamente</button></div>
      <div className="content-caption"><h2>Mi historia</h2></div>
      <div className="metric-grid"><div className="metric-card"><strong>—</strong><span>Películas vistas</span></div><div className="metric-card"><strong>—</strong><span>Horas de cine</span></div><div className="metric-card"><strong>—</strong><span>Racha actual</span></div><div className="metric-card"><strong>—</strong><span>Récord de racha</span></div></div>
      <div className="content-caption"><h2>Mis logros</h2><Star size={17} /></div>
      <EmptyState icon={<Star size={24} />} title="Tus logros están por comenzar" description="Se desbloquearán a medida que registres películas y experiencias." />
    </div>
  );
}
