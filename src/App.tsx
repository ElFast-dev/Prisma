import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { BottomNavigation } from "./components/BottomNavigation";
import { DiscoverPage } from "./features/discover/DiscoverPage";
import { HomePage } from "./features/home/HomePage";
import {
  CollectionsPage,
  HistoryPage,
  LibraryPage,
  PersonalPage,
  ProfilePage
} from "./features/personal/PersonalPages";
import { SettingsPage } from "./features/settings/SettingsPage";
import { SpectroPage } from "./features/spectro/SpectroPage";
import { MovieDetailPage } from "./features/movie/MovieDetailPage";
import { initializeRouteHistory, isPrimaryRoute, recordRouteChange } from "./navigation/routeHistory";
import { readRouteScrollPosition, saveRouteScrollPosition } from "./navigation/scrollRestoration";

function currentPath(): string {
  const path = window.location.hash.replace(/^#/, "");
  return path || "/";
}

export default function App() {
  const initialPath = currentPath();
  const [path, setPath] = useState(initialPath);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const activePathRef = useRef(initialPath);
  const pendingScrollRestoreRef = useRef<{ path: string; restore: boolean } | null>({
    path: initialPath,
    restore: true
  });

  useEffect(() => {
    initializeRouteHistory(currentPath());
    if (!window.location.hash) window.location.hash = "#/";

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const persistScroll = () => {
      try { saveRouteScrollPosition(window.sessionStorage, activePathRef.current, window.scrollY); }
      catch { /* La navegación no depende de sessionStorage. */ }
    };
    const handleInternalLink = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('a[href^="#/"]')) persistScroll();
    };
    const updatePath = (fromHistoryTraversal: boolean) => {
      const nextPath = currentPath();
      if (nextPath === activePathRef.current) return;
      persistScroll();
      recordRouteChange(nextPath, fromHistoryTraversal);
      activePathRef.current = nextPath;
      pendingScrollRestoreRef.current = { path: nextPath, restore: fromHistoryTraversal };
      setPath(nextPath);
    };
    const handleHashChange = () => updatePath(false);
    const handlePopState = () => updatePath(true);
    window.addEventListener("scroll", persistScroll, { passive: true });
    window.addEventListener("pagehide", persistScroll);
    document.addEventListener("click", handleInternalLink, true);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handlePopState);
    return () => {
      persistScroll();
      window.removeEventListener("scroll", persistScroll);
      window.removeEventListener("pagehide", persistScroll);
      document.removeEventListener("click", handleInternalLink, true);
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handlePopState);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  useLayoutEffect(() => {
    const request = pendingScrollRestoreRef.current;
    if (!request || request.path !== path) return;
    pendingScrollRestoreRef.current = null;
    let cancelled = false;
    let frame = 0;
    let attempts = 0;
    const restore = () => {
      if (cancelled) return;
      attempts += 1;
      let target = 0;
      if (request.restore) {
        try { target = readRouteScrollPosition(window.sessionStorage, path) ?? 0; }
        catch { target = 0; }
      }
      const documentHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0);
      const maxScroll = Math.max(0, documentHeight - window.innerHeight);
      if (request.restore && target > maxScroll + 2 && attempts < 300) {
        frame = window.requestAnimationFrame(restore);
        return;
      }
      const root = document.documentElement;
      const previousBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, Math.min(target, maxScroll));
      window.requestAnimationFrame(() => { root.style.scrollBehavior = previousBehavior; });
    };
    frame = window.requestAnimationFrame(restore);
    return () => { cancelled = true; window.cancelAnimationFrame(frame); };
  }, [path]);

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  const isMovie = path.startsWith("/movie/");
  const showNavigation = isPrimaryRoute(path);
  let page: ReactNode;
  switch (path) {
    case "/": page = <HomePage />; break;
    case "/personal": page = <PersonalPage />; break;
    case "/personal/profile": page = <ProfilePage />; break;
    case "/personal/library": page = <LibraryPage />; break;
    case "/personal/history": page = <HistoryPage />; break;
    case "/personal/collections": page = <CollectionsPage />; break;
    case "/discover": page = <DiscoverPage />; break;
    case "/spectro": page = <SpectroPage section="home" />; break;
    case "/spectro/map": page = <SpectroPage section="map" />; break;
    case "/spectro/affinities": page = <SpectroPage section="affinities" />; break;
    case "/spectro/evolution": page = <SpectroPage section="evolution" />; break;
    case "/spectro/recommendations": page = <SpectroPage section="recommendations" />; break;
    case "/settings": page = <SettingsPage />; break;
    default:
      page = path.startsWith("/settings/")
        ? <SettingsPage />
        : path.startsWith("/personal/collections/")
          ? <CollectionsPage />
          : isMovie
            ? <MovieDetailPage />
            : <HomePage />;
  }

  const activeSection = path === "/"
    ? "home"
    : path.startsWith("/personal")
      ? "cine"
      : path.startsWith("/spectro")
        ? "spectro"
        : "discover";

  return (
    <div className="app-shell">
      {!isOnline && (
        <div className="offline-banner" role="status">
          <WifiOff size={16} />
          <span>Sin conexión · Prisma mostrará los datos disponibles en este dispositivo.</span>
        </div>
      )}
      <main className={showNavigation ? "main-content with-navigation" : "main-content"}>{page}</main>
      {showNavigation && <BottomNavigation active={activeSection} />}
    </div>
  );
}
