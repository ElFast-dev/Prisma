# Diseño: módulo numérico puro para Ridge

## Responsabilidad

`ridge-kernel.js` contiene `clampRating`, `featureScale`, `vectorize`, `dot`, `buildKernel`, `solveCholesky`, `trainRidge` y `predictRidge`. No recibe acceso al DOM, almacenamiento, red, perfil real ni catálogo; opera solo con vectores y filas proporcionadas.

`ridge-evaluation.js` conserva la identidad de cada fila, la selección determinista de pliegues, la búsqueda anidada de `alpha`, las métricas MAE/nDCG, la validación repetida y las ventanas temporales. El cambio es mecánico: las implementaciones y los pesos se mueven sin alterar fórmulas.

## Prueba de referencia

Dos filas sintéticas ortogonales, Drama (8) y Comedia (4), entrenadas con `alpha=1`, deben generar kernel diagonal `[[1,0],[0,1]]`, coeficientes `[1,-1]` y predicciones 7 y 5. Las tolerancias absorben únicamente ruido numérico de punto flotante.

## Caché

- `js/recommendations/ridge-evaluation.js?v=rec-20261023-1`
- `js/recommendations/ridge-kernel.js?v=rec-20261023-1`
- `app.js?v=ui-20261023-98`
- shell `prisma-shell-v109`

Las URLs del import, precaché y pruebas deben coincidir exactamente.
