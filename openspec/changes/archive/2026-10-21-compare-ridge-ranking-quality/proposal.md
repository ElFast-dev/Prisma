# Propuesta: comparar Ridge por calidad de ranking

## Contexto

El experimento Ridge existente compara el error de las notas previstas frente al modelo aditivo, pero una mejora de MAE por sí sola no demuestra que las películas mejor valoradas aparezcan antes en las recomendaciones. Las métricas concretas del perfil permanecen en el diagnóstico local y no se publican en la documentación del repositorio.

## Objetivo

Comparar nDCG@5 de Ridge y del modelo aditivo, emparejando los tres modos de ranking de producción sobre las mismas películas retenidas por pliegue.

## Alcance

- Reutilizar las cinco particiones externas y seleccionar alpha solo con pliegues internos de entrenamiento.
- Comparar Equilibrado, Más afines y Más variedad con las mismas candidatas.
- Usar notas de 7 a 10 como relevantes, con ganancia igual a la nota menos 6.
- Mostrar nDCG@5 agregado solo con al menos 50 películas únicas y 10 valoraciones relevantes.
- Añadir métricas agregadas al Laboratorio y al diagnóstico técnico.
- Mantener privacidad, modularidad, caché PWA y ranking activo sin cambios.

## Fuera del alcance

- Activar Ridge automáticamente o sustituir el predictor en producción.
- Compartir títulos, IDs, valoraciones individuales, errores por película o listas retenidas.
- Interpretar nDCG offline como garantía de satisfacción o significación estadística.

## Criterios de aceptación

1. Ambos predictores se evalúan con las mismas candidatas y particiones externas por modo.
2. Alpha se selecciona solo dentro del entrenamiento externo.
3. La comparación no disponible explica si falta muestra o relevancia, sin ceros ficticios.
4. El ranker no recibe notas retenidas ni identificadores de películas.
5. Las pruebas sintéticas, SDD, caché PWA y Playwright pasan.