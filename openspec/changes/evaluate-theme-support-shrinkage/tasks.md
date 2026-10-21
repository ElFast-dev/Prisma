# Tareas: comparar regularización de temas

- [x] R1. Analizar los datos agregados y el cálculo actual de soporte/pesos de tema.
- [x] R2. Definir en SDD la hipótesis, el comparador y la regla de no cambiar el modelo activo.
- [ ] R3. Añadir la opción de atenuación por soporte para temas, desactivada por defecto.
- [ ] R4. Calcular una comparación MAE emparejada usando las mismas particiones leave-one-out.
- [ ] R5. Mostrar la métrica experimental en Laboratorio y en el diagnóstico agregado.
- [ ] R6. Cubrir el efecto sobre temas de un solo caso, pesos no temáticos, muestra insuficiente, fuga de información y privacidad.
- [ ] R7. Actualizar las especificaciones permanentes, arquitectura y versiones PWA.
- [ ] R8. Ejecutar todas las pruebas de calidad, SDD, inicio vacío, motor de recomendaciones, caché y Playwright.
- [ ] R9. Integrar y archivar el expediente solo cuando todas las comprobaciones pasen.

## Criterios de aceptación
- El modelo base calcula exactamente las mismas predicciones si la opción experimental no se activa.
- El tema con soporte 1 se reduce por un factor 1/3, soporte 2 por 1/2; los pesos de género y década se mantienen.
- La comparación utiliza la misma muestra y el mismo perfil de entrenamiento para ambos modelos, sin utilizar la nota retenida al calcular el perfil.
- La interfaz deja claro que el modelo activo no cambia.
- El informe exporta únicamente métricas agregadas y no datos por película.
