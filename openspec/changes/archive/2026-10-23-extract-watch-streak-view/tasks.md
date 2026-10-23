# Tareas: extraer la vista del calendario de racha

- [x] WV1. Extraer el render del calendario a `js/ui/watch-streak-view.js`.
- [x] WV2. Mantener `renderConfirmedWatchStreakPanel` disponible en la API de `createPageViews`.
- [x] WV3. Sincronizar versiones de módulo, entrada, caché PWA y pruebas de lanzamiento.
- [x] WV4. Añadir regresión de igualdad de marcado y registrar la nueva responsabilidad en la arquitectura.
- [x] WV5. Ejecutar calidad/SDD, pruebas de caché, arquitectura, importación y racha; corregir cualquier fallo.
- [x] WV6. Ejecutar Playwright sobre el mismo SHA aprobado por calidad.
- [x] WV7. Integrar y verificar GitHub Pages usando el SHA validado.
- [x] WV8. Archivar esta especificación con evidencia de publicación.

## Evidencia de integración y publicación

- PR de código #88 integrado: https://github.com/ElFast-dev/Prisma/pull/88.
- SHA previo a integrar validado por ambas compuertas: `fe44fdf0cfe18d640c6c9bda77f07c08e93cd1a9`.
- Calidad/SDD y pruebas de módulos, caché y regresión: [run 39884387127](https://github.com/ElFast-dev/Prisma/actions/runs/39884387127), éxito.
- Playwright de escritorio/móvil: [run 39884387039](https://github.com/ElFast-dev/Prisma/actions/runs/39884387039), éxito sobre el mismo SHA.
- Validación postintegración en main: [quality run 39884576177](https://github.com/ElFast-dev/Prisma/actions/runs/39884576177) y [Playwright run 39884609996](https://github.com/ElFast-dev/Prisma/actions/runs/39884609996), ambos satisfactorios sobre `7d37b6718e33b96a18822bf2ffbcea34fec19db0`.
- Publicación final que incluye la vista modular: [Pages run 39885424941](https://github.com/ElFast-dev/Prisma/actions/runs/39885424941). El workflow comprobó que el SHA aprobado coincidía con main y `pages_build_version=e4442b17aa9116e1fc83e9bc974c36b58543d231`.
