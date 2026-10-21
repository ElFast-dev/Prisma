# Verificación de los objetivos táctiles

## ADDED Requirements

### Requirement: Verificación de acciones con tolerancia subpíxel

La comprobación automatizada de la ficha de película DEBE exigir que el `min-height` CSS calculado de sus acciones sea al menos 44 píxeles CSS y DEBE tolerar una diferencia geométrica inferior a 0,5 píxeles al medir el rectángulo renderizado.

#### Scenario: Altura CSS correcta con medida fraccional

- DADO que una acción declara y calcula `min-height: 44px`
- Y el navegador informa una altura renderizada de 43,9999 píxeles CSS
- CUANDO la prueba visual evalúa el tamaño de la acción
- ENTONCES la comprobación pasa porque el mínimo CSS permanece en 44 píxeles y la diferencia geométrica es inferior a 0,5 píxeles

#### Scenario: Regresión real de altura declarada

- DADO que el mínimo CSS calculado de una acción es inferior a 44 píxeles CSS
- CUANDO la prueba visual evalúa la acción
- ENTONCES la comprobación falla aunque el rectángulo renderizado mida 43,5 píxeles o más
