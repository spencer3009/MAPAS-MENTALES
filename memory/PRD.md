# MindoraMap - Product Requirements Document

## Changelog (Latest First)

### 2026-01-09: PWA Install Button - CTA Visible ✅
- **Added**: Sistema completo de instalación PWA con CTA visible
- **Added**: Hook centralizado `/app/frontend/src/hooks/usePWAInstall.js`:
  - Captura `beforeinstallprompt` para Android/Chrome
  - Detecta iOS Safari para mostrar instrucciones manuales
  - Detecta si la app ya está instalada (standalone mode)
  - Gestión de descarte del banner (7 días localStorage)
- **Added**: Botón visible "Instalar Mindora" en Landing Page hero:
  - Color verde/turquesa para destacar
  - data-testid: `landing-install-button`
  - Solo visible en móvil cuando es instalable
- **Added**: Banner flotante de instalación mejorado:
  - Aparece 3s después de cargar
  - Incluye botón "Instalar" y "X" para cerrar
  - data-testid: `pwa-install-banner`, `pwa-install-button`, `pwa-dismiss-button`
- **Added**: Item "Instalar Mindora" en menú hamburguesa:
  - Ubicado dentro del sistema para usuarios logueados
  - data-testid: `mobile-nav-install-button`
  - Con icono y subtexto descriptivo
- **Added**: Modal de instrucciones iOS:
  - Detecta iOS/Safari automáticamente
  - Instrucciones paso a paso con iconos
  - data-testid: `ios-install-modal`
- **Comportamiento**:
  - Android/Chrome: Ejecuta `deferredPrompt.prompt()` directamente
  - iOS/Safari: Muestra modal con instrucciones manuales
  - Si ya instalada: No muestra ningún CTA
  - Si descartado: No muestra por 7 días
- **Files Created**:
  - `/app/frontend/src/hooks/usePWAInstall.js`
- **Files Modified**:
  - `/app/frontend/src/components/pwa/InstallPWABanner.jsx` - Completamente reescrito
  - `/app/frontend/src/components/landing/LandingPage.jsx` - Botón en hero + modal
  - `/app/frontend/src/components/mindmap/MobileNavigation.jsx` - Item en menú + modal
- **Testing**: 100% - iteration_20.json - Todos los componentes verificados

### 2026-01-09: Corrección Botón "+" Móvil + Conversión PWA ✅
- **Fixed (P0 Critical)**: El botón "+" para agregar nodos hijos no funcionaba en móvil
  - **Causa**: Los botones solo tenían handlers de mouse (`onClick`, `onMouseDown`) sin touch handlers
  - **Solución**: Agregados handlers `onPointerDown` (con `pointerType === 'touch'`) y `onTouchEnd` a todos los botones "+"
  - **Botones corregidos**:
    - Botón principal (MindFlow, MindTree, MindOrbit, MindAxis hijos) - líneas 853-893
    - Botones MindHybrid (horizontal e inferior) - líneas 896-984
    - Botones MindAxis (izquierda y derecha para nodo central) - líneas 987-1063
  - **CSS agregado**: `touch-manipulation`, `select-none`, `WebkitTapHighlightColor: transparent`
  - **Tamaño móvil**: Botones más grandes en móvil (`w-10 h-10`) vs desktop (`md:w-8 md:h-8`)
- **Files Modified**: `/app/frontend/src/components/mindmap/Canvas.jsx`
- **Testing**: 100% - Touch handlers verificados funcionando con viewport móvil 390x844

### 2026-01-09: PWA (Progressive Web App) Implementation ✅
- **Added**: Conversión completa a PWA para instalación en dispositivos móviles
- **Added**: `/app/frontend/public/manifest.json` con configuración completa:
  - `name`: "Mindora - Mapas Mentales"
  - `short_name`: "Mindora"
  - `display`: "standalone"
  - `theme_color`: "#3b82f6"
  - `background_color`: "#f8fafc"
  - Iconos: 16x16, 32x32, 180x180, 192x192, 512x512
