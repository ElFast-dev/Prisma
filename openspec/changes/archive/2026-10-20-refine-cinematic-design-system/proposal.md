# Propuesta: consolidar el sistema visual cinematográfico

## Estado

Cerrada y archivada el 2026-10-20 tras la fusión y la verificación de la interfaz publicada.

## Motivación

Prisma ya usa una base oscura y componentes reutilizables, pero el azul aparece repetido en botones, navegación, bordes, estados activos, indicadores y degradados de varias hojas. Esa dispersión crea una identidad visual menos coherente y vuelve costoso refinar el aspecto sin introducir contradicciones.

## Alcance

- Definir una capa final de tokens y estados visuales para unificar la interfaz en una paleta oscura con acentos violeta suaves.
- Mantener el fondo casi negro, superficies frías, texto legible y colores semánticos separados para puntuaciones, confirmaciones y errores.
- Coordinar navegación, botones primarios, foco de teclado, chips, medidores, tarjetas de perfil y acciones de ayuda con los mismos tokens.
- Respetar `prefers-reduced-motion` y asegurar que los estados principales sean visibles sin depender de hover.
- Versionar CSS y service worker de forma coherente, y comprobar el diseño con pruebas estáticas y Playwright.

## Fuera de alcance

- No cambiar HTML funcional, flujos de usuario, catálogo, historial, persistencia, importaciones, conexión TMDB ni algoritmo de recomendación.
- No añadir bibliotecas, pasos de compilación, fuentes remotas ni dependencias en tiempo de ejecución.
- No teñir de violeta las puntuaciones de películas, los avisos de error ni los estados positivos que tienen significado semántico propio.
- No hacer de Canva la fuente de ejecución; los estilos publicados seguirán siendo código versionado en el repositorio.

## Criterios de aceptación

1. Una sola hoja final de sistema visual define los tokens de color y normaliza los componentes de mayor visibilidad.
2. El color de acento calculado es violeta suave y el fondo sigue siendo `#080c12`.
3. Foco por teclado, botones primarios, navegación activa, chips seleccionados y pósteres mantienen estados perceptibles con la nueva paleta.
4. La paleta semántica para notas, éxito y error permanece diferenciada.
5. El movimiento reducido desactiva o minimiza las animaciones y transiciones, sin scroll suave forzado.
6. Todas las hojas CSS están versionadas y cacheadas por la PWA con exactamente la misma URL; la versión del shell aumenta.
7. CI valida SDD, estructura y versión de CSS, tokens y estados del sistema visual; Playwright comprueba la paleta publicada y mantiene los flujos de escritorio/móvil.

## Evidencia de cierre

- PR fusionado: [#13 — sistema visual violeta](https://github.com/ElFast-dev/Prisma/pull/13).
- Commit publicado: [5945f818](https://github.com/ElFast-dev/Prisma/commit/5945f818b277197efbd0b28e09a0fd0edc9b57fb).
- Validación de Prisma: [workflow 39516168907](https://github.com/ElFast-dev/Prisma/actions/runs/39516168907), correcto.
- SDD y calidad estática: [workflow 39516168908](https://github.com/ElFast-dev/Prisma/actions/runs/39516168908), correcto.
- GitHub Pages: [workflow 39516168988](https://github.com/ElFast-dev/Prisma/actions/runs/39516168988), despliegue correcto.
- UI publicada en escritorio y móvil: [Playwright 39516242722](https://github.com/ElFast-dev/Prisma/actions/runs/39516242722), correcto.
