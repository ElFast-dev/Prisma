# Propuesta: dividir los paneles del Laboratorio

## Problema

Aunque el Laboratorio ya tiene módulo propio, `js/ui/lab-views.js` conserva aproximadamente 44 KB de marcado para validación Ridge repetida, normalización, diagnóstico y evaluación temporal. Ridge y el análisis walk-forward temporal tienen superficies, textos, acciones y pruebas específicas que pueden mantenerse en módulos separados.

## Cambio

- Mover `renderRidgeExperimentPanel` a `js/ui/lab-ridge-view.js`.
- Mover `renderTemporalRidgePanel` a `js/ui/lab-temporal-view.js`.
- Mantener `createLabViews(ctx)`, `renderLab` y las acciones del Laboratorio sin cambios de API.
- Actualizar URLs versionadas, precaché PWA, pruebas de arquitectura/evaluación y documentación.
