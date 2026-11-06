# Task order (rebanadas verticales)

Formato: `[ ] ID — tarea (depende de) · criterio`. Marcar `[x]` al terminar y actualizar `CLAUDE.md`.

## Bloque A — Base (1 sola vez)
- [x] T-01 — Crear proyecto Vite+Preact+TS, Tailwind, wouter, ESLint/Prettier, `.env.example` · `npm run dev` y `build` funcionan
- [-] T-02 (en pausa: se trabaja con mock local) — Proyecto Supabase (dev), aplicar `0001_init.sql`, seed: gym + categorías + admin (T-01) · login manual funciona en SQL editor
- [~] T-03 — (parcial: money.ts y dates.ts con tests ✔) Cliente Supabase, tipos generados (T-01) · tests de redondeo/formato Bs pasan
- [x] T-04 — Tokens M3 en Tailwind + `DESIGN.md` (modo claro/oscuro) (T-01)
- [x] T-05 — Cloudflare Pages conectado a GitHub, deploy automático (T-01)

## Bloque B — Rebanada 1: cobrar una mensualidad (núcleo)
- [x] T-06 — Auth: login, sesión, guard de rutas, hook `usePermission` (T-02,T-03)
- [x] T-07 — Layout: AppShell (sidebar desktop / bottom nav móvil), PageHeader (T-04)
- [x] T-08 — UI base: Button, TextField, Select, Dialog, Snackbar, Badge, Card, EmptyState (T-04)
- [x] T-09 — DataTable (tabla en desktop, tarjetas en móvil) + SearchBar + paginación (T-08)
- [x] T-10 — Planes: CRUD (T-08,T-09) · cambiar precio no afecta membresías previas
- [x] T-11 — Socios: lista, búsqueda, alta/edición, archivar, ficha (T-09)
- [x] T-12 — Flujo "Cobrar": `sell_membership`, recibo, anti doble envío (T-10,T-11) · **hito: demo al gimnasio**
- [x] T-13 — Renovar y pagos parciales (`register_payment`), saldo pendiente (T-12) · cubierto por la pantalla Cobrar: modo "Pagar saldo" y "Nueva membresía" (renovación empieza al terminar la actual)
- [x] T-14 — Anular pago con motivo (T-12) · botón "Anular" en la ficha del socio (permiso `payments.void`), ConfirmDialog con motivo obligatorio · verificado en navegador

## Bloque C — Rebanada 2: finanzas completas
- [x] T-15 — Categorías + ingresos/egresos + anulación + filtros (T-09) · `/movimientos` (tipo, categoría, rango de fechas, paginado), alta en diálogo, anulación con motivo. Crear/editar categorías desde la UI queda para T-19 (Ajustes, permiso `settings.manage`)
- [x] T-16 — Dashboard (consultas sobre `v_ledger` y memberships) (T-13,T-15) · `/`: socios (total/activos/por vencer/vencidos), finanzas hoy y mes con desglose por método (solo con `reports.view`), últimos 5 pagos con nombre del socio. Las tarjetas de socios enlazan a `/socios`; T-17 las llevará a las listas de vencidos
- [x] T-17 — Vencidas / por vencer (lista + badge en dashboard) (T-13) · `/vencimientos?estado=expiring|expired` (pestañas con contador), teléfono, llamar, WhatsApp (`wa.me`, +591 si faltan), Renovar → `/cobrar?socio=`; tarjetas del Inicio enlazan aquí; botón "Vencimientos" en Socios
- [x] T-18 — Reportes + exportar CSV (T-16) · `/reportes`: períodos (hoy, 7 días, mes, mes anterior, personalizado ≤366 días), ingresos/egresos/balance, gráfico diario en SVG propio (sin Chart.js: más liviano), desglose por categoría y método, CSV para Excel (`;`, BOM, fórmulas neutralizadas). **Cierra el Bloque C**

## Bloque D — Administración y cierre
- [x] T-19 — Staff, permisos, datos del gym y categorías (T-06) · **front-end y mock hechos**: `/ajustes` con Gimnasio (sale en el recibo), Categorías (crear/renombrar/desactivar) y Personal (alta, permisos, desactivar). **Pendiente al migrar a Supabase**: Edge Function `create-staff` (contrato `staff.create`) y RLS equivalente
- [ ] T-20 — Backup `pg_dump` semanal (GitHub Actions → almacenamiento externo) + prueba de restauración (T-02)
- [ ] T-21 — Tests de RLS por rol (admin vs recepcionista vs otro gym) y de RPC financieras
- [x] T-22 — PWA (manifest, instalable, aviso sin conexión), auditoría de accesibilidad con `/md3-audit` · manifest + íconos (normal, maskable, Apple) + service worker propio (la app abre sin red; sin escritura offline) + aviso "Sin conexión"; auditoría M3/WCAG automatizada en 8 rutas × claro/oscuro: 0 fallos de contraste, hallazgos corregidos
- [ ] T-23 — Revisión de seguridad (`/cso`), proyecto Supabase de producción, dominio, v1.0

## Definición de "hecho"
Funciona en móvil y desktop · estados loading/error/empty · sin componente duplicado · tests de lo financiero · docs actualizados.
- [x] T-24 — Trazabilidad visible (antes de v1.0): `createdBy`/`voidedBy`/`voidedAt` en pagos y movimientos (tipos, mock, SQL ya los tiene), mostrar "Anulado por X el dd/mm hh:mm" en tablas, pantalla de bitácora (`audit_log`) para admin, y esas columnas en la exportación. Ver LOG IMP-006
