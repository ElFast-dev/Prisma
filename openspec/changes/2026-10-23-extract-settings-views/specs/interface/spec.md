# Requisitos delta: vistas modulares de Ajustes

## ADDED Requirements

### Requirement: Renderizadores de Ajustes aislados

Prisma DEBE mantener Apariencia, configuración de TMDB, panel de protección del almacenamiento y pantalla Ajustes/Datos en un módulo de vista dedicado que reciba dependencias por contexto. La API de `createPageViews(ctx)` DEBE conservar `renderTMDBSettings` y `renderData`. La extracción NO DEBE mover efectos secundarios de persistencia, credenciales, preferencias o importación/exportación fuera de los módulos de acciones existentes.

#### Scenario: Compatibilidad de Ajustes y Datos

- DADO un contexto que contiene el tema, la credencial TMDB y el estado del almacenamiento
- CUANDO la aplicación renderiza Ajustes a través de `createPageViews(ctx)`
- ENTONCES conserva los controles de apariencia, conectar/probar TMDB, protección del almacenamiento, importación y copias de seguridad con sus acciones actuales

#### Scenario: Separación entre render y persistencia

- DADO el módulo `js/ui/settings-views.js`
- CUANDO se comprueba la arquitectura modular
- ENTONCES expone `createSettingsViews(ctx)`, resuelve sus imports y no ejecuta escritura de almacenamiento ni peticiones de red al renderizar
