# Catálogo: visibilidad de películas con identidad estable

## MODIFIED Requirements

### Requirement: Identidad de películas con ID TMDB disponible

Cuando dos registros normalizados tienen IDs TMDB positivos diferentes, Prisma DEBE mantenerlos como películas distintas no solo al combinarlos, sino también al aplicar acciones personales de visibilidad en el catálogo. Ocultar una identidad DEBE excluir esa película específica y no otro registro que comparta el título pero tenga un ID TMDB diferente.

#### Scenario: Ocultar un remake con un ID TMDB específico

- DADO un catálogo con dos películas del mismo título e IDs TMDB 990001 y 990002, y la persona usuaria oculta la película 990001
- CUANDO se vuelve a mostrar el catálogo local
- ENTONCES la película 990001 no aparece y la película 990002 continúa visible

#### Scenario: Ocultar una película sin ID TMDB

- DADO que la película oculta o el registro del catálogo no tiene una identidad TMDB fiable
- CUANDO se comprueba su visibilidad
- ENTONCES Prisma mantiene la comparación por título normalizado como alternativa existente
