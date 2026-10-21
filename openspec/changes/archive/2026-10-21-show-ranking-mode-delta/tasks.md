# Tareas: mostrar diferencia de ranking por modo

- [x] R1. Revisar el Laboratorio actual y distinguir evaluación offline de diversidad de listas vivas.
- [x] R2. Crear el expediente SDD antes de editar vistas.
- [x] R3. Mostrar nDCG@5 y diferencia frente a Más afines para cada modo comparable.
- [x] R4. Explicar referencia ausente y evitar presentar la diferencia como significación estadística.
- [x] R5. Añadir cobertura automática, actualizar requisito permanente y documentación.
- [x] R6. Actualizar versión de entrada/caché PWA y sus verificaciones.
- [x] R7. Pasar validación, calidad/SDD, pruebas de navegador y despliegue.
- [x] R8. Archivar el expediente solo después de que todas las verificaciones pertinentes sean correctas.

## Criterio de aceptación

La referencia se identifica como Más afines; los otros modos muestran delta absoluto solo si ambas cifras están disponibles; el ranking y sus pesos permanecen intactos; la diversidad Jaccard sigue siendo una medida independiente.


## Evidencia de cierre

- PR #32 integrado en `main`: https://github.com/ElFast-dev/Prisma/pull/32
- Calidad/SDD del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39546076643
- Validación del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39546076678
- Pruebas visuales del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39546076802
- Calidad/SDD en `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39546218104
- Validación en `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39546218111
- Despliegue de GitHub Pages: https://github.com/ElFast-dev/Prisma/actions/runs/39546218236
- Pruebas visuales posteriores al despliegue: https://github.com/ElFast-dev/Prisma/actions/runs/39546257489 (success)

## Resultado y límites

El Laboratorio muestra nDCG@5 y el delta descriptivo de Equilibrado y Más variedad respecto a Más afines cuando existe referencia comparable. La referencia no se inventa si falta una métrica. Se mantienen separados los indicadores de ranking offline y diversidad Jaccard del catálogo actual. No se alteraron el algoritmo, los pesos ni las preferencias personales.
