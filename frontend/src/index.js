import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Versión del build - se reemplaza en tiempo de build
const APP_VERSION = process.env.REACT_APP_BUILD_VERSION || 'development';
const BUILD_TIME = process.env.REACT_APP_BUILD_TIME || new Date().toISOString();

// Log de versión para debugging
console.log('%c🚀 Mapas Mentales', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
console.log(`%c   Version: ${APP_VERSION}`, 'color: #64748b;');
console.log(`%c   Build: ${BUILD_TIME}`, 'color: #64748b;');

// Verificar si hay una nueva versión disponible
const checkForUpdates = () => {
  const storedVersion = localStorage.getItem('app_build_version');
  if (storedVersion && storedVersion !== APP_VERSION && APP_VERSION !== 'development') {
    console.log('%c⚡ Nueva versión cargada!', 'color: #22c55e; font-weight: bold;');
  }
};

checkForUpdates();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
