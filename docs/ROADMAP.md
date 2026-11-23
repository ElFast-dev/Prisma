# Hoja de ruta

## Estado actual: etapas 1–15 completadas

Las etapas 1–15 están completadas. Espectro 2.6 ofrece un panel local de seis apartados, un predictor RBF y descubrimiento de interacciones con evidencia. CI, E2E, PWA/offline y publicación en GitHub Pages están automatizados; la etapa 16.4 conserva pendiente únicamente la comprobación física con TalkBack y la revisión táctil en Android.

- [x] Repositorio público inicializado.
- [x] Configuración React, TypeScript y Vite.
- [x] Navegación inicial de tres secciones.
- [x] Primera estructura de pantallas.
- [x] Esquema inicial Dexie.
- [x] Reglas iniciales de visionado.
- [x] Cliente base TMDB sin credenciales.
- [x] Configuración PWA y CI inicial.

## Entregas

- [x] 1. Conexión TMDB personal configurada desde Ajustes.
- [x] 2. Descubrir con tendencias, búsqueda y paginación progresiva.
- [x] 3. Ficha cinematográfica con metadatos, reparto, equipo, recomendaciones y disponibilidad por región.
- [x] 4. Guardado de películas y estados en IndexedDB.
- [x] 5. Registro, edición y eliminación de visionados desde la ficha.
- [x] 6. Historial con calendario mensual, edición y eliminación de experiencias.
- [x] 7. Estadísticas personales derivadas del historial: películas, visionados, tiempo y rachas.
- [x] 8. Colecciones, perfil editable y logros.
- [x] 9. Espectro por versiones (v1.0 local, afinidades, evolución y candidatas explicadas).
- [x] 10. Copias de seguridad validadas (exportación e importación local JSON).
- [x] 11. Preparación offline y publicación de GitHub Pages (app shell, caché limitada de imágenes, estado de conexión e iconos Android).
- [x] 12. Prueba manual en Android completada: actualización instalada, apertura en modo avión y navegación de datos guardados verificadas en el teléfono.
- [x] 13. Migración desde respaldo Android v2: importación exclusiva de películas, fusión por TMDB, historial/calificaciones y conservación del formato nativo de Prisma.
- [x] 14. Enriquecimiento automático y reanudable de metadatos de las películas de la Biblioteca, con control de solicitudes y protección de datos personales.

## Próximas etapas acordadas

- [x] 15. Evolución de Personal.
  - [x] 15.1 Biblioteca: búsqueda local por título oficial/original y director; filtros por estado personal, Próximamente/Estrenada, género y rango de años; orden por título, valoración TMDB, valoración personal, duración, estreno, incorporación y aleatorio con dirección reversible; preferencias persistentes en Dexie; barra contextual compartida con Descubrir; Ajustes como pantalla completa; restauración de scroll al regresar de fichas.
  - [x] 15.2 Historial: cronología global agrupada por mes, calendario mensual, búsqueda local por título oficial/original, director, género y comentario; filtros combinables por notas, calificación y fechas; orden cronológico reversible; acceso a fichas y edición/eliminación individual; conservación de revisionados y secuencias (CI aprobada: 86 pruebas; compilación y despliegue de Pages correctos).
  - [x] 15.3 Colecciones: organización y gestión mejoradas.
  - [x] 15.4 Perfil y logros: presentación y estadísticas personales ampliadas.
    - [x] 15.4.1 Huella cinematográfica: distribución local por géneros y décadas, actividad de seis meses y progresión ampliada de logros.
    - [x] 15.4.2 Firmas y cine del mundo: directores y países de producción más frecuentes, contados por películas distintas.
- [ ] 16. Espectro 2.0.
  - [x] 16.1 Base estadística: afinidades por películas distintas, ajuste por soporte y dispersión, señales locales de idioma y duración, y versión de instantáneas 2.0.0.
  - [x] 16.2 Recomendaciones combinadas: puntuación por familias de rasgos con límites por categoría y explicaciones respaldadas.
  - [x] 16.3 Evolución de afinidades: comparación entre dos periodos con mínimo de tres títulos distintos por rasgo y periodo.
  - [ ] 16.4 Experiencia final, accesibilidad, pruebas completas y verificación del despliegue.
    - [x] Afinidades y evolución presentadas mediante gráficos vectoriales de línea y divergencia, no solo cifras y barras.
    - [x] Enriquecimiento local de metadatos de películas vistas, favoritas y candidatas, usando TMDB sin abrir cada ficha y sin reescribir datos personales.
    - [x] Encaje relativo de 0–100 %, nota prevista de 0–10 y separación entre señales derivadas de valoraciones y favoritos declarados.
    - [x] Grafo de decisiones con señales positivas y negativas, contribuciones por candidata y títulos de respaldo visibles.
    - [x] Preguntas contextuales en Espectro para completar calificaciones de visionados sin abrir fichas; respuesta ligada al visionado existente y opción de posponer.
    - [x] Mapa de red donde cada película y cada género, director, actor o tema son nodos; fuerza de vínculo por grosor y brillo, tamaño por influencia y agrupación automática por similitud.
    - [x] Zonas atenuadas para películas locales por explorar; selección, búsqueda y zoom del mapa táctil.
    - [x] Portada de Espectro organizada como Personal, con páginas separadas de mapa, afinidades, evolución y recomendaciones.
    - [x] Palabras clave temáticas consultadas y guardadas con caché TMDB local, sin abrir fichas ni inventar etiquetas.
    - [x] Alternativas tabulares desplegables para gráficas complejas, con prueba E2E de acceso a los datos.
    - [x] Validar pruebas unitarias, TypeScript, build, smoke test, Playwright móvil y PWA/offline en CI.
    - [x] Publicar en GitHub Pages y verificar en remoto el HTML, JavaScript, CSS y manifiesto PWA.
    - [ ] Revisar manualmente el mapa en un Android físico: legibilidad, contraste, zoom, desplazamiento táctil y actualización de la PWA instalada.
