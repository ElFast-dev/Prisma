# Prisma: definición del producto

## Propósito

Prisma es una aplicación web personal para organizar películas vistas, valoraciones, pendientes y películas ocultas, explorar un catálogo y obtener recomendaciones que expliquen qué señales de los gustos del usuario han influido en cada predicción.

## Usuario y contexto

- Una persona usuaria, con perfil individual guardado en el navegador.
- Uso prioritario desde Android y pantallas móviles; la interfaz está en español.
- Publicación estática mediante GitHub Pages, sin un servidor propio.
- El catálogo personal comienza vacío; la exploración remota usa TMDB tras configurar una credencial, y la importación de datos es siempre una acción explícita.

## Capacidades observadas en la versión de referencia

1. Importación local de un historial JSON y de catálogos CSV/TSV.
2. Colecciones separadas para valoraciones, películas vistas, pendientes y elementos ocultos.
3. Fichas y búsqueda con metadatos de TMDB cuando la fuente está conectada, además de datos locales incorporados explícitamente por la persona.
4. Recomendaciones basadas en señales explicables, con mayor influencia de los géneros que de etiquetas dispersas, una señal débil de década cuando existe año fiable, reducción hacia la media cuando faltan señales aprendidas y confianza acorde con la cobertura.
5. Laboratorio con estadísticas descriptivas y evaluación experimental del recomendador: MAE frente a la media de entrenamiento, ablación de la señal de década y comparación de nDCG@5 entre Equilibrado, Más afines y Más variedad sobre las mismas candidatas retenidas. El experimento Ridge conserva la evaluación histórica de cinco pliegues y añade, bajo demanda, tres repeticiones deterministas de cinco pliegues con métricas agregadas por repetición y progreso local. El Laboratorio resume la dirección favorable y el rango observado entre repeticiones, sin atribuirles significación estadística. Incluye un experimento temporal walk-forward, bajo demanda, que entrena con visionados anteriores, prueba con visionados posteriores y excluye valoraciones sin fecha fiable. Equilibrado y Más variedad muestran además la diferencia descriptiva respecto a Más afines; la diversidad de géneros en las listas actuales se mide por separado. Permite copiar un informe técnico agregado v6 sin registros individuales ni envío automático; la validación temporal distingue timestamps importados explícitamente de fechas heredadas o generadas por acciones, que solo respaldan resultados exploratorios. Las métricas no garantizan satisfacción ni prueban significación estadística.
6. Copia de seguridad y restauración local, con consulta del estado de almacenamiento y solicitud explícita de persistencia cuando el navegador lo admite.
7. Instalación PWA y un modo sin conexión limitado por la caché disponible.

La lista describe el código inspeccionado como base de partida; no afirma que cada escenario tenga todavía una prueba automatizada de comportamiento.

## Fuera del alcance actual

- Sincronización entre dispositivos o cuentas.
- Backend, autenticación de usuarios o almacenamiento remoto del perfil.
- Presentar las predicciones como certeza o como un modelo científicamente validado.
- Cargar o mostrar películas de muestra antes de que la persona añada sus propios datos.
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


## Preferencias de producto y hoja de ruta acordada

La misión de Prisma es combinar en una experiencia personal de cine la organización del historial, el descubrimiento y las recomendaciones. La experiencia debe ser minimalista, rápida en Android y móvil, con tema negro predeterminado, azul discreto como acento y modo claro opcional.

### Prioridades de producto

1. **Experiencia móvil y navegación.** Mantener controles fáciles de pulsar, un estado de navegación claro, formularios compactos y transiciones mínimas; respetar las preferencias de movimiento reducido.
2. **Descubrir con personalización al principio.** Mostrar recomendaciones personalizadas antes del resto del catálogo, sin duplicados y excluyendo elementos vistos u ocultos; los resultados adicionales siguen disponibles después de las recomendaciones.
3. **Ficha completa, jerarquizada.** Organizar póster, sinopsis completa, fecha/año, puntuación personal y pública, reparto/dirección, tráiler, títulos similares y opciones externas de consulta sin saturar la pantalla. No afirmar disponibilidad de streaming en Panamá sin datos comprobados.
4. **Registro personal opcional.** Permitir guardar estado, nota, fecha, emociones, etiquetas, notas y listas, pero mantener el flujo básico breve y no exigir campos opcionales.
5. **Recomendaciones equilibradas y ajustables.** Combinar similitud con películas bien valoradas, variedad/serendipia y señales del contexto o interés. Ponderar por evidencia las valoraciones, favoritos, géneros, temas, personas creadoras, época, emociones, etiquetas y rechazos; explicar las señales que contribuyen a cada sugerencia.
6. **Privacidad local primero.** Mantener el perfil solo en el dispositivo y ofrecer exportación/importación de copias de seguridad. La sincronización en la nube no forma parte del alcance hasta que se decida explícitamente lo contrario.

### Estrategia de entrega

Cada mejora debe ser pequeña, guiada por SDD, respaldada por pruebas y verificada antes de archivarse. La primera entrega prioriza navegación móvil accesible; después se deben revisar la presentación inicial de recomendaciones, la jerarquía de las fichas y la rapidez del registro, sin romper la identidad ni el comportamiento existentes. Las mejoras del recomendador deben evaluarse con métricas y muestras suficientes, no solo por impresión visual.
