# Requisitos delta: vistas modulares de Descubrir

## ADDED Requirements

### Requirement: Renderizador de catálogo dedicado

Prisma DEBE mantener la tarjeta de película, la cuadrícula de pósteres, los filtros del catálogo local y el renderizado de Descubrir en un módulo dedicado con contexto inyectado. La API pública de `createPageViews(ctx)` DEBE conservar los mismos nombres y acciones. El filtrado DEBE seguir excluyendo películas ya vistas u ocultas, y el cambio de vista NO DEBE alterar puntuaciones, identidad, datos personales ni los resultados calculados por el motor de recomendaciones.

#### Scenario: Compatibilidad del filtro local de Descubrir

- DADO un catálogo que contiene películas nuevas, películas ya vistas y títulos ocultos
- CUANDO se invoca `filterCatalog` a través de `createPageViews(ctx)`
- ENTONCES solo aparecen las películas que satisfacen la búsqueda, el género y las reglas de exclusión existentes

#### Scenario: Compatibilidad visual y de acciones

- DADO que se renderiza Descubrir con o sin señales personales y con cualquiera de los modos de recomendación
- CUANDO la aplicación obtiene los renderizadores desde `createPageViews(ctx)`
- ENTONCES conserva la tarjeta de película, los modos, los estados vacíos, el contador y las acciones de importación actuales

#### Scenario: Aislamiento de la vista

- DADO el módulo `js/ui/catalog-views.js`
- CUANDO se valida la arquitectura modular
- ENTONCES expone `createCatalogViews(ctx)`, resuelve sus imports y no concentra la lógica de dominio ni el almacenamiento en la vista
