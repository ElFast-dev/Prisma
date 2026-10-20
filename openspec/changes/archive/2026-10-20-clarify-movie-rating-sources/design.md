# Diseño: Claridad de puntuaciones y enlaces externos

## Decisión técnica aplicada

Se añadió voteCount al registro normalizado usando vote_count como campo de entrada de TMDB. El valor acompaña al enriquecimiento, la caché local, la colección y el guardado de valoraciones personales sin sustituir campos personales.

El helper puro buildRatingMetrics renderiza la nota numérica solo cuando metadataSource o source indican tmdb y la nota está entre 0 y 10. El recuento solo se muestra como entero positivo con formato español. La nota queda enlazada a la película correspondiente en TMDB.

IMDb abre la ficha cuando hay IMDb ID y la búsqueda propia cuando no lo hay. Rotten Tomatoes y Metacritic permanecen como búsquedas externas rotuladas «Buscar título». Los enlaces externos conservan rel=noopener noreferrer, etiquetas accesibles y títulos codificados en URL.

## Compatibilidad y riesgos

- Cambio aditivo de metadatos; sin migración del estado local.
- Se preservan valoraciones, emociones, comentarios y fechas personales.
- Las pruebas no usan credenciales ni realizan peticiones a TMDB.
- Se actualizaron las versiones de CSS/JS y la caché del service worker.
- Evidencia de validación y pruebas registrada en la propuesta y en el PR #6.
