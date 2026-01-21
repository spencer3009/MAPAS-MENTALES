# MindoraMap - Product Requirements Document

## Original Problem Statement
Transformar MindoraMap en una herramienta profesional de gestión financiera con funcionalidades avanzadas de contabilidad gerencial para empresarios peruanos.

## User Personas
- **Empresarios PYME peruanos**: Necesitan claridad financiera para toma de decisiones
- **Contadores**: Requieren precisión en cálculos de IGV y determinación fiscal
- **Administradores**: Gestionan ingresos, gastos, cobros y pagos

## Core Requirements

### Módulo de Finanzas (Principal)
- ✅ Dashboard de Resumen con métricas clave
- ✅ Gestión de Ingresos (CRUD completo)
- ✅ Gestión de Gastos (CRUD completo)
- ✅ Sistema de Cuentas por Cobrar con pagos parciales
- ✅ Sistema de Cuentas por Pagar (básico)
- ✅ Catálogo de Productos/Servicios
- ✅ Determinación del IGV (18%) - Ventas vs Gastos
- ✅ Visualización de Subtotal e IGV en tablas

### Integraciones
- ⏸️ Twilio WhatsApp (BLOQUEADO - pendiente aprobación de template)

## What's Been Implemented

### Session: January 21, 2026

#### Mejoras de Visualización del IGV
1. **Tabla de Ingresos**: Añadidas columnas Subtotal e IGV
2. **Tabla de Gastos**: Añadidas columnas Subtotal e IGV (condicional)
3. **Dashboard de Resumen**: Nueva sección "Determinación del IGV" con:
   - IGV Ventas (Débito fiscal)
   - IGV Gastos (Crédito fiscal)
   - Base Gastos c/IGV
   - IGV a Pagar/Favor
   - Fórmula explicativa

### Previous Sessions (Summarized)
- Sistema de Determinación de IGV completo
- Módulo de Productos/Servicios
- Sistema profesional de Cuentas por Cobrar con pagos parciales
- Speech-to-Text en formulario de gastos
- Rediseño UX del modal "Nuevo Ingreso"
- Corrección de lógica contable para pagos parciales

## Prioritized Backlog

### P0 - Critical (Immediate)
1. **Refactorización de `FinanzasModule.jsx`**
   - Archivo actual: +4000 líneas
   - Dividir en componentes: ProductsTab, ReceivablesTab, IncomeModal, ExpenseModal, etc.
   - Impacto: Mantenibilidad y escalabilidad

2. **Despliegue a Producción**
   - Usuario necesita usar "Save to GitHub"
   - Luego "Re-Deploy" desde dashboard Emergent
   - Blocker recurrente

### P1 - High Priority
1. **Sistema de "Por Pagar" avanzado** (similar a "Por Cobrar")
2. **Funcionalidad de Adjuntos en tareas**
3. **Lógica de sub-tareas en mapa mental**
4. **Recordatorios híbridos** (personales y empresa)

### P2 - Medium Priority
1. Módulo de Inversiones (expansión)
2. Bloqueo de cuenta después de 7 días
3. Exportar reportes (PDF/CSV)
4. Análisis financiero con IA

## Technical Architecture

### Backend
- `/app/backend/server.py` - API principal
- `/app/backend/finanzas_service.py` - Modelos y lógica de finanzas

### Frontend
- `/app/frontend/src/components/finanzas/FinanzasModule.jsx` - Componente monolítico (NECESITA REFACTORIZACIÓN)

### Database Collections
- `finanzas_incomes` - Ingresos con estados: collected, pending, partial
- `finanzas_expenses` - Gastos con campos: includes_igv, base_imponible, igv_gasto
- `finanzas_partial_payments` - Pagos parciales
- `finanzas_products_services` - Catálogo de productos

## Known Issues
1. **WhatsApp Integration**: Bloqueado por aprobación de template en Twilio
2. **FinanzasModule.jsx**: Archivo demasiado grande (+4000 líneas)
3. **Despliegue**: Usuario necesita sincronizar cambios manualmente

## Test Credentials
- Username: `spencer3009`
- Password: `Socios3009`
