## ADDED Requirements

### Requirement: Exclusión por identidad conservadora

La exclusión de películas valoradas, vistas, pendientes u ocultas DEBE usar el ID TMDB cuando exista y aplicar el fallback por título/año cuando falte. Una correspondencia incompleta solo DEBE excluir una candidata si el título no es ambiguo y no contradice años o IDs conocidos.

#### Scenario: Candidata homónima de otro año

- DADO que la colección contiene una película de 1998 y TMDB devuelve una película homónima de 2024 con otra identidad
- CUANDO Prisma filtra candidatas de Descubrir
- ENTONCES no excluye la película de 2024 por compartir solamente el título

#### Scenario: Registro de colección incompleto y varios remakes

- DADO que una entrada personal sin ID ni año coincide en título con dos remakes TMDB diferentes
- CUANDO Prisma filtra las recomendaciones
- ENTONCES no asigna esa entrada a un remake arbitrario ni fusiona las dos identidades
