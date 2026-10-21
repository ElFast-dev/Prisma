# Propuesta: evaluar la regularización de temas poco respaldados

## Contexto
El informe real de Prisma muestra 3.026 señales temáticas, de las cuales 2.020 tienen una sola observación y 1.006 aparecen al menos dos veces. El motor actual calcula el peso de cada tema con una fórmula suavizada por un término constante pequeño, pero no compara explícitamente esa línea base con una alternativa que reduzca el peso de temas sostenidos por muy pocas películas.

## Objetivo
Implementar un experimento local y reproducible de regularización por soporte para las señales `tema:`, comparando la predicción base con la alternativa sobre exactamente las mismas películas retenidas y particiones leave-one-out. Exponer MAE y diferencia en el Laboratorio y en el informe de diagnóstico para poder decidir con los datos reales si la alternativa es mejor.

## Reglas
- La variante experimental multiplica el peso de un tema por `n / (n + 2)`, donde `n` es el número de valoraciones de entrenamiento que respaldan ese tema.
- Géneros y décadas no cambian en este experimento; la línea base actual no cambia.
- La regularización queda en modo diagnóstico: las recomendaciones activas siguen usando el modelo base hasta que una comparación real justifique cambiarlo.
- Ambas variantes deben usar exactamente el mismo conjunto de registros retenidos, y cada perfil se entrena solo con los demás registros.
- Se informa de forma agregada; no se exportan títulos, IDs ni errores por película.
- Muestras inferiores a cinco registros se presentan como no disponibles.

## Fuera de alcance
- No cambiar la puntuación activa ni los pesos de género, tema o década.
- No entrenar un modelo nuevo ni añadir dependencias.
- No seleccionar automáticamente el parámetro de regularización a partir de la misma muestra de evaluación.
