## ADDED Requirements

### Requirement: Evaluación offline de la calidad del orden

Prisma DEBE medir de forma experimental el orden de las películas valoradas retenidas usando nDCG@5 y pliegues de prueba que no participan en la creación del perfil usado para predecirlas. La evaluación DEBE indicar el tamaño de la muestra y DEBE permanecer no disponible cuando haya menos de 50 registros únicos con características o menos de 10 notas relevantes (7 o más). Los empates no DEBEN resolverse usando la nota retenida.

#### Scenario: Perfil sin la nota de prueba

- DADO un historial con suficientes valoraciones enlazadas
- CUANDO Prisma evalúa el ranking en un pliegue
- ENTONCES las notas del pliegue retenido no participan en el perfil y los candidatos de prueba se ordenan por la predicción, sin usar su nota real para desempatar

#### Scenario: Muestra insuficiente para top cinco

- DADO que existen menos de 50 películas únicas con características o menos de 10 valoraciones con nota 7 o superior
- CUANDO se abre el Laboratorio
- ENTONCES el nDCG@5 se presenta como no disponible e informa los contadores y el mínimo requerido

#### Scenario: Nota relevante ordenada correctamente

- DADO un conjunto de prueba en el que el orden previsto coincide con el orden de relevancia graduada de las notas
- CUANDO se calcula nDCG@5
- ENTONCES la métrica alcanza 1 dentro del margen numérico de precisión

### Requirement: Diagnóstico de diversidad de género de las listas

Prisma DEBE describir la diversidad por géneros de las listas top cinco de Equilibrado, Más afines y Más variedad usando la disimilitud Jaccard media entre pares comparables. El diagnóstico DEBE informar el tamaño de lista, pares comparables y géneros distintos, y NO DEBE presentarse como una medida de serendipia ni de satisfacción de la persona.

#### Scenario: Comparación de los modos

- DADO un catálogo con candidatos y metadatos de género
- CUANDO se abre el Laboratorio
- ENTONCES se informa la disimilitud de género de los primeros cinco resultados de cada modo sin cambiar sus puntuaciones

#### Scenario: Lista sin suficientes géneros

- DADO que hay menos de dos películas con géneros comparables en la lista
- CUANDO se calcula el diagnóstico de diversidad
- ENTONCES la métrica se muestra como no disponible e informa que faltan metadatos comparables
