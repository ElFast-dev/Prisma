# Tareas: extraer las vistas de Ajustes y Datos

- [x] SV1. Extraer los renderizadores de Apariencia, TMDB, protección del almacenamiento y Datos a `js/ui/settings-views.js`.
- [x] SV2. Mantener `renderTMDBSettings` y `renderData` como funciones públicas de `createPageViews(ctx)`.
- [x] SV3. Versionar el módulo, la vista general, la entrada y el shell PWA; precargar el módulo nuevo.
- [x] SV4. Actualizar pruebas de arquitectura, tema, protección del almacenamiento, caché y comprobación de sintaxis.
- [x] SV5. Documentar el límite nuevo en `docs/architecture.md` y añadir el expediente SDD al validador.
- [x] SV6. Ejecutar quality/SDD y regresiones completas; corregir fallos.
- [x] SV7. Ejecutar Playwright sobre el mismo SHA aprobado por quality.
- [x] SV8. Integrar y comprobar Pages contra el SHA actual; archivar el expediente con evidencia.


## Evidencia de integración y publicación

- Cambio integrado: [PR #95](https://github.com/ElFast-dev/Prisma/pull/95).
- Calidad/SDD: [run 39892647509](https://github.com/ElFast-dev/Prisma/actions/runs/39892647509), éxito; Playwright: [run 39892647518](https://github.com/ElFast-dev/Prisma/actions/runs/39892647518), éxito sobre el mismo SHA.
- Quality/SDD y Playwright de main combinado: [39898552475](https://github.com/ElFast-dev/Prisma/actions/runs/39898552475) y [39898585458](https://github.com/ElFast-dev/Prisma/actions/runs/39898585458), ambos con éxito sobre `94a93feaa875d95a8a15e8c71b4e89db9b817bf4`.
- Pages: [run 39898747169](https://github.com/ElFast-dev/Prisma/actions/runs/39898747169), éxito, `pages_build_version=94a93feaa875d95a8a15e8c71b4e89db9b817bf4`; la aprobación y revalidación previa coincidieron con main.
