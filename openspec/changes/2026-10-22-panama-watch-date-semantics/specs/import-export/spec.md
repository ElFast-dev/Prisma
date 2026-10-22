# Requisitos delta: importación del reto diario

## ADDED Requirements

### Requirement: Procedencia de fechas en el historial Android v2

Prisma DEBE reconocer la exportación de reto mediante su metadato Android v2 y la entrada inicial `Source Code` (TMDB 45612) el día local 15 de enero de 2026. Debe mantener `addedAt` y la marca temporal original, asignar por separado la confianza de fecha y conservar `watchedAt` para cada marca válida de `movies.cH`. Solo los registros dentro del intervalo de 280 días son `streak-confirmed`; las fechas explícitas anteriores y posteriores son `explicit-source` y no amplían la racha.

#### Scenario: Reimportación con fechas explícitas anteriores a la racha

- DADO un estado local con una marca `action-time` heredada y una nueva fila de `movies.cH` con fecha válida anterior a la racha
- CUANDO Prisma importa el Android v2 reconocido
- ENTONCES sustituye la marca heredada por la fecha explícita del historial, conserva el timestamp original y no cambia las 280 fechas confirmadas

#### Scenario: Reimportación de una fecha dentro de la racha que corrige un dato local antiguo

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
