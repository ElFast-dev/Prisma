# Diseño: verificación subpíxel de objetivos táctiles

## Decisión

Playwright comprobará dos condiciones independientes para las acciones de la ficha:

1. El menor `min-height` declarado y calculado por CSS debe seguir siendo de al menos 44 píxeles CSS.
2. El rectángulo renderizado debe medir al menos 43,5 píxeles CSS para absorber únicamente una diferencia geométrica inferior a medio píxel.

## Motivo

`getBoundingClientRect()` refleja la geometría renderizada, que puede contener decimales por composición y transformaciones. Comparar ese valor estrictamente con 44 convierte una diferencia de aproximadamente 0,00012 píxeles en un falso fallo. Verificar también el mínimo CSS mantiene la intención del diseño y evita ocultar regresiones de una altura declarada inferior.

## Compatibilidad

El cambio solo modifica la aserción de la prueba automatizada. No altera el CSS de producción ni modifica comportamiento, persistencia, caché de runtime o recomendación.
