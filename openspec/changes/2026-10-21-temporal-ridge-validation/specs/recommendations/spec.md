## ADDED Requirements

### Requirement: Evaluación temporal de recomendaciones sin fuga de futuro

Prisma DEBE ofrecer un experimento temporal, local y bajo demanda que entrene con valoraciones de visionado anteriores a cada ventana exterior y pruebe con valoraciones posteriores. La fecha DEBE provenir de `watchedAt` válido en la valoración o su registro de visionado relacionado. Prisma NO DEBE usar `updatedAt`, `addedAt` ni la fecha de estreno como sustituto. La selección de alpha DEBE usar solamente ventanas de validación temporal internas anteriores a la ventana exterior de prueba.

#### Scenario: Entrenar y probar en orden cronológico

- DADO que hay suficientes valoraciones únicas con características y fechas de visionado válidas
- CUANDO se ejecuta el experimento temporal
- ENTONCES cada ventana se predice con un perfil construido solo con registros de días anteriores y las notas de su prueba no participan en el entrenamiento ni en la selección de alpha

#### Scenario: Fecha de visionado ausente o inválida

- DADO que una valoración no tiene una fecha `watchedAt` válida ni un registro de visionado relacionado
- CUANDO se prepara la muestra temporal
- ENTONCES esa valoración no se usa para entrenar ni probar, y solo se informa su recuento agregado

#### Scenario: Datos temporales insuficientes

- DADO que hay menos de 100 valoraciones únicas fechadas con características o menos de 12 días válidos distintos
- CUANDO se solicita la evaluación temporal
- ENTONCES Prisma informa que no está disponible y no presenta métricas inventadas

#### Scenario: Separar experimento y recomendaciones de producción

- DADO que termina la evaluación temporal
- CUANDO se vuelve a Descubrir o se exporta el diagnóstico
- ENTONCES el ranking activo continúa aditivo y el informe comparte únicamente métricas agregadas sin fechas, películas ni predicciones individuales
