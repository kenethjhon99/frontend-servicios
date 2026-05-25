# Frontend · CodeNova

SPA en React + Vite para gestión de servicios, clientes, órdenes, pagos, créditos y agenda.

## Desarrollo local

```bash
npm install
cp .env.example .env
npm run dev
```

Por defecto el frontend consume `http://localhost:3000/api`.

## Variables de entorno

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL base del backend, por ejemplo `https://tu-backend.onrender.com/api` |

## Producción en Vercel

Este proyecto ya incluye:

- `vercel.json` con salida `dist`
- rewrite SPA a `index.html` para soportar recargas con React Router
- fallback limpio en Axios para usar `VITE_API_URL` en producción

### Configuración recomendada

- Root Directory: `.` si despliegas este repo tal cual
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js: `20+`

### Variable requerida en Vercel

```bash
VITE_API_URL=https://tu-backend.onrender.com/api
```
