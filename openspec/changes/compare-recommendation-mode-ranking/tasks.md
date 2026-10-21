# Tareas: comparar modos de recomendación

- [x] R1. Revisar cómo se calculan nDCG@5 y la diversidad antes de modificar el algoritmo.
- [x] R2. Crear el expediente SDD y fijar un protocolo común de candidatas retenidas.
- [ ] R3. Extraer y probar la función pura de ranking compartida por producción y evaluación.
- [ ] R4. Calcular nDCG@5 por modo en los mismos cinco pliegues y excluir las notas retenidas del entrenamiento.
- [ ] R5. Actualizar Laboratorio, especificación permanente y documentación de arquitectura/producto.
- [ ] R6. Actualizar pruebas de evaluación, caché PWA y versiones de entrada coordinadamente.
- [ ] R7. Pasar CI, validación y pruebas visuales del PR; corregir cualquier regresión.
- [ ] R8. Fusionar, desplegar y verificar las pruebas del navegador sobre el sitio publicado.
- [ ] R9. Archivar el expediente SDD solo después de que toda la evidencia sea correcta.

## Criterio de aceptación

Los tres modos reciben exactamente el mismo conjunto de candidatas en cada pliegue; la nota de prueba no participa en el perfil de entrenamiento; el motor de producción mantiene el comportamiento previo; Laboratorio presenta nDCG@5 por modo y diversidad Jaccard de forma separada.
