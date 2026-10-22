## ADDED Requirements

### Requirement: Importación que preserva identidades homónimas

La importación de valoraciones, historial, listas y catálogo DEBE aplicar el fallback compartido de identidad por título y año cuando no existe ID TMDB. NO DEBE fusionar remakes con años conocidos distintos ni asignar arbitrariamente registros sin año a una película homónima.

#### Scenario: Reimportar remakes sin ID TMDB

- DADO que un archivo de importación contiene dos películas con el mismo título pero años distintos y sin ID TMDB
- CUANDO se importa el archivo por segunda vez
- ENTONCES ambas identidades permanecen separadas y no se duplican las filas del mismo título y año

### Requirement: Procedencia de fecha visible en el historial

Prisma NO DEBE presentar una marca temporal creada automáticamente al guardar una valoración como fecha de visionado. La acción explícita «Marcar como vista» DEBE registrar su propio instante como fecha confirmada si no hay una fecha fiable existente que preservar. Las fechas importadas explícitamente o confirmadas por la persona DEBEN conservarse.

#### Scenario: Momento de puntuación no equivale a visionado

- DADO que un registro tiene `watchedAtSource=action-time`
- CUANDO se muestra la ficha o la colección
- ENTONCES Prisma no presenta ese instante como fecha de visionado

#### Scenario: Marcar explícitamente una película como vista

- DADO que la película no dispone de una fecha de visionado fiable
- CUANDO la persona usa «Marcar como vista»
- ENTONCES Prisma guarda la hora de esa acción con procedencia `user-confirmed` y la presenta según el calendario de Panamá
