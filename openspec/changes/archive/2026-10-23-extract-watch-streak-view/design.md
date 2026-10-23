# Diseño: módulo aislado para el calendario de racha

## Responsabilidades

`createWatchStreakView(ctx)` es propietario del marcado de la racha personal. Usa `buildConfirmedWatchStreakDays` para obtener los 280 días confirmados y los formateadores de `date-utils.js` para etiquetas; recibe `state` y `escapeHTML` desde el contexto existente, sin buscar elementos del DOM ni persistir datos.

`createPageViews(ctx)` compone la fábrica nueva y continúa devolviendo `renderConfirmedWatchStreakPanel` con el mismo nombre. `renderHome` no cambia su composición ni la ordenación de Progreso.

## Compatibilidad y caché

- Nueva vista: `js/ui/watch-streak-view.js?v=core-20261023-1`.
- Renderizadores generales: `js/ui/page-views.js?v=core-20261023-1`.
- Entrada: `app.js?v=ui-20261023-91`.
- Shell de caché: `prisma-shell-v102`.

La caché precarga la vista nueva y la misma URL versionada que utiliza el import de `page-views.js`. CSS y contenido visible permanecen sin cambios.
