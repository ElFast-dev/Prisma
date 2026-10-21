# Diseño: informe diagnóstico agregado y revisión explícita

## Fuente de datos

El informe recibe instantáneas de salida de las funciones del Laboratorio que ya evalúan el perfil en memoria: MAE y referencia, ablación de década, nDCG@5 por modo, y diversidad Jaccard. Se añade distribución de notas y un resumen agregado de las características aprendidas (tipo, etiqueta, soporte, nota media y peso). Las características se limitan a las 40 señales de mayor relevancia por magnitud y soporte; el informe indica cuántas se omiten.

## Minimización de datos

Se incluyen métricas, contadores, pesos del algoritmo y hasta 40 estadísticas agregadas de señales. No se serializan objetos del estado ni entradas individuales. Quedan excluidos títulos, TMDB IDs, identidad de registros, fechas de visionado o valoración, emociones, etiquetas/notas libres, credenciales, preferencias guardadas de UI y copias de seguridad. Las etiquetas de género/tema pueden revelar gustos, así que el panel las enumera explícitamente como posibles preferencias inferibles y pide revisión manual antes de pegar el contenido en otra conversación.

## Arquitectura

- `js/diagnostics/recommendation-report.js` exporta un constructor puro, recibe solo valores explícitos y no accede al DOM, almacenamiento, red ni portapapeles.
- La raíz de composición conecta el constructor con las métricas locales.
- `js/ui/page-views.js` presenta el panel y un área de texto de respaldo inicialmente oculta.
- `js/app/event-handlers.js` inicia la copia mediante una acción explícita. Usa `navigator.clipboard.writeText` en contexto seguro y revela el área seleccionable si la API falta o rechaza la operación.
- Las pruebas usan únicamente objetos sintéticos y validan que se excluyan datos personales sin necesitar ningún perfil real.
- Se actualizan versionado de `app.js`, inventario y caché del service worker, los checks que tienen versiones fijas, documentación y validador SDD.

## Límites interpretativos

El informe reproduce indicadores actuales, no determina por sí mismo qué modelo es mejor. nDCG@5 de Prisma ordena las películas valoradas retenidas de cada pliegue, no el catálogo completo no valorado. MAE evalúa notas conocidas; ninguna de las dos métricas demuestra satisfacción con títulos futuros. Los cambios algorítmicos posteriores requieren comparaciones bajo las mismas particiones y controles.
