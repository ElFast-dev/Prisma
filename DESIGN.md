# Prisma — guía de producto y UI/UX

## Dirección visual
Prisma utiliza carbón azulado, azul medianoche, superficies pizarra y un azul frío como acento. El color más llamativo debe venir de los carteles; botones, estados activos y enlaces reciben el azul solo cuando comunican interacción. La interfaz evita el morado, los brillos decorativos constantes y los paneles innecesarios.

## Navegación primaria
Tres destinos en la barra principal: **Progreso**, **Descubrir** y **Colección**. En la cabecera persistente, una búsqueda global dirige a Descubrir, el icono de barras abre el análisis del motor y el icono de ajustes abre Datos. En escritorio la barra principal es horizontal y compacta; en Android queda fija abajo y tiene tres áreas táctiles amplias.

## Progreso
Muestra el número real de películas vistas, valoradas y pendientes, además de la media personal. Le siguen tendencias de género a partir de las valoraciones registradas y actividad reciente. Los indicadores describen los datos locales: no se muestran valores de ejemplo como si fueran del usuario.

## Descubrir
Primero aparecen las recomendaciones personales y luego el buscador remoto de TMDB y el catálogo local. Las sugerencias se calculan con el motor explicable actual y se identifican como estimaciones. Los géneros tienen más influencia directa que etiquetas aisladas; metadatos desconocidos acercan la nota a la media del perfil y la confianza depende de la cobertura real de señales. Los títulos ocultos, vistos o pendientes se excluyen de la selección de recomendaciones. Una búsqueda global cambia a Descubrir y aplica el término tanto al catálogo local como, cuando TMDB está conectado, a la consulta remota.

## Colección
La pantalla ofrece los modos **Películas** y **Listas**. Películas contiene **Historial**, **Pendientes** y **Ocultos**. La lupa busca exclusivamente en la colección; el control de orden, la selección múltiple de géneros y la alternancia entre vista de lista/compacta son controles independientes.

- **Historial:** cuatro películas recientes en tarjetas horizontales y después la lista completa con fecha de estreno, título, sinopsis resumida, nota personal y puntuación pública de TMDB cuando existe.
- **Pendientes:** lista equivalente, sin nota personal y con el filtro **Estrenada**.
- **Ocultos:** títulos excluidos de las sugerencias. Ocultar una película no elimina sus notas ni datos.

Los contadores se calculan de las entradas locales reales; no se codifican cantidades fijas.

## Hoja de película
La ficha combina fondo visual, título, fecha/país de estreno, duración, estado y géneros. Las acciones permiten marcar como vista sin calificar, guardar como pendiente, quitar de pendientes, gestionar listas u ocultar.

Cuando hay una credencial TMDB disponible, la ficha puede consultar reparto/equipo, vídeos, proveedores de streaming por región, recomendaciones similares y pertenencia a una saga. Los datos recuperados se conservan en el catálogo local de este navegador. Los comentarios públicos, enlaces de tráiler y páginas externas abren su fuente correspondiente.

La puntuación de la comunidad de TMDB se muestra como cifra solo cuando está disponible. Las páginas IMDb, Rotten Tomatoes y Metacritic se enlazan sin inventar notas o porcentajes que no proporciona la API usada.

## Hoja de persona
La ficha obtiene foto, nombre, biografía, nacimiento y créditos de películas de TMDB. Muestra el personaje cuando se abre desde una película, prioriza en producción/TBA y luego años de más reciente a más antiguo. El filtro **Colección** muestra créditos cuyos títulos están guardados localmente.

## Hojas inferiores
- **Ordenar por:** título, mejor valoración pública, nota personal, duración, estreno reciente, incorporación reciente y orden aleatorio; cada opción admite dirección ascendente/descendente.
- **Géneros:** selección múltiple de géneros con coincidencia tipo OR y botones Limpiar/Aceptar.
- **Calificar:** nota del 1 al 10 mediante diez estrellas tocables. Las emociones y notas anteriores se conservan en una sección opcional; Eliminar y Calificar son acciones separadas.

## Datos y compatibilidad
- Los datos existentes continúan en IndexedDB/localStorage con las mismas claves. El esquema local se amplía de manera compatible con arrays de historial separado y ocultos.
- Las películas importadas con nota continúan en el historial. Marcar vista no exige puntuar.
- TMDB es fuente de información de catálogo; las puntuaciones de crítica no disponibles se presentan como enlaces, no como cifras fabricadas.
- Los datos personales permanecen en el navegador. Exporta respaldos antes de limpiar datos del sitio o cambiar de dispositivo.

## Investigación de referencia
- Android Developers, patrones de navegación adaptativa: https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns
- TMDB, búsqueda y consulta de detalles: https://developer.themoviedb.org/docs/search-and-query-for-details
- TMDB, descubrimiento de películas: https://developer.themoviedb.org/reference/discover-movie
- Nielsen Norman Group, revelación progresiva: https://www.nngroup.com/articles/progressive-disclosure/
- W3C WCAG 2.2, contraste mínimo: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- MDN, prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

## Validación
El flujo de captura de GitHub Actions prueba la web publicada en escritorio y móvil. Verifica la versión del CSS, la paleta y los tres destinos de navegación antes de guardar las capturas.
