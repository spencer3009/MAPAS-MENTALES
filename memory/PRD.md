# MindoraMap - Product Requirements Document

## Changelog (Latest First)

### 2026-01-19: FEATURE — Colaboradores dentro de Configuración de Empresa ✅ COMPLETADO
- **Estado**: Sistema de colaboradores integrado dentro del modal de configuración
- **Cambio de UX**: Los colaboradores ya no están en un modal separado - ahora son una **pestaña** dentro de "Configuración de Empresa"
- **UI implementada**:
  - Modal con 2 pestañas: "General" y "Colaboradores"
  - Sección "Roles disponibles" con badges de colores y descripciones
  - Nota destacada: "Los colaboradores NO tienen acceso a mapas mentales ni recordatorios personales"
  - Lista de miembros con foto, nombre, email y rol
  - Selector de rol inline para cambiar roles (solo admins)
  - Botón eliminar colaborador (solo admins)
  - Lista de invitaciones pendientes con estado visual
  - Formulario inline de invitación con: email, rol, mensaje opcional
- **Roles implementados**:
  - **Propietario** (amarillo): Acceso total. Puede eliminar empresa y gestionar colaboradores.
  - **Administrador** (púrpura): Acceso total excepto eliminar empresa.
  - **Colaborador Operativo** (azul): Acceso a Finanzas, Contactos y Tableros. Sin configuraciones.
- **Reglas de acceso**:
  - Colaboradores solo ven la empresa a la que pertenecen
  - NO tienen acceso a mapas mentales personales
  - NO tienen acceso a recordatorios personales
  - Solo ven recordatorios operativos de la empresa
- **Archivo modificado**: `/app/frontend/src/components/common/GlobalCompanySelector.jsx`

### 2026-01-19: REFACTOR — Selector de Empresa Global en Header ✅ COMPLETADO
- **Estado**: Refactorización completada - Gestión de empresas movida a nivel global
- **Problema solucionado**: La gestión de empresas estaba dentro del módulo Finanzas, pero la empresa es un contexto que afecta a todos los módulos operativos (Finanzas, Contactos, Tableros, Colaboradores, Recordatorios)
- **Solución implementada**:
  - Nuevo componente: `/app/frontend/src/components/common/GlobalCompanySelector.jsx`
  - Selector de empresa global ubicado en el **sidebar izquierdo** (DockSidebar)
  - Dropdown con lista de empresas y acciones globales
- **Funcionalidades del selector global**:
  - Ver y cambiar empresa activa (con check visual)
  - Crear nueva empresa
  - Configuración de empresa (edición completa)
  - Zona de riesgo para eliminar empresa
  - Acceso a gestión de colaboradores
- **Impacto en la arquitectura**:
  - `FinanzasModule.jsx` simplificado - ya no maneja empresas, usa `useCompany()` context
  - `DockSidebar.jsx` ahora recibe `token` y muestra el `GlobalCompanySelector`
  - `CompanyContext.jsx` actualizado con `deleteCompany(id, confirmation)`
- **UI**:
  - Header gris oscuro "Configuración de Empresa" para modo edición
  - Zona de riesgo roja expandible con confirmación de nombre
  - Modal scrolleable para ver todo el contenido

### 2026-01-19: FEATURE — Sistema de Colaboradores por Empresa ✅ COMPLETADO
- **Estado**: Sistema completo de colaboradores implementado y testeado
- **Concepto implementado**:
  - Colaboradores pertenecen a una Empresa específica, no a la cuenta global
  - Roles: Propietario (acceso total), Administrador (casi todo), Colaborador Operativo (limitado)
  - Límite de colaboradores según plan del propietario (free=0, personal=3, team=10, business=ilimitado)
