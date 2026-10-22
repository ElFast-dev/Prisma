# Propuesta: aclarar las etiquetas del proxy temporal

## Contexto

El Laboratorio permite evaluar el orden cronológico usando la fecha de incorporación a la lista como proxy exploratorio. Aunque el panel advierte que esa fecha no confirma el visionado, algunas etiquetas como «visionados posteriores» o «ventana futura» pueden interpretarse como fechas reales de visionado cuando el proxy está activado.

## Objetivo

Ajustar el texto de estado, las métricas y las ventanas para que correspondan a la fuente temporal seleccionada, sin cambiar cálculos ni datos.

## Criterios de aceptación

1. En el modo normal, las etiquetas siguen describiendo visionados posteriores a fechas watchedAt disponibles.
2. En modo proxy, el panel identifica el orden por fecha de incorporación y lo califica como exploratorio.
3. Las métricas y ventanas no llaman «visionados futuros» a los registros ordenados por incorporación.
4. El cambio no altera cálculos, fechas persistidas, privacidad ni recomendaciones activas.
