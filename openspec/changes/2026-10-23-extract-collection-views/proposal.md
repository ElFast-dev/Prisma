# Propuesta: extraer los renderizadores de Colección

## Problema

`js/ui/page-views.js` aún concentra el marcado de las filas de película, tarjetas compactas, pósteres recientes, el contenido de las pestañas y la composición de Historial/Pendientes/Ocultos. Ese bloque coherente suma unos 10 KB dentro de la fábrica general de páginas.

## Cambio

- Trasladar los seis renderizadores de Colección a `js/ui/collection-views.js`, expuestos a través de `createCollectionViews(ctx)`.
- Mantener los mismos nombres en la API de `createPageViews(ctx)`, para que `app.js`, los eventos y las actualizaciones parciales no necesiten cambiar.
- Versionar el módulo, la vista general, la entrada de aplicación y la caché PWA; precargar la nueva dependencia.
- Añadir pruebas de arquitectura y caché y conservar el marcado, acciones, etiquetas, sinopsis y enlaces actuales.
