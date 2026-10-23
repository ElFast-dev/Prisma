# Propuesta: excluir películas guardadas por identidad contextual

## Contexto

El recomendador descarta películas ya valoradas, vistas, pendientes u ocultas. Algunas colecciones pueden contener registros heredados sin ID TMDB; si se compara únicamente por título, una película homónima o un remake puede quedar excluido por error. Las candidatas que llegan de TMDB sí pueden aportar un año fiable.

## Objetivo

Propagar el año de cada candidata hasta el modelo de colección y resolver las coincidencias de forma conservadora: el ID TMDB mantiene la prioridad y el año sirve para desambiguar registros sin ID. Una película de otro año no debe desaparecer solo por compartir título.

## Alcance

- Pasar el año desde el ranking a la comprobación de historial, pendientes y ocultos.
- Reutilizar las funciones existentes de identidad, sin introducir una segunda regla paralela.
- Añadir regresiones para registros heredados sin ID y remakes de distinto año.
- Actualizar la especificación permanente y las URLs versionadas/caché afectadas.

## Fuera de alcance

- No cambiar pesos, predicciones ni modos de recomendación.
- No inventar metadatos TMDB ni añadir películas al catálogo o a las colecciones.
- No modificar valoraciones, fechas personales, esquema persistido ni almacenamiento.
