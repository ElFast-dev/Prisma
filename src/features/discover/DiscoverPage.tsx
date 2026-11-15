import { useState, type FormEvent } from "react";
import { Search, Settings2, SlidersHorizontal, X, Film } from "lucide-react";
import { EmptyState } from "../../components/EmptyState";

export function DiscoverPage() {
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <div className="page page-discover">
      <form className="unified-search" onSubmit={handleSearch} role="search">
        <Search size={19} aria-hidden="true" />
        <label className="sr-only" htmlFor="discover-search">Buscar películas</label>
        <input
          id="discover-search"
          type="search"
          placeholder="Buscar..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        <button
          className="search-action"
          type="button"
          aria-label="Abrir filtros"
          onClick={() => setFiltersOpen(true)}
        >
          <SlidersHorizontal size={19} />
          <span className="sr-only">Filtros</span>
        </button>
        <span className="search-divider" aria-hidden="true" />
        <a className="search-action" href="#/settings" aria-label="Abrir ajustes">
          <Settings2 size={20} />
          <span className="sr-only">Ajustes</span>
        </a>
      </form>

      <header className="section-heading discover-heading">
        <div>
          <p className="eyebrow">TU CATÁLOGO CINEMATOGRÁFICO</p>
          <h1>Descubrir</h1>
        </div>
      </header>

      {query.trim() ? (
        <EmptyState
          icon={<Search size={25} />}
          title="La búsqueda estará disponible próximamente"
          description="La conexión con TMDB todavía no está configurada. La barra y la estructura de búsqueda ya están preparadas."
          action={<a className="text-link" href="#/settings">Ir a Ajustes</a>}
        />
      ) : (
        <EmptyState
          icon={<Film size={27} />}
          title="Tu próximo descubrimiento empieza aquí"
          description="Conecta el catálogo cinematográfico desde Ajustes para cargar películas y explorar sus carátulas."
          action={<a className="button button-primary" href="#/settings">Configurar catálogo</a>}
        />
      )}

      {filtersOpen && (
        <div className="sheet-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setFiltersOpen(false);
        }}>
          <section className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="filters-title">
            <div className="sheet-handle" />
            <div className="sheet-header">
              <div>
                <p className="eyebrow">EXPLORACIÓN</p>
                <h2 id="filters-title">Filtros</h2>
              </div>
              <button className="icon-button" onClick={() => setFiltersOpen(false)} aria-label="Cerrar filtros">
                <X size={19} />
              </button>
            </div>
            <p className="muted-copy">Los filtros de género, año, país, duración y equipo cinematográfico se activarán al integrar el catálogo de TMDB.</p>
            <button className="button button-secondary button-full" onClick={() => setFiltersOpen(false)}>Entendido</button>
          </section>
        </div>
      )}
    </div>
  );
}
