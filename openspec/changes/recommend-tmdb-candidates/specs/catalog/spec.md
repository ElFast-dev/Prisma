## ADDED Requirements

### Requirement: Candidatas remotas sin persistencia automática

Prisma DEBE mantener en memoria los resultados populares consultados de TMDB, separados de los registros persistentes del catálogo, y NO DEBE escribirlos al almacenamiento personal solo por utilizarlos como candidatas de recomendación.

#### Scenario: Ranking no altera la colección

- DADO un conjunto temporal de películas populares de TMDB
- CUANDO el motor las puntúa y ordena
- ENTONCES el estado persistido de valoraciones, vistas, pendientes, ocultas y catálogo personalizado no se modifica

#### Scenario: Desconexión de TMDB

- DADO que hay candidatas remotas en memoria y la persona elimina su credencial
- CUANDO se completa la acción de desconexión
- ENTONCES el pool remoto queda vacío y no se conserva como catálogo persistente
