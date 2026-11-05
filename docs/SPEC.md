# Especificación funcional (MVP)

## Usuarios y permisos
- **Admin**: acceso total, gestiona staff y permisos.
- **Recepcionista**: solo lo que el admin le marque.

Permisos granulares (`profiles.permissions`):
`members.read` `members.write` `plans.manage` `memberships.write` `payments.create` `payments.void` `movements.read` `movements.write` `reports.view` `settings.manage` `staff.manage`

Perfil sugerido de recepcionista: `members.read members.write memberships.write payments.create`.

## Módulos y criterios de aceptación

### M1 Auth y staff
- Login email+contraseña. Sesión persistente.
- Admin crea/desactiva recepcionistas y edita sus permisos.
- AC: un recepcionista sin `payments.void` no ve ni puede ejecutar anulaciones (UI y BD lo bloquean).

### M2 Socios
- Alta (nombre, CI, teléfono, email opcional, foto opcional, notas), edición, archivar (no eliminar).
- Búsqueda por nombre, teléfono o CI. Estado: activo/inactivo/suspendido/archivado.
- Ficha con historial de membresías y pagos.
- AC: alta de socio en ≤ 3 campos obligatorios (nombre, CI, teléfono). CI único por gimnasio.

### M3 Planes y membresías
- Planes: nombre, duración en días, precio, activo. (diario 1, semanal 7, quincenal 15, mensual 30, personalizado).
- Asignar plan: inicio, fin calculado, descuento opcional. Precio se congela en la membresía.
- Renovar: inicio por defecto = día siguiente al vencimiento (o hoy si ya venció).
- Listas: vencidas, por vencer (≤7 días, configurable).
- AC: cambiar el precio de un plan NO altera membresías existentes.

### M4 Pagos
- Flujo principal "Cobrar": socio → plan → monto → método → confirmar (membresía + pago en una sola transacción).
- Pagos parciales permitidos; saldo pendiente = precio − descuento − pagos confirmados.
- No se permite pagar más que el saldo. Número de recibo correlativo por gimnasio.
- Anular pago: requiere permiso y motivo; queda en historial.
- Comprobante imprimible/compartible.
- AC: doble clic en "Confirmar" no genera pagos duplicados.

### M5 Ingresos y egresos (otros movimientos)
- Registrar ingreso/egreso con categoría, concepto, monto, fecha, método, comprobante opcional.
- Categorías editables. Anulación con motivo. Filtros por fecha, tipo, categoría.

### M6 Dashboard
Socios activos · vencidas · por vencer · ingresos/egresos del día y del mes · balance · últimos pagos.

### M7 Reportes
Ingresos, egresos, balance mensual, pagos por método, socios nuevos, membresías vencidas. Exportar CSV (v1), PDF después.

## No funcionales
- Carga inicial < 200 KB JS gzip en rutas principales; listados paginados (25/pág).
- Accesible: contraste AA, teclado, labels, estados no solo por color.
- Zona horaria del gimnasio (`America/La_Paz`) para "hoy" y "mes".
- Backups: `pg_dump` semanal automatizado a almacenamiento externo (ver T-20).

## Fuera de alcance v1
Asistencia/QR de ingreso, WhatsApp, entrenadores, rutinas, inventario, app de socios, offline de escritura.
