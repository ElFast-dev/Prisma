# Requisitos delta: fechas escalables del historial Android v2

## MODIFIED Requirements

### Requirement: Fechas de visionado en el historial Android v2 reconocido

Prisma DEBE tratar la marca `a` de cada fila de `movies.cH` como fecha explícita de visionado cuando la importación corresponde al Android v2 reconocido. La regla se aplica a todo el historial independientemente de la racha, conservando el instante original y la procedencia. Para formatos no reconocidos o las listas de pendientes/ocultos, la marca `a` NO DEBE convertirse en `watchedAt` por defecto.

#### Scenario: Fecha fuera del intervalo de la racha

- DADO que una fila válida de `movies.cH` tiene una fecha anterior al 15 de enero o posterior al 21 de octubre de 2026
- CUANDO se importa Android v2 reconocido
- ENTONCES Prisma conserva su fecha de visionado y no extiende la racha de 280 días
