# Design system (Material Design 3, propio y ligero)

Sin librería de componentes: tokens M3 en Tailwind + componentes propios. Una sola familia de iconos (lucide).

## Tokens (implementados en `src/styles/tokens.css` + `index.css`)
- Color: semilla verde `#1B6B4A`. Roles M3 completos (primary, secondary, tertiary, error, + success/warning propios, surface y 5 niveles de container, outline, inverse). Claro y oscuro; los pares texto/fondo cumplen contraste AA (verificado por script).
- Uso: `bg-primary text-on-primary`, `bg-surface-container`, `text-on-surface-variant`. **Nunca hex sueltos** en componentes.
- Tema: automático por sistema; `src/lib/theme.ts` permite forzar claro/oscuro (`data-theme` en `<html>`).
- Tipografía M3 (Roboto con fallback del sistema): utilidades `text-{display|headline|title|body|label}-{lg|md|sm}`.
- Espaciado: escala de 4 px de Tailwind. Radios: `rounded-xs/sm/md/lg/xl` = 4/8/12/16/28 (botones y diálogos usan `xl`). Elevación: `shadow-1/2/3`.
- Estados interactivos: utilidad `state-layer` (hover 8 %, focus/pressed 10 %).
- Breakpoints: `sm` ≥600 (medium), `lg` ≥1024 (expanded); por debajo de 600 es compact.

## Navegación
Móvil: bottom navigation (≤5 destinos) + FAB "Cobrar". Desktop: navigation rail/sidebar.

## Inventario de componentes (reutilizar; no duplicar)
`ui/`: Button · TextField · Select · Dialog · ConfirmDialog · Snackbar · Badge · Card · EmptyState · DatePicker · Chip
`layout/`: AppShell · Sidebar · BottomNav
`shared/`: PageHeader · SearchBar · FilterBar · StatCard · DataTable · MoneyDisplay · FormField

Regla: un componente nuevo solo si 2+ pantallas lo necesitan; si es de un solo módulo vive en `features/<modulo>/`.

## Reglas de UI
- Estados siempre: loading (skeleton), error (con reintento), empty (con acción), disabled.
- Estados no solo por color (icono + texto en Badge). Áreas táctiles ≥ 48 px.
- Importes siempre con `MoneyDisplay` (formato Bs, alineado a la derecha en tablas).
- Acciones destructivas: `ConfirmDialog` y motivo cuando sea anulación.

## Estado de componentes (T-08 ✔)
Implementados en `src/components/ui/`: Button (filled/tonal/outlined/text/danger, `loading` bloquea doble envío) · TextField (M3 filled, etiqueta flotante, `prefixText`, error con icono) · Select (nativo estilizado) · Dialog (`<dialog>` nativo) · ConfirmDialog (`requireReason` para anulaciones) · Snackbar (`useSnackbar().show`) · Badge (icono + texto) · Card (elevated/filled/outlined) · EmptyState.
Catálogo visual solo en desarrollo: `npm run dev` → `/design` (no entra en el build de producción).
Notas: tipos de Preact 11 → importar `ButtonHTMLAttributes`, `InputHTMLAttributes`, etc. desde `preact` (no `JSX.*`). Los campos exponen solo las props nativas necesarias; añadir más en `NativeInput`/`NativeSelect` si hacen falta.
Pendiente de ui/: DatePicker propio (por ahora `TextField type="date"`), Chip.

## Layout y navegación (T-07 ✔)
- `src/app/nav.ts`: única fuente de verdad de rutas del menú, permisos requeridos y `COBRAR` (acción principal). Añadir una sección = una línea aquí + una `<Route>` en `App.tsx`.
- Compact <600: barra superior + barra inferior (4 destinos + "Más") + FAB "Cobrar" (se oculta en `/cobrar`). Medium 600–1023: navigation rail 80 px. Expanded ≥1024: drawer 256 px.
- Permisos: el menú oculta lo no permitido y `Guard` en `App.tsx` muestra "Sin acceso" si se entra por URL directa. En el backend real lo impone RLS; la UI es solo comodidad.
- Auth: `useAuth()` → `{ user, loading, signIn, signOut, can(permiso) }`. Sesión persistida por el adaptador de datos.
- Nuevos componentes: `ui/IconButton` (48 px, `label` obligatorio), `shared/ThemeToggle`, `shared/PageHeader`, `layout/{AppShell,Sidebar,BottomNav}`.

