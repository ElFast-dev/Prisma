## ADDED Requirements

### Requirement: Invalidación coherente de recursos versionados

Cuando cambie el JavaScript o cualquier recurso estático incluido en la caché del shell, Prisma DEBE publicar una URL versionada nueva para el recurso modificado y un nombre de caché del shell nuevo. El inventario del service worker y las comprobaciones automatizadas de la versión publicada DEBEN usar el mismo URL que index.html.

#### Scenario: Se publica una versión nueva de JavaScript

- DADO que cambia el contenido de app.js
- CUANDO se prepara una publicación estática de Prisma
- ENTONCES index.html y APP_ASSETS usan el mismo query string nuevo y el service worker crea una caché de shell de versión nueva

#### Scenario: Detección de versiones desincronizadas

- DADO que index.html, el service worker o la prueba de UI declaran URL diferentes para app.js
- CUANDO CI ejecuta la prueba de coherencia de recursos
- ENTONCES la prueba falla con un mensaje que identifica la discrepancia