- **Backend implementado**:
  - Nuevo servicio: `/app/backend/collaborator_service.py` con modelos, permisos y email templates
  - `GET /api/finanzas/companies` - Ahora retorna `user_role` e `is_owner` para cada empresa
  - `GET /api/finanzas/companies/{id}/collaborators` - Lista colaboradores (incluye propietario)
  - `POST /api/finanzas/companies/{id}/collaborators/invite` - Invitar colaborador con validación de límite
  - `GET /api/invitations/pending` - Obtener invitaciones pendientes del usuario
  - `POST /api/invitations/{id}/accept` - Aceptar invitación
  - `POST /api/invitations/{id}/reject` - Rechazar invitación
  - `PUT /api/finanzas/companies/{id}/collaborators/{username}/role` - Cambiar rol
  - `DELETE /api/finanzas/companies/{id}/collaborators/{username}` - Revocar acceso
  - `verify_company_access()` actualizada para permitir acceso a colaboradores
- **Frontend implementado**:
  - Nuevo componente: `/app/frontend/src/components/company/CollaboratorsManager.jsx`
  - Modal "Configuración de Empresa" con pestañas Colaboradores/Invitaciones
  - Modal "Invitar Colaborador" con campos email, rol, mensaje
  - Banner de invitaciones pendientes (PendingInvitationsBanner) al login
  - Botón de colaboradores (Users icon) en header del módulo Finanzas
- **Permisos por rol**:
  - **Propietario**: Todo acceso, puede eliminar empresa
  - **Administrador**: Todo excepto eliminar empresa
  - **Colaborador Operativo**: Finanzas, Contactos, Tableros. Sin gestión de colaboradores
- **Notificaciones**:
  - Email de invitación enviado al colaborador
  - Email de aceptación/rechazo al que invitó
  - Email de cambio de rol
  - Email de acceso revocado
  - Notificaciones in-app para todos los eventos
- **Testing**: 100% backend (15/15 tests), 100% frontend UI verificado
- **Test file**: `/app/tests/test_collaborators.py`

### 2026-01-19: FEATURE — Eliminación Segura de Empresas + Bug Fix Indicador Salud ✅ COMPLETADO
- **Estado**: Feature de eliminación de empresas implementado y testeado
- **Bug Fix - Indicador de Salud Financiera**:
  - Problema: Empresas nuevas con S/ 0 ingresos y gastos mostraban "Crítico"
  - Solución: Función `calculate_health_status()` ahora retorna "good" cuando income=0, expenses=0, pending_expenses=0
  - Archivo modificado: `/app/backend/finanzas_service.py` línea 307
- **Feature - Eliminación de Empresas**:
  - "Zona de riesgo" en modal de edición de empresa
  - Sección expandible con advertencia IRREVERSIBLE
  - Lista de datos que serán eliminados (finanzas, contactos, tableros, recordatorios)
  - Campo de confirmación requiere nombre exacto de empresa o "ELIMINAR"
  - Botón de eliminación deshabilitado hasta confirmación válida
  - Eliminación en cascada de todos los datos asociados
- **Backend**:
  - Endpoint `DELETE /api/finanzas/companies/{company_id}` con validación de confirmación
  - Retorna estadísticas de datos eliminados (incomes, expenses, investments, contacts, boards, reminders)
  - Retorna 400 si confirmación es incorrecta, 404 si empresa no existe
- **Frontend**:
  - `CompanyModal` en `/app/frontend/src/components/common/CompanySelector.jsx` con zona de riesgo
  - `FinanzasModule.jsx` importa `CompanyModal` y pasa `onDelete` handler
  - Handler `handleDeleteCompany` elimina empresa y actualiza UI
- **Testing**: 100% backend (7/7 tests), 100% frontend UI verificado
- **Test file**: `/app/tests/test_company_delete_and_health.py`

### 2026-01-19: ARQUITECTURA — "Empresa como Contexto Operativo" ✅ COMPLETADO
- **Estado**: Arquitectura dual implementada (Empresa para operaciones, Usuario para mente)
- **Concepto implementado**:
  - **Empresa = Contexto Operativo**: Finanzas, Contactos, Tableros requieren empresa activa
  - **Usuario = Contexto Mental**: Mapas Mentales, Recordatorios siguen siendo personales
