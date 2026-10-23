# Proceso de publicación

## Requirements

### Requirement: Publicación bloqueada por las pruebas de la misma versión

La publicación de Prisma DEBE estar encadenada: la validación canónica de SDD y la batería de pruebas se ejecutan primero, Playwright valida localmente el mismo SHA después y GitHub Pages solo publica si ambos workflows terminaron con éxito. El deploy DEBE descargar el mismo SHA probado por Playwright y NO DEBE tener un trigger directo de `push` o una opción manual que evite la cadena de validación. Además, el deploy DEBE comprobar que el SHA aprobado siga siendo el head actual de `main` tanto al validar la aprobación como inmediatamente antes de publicar; una aprobación obsoleta DEBE omitirse para impedir regresiones de versión.

#### Scenario: Falla una prueba de calidad

- DADO un push a `main` que hace fallar SDD o una prueba automatizada
- CUANDO finaliza el workflow de calidad
- ENTONCES no se ejecuta Playwright para esa versión y GitHub Pages no publica ese SHA

#### Scenario: Falla Playwright

- DADO que la batería de calidad terminó correctamente
- CUANDO Playwright encuentra un fallo en un flujo de interfaz
- ENTONCES el workflow de despliegue no se inicia

#### Scenario: Publicar una versión probada

- DADO que calidad y Playwright terminaron con éxito sobre un commit
- CUANDO empieza el despliegue
- ENTONCES se descarga y publica exactamente el SHA probado por Playwright

#### Scenario: La aprobación queda obsoleta

- DADO que un commit pasó calidad y Playwright, pero después `main` avanzó a otro SHA
- CUANDO el workflow de Pages valida la aprobación o vuelve a comprobar `main` antes de publicar
- ENTONCES omite el despliegue del SHA antiguo y no revierte la versión más reciente

#### Scenario: Ejecución manual de Playwright

- DADO que alguien ejecuta manualmente el workflow de capturas
- CUANDO termina correctamente
- ENTONCES esa ejecución aislada no activa el despliegue

### Requirement: La regresión del controlador de modal forma parte de la compuerta

La batería canónica de calidad DEBE ejecutar la prueba del controlador de modal y la prueba de la compuerta de publicación DEBE verificar que esa ejecución sigue presente.

#### Scenario: Se elimina accidentalmente la prueba de retorno

- DADO que se edita el workflow canónico de calidad
- CUANDO se elimina el paso `test-modal-controller.mjs`
- ENTONCES `test-release-gating.mjs` DEBE fallar y bloquear la cadena de publicación

#### Scenario: Regresión en el modal de calificación

- DADO que una edición iniciada desde una ficha no restaura esa ficha, o una edición iniciada desde una lista crea una ficha ficticia
- CUANDO se ejecuta la batería canónica de calidad
- ENTONCES la prueba del controlador DEBE fallar y la compuerta no debe autorizar Playwright ni el despliegue para ese commit

