# Diseño: modularización progresiva con ES modules

## Arquitectura objetivo

- `app.js`: punto de entrada y composición de la aplicación; conecta estado, funciones de dominio, vistas y eventos.
- `js/core/movie-utils.js`: normalización, identidad, listas y validación pura de películas.
- `js/core/storage.js`: IndexedDB y respaldo localStorage con la misma semántica de lectura/escritura.
- `js/recommendations/engine.js`: perfil, predicción y evaluación leave-one-out; recibe proveedores mediante inyección de dependencias.
- `js/catalog/csv-parser.js`: lectura y validación de CSV/TSV sin DOM ni persistencia.
- `js/import-export/personal-data.js`: extracción y combinación de datos de JSON importados sin ejecutar efectos de interfaz.
- Los módulos posteriores de TMDB, colección y vistas seguirán el mismo patrón: una responsabilidad por módulo y dependencias visibles.

## Límites y dependencias

Los módulos de núcleo no conocerán el estado de la interfaz. El motor recibirá `getRatings`, `findMovie`, `movieFeatures` y `ratingValue` como dependencias. Los analizadores serán funciones deterministas; la capa de aplicación seguirá siendo responsable de guardar los resultados, actualizar el estado y renderizar.

Los módulos usarán rutas relativas compatibles con el subdirectorio `/Prisma/` de GitHub Pages. No se agrega compilador: el navegador carga ES modules directamente.

## PWA y caché

La entrada se marca con `type="module"`. El service worker incluirá todos los módulos locales importados en el shell y usará un identificador de caché nuevo. Las pruebas comprobarán que cada import local de `app.js` corresponde a un recurso prealmacenado, además de mantener coherente la URL versionada de la entrada.

## Compatibilidad y datos

No cambia la estructura del estado ni las claves de IndexedDB/localStorage. Se conservan el algoritmo, la escala 1–10, la evaluación leave-one-out, las respuestas y los formatos de importación. Las pruebas usarán datos sintéticos y no llamarán a TMDB.

## Verificación

- Pruebas unitarias directas de módulos exportados.
- Pruebas de identidad de películas, evaluación del motor y pesos de señales.
- Prueba estática de arquitectura: importaciones locales, archivos esperados, límites entre módulos y recursos en caché.
- Validación SDD y chequeo de sintaxis de todos los módulos.
- UI desktop/móvil antes y después de la publicación.
