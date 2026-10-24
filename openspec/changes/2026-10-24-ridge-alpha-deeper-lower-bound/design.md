# Diseño: siguiente iteración del límite inferior Ridge

## Rejillas y estabilidad numérica

La rejilla histórica permanece sin cambios: `[1e-5, 3e-5, 1e-4, 3e-4, 1e-3, 3e-3, 1e-2, 3e-2, 1e-1, 0.3, 1, 3, 10, 100]`. La rejilla extendida tendrá 22 valores en orden ascendente: `1e-9, 3e-9, 1e-8, 3e-8, 1e-7, 3e-7, 1e-6, 3e-6`, seguidos por la rejilla histórica.

El mínimo `1e-9` está mil veces por encima del umbral absoluto `1e-12` aplicado al pivote Cholesky. La tolerancia no se relajará para acomodar la búsqueda. Los candidatos que fallen en el ajuste numérico deben quedar inválidos y contabilizarse agregadamente; no se debe sustituir el resultado por una métrica inventada.

## Ejecución y coste

La API conserva las 14 opciones históricas cuando no se solicita `includeExtendedAlphaGrid: true`. La batería automática de desarrollo del Laboratorio solicita la rejilla extendida y la comparación de escala relativa; por tanto, se ampliará solo el coste de ese diagnóstico experimental. El motor de recomendaciones y el modo `additive-content-baseline` no leen ni activan estos resultados.

El progreso se deriva de la rejilla efectiva y el serializador v14 ya acepta hasta 32 valores. La prueba de responsividad mantiene un margen de tiempo explícito para la evaluación de perfiles sintéticos grandes.

## Selección anidada sin fuga

Para cada pliegue exterior, la selección por MAE minimiza el error absoluto medio en particiones interiores. La selección por ranking maximiza nDCG@5 interior por modo cuando se satisfacen sus mínimos de muestra y pliegues. Ambas comparten particiones interiores, pero eligen alpha por separado.

Los datos del pliegue exterior se usan únicamente para MAE/nDCG@5 y para la comparación emparejada contra la referencia aditiva. En la escala relativa, la rejilla lambda y los alpha efectivos se derivan de las escalas de entrenamiento correspondientes, sin consultar notas exteriores.

## Reporte e interpretación

El informe v14 debe conservar los 22 valores en los objetos de evaluación y en ambas comparaciones de selección/escala relativa. La frecuencia de elección del mínimo se calcula usando el mínimo real de la rejilla ejecutada. Si continúa sin resolverse, se registra el estado y se deja pendiente una futura decisión diagnóstica; no se reduce automáticamente la rejilla otra vez.

MAE y nDCG@5 deben reportarse por separado. Las repeticiones del mismo historial son particiones emparejadas descriptivas, no muestras independientes. Las métricas personales permanecen locales: los tests solo usan datos sintéticos y las fixtures agregadas de prueba.

## Versionado y PWA

Se incrementan las versiones de los módulos Ridge afectados, el identificador de la aplicación del reporte, el recurso `app.js`, y la caché de service worker. Los asserts de CI deben coincidir con las URLs versionadas reales.
