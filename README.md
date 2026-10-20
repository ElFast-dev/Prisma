# Prisma

**Tu laboratorio personal de recomendaciones cinematográficas.**

Prisma es una aplicación web estática, mobile-first y en español, pensada para funcionar desde Android y aprender de tus preferencias individuales. En su primera versión, el perfil se guarda en tu navegador; no se envían tus valoraciones a un servidor.

## Funciones del MVP
- Importar el JSON personal de valoraciones de Prisma/tu app de seguimiento (las series se ignoran).
- Catálogo de muestra inicial, buscador, ficha de película, lista de pendientes y puntuación del 1 al 10.
- Recomendador de contenido explicable que aprovecha géneros y etiquetas disponibles.
- Perfil, métricas y evaluación experimental del modelo.
- Importación local de CSV de catálogo (incluido el formato `movies.csv` de MovieLens), exportación de copia de seguridad y PWA básica.
- Sin claves de API ni servicios de pago.

> El catálogo incluido en el repositorio es una muestra inicial, no todas las películas existentes. Para ampliarlo, importa un catálogo que tengas derecho a usar. El motor solo puede aprender características que existan en los metadatos; una valoración sin géneros/etiquetas enlazados no revela por sí sola qué te gustó de la película.

## Publicar gratis en GitHub Pages
1. Abre **Settings → Pages** en este repositorio.
2. En **Build and deployment**, selecciona **Deploy from a branch**.
3. Selecciona `main` y la carpeta `/(root)`; pulsa **Save**.
4. Cuando termine el despliegue, abre la URL que GitHub Pages muestre en esa pantalla.
5. En Android, abre la web con Chrome y elige **Añadir a pantalla de inicio** si la opción está disponible.

Los archivos y rutas son relativos para funcionar en `https://elfast-dev.github.io/Prisma/`.

## Importar tu historial
1. Abre Prisma y entra en **Ajustes / Datos**.
2. Importa tu JSON original. El importador busca las listas de valoraciones dentro del apartado `movies` y enlaza títulos mediante sus identificadores cuando puede.
3. Revisa el número de películas detectadas y las que tienen metadatos suficientes.
4. Para una copia de seguridad, usa **Exportar mis datos**. La copia contiene tu perfil personal; no la subas al repositorio público.

## Ampliar el catálogo
Puedes importar un CSV con columnas como `title`, `year`, `genres`, `tags` y `overview`, o el formato MovieLens `movieId,title,genres`. Para MovieLens, el archivo pequeño `movies.csv` es suficiente para aportar títulos y géneros; no es necesario importar su archivo de valoraciones. Comprueba y respeta las condiciones de licencia del conjunto de datos que elijas. En este proyecto la importación ocurre en tu navegador.

## Privacidad y límites
- Las valoraciones y emociones se guardan en el almacenamiento local de tu navegador (IndexedDB/localStorage de respaldo).
- Borrar los datos del sitio puede borrar tu perfil. Exporta copias periódicamente.
- El catálogo inicial está curado de forma pequeña y no es exhaustivo; el CSV importado amplía las recomendaciones, no descarga carteles automáticamente.
- El recomendador es una primera línea base personal y explicable, no un modelo validado científicamente. Las estimaciones son aproximaciones; el laboratorio muestra cuántas películas tienen metadatos suficientes y evita presentar una métrica sin muestra útil.

## Desarrollo
No hay dependencias npm. Es HTML, CSS y JavaScript nativo, por lo que puedes editarlo desde un navegador/entorno de desarrollo en Android y publicarlo como archivos estáticos.
