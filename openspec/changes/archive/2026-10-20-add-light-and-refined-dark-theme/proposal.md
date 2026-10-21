# Propuesta: tema negro elegante con modo claro opcional

## Estado

Cerrada y archivada el 2026-10-20 después de la fusión del PR #17 y las verificaciones de calidad y despliegue.

## Motivación

La capa visual publicada sigue utilizando acentos violetas y fondos azulados. Prisma necesita una identidad más sobria: oscuro predeterminado con fondo negro real, azul apagado como único color secundario y una alternativa clara que mantenga la misma jerarquía.

## Alcance

- Cambiar la paleta principal del tema oscuro a negro, grises neutros y azul acero discreto.
- Alinear el isotipo, el favicon y el icono de la PWA con la misma paleta azul apagada.
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
7. El isotipo conserva su geometría y usa azul acero apagado, sin violeta ni cian llamativos.
8. Se versionan los recursos estáticos y la PWA renueva su caché; las pruebas de CI cubren ambos temas y preservan los flujos actuales.


## Evidencia de cierre

- Implementación fusionada: [PR #17](https://github.com/ElFast-dev/Prisma/pull/17).
- Commit publicado: [9aa8ade](https://github.com/ElFast-dev/Prisma/commit/9aa8adeb4b7e7d9840b24544eb5a79d1dd5c3556).
- [SDD y calidad estática](https://github.com/ElFast-dev/Prisma/actions/runs/39519374500): correcto.
- [Validate Prisma](https://github.com/ElFast-dev/Prisma/actions/runs/39519374453): correcto.
- [Despliegue de GitHub Pages](https://github.com/ElFast-dev/Prisma/actions/runs/39519374424): correcto.
- [Playwright en la rama antes de fusionar](https://github.com/ElFast-dev/Prisma/actions/runs/39518978427): correcto; revisó modo oscuro y cambio/persistencia del modo claro en escritorio y móvil.
- [Playwright post-despliegue](https://github.com/ElFast-dev/Prisma/actions/runs/39519413042): ejecución iniciada; resultado final pendiente al preparar este expediente.
