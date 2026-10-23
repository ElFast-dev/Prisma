# Tareas: extraer las acciones de protección del almacenamiento

- [x] R1. Inspeccionar el estado actual de main, ambas acciones, sus dependencias, pruebas, SDD y PWA.
- [x] R2. Crear propuesta, diseño, tareas y especificación delta antes de modificar el código de ejecución.
- [ ] R3. Crear `js/app/storage-protection-actions.js` e inyectar las dependencias desde `app.js`.
- [ ] R4. Probar inspección, concesión, denegación, falta de soporte, errores síncronos/asíncronos, concurrencia, repetición, actualización de UI y liberación del bloqueo.
- [ ] R5. Registrar el módulo en la arquitectura, pruebas, CI, versionado y caché PWA.
- [ ] R6. Ejecutar sintaxis, SDD, modularidad, pruebas específicas, regresión y Playwright sobre el mismo SHA del PR.
- [ ] R7. Integrar solo después de las validaciones y verificar el SHA exacto publicado en GitHub Pages.
- [ ] R8. Archivar este expediente y documentar la evidencia del release.

## Límites de datos

No se modifica el almacenamiento personal, las valoraciones, las fechas, las colecciones, los metadatos de TMDB ni el recomendador. Las pruebas usan datos sintéticos.
