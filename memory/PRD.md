# MindoraMap - Product Requirements Document

## Changelog (Latest First)

### 2026-01-14: FEATURE — Módulo Avanzado de Gestión de Usuarios ✅ COMPLETADO
- **Funcionalidades implementadas**:
  1. **Ordenamiento de registros**: Por defecto ordenados por fecha de registro (descendente)
  2. **Sistema de filtros por fecha**: Filtro por día, semana, mes y rango personalizado
  3. **Selección múltiple y eliminación masiva**: Checkboxes, seleccionar todos, eliminar múltiples con confirmación
  4. **Paginación profesional**: Controles << 1 2 3 ... 10 >> con navegación completa
  5. **Login as User (Impersonación)**: Admin puede acceder a cualquier cuenta con audit log

- **Backend** (`/app/backend/server.py`):
  - `GET /api/admin/users` actualizado con:
    - Paginación: `page`, `per_page`, `total_pages`, `has_next`, `has_prev`
    - Ordenamiento: `sort_by` (created_at, username, email, plan), `sort_order` (asc/desc)
    - Filtros fecha: `filter_type` (day, week, month), `date_from`, `date_to`
    - Búsqueda: `search` (username, email, full_name)
    - Filtros: `plan_filter`, `status_filter`
  - `POST /api/admin/users/bulk-delete` - Eliminación masiva con protección de admins
  - `POST /api/admin/users/{username}/impersonate` - Login as User con audit trail

- **Frontend** (`/app/frontend/src/components/admin/UsersManagement.jsx`):
  - Componente nuevo separado para mejor mantenibilidad
  - Panel de filtros expandible con todos los controles
  - Tabla con checkboxes, columnas ordenables, badges de plan
  - Paginación con info "Mostrando X a Y de Z usuarios"
  - Menú de acciones: Editar, Cambiar plan, Acceder como usuario, Bloquear, Eliminar
  - Modal de confirmación para eliminación masiva

- **Testing**: 26/29 tests pasaron (90% backend, 100% frontend)
- **Archivos**: `/app/backend/server.py`, `/app/frontend/src/components/admin/UsersManagement.jsx`, `/app/frontend/src/components/admin/AdminPanel.jsx`

### 2026-01-14: FEATURE — Admin Plan Management ✅ COMPLETADO (Verificado)
- Backend: `PUT /api/admin/users/{username}/plan` 
- Frontend: Badges (Manual, Ilimitado, fecha), modal de cambio de plan
- Audit log: Registra cambios de plan en `admin_audit_log` collection
- Testing: 100% backend (13/13), 100% frontend

### 2026-01-11: FIX BUG — WhatsApp Conexión para Usuarios Sin Workspace ✅ COMPLETADO
- **Bug reportado**: Usuarios sin workspace preexistente recibían error 404 "No workspace found" al intentar usar la función de WhatsApp
- **Causa raíz**: Los endpoints `/api/whatsapp/disconnect`, `/api/whatsapp/send`, `/api/whatsapp/messages` y `/api/whatsapp/conversations` no creaban workspace automáticamente
- **Solución implementada**:
  - Aplicada función `get_or_create_workspace()` a TODOS los endpoints de WhatsApp
  - La función crea automáticamente un "Workspace Personal" si el usuario no tiene uno
  - El workspace incluye: ID único, nombre personalizado, membresía como owner
- **Endpoints corregidos**:
  - `POST /api/whatsapp/disconnect` ✅
  - `POST /api/whatsapp/send` ✅
  - `GET /api/whatsapp/messages` ✅
  - `GET /api/whatsapp/conversations` ✅
- **Testing**: Verificado con curl - todos los endpoints responden correctamente para usuarios sin workspace
- **Archivos modificados**: `/app/backend/server.py` (líneas 7005-7122)

### 2026-01-11: WhatsApp Automation Platform - Fase 1 ✅ COMPLETADA
- **Arquitectura implementada**:
  - Servicio WhatsApp Bridge separado (Node.js + TypeScript + Baileys)
  - Backend FastAPI con APIs proxy
  - Frontend con componentes WhatsAppSettings y WhatsAppInbox
  
