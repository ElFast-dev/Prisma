# Tareas: prueba del controlador de modal en CI

- [x] MC1. Añadir `test-modal-controller.mjs` a la batería de calidad canónica.
- [x] MC2. Extender el test de compuerta para exigir la prueba del controlador de retorno.
- [x] MC3. Añadir un requisito SDD permanente para que las pruebas de regresión del controlador de modal formen parte de la batería previa a publicación.
- [ ] MC4. Verificar quality, Playwright e integración de la versión en `main`.
- [ ] MC5. Archivar este expediente SDD con evidencia de la publicación aprobada.

## Criterios de aceptación

- El workflow de calidad ejecuta el test de controlador en cada PR a `main` y cada push a `main`.
- El test de la compuerta falla si se elimina el paso del controlador.
- Una regresión al retorno de la ficha bloquea Playwright y, por ende, el despliegue.
