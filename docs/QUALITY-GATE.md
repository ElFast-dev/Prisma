# Política de calidad y ritmo de desarrollo de Prisma

## Principio

Las pruebas protegen el producto; no sustituyen el desarrollo ni deben convertir cada mejora en una espera innecesaria. Prisma continúa evolucionando en ramas de trabajo mientras CI valida los cambios. Solo se integran en `main` cambios que superan los controles obligatorios.

## Controles obligatorios por Pull Request

Se conservan los dos controles de protección ya configurados por el propietario:

1. **TypeScript · Unit tests · Build**: instalación reproducible (`npm ci`), TypeScript, pruebas unitarias, auditoría con umbral alto/crítico, compilación y smoke test local del build.
2. **Browser E2E · Playwright**: recorridos funcionales en Chromium, Firefox y WebKit.

Estos checks conservan sus nombres para no romper la protección existente de `main`.

## Comprobaciones informativas

**PWA · Production offline test** se ejecuta también en Pull Requests, pero es informativa y no debe añadirse como requisito obligatorio de protección de `main`. Informa de problemas en Service Worker, manifiesto, recarga sin conexión y persistencia local. Una alerta se investiga y se corrige, sin convertirla en un tercer bloqueo de integración.

Las futuras comprobaciones ampliadas —accesibilidad con axe, regresión visual, Lighthouse y auditorías más profundas— seguirán esta misma política: se ejecutan como controles informativos, programados o bajo demanda mientras maduran. Solo se proponen como requisitos obligatorios cuando sean estables, rápidas y aporten una protección que no cubran los checks actuales.

## Evitar esperas y ejecuciones obsoletas

- Los jobs obligatorios y los informativos se ejecutan en paralelo.
- Un commit nuevo cancela la ejecución anterior de la misma rama o Pull Request; CI valida el código más reciente.
- Cada job tiene un límite de tiempo para evitar ejecuciones colgadas.
- Los errores de infraestructura se identifican y reintentan en el job afectado; no se rebajan los controles funcionales para ocultarlos.
- Un fallo en una comprobación informativa no impide seguir trabajando ni actualizar una rama. Se registra y se corrige de acuerdo con su impacto.
- Los fallos en TypeScript o Browser impiden integrar ese commit en `main`, pero no impiden continuar el desarrollo en la rama de trabajo.

## Protección de datos

Todos los E2E utilizan contextos de navegador aislados y datos ficticios. Las pruebas PWA usan el build de producción y una IndexedDB desechable. Nunca deben leer, importar, restaurar, limpiar o enriquecer el almacenamiento personal del propietario.

## Verificaciones que requieren dispositivo físico

La instalación y la experiencia real en Android se informan por separado. Chromium, Firefox y WebKit en CI no equivalen a una prueba de instalación en un teléfono Android.

## Regla de producto

La hoja de ruta funcional mantiene su prioridad. Las herramientas de calidad se incorporan progresivamente y no adelantan, sustituyen ni bloquean etapas de producto que no dependan de ellas.
