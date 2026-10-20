# Propuesta: Corregir Descubrir y la ficha de película

## Problema observado

Prisma podía repetir una película en «Recomendadas para ti», mostrar en Descubrir títulos del historial, impedir el desplazamiento hasta el final de una sinopsis larga, mostrar la hora junto a la fecha de vista y utilizar tarjetas de puntuaciones demasiado altas para su contenido.

## Alcance implementado

- Deduplicar las recomendaciones, el catálogo local y los resultados de TMDB por identidad estable.
- Excluir películas vistas/valoradas de Descubrir; las recomendaciones excluyen además pendientes y ocultas.
- Hacer que la ficha de la película se desplace hasta el final de la sinopsis y las secciones posteriores.
- Mostrar la fecha de historial como MM/DD/YYYY sin hora.
- Reducir la altura y el espaciado de las tarjetas de puntuaciones.

## Fuera de alcance

No se modificó el algoritmo de predicción ni se borró o migró el perfil local. Los enlaces externos conservan su atribución y procedencia.
