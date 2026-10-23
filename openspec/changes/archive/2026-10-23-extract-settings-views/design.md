# Diseño: fábrica de vistas de Ajustes y Datos

## Responsabilidad

`createSettingsViews(ctx)` contiene Apariencia, formulario de TMDB, formato legible de bytes, panel de protección del almacenamiento y la página de Ajustes/Datos. La fábrica recibe un contexto que ofrece el tema actual, la credencial, la instantánea del estado de persistencia, el estado de aplicación, las estadísticas, helpers de escape/fecha, el botón informativo y el panel de historial TMDB.

El módulo solo genera HTML. La persistencia de preferencias del tema continúa en `theme-controller.js`; probar, guardar y eliminar credenciales continúa en `js/tmdb/settings-actions.js`; solicitar persistencia del almacenamiento continúa en `storage-protection.js`; los eventos y la importación/exportación siguen en sus módulos actuales.

`createPageViews(ctx)` vuelve a exponer `renderTMDBSettings` y `renderData` con las mismas firmas.

## Versiones y caché

- `js/ui/page-views.js?v=core-20261023-5`
- `js/ui/settings-views.js?v=core-20261023-1`
- `app.js?v=ui-20261023-95`
- shell PWA `prisma-shell-v106`

El service worker precarga el nuevo módulo. La entrada y Playwright usan la misma versión y la caché mantiene las URLs exactas importadas por la aplicación.
