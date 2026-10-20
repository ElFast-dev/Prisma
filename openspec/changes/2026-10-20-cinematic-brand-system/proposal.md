# Propuesta: unificar la identidad visual cinematográfica

## Estado

Implementación preparada; validación automatizada y verificación en la web publicada pendientes.

## Motivación

Prisma ya tiene una estructura modular, pero la identidad azul está repartida entre hojas de estilo y varios componentes usan colores literales. Eso dificulta dar un acabado consistente y sostenerlo con cambios futuros. La dirección visual creada en Canva propone una estética más editorial: fondo casi negro, superficies sobrias, violeta suave como acento y cian limitado a detalles secundarios.

## Objetivos

- Centralizar los tokens de marca y los refinamientos globales en un módulo CSS claramente identificado.
- Hacer coherentes los estados de foco, selección, botones, chips y navegación.
- Mantener el contraste, los estados semánticos y la legibilidad de los componentes existentes.
- Reducir de forma global las animaciones y transiciones cuando se solicita movimiento reducido.
- Actualizar el isotipo con los mismos colores y versionar los recursos de PWA.

## Alcance

- Añadir `styles/brand-system.css` como última hoja, con tokens y reglas de marca de baja intensidad.
- Actualizar el isotipo SVG a violeta/cian manteniendo su geometría actual.
- Actualizar URLs versionadas de CSS y manifiesto, caché del service worker y validadores.
- Añadir aserciones estáticas y Playwright para verificar que la capa de marca realmente se carga.

## Fuera de alcance

- No cambiar el modelo de datos, el catálogo, las valoraciones, TMDB ni el recomendador.
- No rehacer la navegación ni los componentes funcionales de las páginas.
- No añadir dependencias ni introducir una etapa de compilación.
- No añadir animaciones continuas, parallax ni efectos que compitan con los pósteres.

## Criterios de aceptación

1. El acento global es violeta `#a78bfa` y las superficies mantienen la base oscura `#080c12`.
2. Navegación, botones, filtros, campos, enlaces y focos comparten los estados de marca.
3. Las valoraciones, los estados positivos y los errores siguen siendo distinguibles.
4. Con `prefers-reduced-motion: reduce`, las transiciones duran cero y las animaciones no se repiten.
5. HTML, manifiesto y service worker apuntan a las URLs exactas de CSS e isotipo.
6. Los checks SDD/estáticos y Playwright de escritorio/móvil pasan.
