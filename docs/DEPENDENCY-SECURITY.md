# Estado de seguridad de dependencias

**Última revisión:** 23 de noviembre de 2026  
**Rama de remediación:** `security/migrate-pwa-workbox`  
**Estado:** remediación preparada; pendiente de CI de producto y fusión a `main`.

## Hallazgo original

El lockfile de `main` anterior a la migración contenía esta cadena de construcción/PWA:

`vite-plugin-pwa@2.0.0 → workbox-build@7.4.1 → glob@11.1.0 → minimatch@10.2.6`.

Las versiones `glob@11.1.0` y `minimatch@10.2.6` estaban dentro de los rangos afectados por:

- [GHSA-3g3m-2fjr-6pw4 — glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), corregido desde 14.0.2.
- [GHSA-g3hv-75wg-m249 — minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249), corregido desde 11.0.1.

Los paquetes estaban en herramientas de construcción/PWA, no entre las dependencias principales de ejecución. Ese hecho reducía la exposición directa del sitio estático, pero no justificaba conservar avisos conocidos.

## Remediación implementada en la rama

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

No se modifican IndexedDB, sus esquemas, los respaldos ni los datos personales.

## Verificación de dependencias

El lockfile regenerado de forma reproducible mediante `npm install --package-lock-only --ignore-scripts` contiene las versiones 8.0.15 indicadas y ya no registra rutas de instalación de:

- `vite-plugin-pwa`
- `workbox-build@7`
- `glob`
- `minimatch`

La auditoría ejecutada en GitHub Actions con `npm audit --audit-level=low` terminó correctamente:

- 125 paquetes auditados.
- 0 vulnerabilidades reportadas.
- Sin overrides forzados.

Ejecución de auditoría: [GitHub Actions #45113416359](https://github.com/ElFast-dev/Prisma/actions/runs/45113416359).

## Criterios para cerrar el issue #6

La auditoría de dependencias y el lockfile ya cumplen sus criterios. La incidencia solo debe cerrarse después de que el PR de migración también supere:

1. `npm ci`, TypeScript, pruebas unitarias y build de producción.
2. Smoke test de GitHub Pages y comprobación del manifiesto.
3. Playwright en Chromium, Firefox y WebKit.
4. Prueba PWA en build de producción: instalación, Service Worker, actualización solicitada, recarga y funcionamiento offline.
5. CodeQL y presupuesto de rendimiento.

La migración se mantiene en una rama y no se considera publicada hasta que dichos controles terminen y el cambio se integre en `main`.

La credencial y la autorización de TMDB son independientes de esta remediación y permanecen intactas.
