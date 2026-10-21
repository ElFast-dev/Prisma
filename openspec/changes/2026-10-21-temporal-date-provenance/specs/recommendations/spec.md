## ADDED Requirements

### Requirement: Procedencia de fechas en evaluación temporal

La evaluación temporal DEBE distinguir fechas de visionado importadas explícitamente, fechas generadas al registrar una acción y timestamps antiguos sin procedencia verificable. El importador NO DEBE interpretar `raw.a` (fecha de añadido) como `watchedAt`. Si existe una fecha explícita en el historial para una identidad, esta DEBE prevalecer sobre una fecha heredada sin procedencia. Los resultados que incluyan filas sin procedencia fiable DEBEN marcarse como exploratorios y compartir solo agregados.

#### Scenario: Importar colección con solo fecha de añadido

- DADO un registro que contiene `a` pero no `watchedAt` ni `watched_at`
- CUANDO se importa el historial
- ENTONCES Prisma conserva `a` como `addedAt` y no fabrica `watchedAt`

#### Scenario: Importar fecha explícita de visionado

- DADO un registro con el campo `watchedAt` o `watched_at` explícito
- CUANDO se importa el historial
- ENTONCES Prisma conserva la fecha y etiqueta la procedencia como importada explícitamente

#### Scenario: Conflicto entre fecha explícita y heredada

- DADO que una valoración tiene una marca `watchedAt` antigua sin fuente y su historial correspondiente tiene una fecha explícita
- CUANDO se prepara la muestra walk-forward
- ENTONCES prevalece la fecha explícita y la fila se cuenta como fecha de procedencia explícita

#### Scenario: Fechas heredadas

- DADO que una fila solo contiene una fecha antigua sin marcador fiable
- CUANDO se calcula la evaluación temporal
- ENTONCES puede participar solo en resultados exploratorios y los agregados distinguen esa fila de las fechas explícitas

#### Scenario: Privacidad

- DADO que se comparte el diagnóstico v6
- CUANDO incluye procedencia de fechas
- ENTONCES exporta únicamente recuentos agregados y estado de fiabilidad, nunca fechas, títulos o IDs de películas
