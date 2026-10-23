# Tareas: historial escalable y calendario compacto

- [x] SH1. Limitar la semántica especial de fechas a la exportación Android v2 reconocida y mapear cada fila válida de `movies.cH` a `watchedAt`.
- [x] SH2. Separar procedencia de fecha explícita y racha confirmada de 280 días.
- [x] SH3. Rediseñar la vista de Progreso para desplegar un solo mes por defecto y alinear los días con el calendario real.
- [x] SH4. Ampliar pruebas para fechas anteriores, dentro y posteriores a la racha, y para los cuatro visionados del 18 al 21 de octubre.
- [x] SH5. Renovar versiones del módulo, CSS, entrada de aplicación y shell PWA.
- [x] SH6. Actualizar especificaciones y documentación SDD.
- [x] SH7. Ejecutar CI completo (SDD/calidad, regresiones, caché y Playwright) y corregir los fallos detectados.
- [x] SH8. Integrar, comprobar despliegue y archivar el cambio SDD después de la validación de integración.

## Evidencia de integración y publicación

- PR #86 integrado: https://github.com/ElFast-dev/Prisma/pull/86.
- SHA integrado y publicado: `6b6b4a9fe11077bbab098eef89b318b0f32677d1`.
- Calidad/SDD postintegración: [run 39876156563](https://github.com/ElFast-dev/Prisma/actions/runs/39876156563), resultado satisfactorio sobre el SHA integrado.
- Playwright de escritorio/móvil postintegración: [run 39876222470](https://github.com/ElFast-dev/Prisma/actions/runs/39876222470), resultado satisfactorio; capturas subidas y SHA verificado.
- GitHub Pages: [run 39876830478](https://github.com/ElFast-dev/Prisma/actions/runs/39876830478), resultado satisfactorio. El registro confirma `pages_build_version=6b6b4a9fe11077bbab098eef89b318b0f32677d1`, igual al commit probado.
