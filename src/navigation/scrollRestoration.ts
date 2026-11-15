export interface ScrollPositionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_PREFIX = "prisma:scroll-position:";

export function routeScrollStorageKey(path: string): string {
  return STORAGE_PREFIX + (path.startsWith("/") ? path : "/" + path);
}

export function saveRouteScrollPosition(
  storage: ScrollPositionStorage,
  path: string,
  scrollY: number
): void {
  if (!Number.isFinite(scrollY)) return;
  storage.setItem(routeScrollStorageKey(path), String(Math.max(0, scrollY)));
}

export function readRouteScrollPosition(
  storage: ScrollPositionStorage,
  path: string
): number | null {
  const value = storage.getItem(routeScrollStorageKey(path));
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Guarda la posición de la ruta hash activa antes de una navegación iniciada por un botón. */
export function saveCurrentRouteScrollPosition(): void {
  if (typeof window === "undefined") return;
  try {
    const path = window.location.hash.replace(/^#/, "") || "/discover";
    saveRouteScrollPosition(window.sessionStorage, path, window.scrollY);
  } catch {
    // La navegación debe seguir funcionando aunque el almacenamiento de sesión no esté disponible.
  }
}
