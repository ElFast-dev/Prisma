# Diseño: fábrica de vistas del Laboratorio

## Frontera del módulo

`createLabViews(ctx)` será propietaria de `renderRecommendationDiagnosticPanel`, `renderRidgeExperimentPanel`, `renderInfluenceNormalizationPanel`, `renderTemporalRidgePanel` y `renderLab`. También importará `summarizeRepeatedRidgeStability`, que solo utilizan esos renderizadores.

La fábrica recibe el contexto de composición existente; no busca nodos del DOM, no escribe almacenamiento y no calcula los modelos. La lógica de recomendación, experimentación y evaluación sigue residiendo en los módulos de dominio.

`createPageViews(ctx)` compone la fábrica y expone la misma función `renderLab` que consume `app.js`. Las funciones de panel que antes eran locales siguen siendo internas al módulo dedicado; no se necesita cambiar los manejadores de eventos ni el modelo de estado.

## Versiones y caché

- `js/ui/page-views.js?v=core-20261023-2`
- `js/ui/lab-views.js?v=core-20261023-1`
- `app.js?v=ui-20261023-92`
- shell PWA `prisma-shell-v103`

La caché debe incluir exactamente las URLs versionadas que utilizan `index.html`, `app.js` y `page-views.js`.
