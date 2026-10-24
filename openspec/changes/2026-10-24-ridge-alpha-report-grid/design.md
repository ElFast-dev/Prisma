# Diseño: serialización íntegra de la rejilla Ridge

## Contrato de serialización

El evaluador determina la rejilla efectiva. El serializador no debe reconstruirla ni asumir que todo resultado tiene 14 valores. Se introduce un máximo defensivo `MAX_RIDGE_ALPHA_GRID_VALUES = 32`, aplicado únicamente tras filtrar valores numéricos finitos y positivos. Este límite evita reportes indefinidos y acepta tanto la rejilla histórica de 14 valores como la rejilla manual extendida de 18.

La comparación de selección absoluta y la comparación de escala relativa deben tomar como referencia la rejilla recibida. Los conteos se conservan solo para anclajes positivos que pertenezcan a esa lista, sin inventar selecciones ni sumar anclajes que no existían en la ejecución.

## Compatibilidad

- El esquema sigue siendo `prisma-recommendation-diagnostics/v14`; no se añaden ni eliminan campos.
- El comportamiento de la rejilla histórica permanece idéntico.
- El evaluador sigue declarando la rejilla realmente usada; la comparación relativa deriva sus anclajes de esa misma rejilla.
- El informe mantiene las mismas reglas locales de privacidad.

## Validación

Una prueba con una rejilla sintética de 18 valores exige igualdad exacta de la lista y conservación de los conteos del primer y último anclaje en las ramas absoluta, selección por ranking y escala relativa. Se mantienen las pruebas de filtrado, reporte no disponible, versión de aplicación y privacidad.
