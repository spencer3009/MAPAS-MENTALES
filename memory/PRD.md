# MindoraMap - Product Requirements Document

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

### 4. Tableros Kanban (MVP) - **COMPLETADO ✅**
- Crear/editar/eliminar tableros
- Listas (columnas) con colores distintivos (gris/turquesa/verde)
- Tarjetas (tareas) con etiquetas de color
- **UX mejorado:**
  - Tarjeta completa draggable (cursor grab)
  - Drag & drop entre columnas con feedback visual
  - Estados vacíos siempre visibles
  - Scroll horizontal para muchas columnas
- Guardado automático
- Diseño inspirado en Trello

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
