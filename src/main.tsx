import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DatabaseBootstrap } from "./components/DatabaseBootstrap";
import { registerPrismaServiceWorker } from "./infrastructure/pwa/registerServiceWorker";
import { installVitePreloadRecovery } from "./infrastructure/pwa/preloadRecovery";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/catalog.css";

// Un fallo al descargar una pantalla antigua permite una recarga de recuperación,
// limitada por pestaña para evitar bucles si el recurso sigue sin estar disponible.
installVitePreloadRecovery();

// El registro del SW no bloquea el montaje de la aplicación ni su base local.
void registerPrismaServiceWorker();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DatabaseBootstrap>
      <App />
    </DatabaseBootstrap>
  </React.StrictMode>
);
