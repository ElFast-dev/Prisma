### Requirement: Recomendaciones únicas y exclusión fiable de la colección

Prisma DEBE mostrar como máximo una tarjeta por película en las recomendaciones. La identidad primaria DEBE ser un ID TMDB positivo; sin IDs, se DEBE usar el título normalizado y el año disponible, y no fusionar remakes con IDs TMDB distintos. Las recomendaciones DEBEN excluir las películas vistas, valoradas, pendientes u ocultas incluso cuando una de las entradas carezca de ID.

#### Scenario: Película duplicada con el mismo ID TMDB

- DADO que el catálogo contiene varias entradas con el mismo ID TMDB
- CUANDO se calcula «Recomendadas para ti»
- ENTONCES solo se muestra una tarjeta para esa película

#### Scenario: Remakes con IDs diferentes

- DADO que dos películas tienen el mismo título pero IDs TMDB distintos
- CUANDO se deduplican candidatos
- ENTONCES cada película conserva su propia identidad

#### Scenario: Película ya vista o valorada

- DADO que una película pertenece al historial personal
- CUANDO aparece en las fuentes del catálogo local o remoto de Descubrir
- ENTONCES no se muestra como una película nueva
