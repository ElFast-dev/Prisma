import { Search, Settings2, SlidersHorizontal, X } from "lucide-react";

interface UnifiedSearchBarProps {
  inputId: string;
  placeholder: string;
  searchLabel: string;
  value: string;
  onChange: (value: string) => void;
  onFiltersClick: () => void;
  filtersOpen?: boolean;
  filtersActive?: boolean;
  settingsHref?: string;
  onSettingsClick?: () => void;
  settingsExpanded?: boolean;
  disabled?: boolean;
}

export function UnifiedSearchBar({
  inputId,
  placeholder,
  searchLabel,
  value,
  onChange,
  onFiltersClick,
  filtersOpen = false,
  filtersActive = false,
  settingsHref,
  onSettingsClick,
  settingsExpanded = false,
  disabled = false
}: UnifiedSearchBarProps) {
  return (
    <form className="unified-search" onSubmit={(event) => event.preventDefault()} role="search">
      <Search size={19} aria-hidden="true" />
      <label className="sr-only" htmlFor={inputId}>{searchLabel}</label>
      <input
        id={inputId}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        disabled={disabled}
      />
      {value && (
        <button
          type="button"
          className="search-action"
          aria-label="Limpiar búsqueda"
          disabled={disabled}
          onClick={() => onChange("")}
        >
          <X size={18} />
        </button>
      )}
      <button
        className={filtersActive ? "search-action has-active-filters" : "search-action"}
        type="button"
        aria-label="Abrir filtros"
        aria-haspopup="dialog"
        aria-expanded={filtersOpen}
        aria-pressed={filtersActive}
        disabled={disabled}
        onClick={onFiltersClick}
      >
        <SlidersHorizontal size={19} />
      </button>
      <span className="search-divider" aria-hidden="true" />
      {settingsHref ? (
        <a className={disabled ? "search-action is-disabled" : "search-action"} href={disabled ? undefined : settingsHref} aria-label="Abrir ajustes" aria-disabled={disabled}>
          <Settings2 size={20} />
        </a>
      ) : (
        <button
          className="search-action"
          type="button"
          aria-label="Abrir ajustes de visualización"
          aria-haspopup="dialog"
          aria-expanded={settingsExpanded}
          disabled={disabled}
          onClick={onSettingsClick}
        >
          <Settings2 size={20} />
        </button>
      )}
    </form>
  );
}
