import React from "react";
import { registerSW } from "virtual:pwa-register";
import ReactDOM from "react-dom/client";
import App from "./App";
import { DatabaseBootstrap } from "./components/DatabaseBootstrap";
import { pwaUpdateManager } from "./infrastructure/pwa/updateManager";
import { installVitePreloadRecovery } from "./infrastructure/pwa/preloadRecovery";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/catalog.css";

// Un fallo al descargar una pantalla antigua permite una recarga de recuperación,
// limitada por pestaña para evitar bucles si el recurso sigue sin estar disponible.
installVitePreloadRecovery();

// Una nueva versión se anuncia; el usuario decide cuándo recargar la aplicación.
const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh: () => pwaUpdateManager.notifyUpdateAvailable(),
  // Cada pestaña espera confirmación explícita cuando el nuevo SW toma control.
  onNeedReload: () => pwaUpdateManager.notifyReloadRequired()
});
pwaUpdateManager.setUpdateService(updateServiceWorker);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DatabaseBootstrap>
      <App />
    </DatabaseBootstrap>
  </React.StrictMode>
);
