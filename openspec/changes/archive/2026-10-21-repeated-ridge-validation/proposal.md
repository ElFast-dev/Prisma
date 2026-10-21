# Propuesta: validación cruzada repetida para Ridge

## Contexto
La evaluación personal actual de Ridge muestra mejora de MAE en los cinco pliegues disponibles y una mejora de nDCG@5 especialmente grande en Más variedad, pero los modos Equilibrado y Más afines tienen pliegues donde pierde. Una única partición de cinco pliegues no basta para caracterizar la sensibilidad al reparto de las muestras.

## Objetivo
Añadir una validación cruzada anidada repetida y determinista que evalúe varias particiones externas, resuma los resultados por repetición y globalmente, y permita comparar la estabilidad del MAE y nDCG@5 por modo.

## Alcance
- Conservar la evaluación de cinco pliegues existente para comparar resultados históricos.
- Añadir tres repeticiones de validación anidada de cinco pliegues externos cada una, con particiones deterministas distintas.
- Elegir alpha usando únicamente pliegues internos de entrenamiento en cada pliegue externo.
- Exportar métricas agregadas por repetición y globales, sin filas individuales.
- Mantener el modelo aditivo activo.

## No objetivos
- No activar Ridge en producción ni cambiar los modos actuales.
- No presentar repeticiones sobre el mismo historial como muestras independientes ni afirmar significación estadística.
- No almacenar predicciones por película ni transmitir datos personales.
