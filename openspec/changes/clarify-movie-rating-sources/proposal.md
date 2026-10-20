# Propuesta: Clarificar la procedencia de las puntuaciones

## Motivación

La ficha de una película puede mostrar una nota media de TMDB sin recuento de votos ni enlace directo a su fuente. Además, cuando falta el IMDb ID, el acceso rotulado «IMDb» se redirige a TMDB. La interfaz debe distinguir los datos efectivamente recibidos de los enlaces que únicamente sirven para consultar otra web.

## Alcance

- Preservar el recuento vote_count de TMDB con el resto de los metadatos.
- Mostrar una puntuación numérica solo si su procedencia TMDB está marcada y el valor está dentro del rango válido.
- Acompañar la nota con el número de votos cuando TMDB lo proporcione.
- Usar búsquedas propias de IMDb, Rotten Tomatoes y Metacritic cuando no se integran sus puntuaciones.
- Añadir pruebas sintéticas de estos casos y mantener accesibles los enlaces externos.

## Fuera de alcance

- No se integran puntuaciones numéricas de IMDb, Rotten Tomatoes o Metacritic, ya que la implementación actual no recupera esas cifras.
- No se añaden credenciales, peticiones de red nuevas ni dependencias.
- No se cambian las valoraciones personales, el algoritmo de recomendación ni el historial guardado.

## Criterios de aceptación

- La nota TMDB enlaza con la película correcta e indica la cantidad de votos cuando exista.
- Una cifra sin procedencia TMDB confirmada no se muestra como puntuación de TMDB.
- Si falta la nota, se muestra una llamada a consultar la fuente sin presentar un valor numérico.
- El enlace IMDb abre IMDb incluso si no existe un IMDb ID.
