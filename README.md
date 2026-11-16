# Prisma

Aplicación cinematográfica personal, local-first y gratuita, diseñada como PWA para Android.

Actualmente Prisma cuenta con cuatro espacios principales:

- **Inicio:** propone tres caminos para elegir película —Apuesta segura, Nuevo descubrimiento y Fuera de tu zona— a partir del catálogo local y de las señales disponibles en Espectro. Distingue el encaje y la nota estimada, y no inventa predicciones cuando falta evidencia.
- **Descubrir:** explora películas mediante el feed cinematográfico conectado a TMDB.
- **Mi cine:** reúne Biblioteca, Historial, Colecciones, Perfil y logros, conservando las rutas y los registros personales existentes.
- **Espectro:** analiza localmente las preferencias, afinidades, evolución y relaciones cinematográficas, y enriquece metadatos mediante TMDB.

La arquitectura objetivo y las siguientes etapas de evolución continúan descritas en [Diseño de producto y arquitectura](docs/PRODUCT-ARCHITECTURE.md). El documento es una guía incremental: no todas las capacidades previstas están implementadas todavía.

## Estado del proyecto

Prisma ya cuenta con biblioteca local, historial de visionados, colecciones, perfil, logros, Espectro, integración TMDB, copias de seguridad, funcionamiento offline y publicación como PWA para Android.

Las etapas 1–15 están completadas. Espectro 2.2 organiza su análisis en cuatro apartados: Mapa cinematográfico, Afinidades, Evolución y Recomendaciones. El mapa conecta películas con géneros, directores, actores y temas; agrupa títulos similares y diferencia las zonas ya exploradas de las pendientes. El algoritmo calcula encaje relativo 0–100 % y nota prevista por separado, y enriquece metadatos locales mediante TMDB sin abrir fichas.

Espectro también puede solicitar una calificación pendiente desde su propia vista, sin obligar a abrir la ficha de la película. La etapa 16.4 ya superó CI, E2E móvil y la verificación pública de GitHub Pages y del manifiesto PWA. Permanece abierta únicamente para una revisión visual manual en un dispositivo Android físico.

La etapa 17 — Optimización integral — sigue pendiente de autorización y no se inicia automáticamente.

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

La documentación técnica y funcional se encuentra en `docs/`. La nueva arquitectura de producto está descrita en [PRODUCT-ARCHITECTURE.md](docs/PRODUCT-ARCHITECTURE.md).

## Conexión con TMDB

Abre Ajustes dentro de Prisma, introduce tu propia API Read Access Token y pulsa **Probar y guardar conexión**. La credencial se guarda en el navegador de esa instalación y no se publica en Git ni se incluye en los respaldos. Una credencial de una aplicación web puede inspeccionarse en el propio navegador; no es un secreto de servidor.

## Licencia

La licencia del código fuente está pendiente de decisión. La autorización específica de uso de TMDB facilitada para Prisma es independiente de la licencia del código de este repositorio.