## Listados (T-09 ✔)
- `shared/DataTable<T>`: UNA definición de columnas (`Column<T>`) sirve para tabla (≥600 px) y tarjetas (móvil). Props clave por columna: `primary` (título de la tarjeta), `actions`, `align: 'right'` (importes), `hideOnCard`. Estados incluidos: loading (esqueleto), error (con "Reintentar"), vacío (`empty`), fila clicable con teclado (Enter/Espacio).
- `shared/SearchBar` (debounce 300 ms) · `shared/Pagination` ("11–20 de 57", oculta si cabe en una página) · `shared/MoneyDisplay` (único lugar para mostrar importes).
- `lib/usePagedList(fetcher, { pageSize, deps })`: carga paginada + búsqueda. Ignora respuestas viejas, vuelve a página 1 al buscar/cambiar `deps`, corrige página vacía y, si falla, vacía las filas para mostrar el error completo.
- Uso típico de una pantalla: `const list = usePagedList(q => api.members.list(q))` → `<SearchBar onSearch={list.setSearch}/>` + `<DataTable rows={list.items} loading={list.loading} error={list.error} onRetry={list.reload} .../>` + `<Pagination .../>`.
- Demo con datos de ejemplo en `/design` (solo desarrollo).

## Plantilla de pantalla CRUD (T-10 ✔ — copiar para Socios, Movimientos, etc.)
`features/<modulo>/` contiene: `<Modulo>Page.tsx` (lista) + `<Modulo>FormDialog.tsx` (crear/editar) y la validación vive en `lib/validations/<modulo>.ts` como **función pura con tests** (`validatePlan(valores en texto) → { ok, value | errors }`).
- Lista: `PageHeader` (+ botón "Nuevo") → filtros (`Select`/`SearchBar`) → `DataTable` (columna `actions` con `IconButton`) → `EmptyState` con acción de crear.
- Datos: `useAsyncData` (sin paginar) o `usePagedList` (paginado). Tras guardar: `reload()` + `snack.show(...)`.
- Formulario en `Dialog`: botón Guardar con `form="id"` + `loading` (bloquea doble envío); errores por campo bajo cada `TextField`; error del servidor en `role="alert"`; se resetea al abrir.
- Acciones reversibles (activar/desactivar) → snackbar con "Deshacer", sin diálogo de confirmación. Destructivas/financieras → `ConfirmDialog` con motivo.
- Registrar la ruta en `App.tsx` dentro de `<Guard perms=[...]>`.

## Flujo Cobrar (T-12 ✔)
- Rutas: `/cobrar` (elige socio con `MemberPicker`) · `/cobrar?socio=ID` (formulario). Se llega desde la ficha, desde el aviso "Cobrar" tras registrar un socio, o desde el FAB/botón destacado.
- `ChargeForm`: si el socio tiene saldo pendiente, ofrece `Segmented` "Pagar saldo | Nueva membresía" (por defecto saldo). Plan por defecto: el de 30 días; monto sugerido = total (editable para pago parcial); método por defecto: efectivo. El botón muestra el monto a cobrar (`Cobrar Bs 120,00`).
- Reglas en `lib/validations/charge.ts` (función pura con tests): descuento ≤ precio, monto > 0 y ≤ lo que falta por pagar, fecha de inicio real. El servidor/mock las vuelve a imponer.
- Doble envío: `useRef` bloquea reenvíos antes del re-render + `Button loading` (probado: 3 clics seguidos = 1 pago).
- `Receipt`: comprobante con N.º correlativo (6 dígitos), fecha/hora en zona del gimnasio, concepto, vigencia, método, monto y saldo. Imprimir = `window.print()`; el resto de la UI usa `print:hidden` (verificado: el PDF solo contiene el recibo).
- Nuevos componentes: `ui/Segmented` (selección única, 2–4 opciones, `aria-pressed`), `features/members/MemberPicker`.

## Inicio / Dashboard (T-16 ✔)
- `StatCard` (`components/shared`): cifra + etiqueta + icono, tono `neutral|success|warning|error` (contenedores M3), opcionalmente enlace. El estado va siempre con etiqueta e icono, no solo color.
- Estructura: tarjetas de socios (2 col móvil, 4 col escritorio) → Finanzas Hoy/Este mes (2 col desde `md`; solo con `reports.view`) → Últimos pagos (`DataTable`).
- "Cobrar" no se repite en la página: ya está en el menú lateral y en el botón flotante móvil.
- Movimientos (T-15): `MovementsPage` + `MovementFormDialog` siguen la plantilla CRUD; anulación con `ConfirmDialog requireReason`.

