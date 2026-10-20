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
- [x] Extraer renderizadores de fichas, personas, puntuaciones y paneles auxiliares del controlador principal.
- [x] Extraer renderizadores de páginas y componentes de colección a un módulo de vistas con dependencias explícitas.
- [x] Reescribir pruebas de importación y recomendación para llamar a las APIs de módulos en lugar de extraer código fuente por texto.
- [x] Añadir prueba de arquitectura modular a CI y requerir sus artefactos en el validador SDD.
- [x] Actualizar `index.html`, service worker y pruebas de versiones/caché para ES modules.
- [x] Actualizar documentación de arquitectura y política SDD.
- [ ] Ejecutar todos los checks de CI y verificar la web publicada en escritorio y móvil.
- [ ] Archivar el expediente al cumplir los criterios de aceptación.
