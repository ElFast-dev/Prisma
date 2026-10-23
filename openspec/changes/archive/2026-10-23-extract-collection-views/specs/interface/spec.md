# Requisitos delta: vistas modulares de Colección

## ADDED Requirements

### Requirement: Renderizadores de Colección aislados

Prisma DEBE mantener filas, tarjetas compactas, pósteres recientes, listas del sistema y contenido de pestañas de la Colección en un módulo de vista dedicado con dependencias inyectadas. La API expuesta por `createPageViews(ctx)` DEBE conservar los mismos nombres y comportamiento para renderizar Historial, Pendientes y Ocultos, tanto en modo Películas como en modo Listas. La extracción NO DEBE cambiar identidad de películas, puntuaciones, fechas, sinopsis, ordenación ni acciones.

#### Scenario: Compatibilidad del renderizado de la Colección

- DADO un contexto con películas en Historial, Pendientes u Ocultos
- CUANDO `app.js` invoca `renderLibrary` o una actualización llama a `refreshCollectionContent`
- ENTONCES las funciones públicas existentes delegan al módulo de Colección y generan el mismo marcado que antes

#### Scenario: Aislamiento de la capa de vista

- DADO el módulo `js/ui/collection-views.js`
- CUANDO se valida la arquitectura modular
- ENTONCES exporta `createCollectionViews(ctx)`, importa correctamente, recibe sus dependencias por contexto y no añade acceso directo al DOM o al almacenamiento
