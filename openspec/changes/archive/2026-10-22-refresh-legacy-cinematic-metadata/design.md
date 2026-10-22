# Diseño técnico

TMDB puede responder a una búsqueda o una lista popular con título, géneros y póster, sin devolver créditos ni palabras clave. Por ello `tmdbFetchedAt` no demuestra que todas las familias necesarias para el recomendador hayan sido recuperadas.

## Marcadores

- `tmdbCreditsFetchedAt`: se asigna únicamente cuando la respuesta incluye arrays de reparto y equipo de créditos.
- `tmdbKeywordsFetchedAt`: se asigna únicamente cuando la respuesta incluye el bloque de palabras clave, incluso si este no contiene etiquetas.
- `tmdbFetchedAt`: continúa registrando cuándo se normalizó el conjunto de detalles.

La cola histórica exige una marca básica TMDB vigente, póster y ambas marcas especializadas vigentes para omitir una nueva petición. Los marcadores faltantes hacen que los registros antiguos se enriquezcan una vez. `enrichTMDBMovie` usa la misma regla con su ventana más corta para no omitir créditos por el mero hecho de tener etiquetas antiguas.

## Integridad

Los nuevos marcadores se preservan en el normalizador, el catálogo combinado, la ficha, la valoración y la purga de caché caducada. El refresco sigue fusionando por ID TMDB y conserva los campos personales. Las marcas son metadatos técnicos de origen; no se añaden películas remotas automáticamente a la colección.