- **Componentes creados**:
  - `CompanyContext.jsx`: Context global para gestión de empresas
  - `CompanySelector.jsx`: Selector reutilizable con create/edit
  - `CompanyRequiredWrapper.jsx`: Wrapper para estado vacío
  - `CompanyModal.jsx`: Modal crear/editar empresa
- **Módulos actualizados**:
  - **Finanzas**: Ya tenía company_id, se integró con CompanyContext
  - **Contactos**: Agregado company_id obligatorio, selector de empresa en header
  - **Tableros**: Agregado company_id obligatorio, selector de empresa en header
- **Backend actualizado**:
  - Endpoints de contactos ahora filtran por `company_id`
  - Endpoints de tableros ahora filtran por `company_id`
  - Endpoint de búsqueda de contactos (`/contacts/search`) filtra por empresa
  - Endpoint de migración (`/migration/create-default-company`)
- **Regla base**: Los datos NO se mezclan entre empresas

### 2026-01-19: FEATURE — Módulo de Finanzas con Soporte Multi-Empresa ✅ COMPLETADO
- **Estado**: Módulo de Finanzas ahora requiere y soporta múltiples empresas
- **Funcionalidades de Empresas implementadas**:
  - CRUD completo de empresas (crear, listar, actualizar, eliminar)
  - Cada empresa tiene datos financieros 100% independientes
  - Selector de empresa visible en el header del módulo
  - Estado vacío cuando no hay empresas con CTA para crear primera empresa
  - Modal de creación de empresa con campos: nombre, RUC/NIF, moneda, dirección, teléfono, email
  - Soporte multi-moneda (PEN, USD, EUR, MXN, COP)
  - Al eliminar empresa se eliminan todos sus datos financieros
- **Funcionalidades financieras existentes**:
  - Dashboard financiero con cards de resumen (Ingresos, Gastos, Inversiones, Resultado neto)
  - Cards secundarias: Por Cobrar, Por Pagar, Caja Estimada
  - Indicador de salud financiera (Saludable/Atención/Crítico)
  - Selector de período (mes/año)
  - Pestañas: Resumen, Ingresos, Gastos, Inversiones, Por Cobrar, Por Pagar
  - Tablas CRUD para ingresos, gastos e inversiones
  - **Campo Cliente/Proveedor con Autocomplete Inteligente** integrado con Contactos
- **Backend modificado**:
  - Nuevo endpoint: `GET/POST/PUT/DELETE /api/finanzas/companies`
  - Todos los endpoints de finanzas ahora requieren `company_id`
  - Helper `verify_company_access` para validar permisos
  - Nuevos modelos Pydantic: `CompanyCreate`, `CompanyUpdate`, `CompanyResponse`
- **Frontend modificado**:
  - Estado para empresas y empresa seleccionada
  - UI de estado vacío cuando no hay empresas
  - Selector dropdown de empresa en el header
  - Botón "+" para agregar más empresas
  - Modal `CompanyModal` para crear empresas
- **Testing**: Backend y frontend verificado manualmente
  - Botón "Finanzas" agregado al DockSidebar (desktop) con ícono DollarSign
  - Botón "Finanzas" agregado al MobileNavigation (mobile) con ícono DollarSign
  - Handler `handleOpenFinanzas` en MindMapApp.jsx
  - Case 'finanzas' en renderMainContent
- **Testing**: 100% backend (22/22 tests), 100% frontend verificado
- **Archivos modificados**:
  - `/app/frontend/src/components/finanzas/FinanzasModule.jsx` - Componente principal
  - `/app/frontend/src/components/finanzas/ContactAutocomplete.jsx` - Componente de búsqueda de contactos (NUEVO)
  - `/app/frontend/src/components/mindmap/DockSidebar.jsx` - Agregado item Finanzas
  - `/app/frontend/src/components/mindmap/MobileNavigation.jsx` - Agregado item Finanzas
  - `/app/frontend/src/components/mindmap/MindMapApp.jsx` - Integración del módulo
  - `/app/backend/server.py` - Endpoint `/api/contacts/search` para autocomplete
- **Test files**: `/app/tests/test_finanzas_module.py` (22 tests)

