import { saveCurrentRouteScrollPosition } from "./scrollRestoration";

export interface RouteHistory {
  record(path: string, fromHistoryTraversal?: boolean): void;
  hasPrevious(): boolean;
  current(): string;
}

export function createRouteHistory(initialPath: string): RouteHistory {
  let paths = [initialPath || "/"];
  return {
    record(path, fromHistoryTraversal = false) {
      if (!path || paths[paths.length - 1] === path) return;
      if (fromHistoryTraversal) {
        const destinationIndex = paths.lastIndexOf(path);
        paths = destinationIndex >= 0 ? paths.slice(0, destinationIndex + 1) : [...paths, path];
        return;
      }
      paths.push(path);
    },
    hasPrevious() { return paths.length > 1; },
    current() { return paths[paths.length - 1] ?? "/"; }
  };
}

let activeHistory = createRouteHistory("/");

export function initializeRouteHistory(initialPath: string): void {
  activeHistory = createRouteHistory(initialPath);
}
export function recordRouteChange(path: string, fromHistoryTraversal = false): void {
  activeHistory.record(path, fromHistoryTraversal);
}

export function navigateBack(fallback = "/discover"): void {
  saveCurrentRouteScrollPosition();
  if (activeHistory.hasPrevious()) {
    window.history.back();
    return;
  }
  if (activeHistory.current() !== fallback) {
    activeHistory = createRouteHistory(fallback);
    window.location.replace("#" + fallback);
  }
}

export function isPrimaryRoute(path: string): boolean {
  return path === "/" || path === "/personal" || path === "/discover" || path === "/spectro";
}
