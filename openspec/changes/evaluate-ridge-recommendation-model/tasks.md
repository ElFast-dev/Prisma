# Tareas: experimento Ridge en el Laboratorio

- [ ] R1. Inspeccionar motor, pruebas, informe diagnóstico, eventos y caché PWA.
- [ ] R2. Definir validación cruzada anidada y selección de alpha antes de implementar.
- [ ] R3. Añadir módulo Ridge puro con solver numérico y pruebas sintéticas.
- [ ] R4. Comparar Ridge y modelo aditivo en los mismos cinco pliegues externos.
- [ ] R5. Añadir un control de ejecución explícita y resultados agregados en el Laboratorio.
- [ ] R6. Incluir resultados Ridge en el informe diagnóstico solo si la prueba se ejecutó.
- [ ] R7. Probar determinismo, identidad, muestra insuficiente, clipping, falta de fuga y privacidad.
- [ ] R8. Actualizar especificaciones, arquitectura, validador SDD y caché PWA.
- [ ] R9. Ejecutar pruebas de lógica, modularidad, caché y navegador.
- [ ] R10. Fusionar, desplegar, verificar el sitio publicado y archivar el expediente.

## Criterios de aceptación

- Ridge utiliza regularización L2 positiva y un intercepto no penalizado.
- Alpha se escoge únicamente con pliegues internos del entrenamiento externo.
- Ambos modelos usan exactamente las mismas películas retenidas en la evaluación externa.
- No hay filas, títulos, IDs, fechas ni errores individuales en informes.
- No cambia la producción y no se persiste historial ni resultado del experimento.
- Menos de 30 valoraciones evaluables muestra estado no disponible.
