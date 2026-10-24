# Diseño: regularización relativa a la escala del kernel

## Diagnóstico matemático

Las características Ridge se vectorizan con escalas por familia: género = 1, tema = 0,35 y década = 0,2. Para vectores (x_i), el kernel crudo es (K_{ij}=x_i^T x_j). En un conjunto de entrenamiento de tamaño (n), se centra como:

`Kc[i,j] = K[i,j] - rowMean[i] - rowMean[j] + grandMean`.

La implementación añade alpha a la diagonal de esa matriz centrada: `Kc + alpha I`. Por tanto, alpha se expresa en las unidades del kernel y no es comparable entre escalas de kernel distintas sin normalizar.

La escala diagnóstica principal será `s = trace(Kc) / n = mean(diag(Kc))`. La diagonal centrada representa la distancia cuadrática en el espacio de características respecto al centro del conjunto de entrenamiento. Se registrarán además mínimo, mediana, máximo y número de observaciones de entrenamiento. El cociente de regularización absoluto será `alpha / s`. Si `s` no es finito o no supera el umbral numérico definido por las pruebas, la escala relativa se declarará no disponible; no se fabricará un divisor ni se sustituirá por cero.

La factorización Cholesky actual rechaza pivotes no finitos o menores/iguales a `1e-12`. Este cambio medirá los fallos y comprobará el efecto de la rejilla inferior antes de proponer modificar esa tolerancia.

## Parametrización relativa experimental

Para cada pliegue exterior, primero se calcula la escala de referencia (s_{outer}) usando solo sus índices de entrenamiento. Se mapea la rejilla absoluta existente en una rejilla relativa adimensional `lambda_j = alpha_j / s_outer`. Así se deriva la rejilla de la escala realmente observada y se conserva el intervalo de alpha efectivo existente en el ajuste exterior, en lugar de introducir lambdas elegidos arbitrariamente.

Dentro de cada pliegue interior, la escala (s_{inner}) se vuelve a calcular únicamente con el kernel de ese conjunto interior de entrenamiento y el ajuste relativo usa `alpha_effective = lambda * s_inner`. La validación interior se usa para seleccionar lambda mediante MAE o ranking, no para estimar (s_{inner}). Después, el modelo exterior usa `alpha_effective = selectedLambda * s_outer`. El pliegue exterior retenido nunca interviene en ninguna de estas operaciones.

Este diseño permite comprobar si adaptar alpha a la escala de cada entrenamiento cambia la selección y el resultado exterior. No garantiza que mejore ranking. La comparación se empareja con el alpha absoluto en los mismos pliegues y con el mismo baseline aditivo.

## Protocolo de evaluación

- Conservar tres repeticiones, cinco pliegues exteriores y tres pliegues interiores, los salts deterministas existentes y las mismas identidades canónicas.
- Para cada pliegue exterior seleccionar por separado alpha absoluto por MAE, alpha absoluto por ranking, lambda relativo por MAE y lambda relativo por ranking.
- Ranking interior y exterior: nDCG@5 para `balanced`, `affinity` y `variety`, relevancia >= 7 y los mínimos de disponibilidad existentes.
- Comparar las cuatro variantes con el baseline en el mismo conjunto exterior; informar MAE además de nDCG@5, deltas, victorias/empates/derrotas, folds realmente evaluados y motivos no disponibles.
- Informar por repetición y agregado sin presentar los 15 pliegues como 15 historiales independientes.
- Registrar selección de límite inferior para alpha y para lambda, así como errores de Cholesky, escalas degeneradas, predicciones no finitas y cancelaciones.
- Medir el coste adicional de la doble búsqueda y preservar la cesión al navegador y el progreso.

## Contrato y privacidad

Los campos nuevos se agregan al informe diagnóstico v14 y a sus pruebas de contrato, manteniendo exclusivamente estadísticas numéricas agregadas y metadatos de pliegue. No se guardan ni exportan valores de películas o características individuales. Los informes con perfil personal solo se generan localmente con los datos enriquecidos disponibles en el navegador; CI usa fixtures sintéticas.

## Decisión

La variante relativa sigue siendo un experimento. Solo podrá recomendarse un cambio posterior si las métricas exteriores emparejadas muestran mejora consistente del ranking sin regresiones obligatorias de calidad, estabilidad, privacidad o rendimiento. Nunca se activa Ridge en producción como resultado automático de este estudio.
