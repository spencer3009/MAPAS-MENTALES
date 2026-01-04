# MindoraMap - Product Requirements Document

## Changelog (Latest First)

### 2026-01-04: Fix Crítico - Persistencia de Drag & Drop en Tableros ✅
- **Fixed**: Bug crítico donde mover tarjetas entre columnas NO se guardaba en la base de datos
- **Root Cause**: `handleDragOver` mutaba `active.data.current.listId`, causando que `handleDragEnd` viera source y destination como iguales
- **Solution**: Guardar `originalListId` en `handleDragStart` y usarlo en `handleDragEnd` en lugar del valor mutado
- **Files Changed**: `/app/frontend/src/components/boards/BoardView.jsx`
- **Testing**: Backend API tests 100% passed (10/10), code review verified

### 2026-01-04: Sistema de Prioridad en Tareas (Estilo Asana) ✅
- **Added**: Selector de prioridad en modal de tarea con 4 opciones:
  - 🟢 Baja (low) - verde
  - 🟡 Media (medium) - amarillo
  - 🟠 Alta (high) - naranja
  - 🔴 Urgente (urgent) - rojo
- **Added**: Badge visual de prioridad en tarjetas con icono Flag + texto
- **Added**: Persistencia completa en backend (PUT /api/boards/{id}/lists/{id}/cards/{id})
- **Added**: Opción "Quitar prioridad" para remover la prioridad
- **Testing**: 11/11 backend tests passed, visual verification passed

### 2026-01-04: Sistema de Etiquetas Real (Estilo Trello) ✅
- **Added**: Sistema completo de etiquetas a nivel de tablero con texto + color
- **Added**: CRUD de etiquetas: crear, editar, eliminar etiquetas del tablero
- **Added**: Asignar/desasignar etiquetas a tareas con checkbox
- **Added**: Etiquetas reutilizables entre múltiples tareas del mismo tablero
- **Added**: Visualización de etiquetas en tarjetas con TEXTO + COLOR (no solo barras de color)
- **Added**: Persistencia completa en backend (board_labels en tablero, labels IDs en tarjetas)
- **Files Changed**:
  - `/app/backend/board_service.py` - BoardLabel model, board_labels field
  - `/app/backend/server.py` - Endpoint update_board con board_labels
  - `/app/frontend/src/components/boards/TaskModal.jsx` - UI completa de etiquetas
  - `/app/frontend/src/components/boards/BoardView.jsx` - Visualización en tarjetas
- **Testing**: 11/11 backend tests passed, visual verification passed

### 2026-01-04: Sistema de Adjuntos Mejorado (Estilo Trello) ✅
- **Added**: Generación automática de 2 versiones de imagen:
  - Preview: 280px ancho máximo (para tarjetas y modal)
  - Grande: 500px ancho máximo (para vista ampliada)
- **Added**: Ícono de ojo (👁️) en hover para abrir vista ampliada
- **Added**: Lightbox profesional con fondo oscuro, info del archivo y botón cerrar
- **Changed**: Íconos en hover ahora son círculos blancos con sombra (mejor visibilidad)
- **Optimized**: Imágenes comprimidas a WebP con calidad 85% (grande) y 75% (preview)

### 2026-01-04: Sistema de Adjuntos de Imágenes ✅
- **Added**: Upload de imágenes con conversión automática a WebP
- **Added**: Redimensionado proporcional (máx 800x600) con optimización de peso
- **Added**: Imagen de portada visible en tarjetas del tablero (estilo Trello)
- **Added**: Grid de adjuntos en modal de tarea con preview y tamaño
- **Added**: Eliminación de adjuntos con hover
- **Added**: Endpoint POST /api/boards/{id}/lists/{id}/cards/{id}/attachments
- **Added**: Endpoint DELETE /api/boards/{id}/lists/{id}/cards/{id}/attachments/{id}
- **Changed**: Sidebar muestra contador de adjuntos

### 2026-01-04: Selector de Hora con AM/PM ✅
- **Changed**: Selector de hora ahora muestra formato 12h con AM/PM
- **Fixed**: Bug de zona horaria en fechas (día se mostraba -1)

### 2026-01-04: Sistema de Fecha Límite para Tareas ✅
- **Added**: Selector de calendario personalizado con navegación por meses
- **Added**: Selector de hora "Vence a las" para fechas límite
- **Added**: Botón "Borrar Fecha Límite" para eliminar fechas
- **Added**: Registro automático en Actividad: "estableció fecha límite", "cambió el plazo", "eliminó fecha límite"
- **Added**: Badge de fecha en tarjetas del tablero con colores según urgencia:
  - Gris: fecha normal (>3 días)
  - Amarillo/Amber: próxima (<=3 días)  
  - Rojo: vencida