### 2026-01-17: VERIFICACIÓN E2E — Scheduler de Recordatorios WhatsApp con Twilio ✅ FUNCIONANDO
- **Estado**: El sistema de recordatorios de WhatsApp está **100% funcional**
- **Verificación realizada**:
  - Se crearon recordatorios de prueba con `channel: 'whatsapp'` y `status: 'pending'`
  - El scheduler procesó correctamente los recordatorios (ciclo cada 30 segundos)
  - Los mensajes se enviaron exitosamente via Twilio WhatsApp API
  - El estado de los recordatorios se actualizó a `sent` con el `sid` de Twilio
- **Mensajes enviados (Twilio SIDs)**:
  - `SMf201f9f22d026e0666651750ecc4f2d8`
  - `SMba265c1c8961cd339ec4d8491874e065`
  - `SMf1bdd7f83a88e564ae26ac2ed75f0c53`
- **Mejoras aplicadas**:
  - Logging detallado agregado al scheduler para facilitar monitoreo
  - Logs incluyen: inicio del scheduler, recordatorios encontrados, procesamiento, envío y resultado
- **Configuración requerida (ya presente en backend/.env)**:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
  - `TWILIO_WHATSAPP_NUMBER`
- **Nota para usuarios**: 
  - El usuario debe tener su número de WhatsApp configurado en su perfil (`user_profiles.whatsapp`)
  - Para recibir mensajes del sandbox de Twilio, el usuario debe unirse enviando "join <código>" al número del sandbox
- **Archivos modificados**:
  - `/app/backend/server.py` - Logging mejorado en `check_and_send_reminders()`

### 2026-01-16: BUG FIX — Toolbar Móvil Context-Aware (Ocultar con Overlays) ✅ CORREGIDO
- **Problema**: En móvil, el toolbar flotante se superponía a:
  - Drawer de navegación (hamburger menu)
  - Modal de selección de plantillas
  - Panel de "Mis Proyectos"
  - Modal de todos los proyectos
- **Causa raíz**: El toolbar no consideraba el estado de los overlays UI y mantenía un z-index alto fijo
- **Fix aplicado**:
  - Nuevo estado `isMobileNavDrawerOpen` en MindMapApp para rastrear drawer de navegación
  - Callback `onDrawerStateChange` en MobileNavigation para notificar cambios
  - Prop `isMobileOverlayOpen` que combina estados:
    - `isMobileNavDrawerOpen` (drawer de navegación)
    - `showMobileProjectsDrawer` (drawer de proyectos)
    - `showAllProjectsModal` (modal de todos los proyectos)
    - `showTemplateModal` (modal de plantillas)
    - `showLayoutSelector` (selector de layout)
  - En CanvasModePanel: cuando `isMobile && isMobileOverlayOpen`:
    - `opacity: 0` (invisible)
    - `pointer-events: none` (no bloquea clicks)
    - `transform: translateX(-100%)` (se desliza fuera)
    - `tabIndex: -1` en botones (no recibe focus)
  - Transición suave con `transition-all duration-300 ease-in-out`
- **Comportamiento correcto**:
  - Toolbar VISIBLE cuando el canvas está activo sin overlays
  - Toolbar OCULTO automáticamente cuando cualquier overlay móvil está abierto
  - Toolbar REAPARECE suavemente cuando se cierra el overlay
- **Archivos modificados**:
  - `/app/frontend/src/components/mindmap/MobileNavigation.jsx` - Callback onDrawerStateChange
  - `/app/frontend/src/components/mindmap/MindMapApp.jsx` - Estado isMobileNavDrawerOpen y prop isMobileOverlayOpen
  - `/app/frontend/src/components/mindmap/Canvas.jsx` - Recibe y pasa isMobileOverlayOpen
  - `/app/frontend/src/components/mindmap/CanvasModePanel.jsx` - Lógica de ocultamiento en móvil
- **Testing**: Verificado con capturas de pantalla en móvil (390x844) ✅

