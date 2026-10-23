# Tareas: extraer las vistas de Ajustes y Datos

- [x] SV1. Extraer los renderizadores de Apariencia, TMDB, protección del almacenamiento y Datos a `js/ui/settings-views.js`.
- [x] SV2. Mantener `renderTMDBSettings` y `renderData` como funciones públicas de `createPageViews(ctx)`.
- [x] SV3. Versionar el módulo, la vista general, la entrada y el shell PWA; precargar el módulo nuevo.
- [x] SV4. Actualizar pruebas de arquitectura, tema, protección del almacenamiento, caché y comprobación de sintaxis.
- [x] SV5. Documentar el límite nuevo en `docs/architecture.md` y añadir el expediente SDD al validador.
- [x] SV6. Ejecutar quality/SDD y regresiones completas; corregir fallos.
- [x] SV7. Ejecutar Playwright sobre el mismo SHA aprobado por quality.
- [x] SV8. Integrar y comprobar Pages contra el SHA actual; archivar el expediente con evidencia.

## Evidencia de finalización

- Código integrado en `main`: `94a93feaa875d95a8a15e8c71b4e89db9b817bf4`.
- Calidad SDD y regresiones: [ejecución 39898552475](https://github.com/ElFast-dev/Prisma/actions/runs/39898552475), correcta sobre el SHA indicado.
- Playwright: [ejecución 39898585458](https://github.com/ElFast-dev/Prisma/actions/runs/39898585458), correcta sobre el mismo SHA.
- GitHub Pages: [ejecución 39898747169](https://github.com/ElFast-dev/Prisma/actions/runs/39898747169), correcta sobre el mismo SHA. La validación final de `main` previa a la publicación terminó correctamente.
