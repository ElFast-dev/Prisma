# Requisitos delta: procedencia temporal escalable

## MODIFIED Requirements

### Requirement: Procedencia de fechas en evaluación temporal

El importador NO DEBE usar `raw.a` como fecha de visionado por defecto. La excepción delimitada es la colección `movies.cH` del Android v2 reconocido, donde cada `a` válida es la fecha explícita de visionado para toda la colección. Esos registros pueden participar en la evaluación temporal como fechas explícitas aunque estén fuera del reto de 280 días; no se permite que el reto se use como límite general del historial.

#### Scenario: Historial Android v2 fuera del reto

- DADO un registro de `movies.cH` con `a` válida antes o después del intervalo confirmado
- CUANDO se importa y se agrupan las fechas para la evaluación temporal
- ENTONCES se usa el día local de `America/Panama` derivado de `watchedAt`, sin clasificar esa fecha como un día de la racha
