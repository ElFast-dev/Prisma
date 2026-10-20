# Recomendador personal

## Requirements

### Requirement: Perfil explicable basado en señales disponibles

Prisma DEBE basar sus predicciones en señales que existan en los registros, como géneros y etiquetas, y mostrar una explicación que no atribuya al modelo información que no tiene.

#### Scenario: Película con coincidencias de perfil

- DADO que una película comparte géneros o etiquetas con el historial valorado
- CUANDO se calcula una predicción
- ENTONCES la explicación identifica señales coincidentes disponibles en el perfil

#### Scenario: Película sin metadatos suficientes

- DADO que una película carece de características vinculadas al perfil
- CUANDO se calcula una predicción
- ENTONCES la explicación comunica la falta de señales en vez de inventar motivos

### Requirement: Puntuaciones acotadas

Prisma DEBE mantener las puntuaciones predichas dentro del rango de 1 a 10 y distinguir una estimación del usuario de una valoración real del usuario.

#### Scenario: Perfil todavía inicial

- DADO que hay pocos registros personales con metadatos enlazados
- CUANDO se muestran recomendaciones
- ENTONCES el resultado se presenta como una estimación de confianza limitada

### Requirement: Exclusión de películas ya conocidas

Prisma DEBE excluir de candidatos las películas ya valoradas, vistas, pendientes u ocultas, así como registros que solo representan una importación del historial sin metadatos de catálogo suficientes para descubrimiento.

#### Scenario: Película ya valorada

- DADO que una película forma parte de las valoraciones personales
- CUANDO se construye la lista de recomendaciones
- ENTONCES no aparece como un nuevo descubrimiento

### Requirement: Evaluación con muestra útil

El laboratorio DEBE evitar presentar la evaluación experimental como disponible cuando no hay una muestra mínima útil.

#### Scenario: Menos de cinco valoraciones con características

- DADO que hay menos de cinco valoraciones válidas con características enlazadas
- CUANDO se calcula la evaluación experimental
- ENTONCES no se muestra un error medio como si tuviera una muestra suficiente

## Limitaciones conocidas

El algoritmo actual es una línea base heurística basada en géneros y etiquetas. Sus puntuaciones son aproximaciones explicables y no una garantía de gusto futuro ni una validación científica.


### Requirement: Recomendaciones únicas y exclusión fiable de la colección

Prisma DEBE mostrar como máximo una tarjeta por película en las recomendaciones. La identidad primaria DEBE ser un ID TMDB positivo; sin IDs, se DEBE usar el título normalizado y el año disponible, y no fusionar remakes con IDs TMDB distintos. Las recomendaciones DEBEN excluir las películas vistas, valoradas, pendientes u ocultas incluso cuando una de las entradas carezca de ID.

#### Scenario: Película duplicada con el mismo ID TMDB

- DADO que el catálogo contiene varias entradas con el mismo ID TMDB
- CUANDO se calcula «Recomendadas para ti»
- ENTONCES solo se muestra una tarjeta para esa película

#### Scenario: Remakes con IDs diferentes

- DADO que dos películas tienen el mismo título pero IDs TMDB distintos
- CUANDO se deduplican candidatos
- ENTONCES cada película conserva su propia identidad

#### Scenario: Película ya vista o valorada

- DADO que una película pertenece al historial personal
- CUANDO aparece en las fuentes del catálogo local o remoto de Descubrir
- ENTONCES no se muestra como una película nueva
