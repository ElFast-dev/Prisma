# Propuesta: Clarificar la procedencia de las puntuaciones

## Motivación

La ficha de una película podía mostrar una nota media de TMDB sin recuento de votos ni enlace directo a la fuente. Cuando faltaba el IMDb ID, el enlace rotulado IMDb podía conducir a TMDB. La ficha debe distinguir las cifras verificadas de los enlaces para consultar servicios externos.

## Alcance implementado

- Preservar el recuento vote_count de TMDB con los metadatos de la película.
- Mostrar la nota pública solo con procedencia TMDB y dentro del rango válido.
- Mostrar el número de votos solo si la fuente lo proporciona.
- Corregir los enlaces: IMDb abre la ficha o su búsqueda; Rotten Tomatoes y Metacritic abren búsquedas claramente etiquetadas.
- Añadir pruebas automáticas con datos sintéticos y versionar activos/caché para evitar recursos antiguos.

## Fuera de alcance

- Integrar puntuaciones numéricas de IMDb, Rotten Tomatoes o Metacritic. Prisma no obtiene esas cifras en esta implementación.
- Añadir credenciales, solicitudes externas adicionales o dependencias.
- Cambiar valoraciones personales, emociones, comentarios, listas o el algoritmo recomendador.

## Resultado

Los checks de sintaxis, SDD, importación de catálogo, procedencia de puntuaciones y regresión visual del PR pasaron en GitHub Actions:
- [SDD y calidad estática](https://github.com/ElFast-dev/Prisma/actions/runs/39488143372)
- [Validar Prisma](https://github.com/ElFast-dev/Prisma/actions/runs/39488143306)
- [Pruebas visuales de interfaz](https://github.com/ElFast-dev/Prisma/actions/runs/39488143276)
