# Propuesta: extraer las vistas de Descubrir y catálogo

## Problema

Después de separar la Colección y el Laboratorio, `js/ui/page-views.js` aún contiene la tarjeta de película compartida, la cuadrícula de pósteres, los filtros locales y el renderizado de Descubrir. El bloque ronda los 9 KB y mezcla presentación del catálogo con la composición de Progreso y Ajustes.

## Cambio

- Mover `movieCard`, `movieGrid`, `filterCatalog`, `renderCatalogResults` y `renderCatalog` a `js/ui/catalog-views.js`, mediante `createCatalogViews(ctx)`.
- Mantener todos esos nombres en la API pública de `createPageViews(ctx)`, conservando las referencias que consume `app.js`.
- Actualizar la cobertura de filtros, transparencia de puntuaciones y modos de recomendación para inspeccionar el módulo que posee el marcado.
- Versionar y precargar la nueva dependencia en la caché PWA y sincronizar la versión del workflow Playwright.
