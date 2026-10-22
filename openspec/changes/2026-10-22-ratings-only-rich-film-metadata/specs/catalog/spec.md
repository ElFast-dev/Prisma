## ADDED Requirements

### Requirement: Enriquecimiento acotado de metadatos cinematográficos

Prisma DEBE normalizar los datos disponibles de TMDB, incluidos créditos y palabras clave, para el recomendador. El enriquecimiento de candidatas remotas DEBE limitarse en cantidad y permanecer en memoria hasta que la persona realice una acción explícita.

#### Scenario: Créditos disponibles

- DADO que TMDB entrega reparto, equipo creativo, productoras, países, idiomas y detalles técnicos
- CUANDO se normaliza la ficha
- ENTONCES estos campos quedan disponibles como características cinematográficas sin convertirse en datos personales

#### Scenario: Candidata remota recomendada

- DADO que Prisma obtiene detalles adicionales de una película popular
- CUANDO enriquece sus metadatos para puntuarla
- ENTONCES no la añade automáticamente a historial, valoraciones, pendientes, ocultos ni catálogo personal