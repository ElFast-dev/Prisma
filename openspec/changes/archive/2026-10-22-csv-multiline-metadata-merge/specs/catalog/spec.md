## ADDED Requirements

### Requirement: Parseo de registros CSV multilínea

Prisma DEBE interpretar las comillas antes de dividir los registros por saltos de línea. Los saltos de línea y delimitadores dentro de un campo entrecomillado DEBEN conservarse como contenido; las comillas dobles escapadas DEBEN convertirse en una comilla literal. Prisma DEBE informar cuando un campo entrecomillado no se cierre.

#### Scenario: Sinopsis multilínea

- DADO un CSV con una sinopsis entrecomillada que contiene un salto de línea, una coma y comillas escapadas
- CUANDO se importa el catálogo
- ENTONCES la sinopsis permanece completa en un solo registro y conserva sus saltos de línea y comillas literales

#### Scenario: Campo entrecomillado sin cierre

- DADO un CSV que termina dentro de un campo entrecomillado
- CUANDO se importa el catálogo
- ENTONCES Prisma devuelve un error comprensible en vez de crear filas con columnas desplazadas

### Requirement: Deduplicación CSV que conserva metadatos útiles

Prisma DEBE deduplicar filas con el mismo ID TMDB positivo o, sin ese ID, con el mismo título normalizado y año fiable. Las filas duplicadas de una misma identidad DEBEN combinar géneros, etiquetas y los campos descriptivos incompletos o más completos, sin repetir valores. Prisma NO DEBE fusionar registros sin ID TMDB con el mismo título pero años conocidos diferentes, ni reemplazar un año existente por un año contradictorio de una fila que comparte el mismo ID TMDB.

#### Scenario: Filas duplicadas con el mismo ID TMDB

- DADO un CSV con dos filas para un mismo ID TMDB y metadatos complementarios
- CUANDO se importa el archivo
- ENTONCES se conserva una fila para esa identidad y se combinan los metadatos útiles de ambas

#### Scenario: Título homónimo sin ID en años diferentes

- DADO un CSV con dos películas del mismo título y sin ID TMDB, una de 1998 y otra de 2024
- CUANDO se importa el catálogo
- ENTONCES ambas películas quedan separadas por su año
