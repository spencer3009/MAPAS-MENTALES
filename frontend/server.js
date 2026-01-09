const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const BUILD_DIR = path.join(__dirname, 'build');

// Headers de caché para diferentes tipos de archivos
const cacheHeaders = (req, res, next) => {
  const url = req.url;
  
  // HTML: Sin caché
  if (url === '/' || url.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  // JS/CSS con hash: Caché largo (1 año)
  else if (url.match(/\.[a-f0-9]{8}\.(js|css)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }
  // Otros assets estáticos: Caché medio (1 día)
  else if (url.match(/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  }
  // Todo lo demás: Sin caché
  else {
    res.setHeader('Cache-Control', 'no-cache');
  }
  
  next();
};

// Aplicar headers de caché
app.use(cacheHeaders);

// PWA Manifest con Content-Type correcto
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(BUILD_DIR, 'manifest.json'));
});

// Service Worker con headers correctos
app.get('/service-worker.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(BUILD_DIR, 'service-worker.js'));
});

// Servir archivos estáticos
app.use(express.static(BUILD_DIR));

// SPA fallback - servir index.html para rutas no encontradas
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(BUILD_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Build version: ${process.env.REACT_APP_BUILD_VERSION || 'unknown'}`);
});
