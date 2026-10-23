# Diseño: fábrica aislada para Progreso

`createProgressViews(ctx, renderConfirmedWatchStreakPanel)` recibe el contexto común de presentación y la función de la racha ya creada por `createWatchStreakView(ctx)`. El único renderizador que posee es `renderHome`; conserva el HTML de la bienvenida, la cuadrícula de métricas, los géneros mejor valorados, el historial reciente y el mensaje de actividad vacía.

`createPageViews(ctx)` crea el renderizador de racha, pasa la función a `createProgressViews` y devuelve `renderHome` con el mismo nombre de API pública. No se modifica `app.js`, el modelo de estado, las valoraciones, el algoritmo de recomendación ni las reglas de importación.

## Versiones PWA

- `js/ui/progress-views.js?v=core-20261023-1`
- `js/ui/page-views.js?v=core-20261023-6`
- `app.js?v=ui-20261023-96`
- shell: `prisma-shell-v107`

El service worker precarga la misma URL versionada que importa `page-views.js`, y Playwright comprueba la versión de entrada de aplicación.
