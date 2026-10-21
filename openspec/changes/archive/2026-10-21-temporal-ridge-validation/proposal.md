# Propuesta: validación temporal de las recomendaciones

## Problema

La validación cruzada actual separa aleatoriamente valoraciones de entrenamiento y prueba. Aunque evita usar la nota retenida dentro del perfil de ese pliegue, no reproduce una pregunta especialmente importante en un historial cronológico: cuánto habría aprendido el modelo de lo que se vio antes para ordenar lo que se vio después.

## Objetivo

Añadir al Laboratorio una evaluación temporal, local y bajo demanda, que entrene exclusivamente con valoraciones anteriores a cada ventana de prueba, seleccione alpha de Ridge dentro del pasado de entrenamiento y compare Ridge con el modelo aditivo sobre las mismas valoraciones futuras retenidas.

## Alcance

- Cruzar el historial de valoraciones con el registro de visionado por identidad de película.
- Usar únicamente una fecha válida de visionado (`watchedAt`); no inferirla desde `updatedAt`, ya que editar una nota no implica ver de nuevo la película.
- Requerir un historial suficiente con características y fechas fiables; informar de cuántas entradas fechadas son evaluables y cuántas no disponen de fecha válida.
- Reservar cronológicamente la mitad inicial como calentamiento y dividir la mitad posterior en cinco ventanas futuras expansivas, manteniendo juntos los registros del mismo día.
- Seleccionar alpha mediante tres ventanas internas walk-forward construidas solamente a partir del entrenamiento de cada ventana exterior.
- Comparar MAE y nDCG@5 por modo en las mismas valoraciones futuras, exportando solamente métricas agregadas y sin fechas ni películas individuales.
- Mantener el experimento separado del recomendador activo y cancelar el resultado si cambia el historial durante el cálculo.

## No objetivos

- No activar Ridge, cambiar pesos ni alterar las recomendaciones.
- No usar la fecha de estreno como sustituto de la fecha de visionado.
- No etiquetar las ventanas como muestras independientes ni presentar el rango observado como intervalo de confianza.
- No exportar fechas, límites temporales, títulos, identificadores ni predicciones por película.
