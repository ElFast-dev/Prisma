# Diseño: jerarquía visual adaptable de la ficha

## Estrategia

Mantener el HTML y el modelo de datos existentes en lo posible. Extender `styles/movie-details.css`, que ya es el módulo responsable de la ficha, con overrides de alta proximidad y media queries explícitas. La carga CSS existente conserva su orden y todas las reglas nuevas se apoyan en los tokens `--bg-elevated`, `--surface`, `--surface-raised`, `--line`, `--text`, `--muted` y `--accent`.

El degradado generado por la vista de modal debe terminar en `var(--bg-elevated)`, de modo que coincida con el tema activo. No se modifican las fuentes de los datos ni las acciones de la ficha.

## Decisiones de diseño

- Escritorio: ancho máximo de 1000 px, encabezado cinematográfico proporcionado y metadatos en cuatro columnas.
- Móvil: ficha de borde a borde, cabecera más corta, metadatos en dos columnas, botones que pueden fluir en varias filas y espacio para el área segura del sistema operativo.
- Lectura: sinopsis de 14 px en escritorio y 13 px en móvil, con interlineado generoso y ancho máximo de lectura.
- Interacción: objetivos táctiles principales de 44 px y foco visible para enlaces y botones.
- Compatibilidad: conservar `.detail-scroll`, las fechas existentes y las tarjetas de puntuación compactas de baja altura.

## Riesgos y mitigación

- Las nuevas reglas pueden alterar el tamaño de la ficha en móvil. Se cubre con pruebas de navegador a 390 px y escritorio a 1440 px.
- La sinopsis más legible puede aumentar la altura total. Se conserva el scroll interno, y la prueba existente obliga a alcanzar el final de una sinopsis larga.
- Los tokens de tema deben funcionar en ambos modos. Se elimina el color terminal fijo del degradado y se comprueba estáticamente el uso del token.
- No se modifica ni migra el almacenamiento personal.
