# Tareas: extraer la vista de Progreso

- [x] PV1. Extraer `renderHome` a `js/ui/progress-views.js`.
- [x] PV2. Mantener `renderHome` en la API pública de `createPageViews(ctx)` e inyectar el renderizador de racha.
- [x] PV3. Actualizar versiones de módulo, entrada, shell PWA y precaché.
- [x] PV4. Ampliar pruebas de arquitectura, igualdad funcional de la bienvenida y consistencia de caché.
- [x] PV5. Documentar responsabilidades en `docs/architecture.md` y crear expediente SDD.
- [x] PV6. Ejecutar quality/SDD y todas las regresiones; corregir cualquier fallo.
- [x] PV7. Ejecutar Playwright sobre el mismo SHA aprobado por quality.
- [x] PV8. Integrar y verificar GitHub Pages con la protección contra SHA obsoletos; archivar con evidencia.

## Evidencia de finalización

- Código integrado en `main`: `94a93feaa875d95a8a15e8c71b4e89db9b817bf4`.
- Calidad SDD y regresiones: [ejecución 39898552475](https://github.com/ElFast-dev/Prisma/actions/runs/39898552475), correcta sobre el SHA indicado.
- Playwright: [ejecución 39898585458](https://github.com/ElFast-dev/Prisma/actions/runs/39898585458), correcta sobre el mismo SHA.
- GitHub Pages: [ejecución 39898747169](https://github.com/ElFast-dev/Prisma/actions/runs/39898747169), correcta sobre el mismo SHA. La validación final de `main` previa a la publicación terminó correctamente.
