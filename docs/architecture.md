# Arquitectura actual de Prisma

## Resumen

Prisma es una aplicación estática de cliente escrita con HTML, CSS y JavaScript nativos. No hay dependencias npm ni un backend de aplicación. El despliegue está preparado para GitHub Pages.

## Piezas principales

| Ruta | Responsabilidad observada |
| --- | --- |
| `index.html` | Estructura de la página, elementos de navegación y puntos de montaje de la aplicación. |
| `styles.css` | Sistema visual oscuro, composición responsive, componentes y animaciones. |
| `app.js` | Estado, almacenamiento, importación/exportación, catálogo, TMDB, recomendaciones, renderizado y eventos. |
| `data/catalog.json` | Catálogo de muestra distribuido con la aplicación. |
| `assets/prisma.svg` | Identidad gráfica de Prisma. |
| `manifest.webmanifest` | Metadatos de instalación PWA. |
| `sw.js` | Caché de recursos de mismo origen y recuperación offline del documento cuando hay una copia guardada. |
| `.github/workflows/deploy-pages.yml` | Publicación estática mediante GitHub Pages. |

## Estado y persistencia

El código concentra la lógica en una IIFE de `app.js`. El estado principal y el catálogo personalizado se guardan con IndexedDB cuando está disponible, con respaldo basado en localStorage para los casos previstos en el código. La credencial opcional de TMDB se guarda por separado en el navegador.

El perfil no tiene una API de sincronización remota. Borrar los datos del sitio del navegador puede borrar el perfil; por eso la exportación de una copia es una operación importante.

## Integraciones externas

TMDB es opcional y se consulta desde el navegador después de configurar una credencial. La aplicación también puede solicitar recursos de imágenes alojados por TMDB cuando hay rutas de carteles o fondos. No se debe incluir una credencial real en archivos del repositorio, especificaciones, pruebas, logs o artefactos de CI.

## Catálogo y recomendador

Los registros pasan por una normalización común. El motor usa las señales de géneros y etiquetas disponibles en los registros personales o en el catálogo para construir un perfil, producir predicciones acotadas entre 1 y 10 y redactar una explicación. La información insuficiente debe seguir siendo visible como limitación, no disimularse.

## Despliegue y caché

El workflow de Pages se activa al hacer push a main o manualmente y publica el contenido estático del repositorio. El service worker mantiene una caché versionada y proporciona una copia del documento para navegación offline cuando existe. Las modificaciones a rutas o nombres de activos deben revisar también el manifiesto, el service worker y las referencias desde HTML.

## Restricciones de evolución

- Mantener la implementación compatible con despliegue estático y rutas relativas de GitHub Pages.
- Evitar dependencias de ejecución innecesarias mientras la arquitectura siga siendo estática.
- Evitar reescribir la arquitectura monolítica por estética; cada refactor debe justificar su alcance y beneficio.
- Añadir pruebas automatizadas de comportamiento de forma incremental, sin usar datos personales reales ni requerir llamadas reales a TMDB.
