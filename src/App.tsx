import { useEffect, useState, type ReactNode } from "react";
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

function currentPath(): string {
  const path = window.location.hash.replace(/^#/, "");
  return path || "/discover";
}

export default function App() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    if (!window.location.hash) window.location.hash = "#/discover";
    const updatePath = () => setPath(currentPath());
    window.addEventListener("hashchange", updatePath);
    return () => window.removeEventListener("hashchange", updatePath);
  }, []);

  const isMovie = path.startsWith("/movie/");
  const isPrimaryPage = ["/personal", "/discover", "/spectro"].includes(path);
  const showNavigation = !isMovie && path !== "/settings";

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
      page = isMovie ? <MovieDetailPage /> : <DiscoverPage />;
  }

  return (
    <div className="app-shell">
      <main className={showNavigation ? "main-content with-navigation" : "main-content"}>
        {page}
      </main>
      {showNavigation && (
        <BottomNavigation
          active={path.startsWith("/personal") ? "personal" : path === "/spectro" ? "spectro" : "discover"}
          compact={!isPrimaryPage}
        />
      )}
    </div>
  );
}
