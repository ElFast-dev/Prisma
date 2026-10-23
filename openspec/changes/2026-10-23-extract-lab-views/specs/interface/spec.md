# Requisitos delta: composición modular del Laboratorio

## ADDED Requirements

### Requirement: Renderizadores del Laboratorio en un módulo dedicado

Prisma DEBE mantener los paneles de diagnóstico de recomendaciones, experimentos Ridge, normalización de influencia y evaluación temporal en un módulo de vista dedicado que reciba sus dependencias por contexto. La composición de páginas DEBE conservar la interfaz pública `renderLab`, todas las acciones de interfaz y el mismo contenido accesible; separar renderizado no DEBE cambiar los cálculos del recomendador, los datos personales ni el comportamiento del Laboratorio.

#### Scenario: Compatibilidad del Laboratorio después de extraer los renderizadores

- DADO el mismo contexto y estado de Prisma
- CUANDO `renderLab` se obtiene desde `createPageViews(ctx)` tras la extracción
- ENTONCES renderiza los paneles de diagnóstico, Ridge, normalización y evaluación temporal con las mismas acciones y explicaciones que antes

#### Scenario: Aislamiento de la capa de vista

- DADO el módulo `js/ui/lab-views.js`
- CUANDO se valida su arquitectura modular
- ENTONCES puede importarse su fábrica, no accede directamente al DOM ni al almacenamiento, y no contiene la implementación de entrenamiento ni evaluación del recomendador
