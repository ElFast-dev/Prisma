# Diseño: identidad de colección con título y año

## Decisión

La candidata pasa `movie.year` a `isMovieInCollection(title, tmdbId, year)`. El modelo de colección conserva ese año al consultar historial, pendientes y ocultos y delega la comparación en las funciones compartidas de identidad.

## Reglas de resolución

1. Cuando hay IDs TMDB conocidos, la identidad TMDB prevalece; títulos iguales no fusionan películas con IDs distintos.
2. Para una fila heredada sin ID, el título normalizado y un año fiable permiten resolver la coincidencia contextual.
3. Si el título coincide pero el año conocido difiere, la fila heredada no debe excluir la candidata como si fuera la misma película.
4. No se completan fechas ni metadatos por inferencia y no se reescriben datos guardados.

## Compatibilidad

El cambio mantiene la firma pública del ranking y limita el ajuste al contexto inyectado del modelo de colección. Se actualizan las versiones de `app.js`, `ranking.js`, `collection-model.js` y la caché PWA para evitar que el navegador mezcle módulos antiguos y nuevos.

## Verificación

Pruebas sintéticas cubren la exclusión de una candidata si una fila heredada comparte título y año, la conservación de un remake de otro año, la identidad TMDB y la coexistencia con el guard de perfil vacío.
