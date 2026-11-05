# Gym Manager (GymC)

App web responsive (instalable como PWA) para administrar un gimnasio: socios, planes, membresías, cobros con recibo, ingresos/egresos, dashboard, vencimientos y reportes con CSV.

Estado: front-end completo sobre una capa de datos **mock en el navegador** (localStorage). La conexión a Supabase está pendiente (ver `docs/TASKS.md`).

## Usar en local
```bash
npm install
npm run dev        # http://localhost:5173
npm test           # pruebas
npm run build      # genera dist/
```
Usuarios de demostración: `admin@gym.local` / `admin123` y `recep@gym.local` / `recep123`.

## Documentación
`CLAUDE.md` (contexto) · `docs/SPEC.md` · `docs/DATA_MODEL.md` · `docs/TASKS.md` · `docs/DESIGN.md` · `docs/LOG.md`

## Stack
Vite + Preact + TypeScript · Tailwind CSS (tokens Material Design 3) · wouter · vitest · Supabase (pendiente) · Cloudflare Pages.
