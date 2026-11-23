# Estado de seguridad de dependencias

**Última revisión:** 23 de noviembre de 2026  
**Referencia:** `main` en `29675145654d5bcd3fe2f523a8513a24feafe90f`

## Hallazgo actual

La cadena PWA/Workbox conserva dos avisos moderados revisados por GitHub:

| Paquete | Versión en el lockfile | Rango afectado | Versión corregida |
|---|---:|---|---:|
| `glob` | 11.1.0 | 9.0.0 a 14.0.1 | 14.0.2 o posterior |
| `minimatch` | 10.2.6 | 7.0.0 a 11.0.0 | 11.0.1 o posterior |

Advisories:
- [GHSA-3g3m-2fjr-6pw4 — glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)
- [GHSA-g3hv-75wg-m249 — minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249)

## Ruta concreta en Prisma

El lockfile actual registra:

`vite-plugin-pwa@2.0.0 → workbox-build@7.4.1 → glob@11.1.0 → minimatch@10.2.6`.

El manifiesto publicado de `workbox-build@7.4.1` declara `glob: ^11.0.1`; ese rango no puede seleccionar `glob@14.0.2`. `vite-plugin-pwa@2.0.0` declara `workbox-build: ^7.4.1` y la versión 2.0.0 sigue siendo la última publicada consultada en npm durante esta revisión.

Existe también `filelist@1.0.6 → minimatch@5.1.9`. Esa copia está por debajo del rango vulnerable de minimatch (que empieza en 7.0.0) y no debe confundirse con la copia 10.2.6.

Estos paquetes están en la cadena de herramientas de construcción/PWA, no en las dependencias runtime declaradas por Prisma. El inventario debe corregirse, pero la ruta en el árbol no demuestra por sí sola que el sitio estático publicado permita explotar los fallos.

## Estado upstream a 23 de noviembre de 2026

La incidencia [GoogleChrome/workbox#3599](https://github.com/GoogleChrome/workbox/issues/3599) continúa abierta. En sus comentarios se compartió una propuesta no fusionada para mover la ruta directa de Workbox a `glob@14.0.3` y `minimatch@11.0.4`, con una prueba de manifiesto. El propio autor indica que esa propuesta no soluciona todas las rutas de dependencia de Workbox ni equivale a una release publicada.

La versión de `vite-plugin-pwa` disponible en npm sigue siendo 2.0.0, y su manifiesto depende de `workbox-build: ^7.4.1`. Por ello, actualizar solo Prisma a una versión mayor arbitraria de `glob` o `minimatch` no hace que npm resuelva un rango compatible.

## Decisión de Prisma

- Mantener abierta la incidencia #6 mientras las versiones afectadas sigan en el lockfile.
- Mantener `npm audit --audit-level=high` como control bloqueante existente; reconocer que ese umbral no falla por avisos moderados.
- No ejecutar `npm audit fix --force`.
- No añadir overrides globales que inyecten majors incompatibles en consumidores que declaran otros rangos.
- No cambiar Workbox, el plugin PWA ni la estrategia Service Worker solo para silenciar el inventario.
- Esperar una release upstream compatible o un parche oficial con pruebas y soporte; después actualizar el conjunto de forma controlada.

## Criterios para cerrar el issue #6

1. Una versión publicada y compatible de Workbox/vite-plugin-pwa permite resolver los paquetes corregidos sin overrides incompatibles.
2. `npm ci` sigue siendo reproducible y `npm ls glob minimatch` confirma todas las copias que quedan.
3. `npm audit --audit-level=low` no informa de estos dos avisos (y se revisa cualquier aviso restante por separado).
4. TypeScript, 189+ tests unitarios, build, smoke, Playwright en Chromium/Firefox/WebKit y PWA offline pasan.
5. La prueba del manifiesto y de los recursos precargados confirma que el cambio no altera la generación de la PWA.

El texto y la autorización de TMDB no forman parte de esta remediación y permanecen intactos.