- **Added**: Campos `due_time` y `due_date_activities` en modelo de tarjeta
- **Changed**: Endpoint PUT /api/boards/{id}/lists/{id}/cards/{id} ahora maneja todos los campos de tarjeta

### 2026-01-04: Edición Inline y Menú Contextual para Tableros ✅
- **Added**: Edición inline del nombre del tablero haciendo clic en el título
- **Added**: Menú contextual (⋮) con opciones: Renombrar, Duplicar, Mover a carpeta, Eliminar
- **Added**: Endpoint `POST /api/boards/{id}/duplicate` para duplicar tableros con todo su contenido
- **Added**: Validaciones frontend: nombre vacío, máximo 60 caracteres
- **Added**: Toast notifications para feedback de acciones
- **Added**: "Mover a carpeta" preparado como hook para funcionalidad futura
- **Changed**: Modal de eliminación mejorado con vista previa del tablero
- **Fixed**: Botón ⋮ ahora funcional en cada tarjeta de tablero

### 2026-01-03: Fix Layout Dashboard - Templates Grid
- **Fixed**: Cards de templates ocupan todo el ancho disponible
- **Changed**: De `flex overflow-x-auto` a `grid grid-cols-6` responsivo
- **Improved**: Cards más grandes y proporcionales (aspect-square)
- **Fixed**: Hover ya no se recorta - usa z-index y padding correcto
- **Improved**: Íconos más grandes (w-12 h-12)
- **Improved**: Sombras y transiciones más pronunciadas

### 2026-01-03: Time Tracking Global y Persistente
- **Added**: Sistema de Time Tracking que persiste aunque se cierre el popup
- **Added**: Indicador global en esquina superior derecha (botón rojo pulsante con tiempo)
- **Added**: Popup flotante accesible desde cualquier vista
- **Added**: Indicador visual en tarjetas del tablero (banner rojo + borde)
- **Added**: `TimeTrackingContext` para estado global
- **Added**: `GlobalTimeIndicator` componente flotante

### 2026-01-03: Historial Completo de Registros de Tiempo
- **Added**: Historial de eventos de tiempo integrado en la sección "Actividad" del TaskModal

### 2026-01-03: Módulo Time Tracking (Registro de Tiempo)
- **Added**: Sistema completo de registro de tiempo por tarea
- **Added**: Endpoints: `/api/time-tracking/start`, `/stop`, `/active`, `/task/{id}`, `/task/{id}/weekly`

### 2026-01-03: Contador Papelera Unificado
- **Fixed**: Contador de Papelera ahora muestra total de mapas + tableros eliminados
- **Added**: Endpoint `GET /api/trash/count` que retorna `{total, maps_count, boards_count}`

---

## Descripción del Producto
MindoraMap es una plataforma de mapas mentales para empresarios. Permite organizar ideas, planificar estrategias y tomar decisiones de forma visual y colaborativa.

## Características Principales Implementadas

### 1. Sistema de Autenticación
- Login/Registro con JWT
- Google OAuth (Emergent Auth)
- Verificación de email con Resend
- Gestión de sesiones

### 2. Mapas Mentales
- **Layouts disponibles:**
  - Mapa en blanco
  - MindFlow (flujo horizontal)
  - MindTree (árbol jerárquico)
  - MindHybrid (híbrido) - *Nota: tiene issues de estabilidad*
  - MindAxis (eje central bilateral)
  - MindOrbit (radial/circular)
- Drag & drop de nodos
- Edición inline
- Colores personalizables
- Exportación PNG
- Guardado automático

### 3. Sistema de Suscripciones
- Plan Free (límites de mapas)
- Plan Personal ($3/mes)
- Plan Team ($8/usuario/mes)
- Plan Business ($15/usuario/mes)
- Integración PayPal para pagos

### 4. Tableros Kanban (MVP) - **FASE 1 COMPLETADA ✅**
- Crear/editar/eliminar tableros
- **Edición inline**: Clic en título para renombrar directamente
- **Menú contextual (⋮)** con opciones:
  - Renombrar (activa edición inline)
  - Duplicar tablero (crea copia con "(Copia)")
  - Mover a carpeta (preparado para futuro)
  - Eliminar tablero (con confirmación)
