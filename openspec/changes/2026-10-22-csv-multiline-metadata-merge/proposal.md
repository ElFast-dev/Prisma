# Propuesta: importación CSV multilínea y reconciliación de metadatos

## Motivación

El importador actual divide el archivo por saltos de línea antes de interpretar las comillas. Por eso puede partir una sinopsis entrecomillada en varias filas, corromper columnas y perder títulos posteriores. Además, cuando dos filas representan la misma identidad, descartarlas sin combinar metadatos elimina información que podría completar el catálogo.

## Alcance

- Interpretar registros CSV/TSV lógicos antes de separarlos por delimitadores de columna.
- Conservar saltos de línea dentro de campos entrecomillados y decodificar comillas dobles escapadas.
- Rechazar un campo entrecomillado sin cierre con un error comprensible.
- Deduplicar por ID TMDB positivo o por título normalizado y año cuando no haya ID.
- Combinar géneros, etiquetas y sinopsis más completa de filas duplicadas sin sobrescribir un año conocido con uno contradictorio ni fusionar remakes.
- Añadir pruebas automatizadas de parser y de importación en navegador.

## Fuera del alcance

- Importar formatos de hoja de cálculo que no sean CSV/TSV estándar.
- Inferir IDs TMDB o años que la fuente no proporcione.
- Cambiar el almacenamiento local, los datos personales existentes o el algoritmo de recomendaciones.

## Criterios de aceptación

- Una sinopsis entrecomillada con saltos de línea permanece dentro de una sola fila y conserva sus caracteres.
- Las comillas dobles escapadas se decodifican correctamente.
- Los duplicados de una misma identidad completan los metadatos sin generar otra fila.
- Los títulos sin ID TMDB con años conocidos diferentes continúan separados.
- Un CSV mal formado con comillas sin cerrar produce un error comprensible.
