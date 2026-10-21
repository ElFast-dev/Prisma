# Propuesta: estabilidad por pliegue de Ridge

## Contexto
La evaluación Ridge actual informa MAE y nDCG@5 agregados en cinco pliegues externos. El promedio global puede ocultar si la mejora se concentra en una sola partición.

## Objetivo
Añadir recuentos agregados de victorias, empates y derrotas por pliegue para el MAE y nDCG@5, sin exponer predicciones individuales ni activar Ridge en producción.

## Alcance
- Calcular la dirección de la diferencia MAE por cada pliegue externo.
- Calcular la dirección del delta nDCG@5 por pliegue y modo de ranking.
- Mostrar y exportar únicamente recuentos agregados.
- Añadir pruebas deterministas, documentación SDD y versionado de caché.

## No objetivos
- Cambiar el modelo de ranking activo.
- Serializar títulos, IDs TMDB, notas individuales o métricas por película.
- Declarar significación estadística a partir de cinco pliegues.
