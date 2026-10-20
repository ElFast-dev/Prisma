# Arquitectura de Prisma

## Resumen

Prisma es una aplicación estática de cliente escrita con HTML, CSS y JavaScript nativos. No necesita un backend ni dependencias de ejecución; GitHub Pages sirve los archivos estáticos y el navegador carga ES modules directamente.

## Mapa de módulos

| Ruta | Responsabilidad |
| --- | --- |
| `index.html` | Documento, navegación, puntos de montaje y entrada ES module versionada. |
| `app.js` | Composición de la app, estado de interfaz, controladores de vista y coordinación de acciones aún en migración. No debe volver a absorber lógica de dominio extraída. |
| `js/core/movie-utils.js` | Identidad y normalización de películas, listas, validación de notas y escape de texto. |
| `js/core/state-model.js` | Estado inicial y normalización del estado persistido/importado. |
| `js/core/storage.js` | IndexedDB y fallback a localStorage. |
| `js/recommendations/features.js` | Extracción de características de una película. |
| `js/recommendations/engine.js` | Perfil de preferencias, predicción y evaluación leave-one-out con dependencias explícitas. |
| `js/catalog/csv-parser.js` | Parseo determinista de CSV/TSV. |
| `js/catalog/catalog-model.js` | Combinación de fuentes, identidad en el catálogo, búsqueda y estadísticas del perfil. |
| `js/collection/collection-model.js` | Derivación y filtrado de historial, pendientes, ocultos y estados relacionados con la colección. |
| `js/ui/presentation-utils.js` | Utilidades puras de presentación: fechas, formatos, enlaces externos y fragmentos HTML reutilizables. |
| `js/ui/page-views.js` | Renderizadores de Progreso, Descubrir, Colección, Laboratorio, Ajustes y componentes de catálogo. |
| `js/ui/modal-views.js` | Renderizadores de fichas de película/persona, diálogo de puntuación y paneles auxiliares. |
| `js/app/movie-actions.js` | Acciones de dominio para valorar, borrar notas, marcar vistas, gestionar pendientes y ocultar películas. |
| `js/import-export/actions.js` | Orquestación de las importaciones JSON/CSV, copias de seguridad, restauración y restablecimiento local. |
| `js/app/event-handlers.js` | Listeners globales de click, input, errores de imágenes y selección de archivos, conectados mediante un contexto explícito. |
| `js/tmdb/settings-actions.js` | Guardado, prueba y eliminación de credenciales TMDB sin mezclar acciones con el coordinador. |
| `js/import-export/personal-data.js` | Reconocimiento de exportaciones personales, normalización y combinación de registros. |
| `js/tmdb/client.js` | Credenciales, peticiones HTTP, errores, caché de géneros y conversión de respuestas TMDB. |
| `styles.css` | Tokens, base y estructura general. |
| `styles/movie-cards.css` | Tarjetas y composición de películas. |
| `styles/dialogs-feedback.css` | Diálogos, hojas modales y avisos. |
| `styles/responsive.css` | Responsive inicial y movimiento reducido. |
| `styles/visual-refinements.css` | Refinamientos visuales posteriores. |
| `styles/collection.css` | Experiencia de colección. |
| `styles/accessibility.css` | Interacción accesible y estados de foco. |
| `styles/catalog.css` | Tarjetas poster-first de Descubrir. |
| `styles/collection-content.css` | Jerarquía del contenido de colección. |
| `styles/movie-details.css` | Ajustes de ficha y puntuaciones externas. |
| `data/catalog.json` | Catálogo de muestra. |
| `assets/prisma.svg` | Identidad gráfica. |
| `manifest.webmanifest` | Metadatos PWA. |
| `sw.js` | Caché versionada y recuperación offline limitada. |

## Reglas de diseño

El código nuevo debe residir en un módulo con una responsabilidad concreta. El motor, los analizadores y las utilidades puras no deben consultar el DOM, escribir almacenamiento ni depender de estado de interfaz. Las dependencias cambiantes se inyectan como funciones. La capa de aplicación coordina efectos secundarios y conecta los módulos.

La modularización es progresiva para reducir el riesgo de regresiones: ya están extraídas las utilidades de dominio, la persistencia, el modelo del estado, el motor y los analizadores; las vistas, eventos y la integración TMDB siguen siendo áreas de migración. No se debe añadir otra funcionalidad de producto hasta completar esa migración por responsabilidades y añadir pruebas de los límites.

## Estado y privacidad

El perfil personal continúa guardándose en el navegador mediante IndexedDB cuando existe, con fallback a localStorage. No hay sincronización de perfil con un servidor. La credencial opcional de TMDB se mantiene en el navegador. Exportar una copia sigue siendo importante porque borrar los datos del sitio puede eliminar el perfil.

No se deben incluir historiales personales, credenciales, copias privadas ni notas reales en el repositorio, especificaciones, logs o CI. Las pruebas utilizan datos sintéticos.

## Catálogo y recomendador

Los registros se normalizan por funciones de dominio compartidas. El motor recibe proveedores de valoraciones, búsqueda de películas, características y validación, lo que permite probar el perfil y la evaluación sin DOM ni almacenamiento. Las predicciones siguen limitadas de 1 a 10, dan mayor influencia a los géneros que a etiquetas aisladas y exponen cobertura/confianza según las señales disponibles. La evaluación leave-one-out respeta IDs TMDB de remakes y compara MAE con la media del pliegue de entrenamiento; sigue siendo una métrica experimental.

## TMDB

TMDB es opcional y se consulta desde el navegador tras configurar una credencial. Las imágenes y metadatos pueden depender de recursos alojados por TMDB. No se realizan llamadas autenticadas a TMDB durante las pruebas ordinarias.

## GitHub Pages y caché

Los módulos usan rutas relativas para funcionar bajo el subdirectorio `/Prisma/`. El documento carga `app.js` como ES module. El service worker mantiene una caché identificada por versión, incluye la entrada y sus módulos locales, y borra versiones antiguas. Al modificar JS, hay que actualizar la URL versionada de la entrada, el inventario de recursos, el número de caché y la verificación Playwright.

## Restricciones

- Mantener el despliegue estático y evitar un proceso de compilación mientras los módulos nativos sean suficientes.
- No cambiar formatos personales ni algoritmo en un refactor de arquitectura.
- Todo límite modular importante debe estar protegido por pruebas automatizadas; las pruebas deben invocar APIs públicas, no extraer código por marcadores textuales.
