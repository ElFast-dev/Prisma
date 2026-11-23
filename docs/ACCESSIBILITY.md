# Accesibilidad y navegación por teclado

Prisma debe poder recorrerse sin depender del ratón y respetar las preferencias del sistema.

## Comportamiento implementado

- El primer enlace de la aplicación permite saltar la navegación repetida y enfocar el contenido principal.
- Los controles nativos y los elementos con tabindex conservan un indicador de foco visible.
- Los diálogos usan gestión de foco, contención de Tab, Escape cuando corresponde y restauración del foco al cerrarse.
- Las animaciones, transiciones y desplazamiento suave se reducen cuando el dispositivo solicita movimiento reducido.
- La navegación principal expone un landmark con nombre y marca la sección actual mediante aria-current.

## Comprobación automatizada

e2e/accessibility.e2e.ts verifica el salto al contenido principal, el foco visible, el landmark principal y el respeto a prefers-reduced-motion. Estas pruebas complementan las pruebas E2E responsivas; no constituyen por sí solas una certificación WCAG ni sustituyen pruebas con lectores de pantalla.

## Comprobación manual pendiente en dispositivo

En Android, recorrer la navegación, formularios, diálogos y mapa de Espectro con TalkBack; verificar orden y retorno del foco, anuncios de estados/progreso, zoom del navegador, orientación vertical/horizontal y objetivos táctiles. Registrar el dispositivo, versión de Android/navegador y cualquier incidencia antes de dar por cerrada la revisión física.
