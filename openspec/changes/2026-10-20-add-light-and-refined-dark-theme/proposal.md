# Propuesta: tema negro elegante con modo claro opcional

## Estado

En curso. Esta propuesta define el comportamiento y la paleta antes de tocar los estilos o la interfaz.

## Motivación

La capa visual publicada sigue utilizando acentos violetas y fondos azulados. Prisma necesita una identidad más sobria: oscuro predeterminado con fondo negro real, azul apagado como único color secundario y una alternativa clara que mantenga la misma jerarquía.

## Alcance

- Cambiar la paleta principal del tema oscuro a negro, grises neutros y azul acero discreto.
- Añadir un modo claro neutro con superficies blancas/grises y el mismo azul secundario.
- Mantener modo oscuro como valor predeterminado para instalaciones sin preferencia guardada.
- Permitir elegir el tema desde Ajustes y guardar la preferencia localmente.
- Respetar la elección en recargas sin sincronizar preferencias ni datos personales con servidores.
- Extender pruebas estáticas, pruebas de modularidad, invalidación de caché y Playwright para ambos temas en escritorio y móvil.

## Fuera de alcance

- No cambiar el catálogo, el historial, las valoraciones, TMDB ni el algoritmo de recomendaciones.
- No añadir librerías, fuentes remotas, frameworks ni pasos de compilación.
- No usar degradados llamativos, luces violetas, azul eléctrico o animaciones decorativas.
- No inferir el modo predeterminado a partir del sistema operativo: el modo oscuro debe ser el predeterminado de Prisma.

## Criterios de aceptación

1. En una instalación nueva, `data-theme` empieza en `dark` y el fondo principal es negro `#050505`.
2. El tema oscuro usa azul acero apagado como único color secundario de marca; las puntuaciones, estados positivos y errores conservan su significado semántico.
3. El tema claro tiene fondo gris casi blanco, superficies blancas, texto oscuro y acentos azules discretos.
4. Ajustes permite elegir Oscuro o Claro, comunica la selección con semántica accesible y aplica el cambio sin recargar.
5. La preferencia se persiste solo en el navegador y se restaura al volver a abrir Prisma; el modo oscuro se usa cuando no hay valor válido.
6. La preferencia afecta a vistas, tarjetas, navegación, campos, paneles, modales y barra superior, con contraste legible en ambos modos.
7. Se versionan los recursos estáticos y la PWA renueva su caché; las pruebas de CI cubren ambos temas y preservan los flujos actuales.
