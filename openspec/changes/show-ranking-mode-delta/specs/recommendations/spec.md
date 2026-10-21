# Diferencia visible de calidad por modo

## ADDED Requirements

### Requirement: Mostrar diferencia absoluta respecto al modo Más afines

El Laboratorio DEBE presentar el nDCG@5 de Equilibrado y Más variedad junto a su diferencia absoluta frente a Más afines cuando ambos resultados estén disponibles. Más afines DEBE identificarse como referencia. La interfaz NO DEBE interpretar esta diferencia como significación estadística o prueba de satisfacción.

#### Scenario: Comparación con referencia disponible

- DADO que nDCG@5 está disponible para Más afines y para el modo mostrado
- CUANDO se presenta la comparación de ranking
- ENTONCES aparecen el nDCG@5 y la diferencia absoluta con respecto a Más afines

#### Scenario: Referencia no disponible

- DADO que la evaluación del modo Más afines no está disponible
- CUANDO se presenta otro modo evaluable
- ENTONCES la interfaz muestra que no existe una referencia comparable en lugar de calcular un delta numérico

#### Scenario: Sin afirmaciones excesivas

- DADO que se muestra la diferencia de nDCG entre modos
- CUANDO la persona lee el Laboratorio
- ENTONCES se explica que la diferencia es descriptiva y no prueba significación estadística ni satisfacción