### 2026-01-16: BUG FIX — Barra de Herramientas Alineada con Regla del Canvas ✅ CORREGIDO
- **Problema**: La barra de herramientas flotante (CanvasModePanel) se superponía parcialmente con el sidebar de proyectos y la regla vertical del lienzo
- **Causa raíz**: El componente usaba valores fijos de `left` sin considerar dinámicamente el ancho del sidebar ni la visibilidad de las reglas
- **Fix aplicado**:
  - Constantes de layout definidas:
    - `DOCK_SIDEBAR_WIDTH = 64px` (w-16)
    - `PROJECT_SIDEBAR_WIDTH = 288px` (w-72)
    - `RULER_WIDTH = 20px` (RULER_SIZE de CanvasRulers)
    - `TOOLBAR_MARGIN = 8px` (separación visual)
  - Hook `useEffect` para detectar viewport móvil vs desktop
  - Función `calculateDesktopLeft()` que calcula la posición exacta:
    - Base: DockSidebar (64px)
    - + Sidebar de proyectos si expandido (288px)
    - + Regla vertical si visible (20px)
    - + Margen de separación (8px)
  - Transición suave con `transition-all duration-300`
- **Posicionamiento final**:
  - Móvil: 16px (left-4)
  - Desktop sin sidebar: 64 + 20 + 8 = 92px (con reglas)
  - Desktop con sidebar: 64 + 288 + 20 + 8 = 380px (con reglas)
  - Se ajusta automáticamente si las reglas están ocultas (-20px)
- **Archivos modificados**:
  - `/app/frontend/src/components/mindmap/CanvasModePanel.jsx` - Reescrito con cálculo dinámico
- **Testing**: Verificado con capturas de pantalla en desktop (1920x800) ✅

### 2026-01-15: MEJORA UX — Modo Conexión Persistente ✅ COMPLETADO
- **Funcionalidad**: El modo conexión ahora permanece activo después de crear una conexión
- **Beneficio**: Permite conectar múltiples hijos al mismo padre sin reactivar el modo cada vez
- **Comportamiento**:
  - Seleccionar nodo padre → Click botón púrpura → Click en nodo hijo 1 → Click en nodo hijo 2 → ... → ESC para salir
  - El banner indica "Modo conexión activo - Haz clic en nodos para conectar"
  - Presionar ESC o hacer clic en canvas vacío para salir del modo
- **Archivos modificados**:
  - `/app/frontend/src/components/mindmap/Canvas.jsx` - completeConnection() ya no cancela el modo

### 2026-01-16: BUG FIX — Botón Candado Móvil Desaparecía al Desplazar Canvas ✅ CORREGIDO
- **Problema**: En móvil, el botón de candado (lock/unlock) desaparecía cuando el canvas se desplazaba hacia la derecha
- **Causa raíz**: El botón usaba `position: absolute` (relativo al canvas) en lugar de `position: fixed` (relativo al viewport)
- **Fix aplicado en NavigationModeButton.jsx**:
  - Cambió `absolute` → `fixed` para el botón principal
  - Cambió `z-[100]` → `z-[9999]` para asegurar visibilidad sobre todo
  - También corregido el feedback visual flotante
- **Comportamiento correcto ahora**:
  - El candado está **100% fijo al viewport**
  - Nunca desaparece sin importar el desplazamiento del canvas
  - Siempre accesible para alternar entre navegación y edición
- **Testing**: Verificado en viewport móvil (390x844)
- **Archivos modificados**:
  - `/app/frontend/src/components/mindmap/NavigationModeButton.jsx`

### 2026-01-15: BUG FIX — Conexiones Manuales Múltiples (COMPLETO) ✅ CORREGIDO
- **Problema original**: Al crear conexiones manuales desde un nodo origen, las conexiones anteriores se eliminaban
- **Problema adicional encontrado**: Los callbacks de React tenían "stale closures" que impedían múltiples conexiones consecutivas
- **Fixes aplicados**:
  1. **Canvas.jsx línea ~554**: Invertir parámetros en `completeConnection()` - El destino es HIJO, origen es PADRE
  2. **Canvas.jsx línea ~112**: Agregar `connectionModeRef` (useRef) para evitar stale closures
  3. **Canvas.jsx línea ~746**: Deshabilitar drag durante modo conexión (`if (connectionMode.isActive) return`)
  4. **Canvas.jsx**: `completeConnection` y `handleNodeSelect` ahora usan `connectionModeRef.current` en lugar del estado directo
