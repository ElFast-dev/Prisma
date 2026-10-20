# Diseño: ocultación compatible con identidad TMDB

## Decisión

Reutilizar `isHidden(title, tmdbId)` dentro de `filterCatalog` en lugar de construir un conjunto de títulos normalizados ocultos. Esa función ya compara registros mediante `sameMovieRecord`: cuando ambos registros tienen ID TMDB compara esos IDs; solo utiliza el título como alternativa cuando falta una identidad fiable.

## Implementación prevista

1. En el expediente SDD, documentar el caso límite y los criterios reproducibles.
2. Sustituir el filtro por título de `filterCatalog` por la consulta de ocultación basada en identidad.
3. Ampliar la prueba de navegador de catálogo CSV: abrir la ficha del ID 990001, ocultarla y comprobar que el catálogo filtrado muestra únicamente el ID 990002 con el mismo título.
4. Actualizar `openspec/specs/catalog/spec.md` con un escenario de aceptación específico una vez que la prueba pase.
5. Ejecutar los workflows de calidad y UI, registrar sus URLs y revisar el diff antes de integrar.

## Riesgos y compatibilidad

- Los registros sin ID TMDB se siguen comparando por título mediante la función común ya usada por Colección.
- No se transforman ni eliminan registros guardados; solo cambia cómo el catálogo determina la visibilidad de cada identidad.
- La prueba usa IndexedDB aislada de Playwright y nombres sintéticos; no toca el almacenamiento del dispositivo del usuario ni llama a TMDB.
