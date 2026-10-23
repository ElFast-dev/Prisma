## ADDED Requirements

### Requirement: La regresión del controlador de modal forma parte de la compuerta

La batería canónica de calidad DEBE ejecutar la prueba del controlador de modal y la prueba de la compuerta de publicación DEBE verificar que esa ejecución sigue presente.

#### Scenario: Se elimina accidentalmente la prueba de retorno

- DADO que se edita el workflow canónico de calidad
- CUANDO se elimina el paso `test-modal-controller.mjs`
- ENTONCES `test-release-gating.mjs` debe fallar y bloquear la cadena de publicación

#### Scenario: Regresión en el modal de calificación

- DADO que una edición iniciada desde una ficha no restaura esa ficha, o una edición iniciada desde una lista crea una ficha ficticia
- CUANDO se ejecuta la batería canónica de calidad
- ENTONCES la prueba del controlador falla y no comienza Playwright ni el despliegue para ese commit
