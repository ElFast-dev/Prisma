# Tareas: dividir vistas modales

- [x] MV1. Extraer panel auxiliar, ficha de película, ficha de persona y editor de puntuación a módulos independientes y mantener la fachada pública.
- [x] MV2. Añadir pruebas de APIs/renderizado y pruebas de arquitectura para proteger los límites modulares.
- [x] MV3. Sincronizar las URLs versionadas de entrada y vistas en HTML, service worker, suite de caché y Playwright.
- [x] MV4. Actualizar el mapa de arquitectura, el requisito permanente y el validador SDD.
- [x] MV5. Ejecutar quality/SDD, regresiones y Playwright sobre el mismo SHA del PR; corregir cualquier fallo.
- [x] MV6. Integrar el cambio, verificar Pages sobre el SHA actual y archivar con evidencia.

## Criterios de aceptación

- `createModalViews(ctx)` conserva exactamente los cuatro métodos públicos actuales.
- Las pruebas de integración generan los paneles, la ficha de película, la ficha de persona y la hoja de puntuación con datos sintéticos.
- Todas las rutas relativas y consultas de caché coinciden en HTML, imports, service worker y Playwright.
- El algoritmo activo, las acciones y los datos personales no cambian.

## Evidencia de finalización

- PR #106 integrado: https://github.com/ElFast-dev/Prisma/pull/106.
- Validación del PR, SHA `a806860049a4e18ba94dc1dbde8882b19c1b5e9c`: quality/SDD https://github.com/ElFast-dev/Prisma/actions/runs/39901909116 y Playwright https://github.com/ElFast-dev/Prisma/actions/runs/39901909130.
- Release integrado en `main`, SHA `f0c8fbf5829104a9a209da5eb41beaaa0d2c7c39`: quality/SDD https://github.com/ElFast-dev/Prisma/actions/runs/39902090084, Playwright https://github.com/ElFast-dev/Prisma/actions/runs/39902114288 y GitHub Pages https://github.com/ElFast-dev/Prisma/actions/runs/39902260446. Los tres controles terminaron correctamente sobre ese mismo SHA.
