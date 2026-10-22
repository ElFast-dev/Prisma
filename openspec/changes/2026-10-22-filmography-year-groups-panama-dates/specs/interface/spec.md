# Requisitos delta: filmografía agrupada y calendario estable

## ADDED Requirements

### Requirement: Filmografía agrupada por año e identidad TMDB

La ficha de persona DEBE mostrar primero los créditos sin fecha bajo «En producción» y luego grupos anuales descendentes. Debe deduplicar créditos por ID TMDB y filtrar el modo «Colección» usando la identidad guardada.

#### Scenario: Agrupación y deduplicación

- DADO que una persona tiene varios créditos de años distintos y duplicados para un mismo ID TMDB
- CUANDO se abre su filmografía
- ENTONCES aparecen grupos de año descendente, una sola entrada por identidad y el grupo «En producción» en primer lugar.

#### Scenario: Filtrar la colección personal

- DADO que dos películas homónimas tienen IDs TMDB distintos y solo una pertenece a la colección
- CUANDO se elige «Colección»
- ENTONCES se muestra únicamente la película guardada.

### Requirement: Preservación de fechas de calendario

El formateo visual DEBE mantener intactas las fechas ISO de solo día y mostrar timestamps según el día de calendario de Panamá, sin añadir una hora.

#### Scenario: Fecha de estreno pura

- DADO 2026-10-22 como fecha de estreno
- CUANDO se muestra la ficha
- ENTONCES se presenta el 22 de octubre de 2026.

#### Scenario: Timestamp próximo a medianoche

- DADO 2026-10-22T02:00:00.000Z
- CUANDO se formatea para Panamá
- ENTONCES se presenta el 21 de octubre de 2026 sin hora.
