## ADDED Requirements

### Requirement: Aprendizaje y evaluación con identidad completa

Cuando una valoración incluye un año fiable, Prisma DEBE pasar ese año a la búsqueda de metadatos en el perfil, ranking y evaluación del recomendador, salvo que un ID TMDB válido ya resuelva la identidad. Prisma NO DEBE atribuir a una valoración las características de otra película homónima de año distinto.

#### Scenario: Perfil con dos remakes

- DADO que existen dos películas con el mismo título y años distintos, cada una con características diferentes, y una valoración antigua carece de ID TMDB pero conserva su año
- CUANDO Prisma construye el perfil de aprendizaje
- ENTONCES usa las características de la película del mismo año para esa valoración y no las del otro remake

#### Scenario: Evaluación sin año suficiente

- DADO que una valoración no tiene ID TMDB ni año y existen varias películas con el mismo título
- CUANDO el recomendador o el laboratorio resuelve sus metadatos
- ENTONCES no elige una identidad arbitraria ni usa características ambiguas
