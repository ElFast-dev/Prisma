# Propuesta: dividir los renderizadores modales

## Problema

`js/ui/modal-views.js` concentra la hoja auxiliar, la ficha de película, la ficha de persona y el editor de puntuación en un único módulo de 27 KB. Esto amplía el radio de cambios visuales y dificulta probar cada API en aislamiento.

## Cambio

- Extraer cada responsabilidad a un módulo ES independiente.
- Mantener `createModalViews(ctx)` y los cuatro métodos que ya usa la aplicación, sin cambiar sus contratos ni las acciones.
- Añadir pruebas directas de los módulos y comprobar enlaces, caché PWA y comportamiento con datos sintéticos.
- Actualizar la documentación, las especificaciones permanentes y las rutas versionadas coordinadas.

## Exclusiones

No se modifica el algoritmo de recomendaciones, el esquema de datos personal, las acciones de valoración ni la integración con TMDB.
