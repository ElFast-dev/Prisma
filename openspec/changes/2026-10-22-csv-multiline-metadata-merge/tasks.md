# Tareas

- [x] Inspeccionar parser CSV, formato MovieLens, importación persistente y pruebas de regresión existentes.
- [x] Definir la lectura de registros lógicos entrecomillados y la reconciliación de duplicados.
- [x] Implementar soporte para saltos multilínea y comillas escapadas.
- [x] Combinar metadatos repetidos de la misma identidad sin eliminar remakes ni reemplazar años conocidos en conflicto.
- [x] Ampliar las pruebas puras para CSV/TSV, sinopsis multilínea, identidades repetidas y datos mal formados.
- [x] Añadir cobertura Playwright para comprobar el campo multilínea tras importarlo en el navegador.
- [x] Actualizar la especificación vigente y la documentación relevante.
- [x] Invalidar la entrada/caché PWA y actualizar las verificaciones de versión.
- [x] Ejecutar calidad completa y Playwright de escritorio/móvil sobre el mismo código verificado.
- [x] Corregir regresiones detectadas y volver a ejecutar las compuertas: ambas suites terminaron verdes.
- [x] Fusionar el PR #79 después de las compuertas verdes.
- [x] Confirmar que GitHub Pages publicó exactamente el SHA de main fusionado.
- [x] Archivar este expediente tras demostrar la convergencia entre código, pruebas, documentación y despliegue.

## Evidencia de verificación, integración y despliegue

- PR #79 fusionado: commit `c5791c80ed17c12a7d2da0e6ad13817a0de8e985`.
- Calidad/SDD antes de la fusión: [run 39866884761](https://github.com/ElFast-dev/Prisma/actions/runs/39866884761).
- Playwright de escritorio y móvil antes de la fusión: [run 39866884546](https://github.com/ElFast-dev/Prisma/actions/runs/39866884546).
- Calidad/SDD tras la fusión sobre el SHA `c5791c80ed17c12a7d2da0e6ad13817a0de8e985`: [run 39867123658](https://github.com/ElFast-dev/Prisma/actions/runs/39867123658).
- Playwright de escritorio y móvil tras la fusión sobre el mismo SHA: [run 39867168097](https://github.com/ElFast-dev/Prisma/actions/runs/39867168097).
- GitHub Pages publicó el mismo SHA, verificado por el artefacto de aprobación descargado y validado antes del despliegue: [run 39867363125](https://github.com/ElFast-dev/Prisma/actions/runs/39867363125).
- Los logs del paso `Validate approved source SHA` confirmaron exactamente `c5791c80ed17c12a7d2da0e6ad13817a0de8e985`, y los pasos de subida de estáticos y despliegue finalizaron correctamente.
