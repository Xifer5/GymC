# Registro de bugs, errores, mejoras y cambios

## Bugs (funcionales/visuales)
| ID | Módulo | Problema | Severidad | Estado | Solución |
|---|---|---|---|---|---|
| BUG-003 | Accesibilidad (M3/WCAG) | Enlaces "volver" (40 px) y enlaces de tabla (teléfono, nombre) con área táctil < 48 px; títulos de estados vacíos como `h3` saltando de `h1`; título del documento igual en todas las pantallas | Media | Resuelto | `BackLink` compartido (48 px móvil); enlaces `min-h-12`; `EmptyState` usa `p`; `PageHeader` fija `document.title`; enlace "Saltar al contenido" |
| BUG-002 | Dialog (móvil) | En diálogos largos (Nuevo usuario) "Guardar" quedaba fuera de pantalla hasta desplazar | Media | Resuelto | Barra de acciones `sticky` al pie del diálogo |
| BUG-001 | Segmented (Cobrar, Movimientos) | En móvil "Transferencia" se cortaba como "Transferenc…" | Baja | Resuelto | Opciones con `flex-auto` (ancho según contenido) en vez de `flex-1` |

## Errores técnicos
| ID | Error | Causa | Solución | Prevención |
|---|---|---|---|---|
| ERR-001 | Columnas de la tabla desplazadas (celda vacía al inicio) | `state-layer` en un `<tr>`: su `::before` crea una celda anónima | Hover propio en filas (`hover:bg-on-surface/8`); `state-layer` solo en elementos no-tabla | No aplicar `state-layer` a `tr`/`td`; verificar tablas en navegador |
| ERR-003 | Select: etiqueta superpuesta al valor cuando la opción seleccionada tiene `value=''` (p. ej. "Todos") | La etiqueta solo flotaba si `value !== ''` o había placeholder | `hasSelection = placeholder || options.some(o => o.value === value)` | Probar selects con opción vacía real |
| ERR-002 | Tipos `JSX.*HTMLAttributes` no existen (Preact 11) | Cambio de tipos en Preact 11 | Importar `ButtonHTMLAttributes`, etc. desde `preact` | Ver `docs/DESIGN.md` |

## Notas de pruebas en navegador (herramienta `browse`)
- Las referencias `@eN` por nombre accesible usan coincidencia por subcadena sin distinguir mayúsculas: `CI` coincide con "Observaciones". Para campos ambiguos rellenar por etiqueta exacta con `js`.
- `select` con valor vacío no se aplica: usar `js` + evento `change`.
- `browse pdf` genera el PDF pero no hay `pdftoppm` para verlo; verificar impresión extrayendo el texto con `pypdf`. `cdp Emulation.setEmulatedMedia` está denegado.
- Vite escucha solo en `[::1]` y el navegador de `browse` no conecta con `localhost`: arrancar con `npx vite --host 127.0.0.1 --port 5190 --strictPort` y abrir `http://127.0.0.1:5190`.
- Los `<dialog>` cerrados siguen en el DOM: en pruebas con `js` usar `dialog[open]`. `js` no espera promesas: guardar el resultado en `window.__r` y leerlo en otra llamada.
- El snackbar dura 4 s: pulsar "Deshacer" en el mismo comando que lo provoca.

## Limitaciones conocidas
- No se puede vender un plan con total Bs 0 (precio 0 o descuento = precio): el SQL exige pago > 0 (`amount_cents > 0`). Si se necesitan cortesías, crear `grant_membership` sin pago. (IMP-004)
- Vencimientos: el WhatsApp abre un mensaje genérico fijo ("Hola X, te escribimos del gimnasio."); los teléfonos con menos de 8 dígitos no muestran el botón de WhatsApp. Plantilla editable de mensaje: pendiente (junto a IMP de WhatsApp).
- Reportes: cargan todo el libro de caja del período en memoria (límite 366 días). Suficiente para un gimnasio; si crece, agregar en SQL (`v_ledger` con `group by`). Se usó un gráfico SVG propio en vez de Chart.js.
- Personal: `staff.manage` no se puede asignar a recepción (evita escalar privilegios). No hay cambio de contraseña ni recuperación todavía (en Supabase: flujo de Auth). En el mock la contraseña se guarda en claro: solo para desarrollo.
- PWA: el service worker solo cachea el shell y los archivos propios; no hay escritura offline. Con el mock local (localStorage) cobrar "funciona" sin red; al conectar Supabase, el adaptador debe convertir los fallos de red en un `AppError` claro ("Sin conexión") y los formularios mostrarlo. Cuando se publique una versión nueva, el HTML (red primero) trae los archivos nuevos en la siguiente carga; no hay aviso de "nueva versión" todavía.
- Tipografía: se declara Roboto sin empaquetarla (en Android ya viene; en otros sistemas cae a la fuente del sistema). Empaquetar 400/500 (~30 KB) si se quiere idéntico en todos lados.
- Datos de demostración: `src/lib/data/demo.ts` (solo mock; `demo.available` pasa a `false` al conectar Supabase y la UI oculta la tarjeta). Cargar se niega si ya hay socios. Depende de la fecha de hoy (el mes en curso siempre trae ingresos y gastos).
- Los números de recibo pueden saltarse si una transacción falla tras incrementar el contador en SQL real (en el mock no ocurre por el rollback). Aceptable; los recibos nunca se reutilizan.

## Mejoras propuestas
| ID | Mejora | Prioridad | Estado |
|---|---|---|---|
| IMP-001 | Offline de escritura en recepción (cola local de pagos) | Baja | Idea |
| IMP-002 | Asistencia por QR | Futura | Idea |
| IMP-004 | Membresía de cortesía (sin pago) con permiso propio | Media | Idea |
| IMP-005 | Compartir recibo por WhatsApp (enlace/PDF) | Futura | Idea |
| IMP-003 | Recordatorios de pago por WhatsApp | Futura | Idea |

## Deuda técnica
-

## Changelog
### [Unreleased]
- Docs iniciales y esquema `0001_init.sql` (multi-tenant, RPC financieras).
