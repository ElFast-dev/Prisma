## ADDED Requirements

### Requirement: Coincidencia contextual de películas heredadas

Prisma DEBE resolver las filas de colección sin ID TMDB con título normalizado y año fiable cuando ambos estén disponibles. Si el año conocido no coincide, NO DEBE tratar dos películas como la misma únicamente por el título.

#### Scenario: Registro de colección sin ID

- DADO una fila de historial, pendientes u ocultos que carece de ID TMDB y una candidata con título y año coincidentes
- CUANDO el modelo comprueba si la candidata ya está en la colección
- ENTONCES la considera guardada y la excluye de recomendaciones.

#### Scenario: Título igual y año distinto

- DADO que una fila heredada comparte título con una candidata, pero tiene otro año fiable
- CUANDO el modelo comprueba si la candidata ya está en la colección
- ENTONCES conserva la candidata como identidad distinta.
