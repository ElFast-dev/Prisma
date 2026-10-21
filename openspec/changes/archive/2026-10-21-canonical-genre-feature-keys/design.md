# Diseño: normalización canónica de características de género

## Implementación

El módulo común `js/core/movie-utils.js` conserva una tabla explícita de alias y construye un índice de búsqueda insensible a mayúsculas, diacríticos y separadores comunes. El índice devuelve el nombre de género localizado canónico. Se expone `normalizeGenreKey` para que el extractor use la misma definición sin duplicar la tabla ni la lógica de presentación.

`normalizeMovie` sigue presentando los géneros en español y deduplica después de convertir los alias a su etiqueta canónica. `movieFeatures` aplica `normalizeGenreKey` a los géneros del registro de valoración o, cuando faltan, del catálogo. No se altera la precedencia existente de las fuentes ni el tratamiento de los temas y décadas.

## Compatibilidad y privacidad

No se escriben ni migran registros personales. Las claves del perfil se regeneran en memoria cada vez que se construye el perfil, de modo que los datos históricos con géneros en inglés se benefician inmediatamente. El diagnóstico sigue compartiendo agregados; no se incorporan títulos ni filas individuales.

## Pruebas y caché

Se amplía `test-recommendation-features.mjs` con pares de fuente y alias, valores sin tilde y duplicación posterior a la traducción. Como ambos módulos están en la caché PWA, se incrementa el nombre de caché de shell y se actualizan las aserciones coordinadas. El modelo Ridge/híbrido y el ranking de producción no cambian.
