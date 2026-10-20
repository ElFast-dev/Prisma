# Diseño: puntuación consciente de señal y cobertura

## Decisiones

- Mantener la fórmula de los pesos del perfil (`sum / (count + 0.4)`) sin reentrenar ni aumentar arbitrariamente la regularización. La prueba exploratoria con perfiles sintéticos encontró que una regularización más fuerte podía empeorar el MAE en los casos generados, así que este cambio se centra en la contribución de las características de la película candidata, no en afirmar que una constante es óptima para todos.
- Género: multiplicador de influencia 1.0. Etiqueta/keyword: multiplicador 0.35. La etiqueta sigue aportando, pero una coincidencia aislada no debe competir en igualdad con una señal de género.
- Calcular la corrección como la suma de `pesoAprendido * multiplicadorDeTipo` de las señales coincidentes, dividida entre el número total de características distintas de la película candidata. Así, las características desconocidas actúan como ausencia de evidencia y no como una preferencia negativa.
- Conservar el acotamiento de la nota estimada entre 1 y 10 y el pequeño bono exploratorio existente para características nuevas.
- Incluir `influence` en cada coincidencia. Las razones positivas/negativas se ordenan y filtran por contribución efectiva, para que la explicación refleje lo que realmente mueve la puntuación.
- Cobertura = coincidencias con señales aprendidas / características de la candidata. Sin coincidencias: «Muy baja». Pocas valoraciones con metadatos: «Inicial». «Moderada» solo con al menos 2 coincidencias, cobertura >= 0.6 y al menos una señal respaldada por 3 ejemplos; en los otros casos con coincidencias se muestra «Limitada».
- Dejar el MAE frente a la media del entrenamiento intacto. El Laboratorio es experimental; esta tarea añade pruebas deterministas de comportamiento y no cambia cómo se calculan las particiones leave-one-out.

## Riesgos y compatibilidad

- Las etiquetas pueden expresar preferencias personales más finas que los géneros; el factor 0.35 es una heurística cauta y explícita, no una constante universal. La ficha seguirá mostrando las señales que sí influyen y el Laboratorio permite observar el error con el historial real.
- Cuando la película solo tiene etiquetas y no géneros, las puntuaciones tenderán más a la media; es intencional mientras la cobertura sea débil.
- No cambian ni el esquema persistente ni los datos del usuario.
- Si cambia app.js, actualizar la URL versionada en index.html, APP_ASSETS, el test de cache y el nombre del shell del service worker.

## Verificación

Prueba Node aislada sobre las funciones reales de perfil/predicción con perfiles sintéticos. Casos: señales en conflicto, características no aprendidas, score acotado, cobertura baja, confianza moderada bien respaldada y preferencia negativa explicada. Luego ejecutar todos los checks existentes y Playwright.
