# Tareas: sistema visual cinematográfico

## Especificación
- [x] Registrar el alcance visual, las decisiones de tokens, los límites y los criterios de aceptación antes de implementar.
- [x] Definir requisitos de interfaz para la paleta coherente y el movimiento reducido.

## Implementación
- [x] Añadir la hoja final de sistema visual y armonizar acento, foco y estados de interacción.
- [x] Actualizar versiones CSS, inventario de la PWA y nombre de caché.
- [x] Extender las pruebas de modularidad visual, SDD y tokens.
- [x] Actualizar las aserciones Playwright para fondo/acento de marca y conservar los flujos existentes.

## Validación y cierre
- [x] Validar SDD, sintaxis, pruebas estáticas y flujos Playwright en el PR.
- [x] Revisar checks, fusionar el cambio y esperar el despliegue de GitHub Pages.
- [x] Verificar el diseño publicado en escritorio y móvil.
- [x] Archivar la propuesta y registrar la evidencia final de la publicación.

## Evidencia de verificación

- [SDD and static quality — PR #13](https://github.com/ElFast-dev/Prisma/actions/runs/39516013820): correcto.
- [Validate Prisma — PR #13](https://github.com/ElFast-dev/Prisma/actions/runs/39516013790): correcto.
- [Playwright — escritorio y móvil en el PR](https://github.com/ElFast-dev/Prisma/actions/runs/39516013796): correcto.
- [SDD and static quality — main integrado](https://github.com/ElFast-dev/Prisma/actions/runs/39516168908): correcto.
- [Validate Prisma — main integrado](https://github.com/ElFast-dev/Prisma/actions/runs/39516168907): correcto.
- [Despliegue de GitHub Pages](https://github.com/ElFast-dev/Prisma/actions/runs/39516168988): correcto.
- [Playwright — web publicada, escritorio y móvil](https://github.com/ElFast-dev/Prisma/actions/runs/39516242722): correcto. Las capturas quedan en el [artefacto de screenshots](https://github.com/ElFast-dev/Prisma/actions/runs/39516242722/artifacts/12307952757).
- Commit integrado: `5945f818b277197efbd0b28e09a0fd0edc9b57fb`.

Se observaron errores 404 no bloqueantes de un recurso del fixture de póster roto usado por el test de fallback; los flujos de UI y las aserciones funcionales finalizaron correctamente.
