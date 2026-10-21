# Prisma

**Tu laboratorio personal de recomendaciones cinematográficas.**

Prisma es una aplicación web estática, mobile-first y en español, pensada para funcionar desde Android y aprender de tus preferencias individuales. En su primera versión, el perfil se guarda en tu navegador; no se envían tus valoraciones a un servidor.

## Funciones del MVP
- Importar el JSON personal de valoraciones de Prisma/tu app de seguimiento (las series se ignoran).
- Catálogo personal inicialmente vacío, exploración de películas en TMDB tras configurar una credencial, fichas, pendientes y puntuación del 1 al 10.
- Recomendador de contenido explicable que aprovecha géneros y etiquetas disponibles.
- Perfil, métricas y evaluación experimental del modelo.
- Importación local de CSV de catálogo (incluido el formato `movies.csv` de MovieLens), exportación de copia de seguridad y PWA básica.
- Perfil y colección guardados localmente, sin servidor; conexión a TMDB configurada desde la aplicación.

 > Prisma no incluye películas de muestra: una instalación nueva comienza con el perfil y el catálogo personal vacíos. Descubrir consulta datos reales de TMDB cuando conectas la credencial, pero no añade esos títulos a tu colección automáticamente. El motor solo puede aprender características que existan en los metadatos; una valoración sin géneros/etiquetas enlazados no revela por sí sola qué te gustó de la película.

## Publicar gratis en GitHub Pages
1. Abre **Settings → Pages** en este repositorio.
2. En **Build and deployment**, cambia **Source** a **GitHub Actions** y guarda si aparece un botón para hacerlo.
3. Abre la pestaña **Actions** y entra en **Deploy Prisma to GitHub Pages**. Espera a que el trabajo termine con una marca verde.
4. En **Settings → Pages**, abre la URL que GitHub muestra para el sitio. La URL esperada para este repositorio es `https://elfast-dev.github.io/Prisma/`.
5. En Android, abre la página con Chrome y elige **Añadir a pantalla de inicio** si está disponible.

El flujo de despliegue se encuentra en `.github/workflows/deploy-pages.yml`. Usa GitHub Actions para publicar la raíz del repositorio; por eso, la fuente de Pages debe estar seleccionada como **GitHub Actions**, no como una rama.

Los archivos y rutas son relativos para funcionar en `https://elfast-dev.github.io/Prisma/`.

## Importar tu historial
1. Abre Prisma y entra en **Ajustes / Datos**.
2. Importa tu JSON original. El importador busca las listas de valoraciones dentro del apartado `movies` y enlaza títulos mediante sus identificadores cuando puede.
3. Revisa el número de películas detectadas y las que tienen metadatos suficientes.
4. Para una copia de seguridad, usa **Exportar mis datos**. La copia contiene tu perfil personal; no la subas al repositorio público.

## Enlazar tu historial con TMDB

Tras importar el JSON y conectar TMDB, abre **Laboratorio → Enlazar mi historial con TMDB** y pulsa el botón de enriquecimiento. Prisma usa el `tmId` del JSON para solicitar los detalles de cada película; para IDs no válidos intenta una búsqueda exacta por título y año. Las series viven en otra sección del archivo y no se importan como películas. Las notas y emociones no se alteran. El proceso se muestra con progreso y guarda resultados en el navegador cada cinco películas para reducir pérdidas si se cierra la pestaña.

## Ampliar el catálogo
Puedes importar un CSV con columnas como `title`, `year`, `genres`, `tags`, `overview` y, cuando la fuente lo proporcione, `tmdb_id` o `tmdbid` para preservar la identidad TMDB. Las columnas genéricas `id`, `movieId` y `movie_id` se conservan como identificadores de origen; no se interpretan como IDs TMDB. Si la fuente no incluye un ID TMDB válido, los títulos repetidos pueden deduplicarse por título normalizado. Para MovieLens, el archivo pequeño `movies.csv` es suficiente para aportar títulos y géneros; no es necesario importar su archivo de valoraciones. Comprueba y respeta las condiciones de licencia del conjunto de datos que elijas. En este proyecto la importación ocurre en tu navegador.

## Privacidad y límites
- Las valoraciones y emociones se guardan en el almacenamiento local de tu navegador (IndexedDB/localStorage de respaldo).
- Borrar los datos del sitio puede borrar tu perfil. Exporta copias periódicamente.
- No se precargan películas. La importación CSV es opcional y explícita; conecta TMDB para buscar títulos y cargar metadatos cinematográficos.
- El recomendador es una primera línea base personal y explicable, no un modelo validado científicamente. Las estimaciones son aproximaciones; el laboratorio muestra cuántas películas tienen metadatos suficientes y evita presentar una métrica sin muestra útil.

## Desarrollo
No hay dependencias npm. Es HTML, CSS y JavaScript nativo, por lo que puedes editarlo desde un navegador/entorno de desarrollo en Android y publicarlo como archivos estáticos.

## Desarrollo guiado por especificaciones (SDD)

Prisma mantiene sus reglas de producto y arquitectura en `docs/`, las especificaciones de comportamiento en `openspec/specs/` y cada cambio pendiente en `openspec/changes/<slug>/`.

Antes de modificar una funcionalidad, crea un expediente con propuesta, escenarios de aceptación, diseño y tareas. Implementa únicamente el alcance descrito, ejecuta la verificación apropiada, actualiza las especificaciones vigentes y archiva el expediente solo cuando se haya comprobado su convergencia. El procedimiento completo está en `openspec/project.md`.

### Checks automáticos

El workflow `.github/workflows/quality.yml` ejecuta:

- `node --check app.js` y `node --check sw.js`, para detectar errores de sintaxis JavaScript.
- `node scripts/validate-sdd.mjs`, para validar los artefactos SDD, sus requisitos y sus escenarios.
- `node scripts/test-catalog-import.mjs`, para probar la identidad TMDB y la deduplicación del importador CSV con datos sintéticos.

Estos checks no sustituyen pruebas de comportamiento, regresión ni comprobaciones visuales del navegador. Los cambios funcionales deben añadir la cobertura necesaria para sus riesgos. No subas historiales personales, archivos de copia de seguridad ni credenciales a GitHub.

