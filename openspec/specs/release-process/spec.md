# Proceso de publicación

## Requirements

### Requirement: Publicación bloqueada por las pruebas de la misma versión

La publicación de Prisma DEBE estar encadenada: la validación canónica de SDD y la batería de pruebas se ejecutan primero, Playwright valida localmente el mismo SHA después y GitHub Pages solo publica si ambos workflows terminaron con éxito. El deploy DEBE descargar el mismo SHA probado por Playwright y NO DEBE tener un trigger directo de `push` o una opción manual que evite la cadena de validación.

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

#### Scenario: Ejecución manual de Playwright

- DADO que alguien ejecuta manualmente el workflow de capturas
- CUANDO termina correctamente
- ENTONCES esa ejecución aislada no activa el despliegue
