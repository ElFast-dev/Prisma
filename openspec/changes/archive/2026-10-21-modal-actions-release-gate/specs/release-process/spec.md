## ADDED Requirements

### Requirement: Publicación bloqueada por las pruebas de la misma versión

Prisma DEBE ejecutar en una cadena ordenada las pruebas de calidad/SDD, las pruebas de navegador y el despliegue estático. Cada etapa posterior DEBE ejecutarse solo si la anterior termina con éxito, y el despliegue DEBE usar el mismo SHA que ha superado las pruebas de navegador. Una comprobación independiente de sintaxis no sustituye a la batería canónica de calidad.

#### Scenario: Falla una prueba de calidad

- DADO un push a `main` que hace fallar SDD o una prueba automatizada
- CUANDO finaliza el workflow de calidad
- ENTONCES no comienza el workflow de Playwright para esa versión y GitHub Pages no publica ese SHA

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
