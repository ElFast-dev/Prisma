import React from "react";
import { registerSW } from "virtual:pwa-register";
import ReactDOM from "react-dom/client";
import App from "./App";
import { prismaDb } from "./infrastructure/database/database";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/catalog.css";

// Abre IndexedDB antes de pintar las rutas cargadas bajo demanda. Así la primera
// pantalla local recibe las tablas listas sin esperar a su propio primer efecto.
void prismaDb.open().catch(() => undefined);

// Comprueba versiones nuevas al arrancar la PWA y activa la versión publicada.
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