- **Added**: `/app/frontend/public/service-worker.js`:
  - Estrategia Network First para contenido dinámico
  - Caché de assets estáticos
  - Soporte offline básico (fallback a index.html para SPA)
  - Preparado para notificaciones push (futuro)
- **Added**: Registro del Service Worker en `/app/frontend/src/index.js`
  - Verificación automática de actualizaciones cada hora
- **Added**: Link al manifest en `/app/frontend/public/index.html`
- **Added**: Icono PWA 512x512 generado (`icon-512.png`)
- **Added**: `/app/frontend/src/components/pwa/InstallPWABanner.jsx`:
  - Banner flotante de instalación para dispositivos móviles
  - Aparece 3 segundos después de cargar la página
  - Detecta iOS y muestra instrucciones específicas para Safari
  - Almacena preferencia de descarte en localStorage (7 días)
  - No aparece si la app ya está instalada como PWA
- **Files Created**:
  - `/app/frontend/public/manifest.json`
  - `/app/frontend/public/service-worker.js`
  - `/app/frontend/public/icon-512.png`
  - `/app/frontend/src/components/pwa/InstallPWABanner.jsx`
- **Files Modified**:
  - `/app/frontend/public/index.html` - Link al manifest
  - `/app/frontend/src/index.js` - Registro del Service Worker
  - `/app/frontend/src/components/landing/LandingPage.jsx` - Integración InstallPWABanner
- **Testing**: 100% - Manifest, Service Worker y componentes verificados funcionando

### 2026-01-06: Emails Automáticos de Recordatorio de Verificación ✅
- **Added**: Sistema de recordatorios automáticos para usuarios no verificados:
  - 📧 24h después: "¿Olvidaste verificar tu cuenta?" (tono amigable)
  - 📧 72h después: "Tu cuenta sigue sin activarse" (urgencia media)
  - 📧 7 días después: "Última oportunidad" (urgencia alta, último aviso)
- **Added**: Scheduler usando APScheduler que corre cada hora
- **Added**: Campos de tracking en MongoDB: `reminder_24h_sent`, `reminder_72h_sent`, `reminder_7d_sent`, `reminder_*_sent_at`
- **Added**: Endpoint admin `POST /api/admin/run-verification-reminders` para ejecutar manualmente
- **Added**: Endpoint admin `GET /api/admin/unverified-users` para monitorear usuarios no verificados
- **Added**: 3 plantillas de email con diseño profesional y branding Mindora
- **Rules Implemented**:
  - ✅ NO envía si el usuario ya verificó
  - ✅ NO duplica envíos (tracking por campo)
  - ✅ NO envía a usuarios de Google OAuth
  - ✅ Regenera token si expiró
  - ✅ Registra logs detallados
- **Files Created**:
  - `/app/backend/reminder_service.py` - Plantillas de email y funciones de envío
  - `/app/backend/reminder_scheduler.py` - Lógica del scheduler
- **Files Modified**:
  - `/app/backend/server.py` - Integración del scheduler y endpoints admin
- **Testing**: Backend 100% (10/10 tests passed)

### 2026-01-06: Sistema de Verificación Obligatoria de Email ✅
- **Added**: Banner permanente para usuarios no verificados con diseño amber/orange
- **Added**: Botón "Reenviar verificación" con cooldown de 5 minutos entre reenvíos
- **Added**: Botón "Cambiar correo" con formulario inline para actualizar email
- **Added**: Modal de restricción "Verificación requerida" al intentar crear/editar
- **Added**: Rate limiting en reenvío: máximo 1 cada 5 min, máximo 5 por día (HTTP 429)
- **Added**: Hook `useVerificationCheck` para verificar estado en componentes
- **Added**: Restricciones para usuarios no verificados:
  - 🚫 No puede crear/editar mapas mentales
  - 🚫 No puede crear/editar contactos
  - 🚫 No puede crear tableros
  - ✅ Puede navegar y ver la interfaz
- **Added**: Campos en MongoDB: `last_verification_sent`, `verification_count_today`, `verification_count_date`
- **Note**: Usuarios de Google OAuth siempre están verificados automáticamente
- **Files Created**:
  - `/app/frontend/src/components/auth/VerificationRequiredModal.jsx`
  - `/app/frontend/src/hooks/useVerificationCheck.js`
