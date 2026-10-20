# Diseño: validación comparable e identidad segura

## Decisiones

- Mantener validación leave-one-out sobre las valoraciones que tienen metadatos enlazados. El umbral actual de cinco películas permanece.
- Recuperar cada película retenida mediante `findMovie(title, tmdbId || tmId)`; la función existente prioriza el ID TMDB y solo recurre al título cuando falta.
- Usar la media de las notas del pliegue de entrenamiento como predictor base. Para cada película retenida, comparar el error absoluto del modelo y de esa referencia. Ambos errores se agregan sobre las mismas muestras.
- Calcular la mejora relativa como `(MAE base - MAE modelo) / MAE base * 100`. Un resultado negativo significa que el modelo rinde peor que la referencia. Cuando el MAE base es cero, la mejora relativa no se define y se muestra sin porcentaje.
- El laboratorio debe identificar el MAE del modelo, el tamaño de la muestra, el MAE de referencia y la lectura relativa. Si no hay muestra útil, debe indicar el umbral en vez de dejar una raya sin explicación.

## Compatibilidad y privacidad

- Sin cambios al esquema de almacenamiento ni a los datos del perfil.
- Sin datos reales, credenciales ni llamadas a TMDB en pruebas.
- Sin dependencias nuevas. El HTML continúa escapando datos de texto dinámicos según los patrones existentes.
- Riesgo principal: que la nueva evaluación se interprete como validación científica; el texto debe identificarla como referencia experimental y conservar el tamaño de muestra.

## Verificación

Añadir una prueba Node que extraiga la función de evaluación y suministre funciones auxiliares deterministas con un catálogo sintético. Incluir dos remakes con el mismo título y IDs distintos, comparar MAE exacto frente a la referencia y comprobar el comportamiento con muestra insuficiente y MAE base cero.
