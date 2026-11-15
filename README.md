# Prisma

Aplicación cinematográfica personal, local-first y gratuita, diseñada como PWA para Android.

Prisma se organiza en tres espacios:

- **Personal:** biblioteca, historial, colecciones, perfil y logros.
- **Descubrir:** exploración cinematográfica mediante un feed de carátulas.
- **Espectro:** análisis local de preferencias y recomendaciones propias.

## Estado del proyecto

Prisma ya cuenta con biblioteca local, historial de visionados, colecciones, perfil, logros, Espectro, integración TMDB, copias de seguridad, funcionamiento offline y publicación como PWA para Android.

Las etapas 1–14 de la hoja de ruta están completadas. El enriquecimiento de metadatos se validó en un dispositivo Android con 821 películas y 24 trabajadores simultáneos, sin fallos observados. La siguiente etapa funcional queda pendiente de priorización.

## Tecnologías previstas

- React
- TypeScript
- Vite
- IndexedDB mediante Dexie
- TMDB API
- Service Worker / PWA
- Vitest y Playwright

## Desarrollo local

Requisitos: Node.js LTS y npm.

```bash
npm install
npm run dev
```

Para generar la versión de producción:

```bash
npm run build
npm run preview
```

## GitHub Pages

El proyecto está configurado para publicarse en:

`https://elfast-dev.github.io/Prisma/`

El flujo `.github/workflows/deploy.yml` construye la PWA y la publica mediante GitHub Actions. En **Settings → Pages → Build and deployment**, selecciona **GitHub Actions** como fuente para habilitar el despliegue.

## Privacidad y credenciales

- Los datos personales se almacenarán localmente en el dispositivo.
- No se debe guardar una clave TMDB en el código, en variables públicas de compilación ni en Git.
- Cada instalación que utilice TMDB deberá configurar su propia credencial.
- No se deben subir al repositorio archivos de copias de seguridad, datos personales ni el correo privado de autorización de TMDB.

## Documentación

La documentación técnica y funcional se encuentra en `docs/`.

## Conexión con TMDB

Abre Ajustes dentro de Prisma, introduce tu propia API Read Access Token y pulsa **Probar y guardar conexión**. La credencial se guarda en el navegador de esa instalación y no se publica en Git ni se incluye en los respaldos. Una credencial de una aplicación web puede inspeccionarse en el propio navegador; no es un secreto de servidor.

## Licencia

La licencia del código fuente está pendiente de decisión. La autorización específica de uso de TMDB facilitada para Prisma es independiente de la licencia del código de este repositorio.