- **Files Modified**:
  - `/app/backend/server.py` - Rate limiting en endpoint resend-verification
  - `/app/frontend/src/components/auth/EmailVerificationBanner.jsx` - Rediseño completo
  - `/app/frontend/src/components/mindmap/MindMapApp.jsx` - Integración de verificación
  - `/app/frontend/src/components/contacts/ContactsPage.jsx` - Integración de verificación
- **Testing**: Backend 100% (9/9 tests), Frontend 100% (7/7 features)

### 2026-01-06: Mejora de Branding en Emails de Mindora ✅
- **Changed**: Remitente visible ahora es "Mindora" (antes mostraba texto de Resend)
- **Added**: Logo de Mindora centrado en cabecera de todos los emails
- **Changed**: Nombre de plataforma "MindoraMap" → "Mindora" en todos los textos
- **Changed**: Asuntos de email actualizados con branding Mindora
- **Changed**: Pie de página: "© 2025 Mindora"
- **Files Modified**: `/app/backend/email_service.py`

### 2026-01-06: Renombrado "Etiquetas" → "Estado" en Módulo de Contactos ✅
- **Changed**: Toda la terminología "Etiquetas" renombrada a "Estado" en el módulo de Contactos
- **Changed**: Botón de la barra de herramientas ahora dice "Estado" con icono CircleDot
- **Added**: Tooltip descriptivo al botón "Estado": "Gestiona los estados del proceso comercial para clasificar y dar seguimiento a tus contactos"
- **Changed**: Modal "Administrar etiquetas" → "Administrar estados"
- **Changed**: Sección "Estados existentes" y "Crear nuevo estado"
- **Changed**: Dashboard Reportes: "Distribución por etiquetas" → "Distribución por estados"
- **Changed**: Dashboard Reportes: "Top 5 etiquetas más usadas" → "Top 5 estados más usados"
- **Changed**: Quick Stats: "Etiquetas creadas" → "Estados creados"
- **Changed**: Vista de contacto: Sección "Etiquetas" → "Estado"
- **Changed**: Mensaje vacío: "Sin etiquetas asignadas" → "Sin estado asignado"
- **Changed**: Mensajes de error actualizados ("Error al crear estado", etc.)
- **Changed**: Icono cambiado de `Tag` a `CircleDot` para la funcionalidad de Estado
- **Tech**: Agregado componente Tooltip de shadcn/ui, renombrado Tooltip de recharts a RechartsTooltip
- **Note**: Backend API sigue usando `/api/contacts/labels` - solo fue cambio de UI
- **Files Modified**: `/app/frontend/src/components/contacts/ContactsPage.jsx`
- **Testing**: Frontend 100% verified (7/7 features)

### 2026-01-06: Selector de País para WhatsApp en Contactos ✅
- **Added**: Selector de país con bandera emoji + código internacional en campo WhatsApp
- **Added**: Lista de 28 países (Latinoamérica, España, USA, Canadá, Europa)
- **Added**: País por defecto se obtiene de la Configuración General del usuario
- **Added**: Campo de búsqueda en el dropdown para encontrar países rápidamente
- **Added**: Vista previa del formato: "Se guardará como: +51 987 654 321"
- **Added**: Al editar contacto, se detecta automáticamente el país del número existente
- **Logic**: Número se guarda en formato internacional normalizado (ej: +51 987 654 321)
- **UX**: Dropdown con z-index alto para evitar problemas de capas
- **Files Modified**: `/app/frontend/src/components/contacts/ContactsPage.jsx`

