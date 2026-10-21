## ADDED Requirements

### Requirement: Validación cruzada repetida de Ridge

El Laboratorio DEBE permitir evaluar Ridge en tres repeticiones deterministas de cinco pliegues externos con selección anidada de alpha mediante tres pliegues internos. DEBE conservar la evaluación histórica de cinco pliegues como resultado independiente. Los resultados repetidos DEBEN informar métricas agregadas globales y por repetición, mantener emparejados los modelos sobre los mismos registros retenidos y NO DEBEN modificar las recomendaciones activas.

#### Scenario: Particiones deterministas diferenciadas

- DADO que hay al menos 30 películas únicas valoradas con características
- CUANDO se ejecuta Ridge repetido
- ENTONCES se evalúan tres pasadas externas de cinco pliegues con sales deterministas distintas y cada alpha se selecciona solo dentro del entrenamiento correspondiente

#### Scenario: Métricas repetidas y emparejadas

- DADO que termina la validación repetida
- CUANDO se genera el informe
- ENTONCES se presentan MAE, nDCG@5 por modo y recuentos de victorias/empates/derrotas agregados para 15 pliegues, además de resúmenes agregados para cada repetición

#### Scenario: Interpretación estadística prudente

- DADO que las particiones reutilizan el mismo historial personal
- CUANDO se presentan las métricas repetidas
- ENTONCES Prisma explica que las repeticiones son análisis de sensibilidad sobre los mismos datos, no muestras independientes ni prueba de significación estadística

#### Scenario: Privacidad y producción

- DADO que la validación repetida queda incluida en el diagnóstico compartible
- CUANDO se exporta el informe
- ENTONCES únicamente incluye métricas agregadas, sin películas, IDs ni errores individuales, y el ranking activo permanece aditivo
