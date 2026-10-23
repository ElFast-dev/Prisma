## ADDED Requirements

### Requirement: Perfil vacío sin recomendaciones personalizadas

Prisma DEBE mostrar cero recomendaciones personalizadas cuando el perfil no contiene ninguna valoración personal válida. Esta condición NO DEBE bloquear la búsqueda ni la exploración de películas en Descubrir. El ranking puro de candidatas explícitamente puntuadas para evaluación offline DEBE seguir disponible.

#### Scenario: Primera visita sin valoraciones

- DADO que no existen valoraciones personales válidas y TMDB o el catálogo ofrecen películas candidatas
- CUANDO Prisma calcula «Recomendadas para ti»
- ENTONCES devuelve una lista vacía y no presenta candidatas como recomendaciones personalizadas

#### Scenario: Descubrir con perfil vacío

- DADO que no existen valoraciones personales válidas
- CUANDO la persona busca o explora películas en Descubrir
- ENTONCES Prisma puede mostrar resultados de TMDB con sus metadatos sin añadirlos automáticamente a la colección

#### Scenario: Primera valoración válida

- DADO que el perfil contiene al menos una valoración personal válida
- CUANDO Prisma vuelve a calcular recomendaciones
- ENTONCES permite puntuar candidatas con el modelo vigente y mantiene la confianza inicial acorde con las señales disponibles

#### Scenario: Evaluación offline

- DADO que una prueba o experimento entrega candidatas explícitamente puntuadas a la función pura de ranking
- CUANDO se ordenan esas candidatas
- ENTONCES el ranking funciona independientemente de la guarda de recomendaciones de producción
