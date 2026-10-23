# Propuesta: extraer el kernel numérico de Ridge

## Problema

`js/recommendations/ridge-evaluation.js` aún contiene las operaciones numéricas de soporte para el experimento Ridge: escalado y vectorización de características, producto interno, kernel de similitud, resolución por Cholesky, entrenamiento y predicción. Estas rutinas puras están mezcladas con particiones de validación, agregación de métricas, ranking y evaluación temporal.

## Cambio

- Extraer las operaciones numéricas a `js/recommendations/ridge-kernel.js`.
- Mantener `createRidgeRecommendationExperiment(dependencies)` y todos los resultados de MAE, nDCG, estabilidad, alpha seleccionado y walk-forward sin cambios.
- Fijar con una regresión determinista las escalas por familia, el kernel, coeficientes y predicciones sintéticas.
- Versionar import, módulo, shell PWA y precaché coordinada.
