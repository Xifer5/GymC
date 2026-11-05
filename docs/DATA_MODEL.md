# Modelo de datos

SQL completo: `supabase/migrations/0001_init.sql`.

## Entidades
| Tabla | Propósito |
|---|---|
| `gyms` | Tenant (nombre, moneda, zona horaria) |
| `profiles` | Staff: 1:1 con `auth.users`, `gym_id`, `role`, `permissions[]`, `active` |
| `plans` | Catálogo de planes |
| `members` | Socios |
| `memberships` | Plan asignado a socio; **congela** `plan_name`, `price_cents`, `discount_cents` |
| `payments` | Cobros de socios (ligados a membresía), con `receipt_no` |
| `movement_categories` | Categorías de ingresos/egresos por gimnasio |
| `movements` | Egresos y otros ingresos (no son pagos de socios) |
| `audit_log` | Quién hizo qué y cuándo |
| `gym_counters` | Correlativo de recibos por gimnasio |
| `v_ledger` (vista) | Unión de pagos + movimientos confirmados; base de balance y reportes |

## Reglas
- Todo con `gym_id`; RLS: `gym_id = auth_gym_id()` + `has_perm('...')`.
- Importes: `*_cents bigint` con `CHECK > 0`. Conversión solo en `src/lib/money.ts`.
- `payments`, `memberships`, `movements`: **solo SELECT por RLS; escritura por RPC** (`security definer`, valida permiso, transacción, audita).
- Anulación: `status = 'voided'` + `void_reason`, `voided_by`, `voided_at`. Sin DELETE.
- Membresía vencida = `end_date < current_date` (en zona del gym) y `status = 'active'`.
- Balance = suma de `v_ledger` con signo (ingreso +, egreso −), solo confirmados.

## RPC
| Función | Permiso | Hace |
|---|---|---|
| `sell_membership(member, plan, start, discount, paid, method)` | `memberships.write` + `payments.create` | Crea membresía y primer pago atómicamente |
| `create_membership(...)` | `memberships.write` | Solo membresía (renovación sin pago) |
| `register_payment(member, membership, amount, method, note)` | `payments.create` | Pago con recibo; valida saldo |
| `void_payment(id, reason)` | `payments.void` | Anula pago |
| `register_movement(type, category, description, amount, method, date)` | `movements.write` | Ingreso/egreso |
| `void_movement(id, reason)` | `movements.write` | Anula movimiento |

## Pendiente
- Edge Function `create-staff` (usa service_role, crea auth user + profile).
- Storage buckets `member-photos` y `receipts` con políticas por `gym_id` en la ruta.

## Capa de datos en el frontend (`src/lib/data/`)
- `types.ts`: interfaz `DataApi` (la UI solo usa esto) y tipos de dominio en camelCase.
- `mock.ts`: adaptador local en `localStorage` que **replica las reglas del SQL** (permisos, anti-sobrepago, precio congelado, anulación con motivo, recibos correlativos, atomicidad). Usuarios de prueba: `admin@gym.local / admin123` y `recep@gym.local / recep123`.
- `contract.ts`: batería de tests de comportamiento que **cualquier adaptador debe pasar** (hoy mock; mañana Supabase).
- `index.ts`: exporta `api`. Cambiar de adaptador = cambiar este archivo.
- Regla: si cambia una regla de negocio, se cambia en `0001_init.sql`, `mock.ts` y `contract.ts` a la vez.

### Pendiente en SQL (surgido en T-11)
`members.list` del frontend devuelve `current` (membresía vigente: plan, fin, estado, saldo). Al hacer el adaptador de Supabase se necesita una vista `v_members_current` (última membresía activa por socio + saldo = precio − descuento − pagos confirmados) con `security_invoker`, y el estado `expiring/expired` se calcula en el cliente con `membershipState()`. Cubierto por el test "la lista trae la membresía vigente…" de `contract.ts`.
