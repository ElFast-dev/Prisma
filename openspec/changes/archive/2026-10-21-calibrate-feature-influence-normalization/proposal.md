# Propuesta: calibrar la normalización de influencia

## Contexto

La predicción aditiva divide cada señal coincidente por el total de características de la candidata. Esto conserva una penalización por características sin evidencia, pero también puede atenuar demasiado coincidencias útiles cuando una película tiene metadatos abundantes.

## Objetivo

Añadir al Laboratorio un experimento local que compare el denominador actual con una normalización intermedia que conserva una penalización de cobertura y un control exploratorio que solo divide por características coincidentes.

## Variantes

- \`mean\`: denominador igual al total de características. Control idéntico al modelo actual.
- \`coverage-sqrt\`: denominador igual a la raíz cuadrada del producto entre características totales y coincidentes. Conserva una penalización por baja cobertura.
- \`matched-only\`: denominador igual al número de características coincidentes. Control diagnóstico superior, sin penalización por metadatos no conocidos.

## Criterios de aceptación

1. Las tres variantes usan las mismas valoraciones retenidas y los mismos cinco pliegues deterministas.
2. Cada perfil de entrenamiento excluye las valoraciones del pliegue probado.
3. Se informan MAE, estabilidad por pliegue y nDCG@5 por cada modo cuando se satisface la muestra mínima.
4. La variante \`mean\` reproduce el comportamiento actual por defecto.
5. Ninguna variante experimental altera las recomendaciones de producción.
6. El diagnóstico compartido contiene solo métricas agregadas y no incluye películas, IDs ni predicciones individuales.
