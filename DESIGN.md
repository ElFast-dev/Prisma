# Prisma — guía UI/UX

## Objetivo

Prisma no debe parecer otro clon de una plataforma de streaming. Es una herramienta personal de descubrimiento y de investigación del gusto cinematográfico. El diseño debe priorizar tres tareas: encontrar una película, entender por qué el motor la recomienda y registrar una experiencia sin interrumpir el reto diario.

## Decisiones visuales de esta iteración

- **Oscuro cinematográfico, no negro puro:** superficies carbón ligeramente azuladas para separar niveles sin llenar todo de tarjetas.
- **Acento lavanda + menta:** lavanda para navegación y acciones; menta solo para estados positivos o conexión. Dorado suave para puntuaciones, no como acento general.
- **Tipografía editorial:** serif para titulares narrativos y sans-serif para controles, metadatos y lectura funcional.
- **Imágenes con protagonismo:** el cartel es la mayor señal visual de cada película; reducir el número de chips/bordes que compiten con él.
- **Jerarquía y espacio:** portada clara, catálogo visible y controles secundarios agrupados en Datos o en la ficha. Mantener métricas útiles sin convertir cada dato en un bloque llamativo.
- **Diseño móvil primero:** objetivos táctiles cómodos, navegación fija compacta, rejilla de dos columnas en teléfonos y más columnas en pantallas grandes.
- **Interacciones con propósito:** entrada suave de la vista, aparición escalonada de tarjetas, elevación sutil de carteles en escritorio, transiciones de filtros y ficha modal. No usar animación decorativa continua.
- **Accesibilidad del movimiento:** respetar `prefers-reduced-motion: reduce`; el contenido y las acciones no dependen de las animaciones.
- **Foco y contraste:** foco visible en controles y texto secundario legible sobre fondos oscuros. Objetivo para texto normal: relación de contraste WCAG AA de al menos 4.5:1.
- **Rendimiento:** animar principalmente `transform` y `opacity`, cargar carteles de forma diferida y no añadir librerías grandes para microinteracciones.

## Reglas de movimiento

- Controles y chips: aproximadamente 180–220 ms.
- Carteles al entrar o reaccionar: 300–450 ms, con desplazamiento muy pequeño.
- Fichas modales: alrededor de 300–350 ms, con una entrada vertical breve y fondo atenuado.
- Sin escalados grandes, parpadeos, loops ambientales ni animaciones obligatorias.
- Con `prefers-reduced-motion`, suprimir las animaciones no esenciales.

## Decisiones UX

1. Mostrar primero las tareas frecuentes; reservar la importación, credenciales y mantenimiento para Datos.
2. Explicar las recomendaciones con lenguaje normal y diferenciar una predicción experimental de la nota real del usuario.
3. No obligar a añadir emociones después de ver una película. Debe ser opcional y rápido.
4. Mostrar estado de carga, vacío y error en búsqueda; no ocultar fallos de TMDB.
5. Conservar acciones importantes accesibles en móvil y teclado.
6. Nunca usar estadísticas o gráficas como decoración: deben responder a una pregunta concreta del usuario.

## Investigación y referencias

- Apple Human Interface Guidelines, Motion: movimiento con propósito, opcional y no excesivo. https://developer.apple.com/design/human-interface-guidelines/motion
- Material Design, Duration & easing: transiciones breves, consistentes y ajustadas a la distancia/función. https://m1.material.io/motion/duration-easing.html
- Nielsen Norman Group, Aesthetic and Minimalist Design: cada elemento debe aportar valor y no competir con la información importante. https://www.nngroup.com/articles/aesthetic-minimalist-design/
- Nielsen Norman Group, Progressive Disclosure: mostrar primero las opciones necesarias y revelar las avanzadas cuando se soliciten. https://www.nngroup.com/articles/progressive-disclosure/
- W3C, WCAG 2.2 contrast minimum: 4.5:1 para texto normal y 3:1 para texto grande. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- MDN, prefers-reduced-motion: respetar las preferencias del sistema para reducir movimiento. https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion

## Alcance de esta entrega

Se ha actualizado el sistema visual de CSS sin cambiar el motor de recomendaciones, las valoraciones ni el formato de los respaldos. Falta hacer pruebas visuales en el Android real, incluyendo búsqueda TMDB, modal de calificación, catálogo grande y ajuste de texto en pantallas estrechas.
