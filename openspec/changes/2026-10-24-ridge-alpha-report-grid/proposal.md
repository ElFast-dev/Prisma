# Propuesta: conservar la rejilla Ridge completa en el diagnóstico

## Motivación

El experimento manual recién incorporado puede evaluar 18 valores de alpha, pero el serializador del diagnóstico v14 limita a 14 elementos la rejilla usada por la comparación de selección y la comparación de escala relativa. El JSON resultante pierde valores de la rejilla real y puede omitir conteos de selección de los anclajes superiores. Eso impide auditar correctamente una ejecución experimental y puede llevar a interpretar mal el límite inferior.

## Objetivo

Conservar la rejilla real usada por el evaluador y todos los conteos asociados al serializar los resultados Ridge, incluidos los 18 valores del experimento manual extendido, sin cambiar el esquema v14 ni la evaluación del modelo.

## Alcance

- Sustituir los límites de 14 valores en los dos serializadores anidados por un máximo defensivo compartido que admita la rejilla extendida completa.
- Mantener el filtrado de valores numéricos, finitos y positivos, y restringir los conteos a los anclajes presentes en la rejilla recibida.
- Añadir pruebas de regresión para los anclajes mínimo y máximo, la lista de 18 elementos y los conteos por criterio de selección absoluta y relativa.
- Actualizar la versión del diagnóstico y los identificadores de módulos/caché PWA para que el informe posterior identifique el código corregido.

## Reglas no negociables

- `additive-content-baseline` sigue siendo el modelo activo en producción.
- No se cambia la rejilla histórica automática ni la evaluación temporal.
- No se inspeccionan notas del pliegue exterior para seleccionar parámetros.
- El diagnóstico continúa siendo local y no serializa títulos, identificadores de películas, fechas personales, notas individuales ni comentarios libres.

## Criterios de aceptación

- El JSON conserva la rejilla extendida de 18 alphas en la comparación de selección y en la comparación de escala relativa.
- Se conservan los conteos asociados al anclaje inferior `1e-7` y al anclaje superior `100`.
- La rejilla histórica de 14 alphas sigue funcionando y no se añaden cálculos a la batería automática.
- Las pruebas de informe, arquitectura modular, cache versioning, calidad SDD y Playwright deben pasar antes de integrar o desplegar.
