# Tareas: ordenar Descubrir y Colección

- [x] Inspeccionar los renderizadores actuales de tarjetas, Colección, sheets y ficha.
- [x] Registrar la jerarquía propuesta, los límites de datos y escenarios observables bajo SDD.
- [x] Crear la variante de tarjeta solo-póster accesible para todos los resultados de Descubrir.
- [x] Reorganizar selector, pestañas y herramientas de Colección sin cambiar su comportamiento.
- [x] Aplicar la cuadrícula reciente 2×2 y pulir estados visuales responsive.
- [x] Añadir y ejecutar las comprobaciones Playwright para cuadrículas, ficha, controles de Colección y móvil; ver run #126.
- [x] Actualizar la especificación vigente tras pasar las pruebas.
- [x] Ejecutar y revisar todos los workflows en el commit funcional final.
- [x] Aceptar mediante revisión técnica delegada y archivar el expediente tras pasar todos los checks.

## Evidencia

Evidencia del commit funcional `d3e173201944cb6ec6b5d16e76a63d2e54bea438`:
- [SDD and static quality — run #48](https://github.com/ElFast-dev/Prisma/actions/runs/39484986654): correcto.
- [Validate Prisma — run #155](https://github.com/ElFast-dev/Prisma/actions/runs/39484986627): correcto.
- [Prisma UI screenshots — run #126](https://github.com/ElFast-dev/Prisma/actions/runs/39484986589): correcto; Playwright verificó escritorio y móvil, tarjetas poster-only, apertura de ficha, jerarquía de Colección, hojas inferiores, filtro «Estrenada», recientes 2×2 y ocultación por identidad TMDB.

El commit que archiva esta evidencia vuelve a pasar por workflows antes de integrar.
