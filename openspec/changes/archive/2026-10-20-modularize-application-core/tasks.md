# Tareas de modularización

## SDD y arquitectura
- [x] Documentar los límites de módulos, el alcance y las rutas estáticas que deben conservarse.
- [x] Añadir el requisito permanente de modularidad y validación automatizada de los límites.

## Extracción de núcleo
- [x] Aislar los formateadores y fragmentos de presentación reutilizables del controlador principal.
- [x] Extraer derivación, identidad y filtrado de colecciones a un módulo con dependencias explícitas.
- [x] Separar la combinación del catálogo, identidad y estadísticas en un módulo con acceso al estado por dependencias.
- [x] Extraer utilidades puras de película e identidad.
- [x] Extraer almacenamiento local manteniendo IndexedDB y fallback a localStorage.
- [x] Extraer el motor de recomendaciones y evaluación mediante inyección de dependencias.
- [x] Extraer lectores de CSV/TSV y funciones puras de interpretación/mezcla de JSON personal.
- [x] Extraer el cliente HTTP de TMDB y el mapeo de sus respuestas.
- [x] Añadir pruebas sintéticas para autenticación, errores HTTP y normalización de respuestas TMDB.
- [x] Actualizar `app.js` para importar módulos y conservar la composición y el comportamiento existentes.

## Calidad y publicación
- [x] Extraer el servicio de detalle de películas y personas de TMDB.
- [x] Separar el estado y control de modales de los componentes visuales.
- [x] Separar la clasificación de recomendaciones y estadísticas del coordinador.
- [x] Extraer persistencia de estado, eventos y notificaciones al módulo de runtime.
- [x] Extraer la navegación y el arranque a un módulo de ciclo de vida.
- [x] Separar la limpieza de caché y sincronización de metadatos del historial a un módulo de integración.
- [x] Separar las búsquedas remotas y la carga diferida de metadatos TMDB en otro módulo.
- [x] Separar las vistas de búsqueda, atribución y sincronización de TMDB del controlador principal.
- [x] Aislar el guardado, prueba y retirada de la credencial TMDB en su propio módulo de acciones.
- [x] Extraer los listeners globales y delegación de acciones a un módulo de eventos con dependencias explícitas.
- [x] Separar la orquestación de importación, exportación, restauración y restablecimiento del coordinador de la aplicación.
- [x] Extraer las acciones de valoración y gestión de listas en un módulo con acceso explícito al estado.
- [x] Extraer renderizadores de fichas, personas, puntuaciones y paneles auxiliares del controlador principal.
- [x] Extraer renderizadores de páginas y componentes de colección a un módulo de vistas con dependencias explícitas.
- [x] Reescribir pruebas de importación y recomendación para llamar a las APIs de módulos en lugar de extraer código fuente por texto.
- [x] Añadir prueba de arquitectura modular a CI y requerir sus artefactos en el validador SDD.
- [x] Actualizar `index.html`, service worker y pruebas de versiones/caché para ES modules.
- [x] Actualizar documentación de arquitectura y política SDD.
- [x] Añadir diagnóstico del contenido de arranque y errores de consola a la prueba UI para localizar regresiones al cargar ES modules.
- [x] Eliminar las implementaciones duplicadas del controlador modal y validar que la navegación/puntuación usen la API extraída.
- [x] Enlazar `fetch` al contexto del navegador al inyectarlo en el ciclo de vida.
- [x] Probar la construcción de los factories extraídos de TMDB para detectar exports que dependen de funciones locales.
- [x] Ejecutar la validación SDD, las pruebas funcionales y la verificación Playwright de escritorio/móvil sobre la vista previa del PR.
- [x] Tras la fusión, verificar GitHub Pages publicado en escritorio y móvil y registrar el resultado final.
- [x] Archivar el expediente al cumplir los criterios de aceptación.


## Verificación final del expediente

- [x] SDD y calidad estática en el commit integrado: https://github.com/ElFast-dev/Prisma/actions/runs/39511497069
- [x] Validación de Prisma en el commit integrado: https://github.com/ElFast-dev/Prisma/actions/runs/39511496845
- [x] Despliegue de GitHub Pages: https://github.com/ElFast-dev/Prisma/actions/runs/39511496883
- [x] Playwright sobre la web publicada, escritorio y móvil: https://github.com/ElFast-dev/Prisma/actions/runs/39511532497
- [x] Commit integrado comprobado en `main`: `ff4e2174f64d3034039010ac3dc7b635a164e6b4`
