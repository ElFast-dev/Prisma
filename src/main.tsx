import React from "react";
import { registerSW } from "virtual:pwa-register";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/catalog.css";

// Comprueba versiones nuevas al arrancar la PWA y activa la versión publicada.
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
