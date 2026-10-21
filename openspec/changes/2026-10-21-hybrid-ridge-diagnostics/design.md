# Diseño: evaluación de mezcla híbrida fija

## Diseño de cálculo

Para cada candidata del pliegue externo, el modelo aditivo se entrena solo con el conjunto de entrenamiento de ese pliegue. Ridge mantiene la selección de `alpha` en sus pliegues internos. Después de generar ambas predicciones para la misma candidata, se calcula:

`hybrid = clamp((additivePrediction + ridgePrediction) / 2, 1, 10)`

El 50/50 es una decisión previa e invariable del experimento; la puntuación real de la candidata retenida no participa en la mezcla ni en la elección de `alpha`.

## Evaluación del ranking

La mezcla, Ridge y la base aditiva reciben candidatas comunes por pliegue. Se conserva la función de ranking compartida para Equilibrado, Más afines y Más variedad. nDCG@5 calcula la relevancia graduada a partir de las notas retenidas solo después de ordenar los resultados; tales notas no se pasan como características de ranking. Los contadores por modo clasifican cada pliegue válido como victoria, empate o derrota de la mezcla respecto al aditivo.

La validación primaria conserva cinco pliegues y la agregada conserva tres repeticiones deterministas de cinco pliegues. La comparación temporal no mostrará resultados del híbrido, dado que esta tarea no incorpora un nuevo experimento temporal.

## Datos y privacidad

Se amplía el objeto de resultado del experimento Ridge con MAE, diferencias y estabilidad del híbrido. El serializador de diagnóstico eleva el esquema a v7 y solo acepta agregados numéricos. No se pasa al serializador el perfil bruto, las candidatas, los registros de notas ni fechas personales. Los labels de señales continúan siendo opcionales bajo la elección explícita existente.

## Presentación y producción

El Laboratorio muestra MAE, estabilidad y nDCG@5 del híbrido junto a los valores aditivo/Ridge. Los resultados indican que son métricas descriptivas; no son garantía de gusto futuro ni prueba de significación estadística. El motor de producción, getRecommendations y los pesos aditivos no se modifican. No se guarda ningún peso ni se activa automáticamente el híbrido.

## Caché

Se incrementan las versiones de los módulos Ridge, informe de diagnóstico y vista del Laboratorio; se versiona la entrada de la aplicación y se incrementa el shell cache para invalidar clientes con recursos antiguos.
