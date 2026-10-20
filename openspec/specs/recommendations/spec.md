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
