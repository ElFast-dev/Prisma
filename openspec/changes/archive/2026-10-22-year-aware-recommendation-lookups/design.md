# Diseño técnico: búsquedas del recomendador conscientes del año

## Resolución

El catálogo expone `findMovie(title, tmdbId, year)`, que prioriza un ID TMDB válido y luego usa el título normalizado con el año disponible. Las funciones que recorren valoraciones deben pasar `year`, `releaseYear` o `release_year` cuando exista, sin cambiar el fallback de las entradas antiguas incompletas.

## Puntos de integración

- Perfil activo y evaluación MAE dentro de `js/recommendations/engine.js`.
- Mapeo de valoraciones y particiones de `js/recommendations/evaluation.js`.
- Evaluaciones de normalización y Ridge del Laboratorio.
- Estadísticas por género en ranking, manteniendo el comportamiento existente.

## Regresión

Una prueba sintética crea dos películas con el mismo título, años 1998 y 2024, IDs TMDB distintos y géneros diferentes. La primera valoración no tiene ID pero sí año; la segunda tiene ID y año. El perfil debe recuperar ambas fichas y aprender pesos de signo opuesto para los dos géneros según sus notas. La búsqueda sin año debe seguir devolviendo `null` si hay más de una identidad posible.

## Compatibilidad y publicación

No se modifican datos personales ni puntuaciones activas. Se versionan los módulos actualizados, se incrementa el nombre de caché del service worker y se alinean las comprobaciones de PWA y Playwright. El modelo solo cambia qué metadatos enlaza para el mismo dato personal, no los pesos ni la fórmula de predicción.
