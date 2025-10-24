# Publicar Frontend (Next.js)

Instrucciones para publicar el frontend en un repo propio y desplegar en Vercel.

1) Crear repositorio en GitHub

Puedes usar la GitHub CLI (recomendada):

```bash
# desde la raíz del proyecto
BACKEND_REPO=almacen-backend FRONTEND_REPO=almacen-frontend ./scripts/create_github_repos.sh
```

El script creará `FRONTEND_REPO` y subirá la historia del repo sin la carpeta `backend/`.

2) En Vercel

- Conecta el repositorio `FRONTEND_REPO` en Vercel.
- Build command: `npm run build`
- Install command: `npm install`
- Environment variables: agrega las que use el frontend (p. ej., NEXT_PUBLIC_API_URL o NEXT_PUBLIC_SUPABASE_URL si aplica).

3) Notas sobre variables de entorno

Para producción con Supabase: si el frontend necesita conocer la URL pública de Supabase (p. ej. para auth), añade:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=anon-xxx
NEXT_PUBLIC_API_URL=https://tu-backend.example.com
```
