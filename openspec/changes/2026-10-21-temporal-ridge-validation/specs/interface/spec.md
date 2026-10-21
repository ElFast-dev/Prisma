## ADDED Requirements

### Requirement: Control explícito de validación temporal

El Laboratorio DEBE ofrecer un control separado para ejecutar la validación temporal de Ridge sin iniciarla automáticamente. DEBE comunicar su progreso, el recuento de valoraciones fechadas y sin fecha válida, el número de ventanas y las métricas agregadas disponibles. No DEBE mostrar fechas exactas ni registros individuales.

#### Scenario: Ejecutar evaluación temporal desde el Laboratorio

- DADO que la persona está en el Laboratorio
- CUANDO solicita la evaluación temporal
- ENTONCES Prisma muestra el progreso de cinco ventanas, los resultados agrupados y una advertencia de que solo describe el historial disponible

#### Scenario: Historial insuficiente o sin fechas fiables

- DADO que los datos no tienen suficientes valoraciones con `watchedAt` válido
- CUANDO se ejecuta la evaluación
- ENTONCES la interfaz explica los mínimos y los recuentos disponibles, sin métricas parciales no válidas

#### Scenario: Cambia el historial durante el cálculo

- DADO que se está ejecutando la evaluación temporal
- CUANDO cambian las valoraciones o el historial de visionados
- ENTONCES se cancela el cálculo y no se muestra ni exporta un resultado obsoleto
