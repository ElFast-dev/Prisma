# Propuesta: comparar la calidad del ranking por modo

## Contexto

El Laboratorio ya calcula nDCG@5 con las notas personales retenidas y mide la diversidad de géneros en las recomendaciones actuales. Sin embargo, la métrica anterior usaba un orden global por puntuación predicha y no invocaba los tres algoritmos reales de ranking, por lo que no permitía comparar directamente Equilibrado, Más afines y Más variedad.

## Objetivo

Calcular nDCG@5 por modo usando idénticos pliegues de validación, perfiles de entrenamiento y conjuntos de candidatas retenidas, reutilizando la misma función de ranking que emplea Descubrir.

## Alcance

- Exponer una función de ranking pura y reutilizable sin cambiar el orden de producción.
- Medir nDCG@5 por separado para los tres modos.
- Mostrar los resultados en Laboratorio y conservar el diagnóstico Jaccard de la lista actual por separado.
- Añadir pruebas de igualdad de candidatas, determinismo y prevención de fuga de valoraciones.

## Fuera de alcance

No se cambian pesos, fórmulas, exclusiones, preferencias de los modos ni el catálogo personal. La evaluación sigue siendo local y experimental; no se considera prueba de satisfacción ni de significación estadística.
