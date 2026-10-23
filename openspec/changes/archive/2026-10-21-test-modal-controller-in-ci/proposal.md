# Propuesta: ejecutar siempre la prueba de retorno del modal

## Problema

`scripts/test-modal-controller.mjs` cubre que cerrar el editor de calificación restaure la ficha de origen y que una calificación abierta desde una lista se cierre sin inventar una ficha. La prueba existe en el repositorio, pero el workflow canónico `quality.yml` no la ejecuta. Por tanto, una regresión de ese comportamiento podría pasar SDD y las pruebas si Playwright no alcanza el mismo caso límite.

## Cambio

- Añadir el test del controlador al workflow canónico de calidad.
- Hacer que `test-release-gating.mjs` compruebe que la prueba de retorno del modal forma parte de la compuerta.
- Registrar el comportamiento y el cambio en SDD.
- Mantener intacta la regla de publicación secuencial: calidad completa, Playwright del mismo SHA y deploy aprobado.

## No objetivos

- No cambiar el funcionamiento del modal.
- No alterar recomendaciones ni datos personales.
- No añadir flujos de publicación alternativos.
