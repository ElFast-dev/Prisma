# Diseño: proxy temporal opcional de fecha de incorporación

## Modelo de datos

El importador conserva `raw.a` como `addedAt`. Para las entradas vistas importadas, añade el marcador local `addedAtSource: "imported-collection"` para distinguir esta fecha de otras fechas añadidas. No crea ni modifica `watchedAt`.

## Evaluación

`ridge-evaluation.js` mantiene su comportamiento por defecto. Solo si el inyector `getUseCollectionAddedAtProxy()` devuelve `true` puede leer `addedAt` de registros marcados `imported-collection`. La fecha explícita `watchedAt` o `user-confirmed` tiene prioridad. Las fechas derivadas de `addedAt` siempre se cuentan como no verificadas y fuerzan la etiqueta exploratoria.

## Interfaz

El panel temporal contiene un selector explícito, desactivado por defecto. Alternar el selector limpia el resultado temporal previo y solicita una nueva evaluación; no cambia el catálogo ni la puntuación de ninguna película. El texto de ayuda deja claro que la incorporación a la lista no certifica la fecha real del visionado.

## Privacidad y diagnóstico

El informe `prisma-recommendation-diagnostics/v9` incluye únicamente `dateSourceMode` (`watchedAt-only` o `collection-added-proxy`) junto con sus agregados ya permitidos. Nunca exporta fechas concretas, títulos, IDs ni predicciones individuales.
