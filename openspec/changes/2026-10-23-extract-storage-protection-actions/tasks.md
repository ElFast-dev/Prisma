# Tareas: extraer las acciones de protección del almacenamiento

- [x] R1. Inspeccionar el estado actual de main, ambas acciones, sus dependencias, pruebas, SDD y PWA.
- [x] R2. Crear propuesta, diseño, tareas y especificación delta antes de modificar el código de ejecución.
- [x] R3. Crear `js/app/storage-protection-actions.js` e inyectar las dependencias desde `app.js`.
- [x] R4. Probar inspección, concesión, denegación, falta de soporte, errores síncronos/asíncronos, concurrencia, repetición, actualización de UI y liberación del bloqueo.
- [x] R5. Registrar el módulo en la arquitectura, pruebas, CI, versionado y caché PWA.
- [x] R6. Ejecutar sintaxis, SDD, modularidad, pruebas específicas, regresión y Playwright sobre el mismo SHA del PR.
- [ ] R7. Integrar solo después de las validaciones y verificar el SHA exacto publicado en GitHub Pages.
- [ ] R8. Archivar este expediente y documentar la evidencia del release.

## Límites de datos

No se modifica el almacenamiento personal, las valoraciones, las fechas, las colecciones, los metadatos de TMDB ni el recomendador. Las pruebas usan datos sintéticos.


## Evidencia previa a integración

- Rama: `refactor/extract-storage-protection-actions-20261023`.
- SHA probado: `5cf3d7968af9dfa4c615db69118e3e4912221468`.
- SDD, sintaxis y batería Quality: https://github.com/ElFast-dev/Prisma/actions/runs/39919974664 (éxito).
- Playwright / flujos de UI: https://github.com/ElFast-dev/Prisma/actions/runs/39919974629 (éxito).
- Las comprobaciones anteriores fueron ejecutadas por GitHub Actions sobre el mismo SHA probado.
- La integración y publicación exacta permanecen pendientes de los checks del commit final y del despliegue de `main`.
