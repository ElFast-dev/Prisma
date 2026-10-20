# Propuesta: Corregir Descubrir y la ficha de película

## Problema

Prisma puede repetir la misma película en «Recomendadas para ti», mostrar en Descubrir títulos del historial, impedir que la ficha se desplace hasta el final de la sinopsis, presentar hora en la fecha del historial y usar tarjetas de puntuaciones demasiado altas para su contenido.

## Alcance

- Deduplicar candidatos de Descubrir por ID TMDB y usar título/año como alternativa, conservando remakes distintos.
- Excluir de Descubrir películas vistas o valoradas, y de las recomendaciones también pendientes y ocultas.
- Dar un área de desplazamiento con altura limitada a la ficha completa para que toda la sinopsis y secciones inferiores sean accesibles.
- Mostrar fecha de historial en formato MM/DD/YYYY sin hora.
- Reducir la altura, tamaño y espaciado de los indicadores de puntuación.

## Fuera de alcance

No modifica el algoritmo de predicción, ni borra o migra el perfil local. La ficha mantiene los enlaces externos de puntuación y su procedencia.

## Criterios de aceptación

- Recomendaciones sin identidades duplicadas; un remake con otro ID TMDB sigue siendo distinto.
- Ninguna película del historial aparece en el catálogo local o resultados TMDB de Descubrir.
- La ficha permite desplazarse hasta el final de una sinopsis larga.
- La fecha de vista se muestra como MM/DD/YYYY, sin hora.
- Las tarjetas de puntuación dejan de ser cuadrados altos.
