# Tareas: dividir vistas modales

- [x] MV1. Extraer panel auxiliar, ficha de película, ficha de persona y editor de puntuación a módulos independientes y mantener la fachada pública.
- [x] MV2. Añadir pruebas de APIs/renderizado y pruebas de arquitectura para proteger los límites modulares.
- [x] MV3. Sincronizar las URLs versionadas de entrada y vistas en HTML, service worker, suite de caché y Playwright.
- [x] MV4. Actualizar el mapa de arquitectura, el requisito permanente y el validador SDD.
- [ ] MV5. Ejecutar quality/SDD, regresiones y Playwright sobre el mismo SHA del PR; corregir cualquier fallo.
- [ ] MV6. Integrar el cambio, verificar Pages sobre el SHA actual y archivar con evidencia.

## Criterios de aceptación

- `createModalViews(ctx)` conserva exactamente los cuatro métodos públicos actuales.
- Las pruebas de integración generan los paneles, la ficha de película, la ficha de persona y la hoja de puntuación con datos sintéticos.
- Todas las rutas relativas y consultas de caché coinciden en HTML, imports, service worker y Playwright.
- El algoritmo activo, las acciones y los datos personales no cambian.
