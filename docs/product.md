# Prisma: definición del producto

## Propósito

Prisma es una aplicación web personal para organizar películas vistas, valoraciones, pendientes y películas ocultas, explorar un catálogo y obtener recomendaciones que expliquen qué señales de los gustos del usuario han influido en cada predicción.

## Usuario y contexto

- Una persona usuaria, con perfil individual guardado en el navegador.
- Uso prioritario desde Android y pantallas móviles; la interfaz está en español.
- Publicación estática mediante GitHub Pages, sin un servidor propio.
- El catálogo inicial es una muestra ampliable mediante importación local y, de forma opcional, TMDB.

## Capacidades observadas en la versión de referencia

1. Importación local de un historial JSON y de catálogos CSV/TSV.
2. Colecciones separadas para valoraciones, películas vistas, pendientes y elementos ocultos.
3. Fichas y búsqueda de películas, con metadatos disponibles en el catálogo o TMDB.
4. Recomendaciones basadas en señales explicables, con mayor influencia de los géneros que de etiquetas dispersas, reducción hacia la media cuando faltan señales aprendidas y confianza acorde con la cobertura.
5. Laboratorio con estadísticas descriptivas y evaluación experimental del recomendador, comparando el MAE con una referencia basada en la media de entrenamiento.
6. Copia de seguridad y restauración local.
7. Instalación PWA y un modo sin conexión limitado por la caché disponible.

La lista describe el código inspeccionado como base de partida; no afirma que cada escenario tenga todavía una prueba automatizada de comportamiento.

## Fuera del alcance actual

- Sincronización entre dispositivos o cuentas.
- Backend, autenticación de usuarios o almacenamiento remoto del perfil.
- Presentar las predicciones como certeza o como un modelo científicamente validado.
- Afirmar que el catálogo inicial contiene todas las películas existentes.
- Descargar, incorporar o redistribuir catálogos sin respetar sus licencias.

## Objetivos de calidad

- Preservar datos personales y permitir exportar una copia de seguridad.
- Evitar mezclar remakes o películas homónimas cuando existe un identificador de TMDB fiable.
- No inventar metadatos ni puntuaciones de fuentes externas.
- Mantener un sitio ligero y funcional en un navegador móvil moderno.
- Vincular cada cambio de comportamiento con requisitos, tareas y evidencia de verificación.

## Indicadores prácticos de éxito

- La persona usuaria puede importar, revisar, exportar y restaurar sus datos sin enviarlos al repositorio.
- Una modificación no altera las valoraciones, notas, emociones o fechas personales fuera de su alcance declarado.
- Toda recomendación excluye elementos ya valorados, vistos, pendientes u ocultos y muestra sus limitaciones.
- Los cambios pasan las comprobaciones automáticas disponibles y los criterios de aceptación específicos de la funcionalidad.
