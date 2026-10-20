# Mejorar la validación del recomendador

## Problema

El laboratorio calcula un error absoluto medio (MAE) mediante validación leave-one-out, pero vuelve a buscar cada película de prueba solo por título. Si existen remakes u homónimos con diferentes IDs de TMDB, la evaluación puede usar las características de otra película. Además, mostrar solo el MAE del motor no permite saber si supera una predicción base sencilla.

## Objetivo

Hacer que la validación de Prisma respete la identidad cinematográfica y compare el motor con una referencia reproducible basada en la media de las notas de entrenamiento.

## Alcance

- Resolver cada película de prueba con su ID TMDB cuando existe, con alternativa por título cuando no existe.
- Calcular el MAE del motor y el MAE de una referencia de media, usando las mismas particiones leave-one-out.
- Mostrar la diferencia relativa solo cuando la referencia tiene un MAE positivo.
- Explicar en el laboratorio cuándo faltan datos suficientes.
- Añadir pruebas automatizadas con datos sintéticos y mantener el flujo SDD.

## Fuera de alcance

- Cambiar la fórmula de recomendaciones o alterar valoraciones personales.
- Añadir un backend, nuevas dependencias o peticiones reales a TMDB.
- Afirmar que una evaluación pequeña garantiza recomendaciones de calidad.

## Criterios de aceptación

1. Los homónimos y remakes con ID TMDB distinto se validan contra el registro correcto.
2. El MAE del motor y la referencia se calculan con idénticas películas de prueba.
3. La mejora porcentual se informa correctamente, incluso cuando el motor rinde peor; se omite si el MAE de referencia es cero.
4. Con menos de cinco películas con características, la evaluación permanece no disponible y explica el mínimo necesario.
5. Las pruebas del repositorio y la comprobación visual publicada pasan antes de cerrar el cambio.
