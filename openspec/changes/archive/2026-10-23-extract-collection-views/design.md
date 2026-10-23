# Diseño: módulo dedicado para la Colección

## Responsabilidad

`createCollectionViews(ctx)` contiene `recentPoster`, `collectionRow`, `collectionCompactCard`, `renderCollectionContent`, `refreshCollectionContent` y `renderLibrary`. Todos dependen del mismo contexto de aplicación y no necesitan importar el modelo de colección ni manejar almacenamiento directamente.

`createPageViews(ctx)` compone esa fábrica y reexpone sus funciones con los mismos nombres y firmas. `renderApp` sigue eligiendo `renderLibrary` para la página de colección, y los eventos pueden seguir invocando `refreshCollectionContent` tras cambiar pestaña, orden, filtros o distribución.

## Versiones y caché

- `js/ui/page-views.js?v=core-20261023-3`
- `js/ui/collection-views.js?v=core-20261023-1`
- `app.js?v=ui-20261023-93`
- shell PWA `prisma-shell-v104`

El service worker precarga la vista nueva y la URL exacta que utiliza la composición de páginas.
