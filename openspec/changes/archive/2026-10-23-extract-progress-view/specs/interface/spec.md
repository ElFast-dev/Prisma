# Requisitos delta: modularidad de Progreso

## ADDED Requirements

### Requirement: Renderizador de Progreso aislado

Prisma DEBE mantener la bienvenida, las métricas personales, las tendencias por género y la actividad reciente en un módulo de vista dedicado. La composición `createPageViews(ctx)` DEBE conservar el método público `renderHome` y generar el mismo contenido y acciones. La racha confirmada DEBE recibirse mediante una dependencia de presentación inyectada; la extracción no DEBE duplicar su cálculo ni modificar el estado personal.

#### Scenario: Compatibilidad visual de Progreso

- DADO un perfil nuevo sin películas valoradas ni actividad
- CUANDO se llama `renderHome` desde `createPageViews(ctx)` después de extraer la implementación
- ENTONCES conserva la bienvenida inicial, las métricas, el panel de racha y el mensaje de actividad vacía

#### Scenario: Dependencia de racha inyectada

- DADO el módulo `js/ui/progress-views.js`
- CUANDO se instancia `createProgressViews(ctx, renderConfirmedWatchStreakPanel)`
- ENTONCES el marcado utiliza esa función recibida y no importa ni recalcula la racha por su cuenta
