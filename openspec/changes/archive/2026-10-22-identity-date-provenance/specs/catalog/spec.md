## ADDED Requirements

### Requirement: Identidad de fallback por título y año

Prisma DEBE priorizar un ID TMDB positivo y, cuando falte, usar el título normalizado y el año fiable para resolver identidad. Prisma NO DEBE fusionar registros con el mismo título y años conocidos diferentes. Un registro sin ID o año solo DEBE reconciliarse con otra identidad si existe una única correspondencia posible y no hay conflicto con los años o IDs conocidos.

#### Scenario: Registros sin ID de años distintos

- DADO que el catálogo contiene dos registros con el mismo título y sin ID TMDB, uno de 1998 y otro de 2024
- CUANDO Prisma normaliza y combina el catálogo
- ENTONCES conserva ambos registros como películas distintas

#### Scenario: Registro legado sin ID ni año con una sola candidata

- DADO que existe una única película TMDB con un título normalizado y un registro legado homónimo sin ID ni año
- CUANDO se combinan las fuentes del catálogo
- ENTONCES Prisma puede reconciliar el registro legado con esa identidad y aprovechar los metadatos verificados

#### Scenario: Registro legado ambiguo entre remakes

- DADO que existen dos IDs TMDB distintos para el mismo título y un registro legado sin ID ni año
- CUANDO Prisma combina o importa los registros
- ENTONCES conserva el registro legado separado en vez de asignarlo arbitrariamente a un remake
