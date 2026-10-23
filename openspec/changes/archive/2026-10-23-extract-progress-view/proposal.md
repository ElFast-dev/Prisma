# Propuesta: extraer la vista de Progreso

## Problema

Tras separar Catálogo/Descubrir, Colección, Ajustes, Laboratorio y el calendario de racha, `js/ui/page-views.js` sigue conteniendo el renderizador de Progreso. Esa pantalla mezcla la bienvenida inicial, métricas de la colección, tendencias por género y actividad reciente con la composición general de las vistas.

## Cambio

- Mover `renderHome` a `js/ui/progress-views.js`, expuesto por `createProgressViews(ctx, renderConfirmedWatchStreakPanel)`.
- Mantener `renderHome` en la API pública de `createPageViews(ctx)`; el contenido HTML debe permanecer idéntico.
- Inyectar explícitamente el renderizador de racha en la nueva fábrica, evitando duplicar la lógica de calendario o crear dependencias circulares.
- Versionar el nuevo módulo, `page-views.js`, `app.js` y la caché PWA; ampliar pruebas de arquitectura y precaché.
