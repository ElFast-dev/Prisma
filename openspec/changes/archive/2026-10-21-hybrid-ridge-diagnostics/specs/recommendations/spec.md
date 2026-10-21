# Requisitos delta: evaluación de mezcla híbrida

## ADDED Requirements

### Requirement: Evaluación aislada de mezcla híbrida fija

Prisma DEBE ofrecer en el Laboratorio una comparación diagnóstica, local y reproducible de una mezcla 50/50 entre las predicciones Ridge y el modelo aditivo sobre las mismas particiones externas de validación Ridge. La mezcla DEBE calcularse sin optimizar su proporción con las notas retenidas; DEBE informar MAE y, cuando la muestra cumpla los mínimos de ranking, nDCG@5 para Equilibrado, Más afines y Más variedad. La aplicación DEBE mantener el modelo aditivo como recomendador activo y DEBE marcar los resultados de la mezcla como experimentales y descriptivos.

#### Scenario: Mezcla calculada sin consultar notas retenidas

- DADO un pliegue con candidatas retenidas que no participaron en entrenamiento
- CUANDO se comparan el aditivo, Ridge y la mezcla
- ENTONCES la predicción de la mezcla es la media acotada de ambas estimaciones y no depende de la nota real retenida

#### Scenario: Comparación justa de ranking

- DADO que hay suficientes películas únicas con características y notas relevantes para nDCG@5
- CUANDO el Laboratorio evalúa los tres modos
- ENTONCES aditivo, Ridge y mezcla usan las mismas candidatas, relevancias y pliegues externos, y la mezcla informa su nDCG@5 y recuentos de victorias, empates y derrotas frente al aditivo

#### Scenario: Muestra insuficiente para ranking

- DADO que la muestra no satisface los mínimos existentes de películas y notas relevantes
- CUANDO se ejecuta el experimento
- ENTONCES las métricas de ranking de la mezcla permanecen no disponibles y Prisma no presenta cero como si fuera un resultado calculado

#### Scenario: Producción y privacidad permanecen aisladas

- DADO que se ha ejecutado el experimento híbrido
- CUANDO se muestran recomendaciones normales o se genera el informe técnico
- ENTONCES el ranking activo sigue usando el modelo aditivo y el informe incluye únicamente métricas agregadas, sin títulos, IDs TMDB, notas individuales ni fechas personales
