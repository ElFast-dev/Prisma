# Diseño: sistema visual cinematográfico

## Decisión de arquitectura

Añadir `styles/prisma-design-system.css` como última hoja CSS. Esta capa contiene los tokens finales y las reglas de los componentes que muestran los estados de marca con mayor frecuencia. Las hojas actuales conservan sus responsabilidades de layout y componentes; la capa nueva no replica toda la interfaz ni sustituye los módulos existentes.

## Tokens principales

- Fondo: `#080c12`; superficies: `#0d111b`, `#111722`, `#171f2b`.
- Texto primario: `#f2f4f7`; secundario y tenue con suficiente separación respecto al fondo.
- Acento de marca: `#c4b5fd`; acento fuerte: `#a78bfa`; lavado translúcido violeta.
- Menta, oro y rojo quedan reservados para los estados semánticos existentes.

## Aplicación de tokens

La capa final normaliza el fondo ambiental, selección de texto, marca, hero, botones primarios, foco, navegación activa, tarjetas de perfil, badges, chips, campos enfocados, medidores, iconos de estado y acciones sobre póster. Los efectos quedan sutiles para que las carátulas sigan llevando el peso visual.

No se agrega movimiento nuevo. Los cambios de color y bordes reutilizan las transiciones existentes; una regla final para `prefers-reduced-motion: reduce` fuerza duraciones mínimas, evita animaciones continuas y desactiva el scroll suave.

## Versionado y PWA

- Incrementar los enlaces CSS de `ui-20261020-18` a `ui-20261020-19`.
- Añadir la nueva hoja al final de `index.html` y a `APP_ASSETS` en `sw.js` con la URL versionada exacta.
- Incrementar `prisma-shell-v46` a `prisma-shell-v47`.
- Mantener la versión de la entrada JS si no cambia su código.

## Verificación

Las pruebas estáticas validan tokens, orden CSS, URLs exactas y movimiento reducido. Playwright verifica `--bg` y `--accent`, además de navegación, pósteres, colección y diálogos en escritorio y móvil. La prueba de producción posterior a la fusión confirmó los estilos publicados y los flujos existentes.
