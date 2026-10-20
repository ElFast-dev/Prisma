## ADDED Requirements

### Requirement: Procedencia explícita de las puntuaciones en la ficha

Prisma DEBE distinguir visualmente la nota personal de una película de la puntuación pública de una fuente externa. Las cifras que la ficha atribuye a TMDB DEBEN tener procedencia TMDB confirmada; los enlaces a otros servicios DEBEN presentarse como consultas externas cuando Prisma no obtiene una puntuación integrada.

#### Scenario: Puntuación pública de TMDB disponible

- DADO que la ficha contiene una nota media válida cuya procedencia está marcada como TMDB
- CUANDO se muestran los indicadores de puntuación
- ENTONCES la nota enlaza a la película correspondiente de TMDB y el recuento de votos aparece solo si la fuente lo ha proporcionado

#### Scenario: Puntuación no disponible o sin procedencia confirmada

- DADO que falta la nota media o el registro no confirma procedencia TMDB
- CUANDO se muestra la ficha
- ENTONCES Prisma no presenta ese dato como una nota TMDB numérica y ofrece un enlace para consultar la fuente cuando esté disponible

#### Scenario: IMDb ID ausente

- DADO que la ficha no contiene un IMDb ID
- CUANDO se abre el indicador IMDb
- ENTONCES se abre la búsqueda de IMDb por título en lugar de un enlace a otro servicio

#### Scenario: Puntuaciones de otros sitios no integradas

- DADO que Prisma no obtiene directamente las cifras de IMDb, Rotten Tomatoes o Metacritic
- CUANDO se muestran sus indicadores
- ENTONCES estos se identifican como búsquedas externas y no como puntuaciones numéricas de Prisma
