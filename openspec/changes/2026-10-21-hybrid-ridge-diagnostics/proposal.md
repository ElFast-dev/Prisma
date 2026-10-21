# Propuesta: evaluación de una mezcla híbrida Ridge + aditivo

## Contexto

El diagnóstico personal v6 presenta una mejora descriptiva de Ridge frente a la referencia aditiva en MAE y nDCG@5, pero la ganancia de ranking de Equilibrado no es uniforme entre las tres repeticiones. Ridge sigue siendo experimental y el ranking de producción usa el modelo aditivo.

## Objetivo

Medir una mezcla fija 50/50 de la puntuación Ridge y la puntuación aditiva en las mismas particiones externas de la validación Ridge anidada, como tercer comparador. La mezcla no aprenderá su peso a partir de las notas retenidas.

## Alcance

- Calcular el MAE de la mezcla en los mismos ejemplos externos que Ridge y el modelo aditivo.
- Comparar nDCG@5 de la mezcla para Equilibrado, Más afines y Más variedad usando candidatas, pliegues y relevancia comunes.
- Informar de estabilidad descriptiva por pliegue y por repetición.
- Incorporar métricas agregadas al Laboratorio y al informe de diagnóstico v7, sin exportar registros individuales.
- Añadir pruebas sintéticas y actualizar la especificación SDD y la caché PWA.

## Fuera de alcance

- No activar Ridge ni la mezcla como recomendador de producción.
- No elegir automáticamente una proporción con las notas del conjunto de prueba.
- No modificar pesos, notas, colecciones, identidad de películas ni fechas personales.
- No fabricar fechas para habilitar la evaluación temporal ni alterar la evaluación temporal walk-forward.
- No añadir dependencias de ejecución ni enviar información al servidor.

## Criterios de aceptación

1. La mezcla se calcula como la media aritmética fija de ambas estimaciones y se limita al intervalo de 1 a 10.
2. MAE, nDCG@5 y diferencias usan las mismas particiones externas y la misma relevancia que los comparadores.
3. La validación repetida agrega 15 pliegues, distingue victorias/empates/derrotas de la mezcla frente al aditivo y mantiene resultados deterministas.
4. La aplicación deja inequívocamente claro que la prueba es diagnóstica y que producción sigue siendo aditiva.
5. El informe v7 contiene solo métricas agregadas y continúa excluyendo títulos, IDs TMDB, notas individuales, fechas exactas y datos personales.
6. Las comprobaciones de SDD, sintaxis, pruebas de recomendación, privacidad, versionado PWA y pruebas de navegador deben pasar antes de cerrar el expediente.
