# Propuesta: filmografía por año y fechas de calendario estables

## Problema

La ficha de persona enumera créditos cronológicamente, pero no los agrupa visualmente por año ni etiqueta los títulos sin fecha como «En producción». El filtro «Colección» consulta por título sin pasar el ID TMDB, lo que puede mezclar remakes o títulos homónimos. Además, las etiquetas de fecha que usan el huso horario implícito del navegador pueden desplazar fechas de estreno sin hora en algunos dispositivos.

## Alcance

- Crear un módulo puro y reutilizable para deduplicar créditos por ID TMDB, filtrar la filmografía por identidad y agruparla por año.
- Mostrar «En producción» primero y después los años en orden descendente en la ficha de persona.
- Mantener el filtro «Colección» limitado a títulos realmente guardados por identidad.
- Convertir los timestamps al día calendario de Panamá y preservar el día de las fechas ISO sin hora.
- Añadir pruebas sintéticas y actualizar la especificación, arquitectura y caché PWA.

## No objetivos

- No modificar valoraciones, fechas personales ni el historial guardado.
- No inventar información de TMDB ni cambiar la disponibilidad de plataformas.
- No añadir historiales personales, credenciales o copias de seguridad al repositorio.
- No cambiar el recomendador ni la lógica de importación de películas.