- **Comportamiento correcto verificado**:
  - Un nodo padre puede tener **múltiples hijos** conectados simultáneamente
  - Las conexiones **coexisten** sin sobrescribirse
  - El modo conexión permanece activo para permitir múltiples conexiones
  - ESC o click en canvas vacío para salir del modo
- **Testing**: Verificado con 3 conexiones consecutivas desde el mismo nodo padre - `/app/test_reports/` logs confirman 3 conexiones exitosas
- **Archivos modificados**:
  - `/app/frontend/src/components/mindmap/Canvas.jsx`

### 2026-01-15: FEATURE — Efecto "Snap" Visual para Conexión de Nodos ✅ COMPLETADO
- **Funcionalidad**: Feedback visual cuando el cursor se acerca a un nodo válido durante el modo conexión manual
- **Implementación**:
  - **Detección de snap**: Se activa cuando el cursor está dentro de 60px del centro de un nodo, o dentro de su bounding box (+20px de margen)
  - **Estado en Canvas.jsx**: `connectionMode.snapTargetId` y `connectionMode.snapAnchor` para tracking
  - **Cálculo inteligente de anchor**: Usa `getSmartAnchorPoints()` para determinar el mejor punto de conexión
- **Efectos visuales en el nodo objetivo (NodeItem.jsx)**:
  - **Borde verde brillante**: `outline: 3px solid #22c55e`
  - **Efecto de resplandor (glow)**: `box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.8), 0 0 20px 5px rgba(34, 197, 94, 0.4)`
  - **Animación de pulso**: `animation: pulse-snap 0.8s ease-in-out infinite` (definido en index.css)
  - **Escala sutil**: `transform: scale(1.02)` con transición suave
- **Cambio en línea de preview**:
  - **Sin snap**: Línea púrpura punteada (`#8b5cf6`, `strokeDasharray: "8,4"`)
  - **Con snap activo**: Línea verde sólida (`#22c55e`, sin dash), usando `generateSmartPath()` para curva más limpia
- **UX mejorada**: El usuario sabe exactamente cuándo puede soltar para crear la conexión
- **Testing**: 100% verificado (6/6 features) - `/app/test_reports/iteration_33.json`
- **Archivos modificados**:
  - `/app/frontend/src/components/mindmap/Canvas.jsx` - handleMouseMove, preview SVG, prop isSnapTarget
  - `/app/frontend/src/components/mindmap/NodeItem.jsx` - isSnapTarget prop y estilos visuales
  - `/app/frontend/src/index.css` - @keyframes pulse-snap

### 2026-01-15: FEATURE — Sistema de Anclaje Inteligente para Conectores ✅ COMPLETADO
- **Sistema de anchor points inteligente** (`/app/frontend/src/utils/curve.js`):
  - 4 puntos de anclaje por nodo: derecha, izquierda, arriba, abajo
  - `getSmartAnchorPoints()`: Selecciona automáticamente los mejores anchors entre dos nodos
  - `getSmartAnchorToPosition()`: Selecciona el mejor anchor hacia una posición arbitraria (para preview)
  - Validación de distancia mínima y preferencia por conexiones opuestas (left-right, top-bottom)
- **Generación de paths mejorada**:
  - `generateSmartPath()`: Curvas Bezier con control points proporcionales a la distancia
  - `generatePreviewPath()`: Paths suaves para la línea de preview
  - Offset máximo limitado (20-100px) para evitar curvas exageradas
- **Preview inteligente durante modo conexión**:
  - El anchor cambia dinámicamente según la posición del cursor
  - Curva suave con efecto glow púrpura
  - Transición fluida al mover el cursor
- **Conexiones existentes mejoradas**:
  - Los conectores entre nodos usan el sistema inteligente
  - Líneas más cortas y lógicas
  - Recálculo automático al mover nodos
