# Propuesta: extraer los renderizadores del Laboratorio

## Problema

`js/ui/page-views.js` agrupa varias pantallas y mantiene alrededor de 44 KB de renderizadores dedicados al Laboratorio: diagnóstico de recomendaciones, experimentos Ridge, normalización de influencia y evaluación temporal. Esa mezcla hace más difícil cambiar la presentación del Laboratorio sin tocar la composición de Progreso, catálogo o Ajustes.

## Cambio

- Mover los cinco renderizadores relacionados con el Laboratorio a `js/ui/lab-views.js`, expuestos mediante `createLabViews(ctx)`.
- Mantener `renderLab` en la API pública de `createPageViews(ctx)`; el usuario debe ver exactamente el mismo contenido y acciones.
- Versionar `lab-views.js`, `page-views.js`, la entrada de aplicación, la precaché PWA y las comprobaciones de lanzamiento.
- Ajustar las regresiones de Ridge y diagnóstico para comprobar el módulo que ahora posee el marcado, además de verificar la composición de módulos.
