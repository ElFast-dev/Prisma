# Evaluación de ranking por modo

## ADDED Requirements

### Requirement: nDCG comparable para cada modo de recomendación

La evaluación DEBE calcular nDCG@5 por separado para Equilibrado, Más afines y Más variedad sobre idénticas candidatas retenidas, particiones y perfiles de entrenamiento. Las notas retenidas DEBEN quedar fuera del perfil usado para puntuar las candidatas.

#### Scenario: Las variantes reciben candidatas equivalentes

- DADO un pliegue determinista de películas retenidas con características disponibles
- CUANDO se calcula el nDCG@5 de cada modo
- ENTONCES las tres variantes reciben las mismas identidades de película y usan el mismo perfil de entrenamiento

#### Scenario: Se utiliza la lógica de producción

- DADO un conjunto de candidatas retenidas con puntuación prevista
- CUANDO se evalúa un modo
- ENTONCES se utiliza la función `rankCandidates` que también aplica Descubrir, no una implementación duplicada del ranking

#### Scenario: Métrica no disponible

- DADO que no se cumplen los mínimos de muestra
- CUANDO se muestra el Laboratorio
- ENTONCES cada modo informa que la medición no está disponible sin presentar un cero inventado

#### Scenario: Diversidad independiente del ranking offline

- DADO que se calcula el nDCG sobre películas valoradas retenidas y Jaccard sobre las listas actuales
- CUANDO el Laboratorio muestra ambas medidas
- ENTONCES las mantiene como diagnósticos separados y explica que usan conjuntos de candidatas distintos
