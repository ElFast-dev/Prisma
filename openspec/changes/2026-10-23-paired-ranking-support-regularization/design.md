# Diseño: evaluación emparejada y regularización sensible al soporte

## Arquitectura y aislamiento

Las evaluaciones nuevas viven en módulos diagnósticos bajo `js/recommendations/`; no se importan desde el camino de recomendación activa. El experimento recibirá factorías y funciones puras como dependencias, reutilizará el motor solo para construir perfiles de entrenamiento y copiará los perfiles antes de aplicar contracción experimental. No se escribirá sobre perfiles/cachés compartidos ni se persistirán datos derivados del historial.

## Protocolo exterior compartido

- Deduplicar por identidad canónica: `tmdb:<id>`; si no existe ID TMDB, usar título normalizado + año.
- Construir 3 conjuntos deterministas de cinco pliegues, con saltos (salts) distintos entre repeticiones. Dentro de cada repetición, todos los comparadores usarán exactamente los mismos índices de entrenamiento y prueba.
- Para cada pliegue, calcular los resultados de las cuatro familias y de cada lambda sobre las mismas películas retenidas.
- Mantener ganancias nDCG explícitas: threshold 7 usa gain `rating - 6`; threshold 9 usa gain `rating - 8`. Si no existe DCG ideal positivo o no alcanza el mínimo de muestra/relevancia, marcar como no disponible en lugar de rellenar con cero.
- Registrar detalles por pliegue solo durante el cálculo. La salida compartible contiene identificadores opacos de repetición/pliegue, métricas, soporte/cobertura agregados y contadores de estabilidad, nunca identidades de películas.

## Contracción por soporte

Para cada perfil formado solo con entrenamiento, la variante diagnóstica multiplica una copia del peso aprendido por `n_f / (n_f + lambda)`, donde `n_f` es el soporte de entrenamiento de esa característica. Rejilla inicial: `[0, 0.5, 1, 2, 4, 8]`; cero es el control. No se eliminan características de soporte uno. Se evalúan lambdas fijos en los pliegues exteriores. Además, para aislar si cambia la influencia por familia de señales, se ejecuta una comparación emparejada con `lambda=2` que atenúa por separado géneros, temas, sinopsis, reparto, dirección, guion y música, dejando las demás características sin modificar. Estos resultados se comparan contra el control sin contracción sobre las mismas particiones; son análisis de sensibilidad por tipo y no ajustes de producción.

La selección anidada se aplica al lambda global de la rejilla: en cada pliegue exterior, el valor elegido maximiza la media de nDCG@5 en validación interna entre los modos disponibles con relevancia >=7, solo si se cumplen los mínimos de muestra. Si la cobertura/relevancia no basta, la selección se marca como no disponible; no se sustituye con la nota exterior. El MAE exterior se conserva como métrica complementaria. En paralelo, el experimento por familia de señales utiliza un lambda fijo de sensibilidad (2) seleccionado a priori, compara una sola familia atenuada cada vez frente al control sin contracción con las mismas particiones y no pretende elegir un lambda óptimo por cada familia. Los resultados exteriores del lambda global seleccionado se interpretan como una evaluación anidada.

## Revisión de Ridge alpha

Extender la rejilla a `[0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1, 3, 10, 100]`. En cada pliegue exterior, evaluar cada alpha en los mismos pliegues internos de entrenamiento con dos criterios separados: menor MAE y mayor media de nDCG@5 entre modos disponibles con relevancia >=7. En empate, preferir el alpha mayor (regularización más fuerte) de forma determinista. Aplicar los dos alphas seleccionados a sus respectivos modelos exteriores; reportar MAE y ranking exteriores de ambas estrategias, con conteos por alpha. Las notas del pliegue exterior no podrán intervenir en esta selección.

## Contadores del pool y diversidad

Añadir agregados distinguibles:
- `remoteCandidatesReceived`: candidatas procedentes del pool temporal TMDB.
- `localCandidatesEligible`: entradas locales elegibles tras identidad, deduplicación y exclusión de toda la colección / historial.
- `rankedResultsAvailable`: número de resultados disponibles al ranking antes del corte solicitado.
- `requestedResultLimit`, `returnedResultCount` y `shortfallReason`: explicar diferencias entre límite pedido y salida real.
Para diversidad, los tests separarán tamaño del pool, disponibilidad tras filtros y límite pedido. El algoritmo de variedad actual puede devolver menos que el límite si se le entregan menos candidatos; el informe debe mostrarlo y no inferir defecto sin un caso reproducible con pool suficiente.

## Privacidad

Subir el esquema del informe agregado a v13. `privacy.featureLabelsIncluded` será false por defecto; el resumen conserva conteos por tipo de señal y estadísticas agregadas. Solo un parámetro explícito opt-in podrá incluir nombres de características, preservando el flujo de revisión antes de compartir. Los logs de rendimiento continuarán sin títulos, ids, notas ni características concretas.

## Asincronía y seguridad de cancelación

El runner dividirá el trabajo en lotes, comprobará `shouldContinue()` antes y después de ceder ejecución al navegador, y publicará progreso monotónico en unidades de trabajo estables. La invalidación del diagnóstico devuelve `null` para evitar publicar resultados obsoletos. La evaluación debe registrar duración medida en el informe y no impedir el primer render del Laboratorio.

## Aceptación y criterio de decisión

No se declarará ganador por MAE global solamente, por una diferencia puntual de nDCG ni por usar los 15 pliegues como muestras independientes. Se describen medias por repetición, deltas emparejados exteriores, consistencia de signo, victorias/empates/derrotas y cobertura; sin afirmar significación estadística a partir del historial personal. Toda nueva variante permanece inactiva en producción.