# Diseño: módulo de vistas de Descubrir y catálogo

## Responsabilidad

`createCatalogViews(ctx)` será propietario de `movieCard`, `movieGrid`, `filterCatalog`, `renderCatalogResults` y `renderCatalog`. El filtro continúa excluyendo el historial y los elementos ocultos antes de producir resultados; las recomendaciones continúan usando el proveedor existente de `ctx.getRecommendations`. El renderizador no entrena ni modifica el ranking.

`createPageViews(ctx)` compone el nuevo módulo y devuelve las mismas funciones públicas. `renderApp` continúa seleccionando `renderCatalog` y después `renderCatalogResults` cuando la página actual es catálogo; los consumidores externos de `movieGrid` siguen recibiendo la misma función.

## Versiones y caché

- `js/ui/page-views.js?v=core-20261023-4`
- `js/ui/catalog-views.js?v=core-20261023-1`
- `app.js?v=ui-20261023-94`
- shell PWA `prisma-shell-v105`

El service worker debe precargar la vista dedicada y usar las URLs versionadas que corresponden a los imports de la aplicación.
