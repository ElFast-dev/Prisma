# Propuesta: corregir el falso positivo de objetivos táctiles

## Problema

La comprobación visual posterior al despliegue falló en móvil porque `getBoundingClientRect().height` devolvió `43.9998779296875` para una acción con `min-height: 44px` declarado en CSS. La diferencia es subpíxel y no indica una reducción de diseño, pero el test compara el rectángulo renderizado contra 44 de forma exacta.

## Objetivo

Hacer que la validación de objetivos táctiles sea rigurosa frente a regresiones reales y robusta ante errores mínimos de representación decimal.

## Alcance

- Comprobar el `min-height` CSS efectivo de las acciones de la ficha.
- Tolerar hasta 0,5 píxeles CSS de diferencia en el rectángulo geométrico medido.
- Mantener las demás comprobaciones de jerarquía, tamaño de texto y desbordamiento.

## Fuera de alcance

No se cambia el CSS de la interfaz, los objetivos táctiles establecidos, el recomendador ni los datos personales.
