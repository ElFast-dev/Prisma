# Tareas: calidad de ranking y diversidad

- [x] R1. Crear y revisar el expediente SDD antes de cambiar el código.
- [x] R2. Implementar módulo de evaluación separado con validación cruzada determinista y nDCG@5.
- [x] R3. Implementar disimilitud de géneros para las listas reales de los tres modos.
- [x] R4. Conectar los diagnósticos al Laboratorio sin alterar la lógica de ranking de Descubrir.
- [x] R5. Probar nDCG perfecto/degradado, notas retenidas, identidad de títulos, umbrales de muestra, determinismo y diversidad Jaccard.
- [x] R6. Actualizar especificaciones permanentes, arquitectura, documentación y cobertura de caché PWA.
- [x] R7. Ejecutar CI, pruebas visuales y despliegue; archivar solo con evidencia real.

## Evidencia de verificación

- SDD, sintaxis, arquitectura modular y pruebas funcionales, incluida la nueva evaluación nDCG@5 y diversidad: correcto, [workflow 39542760746](https://github.com/ElFast-dev/Prisma/actions/runs/39542760746).
- Validación de Prisma: correcta, [workflow 39542760718](https://github.com/ElFast-dev/Prisma/actions/runs/39542760718).
- Pruebas de navegador y capturas visuales: correctas, [workflow 39542760548](https://github.com/ElFast-dev/Prisma/actions/runs/39542760548).

## Cierre y límites

El nDCG@5 usa cinco pliegues deterministas, ganancias explícitas derivadas de las notas (7–10 relevantes) y no participa en el ajuste automático del recomendador. La métrica puede depender de la muestra y del protocolo offline; no representa una garantía de satisfacción personal ni reemplaza una prueba de uso real. La diversidad Jaccard se refiere exclusivamente a géneros de la lista, no a serendipia o diversidad percibida. Esta entrega instrumenta el diagnóstico y no cambia los pesos ni el orden de producción de Descubrir.