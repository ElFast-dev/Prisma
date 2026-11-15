export interface RouteHistory {
  record(path: string, fromHistoryTraversal?: boolean): void;
  hasPrevious(): boolean;
  current(): string;
}

/**
 * Pila propia que acompaña al historial hash del navegador.
 * Las navegaciones normales añaden rutas; Atrás/Adelante las recorren.
 */
export function createRouteHistory(initialPath: string): RouteHistory {
  let paths = [initialPath || "/discover"];

  return {
    record(path, fromHistoryTraversal = false) {
      if (!path || paths[paths.length - 1] === path) return;

      if (fromHistoryTraversal) {
        const destinationIndex = paths.lastIndexOf(path);
        if (destinationIndex >= 0) {
          paths = paths.slice(0, destinationIndex + 1);
        } else {
          paths.push(path);
        }
        return;
      }

      paths.push(path);
    },
    hasPrevious() {
      return paths.length > 1;
    },
    current() {
      return paths[paths.length - 1] ?? "/discover";
    }
  };
}

let activeHistory = createRouteHistory("/discover");

export function initializeRouteHistory(initialPath: string): void {
  activeHistory = createRouteHistory(initialPath);
}

export function recordRouteChange(path: string, fromHistoryTraversal = false): void {
  activeHistory.record(path, fromHistoryTraversal);
}

/**
 * Reutiliza la entrada anterior del navegador. Para una ficha abierta
 * directamente, reemplaza la URL por Descubrir sin abandonar Prisma.
 */
export function navigateBack(fallback = "/discover"): void {
  if (activeHistory.hasPrevious()) {
    window.history.back();
    return;
  }

  if (activeHistory.current() !== fallback) {
    activeHistory = createRouteHistory(fallback);
    window.location.replace("#" + fallback);
  }
}