### 2026-01-05: Módulo de Reportes Estadísticos para Contactos ✅
- **Added**: Dashboard de reportes con diseño dark mode elegante (slate-900 gradient)
- **Added**: Gráfico 1 "Contactos creados en el tiempo" - AreaChart con agrupación por día/semana/mes/año
- **Added**: Gráfico 2 "Distribución por etiquetas" - Donut/PieChart con porcentajes y leyenda
- **Added**: Gráfico 3 "Contactos por tipo" - BarChart horizontal (Clientes/Prospectos/Proveedores)
- **Added**: Gráfico 4 "Top 5 etiquetas más usadas" - Barras horizontales con ranking
- **Added**: Quick Stats - 4 tarjetas (Contactos mostrados, Total tipo, Etiquetas creadas, Total general)
- **Added**: Actualización en tiempo real de gráficos al aplicar filtros (fecha, etiquetas)
- **Added**: Mensajes de estado vacío cuando no hay datos
- **Added**: Tooltips con estilo dark theme en todos los gráficos
- **Tech**: Usando recharts library (AreaChart, PieChart, BarChart)
- **Tech**: useMemo para cálculo eficiente de datos de gráficos
- **Files Modified**: `/app/frontend/src/components/contacts/ContactsPage.jsx`
- **Dependencies Added**: `recharts@3.6.0`
- **Testing**: Frontend 100% verified (13/13 features)

### 2026-01-05: Sistema Avanzado de Filtros por Fecha ✅
- **Added**: Selector "Tipo de muestra" con 4 modos: Día, Semana, Mes, Año
- **Added**: Modo DÍA: Date pickers "Desde" y "Hasta" con calendario interactivo
- **Added**: Modo SEMANA: Selector semanal con número de semana, navegación por meses
- **Added**: Modo MES: Dropdowns de mes+año para rangos mensuales
- **Added**: Modo AÑO: Grid de años (2022-2030) con multi-selección
- **Added**: Botón "Fecha" en barra de acciones que muestra el filtro activo
- **Added**: Botón X en "Fecha" para limpiar filtro rápidamente
- **Added**: Integración con sistema de filtros existente (etiquetas, columnas)
- **Logic**: Filtrado por campo `created_at` de los contactos
- **UX**: Dropdown con React Portal para evitar problemas de z-index
- **i18n**: Calendario en español usando locale `es` de date-fns
- **Files Modified**: `/app/frontend/src/components/contacts/ContactsPage.jsx`
- **Testing**: Frontend 100% verified (14/14 features)

### 2026-01-05: Fix Dropdown Filtros - Portal para evitar recorte (z-index/overflow) ✅
- **Fixed**: Dropdown de filtros era cortado/recortado por contenedores con `overflow: hidden/auto`
- **Solution**: Implementado React Portal (`createPortal`) para renderizar dropdown en `document.body`
- **Added**: Cálculo dinámico de posición del dropdown basado en coordenadas del botón
- **Added**: Protección contra overflow horizontal (ajuste automático si sale del viewport)
- **Added**: Diseño mejorado del dropdown: bordes redondeados, sombra más pronunciada, header con gradiente
- **Added**: Footer en dropdown mostrando cantidad de opciones seleccionadas
- **Result**: El dropdown ahora se muestra completamente visible, encima de todos los elementos
- **Files Modified**: `/app/frontend/src/components/contacts/ContactsPage.jsx`

### 2026-01-05: Sistema de Filtros Inteligente para Contactos ✅
- **Added**: Filtrado automático para columnas de tipo `select`, `multiselect` y `labels`
- **Added**: Icono chevron (flecha) en headers de columnas filtrables
- **Added**: Dropdown desplegable con opciones de filtro al hacer clic
- **Added**: Selección única para campos `select`, múltiple para `multiselect` y `labels`
- **Added**: Lógica OR para filtros múltiples (muestra contactos con CUALQUIER valor seleccionado)
- **Added**: Indicador de filtros activos arriba de la tabla con conteo
- **Added**: Botón "Limpiar" en cada dropdown para quitar filtro individual
- **Added**: Botón "Limpiar todos" para quitar todos los filtros activos
- **Added**: Reset automático de filtros al cambiar de pestaña (Clientes/Prospectos/Proveedores)
- **Added**: Mensaje especial cuando no hay resultados por filtros activos
- **Logic**: La propiedad "filtrable" se determina automáticamente por tipo de campo, sin configuración manual
- **Files Modified**: `/app/frontend/src/components/contacts/ContactsPage.jsx`
- **Testing**: Frontend 100% verified (10/10 features)