- **Archivos modificados**:
  - `/app/frontend/src/utils/curve.js` - Sistema completo de anclaje
  - `/app/frontend/src/components/mindmap/ConnectionsLayer.jsx` - Uso de smart anchors
  - `/app/frontend/src/components/mindmap/Canvas.jsx` - Preview inteligente

### 2026-01-15: FEATURE — Sistema Avanzado de Gestión de Conectores ✅ COMPLETADO
- **Eliminación visual de conectores (Desconectar nodos)**:
  - Al pasar el mouse sobre una línea de conexión, aparece botón de desconexión (🔗)
  - El botón cambia de gris a rojo en hover
  - Al hacer clic, solo elimina la conexión (parentId), no los nodos
  - Zona de hover invisible más ancha (20px) para facilitar la interacción
  - Línea se resalta en rojo durante hover
- **Modo de conexión manual (crear conectores)**:
  - Nuevo botón púrpura 🔗 debajo del botón "+" azul
  - Al hacer clic, activa el "modo conexión":
    - Indicador visual en la parte superior: "Haz clic en un nodo para conectar"
    - Línea de preview punteada púrpura siguiendo el cursor
    - ESC o clic en canvas vacío cancela el modo
  - Al hacer clic en un nodo destino, se crea la conexión padre-hijo
- **Funciones en useNodes.js**:
  - `disconnectNode(nodeId)`: Elimina parentId sin borrar el nodo
  - `connectNodes(childNodeId, parentNodeId)`: Crea conexión con validación anti-ciclos
- **Validaciones implementadas**:
  - No se puede conectar un nodo a sí mismo
  - Se detectan ciclos (un nodo no puede conectarse a sus descendientes)
- **Archivos modificados**:
  - `/app/frontend/src/hooks/useNodes.js` - funciones disconnectNode, connectNodes
  - `/app/frontend/src/components/mindmap/ConnectionsLayer.jsx` - botón de desconexión en hover
  - `/app/frontend/src/components/mindmap/Canvas.jsx` - modo conexión, botón púrpura, línea preview
  - `/app/frontend/src/components/mindmap/MindMapApp.jsx` - props para nuevas funciones

### 2026-01-15: FEATURE — Duplicar Mapas (Mejorado) ✅ COMPLETADO
- **Funcionalidad completa**: Opción "Duplicar" en el menú de opciones con flujo UX mejorado
- **Modal de duplicación** (`DuplicateProjectModal.jsx`):
  - Título descriptivo: "Duplicar mapa"
  - Subtítulo: "Crear una copia de 'Nombre Original'"
  - Campo editable pre-llenado con nombre sugerido ("Nombre - copia X")
  - **Validación en tiempo real**:
    - Check verde ✓ cuando el nombre es válido
    - Alerta roja ⚠ cuando el nombre ya existe
    - Botón "Crear copia" deshabilitado si nombre inválido
  - Contador de caracteres (máximo 50)
  - Spinner de carga mientras se crea
- **Comportamiento**:
  - El usuario puede personalizar el nombre antes de crear la copia
  - Copia todos los nodos, conexiones y estilos con nuevos IDs
  - Después de crear: navega automáticamente al nuevo mapa
  - Toast de éxito: "Mapa duplicado. Se creó 'Nombre'"
  - El mapa duplicado aparece primero en la lista (ordenado por fecha)
- **Nombres únicos automáticos**:
  - Sugerencia: "Nombre - copia", "Nombre - copia 2", etc.
  - Validación case-insensitive
- **Testing**: 100% verificado visualmente
- **Archivos modificados/creados**:
  - `/app/frontend/src/components/mindmap/DuplicateProjectModal.jsx` (nuevo)
  - `/app/frontend/src/hooks/useNodes.js` - `duplicateProject` ahora acepta `customName`
  - `/app/frontend/src/components/mindmap/MindMapApp.jsx` - nuevo flujo con modal
  - `/app/frontend/src/components/mindmap/ToastProvider.jsx` - auto-dismiss de 4s

