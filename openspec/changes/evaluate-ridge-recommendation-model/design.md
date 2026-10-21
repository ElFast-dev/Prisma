# Diseño: experimento Ridge reproducible

## Módulo y matriz

Crear `js/recommendations/ridge-evaluation.js` como módulo de dominio puro con dependencias explícitas para acceder a valoraciones, resolver películas, extraer características e interpretar notas. No toca DOM, almacenamiento ni red.

Cada fila es un vector disperso de indicadores: géneros con escala 1, temas con escala 0,35 y década con escala 0,2. El kernel lineal es `K = X Xᵀ`, permitiendo resolver Ridge en espacio de muestras cuando las características son más numerosas que las observaciones. Se centra el kernel y la variable objetivo usando solo las filas de entrenamiento. El intercepto es la media de entrenamiento y no se penaliza. Se resuelve `(K_c + αI)c = y - media(y)` mediante Cholesky con alpha positivo y predicciones acotadas a 1–10.

## Evaluación

1. Deduplicar las valoraciones por ID TMDB cuando exista; en su ausencia, título normalizado y año.
2. Ordenar las identidades mediante un hash estable y distribuir cinco pliegues externos.
3. Para cada pliegue externo, elegir alpha con tres pliegues internos sobre `[0.1, 1, 10, 100]`, usando solo el entrenamiento externo y minimizando el MAE interno.
4. Ajustar Ridge con todo el entrenamiento externo y predecir sus filas retenidas.
5. Calcular la predicción aditiva de referencia sobre las mismas filas, con un perfil que excluya ese pliegue.
6. Informar MAE de ambos, delta `MAE aditivo − MAE Ridge`, recuentos y distribución agregada de alpha seleccionado.

En empates se prefiere el alpha mayor. No se guardan filas individuales ni residuos.

## Interfaz, riesgos y compatibilidad

El Laboratorio ofrece un botón explícito; el cálculo no se ejecuta automáticamente al renderizar. El resultado permanece en memoria y se invalida al cambiar valoraciones. El informe JSON puede incluir únicamente las métricas agregadas si se ejecutó. La diferencia es descriptiva, no una prueba de significación estadística. Errores numéricos producen un estado controlado no disponible. No se cambian recomendaciones activas, datos, rutas de GitHub Pages ni la integración TMDB.
