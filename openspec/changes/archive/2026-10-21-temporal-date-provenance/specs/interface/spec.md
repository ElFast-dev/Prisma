# Especificación de interfaz: procedencia temporal

## Requirements

### Requirement: Mostrar procedencia agregada

El Laboratorio DEBE mostrar recuentos agregados de fechas explícitas, fechas no verificadas y fechas ausentes. Si usa una o más fechas heredadas o generadas por acciones, DEBE etiquetar los resultados como exploratorios. El diagnóstico comparte solo recuentos, nunca fechas exactas ni películas individuales.

#### Scenario: Historial mixto

- DADO que la validación usa timestamps sin procedencia verificable
- CUANDO se presentan los resultados
- ENTONCES la interfaz muestra el estado exploratorio y los recuentos agregados.

#### Scenario: Campos explícitos

- DADO que todas las fechas usadas provienen de campos explícitos o confirmados
- CUANDO se presentan los resultados
- ENTONCES la interfaz informa esos recuentos y explica que el campo explícito no demuestra de manera independiente que la fecha sea correcta.