- **Sistema de Fecha Límite completo:**
  - Calendario con navegación por meses
  - Selector de hora "Vence a las"
  - Badge visual en tarjetas con colores según urgencia
  - Registro automático de cambios en Actividad
  - Persistencia en base de datos
- **3 columnas por defecto al crear tablero:**
  - Abiertas (Cyan #06B6D4)
  - En Progreso (Azul #3B82F6)
  - Listo (Morado #8B5CF6)
- Tarjetas (tareas) con etiquetas de color
- **UX mejorado:**
  - Tarjeta completa draggable (cursor grab)
  - Drag & drop entre columnas con feedback visual
  - Estados vacíos siempre visibles ("No hay tareas")
  - **Scroll horizontal funcional** para muchas columnas
- **Layout de página ancho completo** (1712px de 1920px viewport)
- Grid responsive: 1-2-3-4 columnas según breakpoint
- **Pop-up/Modal de Tarea completo con:**
  - Título y descripción editables
  - Checklist con progreso
  - Sistema de comentarios/actividad
  - Panel lateral: Etiquetas, Fecha límite, Prioridad, Miembros, Adjuntos
  - Acciones: Mover, Copiar, Seguir, Eliminar
- **Onboarding automático:**
  - Tablero de ejemplo creado al registrar cuenta nueva
  - Incluye tareas de demostración con checklist
- **Soft delete con confirmación:**
  - Modal de confirmación antes de eliminar
  - Tableros van a papelera (no se borran directo)
  - Papelera unificada para mapas y tableros
  - Restaurar o eliminar permanentemente
- Guardado automático
- Diseño inspirado en Trello/ClickUp

### 5. Otras Funcionalidades
- Dashboard con proyectos recientes
- Papelera con soft-delete
- Recordatorios con WhatsApp (Twilio)
- Sistema de favoritos
- Perfil de usuario editable

## Arquitectura Técnica

```
/app/
├── backend/
│   ├── server.py          # API FastAPI principal
│   ├── board_service.py   # Modelos para Tableros
│   ├── email_service.py   # Servicio de emails Resend
│   └── paypal_service.py  # Integración PayPal
└── frontend/
    └── src/
        ├── components/
        │   ├── boards/     # Módulo Tableros (MVP)
        │   │   ├── BoardsPage.jsx
        │   │   └── BoardView.jsx
        │   ├── mindmap/    # Editor de mapas mentales
        │   └── auth/       # Autenticación
        └── hooks/
            └── useNodes.js # Lógica de layouts
```

## Issues Conocidos

| Issue | Prioridad | Estado |
|-------|-----------|--------|
| ~~Drag & Drop no persiste~~ | P0 | ✅ CORREGIDO |
| MindHybrid layout inestable | P1 | PENDIENTE |
| Botón 'X' MultiSelectToolbar no funciona | P2 | PENDIENTE |
| Superposición móvil sidebar/menú | P2 | PENDIENTE |

## Próximas Tareas

### P0 (Alta Prioridad)
- [x] Testing completo de Tableros MVP ✅
- [x] Ajustes de UX (drag & drop mejorado) ✅
- [x] Edición inline y menú contextual para tableros ✅
- [x] Sistema de Fecha Límite para tareas ✅
- [x] **Fix Persistencia Drag & Drop** ✅ (Corregido 2026-01-04)
- [ ] Resolver issues de MindHybrid
- [ ] Verificar MindOrbit: agregar nodos hijos via UI

### P1 (Media Prioridad)
- [ ] Tableros Fase 2: checklist interactivo, adjuntos, comentarios en tiempo real
- [ ] Menú contextual Dashboard para mapas mentales
- [ ] Sistema de carpetas para organizar tableros

### P2 (Backlog)
- [ ] Tableros: Notificaciones y colaboración
- [ ] Admin Role Management
- [ ] Dashboard Enhancements
- [ ] Email Notification Channel
- [ ] Data Migration for `total_maps_created`

## Integraciones de Terceros
- **PayPal**: Suscripciones (modo sandbox)
- **Resend**: Emails transaccionales
- **Twilio**: WhatsApp para recordatorios
- **@dnd-kit**: Drag & drop en Tableros
- **Emergent Google Auth**: Login social

## Credenciales de Prueba
- **Admin**: spencer3009 / Socios3009
- **Free User**: testtrash2025 / testtrash2025

---
*Última actualización: 4 de Enero, 2026*