### 2026-01-05: Sistema de Etiquetas (Tags) para Contactos ✅
- **Added**: Sistema completo de etiquetas para categorizar contactos
- **Added**: Modal "Administrar etiquetas" accesible desde botón en la barra de acciones
- **Added**: Crear etiquetas con nombre y color (10 colores predefinidos)
- **Added**: Editar y eliminar etiquetas existentes
- **Added**: Etiquetas independientes por tipo de contacto (Clientes, Prospectos, Proveedores)
- **Added**: Asignar múltiples etiquetas a contactos al crear o editar
- **Added**: Visualización de etiquetas como chips de colores en la tabla de contactos
- **Added**: Visualización de etiquetas en el modal de "Ver contacto"
- **Added**: Al eliminar una etiqueta, se remueve automáticamente de todos los contactos asociados
- **Files Modified**:
  - `/app/backend/contacts_service.py` - Añadido campo `labels` a modelos de contacto
  - `/app/backend/server.py` - Añadidos endpoints CRUD para etiquetas (líneas 4853-4984)
  - `/app/frontend/src/components/contacts/ContactsPage.jsx` - Modal de etiquetas, selector en formulario, render en tabla
- **API Endpoints**:
  - `GET /api/contacts/labels/{contact_type}` - Obtener etiquetas por tipo
  - `POST /api/contacts/labels/{contact_type}` - Crear etiqueta
  - `PUT /api/contacts/labels/{contact_type}/{label_id}` - Actualizar etiqueta
  - `DELETE /api/contacts/labels/{contact_type}/{label_id}` - Eliminar etiqueta
- **Testing**: Backend 19/19 tests passed (100%), Frontend UI 100% verified

### 2026-01-05: Personalización de Columnas en Contactos ✅
- **Added**: Botón "Personalizar columnas" en la barra de acciones del módulo Contactos
- **Added**: Modal de configuración de columnas con:
  - Lista de todas las columnas disponibles (predeterminadas + personalizadas)
  - Checkboxes para mostrar/ocultar cada columna
  - Drag & drop para reordenar columnas arrastrándolas
  - Iconos de visibilidad (ojo abierto/cerrado)
  - Columna "Nombre completo" protegida (obligatoria, no se puede ocultar)
  - Botón "Restaurar por defecto"
- **Added**: Persistencia de preferencias en localStorage por usuario y por pestaña
- **Files Modified**: `/app/frontend/src/components/contacts/ContactsPage.jsx`

### 2026-01-05: Módulo de Contactos (CRM Básico) ✅
- **Added**: Nuevo módulo de Contactos accesible desde el sidebar principal
- **Added**: Tres pestañas independientes: Clientes, Prospectos, Proveedores
- **Added**: Campos base obligatorios: Nombre*, Apellidos*, WhatsApp* y Email (opcional)
- **Added**: Sistema de campos personalizados por tipo de contacto:
  - Campo de texto (input simple)
  - Campo numérico (solo valores numéricos, con validación)
  - Campo de fecha (date-picker con calendario visual, formato YYYY-MM-DD)
  - Campo de hora (time-picker 12h AM/PM con accesos rápidos)
  - Área de texto (textarea multilínea)
  - Selector / combo (single select)
  - Selector múltiple (multi-select)
  - Cada campo configurable con: nombre, tipo, obligatorio/opcional, color opcional
- **Added**: Tabla de contactos con ordenamiento por fecha de creación (más reciente arriba)
- **Added**: Búsqueda en tiempo real por nombre, apellidos, whatsapp, email
- **Added**: CRUD completo de contactos con validación de campos obligatorios
- **Added**: Modal de configuración de campos personalizados por pestaña
- **Added**: UI mejorada del selector de tipos con iconos Lucide y descripciones
- **Added**: Validación en tiempo real para campos numéricos con mensaje de error
- **Added**: Compatibilidad hacia atrás: campos antiguos sin tipo se tratan como texto
- **Added**: Date picker con calendario en español (enero, febrero, etc.)
- **Added**: Time picker con formato 12h, botones AM/PM y accesos rápidos (9AM, 12PM, etc.)
- **Files Created**:
  - `/app/backend/contacts_service.py` - Modelos Pydantic para contactos y campos
  - `/app/frontend/src/components/contacts/ContactsPage.jsx` - Componente principal
