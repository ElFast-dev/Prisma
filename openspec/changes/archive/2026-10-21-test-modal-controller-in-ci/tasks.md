# Tareas: prueba del controlador de modal en CI

- [x] MC1. Añadir `test-modal-controller.mjs` a la batería de calidad canónica.
- [x] MC2. Extender el test de compuerta para exigir la prueba del controlador de retorno.
- [x] MC3. Añadir un requisito SDD permanente para que las pruebas de regresión del controlador de modal formen parte de la batería previa a publicación.
- [x] MC4. Verificar quality, Playwright e integración de la versión en `main`.
- [x] MC5. Archivar este expediente SDD con evidencia de la publicación aprobada.

## Criterios de aceptación

- El workflow de calidad ejecuta el test de controlador en cada PR a `main` y cada push a `main`.
- El test de la compuerta falla si se elimina el paso del controlador.
- Una regresión al retorno de la ficha bloquea Playwright y, por ende, el despliegue.
## Evidencia de finalización

- Código y especificaciones integrados en `main`: `a1bf376436c4c2677a2eba8afb7da37f21fcc4de`.
- PR #59: https://github.com/ElFast-dev/Prisma/pull/59 (fusionado).
- PR #59, quality: https://github.com/ElFast-dev/Prisma/actions/runs/39899963832; Playwright: https://github.com/ElFast-dev/Prisma/actions/runs/39899963831.
- Release del commit `ef2fda2ee644349725e2d56607f55744c15696d9`: quality https://github.com/ElFast-dev/Prisma/actions/runs/39900136486; Playwright https://github.com/ElFast-dev/Prisma/actions/runs/39900160163; Pages https://github.com/ElFast-dev/Prisma/actions/runs/39900310886.
- Revalidación de `main` tras Ridge, SHA `a1bf376436c4c2677a2eba8afb7da37f21fcc4de`: quality https://github.com/ElFast-dev/Prisma/actions/runs/39900358981; Playwright https://github.com/ElFast-dev/Prisma/actions/runs/39900379124; Pages https://github.com/ElFast-dev/Prisma/actions/runs/39900538529. Los tres finalizaron correctamente sobre ese mismo SHA.
