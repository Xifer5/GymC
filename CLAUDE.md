# Gym Manager — Contexto del proyecto

> Documento central. Léelo ANTES de cualquier tarea y actualízalo al terminar.

## Objetivo
App web responsive (móvil/tablet/desktop) para administrar un gimnasio: socios, planes, membresías, pagos, ingresos/egresos, dashboard y reportes. Costo de infraestructura objetivo: $0 al inicio.

## Decisiones vigentes
| Tema | Decisión |
|---|---|
| Alcance | Un solo gimnasio hoy, pero **multi-tenant desde el día 1** (`gym_id` + RLS en todas las tablas) por posible SaaS |
| Plataforma | SPA web responsive, PWA instalable (sin offline de escritura en v1) |
| Moneda | Bs (BOB). Importes en **centavos enteros** (`bigint`), nunca float |
| Métodos de pago | Efectivo, transferencia, QR |
| Roles | `admin` (todo) y `receptionist` (permisos granulares asignados por el admin) |
| Asistencia | Fuera de v1 |

## Stack
Vite + Preact + TypeScript · Tailwind CSS (tokens Material Design 3 propios) · wouter (rutas) · Supabase (Postgres + Auth + Storage) · zod · lucide-preact · Chart.js (carga diferida) · vite-plugin-pwa · Cloudflare Pages · GitHub.

## Reglas de oro
1. **Finanzas**: nunca borrar movimientos confirmados; se anulan con motivo. Balance = pagos confirmados + otros ingresos confirmados − egresos confirmados.
2. **Escrituras financieras solo vía funciones SQL (RPC)** transaccionales. El frontend no hace INSERT/UPDATE directo en `payments`, `memberships`, `movements`.
3. Estado "vencida" de membresía **se deriva** de `end_date`, no se guarda.
4. Lógica de negocio fuera de los componentes (`src/features/*/service.ts`, `src/lib/money.ts`).
5. Nunca exponer `service_role` en el frontend. Crear usuarios de staff solo vía Edge Function.
6. Antes de crear un componente/util, buscar si ya existe. Componentes genéricos en `src/components/ui`, de negocio dentro de su feature.
7. Toda pantalla contempla: loading, error, empty, disabled.
8. Cada tarea: leer contexto → leer spec del módulo → revisar componentes → implementar → probar → actualizar docs → marcar en `docs/TASKS.md`.

## Estructura
```
docs/            SPEC.md · DATA_MODEL.md · TASKS.md · DESIGN.md · LOG.md
supabase/migrations/   SQL versionado
src/components/{ui,layout,shared}
src/features/{auth,members,plans,memberships,payments,movements,dashboard,reports,settings}
src/lib/{supabase,money,dates,validations}
```

## Estado actual
- Fase: **Bloque B en curso — HITO DE DEMO ALCANZADO**: T-12 Cobrar (socio → plan → descuento → monto → método → recibo imprimible) verificado en navegador
- T-14 (anular pago) y T-15 (movimientos: ingresos/egresos con filtros y anulación) hechas y verificadas en navegador
- T-16 (dashboard) hecha y verificada en navegador (admin y recepción, móvil y escritorio)
- T-17 (vencimientos con contacto y renovar) hecha y verificada en navegador
- T-18 (reportes + CSV) hecha y verificada en navegador: **Bloque C completo**
- T-19 (ajustes: gimnasio, categorías, personal y permisos) hecha y verificada en navegador, sobre el mock
- T-22 (PWA instalable + auditoría de accesibilidad M3) hecha. **Front-end de la v1 completo sobre el mock; listo para mostrar al gimnasio**
- Próxima: retomar T-02/T-03 Supabase (adaptador que pase `contract.ts`, Edge Function `create-staff`, vista `v_ledger`, `v_members_current`); T-20, T-21 y T-23 dependen del servidor

## Datos en desarrollo (sin servidor)
La UI usa `import { api } from '@/lib/data'` (mock en localStorage, usuarios `admin@gym.local/admin123`, `recep@gym.local/recep123`). Nunca importar `mock.ts` desde componentes. T-02 (Supabase) queda en pausa; al retomarla se crea un adaptador que pase `src/lib/data/contract.ts`.
