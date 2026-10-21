# Propuesta: pulir la experiencia de la ficha de película

## Problema

La ficha ya ofrece mucha información y permite recorrer sinopsis extensas, pero la jerarquía visual actual es densa: los metadatos se presentan como texto pequeño sin separación de superficies, la sinopsis usa tipografía reducida y las acciones de la ficha no mantienen una altura táctil uniforme. El degradado del encabezado también termina en un color azul oscuro fijo, incluso al usar el tema claro.

## Objetivo

Mejorar la legibilidad, jerarquía, consistencia entre temas y comodidad táctil de la ficha, manteniendo la dirección minimalista oscura de Prisma y su diseño adaptable a móvil.

## Alcance

- Presentar los metadatos principales en bloques visuales diferenciados, con cuadrícula adaptable.
- Mejorar la jerarquía tipográfica del título, los encabezados de sección y la sinopsis.
- Unificar los tamaños táctiles de las acciones principales y evitar desbordamientos en pantallas estrechas.
- Usar los tokens de tema para fondos y superficies, sin introducir una paleta nueva.
- Mantener las puntuaciones externas compactas, el scroll interno de la ficha y las funciones actuales.

## Fuera de alcance

- Cambios en el modelo de datos, la colección, las valoraciones o las recomendaciones.
- Nuevos endpoints, peticiones TMDB o datos externos.
- Cambios en el formato de fechas, identidad o deduplicación de películas.
- Rediseño de las fichas de personas u otras páginas fuera de los estilos compartidos de ficha.

## Criterios de aceptación

1. La ficha muestra cuatro bloques de metadatos en escritorio y dos columnas en móvil.
2. La sinopsis usa tipografía y espaciado legibles y continúa pudiéndose recorrer por completo.
3. Los botones principales de acciones tienen al menos 44 px CSS de altura en vista móvil.
4. El encabezado usa el token de superficie del tema, y los controles conservan contraste y foco visible.
5. Las tarjetas de puntuación siguen siendo compactas.
6. Las pruebas de calidad, SDD, caché y Playwright de escritorio/móvil pasan.
