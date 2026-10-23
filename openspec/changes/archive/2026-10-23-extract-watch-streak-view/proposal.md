# Propuesta: extraer la vista del calendario de racha

## Problema

`js/ui/page-views.js` ha acumulado renderizadores de múltiples pantallas. El calendario de la racha personal es una unidad autocontenida, con reglas de accesibilidad, alineación mensual y explicación de los 280 días, pero permanece dentro de ese módulo general de aproximadamente 82 KB.

## Cambio

- Mover el renderizador del calendario a `js/ui/watch-streak-view.js`, expuesto mediante una fábrica que recibe sus dependencias de presentación.
- Mantener `createPageViews(ctx)` y su propiedad pública `renderConfirmedWatchStreakPanel` para no romper a la aplicación ni a las pruebas existentes.
- Versionar la nueva dependencia, `page-views.js`, la entrada, la caché PWA y sus comprobaciones.
- Añadir una prueba que compare el resultado del módulo aislado con el renderizado expuesto por la fábrica de páginas.
