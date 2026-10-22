# Diseño: experimento de normalización de influencia

## Arquitectura

La opción \`influenceNormalization\` es leída por \`predictRating\`. Si está ausente, se conserva la división actual por total de características. Los modos alternativos solo se pasan desde el evaluador experimental, nunca desde el ranking de producción.

El módulo puro \`js/recommendations/normalization-evaluation.js\` inyecta fuentes, perfil, predictor y ranker. Crea los mismos cinco pliegues deterministas de la evaluación de ranking, excluye cada pliegue al entrenar, puntúa candidatos con cada variante y compara MAE por muestra y nDCG@5 por modo. La variante base se ejecuta en el mismo ciclo para que las diferencias estén emparejadas.

## Interpretación

La raíz geométrica del producto total×coincidencias equivale a penalizar la fracción de cobertura por su raíz cuadrada. Es una hipótesis, no un resultado de mejora garantizado. \`matched-only\` es un control para revelar cuánto cambia el comportamiento si se elimina esa penalización y no debe considerarse como recomendación por defecto.

El resultado se calcula solo al solicitarlo, permanece en memoria y no modifica datos personales ni las recomendaciones activas. El informe compartible incluye únicamente agregados.
