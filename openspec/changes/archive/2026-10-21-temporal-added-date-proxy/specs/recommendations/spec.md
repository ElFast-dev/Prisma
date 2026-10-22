# Requisitos delta: proxy temporal optativo

## ADDED Requirements

### Requirement: Proxy exploratorio opt-in para fechas de incorporación

Prisma DEBE mantener el modo temporal normal limitado a fechas `watchedAt` válidas. Puede permitir que la persona active explícitamente `addedAt` como proxy exploratorio para registros de colección importada. El proxy DEBE estar desactivado por defecto, DEBE contar esas filas como no verificadas y DEBE mantener intacto `watchedAt`.

#### Scenario: Modo predeterminado sin fechas de visionado

- DADO un registro con `addedAtSource = "imported-collection"` pero sin `watchedAt`
- CUANDO la persona no activa el proxy
- ENTONCES la fecha de incorporación no participa en la evaluación temporal

#### Scenario: Modo exploratorio con opt-in

- DADO un registro de la lista de vistas importada que tiene `addedAt` y el marcador `imported-collection`
- CUANDO la persona activa el proxy en el Laboratorio y vuelve a evaluar
- ENTONCES la evaluación puede usar esa fecha como proxy no verificado, mantiene los recuentos de procedencia y etiqueta el resultado como exploratorio

#### Scenario: Fecha explícita prevalece

- DADO que la valoración o su registro de visionado contiene `watchedAt` explícito
- CUANDO está activo el proxy de fecha de incorporación
- ENTONCES la fecha explícita prevalece y la fecha añadida no la reemplaza

#### Scenario: Las fechas guardadas no se alteran

- DADO que la persona activa o desactiva el proxy
- CUANDO Prisma vuelve a evaluar o exporta el diagnóstico
- ENTONCES no crea ni modifica `watchedAt`, no modifica las recomendaciones activas y exporta únicamente agregados
