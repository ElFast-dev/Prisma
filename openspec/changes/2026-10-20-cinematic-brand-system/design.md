# Diseño: capa final de identidad visual de Prisma

## Dirección visual

- Fondo: `#080c12`; superficies `#111722` y `#171f2b`.
- Texto principal claro; secundario gris frío de contraste suficiente.
- Acento principal violeta `#a78bfa`, con un violeta más profundo para estados activos.
- Cian `#7dd3fc` solo en pequeños detalles informativos, nunca como segundo acento dominante.
- Oro para puntuaciones y menta para confirmaciones; rojo suave para errores.

## Decisión arquitectónica

La cascada actual tiene varias hojas que nacieron en iteraciones distintas. Para evitar un refactor amplio de componentes en el mismo cambio, se añade una hoja final `styles/brand-system.css`. Centraliza tokens y reemplaza los estados de marca de mayor visibilidad después de que se cargan los módulos de componentes. Los módulos existentes siguen teniendo la responsabilidad de layout, contenido, colección, catálogo, diálogos y responsive.

La prueba de modularidad declara la hoja en el orden esperado y comprueba la versión y su URL exacta en `sw.js`. La prueba de navegador lee los tokens computados, no solo la existencia del archivo, para detectar regresiones de cascada.

## Accesibilidad y movimiento

Se mantiene el foco por teclado visible usando el acento nuevo. Se conservan colores semánticos diferentes para puntuaciones, estados positivos y errores. La regla compartida de movimiento reducido pone las duraciones de transición en cero, limita cada animación a un ciclo y desactiva el desplazamiento suave.

## PWA y recursos

- CSS: `ui-20261020-19` en todas las hojas.
- Manifiesto: `ui-20261020-13`.
- Isotipo: `brand-20261020-1` en el documento, manifiesto y caché.
- Caché de shell: `prisma-shell-v47`.

No cambian la entrada JavaScript ni los formatos del perfil local.
