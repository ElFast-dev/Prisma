## ADDED Requirements

### Requirement: Acción explícita para validación Ridge repetida

El Laboratorio DEBE ofrecer una acción separada para ejecutar la validación cruzada repetida de Ridge, mostrar progreso y presentar métricas agregadas por repetición y globales. La ejecución NO DEBE ocurrir automáticamente al abrir o renderizar el Laboratorio.

#### Scenario: Ejecutar repeticiones bajo demanda

- DADO que el usuario ya puede ejecutar la evaluación Ridge estándar
- CUANDO elige la acción de validación repetida
- ENTONCES Prisma ejecuta el protocolo 3 × 5 de forma local y muestra las métricas al finalizar

#### Scenario: Limitar el alcance de los resultados

- DADO que la evaluación repetida termina
- CUANDO se renderiza el Laboratorio
- ENTONCES mantiene visible la evaluación estándar, separa los resultados repetidos y deja claro que Ridge no altera Descubrir
