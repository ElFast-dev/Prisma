# Propuesta: profundizar la búsqueda del límite inferior de alpha Ridge

## Motivación

Un informe local agregado reciente indica que el mínimo de la rejilla extendida sigue siendo elegido con frecuencia por la selección interna basada en MAE. La elección por ranking apunta a otro rango, por lo que el límite inferior aún no está resuelto y una mejora de MAE no basta para adoptar Ridge. Las cifras específicas del historial personal deben permanecer en el navegador y no se guardarán en el repositorio.

## Objetivo

Ampliar la rejilla diagnóstica extendida de 18 a 22 valores, añadiendo cuatro anclajes inferiores: `1e-9`, `3e-9`, `1e-8` y `3e-8`. La selección seguirá siendo anidada, reproducible y aislada del modelo de producción.

## Alcance

- Mantener intacta la rejilla histórica de 14 valores para las llamadas que no soliciten la variante extendida.
- Propagar la rejilla de 22 valores por selección interna, escala relativa, conteos, estado de límite e informe v14.
- Usar MAE y nDCG@5 como criterios independientes de selección interna; reservar los pliegues exteriores para la comparación emparejada final.
- Conservar la tolerancia numérica Cholesky en `1e-12`; no incluir alpha cero ni aceptar candidatos con ajuste numérico inválido.
- Actualizar pruebas, OpenSpec, versión identificadora de la aplicación, importaciones y caché PWA.

## Reglas no negociables

- `additive-content-baseline` continúa como único recomendador de producción.
- Las métricas exteriores nunca seleccionan alpha o lambda.
- No activar Ridge por una mejora de MAE si el ranking no mejora de manera emparejada y consistente.
- No guardar en el repositorio títulos, IDs, valoraciones, conteos personales ni otros resultados del informe local.

## Criterios de aceptación

1. La rejilla extendida contiene exactamente 22 valores positivos, finitos, únicos y ordenados; el mínimo es `1e-9` y la rejilla histórica se conserva íntegra.
2. Cuando no se solicita la opción extendida, el evaluador usa la rejilla histórica de 14 valores.
3. La selección MAE y nDCG@5 usa solo particiones internas derivadas del entrenamiento exterior y la escala relativa usa escalas internas de entrenamiento.
4. El informe v14 conserva la rejilla completa de 22 valores y sus conteos de selección sin exponer datos personales.
5. SDD/calidad, pruebas Ridge y Playwright escritorio/móvil pasan antes de integrar.
