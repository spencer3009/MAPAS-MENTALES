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
- ✅ **Balance General con concepto de Caja Real** (NUEVO)
- ✅ Gestión de Ingresos (CRUD completo)
- ✅ Gestión de Gastos (CRUD completo)
- ✅ Sistema de Cuentas por Cobrar con pagos parciales
- ✅ Sistema de Cuentas por Pagar (básico)
- ✅ Catálogo de Productos/Servicios
- ✅ **Sistema de Gastos Fijos con recordatorios** (NUEVO)
- ✅ Determinación del IGV (18%) - Ventas vs Gastos
- ✅ Visualización de Subtotal e IGV en tablas

### Integraciones
- ✅ Twilio WhatsApp (Activo - recordatorios de gastos fijos)
- ✅ Resend Email (Activo - recordatorios de gastos fijos)

## What's Been Implemented

### Session: January 21, 2026 (Latest)

#### Sistema de Gastos Fijos
1. **Catálogo de Gastos Fijos**: CRUD completo con campos: nombre, categoría, monto estimado, periodicidad, IGV, proveedor, proyecto
2. **Autocompletado en "Nuevo Gasto"**: Buscar y seleccionar gasto fijo para autocompletar campos
3. **Recordatorios Obligatorios**: Email (Resend) + WhatsApp (Twilio) configurables por usuario
4. **Pagos de Gastos Fijos**: Registro con historial que afecta la caja real
5. **Scheduler de Recordatorios**: Verifica cada 60 segundos y envía notificaciones

#### Balance General (Caja Real)
1. **Vista Principal**: "Has ganado/perdido S/ X" con colores verde/rojo
2. **KPIs**: Ingresos Reales, Gastos Reales, Resultado Neto
3. **Filtros**: Hoy, Mes actual, Últimos 30 días, Personalizado, Por Proyecto
4. **Contexto Financiero**: Por Cobrar, Por Pagar, Gastos Fijos Comprometidos (informativo)
5. **Balance por Proyecto/Nodo**: Resultado desglosado por proyecto
6. **Tablas Expandibles**: Detalle de cada ingreso y gasto con totales

#### Mejoras de UI anteriores
- Estado al inicio en formulario de gastos (default: Pagado)
- Columnas Subtotal e IGV en tablas de Ingresos y Gastos
- Sección de Determinación del IGV en Dashboard

### Session: January 21, 2026 (Current)

#### Cambio de Terminología Completado
- ✅ **"Categoría" → "Concepto del gasto"** en toda la UI de finanzas
- ✅ Tabla de Gastos: columna "CONCEPTO"
- ✅ Tabla de Gastos Fijos: columna "CONCEPTO"
- ✅ Botón y modal "Conceptos de Gasto"
- ✅ Formularios de creación/edición actualizados
- ✅ Comentarios del código actualizados

## Prioritized Backlog

### P0 - Critical (Immediate)
1. **Refactorización de `FinanzasModule.jsx`**
   - Archivo actual: +4500 líneas
   - Dividir en componentes: BalanceGeneralTab, FixedExpensesTab, ProductsTab, etc.

2. **Despliegue a Producción**
   - Usar "Save to GitHub"
   - Luego "Re-Deploy" desde dashboard Emergent

### P1 - High Priority
1. **Sistema de "Por Pagar" avanzado** (similar a "Por Cobrar")
2. **Funcionalidad de Adjuntos en tareas**
3. **Comparativas de períodos en Balance General**

### P2 - Medium Priority
1. Gráficos comparativos (mes vs mes anterior)
2. Módulo de Inversiones (expansión)
3. Alertas automáticas por pérdidas recurrentes
4. Análisis financiero con IA contextual

## Technical Architecture

### Backend
- `/app/backend/server.py` - API principal con endpoints de Balance General y Gastos Fijos
- `/app/backend/finanzas_service.py` - Modelos incluyendo FixedExpense, FixedExpensePayment

### Frontend
- `/app/frontend/src/components/finanzas/FinanzasModule.jsx` - Componente monolítico con BalanceGeneralTab, FixedExpensesTab

### Database Collections
- `finanzas_incomes` - Ingresos
- `finanzas_expenses` - Gastos (incluye referencia a gastos fijos)
- `finanzas_fixed_expenses` - Catálogo de gastos fijos
- `finanzas_fixed_expense_payments` - Historial de pagos
- `finanzas_fixed_expense_reminders` - Recordatorios programados

## Key API Endpoints
- `GET /api/finanzas/balance-general` - Balance General con filtros
- `GET/POST/PUT/DELETE /api/finanzas/fixed-expenses` - CRUD Gastos Fijos
- `GET /api/finanzas/fixed-expenses/{id}/payments` - Historial de pagos
- `POST /api/finanzas/fixed-expenses/payments` - Registrar pago

## Test Credentials
- Username: `spencer3009`
- Password: `Socios3009`
- Company ID: `b9fe9962-ea98-4f99-9c1a-983bffbe5660`
