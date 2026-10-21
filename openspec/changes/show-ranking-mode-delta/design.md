# Diseño: lectura descriptiva del delta de ranking

## Decisión de interfaz

- En Laboratorio se encuentra el resultado del modo `affinity` y se usa como referencia.
- Cada modo disponible mantiene su nDCG@5 y recuento de pliegues. Equilibrado y Más variedad muestran, además, `Δ frente a Más afines` con la diferencia absoluta en puntos nDCG.
- Más afines se etiqueta como `referencia`, no como una mejora ni como un valor neutral universal.
- Cuando la referencia está no disponible, las otras líneas muestran `sin referencia comparable`; no se calcula delta a partir de null, cero o una referencia ficticia.
- Diferencias inferiores a 0,005 se presentan como `0,00` por el formato de dos decimales, y el texto adyacente aclara que no son pruebas de mejora estadística.
- Se conserva por separado la diversidad Jaccard de listas del catálogo actual, ya que no usa el mismo conjunto de candidatas que la evaluación offline.

## Calidad y pruebas

- Añadir una aserción al test de modos para asegurar que el Laboratorio conserva la etiqueta de delta y referencia.
- Mantener la métrica de origen en `js/recommendations/evaluation.js`; el cambio es solo de presentación.
- Actualizar URL de entrada `app.js` y nombre de caché PWA en conjunto, así como las pruebas que aseguran su sincronía.

## Investigación y límites

nDCG@5 permite describir el orden de candidatos valorados retenidos, no inferir satisfacción real ni preferencia sobre películas todavía no vistas. Una diferencia numérica entre modos sobre una única muestra personal puede ser inestable y no constituye significación estadística. Esta mejora hace la comparación más legible, no estadísticamente más fuerte.
