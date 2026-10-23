# Tareas: protección contra despliegues obsoletos

- [x] SD1. Reproducir el riesgo de ejecuciones de Playwright que terminan fuera de orden.
- [x] SD2. Comparar la aprobación con el head actual de `main` antes del checkout.
- [x] SD3. Revalidar el head de `main` justo antes de publicar.
- [x] SD4. Añadir regresiones estáticas para comprobar ambos guardas y las condiciones de los pasos.
- [x] SD5. Actualizar el requisito permanente del proceso de lanzamiento.
- [x] SD6. Ejecutar calidad/SDD y Playwright sobre el mismo SHA del PR; corregir fallos.
- [x] SD7. Integrar el cambio y comprobar que el gate de lanzamiento pasa en `main`.
- [x] SD8. Verificar Pages con el SHA actual y archivar este expediente con evidencia.

## Evidencia de integración y publicación

- PR #89 integrado: https://github.com/ElFast-dev/Prisma/pull/89.
- SHA previo a integrar validado por ambas compuertas: `0aaf06b88e6de9cc7a26cfd3326b3850cbc5a6d3`.
- Calidad/SDD y test del gate de lanzamiento: [run 39885046646](https://github.com/ElFast-dev/Prisma/actions/runs/39885046646), éxito.
- Playwright de escritorio/móvil: [run 39885046624](https://github.com/ElFast-dev/Prisma/actions/runs/39885046624), éxito sobre el mismo SHA.
- Calidad y Playwright postintegración de main: [quality run 39885222473](https://github.com/ElFast-dev/Prisma/actions/runs/39885222473) y [UI run 39885249420](https://github.com/ElFast-dev/Prisma/actions/runs/39885249420), ambos satisfactorios sobre `e4442b17aa9116e1fc83e9bc974c36b58543d231`.
- Pages: [run 39885424941](https://github.com/ElFast-dev/Prisma/actions/runs/39885424941), éxito. El log confirma que la aprobación coincide con el head actual al inicio y justo antes de publicar; `pages_build_version=e4442b17aa9116e1fc83e9bc974c36b58543d231`.
- El gate nuevo omite las aprobaciones obsoletas y falla de forma segura si no puede resolver `refs/heads/main`.
