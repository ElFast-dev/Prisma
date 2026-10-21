# Evaluar la calidad del ranking y la diversidad

## Problema

El Laboratorio de Prisma mide el error medio absoluto (MAE) de las notas previstas y ahora puede aislar la contribución de la década de estreno. Ninguna de esas métricas dice directamente si las películas más relevantes suben a los primeros puestos de la lista o si «Más variedad» entrega recomendaciones realmente distintas. El algoritmo de ranking usa heurísticas de afinidad y géneros sin un diagnóstico numérico propio.

## Objetivo

Añadir una evaluación offline, local y explicable de la calidad de orden, junto con medidas descriptivas de diversidad de las listas actuales de Equilibrado, Más afines y Más variedad. Usar esos diagnósticos como referencia antes de ajustar la heurística de ranking.

## Alcance

- Crear un módulo independiente `js/recommendations/evaluation.js`, con dependencias explícitas y sin DOM, almacenamiento ni solicitudes de red.
- Evaluar el orden con validación cruzada determinista de cinco pliegues sobre valoraciones con metadatos, ocultando por completo las notas del pliegue de prueba al construir el perfil.
- Medir nDCG@5 a partir de valoraciones explícitas: notas de 7 a 10 son relevantes con ganancia gradual, las de 1 a 6 no relevantes. Exigir al menos 50 películas únicas con características y al menos 10 valoraciones relevantes para no mostrar una métrica con una muestra pequeña.
- Calcular la disimilitud media de Jaccard entre pares de géneros de las primeras cinco recomendaciones de cada modo, además del número de géneros distintos y del tamaño real de la lista.
- Añadir el diagnóstico al Laboratorio con límites y muestra claramente indicados.
- Añadir pruebas con datos sintéticos para verificar nDCG perfecto y degradado, umbrales mínimos, determinismo, diversidad, listas cortas y muestras sin géneros.
- Preservar las exclusiones de la colección, la identidad TMDB, el inicio vacío, el uso local del perfil y la caché PWA.

## Fuera del alcance

- Cambiar las puntuaciones, los pesos o el orden de producción de las recomendaciones en esta iteración.
- Tratar películas sin valoración como negativas, estimar «serendipia» o afirmar satisfacción del usuario a partir de la diversidad por género.
- Enviar historiales, métricas o valoraciones a un servidor.
- Ajustar los parámetros del recomendador utilizando la misma muestra empleada para informar la métrica.
- Añadir dependencias o datos externos de catálogo.

## Criterios de aceptación

1. El cálculo nDCG@5 usa cinco pliegues deterministas; cada título de prueba se puntúa con un perfil construido sin su valoración, y no se usa la nota real para desempatar predicciones.
2. La métrica solo aparece disponible con al menos 50 películas únicas con características y 10 notas de 7 o más; se informa la cantidad de registros relevantes y los pliegues con señal relevante.
3. La ganancia de relevancia es explícita y documentada: notas 1–6 valen cero; 7, 8, 9 y 10 aportan ganancias 1, 2, 3 y 4.
4. La diversidad de lista se calcula como disimilitud media de Jaccard por parejas con géneros conocidos, dentro del rango 0–1; se expresa como proxy de variedad de géneros, no como serendipia ni calidad general.
5. La métrica informa si no hay suficientes valoraciones, películas candidatas o metadatos de género.
6. Las pruebas SDD, modulares, de recomendación, de caché y los flujos visuales pasan antes de integrar; el diagnóstico no cambia el comportamiento de Descubrir.