- **Files Modified**:
  - `/app/backend/server.py` - Rutas API para contactos (líneas 4634-4850)
  - `/app/frontend/src/components/mindmap/DockSidebar.jsx` - Agregado enlace "Contactos"
  - `/app/frontend/src/components/mindmap/MindMapApp.jsx` - Renderiza ContactsPage
- **API Endpoints**:
  - `GET /api/contacts` - Listar contactos (filtro opcional por tipo)
  - `POST /api/contacts` - Crear contacto
  - `GET /api/contacts/{id}` - Obtener contacto específico
  - `PUT /api/contacts/{id}` - Actualizar contacto
  - `DELETE /api/contacts/{id}` - Eliminar contacto
  - `GET /api/contacts/config/fields/{type}` - Obtener campos personalizados
  - `POST /api/contacts/config/fields/{type}` - Crear campo personalizado
  - `DELETE /api/contacts/config/fields/{type}/{field_id}` - Eliminar campo
- **Testing**: Backend 23/23 tests passed (100%), Frontend UI 100% verified

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

### 2026-01-04: Reubicación de Registro de Tiempo al Sidebar ✅
- **Moved**: Módulo de Registro de Tiempo de la columna izquierda al sidebar (columna derecha)
- **Position**: Primer elemento visible después de "Añadir a la tarjeta"
- **Added**: Contador 00:00:00 siempre visible desde el inicio
- **Added**: Al presionar Play:
  - El tiempo comienza a contarse en tiempo real
  - Botón cambia de Play (▶) a Stop (⬛)
  - Se expanden automáticamente las estadísticas (gráfica semanal, tiempo por usuario)
  - Indicador pulsante rojo de "Activo"
- **Added**: Botón "Ocultar/Ver estadísticas" para controlar la vista expandida
- **Added**: Muestra "Tiempo total" acumulado
- **File Created**: `/app/frontend/src/components/boards/TimeTrackerSidebar.jsx`
- **UX**: El registro de tiempo ahora es función principal, no secundaria

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

### 5. Módulo de Contactos (CRM Básico) - **NUEVO ✅**
- Accesible desde el sidebar lateral izquierdo
- **Tres pestañas independientes:**
  - Clientes (gestión de clientes)
  - Prospectos (leads y potenciales)
  - Proveedores (contactos de supply chain)
- **Campos base:**
  - Nombre (obligatorio)
  - Apellidos (obligatorio)
  - WhatsApp (obligatorio)
  - Email (opcional)
- **Campos personalizados configurables:**
  - Campo de texto (input simple)
  - Selector / combo (single select con opciones)
  - Selector múltiple (multi-select)
  - Cada campo tiene: nombre, tipo, obligatorio/no, color opcional
- **Tabla de contactos:**
  - Ordenados por fecha de creación (más reciente arriba)
  - Columnas: Nombre completo, WhatsApp, Email, Fecha creación, Campos personalizados
  - Búsqueda en tiempo real
  - Acciones: Editar, Eliminar
- Modal de creación/edición con validación
- Configuración de campos personalizados por pestaña
- CRUD completo con persistencia en MongoDB

### 6. Otras Funcionalidades
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
│   ├── contacts_service.py # Modelos para Contactos (CRM)
│   ├── email_service.py   # Servicio de emails Resend
│   └── paypal_service.py  # Integración PayPal
└── frontend/
    └── src/
        ├── components/
        │   ├── boards/     # Módulo Tableros (MVP)
        │   │   ├── BoardsPage.jsx
        │   │   └── BoardView.jsx
        │   ├── contacts/   # Módulo Contactos (CRM)
        │   │   └── ContactsPage.jsx
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
- [x] **Módulo de Contactos (CRM Básico)** ✅ (Completado 2026-01-05)
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
