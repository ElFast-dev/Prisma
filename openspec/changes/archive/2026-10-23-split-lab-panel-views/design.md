# Diseño: submódulos de vistas del Laboratorio

## Fronteras

`createLabViews(ctx)` mantiene la composición: crea `createLabRidgeView(ctx)` y `createLabTemporalView(ctx)`, y usa los renderizadores devueltos al ensamblar `renderLab`. El panel Ridge importa `summarizeRepeatedRidgeStability`; el panel temporal utiliza el estado y las funciones de presentación desde `ctx`. Ninguno entrena modelos ni persiste datos.

La lógica de evaluación continúa en `js/recommendations/ridge-evaluation.js`; el nuevo código solo renderiza estados, métricas, explicaciones y controles existentes. La selección del proxy temporal y el manejo de eventos siguen en la capa de aplicación.

## Caché y versiones

- `js/ui/lab-views.js?v=core-20261023-2`
- `js/ui/lab-ridge-view.js?v=core-20261023-1`
- `js/ui/lab-temporal-view.js?v=core-20261023-1`
- `js/ui/page-views.js?v=core-20261023-7`
- `app.js?v=ui-20261023-97`
- shell PWA `prisma-shell-v108`

El service worker precarga las URL exactas que importan los módulos y la pantalla de Laboratorio mantiene el mismo contenido y las mismas acciones accesibles.
