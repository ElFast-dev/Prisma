## ADDED Requirements

### Requirement: Identidad TMDB independiente del título visible

Cuando un registro y una película candidata contienen el mismo ID TMDB positivo, Prisma DEBE resolverlos como la misma identidad incluso si sus títulos visibles normalizados son diferentes. La búsqueda contextual DEBE priorizar esa coincidencia antes de usar el fallback por título y año, sin fusionar IDs distintos.

#### Scenario: Mismo ID con título localizado o alternativo

- DADO que una fuente contiene una película titulada «Título localizado» con ID TMDB 990099 y otra fuente contiene el mismo ID con título «Original Movie Title»
- CUANDO Prisma busca el registro correspondiente
- ENTONCES devuelve la identidad TMDB coincidente sin depender del título visible

#### Scenario: Títulos iguales con IDs distintos

- DADO que dos películas comparten título pero tienen IDs TMDB positivos diferentes
- CUANDO Prisma resuelve una identidad contextual
- ENTONCES conserva cada película como una identidad distinta
