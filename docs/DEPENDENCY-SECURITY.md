# Estado de seguridad de dependencias

**Última revisión:** 23 de noviembre de 2026  
**Estado:** remediación integrada y publicada en `main`.  
**Pull Request:** [#52 — Migración PWA a Workbox 8](https://github.com/ElFast-dev/Prisma/pull/52)  
**Commit integrado:** `29fed3c8d2b633e4b46224783cf2a9a46fb49dca`.

## Hallazgo original

El lockfile anterior a la migración contenía esta cadena de construcción/PWA:

`vite-plugin-pwa@2.0.0 → workbox-build@7.4.1 → glob@11.1.0 → minimatch@10.2.6`.

Las versiones `glob@11.1.0` y `minimatch@10.2.6` estaban dentro de los rangos afectados por:

- [GHSA-3g3m-2fjr-6pw4 — glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), corregido desde 14.0.2.
- [GHSA-g3hv-75wg-m249 — minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249), corregido desde 11.0.1.

Los paquetes estaban en herramientas de construcción/PWA, no entre las dependencias principales de ejecución. Ese hecho reducía la exposición directa del sitio estático, pero no justificaba conservar avisos conocidos.

## Remediación integrada

Se sustituyó el plugin antiguo por la integración Vite oficial de Workbox 8:

- `@vite-pwa/workbox-build@8.0.15` como herramienta de construcción.
- `@vite-pwa/workbox-window@8.0.15` para gestionar el ciclo de vida del Service Worker.
- `magicast@^0.5.0` como peer de construcción requerido por la estrategia `generate-sw`.
- Se retiró `vite-plugin-pwa@2.0.0`.

La nueva versión de Workbox requiere Node.js `>=22.14.0`; el campo `engines` del proyecto se alineó con ese requisito.

La migración conserva los aspectos de producto que no debían cambiar:

- Manifiesto estático con el mismo nombre, alcance, ruta inicial e iconos de Prisma.
- Caché de imágenes TMDB limitada a 400 entradas y 90 días.
- Limpieza de cachés antiguas y fallback de navegación para el shell SPA.
- `clientsClaim: true` para el primer control del cliente.
- `skipWaiting: false`: una actualización posterior permanece en espera hasta que la persona la acepta.
- Aviso de actualización por pestaña y protección frente a recargas con formularios o diálogos pendientes.

No se modificaron IndexedDB, sus esquemas, los respaldos ni los datos personales.

## Verificación de dependencias

El lockfile se regeneró de forma reproducible mediante `npm install --package-lock-only --ignore-scripts`. El árbol integrado ya no contiene rutas de instalación de:

- `vite-plugin-pwa`
- `workbox-build@7`
- `glob`
- `minimatch`

La auditoría ejecutada en GitHub Actions con `npm audit --audit-level=low` terminó correctamente:

- 125 paquetes auditados en la generación del lockfile.
- 0 vulnerabilidades reportadas.
- Sin overrides forzados.

Ejecución de auditoría de todas las severidades: [GitHub Actions #45113416359](https://github.com/ElFast-dev/Prisma/actions/runs/45113416359).

La ejecución de CI en `main` volvió a ejecutar `npm audit --audit-level=low` y también la aprobó: [CI de main #45114218000](https://github.com/ElFast-dev/Prisma/actions/runs/45114218000).

## Validación después de la integración

Todos los controles del commit `29fed3c8` finalizaron correctamente:

| Control | Resultado | Evidencia |
|---|---|---|
| `npm ci`, auditoría low, TypeScript, unit tests, build y smoke local | Aprobado | [CI #45114218000](https://github.com/ElFast-dev/Prisma/actions/runs/45114218000) |
| Playwright Chromium, Firefox y WebKit | 138 pruebas aprobadas | [CI #45114218000](https://github.com/ElFast-dev/Prisma/actions/runs/45114218000) |
| PWA de producción y funcionamiento offline | Aprobado | [CI #45114218000](https://github.com/ElFast-dev/Prisma/actions/runs/45114218000) |
| CodeQL JavaScript/TypeScript | Aprobado | [CodeQL #45114218017](https://github.com/ElFast-dev/Prisma/actions/runs/45114218017) |
| Presupuesto de rendimiento | Aprobado | [Performance #45114218012](https://github.com/ElFast-dev/Prisma/actions/runs/45114218012) |
| Publicación y smoke test remoto de GitHub Pages | Aprobado | [Deploy #45114218024](https://github.com/ElFast-dev/Prisma/actions/runs/45114218024) |

El smoke remoto verificó el HTML publicado, JavaScript, CSS y manifiesto PWA bajo `/Prisma/`.

## Estado del issue

La incidencia #6 queda resuelta y cerrada. El árbol de dependencias corregido está integrado en `main`, el sitio está publicado y los controles de seguridad, calidad, navegador y PWA están aprobados.

La credencial y la autorización de TMDB son independientes de esta remediación y permanecen intactas.
