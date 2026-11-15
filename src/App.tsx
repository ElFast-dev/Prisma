import { useEffect, useState, type ReactNode } from "react";
import { WifiOff } from "lucide-react";
import { BottomNavigation } from "./components/BottomNavigation";
import { DiscoverPage } from "./features/discover/DiscoverPage";
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

function currentPath(): string {
  const path = window.location.hash.replace(/^#/, "");
  return path || "/discover";
}

export default function App() {
  const [path, setPath] = useState(currentPath);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    initializeRouteHistory(currentPath());
    if (!window.location.hash) window.location.hash = "#/discover";

    const updatePath = (fromHistoryTraversal: boolean) => {
      const nextPath = currentPath();
      recordRouteChange(nextPath, fromHistoryTraversal);
      setPath(nextPath);
    };
    const handleHashChange = () => updatePath(false);
    const handlePopState = () => updatePath(true);

    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

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
  const isPrimaryPage = isPrimaryRoute(path);
  const showNavigation = isPrimaryPage;

  let page: ReactNode;
  switch (path) {
    case "/personal":
      page = <PersonalPage />;
      break;
    case "/personal/profile":
      page = <ProfilePage />;
      break;
    case "/personal/library":
      page = <LibraryPage />;
      break;
    case "/personal/history":
      page = <HistoryPage />;
      break;
    case "/personal/collections":
      page = <CollectionsPage />;
      break;
    case "/discover":
      page = <DiscoverPage />;
      break;
    case "/spectro":
      page = <SpectroPage />;
      break;
    case "/settings":
      page = <SettingsPage />;
      break;
    default:
      page = path.startsWith("/personal/collections/") ? <CollectionsPage /> : isMovie ? <MovieDetailPage /> : <DiscoverPage />;
  }

  return (
    <div className="app-shell">
      {!isOnline && (
        <div className="offline-banner" role="status">
          <WifiOff size={16} />
          <span>Sin conexión · Prisma mostrará los datos disponibles en este dispositivo.</span>
        </div>
      )}
      <main className={showNavigation ? "main-content with-navigation" : "main-content"}>
        {page}
      </main>
      {showNavigation && (
        <BottomNavigation
          active={path.startsWith("/personal") ? "personal" : path === "/spectro" ? "spectro" : "discover"}
        />
      )}
    </div>
  );
}