## Vencimientos (T-17 ✔)
- `/vencimientos`: `Segmented` Por vencer / Vencidas (estado en la URL `?estado=`), `DataTable` ordenada por fecha de fin. Acciones por fila: llamar (`tel:`), WhatsApp (`lib/phone.ts`) y Renovar (solo con permisos de cobro).
- `MembershipWithMember` incluye `memberPhone` (al pasar a SQL: añadirlo a la consulta).

## Reportes (T-18 ✔)
- `lib/reports.ts` (puro, con tests): `buildReport` (totales, método, categoría, serie diaria) y `ledgerToCsv`. La API expone `reports.ledger(range)` (= `v_ledger`).
- `BarChart` (`components/shared`): barras A/B en SVG, `role="img"` + `<title>` por barra. `StatCard` reutilizada para el resumen.
- CSV: separador `;`, BOM UTF-8, coma decimal, egresos negativos, fila BALANCE; las celdas de texto que empiezan con `= + - @` se prefijan con `'`.

## Ajustes (T-19 ✔)
- `/ajustes` (permiso `settings.manage`): `Segmented` Gimnasio / Categorías / Personal (esta última solo con `staff.manage`).
- Componentes nuevos: `Checkbox` (ui, 48 px táctil). `Dialog`: acciones `sticky` al pie.
- Permisos: `PERMISSION_GROUPS` en `lib/labels.ts` define textos y agrupación; `GRANTABLE_PERMISSIONS` (types) excluye `staff.manage`.
- Categorías: se desactivan, nunca se borran; los listados que muestran nombres usan `includeInactive`.

## PWA y accesibilidad (T-22 ✔)
- PWA: `public/manifest.webmanifest` (standalone, atajos Cobrar/Vencimientos), íconos generados (normal, maskable con zona segura, Apple), `public/sw.js` (shell + `/assets/` precargados al instalar; páginas red-primero; `ignoreVary` por `Vary: Origin` de los módulos ES). Se registra solo en producción (`lib/pwa.ts`). `OfflineBanner` avisa sin red.
- Auditoría `/md3-audit` (ver resultados en LOG): tokens sin colores sueltos, escala tipográfica única, formas y elevación por tokens, movimiento M3 por defecto (200 ms, curva 0.2/0/0/1) y `prefers-reduced-motion` respetado.
- Reglas que se mantienen: área táctil 48 px en móvil (`h-12 sm:h-10`), un solo `h1` por pantalla, títulos de estado vacío no son encabezados, enlaces en tablas con `min-h-12`, `BackLink` para volver, campos con `aria-invalid` + `role="alert"`, foco visible global (los campos usan subrayado de 2 px).

## Exportación y demo (T-19+)
- `lib/csv.ts` (CSV Excel-es: `;`, BOM, coma decimal, anti-fórmula), `lib/xlsx.ts` (xlsx real sin dependencias: ZIP "store", hojas, encabezado en negrita y fijo, importes numéricos), `lib/exports.ts` (tablas Socios/Membresías/Pagos/Movimientos + Resumen). `api.backup.get()` (permiso `settings.manage`) entrega todo, incluidos archivados y anulados, nunca contraseñas.
- Ajustes tiene 4 pestañas: Gimnasio · Categorías · Datos · Personal. `DemoDataCard`: cargar / reemplazar / borrar con confirmación y "Descargar una copia antes".

## Trazabilidad visible (T-24 ✔)
- `RecordStatus` (shared): en Movimientos y en la ficha del socio muestra "Registró X" si está confirmado y, si está anulado, motivo + "por X · dd/mm/aaaa hh:mm".
- Ajustes > Bitácora (solo `settings.manage`): lista de solo lectura, la más reciente primero, de cobros y movimientos registrados o anulados (`api.audit.list`). En el mock se deriva de los registros; con Supabase saldrá de `audit_log`.
- Pagos y movimientos guardan `createdBy`, `voidedBy`, `voidedAt` (y movimientos `createdAt`); el nombre se resuelve al listar (`createdByName`, `voidedByName`). Datos guardados antes de T-24 pueden no traerlos y se muestran sin responsable.
- La exportación (Excel/CSV) añade Registrado por, Anulado por y Anulado el.
