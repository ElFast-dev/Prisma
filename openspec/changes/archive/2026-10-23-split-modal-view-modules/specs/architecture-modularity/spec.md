# Requisitos delta: vistas modales divididas

## ADDED Requirements

### Requirement: Cada vista modal tiene un módulo especializado

Prisma DEBE mantener la hoja auxiliar, la ficha de película, la ficha de persona y la hoja de puntuación en módulos ES separados. La fachada `createModalViews(ctx)` DEBE conservar la API pública usada por la aplicación y delegar a esas vistas sin duplicar sus renderizadores.

#### Scenario: Se compone el conjunto de vistas

- DADO un contexto válido de presentación y estado
- CUANDO se crea `createModalViews(ctx)`
- ENTONCES el resultado expone `renderUtilitySheet`, `renderMovieDetails`, `renderPersonDetails` y `renderRatingSheet`, y cada método procede de su módulo especializado.

#### Scenario: Cambio de presentación no altera los datos

- DADO que se cambia el marcado de una ficha o panel modal
- CUANDO se ejecutan las pruebas de las vistas aisladas
- ENTONCES el resultado conserva sus acciones declarativas `data-action` y no modifica, serializa ni transmite el perfil personal.
