## ADDED Requirements

### Requirement: Recuento de votos de TMDB preservado

Prisma DEBE conservar el campo vote_count que proporciona TMDB junto a vote_average, sin sustituir valores ausentes por cifras supuestas. El recuento solo DEBE mostrarse cuando sea un entero positivo recibido de la fuente.

#### Scenario: TMDB proporciona nota y recuento

- DADO que la respuesta TMDB contiene vote_average y un vote_count positivo
- CUANDO se presenta la puntuación pública
- ENTONCES ambos valores se mantienen ligados a TMDB y se muestran con formato adecuado

#### Scenario: Recuento ausente o inválido

- DADO que no existe un recuento positivo válido
- CUANDO se presenta la puntuación pública
- ENTONCES la interfaz omite el recuento sin fabricar un valor
