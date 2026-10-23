# Requisitos delta: paneles del Laboratorio aislados

## ADDED Requirements

### Requirement: Paneles Ridge con módulos de vista propios

Prisma DEBE mantener el renderizado de la validación Ridge repetida y de la evaluación temporal walk-forward en módulos separados, con contexto inyectado. La composición del Laboratorio DEBE conservar `renderLab`, las acciones, explicaciones, textos, estados de progreso y métricas existentes. La extracción NO DEBE alterar el algoritmo, la fuente temporal elegida, las puntuaciones ni los datos personales.

#### Scenario: Mantener la interfaz pública del Laboratorio

- DADO un estado con resultados Ridge, normalización y evaluación temporal disponibles o no disponibles
- CUANDO se renderiza la página Laboratorio a través de `createPageViews(ctx)`
- ENTONCES `renderLab` presenta los mismos paneles, métricas, controles y mensajes, delegando Ridge a `createLabRidgeView(ctx)` y la evaluación temporal a `createLabTemporalView(ctx)`

#### Scenario: Mantener el aislamiento del modelo

- DADO los módulos `js/ui/lab-ridge-view.js` y `js/ui/lab-temporal-view.js`
- CUANDO se verifica la arquitectura
- ENTONCES son módulos importables y no ejecutan entrenamiento, cambian la puntuación activa ni acceden directamente al almacenamiento
