# Requisitos delta: importación del reto diario

## ADDED Requirements

### Requirement: Procedencia de fechas en el historial Android v2

Prisma DEBE reconocer la exportación de reto mediante su metadato Android v2 y la entrada inicial `Source Code` (TMDB 45612) el día local 15 de enero de 2026. Debe mantener `addedAt` y la marca temporal original, asignar por separado la confianza de la fecha de visionado y excluir las fechas anteriores al reto como fechas reales no confirmadas.

#### Scenario: Reimportación con fechas previas retrospectivas

- DADO un estado local con una marca `action-time` anterior y una nueva importación que la clasifica como `pre-streak-unverified`
- CUANDO Prisma mezcla ambas entradas
- ENTONCES retira la marca antigua de visionado, conserva el dato original de incorporación y respeta cualquier fecha `user-confirmed`

#### Scenario: Reimportación de una fecha fiable que corrige un dato local antiguo

- DADO un estado local que contiene una fecha conflictiva para una película durante el reto
- Y la exportación Android v2 reconocida contiene la marca original de esa película con confianza `streak-confirmed`
- CUANDO se vuelve a importar el archivo
- ENTONCES Prisma prevalece la marca del archivo verificado sobre la fecha en caché, calcula el día en `America/Panama` y mantiene una sola entrada de la película
