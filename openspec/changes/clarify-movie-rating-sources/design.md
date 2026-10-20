# Diseño: Claridad de puntuaciones y enlaces externos

## Decisión técnica

Añadir voteCount al registro normalizado usando vote_count como variante de entrada. La propiedad seguirá el recorrido de enriquecimiento, caché local, colección y guardado de valoraciones sin modificar campos personales.

Separar el renderizado de los indicadores de puntuación en un helper puro. El helper solo mostrará una nota numérica entre 0 y 10 cuando metadataSource o source indiquen explícitamente tmdb. El recuento se representa únicamente como entero positivo con formato local español. La nota enlaza a TMDB.

IMDb usará la ficha si hay un IMDb ID y su propia búsqueda si no lo hay. Rotten Tomatoes y Metacritic seguirán siendo enlaces de búsqueda, pero su texto indicará claramente «Buscar título» en lugar de parecer puntuaciones integradas. El HTML mantiene rel=noopener noreferrer, nombres accesibles y codificación de parámetros.

## Compatibilidad y riesgos

- Cambios aditivos en metadatos locales; sin migración de esquema ni eliminación de campos personales.
- Los registros ya enriquecidos conservan los datos actuales; si no tienen recuento guardado, se muestra la fuente sin inventarlo.
- No se realizan llamadas reales a TMDB durante las pruebas.
- CSS y JS reciben versiones nuevas y el service worker cambia la caché para evitar servir la ficha anterior.
- El workflow estático ejecuta una prueba dedicada para los casos positivos, negativos y de procedencia no confirmada.
