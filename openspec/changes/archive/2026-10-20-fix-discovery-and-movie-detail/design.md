# Diseño: Identidad, desplazamiento y densidad visual

## Decisiones aplicadas

La identidad primaria es el ID TMDB positivo. Sin ID, la deduplicación compara título normalizado y año disponible, manteniendo separados los remakes con IDs TMDB diferentes. La colección se comprueba mediante las funciones compartidas de pertenencia, sin depender solo de claves precalculadas.

El contenedor .detail-scroll hereda el límite de altura de la ficha y usa overflow-y: auto, min-height: 0 y desplazamiento táctil suave. De este modo la ficha puede recorrer una sinopsis larga sin que el padre recorte el contenido.

La fecha del historial se formatea explícitamente como MM/DD/YYYY. Las tarjetas de puntuación ya no tienen altura mínima elevada y usan menor padding y tipografía, conservando cuatro columnas en escritorio y dos en móvil.

## Compatibilidad

- No se cambió el esquema ni se migraron listas o valoraciones personales.
- No se añadieron peticiones externas ni credenciales.
- Se actualizaron las versiones de CSS/JS y el nombre de la caché del service worker.
- Pruebas unitarias y Playwright cubren identidad, historial, fecha, scroll y tamaño de tarjetas.
