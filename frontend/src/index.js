import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { checkAndClearCache, logVersion } from "@/utils/version";

// Verificar versión y limpiar caché si es necesario
checkAndClearCache();

// Log de versión en consola
logVersion();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
