# Propuesta: pulir interacciones de la interfaz

## Estado

Aceptado tras revisión técnica el 2026-10-20 y archivado. La microinteracción se verificó en navegador, incluido el retorno del hover, el diseño sin desplazamiento y la preferencia de movimiento reducido.

## Motivación

Prisma ya cuenta con una identidad visual oscura, una paleta azul y animaciones de entrada. En la colección, sin embargo, la fila completa no ofrece una respuesta visual coherente cuando se pasa el puntero por encima del título; además, el hover genérico aplicado a botones puede elevar el botón interior y dar una sensación menos estable a la fila.

El objetivo no es rehacer la interfaz ni añadir más decoración. Es consolidar la sensación minimalista y elegante haciendo que el estado interactivo de las filas de películas sea sutil, uniforme y respetuoso con las preferencias de movimiento.

## Alcance

- Añadir estados hover discretos para ratón en las filas de películas de la colección.
- Evitar que el hover genérico desplace la región principal de la fila verticalmente.
- Conservar un estado de pulsación sencillo para pantallas táctiles.
- Mantener visible el indicador de foco de teclado ya existente.
- Verificar el comportamiento en navegador en escritorio y Android viewport.
- Versionar el CSS y renovar la caché PWA para evitar estilos antiguos.

## Fuera de alcance

- No cambiar la estructura HTML ni los flujos de navegación.
- No modificar el catálogo, la persistencia, el importador, las valoraciones o el recomendador.
- No añadir librerías de animación ni dependencias de producción.
- No introducir animaciones continuas, movimiento parallax ni efectos pesados.
- No modificar el comportamiento de movimiento reducido que ya respeta `prefers-reduced-motion`.

## Criterios de aceptación

1. Al pasar el puntero por una fila de colección en escritorio, aparece un fondo azul muy sutil sin mover verticalmente el botón principal.
2. Al retirar el puntero, la fila recupera su fondo anterior de forma suave.
3. La selección táctil no depende de hover y conserva el comportamiento de click existente.
4. El foco por teclado sigue siendo claramente visible.
5. Con movimiento reducido, las transiciones se eliminan o se reducen según la política CSS existente.
6. La URL versionada del CSS y la caché del service worker se actualizan juntas.
7. Las comprobaciones SDD, JavaScript, catálogo y los flujos UI pasan sin cambios funcionales inesperados.
