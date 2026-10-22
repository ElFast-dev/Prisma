## MODIFIED Requirements

### Requirement: Calificar con una interacción mínima

La interfaz DEBE permitir buscar la película vista, seleccionar una nota del 1 al 10 y guardar la valoración. El panel de calificación NO DEBE mostrar selectores de emociones ni preguntas sobre recuerdos o sentimientos.

#### Scenario: Valoración en móvil

- DADO que la persona abre el panel Calificar en una pantalla móvil
- CUANDO selecciona una nota y la guarda
- ENTONCES completa la operación sin rellenar otros campos personales

#### Scenario: Películas con igual título

- DADO que dos películas comparten título pero tienen distintos ID TMDB
- CUANDO se abre la calificación desde una ficha
- ENTONCES Prisma selecciona o actualiza la valoración con el ID TMDB exacto cuando esté disponible