# Propuesta: preservar identidad TMDB en la importación CSV

## Estado

Implementado y verificado automáticamente. Pendiente de revisión de la PR; no se archivará antes de su aceptación.

## Problema observado

El importador CSV reconoce encabezados genéricos de identificador y deduplica por título normalizado. Aunque hay columnas explícitas `tmdb_id` y `tmdbid`, el identificador no se conserva como `tmdbId`. Dos remakes con el mismo título y distintos IDs TMDB pueden perderse antes de llegar a la capa de catálogo, que sí sabe mantener IDs TMDB diferentes.

## Alcance

- Interpretar únicamente encabezados explícitos `tmdb_id` y `tmdbid` como identidad TMDB.
- Conservar IDs TMDB válidos en los registros CSV normalizados.
- Evitar deduplicar filas de una misma importación si tienen IDs TMDB distintos aunque el título sea igual.
- Fusionar el catálogo personalizado por identidad TMDB cuando exista, en vez de colapsarlo todo por título.
- Añadir una prueba de navegador con un CSV sintético con dos remakes.
- Aclarar la especificación y la limitación de archivos sin identificador TMDB.

## Fuera de alcance

- No inferir que una columna genérica `id`, `movieId` o `movie_id` contiene IDs TMDB.
- No garantizar desambiguación de remakes sin IDs TMDB.
- No cambiar el formato de respaldo, la identidad histórica ya guardada o los algoritmos de recomendación.
- No llamar a TMDB ni usar credenciales reales en las pruebas.

## Criterios de aceptación

1. Un CSV con dos filas de igual título y dos IDs TMDB positivos diferentes conserva ambas filas.
2. Los IDs TMDB y los años siguen presentes después de guardar el catálogo personalizado en IndexedDB.
3. `movieId` de MovieLens sigue siendo un identificador externo y no se promueve a TMDB.
4. La reimportación del mismo ID TMDB actualiza ese registro y no crea una segunda entrada para la misma identidad.
5. Los workflows de sintaxis/SDD, catálogo y navegador pasan.
6. La aplicación permanece funcional en GitHub Pages y las notas personales no se modifican.
