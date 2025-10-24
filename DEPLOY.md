# Despliegue

Este repositorio contiene un frontend Next.js (raíz) y un backend NestJS bajo `backend/`.

Resumen rápido:
- Frontend: Next.js — desplegar en Vercel (recomendado).
- Backend: NestJS — desplegar en Render, Railway o cualquier servicio que soporte Docker/Node.

Variables de entorno importantes (backend)

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=almacen_db

# Application
PORT=3001
NODE_ENV=production

# JWT (opcional)
JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=7d
```

1) Desplegar frontend en Vercel

- Crear nuevo proyecto en Vercel apuntando al repositorio.
- En la interfaz de Vercel usar el root del repo (este proyecto usa Next.js en la raíz). Los archivos `vercel.json` y `.vercelignore` ya están añadidos para evitar desplegar el backend.
- Variables de entorno (si el frontend necesita alguna): configurar en Project Settings > Environment Variables.
- Build command: `npm run build` (ya existe en `package.json`).
- Output directory: no es necesario — Vercel detecta Next.js.

2) Desplegar backend en Render (recomendada) o Railway

Opción A — Usar Docker (recomendado cuando quieres control total):

- En Render crea un servicio nuevo tipo "Web Service" y elige "Docker".
- Conecta el repo y apunta a la carpeta `backend/` como root (Render detectará el Dockerfile ahí).
- Configura la variable `PORT` (usualmente Render provee una variable `PORT`; la app escucha 3001 por defecto — si Render requiere usar su puerto, adapta `main.ts` o respeta la variable `PORT`).
- Agrega las variables de entorno (DATABASE_*, JWT_SECRET, etc.).

Opción B — Usar Node (sin Docker):

- En Render crea un servicio Web, selecciona Node environment.
- Build command: `npm install && npm run build`
- Start command: `npm run start:prod`
- Configura el root del servicio en `backend/` y agrega variables de entorno.

Railway

- Railway puede desplegar usando Dockerfile o con la opción Node.
- Si usas el Dockerfile, sube el `backend/` como proyecto y Railway usará Dockerfile automáticamente.

3) Ejecutar localmente

Frontend:
```bash
# en la raíz
npm install
npm run dev
```

Backend:
```bash
cd backend
npm install
npm run start:dev
```

4) Notas y recomendaciones
- Asegúrate de no commitear archivos `.env` con credenciales.
- Si el hosting te exige otro puerto, exporta `PORT` antes de `npm run start:prod` o adapta `backend/src/main.ts` para respetar `process.env.PORT`.
- Para integración CI/CD, considera añadir workflows que construyan la imagen Docker y hagan tests.

Si quieres, puedo:
- Generar un workflow de GitHub Actions para build/test/packaging.
- Ajustar `main.ts` del backend para asegurar soporte de `process.env.PORT` (si no está actualmente).

---

Publicar repos separados desde este monorepo

Si prefieres dos repos (frontend + backend) y publicarlos en GitHub sin Docker, sigue estas opciones automatizadas desde tu máquina:

1) Requisitos locales

- Tener `gh` (GitHub CLI) instalado y autenticado.
- Tener `git` y acceso de escritura en la cuenta de GitHub donde crearás los repos.

2) Script automático

He añadido `scripts/create_github_repos.sh`. Desde la raíz del proyecto ejecuta:

```bash
BACKEND_REPO=almacen-backend FRONTEND_REPO=almacen-frontend ./scripts/create_github_repos.sh
```

Qué hace el script:
- Crea en GitHub los repos indicados (usa `gh repo create`).
- Genera una rama con la historia del `backend/` (`git subtree split`) y la empuja al repo `BACKEND_REPO`.
- Clona temporalmente el repo, elimina la carpeta `backend/` de la historia (usando `git filter-branch`) y empuja la historia resultante a `FRONTEND_REPO`.

3) Después de publicar

- Añade secretos en los repos de GitHub (Settings > Secrets) como `DATABASE_URL`, `JWT_SECRET`, etc.
- En Vercel y Render conecta los repos separados y configura Build & Start commands (ver `frontend/README.PUBLISH.md` y `backend/README.PUBLISH.md`).

Si quieres que prepare además los workflows CI (para build/tests y publicar imagen del backend en GHCR si lo deseas) dime y los agregaré — necesitaré que me confirmes si prefieres GHCR o Docker Hub para publicar imágenes.
