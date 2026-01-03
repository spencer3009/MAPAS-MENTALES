# MindoraMap - Product Requirements Document

## Changelog (Latest First)

### 2026-01-03: Módulo Time Tracking (Registro de Tiempo)
- **Added**: Sistema completo de registro de tiempo por tarea
- **Added**: Endpoints: `/api/time-tracking/start`, `/stop`, `/active`, `/task/{id}`, `/task/{id}/weekly`
- **Added**: Componente `TimeTracker.jsx` integrado en TaskModal
- **Features**:
  - Botón Play/Pause para iniciar/detener contador en tiempo real
  - Tiempo total acumulado por tarea
  - Gráfica semanal de actividad (DO-SA)
  - Historial por usuario con avatares y conteos
  - Un usuario no puede tener dos contadores activos simultáneamente
  - Persistencia en colección `time_entries` de MongoDB

### 2026-01-03: Contador Papelera Unificado
- **Fixed**: Contador de Papelera ahora muestra total de mapas + tableros eliminados
- **Added**: Endpoint `GET /api/trash/count` que retorna `{total, maps_count, boards_count}`
- **Updated**: `loadTrashCount()` usa endpoint unificado
- **Updated**: TrashView y BoardsPage actualizan el contador en tiempo real

### 2026-01-03: Fix Restauración en Papelera
- **Fixed**: Campos incorrectos en TrashView (`project.id` vs `project.project_id`)
- **Fixed**: Formato de fecha (`deletedAt` vs `deleted_at`)

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
| MindHybrid layout inestable | P1 | PENDIENTE |
| Botón 'X' MultiSelectToolbar no funciona | P2 | PENDIENTE |
| Superposición móvil sidebar/menú | P2 | PENDIENTE |

## Próximas Tareas

### P0 (Alta Prioridad)
- [x] Testing completo de Tableros MVP ✅
- [x] Ajustes de UX (drag & drop mejorado) ✅
- [ ] Resolver issues de MindHybrid

### P1 (Media Prioridad)
- [ ] Tableros Fase 2: detalles de tarjetas (descripción, fechas, checklists)
- [ ] Acciones del menú contextual (Compartir, Duplicar)

### P2 (Backlog)
- [ ] Tableros: Notificaciones y colaboración
- [ ] Admin Role Management
- [ ] Dashboard Enhancements
- [ ] Email Notification Channel

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
*Última actualización: 3 de Enero, 2026*
