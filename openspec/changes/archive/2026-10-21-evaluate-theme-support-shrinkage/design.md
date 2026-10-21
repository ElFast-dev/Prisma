# Diseño: comparación de regularización por soporte de temas

## Modelo
`buildProfile(trainingRatings, options)` admite una opción explícita `themeSupportShrinkage`. Cuando se activa, los pesos de características `tema:` se atenúan por `support / (support + 2)` después del cálculo base. La opción no se utiliza al construir el perfil normal de la aplicación ni al predecir las recomendaciones activas.

## Evaluación emparejada
En `evaluateModel`, para cada valoración válida:
1. Se prepara el mismo conjunto leave-one-out de entrenamiento y la misma película retenida.
2. Se calcula la predicción base y la predicción experimental regularizada a partir del mismo pliegue.
3. Se calcula el MAE de ambas listas de predicciones y `themeShrinkageDelta = baseMAE - shrinkageMAE`. Un valor positivo favorece la variante experimental en esta muestra; cero o negativo no justifican activarla.

Se mantienen los indicadores actuales (MAE base, media de entrenamiento y ablación de década). En menos de cinco registros, la nueva métrica es `null`.

## Interfaz y privacidad
El Laboratorio muestra el MAE experimental y la diferencia contra la base, avisando de que no cambia las recomendaciones actuales y que una diferencia descriptiva no demuestra significación estadística. El informe JSON contiene únicamente métricas agregadas, recuento de muestra y constante usada; nunca filas de películas ni residuos individuales. El informe se genera localmente, bajo demanda, y sigue siendo revisable antes de compartirlo.

## Compatibilidad
Se preservan los formatos de datos personales. No se modifican los pesos activos, la función de ranking, el catálogo, TMDB ni las recomendaciones visibles. Actualizar la versión de entrada, el inventario/caché PWA y las expectativas de versiones en pruebas. Mantener la aplicación sin dependencias de ejecución.