### 2026-01-15: BUG FIX — Separación de Conflicto de Nombre vs Límite de Plan ✅ COMPLETADO
- **Bug reportado**: Al crear un mapa con nombre duplicado, el sistema mostraba incorrectamente el popup de "Necesitas más espacio" (upgrade de plan) en lugar de un modal para resolver el conflicto de nombre
- **Causa raíz**: El frontend no distinguía entre error 409 (nombre duplicado) y error 403 (límite de plan excedido)
- **Solución implementada**:
  - **Backend** ya retornaba correctamente:
    - HTTP 409 para nombres duplicados (con `existing_project_id`, `existing_project_name`, `message`, `suggestion`)
    - HTTP 403 para límite de mapas excedido
  - **Frontend modificado**:
    - `useNodes.js` → `saveProjectToServer` detecta 409 y extrae info del conflicto
    - `useNodes.js` → `createBlankMap` y `loadFromTemplate` distinguen `isNameConflict` vs `isPlanLimit`
    - `MindMapApp.jsx` → `handleConfirmProjectName` muestra `NameConflictModal` para 409, `UpgradeModal` para 403
    - **Nuevo componente**: `NameConflictModal.jsx` con opciones de Reemplazar, Cambiar nombre, Cancelar
- **Comportamiento correcto**:
  - Si nombre duplicado → Modal de conflicto (no consume cupo, no paywall)
  - Si límite de plan excedido → Modal de upgrade (paywall)
  - Planes ilimitados (`max_active_maps = -1`) nunca ven el modal de upgrade
- **Testing**: 100% backend (14/14 tests), archivo: `/app/tests/test_project_name_conflict.py`
- **Archivos modificados**: 
  - `/app/frontend/src/hooks/useNodes.js`
  - `/app/frontend/src/components/mindmap/MindMapApp.jsx`
  - `/app/frontend/src/components/mindmap/NameConflictModal.jsx` (nuevo)

### 2026-01-14: FEATURE — Dashboard de Analytics ✅ COMPLETADO
- **Endpoint**: `GET /api/admin/analytics`
- **Métricas Overview**: total_users, total_projects, total_contacts, total_boards
- **Métricas de Crecimiento**: users_today, users_this_week, users_this_month, growth_rate_weekly, growth_rate_monthly
- **Gráficos**:
  - Crecimiento de usuarios (últimos 30 días) - Area + Bar Chart
  - Distribución de planes - Pie Chart
  - Actividad diaria (14 días) - Bar Chart
  - Retención por cohortes (4 semanas) - Progress Bars
- **Frontend**: `/app/frontend/src/components/admin/AnalyticsDashboard.jsx` usando recharts
- **Testing**: 97% backend (30/31), 100% frontend

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

### P1 - Finanzas Module (Phase 3 & 4)
- Implementar secciones "Por Cobrar" y "Por Pagar" con flujos mejorados
- Implementar roles "Empresario" y "Administrativo" con permisos diferenciados

### P1 - Verificar feature "Proyecto Vinculado"
- Usar testing agent para verificar el flujo end-to-end de nodos tipo "Proyecto"

### P1 - Account Blocking after 7 Days
- Backend logic para bloquear cuentas no verificadas

### P1 - Export Reports
- Añadir exportación PDF/CSV para contactos

## Future/Backlog Tasks

### P2 - Finanzas Module (IA)
- Análisis financiero con IA para proyecciones y recomendaciones

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
│   ├── server.py           # Main backend with all endpoints
│   └── finanzas_service.py # Finanzas module service (models, helpers)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── admin/
│       │   │   ├── AdminPanel.jsx      # Main admin container
│       │   │   └── UsersManagement.jsx # Advanced user management
│       │   ├── finanzas/
│       │   │   └── FinanzasModule.jsx  # Financial management module
│       │   ├── mindmap/
│       │   │   ├── Canvas.jsx
│       │   │   ├── DockSidebar.jsx     # Desktop navigation (includes Finanzas)
│       │   │   ├── MobileNavigation.jsx # Mobile navigation (includes Finanzas)
│       │   │   ├── MindMapApp.jsx      # Main app (handles Finanzas view)
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
