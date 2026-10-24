## ADDED Requirements

### Requirement: Rejilla ampliada y selección Ridge independiente
El evaluador diagnóstico DEBE usar la rejilla positiva declarada de alpha, incluyendo candidatos inferiores a 0,001. DEBE seleccionar por separado el alpha que minimiza MAE y el que maximiza la media de nDCG@5 en modos disponibles con relevancia >=7. Ambos criterios DEBEN usar exactamente los mismos pliegues internos del entrenamiento exterior y un desempate determinista que favorezca alpha mayor a una tolerancia de 1e-10. Una selección por ranking insuficiente DEBE marcarse como no disponible, sin impedir la selección por MAE.

#### Scenario: Valores pequeños numéricamente válidos
- DADO que el kernel centrado puede ser semidefinido y Cholesky exige un pivote mayor que 1e-12
- CUANDO se evalúan alpha=0,00001 y alpha=0,00003
- ENTONCES el ajuste valida resultados finitos y no relaja la tolerancia numérica ni introduce alpha=0.

#### Scenario: Criterios independientes
- DADO un conjunto sintético en el que el mínimo MAE y el máximo nDCG@5 favorecen alphas diferentes
- CUANDO se ejecuta la selección anidada
- ENTONCES cada criterio elige su propio alpha de forma determinista y con los mismos índices internos.

### Requirement: Comparación exterior sin fuga
La evaluación DEBE seleccionar alpha solo con pliegues internos dentro del entrenamiento exterior. Las notas del pliegue exterior SOLO PUEDEN usarse para calcular métricas de ese pliegue. Las comparaciones entre selección por MAE, selección por ranking y referencia aditiva DEBEN compartir identidades y particiones exteriores emparejadas.

#### Scenario: Cambiar notas exteriores
- DADO un entrenamiento exterior fijo y un pliegue exterior retenido
- CUANDO se modifican las etiquetas del conjunto exterior retenido sin cambiar índices/identidades
- ENTONCES la selección de alpha para ese pliegue exterior permanece idéntica.

#### Scenario: Particiones emparejadas
- DADO el comparador MAE, el comparador de ranking y la referencia
- CUANDO se genera una repetición
- ENTONCES las tres opciones se evalúan con los mismos índices de prueba y entrenamiento por pliegue.

### Requirement: Informe y límite inferior
El resultado DEBE registrar alpha seleccionado por criterio, MAE exterior, nDCG@5 y deltas por modo, repetición y pliegue, además de victorias/empates/derrotas y conteos de alpha que cubran todos los pliegues efectivamente completados. DEBE señalar si el menor alpha está seleccionado en la mayoría de pliegues. Las repeticiones DEBEN describirse como correlacionadas y no como pruebas estadísticas concluyentes.

#### Scenario: Límite inferior persistente
- DADO que el alpha mínimo se selecciona en la mayoría de los pliegues externos completados
- CUANDO se genera el informe
- ENTONCES se muestra una advertencia de que el límite inferior de la rejilla sigue sin resolverse; esto no activa ni sustituye el modelo de producción.

### Requirement: Ejecución asíncrona y aislamiento de producción
El experimento DEBE conservar progreso monotónico, cancelación cooperativa, división modular de ES modules y pruebas de capacidad de respuesta. La rejilla y los parámetros del experimento NO DEBEN modificar pesos, parámetros ni ranking del recomendador activo.

#### Scenario: Cancelación y producción inalterada
- DADO que la evaluación asíncrona explora la rejilla ampliada
- CUANDO se cancela el trabajo o se completa el análisis
- ENTONCES la evaluación debe detenerse cooperativamente, informar progreso monotónico y dejar intactos el modelo aditivo, sus pesos y el ranking de producción.
