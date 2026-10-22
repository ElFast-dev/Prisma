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


### Requirement: Fecha de valoración separada de fecha de visionado

Prisma NO DEBE utilizar `rA`, `updatedAt` ni la fecha de incorporación (`addedAt`) como sustitutos de un timestamp explícito de visionado. La ficha y la colección solo DEBEN mostrar una fecha de visionado a partir de `watchedAt` explícito; al formatearlo se DEBE usar el día calendario de `America/Panama`. Si no existe una fecha explícita, Prisma DEBE indicar que la fecha no está registrada.

#### Scenario: Valoración posterior al visionado

- DADO un registro cuya película se vio el 20 de octubre y cuya valoración se guardó el 21 de octubre
- CUANDO se abre la ficha o el historial de la película
- ENTONCES Prisma muestra el 20 de octubre como día de visionado y nunca usa la fecha de valoración como sustituto

#### Scenario: No hay timestamp explícito de visionado

- DADO un registro que contiene `addedAt` o `updatedAt`, pero no `watchedAt`
- CUANDO Prisma muestra la fecha dentro de una película o en una fila del historial
- ENTONCES indica que el visionado no tiene fecha registrada en lugar de inventar una a partir de otro evento
