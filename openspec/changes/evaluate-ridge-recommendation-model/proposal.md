# Propuesta: evaluar regresión Ridge en el Laboratorio

## Contexto

La línea base aditiva de Prisma se evalúa con un historial personal de varios cientos de películas y miles de características. El experimento anterior de atenuación temática no mejoró el MAE del modelo en esta muestra; se evaluará una alternativa de regularización sin presuponer que vaya a ganar.

## Objetivo

Añadir un experimento local explícito de regresión Ridge y compararlo con la línea base aditiva usando las mismas películas retenidas. La selección del parámetro de regularización ocurrirá dentro del conjunto de entrenamiento, separada de la evaluación externa.

## Reglas

- Usar valoraciones válidas con características recuperables y deduplicar por identidad de película.
- Usar cinco pliegues externos deterministas y tres pliegues internos para elegir alpha entre `[0.1, 1, 10, 100]`.
- Comparar ambos modelos en las mismas filas externas, sin entrenar con sus notas.
- No cambiar recomendaciones activas, datos guardados ni formato de las copias de seguridad.
- Mostrar solo métricas agregadas y no incluir títulos, IDs, fechas ni errores por película.
- Ejecutar bajo demanda en el navegador; sin red, almacenamiento persistente ni dependencias externas.
- Con menos de 30 muestras únicas evaluables, marcar el experimento como no disponible.

## Fuera de alcance

- Activar Ridge automáticamente.
- Elegir alpha según los resultados de los pliegues externos.
- Cambiar ranking, candidatos, TMDB, identidad o exclusiones.
