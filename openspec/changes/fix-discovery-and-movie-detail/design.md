# Diseño: Identidad, desplazamiento y densidad visual

## Identidad de descubrimiento

La identidad primaria será el ID TMDB positivo. Cuando no exista, la deduplicación usará título normalizado y año compatible, permitiendo conservar los remakes con IDs diferentes. Las recomendaciones usarán las funciones de pertenencia a colecciones para evitar falsos negativos cuando una entrada local carezca de ID y el título sea la única señal compartida.

## Ficha de película

El contenedor .detail-scroll recibirá un límite de altura heredado de la ficha, overflow-y: auto, min-height: 0 y desplazamiento táctil suave. Esto hace scroll del contenido dentro del modal, no de una superficie que queda recortada por su padre.

La fecha del historial se formateará de manera explícita como MM/DD/YYYY; las entradas inválidas mostrarán un fallback y no una cadena que pueda incluir una hora.

## Puntuaciones

Se eliminan los mínimos de altura grandes y se reducen padding y tipografía, conservando cuatro columnas en escritorio y dos en móvil. Los enlaces y su texto accesible se mantienen.

## Verificación

Las pruebas de Node verifican identidad y fecha con datos sintéticos. Playwright verifica recomendaciones sin duplicados, exclusión del historial, scroll completo de una sinopsis larga, fecha sin hora, tamaño de tarjetas y funcionamiento en escritorio y móvil.
