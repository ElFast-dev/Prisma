## MODIFIED Requirements

### Requirement: Cuadrícula de Descubrir centrada en el póster

Prisma DEBE mostrar las películas de las cuadrículas de Descubrir como pósteres interactivos, sin duplicar en las tarjetas el título, metadatos, predicción ni acciones disponibles en la ficha. El bloque de recomendaciones DEBE preceder al catálogo adicional e incluir controles compactos para cambiar su mezcla, con el modo actual anunciado mediante `aria-pressed`.

#### Scenario: Las recomendaciones aparecen antes del catálogo

- DADO que se abre Descubrir
- CUANDO se representa la vista
- ENTONCES el bloque de recomendaciones y su selector de enfoque aparecen antes de Explorar TMDB y del catálogo local

#### Scenario: Elegir un modo de recomendación

- DADO que el bloque de recomendaciones está visible
- CUANDO se selecciona Equilibrado, Más afines o Más variedad
- ENTONCES se actualiza el ranking, la opción correspondiente anuncia `aria-pressed="true"` y la preferencia queda guardada en el dispositivo

#### Scenario: Inicio sin señales personalizadas enlazadas

- DADO que no existen valoraciones con características enlazadas
- CUANDO se abre Descubrir
- ENTONCES Prisma evita afirmar que la lista ya refleja gustos aprendidos y explica cómo las valoraciones podrán personalizarla
