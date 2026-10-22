# Diseño: agrupador de filmografía y calendario de Panamá

## Responsabilidades

El módulo js/ui/person-filmography.js es puro: recibe créditos de TMDB y opciones de filtrado, deduplica por ID TMDB y devuelve grupos { year, label, items }. Las fechas verificables generan grupos anuales ordenados en descenso; los créditos sin fecha válida pertenecen al grupo inicial «En producción». El filtro recibe una función isMovieInCollection(title, tmdbId), por lo que no depende del DOM ni del estado global.

El módulo js/ui/modal-views.js convierte los grupos en encabezados y filas accesibles; conserva foto, biografía, roles, sinopsis, pósteres, marcadores de colección y acciones de navegación.

## Semántica de fecha

js/ui/presentation-utils.js usa dateOnlyInTimeZone para derivar un día calendario estable. Las fechas de solo día mantienen el valor original; los timestamps se convierten al día de America/Panama. El formateo se basa en el mediodía UTC de ese día para que el huso del dispositivo no vuelva a desplazar la fecha. La fecha del historial continúa en MM/DD/YYYY y sin hora.

## Verificación y distribución

Las pruebas usan créditos TMDB sintéticos y timestamps no personales. Se amplían las pruebas de ficha, modularidad, sintaxis y coherencia de caché. Se versionan la entrada app.js, ambos módulos UI y el shell PWA; el nuevo helper queda precargado bajo una ruta relativa compatible con GitHub Pages. No se modifican datos del usuario ni se añaden credenciales.
