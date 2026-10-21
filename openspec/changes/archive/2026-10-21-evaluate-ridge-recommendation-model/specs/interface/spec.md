## ADDED Requirements

### Requirement: Ejecución explícita del experimento Ridge

El Laboratorio DEBE ofrecer un control explícito para iniciar el experimento Ridge, comunicar que el cálculo es local y mostrar el estado de cálculo y los resultados agregados. NO DEBE ejecutar la evaluación costosa en cada renderizado.

#### Scenario: Inicio y finalización

- DADO que la persona abre el Laboratorio
- CUANDO pulsa el control Ridge
- ENTONCES Prisma muestra el estado de cálculo y luego presenta MAE Ridge, MAE aditivo emparejado, diferencia, tamaño de muestra y alphas seleccionados

#### Scenario: Modelo aditivo sigue activo

- DADO que el resultado Ridge es mejor o peor
- CUANDO Prisma genera recomendaciones normales
- ENTONCES continúa usando el modelo aditivo sin cambio automático

#### Scenario: Historial modificado

- DADO que cambia el historial de valoraciones
- CUANDO se vuelve a abrir el Laboratorio
- ENTONCES los resultados Ridge anteriores se invalidan y no se presentan como actuales
