# Diseño técnico: registros CSV lógicos y fusión segura

## Parser

1. Detectar el delimitador a partir de la cabecera, manteniendo compatibilidad con CSV separado por comas y TSV.
2. Recorrer el texto carácter a carácter para detectar separadores y finales de registro solo cuando no haya un campo entrecomillado abierto.
3. Convertir saltos de línea dentro de un campo entrecomillado en `\n`, y decodificar `""` como una comilla literal.
4. Informar de forma explícita si el archivo termina con un campo entrecomillado sin cerrar.
5. Conservar el límite de 150.000 películas para evitar catálogos de tamaño ilimitado en una importación.

## Identidad y reconciliación

- ID TMDB positivo: clave `tmdb:<id>`.
- Sin ID TMDB: clave con título normalizado y año fiable; el año desconocido utiliza su propio fallback conservador.
- Las filas duplicadas conservan la primera identidad/origen, combinan géneros y etiquetas sin repetición, rellenan datos ausentes y eligen la sinopsis no vacía más larga.
- Un año ya conocido no se reemplaza por el año contradictorio de una fila duplicada con el mismo ID TMDB.
- Los registros con el mismo título pero distintos años y sin ID TMDB permanecen separados.

## Verificación y publicación

Las pruebas puras cubren LF, CRLF, saltos multilínea, comillas escapadas, filas duplicadas, remakes sin IDs y formato mal formado. Playwright importará un CSV sintético con una sinopsis multilínea. Se actualizan la caché PWA y su versión visible para que la nueva implementación no quede oculta tras una versión almacenada.