- **Backend** (`/app/backend/server.py`):
  - `POST /api/whatsapp/connect` - Iniciar conexión WhatsApp
  - `GET /api/whatsapp/qr` - Obtener código QR
  - `GET /api/whatsapp/status` - Estado de conexión
  - `POST /api/whatsapp/disconnect` - Desconectar
  - `POST /api/whatsapp/send` - Enviar mensaje
  - `GET /api/whatsapp/messages` - Obtener mensajes
  - `GET /api/whatsapp/conversations` - Lista de conversaciones
  
- **WhatsApp Bridge Service** (`/app/services/whatsapp-bridge/`):
  - `WhatsAppManager.ts` - Gestión de instancias con Baileys
  - `instance.ts` - Rutas REST para el bridge
  - WebSocket para eventos en tiempo real
  - Manejo de sesiones persistentes
  
- **Frontend**:
  - `WhatsAppSettings.jsx` - Configuración y conexión QR
  - `WhatsAppInbox.jsx` - Interfaz de chat estilo WhatsApp
  - Integrado en DockSidebar y MobileNavigation

### 2026-01-11: Mobile Navigation Mode for Mind Map ✅ COMPLETADO
- **Problema resuelto**: En dispositivos móviles/tablet era difícil navegar mapas grandes sin mover nodos accidentalmente
- **Solución**: Botón flotante de "lock" que desactiva interacción con nodos
- **Archivos**: `NavigationModeButton.jsx`, `Canvas.jsx`, `NodeItem.jsx`

## Critical Blockers

### 🔴 WhatsApp Bridge Not Deployed in Production
- **Status**: BLOQUEADO (esperando decisión del usuario)
- **Problema**: El microservicio `whatsapp-bridge` (Node.js) no es soportado por el pipeline de despliegue de producción
- **Resultado**: Error 503 en todos los endpoints de WhatsApp en producción
- **Opciones presentadas**:
  - A) Migrar a Meta Cloud API (Recomendado)
  - B) Migrar a Twilio WhatsApp API
  - C) Desplegar whatsapp-bridge en hosting externo (Railway, Heroku)
  - D) Pausar WhatsApp y continuar con otras funcionalidades

## Upcoming Tasks

### P1 - WhatsApp Phase 2: Inbox & Messaging
- Requiere resolver bloqueador de producción primero

### P1 - Account Blocking after 7 Days
- Backend logic para bloquear cuentas no verificadas

### P1 - Export Reports
- Añadir exportación PDF/CSV para contactos

## Future/Backlog Tasks

### P2 - WhatsApp Phase 3-4
- Bot & Flows Integration
- Campaigns & Broadcast

### P2 - Admin Audit Log UI
- Interfaz dedicada para ver historial de cambios de plan

### P2 - Mind Map Layout Bugs (Minor)
- Instabilidad en layouts MindOrbit/MindHybrid
- Botón 'X' en MultiSelectToolbar no funcional

### CRITICAL Refactor
- `ContactsPage.jsx`: Descomponer componente de 3500+ líneas

### Other
- Campo "Currency" para contactos
- Notificaciones en tiempo real (WebSocket)

## Code Architecture

```
/app/
├── backend/
│   └── server.py        # Main backend with all endpoints
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── admin/
│       │   │   ├── AdminPanel.jsx      # Main admin container
│       │   │   └── UsersManagement.jsx # Advanced user management
│       │   ├── mindmap/
│       │   │   ├── Canvas.jsx
│       │   │   ├── NodeItem.jsx
│       │   │   └── NavigationModeButton.jsx
│       │   └── whatsapp/
│       ├── contexts/
│       └── hooks/
└── services/
    └── whatsapp-bridge/  # Node.js (NOT DEPLOYED TO PRODUCTION)
```

## Key Database Collections

### users
- `plan`, `plan_source`, `plan_expires_at`, `plan_override`, `plan_assigned_by`, `plan_assigned_at`

### admin_audit_log
- `type`: "plan_change", "bulk_delete", "user_impersonation"
- `admin_username`, `target_username`, `timestamp`, `details`

## Test Reports
- `/app/test_reports/iteration_28.json` - Admin Plan Management tests
- `/app/test_reports/iteration_29.json` - Admin Users Management Advanced Features tests
- `/app/tests/test_admin_plan_management.py`
- `/app/tests/test_admin_users_management.py`
