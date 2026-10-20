# Diseño: identidad TMDB en el importador CSV

## Decisión

La identidad TMDB solo se reconoce desde los encabezados explícitos `tmdb_id` y `tmdbid`. Los encabezados `id`, `movieId` y `movie_id` continúan siendo identificadores del conjunto de datos de origen y no se interpretan como TMDB.

## Cambios previstos

1. En `parseCatalogCSV`, separar la columna de ID genérico de la columna TMDB; validar que el valor TMDB sea un entero positivo seguro.
2. Deduplicar filas con ID TMDB por `tmdb:<id>`; las filas sin ID TMDB conservan el comportamiento actual de deduplicación por título.
3. En `importCatalogCSV`, indexar el catálogo personalizado por `movieIdentityKey` para conservar entradas con IDs TMDB distintos y actualizar una entrada cuando se vuelva a importar el mismo ID.
4. Ampliar el workflow Playwright existente con un CSV fixture sintético que contiene dos títulos iguales y distintos IDs TMDB. Inspeccionar la persistencia de `catalogCustom` en IndexedDB.
5. Actualizar la especificación vigente solo después de que pasen los checks.

## Riesgos y mitigaciones

- **Identificador genérico ambiguo:** no convertir columnas `id` o `movieId` a TMDB.
- **Registros históricos sin TMDB:** no migrar ni fusionar automáticamente datos personales. La deduplicación histórica queda fuera del cambio.
- **Falsos positivos de UI:** inspeccionar el valor persistido en IndexedDB, no solo el número de tarjetas visibles.
- **Pruebas contaminadas:** usar títulos de fixture con prefijo Prisma Test y un contexto de navegador nuevo.

## Verificación

GitHub Actions comprobará sintaxis, documentación, JSON del catálogo y la prueba de navegador con datos sintéticos. No se ejecutarán llamadas a TMDB.
