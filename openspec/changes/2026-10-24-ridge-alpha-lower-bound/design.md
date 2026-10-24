# Diseño: rejilla experimental Ridge con límite inferior ampliado

## Rejillas

La rejilla histórica permanece como valor predeterminado de la API del evaluador: `[1e-5, 3e-5, 1e-4, 3e-4, 1e-3, 3e-3, 1e-2, 3e-2, 1e-1, 0.3, 1, 3, 10, 100]`. La rejilla extendida añade `1e-7, 3e-7, 1e-6, 3e-6` delante de esos 14 valores (18 en total en esta primera iteración). La batería diagnóstica de un solo paso solicita explícitamente esa variante; las recomendaciones de producción siguen usando `additive-content-baseline`.

Los valores nuevos siguen siendo cinco órdenes de magnitud superiores al umbral Cholesky de `1e-12`. No se altera esa tolerancia ni se añade `alpha=0`; la factorización debe continuar rechazando sistemas numéricamente inestables.

## Aislamiento y coste

El evaluador asíncrono acepta una opción explícita `includeExtendedAlphaGrid: true`. Por defecto, y cuando la opción se omite, se conserva la rejilla histórica. La batería automática del Laboratorio solicita la variante diagnóstica extendida y la escala relativa. La predicción y el ranking de producción no consumen ni activan estos resultados experimentales.

La rejilla efectiva se propaga por toda la ejecución asíncrona: ajuste interior, conteos de selección, resumen de límites, evaluación exterior, cálculo de progreso y serialización del resultado. El informe declara la rejilla realmente utilizada; un fallo/cancelación no debe anunciar una ejecución completa ni cambiar sus métricas de la rejilla predeterminada.

## Validación anidada y límites de fuga

Para cada pliegue exterior se usan los pliegues interiores deterministas ya establecidos. MAE minimiza error absoluto interno. Ranking maximiza nDCG@5 interno para los modos disponibles (relevancia >= 7), respetando mínimos de muestras/pliegues. Ambos criterios comparten la partición interna pero eligen por separado. El conjunto exterior se usa solo para medir MAE/nDCG@5 y comparar contra el modelo aditivo en muestras emparejadas.

Cuando se solicita la variante relativa, la rejilla lambda se deriva de la rejilla alpha extendida usando únicamente la mediana de escalas de entrenamiento interior del pliegue exterior. Cada alpha efectivo de un ajuste interior usa solo la escala de ese entrenamiento interior; el ajuste exterior usa la escala calculada solo con el entrenamiento exterior. No se inspeccionan puntuaciones exteriores para escoger alpha ni lambda.

## Interpretación

Si el límite mínimo extendido sigue seleccionado en la mayoría de pliegues por MAE o ranking, se marca como no resuelto y no se continúa reduciendo alpha sin estudiar estabilidad. Reportar MAE y nDCG@5 por separado, deltas emparejados, conteos por criterio, cobertura y fallos numéricos. Una mejora de MAE no justifica adopción si el ranking frente a `additive-content-baseline` no mejora consistentemente. Las tres repeticiones del historial se describen como particiones correlacionadas, no como historial independiente.

## Privacidad y no-regresión

Solo se añaden estadísticas agregadas al diagnóstico local v14; no se escriben datos personales en el repositorio ni se transmite automáticamente el informe. La recomendación de producción, las exclusiones de colecciones, la identidad por TMDB y el uso exclusivo de metadatos verificables permanecen intactos.
