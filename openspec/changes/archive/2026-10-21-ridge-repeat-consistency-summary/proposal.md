# Propuesta: resumen de consistencia por repetición de Ridge

## Problema

El Laboratorio ya muestra el resultado agrupado de 15 pliegues y los resultados de cada repetición. Sin un resumen explícito, comparar tres líneas por métrica requiere inspección manual y es fácil confundir las victorias por pliegue con la dirección del resultado agregado de cada repetición.

## Cambio propuesto

Calcular, exclusivamente a partir de los agregados ya disponibles, cuántas repeticiones favorecen a Ridge, cuántas empatan o favorecen al modelo aditivo y el rango mínimo–máximo observado de la diferencia para MAE y nDCG@5 por modo. Presentar el resumen en el Laboratorio e incluir una prueba unitaria pura para los casos disponibles y no disponibles.

## No objetivos

- No activar Ridge en las recomendaciones de producción.
- No cambiar particiones, predicciones, pesos, alpha ni métricas históricas.
- No añadir filas por película, intervalos de confianza ni pruebas de significación.
- No modificar el esquema de diagnóstico v4: los agregados por repetición necesarios ya están incluidos.
