# Propuesta: investigar la escala relativa de regularización Ridge

## Motivación

El cambio `2026-10-23-expand-ridge-alpha-grid` amplió la rejilla a 14 valores positivos, pero dejó pendiente la evaluación con el historial enriquecido. El diagnóstico agregado v14 facilitado para esta investigación muestra una tensión relevante: MAE favorece el extremo inferior, mientras que la selección por ranking prefiere regularizaciones mayores. El menor error de nota no ha implicado una mejora consistente del ranking frente a `additive-content-baseline`.

No se debe asumir que un alpha menor es mejor, ampliar otra vez la rejilla sin evidencia, ni modificar el recomendador activo.

## Objetivo

1. Medir en cada partición exclusivamente de entrenamiento la escala de la diagonal de su kernel centrado y la relación `alpha / escala`.
2. Comparar, sobre las mismas particiones interiores y exteriores, la selección por MAE y por ranking con alpha absoluto frente a lambda relativo a la escala del kernel. La rejilla lambda se deriva de la mediana de las escalas medidas en los entrenamientos interiores de cada pliegue exterior.
3. Reportar escala, regularización efectiva, resultados emparejados, cobertura, estabilidad numérica, límites seleccionados y métricas no disponibles en el informe diagnóstico.
4. Mantener la investigación aislada y reproducible, con datos sintéticos en CI y datos personales solo en el navegador local.

## Alcance

- Reutilizar `ridge-kernel.js`, `ridge-evaluation.js` y `ridge-alpha-selection.js` sin introducir un camino hacia producción.
- Añadir utilidades puras para medir escala y transformar lambda en alpha efectivo.
- Comparar las dos estrategias de selección (MAE y ranking) de la rejilla absoluta con las dos estrategias relativas.
- Ampliar los tests del contrato del diagnóstico v14 y las pruebas de regresión.
- Conciliar la tarea pendiente A11 del expediente de ampliación de rejilla sin declarar cerrada la evaluación personal mientras falte el informe reproducible local.

## Límites no negociables

- `additive-content-baseline` y sus pesos siguen siendo el único modelo activo.
- Ninguna nota del pliegue exterior participa en selección, normalización de escala ni definición de la rejilla lambda.
- Cada ajuste multiplica lambda por la escala estimada únicamente sobre su propio conjunto de entrenamiento.
- La escala de referencia se obtiene exclusivamente de escalas de los entrenamientos interiores pertenecientes al entrenamiento exterior; nunca usa el pliegue exterior retenido.
- Los candidatos absolutos mantienen alpha positivo; no se introduce alpha cero como atajo.
- Las tres repeticiones reutilizan el mismo historial y se interpretan descriptivamente, no como muestras independientes.
- El informe no contiene títulos, IDs de películas, notas individuales, vectores, predicciones por película ni etiquetas concretas de características.
- No se publica una selección Ridge ni se cierra ningún expediente si los gates obligatorios fallan.

## Criterios de aceptación

1. Se documenta la definición exacta de escala, sus agregados y el cociente alpha/escala usando exclusivamente kernels de entrenamiento.
2. El experimento relativo compara exactamente las mismas particiones 3x5 exteriores y tres interiores que el método absoluto.
3. El informe incluye métricas emparejadas de MAE y nDCG@5 para equilibrado, más afines y más variedad, por criterio de selección, además de victorias/empates/derrotas, cobertura y fallos.
4. Las pruebas demuestran que la escala no observa los pliegues de validación/test correspondientes, el resultado es determinista y se mantienen cancelación y progreso asíncrono.
5. Si la escala es degenerada, la factorización es inestable o no hay evidencia consistente de mejor ranking, el resultado queda no disponible o solo documentado; no se cambia producción.
6. Se ejecutan los gates de calidad/SDD y Playwright en escritorio y móvil. La falta de un gate se documenta como bloqueo, nunca como éxito.
