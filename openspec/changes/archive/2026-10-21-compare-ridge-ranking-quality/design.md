# Diseño: evaluación emparejada de nDCG@5

## Protocolo

- Conservar identidad TMDB y título normalizado más año solo dentro de la validación Ridge existente.
- En cada pliegue externo, seleccionar alpha con tres pliegues internos del entrenamiento y volver a ajustar Ridge sobre ese entrenamiento.
- Entrenar el perfil aditivo con el mismo entrenamiento externo y obtener ambas puntuaciones de cada película retenida.
- Reutilizar el ranker de producción para Equilibrado, Más afines y Más variedad. Para Ridge se sustituye únicamente la puntuación prevista; las señales explicativas y desempates auxiliares del modelo aditivo se mantienen iguales.
- En candidatos del ranker usar una lista permitida de título, géneros, etiquetas, puntuación, señales explicativas y token efímero local; omitir nota personal e identificadores TMDB. El token solo asocia el resultado con la ganancia dentro del mismo pliegue.
- Calcular ganancia max(0, rating - 6) y DCG@5 como ganancia dividida por log2(posición + 1). Normalizar por DCG ideal y agregar valores por pliegue.
- Exigir 50 películas únicas evaluables y 10 notas de 7 o más para nDCG; MAE conserva su mínimo independiente de 30.

## Privacidad y compatibilidad

El resultado contiene solo recuentos, pliegues, nDCG por modo y su diferencia agregada. No persiste datos, no usa red ni altera recomendaciones activas. Un fallo numérico devuelve un estado controlado no disponible. El informe cambia a schema v3 y actualiza los parámetros de versión y caché PWA.

## Riesgos y límites

La evaluación ordena películas valoradas y retenidas artificialmente; no evalúa directamente el catálogo desconocido de TMDB. Equilibrado y Más variedad conservan las heurísticas de género y desempate actuales para aislar el cambio de predictor. Los resultados describen la muestra personal y no autorizan a activar Ridge.