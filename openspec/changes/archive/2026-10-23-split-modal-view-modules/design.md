# Diseño: vistas modales por responsabilidad

## Arquitectura

- `utility-sheet-view.js`: orden, géneros, ayuda y gestión auxiliar.
- `movie-detail-view.js`: ficha detallada; conserva la dependencia de formateo de fechas explícitas.
- `person-detail-view.js`: biografía y filmografía; conserva el helper de agrupación por año.
- `rating-sheet-view.js`: editor numérico de 1 a 10.
- `modal-views.js`: fachada de composición que devuelve los cuatro métodos actuales desde factories con dependencias inyectadas.

## Compatibilidad y privacidad

La extracción mueve el contenido de las funciones existentes sin cambiar las fórmulas, el marcado, los identificadores `data-action` ni los contratos. Los tests usan fixtures sintéticos. No se añade un backend, una dependencia de ejecución ni llamadas de red nuevas.

## Caché y release

Las URLs del módulo de entrada y de los cinco módulos de vista se sincronizan en `app.js`, `index.html`, `sw.js`, la prueba de versionado y Playwright. Se renueva el shell PWA. El expediente no se archiva hasta que quality, Playwright y Pages estén verdes sobre el mismo SHA.
