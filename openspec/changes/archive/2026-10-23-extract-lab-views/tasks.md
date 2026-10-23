# Tareas: extraer las vistas del Laboratorio

- [x] LV1. Extraer los cinco renderizadores del Laboratorio de `page-views.js` a `js/ui/lab-views.js`.
- [x] LV2. Mantener `renderLab` como API de `createPageViews(ctx)` y mover la dependencia del resumen Ridge al módulo especializado.
- [x] LV3. Versionar módulo, entrada, vista principal y shell PWA; precargar el archivo nuevo.
- [x] LV4. Actualizar las pruebas de arquitectura, caché, Ridge y diagnóstico para inspeccionar el módulo correcto.
- [x] LV5. Documentar responsabilidades en `docs/architecture.md` y especificación SDD.
- [x] LV6. Ejecutar quality/SDD y toda la regresión, incluida evaluación del recomendador, importación, caché y arquitectura; corregir fallos.
- [x] LV7. Ejecutar Playwright sobre el mismo SHA que pasó quality.
- [ ] LV8. Integrar y comprobar Pages con el SHA validado; archivar el expediente con evidencia.


## Evidencia previa a integración

- PR #91 integrado: https://github.com/ElFast-dev/Prisma/pull/91.
- SHA probado antes de integrar: `d259ab1903e971a596c322e893748a8375a69317`.
- Quality/SDD y regresiones: [run 39886308215](https://github.com/ElFast-dev/Prisma/actions/runs/39886308215), éxito.
- Playwright de escritorio/móvil: [run 39886308190](https://github.com/ElFast-dev/Prisma/actions/runs/39886308190), éxito sobre el mismo SHA.
