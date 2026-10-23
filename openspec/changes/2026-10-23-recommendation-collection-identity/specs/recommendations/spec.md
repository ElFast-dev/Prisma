## ADDED Requirements

### Requirement: Recomendaciones respetan la identidad contextual de la colección

Prisma DEBE excluir una candidata si corresponde a una película ya guardada, utilizando su ID TMDB cuando esté disponible. Si el registro personal heredado no tiene ID TMDB, Prisma DEBE considerar conjuntamente el título normalizado y un año fiable antes de excluir la candidata. Un remake de otro año NO DEBE excluirse únicamente por compartir título.

#### Scenario: Registro heredado de la misma película

- DADO un registro personal sin ID TMDB, con título y año coincidentes con una candidata
- CUANDO el recomendador evalúa esa candidata
- ENTONCES la excluye de la lista recomendada.

#### Scenario: Remake de otro año

- DADO un registro personal heredado con el mismo título, pero con año distinto al de una candidata
- CUANDO el recomendador evalúa la candidata
- ENTONCES no la excluye solo por el título.

#### Scenario: IDs TMDB diferentes

- DADO que la película candidata y la película guardada tienen IDs TMDB distintos
- CUANDO el recomendador compara sus identidades
- ENTONCES no las fusiona como una misma película solo porque sus títulos coincidan.
