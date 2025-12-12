# Mapas Mentales - Frontend Puro

Aplicación profesional de mapas mentales construida con React + TailwindCSS.

## 🚀 Deploy en Railway

Este proyecto está configurado para desplegarse automáticamente en Railway como un frontend estático.

### Opción 1: Deploy Automático
1. Conecta tu repositorio de GitHub a Railway
2. Railway detectará automáticamente la configuración
3. El proyecto se construirá y desplegará

### Opción 2: Deploy Manual
```bash
# Instalar dependencias
cd frontend
yarn install

# Construir para producción
yarn build

# Servir localmente (para probar)
npx serve -s build
```

## 🛠️ Configuración de Railway

El proyecto incluye:
- `railway.json` - Configuración principal de Railway
- `nixpacks.toml` - Configuración alternativa para Nixpacks
- `.railwayignore` - Ignora la carpeta backend

### Variables de Entorno
No se requieren variables de entorno para el frontend puro.
Todos los datos se guardan en `localStorage` del navegador.

## 📁 Estructura del Proyecto

```
/frontend
├── src/
│   ├── components/mindmap/   # Componentes del mapa mental
│   ├── hooks/                # Custom hooks
│   └── utils/                # Utilidades
├── build/                    # Build de producción (generado)
└── package.json
```

## ✨ Funcionalidades

- ✅ Crear, editar, eliminar y duplicar nodos
- ✅ Conexiones Bezier dinámicas
- ✅ Drag & drop de nodos
- ✅ Panning y zoom del lienzo
- ✅ Menú contextual con 4 colores
- ✅ Persistencia en localStorage
- ✅ Exportar a JSON

## 🌐 Deploy en otras plataformas

### Vercel
```bash
# En el panel de Vercel:
# - Root Directory: frontend
# - Build Command: yarn build
# - Output Directory: build
```

### Netlify
```bash
# En netlify.toml o panel:
# - Base directory: frontend
# - Build command: yarn build
# - Publish directory: frontend/build
```

## 📝 Notas

- Este es un frontend puro, sin backend ni base de datos
- Los datos se guardan localmente en el navegador
- Perfecto para uso personal o demos
