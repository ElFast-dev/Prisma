# Calibrar el peso de señales del recomendador

## Problema

La predicción actual promedia por igual cada género y etiqueta coincidente, y descarta del denominador las características sin historial asociado. Una única palabra clave poco respaldada puede tener tanto peso como un género repetido, y una película con muchos metadatos desconocidos puede recibir una corrección grande respecto a la nota media. La etiqueta de confianza tampoco considera la cobertura de las señales de la película candidata.

## Objetivo

Hacer la estimación más conservadora cuando hay poca evidencia, dar prioridad a géneros frente a etiquetas dispersas y alinear la confianza y las explicaciones con la fuerza real de las señales. Mantener la validación leave-one-out del Laboratorio como medida experimental de control, sin asegurar que un resultado sintético garantiza mejor gusto real.

## Alcance

- Asignar menor influencia directa a etiquetas/keywords que a géneros.
- Incluir todas las características de la película en la normalización de la corrección, incluidas las que el perfil todavía no conoce.
- Calcular influencia por señal y usarla para decidir qué coincidencias merecen una explicación.
- Basar confianza en la cobertura y el soporte de varias señales, no en una sola coincidencia repetida.
- Añadir pruebas sintéticas de contradicción género/etiqueta, metadatos no aprendidos, cobertura y límites de puntuación.
- Mantener el cálculo MAE del modelo frente a la referencia del Laboratorio para observar el comportamiento en el perfil real cuando haya muestra suficiente.

## Fuera de alcance

- Añadir aprendizaje automático pesado, backend, dependencias o solicitudes externas.
- Cambiar valoraciones personales, historial o identidad de películas.
- Afirmar que pruebas sintéticas prueban calidad individual real.
- Ajustar automáticamente el algoritmo al perfil mientras se evalúa; eso introduciría complejidad y puede sobreajustarse a historiales pequeños.

## Criterios de aceptación

1. Una señal de género tiene más influencia directa que una etiqueta con el mismo peso aprendido.
2. Las características desconocidas acercan la corrección a cero, por lo que la estimación vuelve gradualmente a la media del perfil cuando falta evidencia.
3. La puntuación permanece en el rango 1–10 y las explicaciones se basan en contribuciones relevantes, no solo en el signo del peso bruto.
4. La confianza moderada requiere varias coincidencias, cobertura suficiente y soporte de historial; la cobertura baja no produce confianza moderada.
5. Las pruebas SDD, funcionales y visuales pasan antes de fusionar; el expediente se archiva y la publicación invalida correctamente la caché si cambia app.js.
