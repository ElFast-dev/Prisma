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

Añadir pruebas estáticas para tokens, prioridad del orden CSS, URLs exactas y movimiento reducido. Actualizar el flujo Playwright para comprobar tanto `--bg` como `--accent`; los flujos ya existentes siguen ejercitando navegación, pósteres, colección, diálogos y viewport móvil. La revisión visual final depende de que pase el workflow de UI sobre la compilación previa a la fusión y sobre la web publicada después de desplegar.

## Evidencia de verificación final

- PR #13 integrado: https://github.com/ElFast-dev/Prisma/pull/13
- SDD y calidad en el PR: https://github.com/ElFast-dev/Prisma/actions/runs/39516013820
- Validación de Prisma en el PR: https://github.com/ElFast-dev/Prisma/actions/runs/39516013790
- Playwright en escritorio y móvil sobre el PR: https://github.com/ElFast-dev/Prisma/actions/runs/39516013796
- SDD y calidad tras la fusión: https://github.com/ElFast-dev/Prisma/actions/runs/39516168908
- Validación de Prisma tras la fusión: https://github.com/ElFast-dev/Prisma/actions/runs/39516168907
- GitHub Pages desplegado: https://github.com/ElFast-dev/Prisma/actions/runs/39516168988
- UI publicada comprobada en escritorio y móvil: https://github.com/ElFast-dev/Prisma/actions/runs/39516242722
- Capturas de la UI publicada: https://github.com/ElFast-dev/Prisma/actions/runs/39516242722/artifacts/12307952757
