# Tareas: validación temporal Ridge

- [ ] TR1. Especificar fechas válidas, límites, privacidad y escenarios walk-forward.
- [ ] TR2. Implementar cruce por identidad, impedir que la edición de notas genere fechas de visionado desde updatedAt y validar selección temporal sin fuga.
- [ ] TR3. Añadir ejecución bajo demanda, progreso, cancelación y resultados diferenciados en el Laboratorio.
- [ ] TR4. Incorporar métricas agregadas temporales al diagnóstico y versionar su esquema a v5.
- [ ] TR5. Probar fechas ausentes, límites de muestra, orden temporal, selección de alpha y ausencia de fuga.
- [ ] TR6. Actualizar documentación, inventario de caché PWA y contratos de CI/Playwright.
- [ ] TR7. Confirmar checks del PR, publicar, verificar navegador y archivar el expediente.

## Criterios de aceptación

- Ningún registro del entrenamiento tiene una fecha de visionado igual o posterior al inicio de su ventana exterior de prueba.
- La selección de alpha usa solo ventanas internas anteriores a cada ventana exterior.
- Las películas con fecha ausente/inválida no participan, y su cantidad se informa sin nombres ni fechas.
- Fechas, IDs, títulos, notas y predicciones individuales no se exportan.
- El cálculo no se ejecuta al abrir el Laboratorio, cancela resultados obsoletos y no altera recomendaciones ni almacenamiento.
- Los mínimos insuficientes devuelven métricas no disponibles en vez de cifras parciales fabricadas.
