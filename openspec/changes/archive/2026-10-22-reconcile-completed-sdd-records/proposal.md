# Propuesta: reconciliar y archivar expedientes SDD ya integrados

## Motivación

Varias carpetas bajo `openspec/changes/` mantienen tareas de integración y despliegue sin marcar aunque sus PR ya se fusionaron y existen ejecuciones de calidad, Playwright y GitHub Pages posteriores. Esa divergencia hace que la lista de cambios pendientes no represente fielmente el estado del producto.

## Alcance

- Revisar el estado de integración de los PR asociados y las ejecuciones reales de calidad, Playwright y despliegue.
- Marcar únicamente las tareas respaldadas por evidencia verificable.
- Archivar los expedientes de identidad/fechas, catálogo de metadatos, experiencia de filmografía, racha confirmada y publicación que ya cumplan los criterios de cierre.
- Conservar en cada expediente las decisiones y escenarios; añadir un breve registro de evidencia enlazado.
- No tocar el PR #71, los cambios funcionales actuales ni los datos privados.

## Criterios de aceptación

- Cada expediente movido a `openspec/changes/archive/` tiene tareas completas y evidencia de integración/despliegue.
- El expediente activo deja de aparecer como pendiente después de verificarse su convergencia.
- La validación SDD, las pruebas de calidad y Playwright continúan funcionando.
- No se cambia código de producto en este mantenimiento documental.
