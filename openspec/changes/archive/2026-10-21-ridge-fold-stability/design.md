# Diseño: estabilidad de Ridge por pliegue

## Decisión
Calcular métricas de dirección dentro del recorrido de validación cruzada ya existente, sin repetir entrenamientos. Para MAE, cada pliegue compara el MAE de Ridge con el MAE aditivo usando las mismas filas externas. Para nDCG@5, cada modo compara los DCG normalizados del mismo pliegue con la misma ganancia ideal.

## Contratos
- MAE: `foldStability` informa si está disponible, pliegues evaluados, pliegues donde gana Ridge, empates y pliegues donde gana la base.
- Ranking: cada modo informa `foldsRidgeWins`, `foldsRidgeTies` y `foldsRidgeLosses` junto a los valores nDCG@5 existentes.
- El informe v3 conserva su esquema porque añade campos agregados opcionales retrocompatibles.
- La interfaz explica que los recuentos son descriptivos y no una prueba de significación.

## Privacidad y producción
No se registran deltas por película ni se exportan predicciones individuales. El experimento sigue siendo local, bajo demanda y desconectado del ranker de producción.

## Validación
Pruebas sintéticas verifican que los recuentos cubran todos los pliegues válidos, sean deterministas y se exporten sin identidades personales. CI y capturas de navegador deben pasar antes de archivar esta propuesta.
