# Tareas: comparar regularización de temas

- [x] R1. Analizar los datos agregados y el cálculo actual de soporte/pesos de tema.
- [x] R2. Definir en SDD la hipótesis, el comparador y la regla de no cambiar el modelo activo.
- [x] R3. Añadir la opción de atenuación por soporte para temas, desactivada por defecto.
- [x] R4. Calcular una comparación MAE emparejada usando las mismas particiones leave-one-out.
- [x] R5. Mostrar la métrica experimental en Laboratorio y en el diagnóstico agregado.
- [x] R6. Cubrir el efecto sobre temas de un solo caso, pesos no temáticos, muestra insuficiente, fuga de información y privacidad.
- [x] R7. Actualizar las especificaciones permanentes, arquitectura y versiones PWA.
- [x] R8. Ejecutar todas las pruebas de calidad, SDD, inicio vacío, motor de recomendaciones, caché y Playwright.
- [x] R9. Integrar y archivar el expediente después de validar CI, despliegue y pruebas del sitio publicado.

## Criterios de aceptación
- El modelo base calcula exactamente las mismas predicciones si la opción experimental no se activa.
- El tema con soporte 1 se reduce por un factor 1/3, soporte 2 por 1/2; los pesos de género y década se mantienen.
- La comparación utiliza la misma muestra y el mismo perfil de entrenamiento para ambos modelos, sin utilizar la nota retenida al calcular el perfil.
- La interfaz deja claro que el modelo activo no cambia.
- El informe exporta únicamente métricas agregadas y no datos por película.


## Evidencia de cierre

- PR #40 integrado en `main`: https://github.com/ElFast-dev/Prisma/pull/40
- Calidad y SDD del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39562053602
- Validación funcional del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39562053609
- Pruebas UI del PR: https://github.com/ElFast-dev/Prisma/actions/runs/39562053603
- Validación de `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39567153618
- Calidad y SDD de `main`: https://github.com/ElFast-dev/Prisma/actions/runs/39567153462
- Despliegue de GitHub Pages: https://github.com/ElFast-dev/Prisma/actions/runs/39567153542
- Pruebas UI sobre el sitio publicado: https://github.com/ElFast-dev/Prisma/actions/runs/39567196275

## Resultado y límites

El Laboratorio compara el MAE del modelo base y el experimento de atenuación por soporte usando las mismas particiones leave-one-out. La variante aplica (n/(n+2)) solo a los pesos de temas, no modifica recomendaciones activas y no exporta filas individuales. CI, validación SDD y despliegue finalizaron correctamente; las pruebas Playwright posteriores al despliegue también pasaron en escritorio y móvil. La diferencia observada sigue siendo descriptiva: no demuestra significación estadística ni garantiza que futuras recomendaciones gusten más.
