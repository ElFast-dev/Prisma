# Delta de especificación: profundizar el límite inferior Ridge

## ADDED Requirements

### Requirement: Rejilla Ridge extendida y estable

La variante extendida DEBE contener 22 valores positivos, finitos, únicos y ordenados, incluyendo los 14 anclajes históricos y cuatro anclajes adicionales inferiores `1e-9`, `3e-9`, `1e-8` y `3e-8`. La API DEBE mantener la rejilla histórica cuando no se solicita explícitamente la variante extendida. La tolerancia Cholesky NO DEBE reducirse para facilitar la selección de valores inferiores.

#### Scenario: Evaluador predeterminado

- **WHEN** se ejecuta Ridge sin solicitar la rejilla extendida
- **THEN** utiliza exactamente la rejilla histórica de 14 valores
- **AND** no informa resultados de anclajes que no se ejecutaron.

#### Scenario: Batería diagnóstica extendida

- **WHEN** el Laboratorio solicita explícitamente la variante Ridge extendida
- **THEN** la evaluación interna usa la rejilla completa de 22 valores
- **AND** el informe declara la rejilla efectivamente utilizada, su mínimo y los conteos de selección.

### Requirement: Selección anidada de alpha y lambda sin fuga exterior

Prisma DEBE seleccionar alpha por MAE y por nDCG@5 solo con particiones interiores generadas a partir del entrenamiento exterior. Las notas del pliegue exterior DEBEN reservarse para evaluar las variantes ya seleccionadas. La comparación de escala relativa DEBE derivarse exclusivamente de escalas de entrenamiento interiores y exteriores correspondientes, nunca de las notas retenidas.

#### Scenario: Parámetros seleccionados solo internamente

- **WHEN** se selecciona alpha o lambda en un pliegue exterior
- **THEN** solo participan las métricas y escalas de sus particiones interiores de entrenamiento
- **AND** el pliegue exterior solo mide el resultado emparejado contra la referencia aditiva.

### Requirement: Límite inferior no resuelto no activa Ridge en producción

Cuando el mínimo de la rejilla extendida se selecciona con frecuencia en la validación interna, el diagnóstico DEBE señalar que el límite no está resuelto. Esa condición NO DEBE activar Ridge, cambiar pesos ni modificar el ranking de producción. Los fallos numéricos se deben excluir de la selección y comunicar como conteos agregados.

#### Scenario: El mínimo se sigue seleccionando

- **WHEN** la selección interna elige el alpha mínimo en la mayoría de los pliegues válidos
- **THEN** el informe marca el límite inferior como no resuelto
- **AND** el modelo aditivo continúa activo hasta que haya evidencia emparejada y repetida de mejora de ranking y aceptación SDD.
