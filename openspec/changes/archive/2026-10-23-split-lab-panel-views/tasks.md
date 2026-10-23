# Tareas: dividir los paneles Ridge del Laboratorio

- [x] LV1. Extraer `renderRidgeExperimentPanel` a `js/ui/lab-ridge-view.js`.
- [x] LV2. Extraer `renderTemporalRidgePanel` a `js/ui/lab-temporal-view.js`.
- [x] LV3. Mantener `createLabViews(ctx)` y `renderLab` como API pública.
- [x] LV4. Versionar módulos, entrada y shell PWA; precargar ambas dependencias nuevas.
- [x] LV5. Actualizar arquitectura y ampliar pruebas de módulos, caché, Ridge y evaluación.
- [x] LV6. Ejecutar quality/SDD y la batería completa; corregir cualquier fallo.
- [x] LV7. Ejecutar Playwright sobre el mismo SHA aprobado por quality.
- [x] LV8. Integrar y verificar Pages con el SHA actual; archivar el expediente con evidencia.

## Evidencia de finalización

- Código integrado en `main`: `94a93feaa875d95a8a15e8c71b4e89db9b817bf4`.
- Calidad SDD y regresiones: [ejecución 39898552475](https://github.com/ElFast-dev/Prisma/actions/runs/39898552475), correcta sobre el SHA indicado.
- Playwright: [ejecución 39898585458](https://github.com/ElFast-dev/Prisma/actions/runs/39898585458), correcta sobre el mismo SHA.
- GitHub Pages: [ejecución 39898747169](https://github.com/ElFast-dev/Prisma/actions/runs/39898747169), correcta sobre el mismo SHA. La validación final de `main` previa a la publicación terminó correctamente.