- [ ] 17. Optimización integral.
  - [x] 17.1 Presupuesto informativo del JS/CSS iniciales y de los chunks diferidos, medido tras compresión gzip y ejecutado en CI.
  - [x] 17.2 Alternativas tabulares accesibles para las gráficas de Espectro.

Este es el orden acordado para continuar Prisma. El alcance y los criterios de aceptación de cada etapa se definirán antes de implementarla; estas etapas no se sustituyen por propuestas técnicas aisladas.

### Criterios offline y Android
- La etapa 15.2 está publicada y pasó CI; queda pendiente la comprobación manual de su presentación y navegación en un dispositivo Android físico.

- La aplicación y sus recursos esenciales se precargan para abrir su shell sin red.
- Las imágenes TMDB se guardan en caché con límites para cuidar el almacenamiento.
- La aplicación informa cuándo no hay conexión y cuándo Descubrir usa datos antiguos.
- Al recuperar conexión, Descubrir solicita datos actualizados.
- El manifiesto incluye iconos PNG estándar y una versión adaptable (maskable).
- La comprobación real de instalación y modo avión debe completarse en un Android físico.

### Criterios de copias de seguridad

- Archivo JSON versionado, con estructura estricta y relaciones validadas.
- Exportación de biblioteca, visionados, colecciones, perfil, preferencias y región.
- Restauración transaccional, precedida por validación y confirmación explícita.
- Credencial TMDB excluida y preservada al restaurar.
- Cachés regenerables excluidas del archivo.
- Importación externa Android v2 separada de la restauración nativa; solo películas y fusión por ID TMDB.

### Criterios de Espectro

- Algoritmo local versionado con huella de entrada e instantáneas separadas.
- Afinidades con soporte mínimo, dispersión y diferencia ajustada frente al promedio personal.
- Señales de idioma y duración únicamente cuando existen metadatos reales.
- Candidatas locales no vistas puntuadas por varias familias de señales verificadas y explicadas.
- El encaje se presenta como puntuación relativa 0–100, no como probabilidad; la nota prevista se calcula aparte y solo desde señales respaldadas por valoraciones.
- Los favoritos son señales explícitas, nunca calificaciones inventadas.
- El grafo de decisiones y el mapa cinematográfico muestran señales positivas y negativas, conexiones entre películas y rasgos, contribuciones y títulos de respaldo.
- Ocho familias intervienen en la explicación de encaje: género, dirección, reparto, temas, país, época, idioma y duración.
- Los metadatos que faltan se consultan desde TMDB mediante ID local y caché, incluidas las palabras clave temáticas, sin tener que abrir fichas ni alterar experiencias personales.
- Las señales iniciales o variables no sostienen por sí solas una recomendación.
- Comparación temporal anclada en fechas reales y con soporte mínimo por rasgo y periodo.
- Repeticiones agregadas por título para las afinidades; no aumentan la muestra de películas distintas.
- Las instantáneas de versiones anteriores no se reutilizan para cálculos 2.2.0.

### Criterios del perfil y los logros

- Perfil local editable: nombre, descripción, frase personal e imagen.
- Imagen limitada a formatos JPG, PNG o WebP y almacenada únicamente en IndexedDB.
- Logros calculados desde estadísticas y colecciones locales, sin servicios externos.
- Resumen de géneros, décadas, directores y países de producción basado en películas distintas realmente vistas; los revisionados cuentan en visionados y tiempo, no duplican títulos en la huella.
- Actividad mensual de los últimos seis meses derivada de fechas locales de visionado.
- Progresión de logros escalonada, calculada de nuevo desde la actividad local y sin guardar estados duplicados.

## Regla

No se considera funcional una pantalla solo por existir visualmente. Cada módulo requiere criterios de aceptación y pruebas.


### Etapa 14 — criterios de aceptación

- Detectar películas incompletas por ID TMDB y evitar duplicados o consultas repetidas.
- Procesar hasta 24 películas simultáneamente, iniciar hasta unas 28 solicitudes por segundo, agrupar actualizaciones de progreso y reducir automáticamente el ritmo con pausa global y Retry-After ante HTTP 429.
- Reintentar errores temporales, detenerse ante credenciales inválidas y registrar los 404 como no encontrados.
- Guardar el estado en IndexedDB para continuar tras pausas, desconexiones o cierre de la aplicación.
- Actualizar solo metadatos cinematográficos; no modificar Biblioteca, favoritos, visionados ni datos personales.
- Usar la caché TMDB existente para detalles (30 días) y la caché limitada del Service Worker para imágenes.
- Iniciar el proceso únicamente después de una acción explícita del propietario.
- Validación real en Android completada por el propietario: las 821 películas de su Biblioteca se enriquecieron con 24 trabajadores simultáneos y sin fallos observados.
