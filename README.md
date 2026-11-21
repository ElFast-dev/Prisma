# Prisma

Aplicación cinematográfica personal, local-first y gratuita, diseñada como PWA para Android.

Prisma conserva sus tres espacios principales:

- **Personal:** biblioteca, historial, colecciones, perfil y logros.
- **Descubrir:** exploración cinematográfica mediante un feed de carátulas.
- **Espectro:** análisis local de preferencias, afinidades y recomendaciones propias.

El desarrollo nuevo se concentrará en hacer Espectro más inteligente y útil, manteniendo la navegación y la experiencia general de Prisma. La dirección técnica está descrita en [Diseño de producto y arquitectura](docs/PRODUCT-ARCHITECTURE.md).

## Estado del proyecto

Prisma ya cuenta con biblioteca local, historial de visionados, colecciones, perfil, logros, Espectro, integración TMDB, copias de seguridad, funcionamiento offline y publicación como PWA para Android.

Espectro 2.6.0 presenta seis secciones de analítica local: Resumen, Actividad, Calificaciones, Universo, Perfil y Biblioteca. Muestra actividad de visionado, distribución de notas, metadatos cinematográficos, afinidades personales, interacciones estadísticas y estado de la Biblioteca.

El motor calcula afinidades con respaldo y mantiene un predictor local para candidatas que ya existen en Prisma. La nota prevista y el encaje son estimaciones, no probabilidades; no hay una pantalla separada de recomendaciones ni búsquedas ilimitadas en TMDB. Las sinopsis aportan señales léxicas, no comprensión semántica, y los comentarios personales no se utilizan como señales.

El análisis intensivo se ejecuta en un Web Worker para mantener la interfaz disponible mientras Espectro calcula. Los datos, las valoraciones y el historial permanecen en el dispositivo. Espectro también puede solicitar una calificación pendiente desde su propia vista, sin obligar a abrir la ficha de la película.

La aplicación está publicada como PWA en GitHub Pages. La suite automatizada cubre TypeScript, pruebas unitarias, build, smoke, navegadores Chromium/Firefox/WebKit y funcionamiento offline. Sigue siendo recomendable una revisión visual manual en un dispositivo Android físico.

## Tecnologías

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

El proyecto está publicado en:

`https://elfast-dev.github.io/Prisma/`

El flujo `.github/workflows/deploy.yml` construye la PWA y la publica mediante GitHub Actions. En **Settings → Pages → Build and deployment**, selecciona **GitHub Actions** como fuente para habilitar el despliegue.

## Privacidad y credenciales

- Los datos personales se almacenan localmente en el dispositivo.
- No se debe guardar una clave TMDB en el código, en variables públicas de compilación ni en Git.
- Cada instalación que utilice TMDB debe configurar su propia credencial.
- No se deben subir al repositorio archivos de copias de seguridad, datos personales ni el correo privado de autorización de TMDB.

## Documentación

La documentación técnica y funcional se encuentra en `docs/`. La dirección de las mejoras de Espectro está descrita en [PRODUCT-ARCHITECTURE.md](docs/PRODUCT-ARCHITECTURE.md).

## Conexión con TMDB

Abre Ajustes dentro de Prisma, introduce tu propia API Read Access Token y pulsa **Probar y guardar conexión**. La credencial se guarda en el navegador de esa instalación y no se publica en Git ni se incluye en los respaldos. Una credencial de una aplicación web puede inspeccionarse en el propio navegador; no es un secreto de servidor.

## Licencia

La licencia del código fuente está pendiente de decisión. La autorización específica de uso de TMDB facilitada para Prisma es independiente de la licencia del código de este repositorio.
