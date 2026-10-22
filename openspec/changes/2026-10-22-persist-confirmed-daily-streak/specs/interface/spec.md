# Requisitos delta: calendario de racha diaria

## ADDED Requirements

### Requirement: Calendario de la racha confirmada

Prisma DEBE mostrar un calendario con exactamente una celda por cada fecha de la racha confirmada, del 15 de enero al 21 de octubre de 2026. Cada fecha representa un día cumplido, sin depender de cuántos títulos sigan guardados.

#### Scenario: La racha está importada

- DADO que el estado personal contiene una declaración válida de la racha
- CUANDO se abre Progreso
- ENTONCES se presentan 280 celdas, una por día, agrupadas por mes

#### Scenario: Falta el registro de película

- DADO que el libro confirma una fecha sin un título fiable enlazado
- CUANDO se presenta la fecha
- ENTONCES aparece como día confirmado sin título, sin crear datos de película
